#!/usr/bin/env python3
"""Validate a ChatGPT-produced JSON package without any model API, then stage it for publication."""
from pathlib import Path
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import source_to_content as stc

RESPONSE=ROOT/"content-staging/chatgpt-response.json"
APPROVED=ROOT/"content-staging/canonical-content-approved.json"
REPORT=ROOT/"content-staging/chatgpt-import-report.json"
REQUEST=ROOT/"data/content-generation-request.json"
VERIFICATION=ROOT/"data/verification-state.json"
VERIFY_KEYS={"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}

def published(mid):
    micro=stc.load(stc.MICRO).get(mid,{})
    deep=stc.load(ROOT/"content/deep-dive/deep_dive.json").get(mid,{})
    recall=stc.load(ROOT/"content/active-recall/active_recall.json").get(mid,{})
    revision=stc.load(stc.REVISION).get(mid,{})
    p=ROOT/"content/practice/practice_mcqs.json"
    practice=stc.load(p).get(mid,{}) if p.exists() else {}
    return {
      "microtopic":{"core_explanation":micro.get("expert_explanation",""),"cross_references":micro.get("cross_references") or []},
      "deep_dive":{"detailed_explanation":deep.get("detailed_explanation","")},
      "active_recall":{"recall_prompts":recall.get("prompts") or []},
      "revision":{"revision_guidance":{k:revision.get(k,"") for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")}},
      "practice":{"practice_mcqs":practice.get("questions") or []}
    }

def fail(message):
    raise SystemExit("ChatGPT response rejected: "+message)

def main():
    if not RESPONSE.exists():
        fail("missing "+str(RESPONSE.relative_to(ROOT)))
    raw=stc.load(RESPONSE)
    response_targets=set()
    if isinstance(raw,dict):
        packages=raw.get("packages")
        response_targets={str(x).strip() for x in raw.get("target_microtopics",[]) if str(x).strip()}
    else:
        packages=raw
    if not isinstance(packages,list) or not packages:
        fail("response must be a non-empty JSON array, or an object with target_microtopics and packages arrays")
    request=stc.load(REQUEST) if REQUEST.exists() else {}
    requested=response_targets or {str(x).strip() for x in request.get("target_microtopics",[]) if str(x).strip()}
    refs=stc.canonical(stc.load(stc.SYLLABUS))
    verification=stc.load(VERIFICATION) if VERIFICATION.exists() else {"items":{}}
    statuses=verification.get("items") or {}
    required={"microtopic_id","core_explanation","detailed_explanation","recall_prompts","cross_references","revision_guidance","practice_mcqs"}
    seen=set(); errors=[]; cleaned=[]
    for index,g in enumerate(packages):
        label=f"package[{index}]"
        if not isinstance(g,dict):
            errors.append(label+" must be an object"); continue
        missing=required-set(g)
        if missing:
            errors.append(label+" missing keys: "+", ".join(sorted(missing))); continue
        mid=str(g.get("microtopic_id","")).strip()
        if mid not in refs:
            errors.append(label+" has unknown canonical microtopic_id "+repr(mid)); continue
        if requested and "__ALL__" not in requested and mid not in requested:
            errors.append(label+" targets "+mid+" which was not requested"); continue
        if mid in seen:
            errors.append("duplicate package for "+mid); continue
        seen.add(mid)
        if not isinstance(g.get("core_explanation"),str) or len(g["core_explanation"].strip())<120:
            errors.append(mid+": core_explanation must be a substantive string (at least 120 characters)")
        if not isinstance(g.get("detailed_explanation"),str) or len(g["detailed_explanation"].strip())<120:
            errors.append(mid+": detailed_explanation must be a substantive string (at least 120 characters)")
        if not isinstance(g.get("recall_prompts"),list) or not g["recall_prompts"]:
            errors.append(mid+": recall_prompts must be a non-empty array")
        else:
            for j,p in enumerate(g["recall_prompts"]):
                if not isinstance(p,dict) or not all(isinstance(p.get(k),str) and p[k].strip() for k in ("type","prompt","answer")):
                    errors.append(f"{mid}: recall_prompts[{j}] needs non-empty type, prompt and answer")
        if not isinstance(g.get("cross_references"),list):
            errors.append(mid+": cross_references must be an array")
        else:
            for j,x in enumerate(g["cross_references"]):
                if not isinstance(x,dict) or not all(isinstance(x.get(k),str) and x[k].strip() for k in ("id","relationship","reason")):
                    errors.append(f"{mid}: cross_references[{j}] needs id, relationship and reason")
                elif x["id"] not in refs or x["id"]==mid:
                    errors.append(f"{mid}: cross-reference {x['id']} is invalid or self-referential")
        rg=g.get("revision_guidance")
        if not isinstance(rg,dict) or not all(isinstance(rg.get(k),str) and rg[k].strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")):
            errors.append(mid+": revision_guidance must contain all four non-empty guidance strings")
        if not isinstance(g.get("practice_mcqs"),list) or not g["practice_mcqs"]:
            errors.append(mid+": practice_mcqs must be a non-empty array")
        else:
            qids=set()
            for j,q in enumerate(g["practice_mcqs"]):
                if not isinstance(q,dict) or not all(isinstance(q.get(k),str) and q[k].strip() for k in ("id","question","correct_answer","explanation")) or not isinstance(q.get("options"),list) or len(q["options"])<2 or not all(isinstance(o,str) and o.strip() for o in q["options"]):
                    errors.append(f"{mid}: practice_mcqs[{j}] has invalid fields/options")
                    continue
                if q["id"] in qids: errors.append(f"{mid}: duplicate practice MCQ ID {q['id']}")
                qids.add(q["id"])
                if q["correct_answer"] not in q["options"]:
                    errors.append(f"{mid}: MCQ {q['id']} correct_answer must match one option exactly")
        current=published(mid)
        for component,key in VERIFY_KEYS.items():
            if str((statuses.get(key) or {}).get(mid,""))!="EXPERT VERIFIED":
                continue
            proposed={
              "microtopic":{"core_explanation":g.get("core_explanation"),"cross_references":g.get("cross_references")},
              "deep_dive":{"detailed_explanation":g.get("detailed_explanation")},
              "active_recall":{"recall_prompts":g.get("recall_prompts")},
              "revision":{"revision_guidance":g.get("revision_guidance")},
              "practice":{"practice_mcqs":g.get("practice_mcqs")}
            }[component]
            if proposed!=current[component]:
                errors.append(f"{mid}: {component} is EXPERT VERIFIED and must be preserved exactly")
        allowed=required
        extra=set(g)-allowed
        if extra:
            errors.append(label+" has unsupported keys: "+", ".join(sorted(extra)))
        cleaned.append(g)
    if requested and "__ALL__" not in requested:
        missing=requested-seen
        if missing:
            errors.append("missing requested packages: "+", ".join(sorted(missing)))
    if errors:
        report={"ok":False,"errors":errors,"received_packages":len(packages)}
        REPORT.parent.mkdir(parents=True,exist_ok=True)
        REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        for error in errors: print("ERROR: "+error)
        fail(f"{len(errors)} validation issue(s); see {REPORT.relative_to(ROOT)}")
    APPROVED.parent.mkdir(parents=True,exist_ok=True)
    APPROVED.write_text(json.dumps(cleaned,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    report={"ok":True,"received_packages":len(cleaned),"microtopic_ids":[g["microtopic_id"] for g in cleaned],"expert_verified_components_preserved":True,"ai_api_used":False}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ChatGPT response validated; staged "+str(len(cleaned))+" package(s) for deterministic publication checks.")

if __name__=="__main__":
    main()
