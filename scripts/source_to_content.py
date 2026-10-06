#!/usr/bin/env python3
"""Source-grounded content automation for the NET Psychology static pools."""
from pathlib import Path
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
INBOX=ROOT/"sources/inbox"
SYLLABUS=ROOT/"data/syllabus-index.json"
QUICK=ROOT/"content/quick-learn/quick_cards.json"
QUESTIONS=ROOT/"content/questions/questions.json"
MICRO=ROOT/"content/microtopics/micro_topics.json"
STAGING=ROOT/"content-staging"
MODEL=os.getenv("NET_CONTENT_MODEL","gpt-5-mini")
MAX_TOPICS=int(os.getenv("NET_MAX_TOPICS_PER_RUN","20"))

def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def save(p,o):
    Path(p).parent.mkdir(parents=True,exist_ok=True)
    Path(p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def norm(s): return re.sub(r"[^a-z0-9]+"," ",str(s).lower()).strip()
def sha(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1024*1024),b): h.update(b)
    return h.hexdigest()

def extract(p):
    if p.suffix.lower()==".pdf":
        try:
            import pypdf
            return "\n\n".join((x.extract_text() or "") for x in pypdf.PdfReader(str(p)).pages)
        except Exception:
            return subprocess.run(["pdftotext","-layout",str(p),"-"],capture_output=True,text=True,check=True).stdout
    if p.suffix.lower() in {".txt",".md"}:
        return p.read_text(encoding="utf-8",errors="ignore")
    if p.suffix.lower()==".docx":
        from docx import Document
        return "\n".join(x.text for x in Document(str(p)).paragraphs)
    if p.suffix.lower()==".pptx":
        from pptx import Presentation
        return "\n".join(sh.text for s in Presentation(str(p)).slides for sh in s.shapes if hasattr(sh,"text"))
    return ""

def chunks(text,size=12000):
    text=re.sub(r"\n{3,}","\n\n",text).strip()
    out=[]; cur=""
    for part in text.split("\n\n"):
        if len(cur)+len(part)+2<=size: cur += ("\n\n" if cur else "")+part
        else:
            if cur: out.append(cur)
            cur=part[:size]
    if cur: out.append(cur)
    return out

def call_ai(instructions,payload,name,schema):
    from openai import OpenAI
    r=OpenAI().responses.create(
        model=MODEL,instructions=instructions,input=json.dumps(payload,ensure_ascii=False),
        text={"format":{"type":"json_schema","name":name,"strict":True,"schema":schema}},store=False)
    return json.loads(r.output_text)

def canonical(s):
    out={}
    for u in s["units"]:
        for t in u.get("topics",[]):
            for m in t.get("microtopics",[]):
                k=f"{u['id']}-{t['id']}-{m['id']}"
                out[k]={"id":k,"unit":u["id"],"topic":t["id"],"micro":m["id"],
                        "title":m.get("title",""),"topic_title":t.get("title",""),"unit_title":u.get("title","")}
    return out

def candidate_refs(text,refs,n=8):
    words=set(norm(text).split()); ranked=[]
    for k,r in refs.items():
        ts=set(norm(r["title"]+" "+r["topic_title"]+" "+r["unit_title"]).split())
        ranked.append((len(words&ts),r))
    ranked.sort(key=lambda x:x[0],reverse=True)
    return [r for _,r in ranked[:n]]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--apply",action="store_true")
    ap.add_argument("--repair-existing",action="store_true")
    ap.add_argument("--no-source-synthesis",action="store_true")
    args=ap.parse_args()
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required.")
    syllabus=load(SYLLABUS); refs=canonical(syllabus)
    source_chunks=[]; source_meta=[]
    for p in sorted(INBOX.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".pdf",".docx",".pptx",".txt",".md"}:
            text=extract(p); cs=chunks(text)
            rel=str(p.relative_to(ROOT)).replace("\\","/")
            source_meta.append({"path":rel,"sha256":sha(p),"chunks":len(cs),"characters":len(text)})
            source_chunks += [(rel,i,c) for i,c in enumerate(cs)]
    if not source_chunks and not args.repair_existing:
        print("No supported sources found."); return 0

    report={"schema_version":1,"model":MODEL,"sources":source_meta,
            "repairs":{"quick":0,"questions":0},"unresolved":{"quick":[],"questions":[]}}
    quick=load(QUICK)
    qobj=load(QUESTIONS)
    questions=qobj if isinstance(qobj,list) else [*qobj.get("pyq",[]),*qobj.get("practice",[])]
    
    if args.repair_existing:
        # AI classification is restricted to a small candidate set per item.
        q_schema={"type":"object","properties":{"mappings":{"type":"array","items":{
            "type":"object","properties":{"id":{"type":"string"},"microtopic_id":{"type":"string"},"confidence":{"type":"number"}},
            "required":["id","microtopic_id","confidence"],"additionalProperties":False}}},
            "required":["mappings"],"additionalProperties":False}
        unresolved=[]
        for q in questions:
            key=f"{q.get('unit')}-{q.get('topic')}-{q.get('micro')}"
            if all(q.get(x) is not None for x in ("unit","topic","micro")) and key in refs: continue
            unresolved.append(q)
        for i in range(0,len(unresolved),20):
            batch=unresolved[i:i+20]
            candidates=[]
            for q in batch:
                text=" ".join(str(q.get(x,"")) for x in ("question","explanation","session"))
                candidates += candidate_refs(text,refs,8)
            uniq={r["id"]:r for r in candidates}
            ai=call_ai("Map each question to the best supplied canonical micro-topic. Never invent IDs. Only return mappings when evidence is strong (confidence >= 0.82). Do not rewrite the question.",
                       {"canonical_candidates":list(uniq.values()),"questions":batch},"question_mapping",q_schema)
            byid={str(q.get("id")):q for q in questions}
            for m in ai["mappings"]:
                if m["confidence"]>=0.82 and m["microtopic_id"] in refs and str(m["id"]) in byid:
                    r=refs[m["microtopic_id"]]; byid[str(m["id"])].update(unit=r["unit"],topic=r["topic"],micro=r["micro"]); report["repairs"]["questions"]+=1
        report["unresolved"]["questions"]=[str(q.get("id")) for q in questions if f"{q.get('unit')}-{q.get('topic')}-{q.get('micro')}" not in refs]

        stale=[(cid,c) for cid,c in quick.items() if isinstance(c,dict) and f"{c.get('unit')}-{c.get('topic')}-{c.get('micro')}" not in refs]
        qc_schema={"type":"object","properties":{"mappings":{"type":"array","items":{
            "type":"object","properties":{"card_id":{"type":"string"},"microtopic_id":{"type":"string"},"confidence":{"type":"number"}},
            "required":["card_id","microtopic_id","confidence"],"additionalProperties":False}}},
            "required":["mappings"],"additionalProperties":False}
        for i in range(0,len(stale),20):
            batch=stale[i:i+20]; candidates=[]
            for cid,c in batch:
                candidates += candidate_refs(" ".join(str(c.get(x,"")) for x in ("title","question","content","front","back")),refs,8)
            uniq={r["id"]:r for r in candidates}
            ai=call_ai("Map each stale Quick Learn card to the best supplied canonical micro-topic. Never invent IDs. Only return mappings when confidence is strong (confidence >= 0.82).",
                       {"canonical_candidates":list(uniq.values()),"cards":[{"id":cid,**c} for cid,c in batch]},"quick_mapping",qc_schema)
            for m in ai["mappings"]:
                if m["confidence"]>=0.82 and m["microtopic_id"] in refs and m["card_id"] in quick:
                    r=refs[m["microtopic_id"]]; quick[m["card_id"]].update(unit=r["unit"],topic=r["topic"],micro=r["micro"]); report["repairs"]["quick"]+=1
        report["unresolved"]["quick"]=[cid for cid,c in quick.items() if isinstance(c,dict) and f"{c.get('unit')}-{c.get('topic')}-{c.get('micro')}" not in refs]

    generated=[]
    if not args.no_source_synthesis:
        content_schema={"type":"object","properties":{
            "microtopic_id":{"type":"string"},"quick_learn":{"type":"string"},
            "core_explanation":{"type":"string"},"detailed_explanation":{"type":"string"},
            "recall_prompts":{"type":"array","items":{"type":"string"}},
            "exam_takeaway":{"type":"string"},"source_notes":{"type":"string"}},
            "required":["microtopic_id","quick_learn","core_explanation","detailed_explanation","recall_prompts","exam_takeaway","source_notes"],
            "additionalProperties":False}
        for ref in list(refs.values()):
            if len(generated)>=MAX_TOPICS: break
            words=set(norm(ref["title"]).split())
            ranked=[]
            for src,i,text in source_chunks:
                ranked.append((len(words & set(norm(text).split())),src,i,text))
            ranked.sort(reverse=True,key=lambda x:x[0])
            evidence=[{"source":src,"chunk":i,"text":text[:12000]} for score,src,i,text in ranked[:4] if score>0]
            if not evidence: continue
            generated.append(call_ai(
                "Create source-grounded UGC NET Psychology study content. Use only facts supported by the supplied excerpts; do not silently add general knowledge. Do not reproduce long source passages. Preserve source terminology, named theories/researchers, distinctions and exam-relevant relationships. Write concise learner-facing content.",
                {"microtopic":ref,"source_excerpts":evidence},"microtopic_content",content_schema))
        if generated: save(STAGING/"microtopics.json",generated)

    if args.apply:
        if args.repair_existing:
            save(QUESTIONS,qobj if isinstance(qobj,dict) else questions); save(QUICK,quick)
        if generated:
            pool=load(MICRO)
            source_stamp="\n".join(sorted(x["sha256"] for x in source_meta))
            marker="SOURCE PIPELINE "+hashlib.sha256(source_stamp.encode()).hexdigest()[:12]
            def append_once(existing,label,text):
                existing=str(existing or "")
                block=f"\n\n[{marker} {label}]\n{text.strip()}"
                return existing if f"[{marker} {label}]" in existing else existing+block
            for g in generated:
                if g["microtopic_id"] not in pool: continue
                e=pool[g["microtopic_id"]]
                e["content_notes"]=append_once(e.get("content_notes"),"QUICK LEARN",g["quick_learn"])
                e["expert_explanation"]=append_once(e.get("expert_explanation"),"SOURCE-GROUNDED EXPLANATION",g["core_explanation"])
                e["detailed_explanation"]=append_once(e.get("detailed_explanation"),"SOURCE-GROUNDED DETAIL",g["detailed_explanation"])
                if g["recall_prompts"]:
                    e["application_question"]=append_once(e.get("application_question"),"RETRIEVAL PROMPTS","; ".join(g["recall_prompts"]))
                e["recall_cue"]=append_once(e.get("recall_cue"),"EXAM TAKEAWAY",g["exam_takeaway"])
                e["source_notes"]=append_once(e.get("source_notes"),"PROVENANCE",g["source_notes"])
                e.setdefault("source_pipeline",[]).append({"marker":marker,"model":MODEL,"generated_at":datetime.now(timezone.utc).isoformat()})
            save(MICRO,pool)
        save(ROOT/"content-provenance.json",{"schema_version":1,"generated_by":"scripts/source_to_content.py","model":MODEL,
             "generated_at":datetime.now(timezone.utc).isoformat(),"sources":source_meta,
             "repairs":report["repairs"],"unresolved":report["unresolved"]})
    save(STAGING/"run-report.json",report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
