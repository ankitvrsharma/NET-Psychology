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
INSIGHTS=ROOT/"data/gemini-content-insights.json"
QUESTIONS=ROOT/"content/questions/questions.json"
INBOX=ROOT/"sources/inbox"
sys.path.insert(0,str(ROOT/"scripts"))
from source_to_content import load, extract, chunks, canonical, call_ai, norm

COMPONENTS=("microtopic","deep_dive","active_recall","revision","practice")
FIELDS={
 "microtopic":["core_explanation","cross_references"],
 "deep_dive":["detailed_explanation"],
 "active_recall":["recall_prompts"],
 "revision":["revision_guidance"],
 "practice":["practice_mcqs"],
}

def snapshot_component(g,component):
    if component=="microtopic": return {"core_explanation":g.get("core_explanation",""),"cross_references":g.get("cross_references") or []}
    if component=="deep_dive": return {"detailed_explanation":g.get("detailed_explanation","")}
    if component=="active_recall": return {"recall_prompts":g.get("recall_prompts") or []}
    if component=="revision": return {"revision_guidance":g.get("revision_guidance") or {}}
    if component=="practice": return {"practice_mcqs":g.get("practice_mcqs") or []}
    return {}
def restore_component(g,component,snapshot):
    if component=="microtopic":
        g["core_explanation"]=snapshot.get("core_explanation",""); g["cross_references"]=snapshot.get("cross_references") or []
    elif component=="deep_dive":
        g["detailed_explanation"]=snapshot.get("detailed_explanation","")
    elif component=="active_recall":
        g["recall_prompts"]=snapshot.get("recall_prompts") or []
    elif component=="revision":
        g["revision_guidance"]=snapshot.get("revision_guidance") or {}
    elif component=="practice":
        g["practice_mcqs"]=snapshot.get("practice_mcqs") or []

def source_evidence(ref):
    words=set(norm(ref["title"]+" "+ref["topic_title"]+" "+ref["unit_title"]).split())
    per_source=[]; all_ranked=[]
    for p in sorted(INBOX.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in {".pdf",".docx",".pptx",".txt",".md"}: continue
        source=str(p.relative_to(ROOT)); source_ranked=[]
        text=extract(p)
        for i,c in enumerate(chunks(text)):
            score=len(words & set(norm(c).split()))
            if score:
                row=(score,source,i,c[:12000]); source_ranked.append(row); all_ranked.append(row)
        if source_ranked:
            source_ranked.sort(reverse=True,key=lambda x:x[0]); per_source.append(source_ranked[0])
    all_ranked.sort(reverse=True,key=lambda x:x[0])
    selected=[]; seen=set()
    for row in per_source+all_ranked:
        key=(row[1],row[2])
        if key in seen: continue
        seen.add(key); selected.append(row)
        if len(selected)>=12: break
    return [{"source":x[1],"chunk":x[2],"text":x[3]} for x in selected]

def available(g,component):
    # All five components are required for a connected package. Missing content is a deterministic failure, not an optional omission.
    return True

def published_snapshot(mid,component):
    micro=load(ROOT/"content/microtopics/micro_topics.json")
    if component=="microtopic":
        item=micro.get(mid,{})
        return {"core_explanation":item.get("expert_explanation",""),"cross_references":item.get("cross_references") or []}
    if component=="deep_dive":
        item=load(ROOT/"content/deep-dive/deep_dive.json").get(mid,{})
        return {"detailed_explanation":item.get("detailed_explanation","")}
    if component=="active_recall":
        item=load(ROOT/"content/active-recall/active_recall.json").get(mid,{})
        return {"recall_prompts":item.get("prompts") or []}
    if component=="revision":
        item=load(ROOT/"content/revision/revision_guidance.json").get(mid,{})
        return {"revision_guidance":{k:item.get(k,"") for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")}}
    item=load(ROOT/"content/practice/practice_mcqs.json").get(mid,{})
    return {"practice_mcqs":item.get("questions") or []}

def verified_conflict(mid,component,verified,proposed,ref,evidence):
    shapes={
      "microtopic":{"type":"object","properties":{"core_explanation":{"type":"string"},"cross_references":{"type":"array","items":{"type":"object"}}},"required":["core_explanation","cross_references"],"additionalProperties":False},
      "deep_dive":{"type":"object","properties":{"detailed_explanation":{"type":"string"}},"required":["detailed_explanation"],"additionalProperties":False},
      "active_recall":{"type":"object","properties":{"recall_prompts":{"type":"array","items":{"type":"object"}}},"required":["recall_prompts"],"additionalProperties":False},
      "revision":{"type":"object","properties":{"revision_guidance":{"type":"object"}},"required":["revision_guidance"],"additionalProperties":False},
      "practice":{"type":"object","properties":{"practice_mcqs":{"type":"array","items":{"type":"object"}}},"required":["practice_mcqs"],"additionalProperties":False}
    }
    schema={"type":"object","properties":{"conflict":{"type":"boolean"},"severity":{"type":"string"},"conflicting_claims":{"type":"array","items":{"type":"string"}},"rationale":{"type":"string"},"proposed_version":shapes[component]},"required":["conflict","severity","conflicting_claims","rationale","proposed_version"],"additionalProperties":False}
    prompt=f"""Determine whether new source evidence creates a MATERIAL CONTENT CONFLICT with an owner EXPERT VERIFIED {component} component.
A wording improvement is not a conflict. A conflict exists when supplied evidence supports a materially different, contradictory, or important correction.
Do not use outside knowledge. If evidence is insufficient, return conflict=false.
If conflict=true, proposed_version must be source-grounded and suitable for owner comparison. Never replace the verified version automatically.

CANONICAL: {json.dumps(ref,ensure_ascii=False)}
VERIFIED VERSION: {json.dumps(verified,ensure_ascii=False)}
NEW/PROPOSED VERSION: {json.dumps(proposed,ensure_ascii=False)}
SOURCE EVIDENCE: {json.dumps(evidence,ensure_ascii=False)}
"""
    return call_ai(prompt,{"microtopic":ref,"component":component,"verified_version":verified,"proposed_version":proposed,"source_evidence":evidence},"verified_conflict",schema)

def pyq_evidence(mid):
    raw=load(QUESTIONS)
    questions=raw if isinstance(raw,list) else [*raw.get("pyq",[]),*raw.get("practice",[])]
    out=[]
    for q in questions:
        qmid=f"{q.get('unit')}-{q.get('topic')}-{q.get('micro')}"
        if qmid==mid and "pyq" in str(q.get("type","")).lower():
            out.append({"id":q.get("id"),"year":q.get("year"),"question":q.get("question") or q.get("q"),"options":q.get("options")})
    return out[:40]

def generate_insight(mid,ref,package,evidence,conflicts):
    pyqs=pyq_evidence(mid)
    schema={"type":"object","properties":{
      "priority":{"type":"string"},"strengths":{"type":"array","items":{"type":"string"}},"gaps":{"type":"array","items":{"type":"string"}},
      "pyq_signals":{"type":"array","items":{"type":"string"}},"source_opportunities":{"type":"array","items":{"type":"string"}},
      "learning_design_suggestions":{"type":"array","items":{"type":"string"}},"recommended_actions":{"type":"array","items":{"type":"string"}},
      "rationale":{"type":"string"}
    },"required":["priority","strengths","gaps","pyq_signals","source_opportunities","learning_design_suggestions","recommended_actions","rationale"],"additionalProperties":False}
    prompt=f"""Act as the content-quality advisor for a UGC NET Psychology learning system.
Provide INSIGHTS AND SUGGESTIONS, not an automatic rewrite. Compare authentic supplied PYQs, the current canonical five-component package, and relevant excerpts from the complete approved source library.
Identify improvements in conceptual coverage, PYQ alignment, distinctions, retrieval quality, revision design, practice quality, source-supported depth, and unnecessary repetition.
Never invent PYQ frequency/trends, facts, researchers, citations or exam claims. If supplied PYQs do not support a trend, say so. Respect EXPERT VERIFIED conflicts and recommend owner review rather than silently changing them.
Suggestions must be actionable and source-grounded.

CANONICAL: {json.dumps(ref,ensure_ascii=False)}
CURRENT PACKAGE: {json.dumps(package,ensure_ascii=False)}
AUTHENTIC PYQS: {json.dumps(pyqs,ensure_ascii=False)}
SOURCE EVIDENCE: {json.dumps(evidence,ensure_ascii=False)}
VERIFIED CONFLICTS: {json.dumps(conflicts,ensure_ascii=False)}
"""
    return call_ai(prompt,{"microtopic":ref,"package":package,"pyqs":pyqs,"sources":evidence,"conflicts":conflicts},"content_insight",schema)

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

def rewrite_package(g,ref,evidence,audits,locked_components):
    prompt=f"""Rewrite the CONNECTED FIVE-COMPONENT UGC NET Psychology learning package, but rewrite ONLY components that are not marked EXPERT VERIFIED.
A non-verified component failed its independent audit. Rewrite the non-verified components together so they remain aligned with the canonical knowledge and with any locked expert-verified components.
Use only supplied source evidence. Do not fill gaps from outside knowledge.
Keep the exact canonical micro-topic ID.
Micro-topic = canonical understanding; Deep Dive = expansion; Active Recall = retrieval of taught knowledge; Revision = reinforcement; Practice = application/discrimination.
Never invent PYQs, citations, statistics, researchers or experiments. Generated practice questions must remain clearly original practice, not PYQs.
EXPERT VERIFIED COMPONENTS ARE LOCKED. Preserve them exactly as supplied. Do not paraphrase, shorten, expand, reformat, replace, regenerate, or "improve" a locked component. Return the complete package, not a patch.
LOCKED COMPONENTS: {json.dumps(sorted(locked_components))}


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
    verification=load(ROOT/"data/verification-state.json") if (ROOT/"data/verification-state.json").exists() else {"items":{}}
    verification_items=verification.get("items") or {}
    if not isinstance(generated,list) or not generated: raise SystemExit("Staged generated content is empty.")
    approved=[]; queue=load_queue()
    pending={(str(x.get("microtopic_id")),str(x.get("component"))):x for x in queue.get("pending",[]) if isinstance(x,dict)}
    report_results=[]

    for original in generated:
        current=original
        mid=str(current.get("microtopic_id",""))
        if mid not in refs: continue
        ref=refs[mid]; evidence=source_evidence(ref)
        locked_components={c for c,key in {"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}.items() if str(verification_items.get(key,{}).get(mid,""))=="EXPERT VERIFIED"}
        locked_snapshots={c:published_snapshot(mid,c) for c in locked_components}
        conflict_items=[]
        for component in sorted(locked_components):
            proposed=snapshot_component(original.get("package",original),component)
            analysis=verified_conflict(mid,component,locked_snapshots[component],proposed,ref,evidence)
            if analysis.get("conflict"):
                conflict_items.append({
                    "microtopic_id":mid,"component":component,"status":"PENDING_OWNER_CONFLICT_REVIEW",
                    "review_type":"VERIFIED_CONFLICT","title":ref["title"],"canonical":ref,
                    "severity":analysis.get("severity","material"),
                    "conflicting_claims":analysis.get("conflicting_claims") or [],
                    "rationale":analysis.get("rationale",""),
                    "verified_version":locked_snapshots[component],
                    "proposed_version":analysis.get("proposed_version") or proposed,
                    "generated_version":proposed,
                    "source_evidence_refs":[{"source":x["source"],"chunk":x["chunk"]} for x in evidence],
                    "queued_at":datetime.now(timezone.utc).isoformat()
                })
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
                audit={"approved":True,"score":1.0,"critical_failures":[],"issues":["expert_verified_locked"],"microtopic_id":mid,"component":component,"rationale":"Owner marked this component EXPERT VERIFIED; AI rewrite and AI approval are bypassed for this component."} if (
                    component in locked_components and not (
                        (component=="revision" and any(not str((current.get("revision_guidance") or {}).get(k,"")).strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"))) or
                        (component=="practice" and any(not isinstance(q,dict) or len(q.get("options") or [])<2 or not q.get("question") or not q.get("correct_answer") or not q.get("explanation") for q in current.get("practice_mcqs") or []))
                    )
                ) else ({"approved":False,"score":0,"critical_failures":["deterministic component structure failed"],"issues":[],"microtopic_id":mid,"component":component} if (
                    (component=="revision" and any(not str((current.get("revision_guidance") or {}).get(k,"")).strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"))) or
                    (component=="practice" and any(not isinstance(q,dict) or len(q.get("options") or [])<2 or not q.get("question") or not q.get("correct_answer") or not q.get("explanation") for q in current.get("practice_mcqs") or []))
                ) else audit_component(current,component,ref,policy,evidence))
                audit["attempt"]=attempt+1; component_audits[component]=audit
            history.append(component_audits); final_audits=component_audits
            passed_components={c for c,a in component_audits.items() if a.get("approved") and float(a.get("score",0))>=float(policy.get("minimum_score",0.9)) and not a.get("critical_failures")}
            failed=[c for c in component_audits if c not in passed_components]
            if not failed: break
            if attempt<2:
                current=rewrite_package(current,ref,evidence,{c:component_audits[c] for c in failed},locked_components)
                current["microtopic_id"]=mid
                for component,snapshot in locked_snapshots.items():
                    restore_component(current,component,snapshot)

        for conflict in conflict_items:
            pending[(mid,"CONFLICT:"+conflict["component"])]=conflict
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
        insight=generate_insight(mid,ref,current,evidence,conflict_items)
        insights[mid]={"microtopic_id":mid,"title":ref["title"],"priority":insight.get("priority","medium"),"insight":insight,
                       "pyq_count":len(pyq_evidence(mid)),"source_evidence_refs":[{"source":x["source"],"chunk":x["chunk"]} for x in evidence],
                       "generated_at":datetime.now(timezone.utc).isoformat()}
        report_results.append({"microtopic_id":mid,"approved_components":sorted(passed_components),
                               "queued_components":sorted(c for c in final_audits if c not in passed_components),
                               "verified_conflicts":[x["component"] for x in conflict_items]})

    APPROVED.parent.mkdir(parents=True,exist_ok=True)
    APPROVED.write_text(json.dumps(approved,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    INSIGHTS.parent.mkdir(parents=True,exist_ok=True)
    INSIGHTS.write_text(json.dumps({"schema_version":1,"updated_at":datetime.now(timezone.utc).isoformat(),"items":insights},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    queue["schema_version"]=2; queue["updated_at"]=datetime.now(timezone.utc).isoformat(); queue["pending"]=list(pending.values())
    QUEUE.parent.mkdir(parents=True,exist_ok=True); QUEUE.write_text(json.dumps(queue,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (ROOT/"content-staging/ai-audit.json").write_text(json.dumps({"schema_version":3,"policy":policy,"audited_packages":len(generated),"results":report_results},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Component audit complete for {len(generated)} connected package(s).")
    return 0

if __name__=="__main__": raise SystemExit(main())
