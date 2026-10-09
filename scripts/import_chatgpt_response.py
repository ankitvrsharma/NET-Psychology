#!/usr/bin/env python3
"""Validate ChatGPT output for the selected repository-only content operation."""
from pathlib import Path
import json, sys, re

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import source_to_content as stc

RESPONSE=ROOT/"content-staging/chatgpt-response.json"
APPROVED=ROOT/"content-staging/canonical-content-approved.json"
REPORT=ROOT/"content-staging/chatgpt-import-report.json"
REQUEST=ROOT/"data/content-generation-request.json"
VERIFICATION=ROOT/"data/verification-state.json"
VERIFY_KEYS={"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}
PACKAGE_OPS={"package_rewrite","unit_rewrite"}

def fail(message): raise SystemExit("ChatGPT response rejected: "+message)
def published(mid):
    micro=stc.load(stc.MICRO).get(mid,{})
    deep=stc.load(ROOT/"content/deep-dive/deep_dive.json").get(mid,{})
    recall=stc.load(ROOT/"content/active-recall/active_recall.json").get(mid,{})
    revision=stc.load(stc.REVISION).get(mid,{})
    p=ROOT/"content/practice/practice_mcqs.json"
    practice=stc.load(p).get(mid,{}) if p.exists() else {}
    return {"microtopic":{"core_explanation":micro.get("expert_explanation",""),"cross_references":micro.get("cross_references") or []},
      "deep_dive":{"detailed_explanation":deep.get("detailed_explanation","")},
      "active_recall":{"recall_prompts":recall.get("prompts") or []},
      "revision":{"revision_guidance":{k:revision.get(k,"") for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")}},
      "practice":{"practice_mcqs":practice.get("questions") or []}}

def normalize_space(value): return re.sub(r"\s+"," ",str(value or "")).strip()
def records_in(store,group):
    if isinstance(store,list): return store
    rows=store.get(group,[]) if isinstance(store,dict) else []
    return rows if isinstance(rows,list) else []
def find_record(rows,rid):
    return next((x for x in rows if isinstance(x,dict) and str(x.get("id",""))==str(rid)),None)

def validate_package_response(raw,request,refs,verification):
    packages=raw.get("packages") if isinstance(raw,dict) else raw
    response_targets={str(x).strip() for x in raw.get("target_microtopics",[]) if str(x).strip()} if isinstance(raw,dict) else set()
    requested=response_targets or {str(x).strip() for x in request.get("target_microtopics",[]) if str(x).strip()}
    statuses=verification.get("items") or {}
    required={"microtopic_id","core_explanation","detailed_explanation","recall_prompts","cross_references","revision_guidance","practice_mcqs"}
    if not isinstance(packages,list) or not packages: fail("response must contain a non-empty packages array")
    seen=set(); errors=[]; cleaned=[]
    for index,g in enumerate(packages):
        label=f"package[{index}]"
        if not isinstance(g,dict): errors.append(label+" must be an object"); continue
        missing=required-set(g)
        if missing: errors.append(label+" missing keys: "+", ".join(sorted(missing))); continue
        mid=str(g.get("microtopic_id","")).strip()
        if mid not in refs: errors.append(label+" has unknown canonical microtopic_id "+repr(mid)); continue
        if requested and "__ALL__" not in requested and mid not in requested: errors.append(label+" targets unrequested topic "+mid); continue
        if mid in seen: errors.append("duplicate package for "+mid); continue
        seen.add(mid)
        if not isinstance(g.get("core_explanation"),str) or len(g["core_explanation"].strip())<120: errors.append(mid+": core_explanation must be at least 120 characters")
        if not isinstance(g.get("detailed_explanation"),str) or len(g["detailed_explanation"].strip())<120: errors.append(mid+": detailed_explanation must be at least 120 characters")
        if not isinstance(g.get("recall_prompts"),list) or not g["recall_prompts"]: errors.append(mid+": recall_prompts must be non-empty")
        else:
            for j,p in enumerate(g["recall_prompts"]):
                if not isinstance(p,dict) or not all(isinstance(p.get(k),str) and p[k].strip() for k in ("type","prompt","answer")): errors.append(f"{mid}: recall_prompts[{j}] needs type, prompt and answer")
        if not isinstance(g.get("cross_references"),list): errors.append(mid+": cross_references must be an array")
        else:
            for j,x in enumerate(g["cross_references"]):
                if not isinstance(x,dict) or not all(isinstance(x.get(k),str) and x[k].strip() for k in ("id","relationship","reason")): errors.append(f"{mid}: cross_references[{j}] needs id, relationship and reason")
                elif x["id"] not in refs or x["id"]==mid: errors.append(f"{mid}: invalid/self cross-reference {x.get('id')}")
        rg=g.get("revision_guidance")
        if not isinstance(rg,dict) or not all(isinstance(rg.get(k),str) and rg[k].strip() for k in ("recall_before_review","self_check","weak_point_prompt","rating_instruction")): errors.append(mid+": revision_guidance needs all four fields")
        qs=g.get("practice_mcqs")
        if not isinstance(qs,list) or not qs: errors.append(mid+": practice_mcqs must be non-empty")
        else:
            qids=set()
            for j,q in enumerate(qs):
                if not isinstance(q,dict) or not all(isinstance(q.get(k),str) and q[k].strip() for k in ("id","question","correct_answer","explanation")) or not isinstance(q.get("options"),list) or len(q["options"])!=4 or not all(isinstance(o,str) and o.strip() for o in q["options"]):
                    errors.append(f"{mid}: practice_mcqs[{j}] needs ID, question, four options, correct answer and explanation"); continue
                if q["id"] in qids: errors.append(f"{mid}: duplicate MCQ ID {q['id']}")
                qids.add(q["id"])
                if q["correct_answer"] not in q["options"]: errors.append(f"{mid}: MCQ {q['id']} correct answer must match an option exactly")
        current=published(mid)
        for component,key in VERIFY_KEYS.items():
            if str((statuses.get(key) or {}).get(mid,""))!="EXPERT VERIFIED": continue
            proposed={"microtopic":{"core_explanation":g.get("core_explanation"),"cross_references":g.get("cross_references")},
              "deep_dive":{"detailed_explanation":g.get("detailed_explanation")},"active_recall":{"recall_prompts":g.get("recall_prompts")},
              "revision":{"revision_guidance":g.get("revision_guidance")},"practice":{"practice_mcqs":g.get("practice_mcqs")}}[component]
            if proposed!=current[component]: errors.append(f"{mid}: {component} is EXPERT VERIFIED and must be preserved exactly")
        extra=set(g)-required
        if extra: errors.append(label+" has unsupported keys: "+", ".join(sorted(extra)))
        cleaned.append(g)
    if requested and "__ALL__" not in requested and requested-seen: errors.append("missing requested packages: "+", ".join(sorted(requested-seen)))
    return cleaned,errors

def validate_record_updates(raw,operation,request):
    key="quick_cards" if operation=="quick_cards_rewrite" else "question_updates"
    updates=raw.get(key) if isinstance(raw,dict) else None
    if not isinstance(updates,list) or not updates: fail("response must contain a non-empty "+key+" array")
    quick_store=stc.load(stc.QUICK) if operation=="quick_cards_rewrite" else {}
    qstore=stc.load(stc.QUESTIONS) if operation!="quick_cards_rewrite" else {}
    group="pyq" if operation=="pyq_improvement" else "practice"
    rows=list(quick_store.values()) if isinstance(quick_store,dict) else []
    if operation!="quick_cards_rewrite": rows=records_in(qstore,group)
    current_by_id={str(x.get("id","")):x for x in rows if isinstance(x,dict)}
    if operation=="quick_cards_rewrite" and isinstance(quick_store,dict):
        current_by_id={str(k):v for k,v in quick_store.items() if isinstance(v,dict)}
    requested={str(x) for x in request.get("target_microtopics",[]) if str(x)}
    seen=set(); cleaned=[]; errors=[]
    for i,row in enumerate(updates):
        if not isinstance(row,dict) or not isinstance(row.get("id"),(str,int)) or not isinstance(row.get("updates"),dict):
            errors.append(f"{key}[{i}] must have an existing id and updates object"); continue
        rid=str(row["id"])
        if rid in seen: errors.append("duplicate update ID "+rid); continue
        seen.add(rid)
        current=current_by_id.get(rid)
        if not current: errors.append("unknown record ID "+rid); continue
        proposed=row["updates"]
        if not proposed: errors.append(rid+": updates cannot be empty"); continue
        if operation=="quick_cards_rewrite":
            text_fields={"title","front","back","question","content","answer","explanation","notes","summary","prompt","text"}
            for field,value in proposed.items():
                if field not in text_fields or field not in current: errors.append(f"{rid}: cannot update Quick Learn field {field}")
                elif not isinstance(value,str) or not value.strip(): errors.append(f"{rid}: {field} must be a non-empty string")
        else:
            allowed={"question","options","explanation"}
            for field in proposed:
                if field not in allowed: errors.append(f"{rid}: cannot update question field {field}")
            if "explanation" not in proposed or not isinstance(proposed.get("explanation"),str) or len(proposed["explanation"].strip())<60:
                errors.append(rid+": explanation must be substantive (at least 60 characters)")
            if "question" in proposed:
                if not isinstance(proposed["question"],str) or normalize_space(proposed["question"])!=normalize_space(current.get("question",current.get("q",""))):
                    errors.append(rid+": question wording may not change; only whitespace formatting is allowed")
            if "options" in proposed:
                old=current.get("options",current.get("o",[])); new=proposed["options"]
                if not isinstance(old,list) or not isinstance(new,list) or len(old)!=len(new) or any(normalize_space(a)!=normalize_space(b) for a,b in zip(old,new)):
                    errors.append(rid+": option wording/order may not change; only whitespace formatting is allowed")
        cleaned.append({"id":rid,"updates":proposed})
    if errors: return [],errors
    return cleaned,[]

def main():
    if not RESPONSE.exists(): fail("missing "+str(RESPONSE.relative_to(ROOT)))
    raw=stc.load(RESPONSE)
    if not isinstance(raw,dict): fail("response must be a JSON object")
    request=stc.load(REQUEST) if REQUEST.exists() else {}
    operation=str(request.get("operation") or "package_rewrite")
    refs=stc.canonical(stc.load(stc.SYLLABUS))
    verification=stc.load(VERIFICATION) if VERIFICATION.exists() else {"items":{}}
    approved={"schema_version":2,"operation":operation,"packages":[],"quick_cards":[],"question_updates":[]}
    errors=[]
    if operation in PACKAGE_OPS:
        approved["packages"],errors=validate_package_response(raw,request,refs,verification)
        if operation=="unit_rewrite":
            unit_id=str(request.get("target_unit_id",""))
            requested_ids={str(x) for x in request.get("target_microtopics",[]) if str(x)}
            expected={mid for mid,ref in refs.items() if str(ref["unit"])==unit_id}
            if requested_ids: expected &= requested_ids
            actual={g.get("microtopic_id") for g in approved["packages"]}
            if expected and actual!=expected: errors.append("whole-unit rewrite must return every requested canonical micro-topic in the selected unit; missing: "+", ".join(sorted(expected-actual)))
    elif operation in {"quick_cards_rewrite","mcq_improvement","pyq_improvement"}:
        result,errors=validate_record_updates(raw,operation,request)
        if operation=="quick_cards_rewrite": approved["quick_cards"]=result
        else: approved["question_updates"]=result
    else: fail("unsupported operation "+operation)
    if errors:
        report={"ok":False,"operation":operation,"errors":errors}
        REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        for error in errors: print("ERROR: "+error)
        fail(f"{len(errors)} validation issue(s); see {REPORT.relative_to(ROOT)}")
    APPROVED.parent.mkdir(parents=True,exist_ok=True)
    APPROVED.write_text(json.dumps(approved,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    REPORT.write_text(json.dumps({"ok":True,"operation":operation,"packages":len(approved["packages"]),"quick_cards":len(approved["quick_cards"]),"question_updates":len(approved["question_updates"]),"expert_verified_components_preserved":True,"ai_api_used":False},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ChatGPT response validated for "+operation+"; staged for deterministic publication checks.")

if __name__=="__main__": main()
