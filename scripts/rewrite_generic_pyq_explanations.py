import json, os, re, time, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
PYQS=ROOT/"practice_questions.json"; DATA=ROOT/"data.json"
PROGRESS=ROOT/"generic-pyq-rewrite-progress.json"; LOG=ROOT/"generic-pyq-rewrite-log.json"
MARKERS=(
 "The stem describes the concept or relationship represented by",
 "Evaluate each statement independently against the relevant psychological principle",
 "Arrange the items according to the established chronological, developmental, or logical order",
 "Check each List-I item against its specific person, concept, function, or description",
)
DEFAULT_MODELS=["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash"]
TRANSIENT={429,500,502,503,504}

def now(): return datetime.now(timezone.utc).isoformat()
def load(p,d): return json.loads(p.read_text(encoding="utf-8")) if p.exists() else d
def save(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def is_generic(q): return any(m in str(q.get("explanation","")) for m in MARKERS)

def micro_index(data):
    out={}
    for u in data.get("units",[]):
        for t in u.get("topics",[]):
            for m in t.get("microtopics",[]): out[(u.get("id"),t.get("id"),m.get("id"))]=m
    return out

def evidence_for(q,micros):
    m=micros.get((q.get("unit"),q.get("topic"),q.get("micro")))
    if not m: return {"mapping":"unmapped","microtopic":None}
    keep=["title","content_notes","deep_learning","detailed_explanation","exam_takeaway","application_question","sources"]
    return {"mapping":"mapped","microtopic":{k:m.get(k) for k in keep if m.get(k) not in (None,"",[],{})}}

def models():
    c=os.environ.get("GEMINI_REWRITE_MODELS","").strip()
    if c: return [x.strip() for x in c.split(",") if x.strip()]
    first=os.environ.get("GEMINI_REWRITE_MODEL","").strip() or DEFAULT_MODELS[0]
    return [first]+[m for m in DEFAULT_MODELS if m!=first]

def call_gemini(prompt,count):
    key=os.environ.get("GEMINI_API_KEY")
    if not key: raise RuntimeError("GEMINI_API_KEY is not configured.")
    schema={"type":"object","properties":{"items":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"explanation":{"type":"string"}},"required":["id","explanation"],"additionalProperties":False}}},"required":["items"],"additionalProperties":False}
    last=None; ml=models()
    for mi,model in enumerate(ml):
        body={"model":model,"input":prompt,"response_format":{"type":"text","mime_type":"application/json","schema":schema}}
        for attempt,delay in enumerate((0,2,5)):
            if delay: time.sleep(delay)
            req=urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions",data=json.dumps(body,ensure_ascii=False).encode(),headers={"x-goog-api-key":key,"Content-Type":"application/json"})
            try:
                with urllib.request.urlopen(req,timeout=180) as r: out=json.load(r)
                text=out.get("output_text","") or "".join(c.get("text","") for s in out.get("steps",[]) for c in s.get("content",[]) if c.get("type")=="text")
                print(f"Gemini rewrite succeeded: model={model}, items={count}")
                return json.loads(text.strip())
            except urllib.error.HTTPError as e:
                raw=e.read().decode("utf-8",errors="replace")
                try: msg=json.loads(raw).get("error",{}).get("message") or raw
                except Exception: msg=raw
                last=RuntimeError(f"Gemini API error {e.code}: {msg[:700]}")
                if e.code in TRANSIENT and attempt<2: continue
                if e.code in TRANSIENT and mi<len(ml)-1:
                    print(f"{model} unavailable ({e.code}); falling back to {ml[mi+1]}")
                    break
                raise last
            except (urllib.error.URLError,TimeoutError) as e:
                last=RuntimeError(f"Gemini transport error: {e}")
                if attempt<2: continue
                if mi<len(ml)-1: break
                raise last
    raise last or RuntimeError("Gemini rewrite failed.")

def make_prompt(batch,micros):
    items=[]
    for q in batch:
        items.append({"id":q["id"],"question_type":q.get("type") or q.get("question_type") or "unknown","question":q.get("question"),"options":q.get("options"),"answer_index":q.get("answer"),"mapping":{"unit":q.get("unit"),"topic":q.get("topic"),"micro":q.get("micro"),"confidence":q.get("mapping_confidence")},"evidence":evidence_for(q,micros)})
    return json.dumps({
      "role":"UGC NET Psychology PYQ explanation editor",
      "task":"Rewrite only the supplied generic explanations. Return exactly one explanation per supplied id.",
      "rules":[
        "Explain why the keyed answer is correct using the actual question, options and supplied evidence.",
        "Do not merely restate the answer choice or use template language.",
        "Distinguish the closest distractor or misconception when useful.",
        "For match questions explain substantive pairings; for sequence questions explain meaningful ordering; for statement-set questions identify supported statements and why; for direct questions connect the stem to the keyed concept.",
        "Use concise exam-useful prose, normally 2–4 sentences.",
        "For mapped questions use supplied micro-topic evidence and sources as primary grounding.",
        "For unmapped questions use only what the question/options support; never invent authors, studies, dates, statistics or citations.",
        "Never alter IDs, questions, options, answer indexes or mappings.",
        "Do not include headings, Correct answer labels, markdown, or generic audit phrases. Return JSON only."
      ],
      "items":items
    },ensure_ascii=False)

def validate_items(items, expected_ids):
    if not isinstance(items,list): raise RuntimeError("Gemini response missing items.")
    result={}
    for x in items:
        if not isinstance(x,dict): continue
        qid=str(x.get("id",""))
        if qid not in expected_ids: continue
        exp=str(x.get("explanation","")).strip()
        if not exp: raise RuntimeError(f"Empty explanation for {qid}")
        if any(m in exp for m in MARKERS): raise RuntimeError(f"Generic template remains for {qid}")
        if len(exp)<45: raise RuntimeError(f"Explanation too short for {qid}")
        result[qid]=exp
    return result

def rewrite_batch(batch,micros):
    if not batch: return {}
    expected={str(q["id"]) for q in batch}
    patch=call_gemini(make_prompt(batch,micros),len(batch))
    got=validate_items(patch.get("items") if isinstance(patch,dict) else None,expected)
    missing=expected-set(got)
    if not missing:
        return got
    print(f"Gemini returned {len(got)}/{len(batch)} items; retrying missing={sorted(missing)}")
    missing_batch=[q for q in batch if str(q["id"]) in missing]
    try:
        retry=call_gemini(make_prompt(missing_batch,micros),len(missing_batch))
        retry_items=validate_items(retry.get("items") if isinstance(retry,dict) else None,{str(q["id"]) for q in missing_batch})
        got.update(retry_items)
        missing={str(q["id"]) for q in missing_batch}-set(retry_items)
    except Exception as e:
        print(f"Missing-item retry failed: {e}")
    if missing and len(batch)>1:
        print(f"Splitting unresolved batch of {len(batch)} into smaller chunks.")
        remaining=[q for q in batch if str(q["id"]) in missing]
        mid=max(1,len(remaining)//2)
        for sub in (remaining[:mid],remaining[mid:]):
            if sub: got.update(rewrite_batch(sub,micros))
    if set(got)!=expected:
        raise RuntimeError(f"Patch ID mismatch after recovery; missing={sorted(expected-set(got))[:10]}")
    return got

def main():
    questions=load(PYQS,[]); data=load(DATA,{})
    micros=micro_index(data); generic=[q for q in questions if is_generic(q)]
    progress=load(PROGRESS,{"schema_version":1,"completed_ids":[],"started_at":now()})
    completed=set(map(str,progress.get("completed_ids",[])))
    todo=[q for q in generic if str(q.get("id")) not in completed]
    batch_size=int(os.environ.get("PYQ_BATCH_SIZE","30")); max_batches=int(os.environ.get("PYQ_MAX_BATCHES","0"))
    batches=[todo[i:i+batch_size] for i in range(0,len(todo),batch_size)]
    if max_batches: batches=batches[:max_batches]
    print(f"Generic={len(generic)}, completed={len(completed)}, remaining={len(todo)}, batches={len(batches)}")
    log=load(LOG,{"schema_version":1,"started_at":now(),"batches":[]}); by_id={str(q["id"]):q for q in questions}
    for n,batch in enumerate(batches,1):
        ids=[str(q["id"]) for q in batch]
        try:
            rewritten=rewrite_batch(batch,micros)
            for qid,exp in rewritten.items(): by_id[qid]["explanation"]=exp; completed.add(qid)
            save(PYQS,questions); progress.update({"updated_at":now(),"completed_ids":sorted(completed),"total_target":len(generic)}); save(PROGRESS,progress)
            log["batches"].append({"batch":n,"count":len(batch),"ids":ids,"status":"DONE","at":now()}); save(LOG,log)
            print(f"Batch {n}/{len(batches)} complete.")
        except Exception as e:
            log["batches"].append({"batch":n,"count":len(batch),"ids":ids,"status":"ERROR","error":str(e),"at":now()}); save(LOG,log); raise
    remaining=sum(is_generic(q) for q in questions); print("Generic explanation templates remaining after rewrite:",remaining)
    if remaining: raise SystemExit(f"Generic template audit failed: {remaining} remain.")
    if any(not str(q.get("explanation","")).strip() for q in questions): raise SystemExit("Missing explanation detected.")
    print("Generic PYQ explanation rewrite completed successfully.")

if __name__=="__main__": main()

# Generic PYQ rewrite phase: source-grounded, type-specific, validated batch processing. v2
