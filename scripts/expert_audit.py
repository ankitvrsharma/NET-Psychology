#!/usr/bin/env python3
import json,re,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
THRESHOLD=70
REVIEW=60
VERSION="1.0.0"

def load(rel):
    return json.loads((ROOT/rel).read_text(encoding="utf-8"))
def text(v):
    if isinstance(v,list): return " ".join(text(x) for x in v)
    if isinstance(v,dict): return " ".join(text(x) for x in v.values())
    return str(v or "")
def sig(v):
    s=re.sub(r"\s+"," ",text(v)).strip(); low=s.lower()
    generic=["this topic is important","plays a crucial role","understanding this concept","in simple terms","it is important to note","in conclusion","this helps us understand","is very important"]
    domain=["mechanism","distinguish","contrast","whereas","condition","evidence","study","research","theory","model","construct","process","predict","criterion","validity","reliability","reinforcement","cognition","behaviour","behavior","individual difference","development","assessment","experiment","correlation","causal"]
    teaching=["exam","pyq","trap","recall","application","example","scenario","cue","mnemonic"]
    return {"length":len(s),"genericHits":sum(x in low for x in generic),"domainHits":sum(x in low for x in domain),"teachingHits":sum(x in low for x in teaching),"contrastHits":len(re.findall(r"\b(distinguish|different from|whereas|unlike|contrast|not the same as|however)\b",low)),"mechanismHits":len(re.findall(r"\b(because|therefore|leads to|results in|involves|through|mechanism|process)\b",low))}
def micro_audit(m):
    x=sig([m.get("title"),m.get("content_notes"),m.get("deep_learning"),m.get("detailed_explanation"),m.get("application_question"),m.get("exam_takeaway"),m.get("source_lens")]); issues=[]
    if not text(m.get("title")).strip(): issues.append("missing_title")
    if x["length"]<220: issues.append("too_thin")
    if not isinstance(m.get("sources"),list) or not m["sources"]: issues.append("no_explicit_source_mapping")
    if x["genericHits"]>=3: issues.append("generic_ai_style")
    if x["domainHits"]<3: issues.append("low_psychology_specificity")
    if x["mechanismHits"]<1 and x["contrastHits"]<1: issues.append("weak_explanation_structure")
    score=max(0,min(100,round((15 if m.get("sources") else 0)+min(25,10+x["domainHits"]*2+x["mechanismHits"]*2+x["contrastHits"]*2)+min(20,8+(5 if x["length"]>=500 else 0)+(4 if x["domainHits"]>=6 else 0))+min(15,6+x["teachingHits"]*2)+min(10,4+(2 if m.get("application_question") else 0)+(2 if x["contrastHits"] else 0))+max(0,10-x["genericHits"]*3)-(8 if x["genericHits"]>=3 else 0))))
    status="ISSUE" if any(i in issues for i in ["missing_title","no_explicit_source_mapping"]) or score<REVIEW else "PASS" if score>=THRESHOLD else "REVIEW"
    return score,status,issues
def clean_practice_text(v):
    t=str(v or "").replace("\r","")
    t=re.sub(r"<br\s*/?>","\n",t,flags=re.I)
    t=t.replace("&nbsp;"," ")
    t=re.sub(r"Tap\s+to\s+check\s+answer\s+key"," ",t,flags=re.I)
    t=re.sub(r"\b\d+\s+UGC\s+NET(?:\s+JRF)?\s+[A-Za-z]+\s+\d{4}\s+Paper\s*(?:II|2)\b"," ",t,flags=re.I)
    t=re.sub(r"\bUGC\s+NET(?:\s+JRF)?\s+[A-Za-z]+\s+\d{4}\s+Paper\s*(?:II|2)\b"," ",t,flags=re.I)
    t=re.sub(r"\s+-\s+","-",t)
    t=re.sub(r"\bchi-\s+square\b","chi-square",t,flags=re.I)
    t=re.sub(r"\s*\*\s*"," × ",t)
    return re.sub(r"\n{3,}","\n\n",re.sub(r"[ \t]{2,}"," ",t)).strip()

def strip_question_tail(v):
    t=clean_practice_text(v)
    t=re.sub(r"\s+\d+\s*\.?\s*Codes?\s*:\s*[\s\S]*$","",t,flags=re.I)
    t=re.sub(r"\s+Codes?\s*:\s*[\s\S]*$","",t,flags=re.I)
    return t.strip()

def structured_markers(v):
    t=clean_practice_text(v); hits=[]
    for m in re.finditer(r"(?<!\S)([a-d]|[1-4]|i{1,3}|iv|v)\s*[.)]+\s+",t,re.I):
        hits.append((m.group(1).lower(),m.start(),m.end()))
    return [{"label":h[0],"text":t[h[2]:(hits[i+1][1] if i+1<len(hits) else len(t))].strip()} for i,h in enumerate(hits)]

def parse_match_lists(v):
    raw=clean_practice_text(v)
    lh=re.search(r"\bList\s*[-–—]?\s*I\b",raw,re.I); rh=re.search(r"\bList\s*[-–—]?\s*II\b",raw,re.I)
    if not lh or not rh or rh.start()<=lh.start(): return raw,[],[],bool(lh),bool(rh)
    def cut(x):
        return re.split(r"\bChoose\s+the\s+correct\s+answer\b|\bCodes?\s*:",x,flags=re.I)[0].strip()
    left=structured_markers(cut(raw[lh.end():rh.start()]))
    right=structured_markers(cut(raw[rh.end():]))
    return raw,left,right,True,True

def structural_question_audit(q):
    kind=str(q.get("kind") or "direct").lower()
    raw=clean_practice_text(q.get("question") or q.get("q") or "")
    issues=[]
    if not raw: issues.append("missing_question")
    if kind=="match":
        _,left,right,has_left,has_right=parse_match_lists(raw)
        if not has_left: issues.append("missing_list_i")
        if not has_right: issues.append("missing_list_ii")
        if has_left and has_right:
            if not right: issues.append("missing_list_ii")
            if not left: issues.append("missing_list_i")
            if left and len(left)<4: issues.append("invalid_list_i_count")
            if right and len(right)<4: issues.append("invalid_list_ii_count")
            if left and right and len(left)!=len(right): issues.append("list_count_mismatch")
            all_items=left+right
            if any(re.search(r"\b(?:List\s*[-–—]?\s*[IV]+|Choose\s+the\s+correct\s+answer|Codes?\s*:)",x["text"],re.I) for x in all_items): issues.append("list_instruction_swallowed")
            if re.search(r"\bChoose\s+the\s+correct\s+answer\b",raw,re.I) and any(re.search(r"Choose\s+the\s+correct",x["text"],re.I) for x in right): issues.append("list_instruction_swallowed")
            if re.search(r"\b(?:List\s*[-–—]?\s*I|List\s*[-–—]?\s*II)\b"," ".join(x["text"] for x in left),re.I): issues.append("list_header_swallowed")
            if len(re.findall(r"\b\d{3,}\b",raw))>0: issues.append("ocr_corruption_signal")
            if not (len(left)>=4 and len(right)>=4): issues.append("renderer_contract_failed")
    elif kind=="assertion-reason":
        a=(re.search(r"Assertion\s*\(A\)\s*:\s*([\s\S]*?)(?=\s+Reason\s*\(R\)|\s+\d+\s*\.?\s*Reason\s*\(R\))",raw,re.I) or [None,""])[1].strip()
        reason=(re.search(r"Reason\s*\(R\)\s*:\s*([\s\S]*?)(?=\s+\d+\s*\.?\s*Codes?\s*:|\s+Codes?\s*:|$)",raw,re.I) or [None,""])[1].strip()
        if not a or not reason or a=="Assertion statement" or reason=="Reason statement": issues.append("invalid_assertion_reason")
    elif kind in ("sequence","statement-set"):
        body=re.split(r"\bCodes?\s*:",raw,maxsplit=1,flags=re.I)[0]
        if len(structured_markers(body))<2: issues.append("invalid_structured_items")
    else:
        stem=strip_question_tail(raw)
        if len(stem)<20: issues.append("invalid_structured_items")
        if re.search(r"\bChoose\s+the\s+correct\s+answer\b",stem,re.I) and re.search(r"\bCodes?\s*:",stem,re.I): issues.append("ocr_corruption_signal")
    options_ok=isinstance(q.get("options"),list) and len(q.get("options"))==4 and isinstance(q.get("answer"),int) and 0<=q.get("answer")<4
    if not options_ok: issues.append("answerability_failed")
    return issues

def question_audit(q):
    x=sig([q.get("question"),q.get("explanation"),q.get("session"),q.get("type"),q.get("kind")]); issues=[]
    if not text(q.get("question")).strip(): issues.append("missing_question")
    if not isinstance(q.get("options"),list) or len(q["options"])!=4: issues.append("invalid_options")
    if not isinstance(q.get("answer"),int) or not 0<=q["answer"]<4: issues.append("invalid_answer")
    mapped=q.get("unit") is not None and q.get("topic") is not None and q.get("micro") is not None
    if not mapped: issues.append("unmapped")
    if not text(q.get("explanation")).strip(): issues.append("missing_explanation")
    if x["genericHits"]>=2: issues.append("generic_explanation_style")
    if x["length"]<180: issues.append("thin_explanation")
    if not q.get("session") or q.get("type")!="PYQ": issues.append("weak_provenance")
    structural=structural_question_audit(q); issues.extend(structural)
    score=0
    score += 20 if q.get("session") and q.get("type")=="PYQ" else 0
    score += 15 if isinstance(q.get("options"),list) and len(q.get("options"))==4 and isinstance(q.get("answer"),int) and 0<=q.get("answer")<4 else 0
    score += 15 if mapped else 0
    expl_len=len(text(q.get("explanation")))
    score += min(20,20 if expl_len>=300 else 16 if expl_len>=220 else 12 if expl_len>=180 else 6)
    score += min(15,x["domainHits"]*1.5)
    score += min(10,x["contrastHits"]*2+x["mechanismHits"]*2)
    score += 5 if q.get("kind") else 0
    score -= min(15,x["genericHits"]*4)
    score=max(0,min(100,round(score)))
    critical=set(["missing_question","missing_explanation","invalid_options","invalid_answer","answerability_failed"])
    status="ISSUE" if structural or any(i in critical for i in issues) else "PASS" if score>=THRESHOLD else "REVIEW" if score>=REVIEW else "ISSUE"
    return score,status,sorted(set(issues))

micro=load("content/microtopics/micro_topics.json")
quick=load("content/quick-learn/quick_cards.json")
questions=load("content/questions/questions.json")
mapping=load("mcq_mapping.json")
question_overrides=mapping.get("question_overrides",{})
rows={"microtopics":[],"quickLearnCards":[],"questions":[]}
for mid,m in micro.items():
    score,status,issues=micro_audit(m); rows["microtopics"].append({"id":mid,"title":m.get("title"),"score":score,"status":status,"issues":issues})
for original in list(questions.get("pyq",[]))+list(questions.get("practice",[])):
    q=dict(original)
    override=question_overrides.get(str(q.get("id")),{})
    parts=str(override.get("target","")).split("-") if override.get("target") else []
    if len(parts)==3 and all(p.isdigit() for p in parts): q["unit"],q["topic"],q["micro"]=map(int,parts)
    if override.get("sources"): q["source_tags"]=override["sources"]
    if override.get("topic"): q["source_topic"]=override["topic"]
    score,status,issues=question_audit(q); rows["questions"].append({"id":q.get("id"),"score":score,"status":status,"issues":issues})
for cid,c in quick.items():
    parent=cid.rsplit("|",1)[0]; base=next((x for x in rows["microtopics"] if x["id"]==parent),None); score=(base or {}).get("score",0)
    rows["quickLearnCards"].append({"id":cid,"title":c.get("title"),"score":score,"status":"PASS" if score>=THRESHOLD else "REVIEW" if score>=REVIEW else "ISSUE","issues":[] if score>=THRESHOLD else ["depends_on_microtopic"]})
summary={k:{"total":len(a),"PASS":sum(x["status"]=="PASS" for x in a),"REVIEW":sum(x["status"]=="REVIEW" for x in a),"ISSUE":sum(x["status"]=="ISSUE" for x in a),"average":round(statistics.mean(x["score"] for x in a),1) if a else 0} for k,a in rows.items()}
manifest_path=ROOT/"config/content-publish-manifest.json"
existing=load("config/content-publish-manifest.json") if manifest_path.exists() else {}
manifest={"schema_version":existing.get("schema_version",4),"mode":existing.get("mode","expert_or_owner"),"audit_version":VERSION,"ai_pass":{"questions":[x["id"] for x in rows["questions"] if x["status"]=="PASS"],"microtopics":[x["id"] for x in rows["microtopics"] if x["status"]=="PASS"],"quickLearnCards":[x["id"] for x in rows["quickLearnCards"] if x["status"]=="PASS"],"activeRecall":existing.get("ai_pass",{}).get("activeRecall",[])}, "owner_approved":existing.get("owner_approved",{}),"owner_rejected":existing.get("owner_rejected",{}),"policy":existing.get("policy","REWRITE_AND_REAUDIT_UNTIL_PASS_THEN_OWNER_REVIEW"),"max_automatic_rewrite_cycles":existing.get("max_automatic_rewrite_cycles",2),"note":"PASS content is published automatically; REVIEW and ISSUE content remains held unless explicitly owner-approved."}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(ROOT/"reports/expert-audit-report.json").write_text(json.dumps({"generated_at":"1.0.0","audit_version":VERSION,"pass_threshold":THRESHOLD,"review_threshold":REVIEW,"reaudit":summary,"source_pools":["content/microtopics/micro_topics.json","content/questions/questions.json"]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(summary,indent=2))
