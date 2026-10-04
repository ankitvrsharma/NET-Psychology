import json, os, re, sys, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
OWNER=ROOT/"content-owner-overrides.json"; DATA=ROOT/"data.json"; DATAJS=ROOT/"data.js"; TRACK=ROOT/"rewrite-reaudit-tracking.json"
MAX=2; PASS=70
def now(): return datetime.now(timezone.utc).isoformat()
def load(p,d): return json.loads(p.read_text(encoding="utf-8")) if p.exists() else d
def save(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def find_micro(data,key):
    try: u,t,m=map(int,str(key).split("-")[:3])
    except: return None
    for a in data.get("units",[]):
        if a.get("id")==u:
            for b in a.get("topics",[]):
                if b.get("id")==t:
                    for c in b.get("microtopics",[]):
                        if c.get("id")==m: return c
def find_question(qs,key): return next((q for q in qs if str(q.get("id"))==str(key)),None)
def target(data,qs,typ,key): return find_question(qs,key) if typ=="questions" else find_micro(data,str(key).split("|",1)[0])
def terms(x):
    s=re.sub(r"\s+"," ",str(x or "")).lower()
    words=["mechanism","theory","model","construct","process","research","study","cognition","learning","memory","personality","motivation","emotion","perception","stress","coping","assessment","experiment","correlation","development","attitude"]
    d=sum(bool(re.search(r"\b"+re.escape(w)+r"\b",s)) for w in words)
    g=sum(w in s for w in ["this topic is important","plays a crucial role","in simple terms","it is important to note","in conclusion"])
    st=len(re.findall(r"\b(because|therefore|leads to|results in|involves|mechanism|process|whereas|distinguish|contrast)\b",s))
    return len(s),d,g,st
def audit(m):
    text=" ".join(str(m.get(k,"")) for k in ["title","content_notes","deep_learning","expert_explanation","detailed_explanation","application_question","exam_takeaway","source_lens"])
    n,d,g,st=terms(text); score=(15 if m.get("sources") else 0)+min(30,d*3)+min(20,st*3)+min(20,n//40)+min(15,5+(2 if m.get("application_question") else 0)+(2 if m.get("retrieval_questions") else 0))
    if g>=3: score-=10
    score=max(0,min(100,round(score))); issues=[]
    if not m.get("title"): issues.append("missing_title")
    if not m.get("sources"): issues.append("no_explicit_source_mapping")
    if n<220: issues.append("too_thin")
    if d<3: issues.append("low_psychology_specificity")
    if st<1: issues.append("weak_explanation_structure")
    if g>=3: issues.append("generic_ai_style")
    status="PASS" if score>=PASS and not any(i in issues for i in ["missing_title","no_explicit_source_mapping"]) else ("REVIEW" if score>=60 else "ISSUE")
    return {"score":score,"status":status,"issues":issues}
def q_audit(q):
    e=str(q.get("explanation","")); n,d,g,st=terms(str(q.get("question",""))+" "+e)
    ok=isinstance(q.get("options"),list) and len(q["options"])==4 and isinstance(q.get("answer"),int) and 0<=q["answer"]<4
    score=(20 if q.get("session") and q.get("type")=="PYQ" else 0)+(15 if ok else 0)+(15 if all(q.get(k) is not None for k in ["unit","topic","micro"]) else 0)+min(20,n//15)+min(15,d*2)+min(10,st*2)-min(15,g*4)
    score=max(0,min(100,round(score))); issues=[]
    if not q.get("question"): issues.append("missing_question")
    if not ok: issues.append("invalid_options_or_answer")
    if not e: issues.append("missing_explanation")
    return {"score":score,"status":"PASS" if score>=PASS and not issues else ("REVIEW" if score>=60 else "ISSUE"),"issues":issues}
def api(prompt):
    key=os.environ.get("OPENAI_API_KEY")
    if not key: raise RuntimeError("OPENAI_API_KEY GitHub secret is not configured.")
    body={"model":os.environ.get("OPENAI_REWRITE_MODEL") or "gpt-6-luna","input":[{"role":"system","content":"Rewrite UGC NET Psychology content using only supplied evidence. Do not invent studies, authors, statistics, PYQs, citations or unsupported claims. Preserve provenance, mappings and answer keys. Return only JSON."},{"role":"user","content":prompt}],"max_output_tokens":5000}
    req=urllib.request.Request("https://api.openai.com/v1/responses",data=json.dumps(body).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=180) as r: out=json.load(r)
    except urllib.error.HTTPError as e: raise RuntimeError("OpenAI API error "+str(e.code))
    text=out.get("output_text","")
    if not text: text="".join(c.get("text","") for i in out.get("output",[]) for c in i.get("content",[]) if c.get("type") in ["output_text","text"])
    text=text.strip(); fence=chr(96)*3
    if text.startswith(fence):
        text=re.sub(r"^"+re.escape(fence)+r"(?:json)?\s*","",text); text=re.sub(r"\s*"+re.escape(fence)+r"$","",text)
    return json.loads(text)
def main():
    owner=load(OWNER,{}); data=load(DATA,{}); qs=load(ROOT/"practice_questions.json",[]); sources=load(ROOT/"study_sources.json",{}).get("source_library",[])
    track=load(TRACK,{"schema_version":1,"items":{}}); track.setdefault("items",{}); changed=0
    for typ,ids in owner.get("owner_rejected",{}).items():
        for raw in ids or []:
            key=str(raw); ident=typ+":"+key; state=track["items"].get(ident,{}); cycle=int(state.get("cycles",0))+1
            if cycle>MAX: continue
            obj=target(data,qs,typ,key)
            if obj is None:
                state.update({"status":"BLOCKED_EXPERT_INTERVENTION","last_error":"Content target not found","updated_at":now()}); track["items"][ident]=state; continue
            allowed=["question","options","answer","explanation"] if typ=="questions" else ["title","content_notes","deep_learning","expert_explanation","detailed_explanation","application_question","exam_takeaway","retrieval_questions","source_lens"]
            original={k:obj.get(k) for k in allowed}; rejection=str(owner.get("notes",{}).get(typ,{}).get(key,"")).strip() or "Improve specificity, conceptual clarity, source grounding and exam usefulness."
            prompt=json.dumps({"original":original,"owner_rejection":rejection,"content_type":typ,"focus":key.split("|",1)[1] if "|" in key else "whole content","approved_source_library":sources,"cycle":cycle,"allowed_fields":allowed},ensure_ascii=False)
            try:
                patch=api(prompt)
                if not isinstance(patch,dict) or set(patch)-set(allowed): raise RuntimeError("Invalid or protected rewrite fields.")
                before=json.dumps(original,sort_keys=True,ensure_ascii=False)
                for k,v in patch.items():
                    if v is not None: obj[k]=v
                after=json.dumps({k:obj.get(k) for k in allowed},sort_keys=True,ensure_ascii=False)
                if before==after: raise RuntimeError("Rewrite did not change content.")
                result=q_audit(obj) if typ=="questions" else audit(obj)
                state.update({"cycles":cycle,"last_attempt_at":now(),"last_audit":result,"owner_rejection":rejection,"re_audited":True})
                if result["status"]=="PASS":
                    state.update({"status":"READY_FOR_OWNER_REVIEW","ready_at":now()})
                    owner.setdefault("owner_rejected",{}).setdefault(typ,[]); owner["owner_rejected"][typ]=[x for x in owner["owner_rejected"][typ] if str(x)!=key]
                    owner.setdefault("notes",{}).setdefault(typ,{}); owner["notes"][typ].pop(key,None); changed+=1
                else: state["status"]="BLOCKED_EXPERT_INTERVENTION" if cycle==MAX else "BLOCKED"
                track["items"][ident]=state
            except Exception as e: track["items"][ident]=dict(state,cycles=cycle,status="REWRITE_ERROR",last_error=str(e),updated_at=now())
    owner["schema_version"]=max(int(owner.get("schema_version",4)),8); owner["updated_at"]=now(); track["updated_at"]=now(); track["max_automatic_rewrite_cycles"]=MAX
    DATAJS.write_text("window.NETPSY_DATA = "+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    save(DATA,data); save(OWNER,owner); save(TRACK,track); print("Released "+str(changed)+" rewritten item(s) after re-audit.")
if __name__=="__main__": main()
