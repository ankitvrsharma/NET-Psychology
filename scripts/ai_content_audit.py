#!/usr/bin/env python3
"""AI audit, two-retry rewrite gate, and approval queue for learner content."""
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

CONTENT_SCHEMA={"type":"object","properties":{
    "microtopic_id":{"type":"string"},
    "core_explanation":{"type":"string"},
    "detailed_explanation":{"type":"string"},
    "recall_prompts":{"type":"array","items":{"type":"object","properties":{
        "type":{"type":"string"},"prompt":{"type":"string"},"answer":{"type":"string"}},
        "required":["type","prompt","answer"],"additionalProperties":False}},
    "cross_references":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"relationship":{"type":"string"},"reason":{"type":"string"}},"required":["id","relationship","reason"],"additionalProperties":False}},
    "revision_guidance":{"type":"object","properties":{
        "recall_before_review":{"type":"string"},"self_check":{"type":"string"},
        "weak_point_prompt":{"type":"string"},"rating_instruction":{"type":"string"}},
        "required":["recall_before_review","self_check","weak_point_prompt","rating_instruction"],
        "additionalProperties":False},
    "required":["microtopic_id","core_explanation","detailed_explanation","cross_references",
             "recall_prompts","revision_guidance"],
"additionalProperties":False}

def source_evidence(ref):
    words=set(norm(ref["title"]+" "+ref["topic_title"]+" "+ref["unit_title"]).split())
    ranked=[]
    for p in sorted(INBOX.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in {".pdf",".docx",".pptx",".txt",".md"}:
            continue
        text=extract(p)
        for i,c in enumerate(chunks(text)):
            score=len(words & set(norm(c).split()))
            if score:
                ranked.append((score,str(p.relative_to(ROOT)),i,c[:12000]))
    ranked.sort(reverse=True,key=lambda x:x[0])
    return [{"source":x[1],"chunk":x[2],"text":x[3]} for x in ranked[:6]]

def audit_one(g, ref, policy, evidence):
    schema={"type":"object","properties":{
        "approved":{"type":"boolean"},"score":{"type":"number"},
        "critical_failures":{"type":"array","items":{"type":"string"}},
        "issues":{"type":"array","items":{"type":"string"}},
        "criteria":{"type":"object","properties":{k:{"type":"number"} for k in policy["criteria"]},
                    "required":policy["criteria"],"additionalProperties":False},
        "rationale":{"type":"string"}},
        "required":["approved","score","critical_failures","issues","criteria","rationale"],
        "additionalProperties":False}
    prompt=f"""You are the final AI quality auditor for a UGC NET Psychology learning website.
Audit ONE generated learning package against the supplied approved source evidence and fixed audit policy.

The micro-topic is the canonical knowledge unit:
- core_explanation = UNDERSTAND
- detailed_explanation = DEEP DIVE / EXPAND
- recall_prompts = ACTIVE RECALL / RETRIEVE
- revision_guidance = REVISION / REINFORCE

Do not reward fluent prose by itself. Verify claims against supplied evidence.
Do not fill source gaps from your own knowledge.
Reject fabricated PYQs, researchers, experiments, statistics or citations.
Reject generic AI filler when it substitutes for Psychology-specific teaching.
Reject contradictions across the four functions.
Reject cross-references that point to nonexistent/self micro-topics, are based only on superficial title similarity, or would mislead the learner about the conceptual relationship.
Reject recall answers not taught by the package.
Approve only when useful for UGC NET/NET-JRF and source-grounded.
Use the policy literally and fail closed.

POLICY:
{json.dumps(policy,ensure_ascii=False)}

CANONICAL MICRO-TOPIC:
{json.dumps(ref,ensure_ascii=False)}

SOURCE EVIDENCE:
{json.dumps(evidence,ensure_ascii=False)}

GENERATED PACKAGE:
{json.dumps(g,ensure_ascii=False)}
"""
    result=call_ai(prompt,{"microtopic":ref,"package":g},"content_audit",schema)
    result["microtopic_id"]=str(g.get("microtopic_id",""))
    return result

def rewrite_one(g, ref, evidence, audit):
    prompt=f"""Rewrite ONE learner-facing UGC NET Psychology learning package that failed an AI audit.
This is retry {audit.get('retry_number',1)} of 2.

Rules:
- Use only the supplied source evidence. Do not use outside knowledge to fill gaps.
- Keep the exact canonical micro-topic ID and topic identity.
- Repair every issue and critical failure identified by the audit.
- Preserve source-supported terminology, researchers, theories and distinctions.
- Never invent PYQs, citations, statistics, researchers or experiments.
- Micro-topic is canonical UNDERSTAND; Deep Dive expands it; Active Recall retrieves only taught knowledge; Revision reinforces it.
- Remove generic AI filler.
- Return the complete package, not a patch.
- Do not change unrelated micro-topics.

CANONICAL MICRO-TOPIC:
{json.dumps(ref,ensure_ascii=False)}

SOURCE EVIDENCE:
{json.dumps(evidence,ensure_ascii=False)}

FAILED PACKAGE:
{json.dumps(g,ensure_ascii=False)}

AUDIT FEEDBACK:
{json.dumps(audit,ensure_ascii=False)}
"""
    return call_ai(prompt,{"microtopic":ref,"failed_package":g,"audit":audit},"content_rewrite",CONTENT_SCHEMA)

def load_queue():
    if not QUEUE.exists():
        return {"schema_version":1,"updated_at":"","pending":[]}
    value=load(QUEUE)
    return value if isinstance(value,dict) else {"schema_version":1,"updated_at":"","pending":[]}

def main():
    if not STAGING.exists():
        print("No staged generated content found; nothing to audit.")
        return 0
    generated=load(STAGING)
    policy=load(POLICY)
    refs=canonical(load(ROOT/"data/syllabus-index.json"))
    if not isinstance(generated,list) or not generated:
        raise SystemExit("Staged generated content is empty.")

    approved=[]
    rejected=[]
    queue=load_queue()
    pending={str(x.get("microtopic_id")):x for x in queue.get("pending",[]) if isinstance(x,dict)}

    for original in generated:
        current=original
        mid=str(current.get("microtopic_id",""))
        if mid not in refs:
            rejected.append(mid)
            pending[mid]={"microtopic_id":mid,"status":"PENDING_OWNER_APPROVAL",
                          "reason":"unknown micro-topic ID","attempts":0,"package":current,
                          "audit_history":[],"queued_at":datetime.now(timezone.utc).isoformat()}
            continue
        ref=refs[mid]
        evidence=source_evidence(ref)
        history=[]
        # Deterministic cross-reference gate before the model audit.
            refs_in_package=current.get("cross_references") or []
            bad_refs=[]
            seen=set()
            for x in refs_in_package:
                rid=str(x.get("id","")).strip() if isinstance(x,dict) else ""
                if not rid or rid==mid or rid not in refs or rid in seen or not str(x.get("relationship","")).strip() or not str(x.get("reason","")).strip():
                    bad_refs.append(rid or "<missing>")
                seen.add(rid)
            final_audit=None
        passed=False

        for attempt in range(3):
            required=["core_explanation","detailed_explanation","recall_prompts","revision_guidance"]
            missing=[x for x in required if not current.get(x)]
            if missing:
                final_audit={"approved":False,"score":0,"critical_failures":["missing generated field(s): "+", ".join(missing)],
                             "issues":[],"microtopic_id":mid}
            elif bad_refs:
                final_audit={"approved":False,"score":0,"critical_failures":["invalid cross-reference(s): "+", ".join(bad_refs)],"issues":[],"microtopic_id":mid}
            else:
                final_audit=audit_one(current,ref,policy,evidence)
            final_audit["attempt"]=attempt+1
            history.append(final_audit)
            if final_audit.get("approved") and float(final_audit.get("score",0))>=float(policy.get("minimum_score",0.9)) and not final_audit.get("critical_failures"):
                passed=True
                break
            if attempt<2:
                current=rewrite_one(current,ref,evidence,final_audit)
                current["microtopic_id"]=mid

        if passed:
            approved.append(current)
            pending.pop(mid,None)
        else:
            rejected.append(mid)
            pending[mid]={
                "microtopic_id":mid,
                "status":"PENDING_OWNER_APPROVAL",
                "title":ref["title"],
                "canonical":ref,
                "attempts":2,
                "rewrite_attempts":2,
                "final_audit":final_audit,
                "audit_history":history,
                "package":current,
                "source_evidence_refs":[{"source":x["source"],"chunk":x["chunk"]} for x in evidence],
                "queued_at":datetime.now(timezone.utc).isoformat()
            }

    APPROVED.parent.mkdir(parents=True,exist_ok=True)
    APPROVED.write_text(json.dumps(approved,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    queue["schema_version"]=1
    queue["updated_at"]=datetime.now(timezone.utc).isoformat()
    queue["pending"]=list(pending.values())
    QUEUE.parent.mkdir(parents=True,exist_ok=True)
    QUEUE.write_text(json.dumps(queue,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    report={"schema_version":2,"policy":policy,"audited_packages":len(generated),
            "approved_packages":len(approved),"rejected_microtopics":rejected,
            "rewrite_attempts_per_rejection":2,"results":[
                {"microtopic_id":mid,"status":"APPROVED" if any(str(x.get("microtopic_id"))==mid for x in approved) else "PENDING_OWNER_APPROVAL"}
                for mid in [str(x.get("microtopic_id","")) for x in generated]
            ]}
    (STAGING/"../ai-audit.json").resolve().write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"AI audit complete: {len(approved)} approved, {len(rejected)} queued for owner approval after two rewrite attempts.")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
