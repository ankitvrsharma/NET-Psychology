#!/usr/bin/env python3
"""Independent component audits for connected NET Psychology learning packages."""
from pathlib import Path
from datetime import datetime, timezone
import json, sys

ROOT=Path(__file__).resolve().parents[1]
STAGING=ROOT/"content-staging/canonical-content.json"
APPROVED=ROOT/"content-staging/canonical-content-approved.json"
POLICY=ROOT/"data/ai-content-audit-policy.json"
QUEUE=ROOT/"data/content-approval-queue.json"
INBOX=ROOT/"sources/inbox"
sys.path.insert(0,str(ROOT/"scripts"))
from source_to_content import load, extract, chunks, canonical, call_ai, norm

COMPONENTS=("microtopic","deep_dive","active_recall","revision","practice")
FIELDS={
 "microtopic":["core_explanation"],
 "deep_dive":["detailed_explanation"],
 "active_recall":["recall_prompts"],
 "revision":["revision_guidance"],
 "practice":["practice_mcqs"],
}

def source_evidence(ref):
    words=set(norm(ref["title"]+" "+ref["topic_title"]+" "+ref["unit_title"]).split())
    ranked=[]
    for p in sorted(INBOX.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in {".pdf",".docx",".pptx",".txt",".md"}: continue
        text=extract(p)
        for i,c in enumerate(chunks(text)):
            score=len(words & set(norm(c).split()))
            if score: ranked.append((score,str(p.relative_to(ROOT)),i,c[:12000]))
    ranked.sort(reverse=True,key=lambda x:x[0])
    return [{"source":x[1],"chunk":x[2],"text":x[3]} for x in ranked[:6]]

def available(g,component):
    # All five components are required for a connected package. Missing content is a deterministic failure, not an optional omission.
    return True

def audit_component(g,component,ref,policy,evidence):
    criteria={
      "microtopic":["source_fidelity","canonical_microtopic_alignment","microtopic_exam_adequacy","no_generic_ai_filler","no_unsupported_claims"],
      "deep_dive":["source_fidelity","canonical_microtopic_alignment","deep_dive_value","no_generic_ai_filler","no_unsupported_claims"],
      "active_recall":["source_fidelity","canonical_microtopic_alignment","active_recall_retrievability","no_generic_ai_filler","no_unsupported_claims"],
      "revision":["source_fidelity","canonical_microtopic_alignment","revision_alignment","no_generic_ai_filler","no_unsupported_claims"],
      "practice":["source_fidelity","canonical_microtopic_alignment","practice_mcq_quality","no_fabricated_pyq","no_generic_ai_filler","no_unsupported_claims"]
    }[component]
    schema={"type":"object","properties":{
      "approved":{"type":"boolean"},"score":{"type":"number"},
      "critical_failures":{"type":"array","items":{"type":"string"}},
      "issues":{"type":"array","items":{"type":"string"}},
      "criteria":{"type":"object","properties":{k:{"type":"number"} for k in criteria},"required":criteria,"additionalProperties":False},
      "rationale":{"type":"string"}
    },"required":["approved","score","critical_failures","issues","criteria","rationale"],"additionalProperties":False}
    prompt=f"""Audit the {component} component of ONE CONNECTED UGC NET Psychology learning package.
Audit this component independently, but use the other connected components as consistency context.
Do not reward fluent prose by itself. Verify claims against supplied source evidence.
Do not fill source gaps from your own knowledge.
Reject contradictions, generic AI filler, unsupported claims, fabricated PYQs/researchers/experiments/statistics/citations.
For active recall, every answer must be taught by the connected package.
For practice, every MCQ must be an original practice item unless explicitly marked as a genuine source PYQ; never invent or label a generated item as a PYQ.
For revision, guidance must reinforce the same knowledge rather than introduce new content.
Approve only when this component is useful for UGC NET/NET-JRF and passes its component criteria.

COMPONENT: {component}
CRITERIA: {json.dumps(criteria)}
POLICY: {json.dumps(policy,ensure_ascii=False)}
CANONICAL MICRO-TOPIC: {json.dumps(ref,ensure_ascii=False)}
SOURCE EVIDENCE: {json.dumps(evidence,ensure_ascii=False)}
CONNECTED PACKAGE: {json.dumps(g,ensure_ascii=False)}
"""
    return call_ai(prompt,{"component":component,"microtopic":ref,"package":g},"component_audit",schema)

def rewrite_package(g,ref,evidence,audits):
    prompt=f"""Rewrite the COMPLETE CONNECTED FIVE-COMPONENT UGC NET Psychology learning package.
A component failed its independent audit. Rewrite the entire package together so all components remain aligned.
Use only supplied source evidence. Do not fill gaps from outside knowledge.
Keep the exact canonical micro-topic ID.
Micro-topic = canonical understanding; Deep Dive = expansion; Active Recall = retrieval of taught knowledge; Revision = reinforcement; Practice = application/discrimination.
Never invent PYQs, citations, statistics, researchers or experiments. Generated practice questions must remain clearly original practice, not PYQs.
Preserve only source-supported cross-references. Return the complete package, not a patch.

CANONICAL: {json.dumps(ref,ensure_ascii=False)}
SOURCE EVIDENCE: {json.dumps(evidence,ensure_ascii=False)}
FAILED COMPONENT AUDITS: {json.dumps(audits,ensure_ascii=False)}
CURRENT PACKAGE: {json.dumps(g,ensure_ascii=False)}
"""
    return call_ai(prompt,{"microtopic":ref,"package":g,"audits":audits},"package_rewrite",{
      "type":"object","properties":{
        "microtopic_id":{"type":"string"},
        "core_explanation":{"type":"string"},
        "detailed_explanation":{"type":"string"},
        "recall_prompts":{"type":"array","items":{"type":"object","properties":{"type":{"type":"string"},"prompt":{"type":"string"},"answer":{"type":"string"}},"required":["type","prompt","answer"],"additionalProperties":False}},
        "cross_references":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"relationship":{"type":"string"},"reason":{"type":"string"}},"required":["id","relationship","reason"],"additionalProperties":False}},
        "revision_guidance":{"type":"object","properties":{"recall_before_review":{"type":"string"},"self_check":{"type":"string"},"weak_point_prompt":{"type":"string"},"rating_instruction":{"type":"string"}},"required":["recall_before_review","self_check","weak_point_prompt","rating_instruction"],"additionalProperties":False},
        "practice_mcqs":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"question":{"type":"string"},"options":{"type":"array","items":{"type":"string"}},"correct_answer":{"type":"string"},"explanation":{"type":"string"}},"required":["id","question","options","correct_answer","explanation"],"additionalProperties":False}}
      },"required":["microtopic_id","core_explanation","detailed_explanation","recall_prompts","cross_references","revision_guidance","practice_mcqs"],"additionalProperties":False})

def load_queue():
    if not QUEUE.exists(): return {"schema_version":2,"updated_at":"","pending":[]}
    value=load(QUEUE)
    return value if isinstance(value,dict) else {"schema_version":2,"updated_at":"","pending":[]}

def main():
    if not STAGING.exists(): print("No staged generated content found; nothing to audit."); return 0
    generated=load(STAGING); policy=load(POLICY); refs=canonical(load(ROOT/"data/syllabus-index.json"))
    if not isinstance(generated,list) or not generated: raise SystemExit("Staged generated content is empty.")
    approved=[]; queue=load_queue()
    pending={(str(x.get("microtopic_id")),str(x.get("component"))):x for x in queue.get("pending",[]) if isinstance(x,dict)}
    report_results=[]

    for original in generated:
        current=original
        mid=str(current.get("microtopic_id",""))
        if mid not in refs: continue
        ref=refs[mid]; evidence=source_evidence(ref)
        final_audits={}; history=[]; passed_components=set()

        for attempt in range(3):
            current["microtopic_id"]=mid
            component_audits={}
            for component in COMPONENTS:
                if component=="microtopic":
                    bad=not str(current.get("core_explanation","")).strip()
                elif component=="deep_dive":
                    bad=not str(current.get("detailed_explanation","")).strip()
                elif component=="active_recall":
                    bad=not current.get("recall_prompts")
                elif component=="revision":
                    rg=current.get("revision_guidance") or {}
                    bad=any(not str(rg.get(k,"")).strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"))
                else:
                    bad=False
                    for q in current.get("practice_mcqs") or []:
                        if not isinstance(q,dict) or len(q.get("options") or [])<2 or not q.get("question") or not q.get("correct_answer") or not q.get("explanation"):
                            bad=True
            
            for component in COMPONENTS:
                audit={"approved":False,"score":0,"critical_failures":["deterministic component structure failed"],"issues":[],"microtopic_id":mid,"component":component} if (
                    (component=="revision" and any(not str((current.get("revision_guidance") or {}).get(k,"")).strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"))) or
                    (component=="practice" and any(not isinstance(q,dict) or len(q.get("options") or [])<2 or not q.get("question") or not q.get("correct_answer") or not q.get("explanation") for q in current.get("practice_mcqs") or []))
                ) else audit_component(current,component,ref,policy,evidence)
                audit["attempt"]=attempt+1; component_audits[component]=audit
            history.append(component_audits); final_audits=component_audits
            passed_components={c for c,a in component_audits.items() if a.get("approved") and float(a.get("score",0))>=float(policy.get("minimum_score",0.9)) and not a.get("critical_failures")}
            failed=[c for c in component_audits if c not in passed_components]
            if not failed: break
            if attempt<2:
                current=rewrite_package(current,ref,evidence,{c:component_audits[c] for c in failed})
                current["microtopic_id"]=mid

        for component in COMPONENTS:
            audit=final_audits.get(component,{})
            key=(mid,component)
            if component in passed_components:
                pending.pop(key,None)
            else:
                pending[key]={"microtopic_id":mid,"component":component,"status":"PENDING_OWNER_APPROVAL","title":ref["title"],
                              "canonical":ref,"attempts":2,"rewrite_attempts":2,"final_audit":audit,
                              "audit_history":[h.get(component) for h in history if component in h],
                              "package":current,"source_evidence_refs":[{"source":x["source"],"chunk":x["chunk"]} for x in evidence],
                              "queued_at":datetime.now(timezone.utc).isoformat()}
        approved.append({"microtopic_id":mid,"package":current,"approved_components":sorted(passed_components)})
        report_results.append({"microtopic_id":mid,"approved_components":sorted(passed_components),
                               "queued_components":sorted(c for c in final_audits if c not in passed_components)})

    APPROVED.parent.mkdir(parents=True,exist_ok=True)
    APPROVED.write_text(json.dumps(approved,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    queue["schema_version"]=2; queue["updated_at"]=datetime.now(timezone.utc).isoformat(); queue["pending"]=list(pending.values())
    QUEUE.parent.mkdir(parents=True,exist_ok=True); QUEUE.write_text(json.dumps(queue,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (ROOT/"content-staging/ai-audit.json").write_text(json.dumps({"schema_version":3,"policy":policy,"audited_packages":len(generated),"results":report_results},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Component audit complete for {len(generated)} connected package(s).")
    return 0

if __name__=="__main__": raise SystemExit(main())
