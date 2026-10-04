import json, os, re, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
REQUESTS=ROOT/"rewrite-requests.json"; DATA=ROOT/"data.json"; DATAJS=ROOT/"data.js"; TRACK=ROOT/"rewrite-reaudit-tracking.json"
MAX=2

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
                        if c.get("id")==m:return c

def target(data,typ,ident):
    base=str(ident).split("|",1)[0]
    return find_micro(data,base)

def api(prompt):
    key=os.environ.get("OPENAI_API_KEY")
    if not key: raise RuntimeError("OPENAI_API_KEY GitHub secret is not configured.")
    body={"model":os.environ.get("OPENAI_REWRITE_MODEL") or "gpt-6-luna","input":[
      {"role":"system","content":"You are the controlled content-design and rewrite engine for a UGC NET Psychology learning website. Use only the supplied evidence and source metadata. Never invent studies, authors, statistics, PYQs, citations or unsupported claims. Preserve the concept's meaning and source grounding. Follow the requested presentation goal. Return only valid JSON."},
      {"role":"user","content":prompt}],"max_output_tokens":5000}
    req=urllib.request.Request("https://api.openai.com/v1/responses",data=json.dumps(body).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req,timeout=180) as r: out=json.load(r)
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        try:
            parsed = json.loads(detail)
            message = parsed.get("error", {}).get("message") or parsed.get("message") or detail
        except Exception:
            message = detail
        raise RuntimeError("OpenAI API error "+str(e.code)+": "+message[:800])
    text=out.get("output_text","")
    if not text:text="".join(c.get("text","") for i in out.get("output",[]) for c in i.get("content",[]) if c.get("type") in ["output_text","text"])
    text=text.strip(); fence=chr(96)*3
    if text.startswith(fence):
        text=re.sub(r"^"+re.escape(fence)+r"(?:json)?\s*","",text); text=re.sub(r"\s*"+re.escape(fence)+r"$","",text)
    return json.loads(text)

def main():
    reqs=load(REQUESTS,{"schema_version":1,"requests":[]})
    data=load(DATA,{}); track=load(TRACK,{"schema_version":1,"items":{}}); track.setdefault("items",{})
    processed=[]; errors=[]; error_details=[]
    for r in reqs.get("requests",[]):
        if r.get("status") not in ["PENDING","RETRY"]: continue
        rid=str(r.get("id")); typ=str(r.get("type")); ident=str(r.get("target_id")); obj=target(data,typ,ident)
        if obj is None:
            r.update({"status":"ERROR","error":"Target not found","updated_at":now()}); errors.append(rid); continue
        if typ=="quickLearnCards":
            allowed=["title","content_notes","deep_learning","exam_takeaway","application_question","quick_card"]
            focus=ident.split("|",1)[1] if "|" in ident else "CORE IDEA"
        elif typ=="microtopics":
            allowed=["title","content_notes","deep_learning","detailed_explanation","application_question","exam_takeaway","retrieval_questions"]
            focus="whole micro-topic"
        else:
            allowed=["title","content_notes","deep_learning","detailed_explanation","application_question","exam_takeaway","retrieval_questions"]
            focus="whole content"
        original={k:obj.get(k) for k in allowed}
        prompt=json.dumps({"request":r.get("instruction",""),"content_type":typ,"target_id":ident,"focus":focus,"original":original,"source_metadata":obj.get("sources",[]),"constraints":["Make substantive changes only where requested.","Keep Psychology concepts source-grounded.","Do not change IDs, unit/topic/micro mappings or source lists.","For Quick Learn Cards, use quick_card as structured presentation guidance; do not return HTML/CSS.","quick_card.layout must be one of: definition, comparison, steps, flow, cue.","Keep card copy concise enough for a scan-friendly learner card."]},ensure_ascii=False)
        try:
            patch=api(prompt)
            if not isinstance(patch,dict) or set(patch)-set(allowed): raise RuntimeError("Invalid or protected rewrite fields.")
            for k,v in patch.items():
                if v is not None: obj[k]=v
            result={"status":"REWRITTEN","at":now(),"instruction":r.get("instruction",""),"target":ident}
            r.update({"status":"DONE","result":result,"updated_at":now()})
            track["items"]["request:"+rid]=result
            processed.append(rid)
        except Exception as e:
            msg=str(e)
            r.update({"status":"ERROR","error":msg,"updated_at":now()}); errors.append(rid); error_details.append({"id":rid,"error":msg})
    raw=json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n"
    DATA.write_text(raw,encoding="utf-8"); DATAJS.write_text("window.NETPSY_DATA = "+raw+";\n",encoding="utf-8")
    reqs["updated_at"]=now(); save(REQUESTS,reqs); track["updated_at"]=now(); save(TRACK,track)
    print(json.dumps({"processed":len(processed),"errors":len(errors),"processed_ids":processed,"error_ids":errors,"error_details":error_details},ensure_ascii=False))
    if errors: raise SystemExit(1 if not processed else 0)

if __name__=="__main__": main()
