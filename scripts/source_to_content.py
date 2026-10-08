#!/usr/bin/env python3
"""Source-grounded automation for connected five-component NET Psychology learning packages."""
from pathlib import Path
import argparse, hashlib, json, os, re, subprocess, sys
from copy import deepcopy
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
INBOX=ROOT/"sources/inbox"
SYLLABUS=ROOT/"data/syllabus-index.json"
QUICK=ROOT/"content/quick-learn/quick_cards.json"
QUESTIONS=ROOT/"content/questions/questions.json"
REVISION=ROOT/"content/revision/revision_guidance.json"
MICRO=ROOT/"content/microtopics/micro_topics.json"
STAGING=ROOT/"content-staging"
INSTRUCTIONS=ROOT/"data/content-enrichment-instructions.json"
VERIFICATION=ROOT/"data/verification-state.json"
MODEL=os.getenv("NET_CONTENT_MODEL","gemini-3.8-flash")
MAX_TOPICS=int(os.getenv("NET_MAX_TOPICS_PER_RUN","20"))
VERIFICATION_KEYS={"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}
COMPONENTS=("microtopic","deep_dive","active_recall","revision","practice")

def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def load_instructions():
    default={
        "enabled":True,
        "default_instruction":"Use only supplied approved source evidence. The micro-topic is the canonical knowledge source; derive Deep Dive, Active Recall, Revision and Practice/MCQs from the same knowledge without contradiction or unsupported additions. All five components form one connected learning package and must be generated/revised together when a rewrite is required.",
        "user_instruction":"",
        "target_microtopics":[]
    }
    value=default
    if INSTRUCTIONS.exists():
        try:
            loaded=load(INSTRUCTIONS)
            if isinstance(loaded,dict):
                value={**default,**loaded}
        except Exception:
            pass
    # Admin generation requests are job-scoped workflow inputs. They must not
    # require a permanent write to the standing instruction file.
    env_task=os.getenv("NET_ADMIN_INSTRUCTION","").strip()
    env_targets=[x.strip() for x in os.getenv("NET_ADMIN_TARGETS","").split(",") if x.strip()]
    if env_task:
        value["user_instruction"]=env_task
    if env_targets:
        value["target_microtopics"]=env_targets
    return value

def instruction_text(cfg):
    base=str(cfg.get("default_instruction") or "").strip()
    modules=cfg.get("modular_instructions") or {}
    module_order=("website_philosophy","source_use","microtopic","deep_dive","active_recall","revision","practice","cross_references","verification")
    sections=[]
    for key in module_order:
        value=str(modules.get(key) or "").strip()
        if value:
            sections.append(key.replace("_"," ").upper()+":\n"+value)
    user=str(cfg.get("user_instruction") or "").strip()
    modular="\n\n".join(sections)
    task=("ADMIN TASK INSTRUCTION:\n"+user) if user else ""
    return "\n\n".join(x for x in (base,modular,task) if x)

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
        extracted=""
        try:
            import pypdf
            extracted="\n\n".join((x.extract_text() or "") for x in pypdf.PdfReader(str(p)).pages)
        except Exception:
            extracted=""
        # Some PDFs parse successfully with pypdf but expose little or no usable
        # text (for example scanned/OCR-heavy books). Fall back to Poppler based
        # extraction before treating the source as empty.
        if len(re.sub(r"\\s+","",extracted)) >= 200:
            return extracted
        try:
            fallback=subprocess.run(["pdftotext","-layout",str(p),"-"],capture_output=True,text=True,check=True).stdout
            if len(re.sub(r"\\s+","",fallback)) > len(re.sub(r"\\s+","",extracted)):
                return fallback
        except Exception:
            pass
        return extracted
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

def _gemini_schema(schema):
    """Convert JSON Schema types to Gemini's REST schema enum format."""
    if isinstance(schema, dict):
        out={}
        for k,v in schema.items():
            if k=="type" and isinstance(v,str):
                out[k]=v.upper()
            elif k=="properties" and isinstance(v,dict):
                out[k]={pk:_gemini_schema(pv) for pk,pv in v.items()}
            elif k=="items":
                out[k]=_gemini_schema(v)
            else:
                out[k]=_gemini_schema(v) if isinstance(v,(dict,list)) else v
        return out
    if isinstance(schema,list):
        return [_gemini_schema(x) for x in schema]
    return schema
def _resolve_model_chain():
    # Discover the current stable Gemini Flash family at runtime. This means
    # the newest available stable Flash model is always first, with the two
    # immediately previous stable versions retained as fallbacks.
    import urllib.request, re
    api_key=os.getenv("GEMINI_API_KEY")
    if not api_key: raise SystemExit("GEMINI_API_KEY is required.")
    requested=os.getenv("NET_CONTENT_MODEL","").strip()
    configured=[x.strip() for x in os.getenv("NET_CONTENT_FALLBACKS","").split(",") if x.strip()]
    if requested:
        return list(dict.fromkeys([requested]+configured))
    url="https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"
    try:
        models=[]
        next_token=None
        while True:
            page_url=url + (f"&pageToken={next_token}" if next_token else "")
            page_req=urllib.request.Request(page_url,headers={"x-goog-api-key":api_key})
            with urllib.request.urlopen(page_req,timeout=30) as response:
                page=json.loads(response.read().decode("utf-8"))
            models.extend(page.get("models",[]))
            next_token=page.get("nextPageToken")
            if not next_token:
                break
        versions=[]
        for m in models:
            name=m.get("name","").split("/")[-1]
            if "generateContent" not in m.get("supportedGenerationMethods",[]): continue
            match=re.fullmatch(r"gemini-(\d+)\.(\d+)-flash",name)
            if match:
                versions.append((int(match.group(1)),int(match.group(2)),name))
        versions=sorted(set(versions),reverse=True)
        if versions:
            return [v[2] for v in versions[:3]]
    except Exception:
        pass
    return ["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash"]+configured

def call_ai(instructions,payload,name,schema):
    import urllib.request
    api_key=os.getenv("GEMINI_API_KEY")
    if not api_key: raise SystemExit("GEMINI_API_KEY is required.")
    body={
        "systemInstruction":{"parts":[{"text":instructions}]},
        "contents":[{"parts":[{"text":json.dumps(payload,ensure_ascii=False)}]}],
        "generationConfig":{"responseMimeType":"application/json","responseSchema":_gemini_schema(schema),"temperature":0.2}
    }
    errors=[]
    for model in _resolve_model_chain():
        url=f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        req=urllib.request.Request(url,data=json.dumps(body,ensure_ascii=False).encode("utf-8"),
                                   headers={"Content-Type":"application/json","x-goog-api-key":api_key},method="POST")
        try:
            with urllib.request.urlopen(req,timeout=180) as response:
                result=json.loads(response.read().decode("utf-8"))
            text=result["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as exc:
            errors.append(f"{model}: {exc}")
    raise RuntimeError("All configured Gemini models failed: "+" | ".join(errors))

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
    ap.add_argument("--enrich-existing",action="store_true",help="Backward-compatible alias for applying the saved admin enrichment instruction.")
    ap.add_argument("--rewrite-existing",action="store_true",help="Run an explicit admin rewrite against the complete approved source library; does not require a newly uploaded source.")
    ap.add_argument("--source-triggered",action="store_true",help="Treat source changes as a trigger and search the complete approved source library for evidence.")
    ap.add_argument("--apply-staged",action="store_true",help="Publish the already audited content-staging/canonical-content.json.")
    args=ap.parse_args()
    syllabus=load(SYLLABUS); refs=canonical(syllabus); enrichment=load_instructions()
    source_chunks=[]; source_meta=[]
    for p in sorted(INBOX.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".pdf",".docx",".pptx",".txt",".md"}:
            text=extract(p); cs=chunks(text)
            rel=str(p.relative_to(ROOT)).replace("\\","/")
            source_meta.append({"path":rel,"sha256":sha(p),"chunks":len(cs),"characters":len(text)})
            source_chunks += [(rel,i,c) for i,c in enumerate(cs)]
    if not source_chunks and not args.repair_existing and not args.enrich_existing and not args.rewrite_existing and not args.apply_staged:
        print("No supported sources found."); return 0

    report={"schema_version":1,"provider":"Google Gemini API","model":MODEL,"sources":source_meta,
            "repairs":{"quick":0,"questions":0},"unresolved":{"quick":[],"questions":[]}}
    quick=load(QUICK)
    qobj=load(QUESTIONS)
    questions=qobj if isinstance(qobj,list) else [*qobj.get("pyq",[]),*qobj.get("practice",[])]
    
    if args.repair_existing and not args.apply_staged:
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

    if args.repair_existing and not args.apply_staged:
        save(STAGING/"repair-plan.json",{"questions":qobj if isinstance(qobj,dict) else questions,"quick":quick})
    generated=[]
    # Admin target IDs are job-scoped: they constrain explicit rewrites only.
    # A source upload is a trigger, not an evidence boundary and must not inherit
    # stale target IDs from an earlier admin request.
    raw_targets={str(x) for x in enrichment.get("target_microtopics",[]) if str(x).strip()} if args.rewrite_existing else set()
    target_ids=set(refs) if "__ALL__" in raw_targets else raw_targets
    verification=load(VERIFICATION) if VERIFICATION.exists() else {"schema_version":1,"items":{},"updated_at":""}
    verification_items=verification.get("items") or {}
    existing_micro=load(MICRO)
    existing_deep=load(ROOT/"content/deep-dive/deep_dive.json")
    existing_recall=load(ROOT/"content/active-recall/active_recall.json")
    existing_revision=load(REVISION)
    practice_path=ROOT/"content/practice/practice_mcqs.json"
    existing_practice=load(practice_path) if practice_path.exists() else {}
    recall_prompt_schema={"type":"object","properties":{
        "type":{"type":"string"},
        "prompt":{"type":"string"},
        "answer":{"type":"string"}
    },"required":["type","prompt","answer"],"additionalProperties":False}
    cross_reference_schema={"type":"object","properties":{
        "id":{"type":"string"},
        "relationship":{"type":"string"},
        "reason":{"type":"string"}
    },"required":["id","relationship","reason"],"additionalProperties":False}
    practice_mcq_schema={"type":"object","properties":{
        "id":{"type":"string"},
        "question":{"type":"string"},
        "options":{"type":"array","items":{"type":"string"}},
        "correct_answer":{"type":"string"},
        "explanation":{"type":"string"}
    },"required":["id","question","options","correct_answer","explanation"],"additionalProperties":False}
    revision_guidance_schema={"type":"object","properties":{
        "recall_before_review":{"type":"string"},
        "self_check":{"type":"string"},
        "weak_point_prompt":{"type":"string"},
        "rating_instruction":{"type":"string"}
    },"required":["recall_before_review","self_check","weak_point_prompt","rating_instruction"],"additionalProperties":False}
    content_schema={"type":"object","properties":{
        "microtopic_id":{"type":"string"},
        "core_explanation":{"type":"string"},
        "detailed_explanation":{"type":"string"},
        "recall_prompts":{"type":"array","items":recall_prompt_schema},
        "cross_references":{"type":"array","items":cross_reference_schema},
        "practice_mcqs":{"type":"array","items":practice_mcq_schema},
        "revision_guidance":revision_guidance_schema
    },"required":["microtopic_id","core_explanation","detailed_explanation","cross_references","recall_prompts","revision_guidance","practice_mcqs"],"additionalProperties":False}
    if not args.apply_staged:
        for ref in list(refs.values()):
            if target_ids and ref["id"] not in target_ids: continue
            if len(generated)>=MAX_TOPICS: break
            # Search the complete approved source library. Keep at least one strong
            # excerpt from each relevant source so a newly uploaded book cannot crowd
            # every other approved source out of the evidence set.
            query_words=set(norm(ref["title"]+" "+ref["topic_title"]+" "+ref["unit_title"]).split())
            per_source=[]
            for src in sorted({x[0] for x in source_chunks}):
                source_ranked=[]
                for source_name,i,text in source_chunks:
                    if source_name!=src: continue
                    score=len(query_words & set(norm(text).split()))
                    if score: source_ranked.append((score,source_name,i,text))
                if source_ranked:
                    source_ranked.sort(reverse=True,key=lambda x:x[0])
                    per_source.append(source_ranked[0])
            remaining=[]
            for src,i,text in source_chunks:
                score=len(query_words & set(norm(text).split()))
                if score: remaining.append((score,src,i,text))
            remaining.sort(reverse=True,key=lambda x:x[0])
            selected=[]
            seen=set()
            for row in per_source+remaining:
                key=(row[1],row[2])
                if key in seen: continue
                seen.add(key); selected.append(row)
                if len(selected)>=12: break
            evidence=[{"source":src,"chunk":i,"text":text[:12000]} for score,src,i,text in selected if score>0]
            if not evidence: continue
            current={
                "microtopic":existing_micro.get(ref["id"],{}),
                "deep_dive":existing_deep.get(ref["id"],{}),
                "active_recall":existing_recall.get(ref["id"],{}),
                "revision":existing_revision.get(ref["id"],{}),
                "practice_mcqs":existing_practice.get(ref["id"],{}).get("questions",[]) if isinstance(existing_practice.get(ref["id"],{}),dict) else []
            }
            locked_components={
                component for component,key in VERIFICATION_KEYS.items()
                if str(verification_items.get(key,{}).get(ref["id"],""))=="EXPERT VERIFIED"
            }
            if len(locked_components)==len(COMPONENTS):
                continue
            protected={
                "microtopic":{
                    "core_explanation":current["microtopic"].get("expert_explanation",""),
                    "cross_references":current["microtopic"].get("cross_references",[])
                },
                "deep_dive":current["deep_dive"],
                "active_recall":current["active_recall"],
                "revision":current["revision"],
                "practice":current.get("practice_mcqs",[])
            }
            generated_item=call_ai(
                instruction_text(enrichment)+"\n\nYou are producing ONE CONNECTED FIVE-COMPONENT LEARNING PACKAGE for the new Content 2.0 learner architecture. The micro-topic is the canonical backend knowledge record. The learner-facing Micro-topic page presents the canonical core explanation as its main learning content. Deep Dive is a separate optional route for genuinely deeper learning. Do NOT create or recommend Short Notes, I Understand, Detailed Explanation cards, three-card micro-topic layouts, or any previous micro-topic-page architecture. Deep Dive must add genuinely new, structured, source-grounded depth beyond the canonical Micro-topic explanation and must not replace or merely paraphrase it. The canonical Micro-topic explanation is the primary learner-facing knowledge layer; dependent components must remain aligned with it. Deep Dive, Active Recall, Revision and Practice/MCQs must be derived from that same knowledge. Rewrite ONLY components that are NOT marked EXPERT VERIFIED in the supplied verification state. Any EXPERT VERIFIED component is locked: preserve its existing content exactly, do not paraphrase, shorten, expand, reformat, replace, or regenerate it. Non-verified components may be rewritten to align with a locked expert-verified component when source-supported. Never change an expert-verified component merely to make the package stylistically uniform. Return source-grounded content only and do not invent missing evidence. Put exam distinctions, applications, cautions, definitions, researcher/theory names and other useful qualifiers inline where they belong in the explanation. Do not create separate learner blocks that duplicate the Deep Dive. Practice MCQs must be original practice items, never presented as genuine PYQs, and every answer/explanation must be supported by the connected package and source evidence. Cross-references must use only supplied canonical candidates, must exclude the current micro-topic, and should identify only meaningful conceptual relationships useful for mixed-topic questions. If no candidate has a defensible relationship, return an empty cross_references array. LOCKED COMPONENTS: "+json.dumps(sorted(list(locked_components)))+"\nLOCKED CONTENT TO PRESERVE EXACTLY: "+json.dumps(protected,ensure_ascii=False),
                {"microtopic":ref,"current_published_content":current,"locked_components":sorted(list(locked_components)),"locked_content":protected,"source_excerpts":evidence},"microtopic_content",content_schema)
            # Keep the raw Gemini proposal for the audit pipeline. Locked content is
            # restored only after this snapshot exists, so verified-conflict review
            # compares Gemini's proposal with the actual published expert version.
            generated_item["_proposed_package"]=deepcopy(generated_item)
            for component in locked_components:
                if component=="microtopic":
                    generated_item["core_explanation"]=protected["microtopic"]["core_explanation"]
                    generated_item["cross_references"]=protected["microtopic"]["cross_references"]
                elif component=="deep_dive":
                    generated_item["detailed_explanation"]=protected["deep_dive"].get("detailed_explanation",generated_item.get("detailed_explanation",""))
                elif component=="active_recall":
                    generated_item["recall_prompts"]=protected["active_recall"].get("prompts",generated_item.get("recall_prompts",[]))
                elif component=="revision":
                    generated_item["revision_guidance"]={k:protected["revision"].get(k,"") for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")}
                elif component=="practice":
                    generated_item["practice_mcqs"]=protected["practice"]
            generated.append(generated_item)
    if generated:
        save(STAGING/"canonical-content.json",generated)
    if args.apply_staged:
        approved_path=STAGING/"canonical-content-approved.json"
        staged=load(approved_path) if approved_path.exists() else []
        if not isinstance(staged,list): raise SystemExit("Audited staged content is invalid.")
        generated=staged
        if args.repair_existing:
            repair_plan=load(STAGING/"repair-plan.json")
            qobj=repair_plan["questions"]
            quick=repair_plan["quick"]
    if args.apply or args.apply_staged:
        if args.repair_existing:
            save(QUESTIONS,qobj if isinstance(qobj,dict) else questions)
            save(QUICK,quick)
        if generated:
            micro_pool=load(MICRO)
            deep_pool=load(ROOT/"content/deep-dive/deep_dive.json")
            recall_pool=load(ROOT/"content/active-recall/active_recall.json")
            revision_pool=load(REVISION)
            practice_path=ROOT/"content/practice/practice_mcqs.json"
            practice_pool=load(practice_path) if practice_path.exists() else {}
            verification=load(VERIFICATION) if VERIFICATION.exists() else {"schema_version":1,"items":{},"updated_at":""}
            verification.setdefault("items",{})
            source_stamp="\n".join(sorted(x["sha256"] for x in source_meta))
            marker="SOURCE PIPELINE "+hashlib.sha256(source_stamp.encode()).hexdigest()[:12]
            now=datetime.now(timezone.utc).isoformat()
            def append_once(existing,label,text):
                existing=str(existing or "")
                text=str(text or "").strip()
                if not text: return existing
                block=f"\n\n[{marker} {label}]\n{text}"
                return existing if f"[{marker} {label}]" in existing else existing+block
            for g in generated:
                mid=g.get("microtopic_id")
                if mid not in micro_pool: continue
                me=micro_pool[mid]
                # Surgical publication: replace only the canonical fields owned by this
                # generated package. Preserve IDs, titles, mappings, and unrelated learner data.
                component_locked=lambda component: str(verification.setdefault("items",{}).setdefault(VERIFICATION_KEYS[component],{}).get(mid,""))=="EXPERT VERIFIED"
                if not component_locked("microtopic"):
                    me["expert_explanation"]=g["core_explanation"]
                    me["cross_references"]=g.get("cross_references") or []
                if not component_locked("deep_dive"):
                    de=deep_pool.get(mid) or {"id":mid,"title":me.get("title","")}
                    de["id"]=mid+"D"; de["microtopic_id"]=mid; de["title"]=me.get("title",de.get("title",""))
                    de["detailed_explanation"]=g["detailed_explanation"]
                    deep_pool[mid]=de
                if not component_locked("active_recall"):
                    ae=recall_pool.get(mid) or {"id":mid,"title":me.get("title",""),"prompts":[]}
                    ae["id"]=mid+"A"; ae["microtopic_id"]=mid; ae["title"]=me.get("title",ae.get("title",""))
                    ae["prompts"]=g.get("recall_prompts") or []
                    recall_pool[mid]=ae
                if not component_locked("revision"):
                    rg=g.get("revision_guidance") or {}
                    rev=revision_pool.get(mid) or {"id":mid,"title":me.get("title","")}
                    rev["id"]=mid+"R"; rev["microtopic_id"]=mid; rev["title"]=me.get("title",rev.get("title",""))
                    for field in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"):
                        rev[field]=rg.get(field,"")
                    revision_pool[mid]=rev
                if not component_locked("practice") and g.get("practice_mcqs"):
                    practice_pool[mid]={"id":mid+"P","microtopic_id":mid,"title":me.get("title",""),"questions":g.get("practice_mcqs") or []}
                approved_components=g.get("approved_components") or []
                for component in ("microtopic","deep_dive","active_recall","revision","practice"):
                    if component in approved_components:
                        component_key=VERIFICATION_KEYS[component]
                        current_status=str(verification.setdefault("items",{}).setdefault(component_key,{}).get(mid,""))
                        if current_status!="EXPERT VERIFIED":
                            verification["items"][component_key][mid]="AI REVIEWED"
            practice_path.parent.mkdir(parents=True,exist_ok=True)
            save(practice_path,practice_pool)
            save(MICRO,micro_pool)
            save(ROOT/"content/deep-dive/deep_dive.json",deep_pool)
            save(ROOT/"content/active-recall/active_recall.json",recall_pool)
            save(REVISION,revision_pool)
            save(VERIFICATION,verification)
        save(ROOT/"content-provenance.json",{"schema_version":1,"generated_by":"scripts/source_to_content.py","model":MODEL,
             "generated_at":datetime.now(timezone.utc).isoformat(),"sources":source_meta,
             "repairs":report["repairs"],"unresolved":report["unresolved"]})

