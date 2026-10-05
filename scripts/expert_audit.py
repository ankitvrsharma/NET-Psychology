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
def question_audit(q):
    x=sig([q.get("question"),q.get("explanation"),q.get("session"),q.get("type"),q.get("kind")]); issues=[]
    if not text(q.get("question")).strip(): issues.append("missing_question")
    if not isinstance(q.get("options"),list) or len(q["options"])!=4: issues.append("invalid_options")
    if not isinstance(q.get("answer"),int) or not 0<=q["answer"]<4: issues.append("invalid_answer")
    if not text(q.get("explanation")).strip(): issues.append("missing_explanation")
    score=max(0,min(100,round((20 if q.get("session") and q.get("type")=="PYQ" else 0)+(15 if not any(i in issues for i in ["invalid_options","invalid_answer"]) else 0)+min(25,len(text(q.get("explanation")))//12)+min(15,x["domainHits"])+min(10,x["contrastHits"]*2+x["mechanismHits"]*2)-min(15,x["genericHits"]*4))))
    status="ISSUE" if any(i in issues for i in ["missing_question","missing_explanation","invalid_options","invalid_answer"]) else "PASS" if score>=THRESHOLD else "REVIEW" if score>=REVIEW else "ISSUE"
    return score,status,issues

micro=load("content/microtopics/microtopic_explanations.json")
quick=load("content/quick-learn/quick_learn_cards.json")
questions=load("content/questions/questions.json")
rows={"microtopics":[],"quickLearnCards":[],"questions":[]}
for mid,m in micro.items():
    score,status,issues=micro_audit(m); rows["microtopics"].append({"id":mid,"title":m.get("title"),"score":score,"status":status,"issues":issues})
for q in list(questions.get("pyq",[]))+list(questions.get("practice",[])):
    score,status,issues=question_audit(q); rows["questions"].append({"id":q.get("id"),"score":score,"status":status,"issues":issues})
for cid,c in quick.items():
    parent=cid.rsplit("|",1)[0]; base=next((x for x in rows["microtopics"] if x["id"]==parent),None); score=(base or {}).get("score",0)
    rows["quickLearnCards"].append({"id":cid,"title":c.get("title"),"score":score,"status":"PASS" if score>=THRESHOLD else "REVIEW" if score>=REVIEW else "ISSUE","issues":[] if score>=THRESHOLD else ["depends_on_microtopic"]})
summary={k:{"total":len(a),"PASS":sum(x["status"]=="PASS" for x in a),"REVIEW":sum(x["status"]=="REVIEW" for x in a),"ISSUE":sum(x["status"]=="ISSUE" for x in a),"average":round(statistics.mean(x["score"] for x in a),1) if a else 0} for k,a in rows.items()}
(ROOT/"expert-audit-report.json").write_text(json.dumps({"generated_at":"1.0.0","audit_version":VERSION,"pass_threshold":THRESHOLD,"review_threshold":REVIEW,"reaudit":summary,"source_pools":["content/microtopics/microtopic_explanations.json","content/questions/questions.json"]},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(summary,indent=2))
