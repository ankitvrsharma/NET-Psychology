#!/usr/bin/env python3
"""AI quality gate for source-grounded NET Psychology learning packages."""
from pathlib import Path
import json, sys, re

ROOT=Path(__file__).resolve().parents[1]
STAGING=ROOT/"content-staging/canonical-content.json"
POLICY=ROOT/"data/ai-content-audit-policy.json"
AUDIT_OUT=ROOT/"content-staging/ai-audit.json"
INBOX=ROOT/"sources/inbox"
sys.path.insert(0,str(ROOT/"scripts"))
from source_to_content import load, extract, chunks, canonical, call_ai, norm

def source_evidence(ref):
    words=set(norm(ref["title"]+" "+ref["topic_title"]+" "+ref["unit_title"]).split())
    ranked=[]
    for p in sorted(INBOX.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in {".pdf",".docx",".pptx",".txt",".md"}:
            continue
        text=extract(p)
        for i,c in enumerate(chunks(text)):
            score=len(words & set(norm(c).split()))
            if score: ranked.append((score,str(p.relative_to(ROOT)),i,c[:12000]))
    ranked.sort(reverse=True,key=lambda x:x[0])
    return [{"source":x[1],"chunk":x[2],"text":x[3]} for x in ranked[:6]]

def main():
    if not STAGING.exists():
        print("No staged generated content found; nothing to audit.")
        return 0
    generated=load(STAGING)
    policy=load(POLICY)
    syllabus=load(ROOT/"data/syllabus-index.json")
    refs=canonical(syllabus)
    if not isinstance(generated,list) or not generated:
        raise SystemExit("Staged generated content is empty.")
    schema={"type":"object","properties":{
        "approved":{"type":"boolean"},
        "score":{"type":"number"},
        "critical_failures":{"type":"array","items":{"type":"string"}},
        "issues":{"type":"array","items":{"type":"string"}},
        "criteria":{"type":"object","properties":{
            k:{"type":"number"} for k in policy["criteria"]
        },"required":policy["criteria"],"additionalProperties":False},
        "rationale":{"type":"string"}
    },"required":["approved","score","critical_failures","issues","criteria","rationale"],"additionalProperties":False}
    results=[]
    for g in generated:
        mid=str(g.get("microtopic_id",""))
        if mid not in refs:
            results.append({"microtopic_id":mid,"approved":False,"score":0,"critical_failures":["unknown micro-topic ID"],"issues":[]})
            continue
        ref=refs[mid]
        # Fail closed on missing core package fields before asking the model.
        required=["core_explanation","detailed_explanation","recall_prompts","exam_takeaway","source_notes","revision_guidance"]
        missing=[x for x in required if not g.get(x)]
        if missing:
            results.append({"microtopic_id":mid,"approved":False,"score":0,"critical_failures":["missing generated field(s): "+", ".join(missing)],"issues":[]})
            continue
        audit_prompt=f"""You are the final AI quality auditor for a UGC NET Psychology learning website.
Audit ONE generated learning package against the supplied approved source evidence and the fixed audit policy.

The micro-topic is the canonical knowledge unit.
The package functions are:
- core_explanation = UNDERSTAND
- detailed_explanation = DEEP DIVE / EXPAND
- recall_prompts = ACTIVE RECALL / RETRIEVE
- revision_guidance = REVISION / REINFORCE

Do not reward fluent prose by itself. Verify claims against the supplied evidence.
Do not fill source gaps from your own knowledge.
Reject fabricated PYQs, researchers, experiments, statistics or citations.
Reject generic filler when it substitutes for Psychology-specific teaching.
Reject contradictions between the four functions.
Reject recall answers that are not taught by the package.
Approve only when the package is genuinely useful for UGC NET/NET-JRF and source-grounded.
Use the policy literally and fail closed.

POLICY:
{json.dumps(policy,ensure_ascii=False)}

CANONICAL MICRO-TOPIC:
{json.dumps(ref,ensure_ascii=False)}

SOURCE EVIDENCE:
{json.dumps(source_evidence(ref),ensure_ascii=False)}

GENERATED PACKAGE:
{json.dumps(g,ensure_ascii=False)}
"""
        audited=call_ai(audit_prompt,{"microtopic":ref,"package":g},"content_audit",schema)
        audited["microtopic_id"]=mid
        results.append(audited)
    min_score=float(policy.get("minimum_score",0.9))
    failures=[]
    for r in results:
        if not r.get("approved") or float(r.get("score",0))<min_score or r.get("critical_failures"):
            failures.append(r["microtopic_id"])
    report={"schema_version":1,"policy":policy,"audited_packages":len(results),
            "approved_packages":len(results)-len(failures),"rejected_microtopics":failures,
            "results":results}
    AUDIT_OUT.parent.mkdir(parents=True,exist_ok=True)
    AUDIT_OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if failures:
        print("AI CONTENT AUDIT FAILED. No generated learner content will be published.")
        print("Rejected:",", ".join(failures))
        return 1
    print(f"AI CONTENT AUDIT PASSED: {len(results)} package(s) approved for direct publication.")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
