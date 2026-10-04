import json, os, re, time, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
REQUESTS=ROOT/"rewrite-requests.json"; DATA=ROOT/"data.json"; DATAJS=ROOT/"data.js"; TRACK=ROOT/"rewrite-reaudit-tracking.json"
DEFAULT_MODEL="gemini-3.8-flash"
DEFAULT_FALLBACK_MODELS=["gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash"]

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
    return None

def target(data,typ,ident):
    base=str(ident).split("|",1)[0]
    return find_micro(data,base)

def schema_for(allowed):
    props={}
    for k in allowed:
        if k=="quick_card":
            props[k]={
                "type":"object",
                "properties":{
                    "layout":{"type":"string","enum":["definition","comparison","steps","flow","cue"]},
                    "headline":{"type":"string"},
                    "body":{"type":"string"},
                    "support":{"type":"string"}
                },
                "required":["layout"],
                "additionalProperties":False
            }
        elif k=="retrieval_questions":
            props[k]={"type":"array","items":{"type":"string"}}
        else:
            props[k]={"type":"string"}
    return {"type":"object","properties":props,"additionalProperties":False}

def api(prompt, schema):
    key=os.environ.get("GEMINI_API_KEY")
    if not key: raise RuntimeError("GEMINI_API_KEY GitHub secret is not configured.")

    configured=os.environ.get("GEMINI_REWRITE_MODELS","").strip()
    if configured:
        models=[m.strip() for m in configured.split(",") if m.strip()]
    else:
        first=os.environ.get("GEMINI_REWRITE_MODEL","").strip() or DEFAULT_MODEL
        models=[first]+[m for m in DEFAULT_FALLBACK_MODELS if m != first]

    transient_codes=[429,500,502,503,504]
    delays=[2,5]
    last_error=None

    for model_index, model in enumerate(models):
        body={
            "model":model,
            "input":prompt,
            "response_format":{
                "type":"text",
                "mime_type":"application/json",
                "schema":schema
            }
        }
        for attempt in range(len(delays)+1):
            req=urllib.request.Request(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                data=json.dumps(body,ensure_ascii=False).encode(),
                headers={"x-goog-api-key":key,"Content-Type":"application/json"}
            )
            try:
                with urllib.request.urlopen(req,timeout=180) as r: out=json.load(r)
                print("Gemini rewrite succeeded with model "+model)
                break
            except urllib.error.HTTPError as e:
                detail=""
                try: detail=e.read().decode("utf-8",errors="replace")
                except Exception: pass
                try:
                    parsed=json.loads(detail)
                    message=parsed.get("error",{}).get("message") or parsed.get("message") or detail
                except Exception:
                    message=detail
                retryable=e.code in transient_codes
                last_error=RuntimeError("Gemini API error "+str(e.code)+": "+message[:800])
                if retryable and attempt < len(delays):
                    wait=delays[attempt]
                    print("Gemini model "+model+" returned "+str(e.code)+"; retrying in "+str(wait)+"s (attempt "+str(attempt+2)+"/"+str(len(delays)+1)+")")
                    time.sleep(wait)
                    continue
                if retryable and model_index < len(models)-1:
                    next_model=models[model_index+1]
                    print("Gemini model "+model+" remained unavailable ("+str(e.code)+"); falling back to "+next_model)
                    break
                raise last_error
        else:
            continue

        if 'out' in locals():
            break
    else:
        raise last_error or RuntimeError("Gemini API request failed after model fallback.")

    text=out.get("output_text","")
    if not text:
        text="".join(
            c.get("text","")
            for step in out.get("steps",[])
            for c in step.get("content",[])
            if c.get("type")=="text"
        )
    text=text.strip()
    fence=chr(96)*3
    if text.startswith(fence):
        text=re.sub(r"^"+re.escape(fence)+r"(?:json)?\s*","",text)
        text=re.sub(r"\s*"+re.escape(fence)+r"$","",text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError("Gemini returned invalid JSON: "+str(e))

def main():
    reqs=load(REQUESTS,{"schema_version":1,"requests":[]})
    data=load(DATA,{})
    track=load(TRACK,{"schema_version":1,"items":{}})
    track.setdefault("items",{})
    processed=[]; errors=[]; error_details=[]
    for r in reqs.get("requests",[]):
        if r.get("status") not in ["PENDING","RETRY"]: continue
        rid=str(r.get("id")); typ=str(r.get("type")); ident=str(r.get("target_id")); obj=target(data,typ,ident)
        if obj is None:
            r.update({"status":"ERROR","error":"Target not found","updated_at":now()})
            errors.append(rid); error_details.append({"id":rid,"error":"Target not found"}); continue
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
        prompt=json.dumps({
            "system_instruction":"You are the controlled content-design and rewrite engine for a UGC NET Psychology learning website. Use only the supplied evidence and source metadata. Never invent studies, authors, statistics, PYQs, citations or unsupported claims. Preserve the concept's meaning and source grounding. Follow the requested presentation goal. Return only JSON matching the supplied schema.",
            "request":r.get("instruction",""),
            "content_type":typ,
            "target_id":ident,
            "focus":focus,
            "original":original,
            "source_metadata":obj.get("sources",[]),
            "constraints":[
                "Make substantive changes only where requested.",
                "Keep Psychology concepts source-grounded.",
                "Do not change IDs, unit/topic/micro mappings or source lists.",
                "For Quick Learn Cards, use quick_card as structured presentation guidance; do not return HTML/CSS.",
                "quick_card.layout must be one of: definition, comparison, steps, flow, cue.",
                "Keep card copy concise enough for a scan-friendly learner card."
            ]
        },ensure_ascii=False)
        try:
            patch=api(prompt,schema_for(allowed))
            if not isinstance(patch,dict) or set(patch)-set(allowed):
                raise RuntimeError("Invalid or protected rewrite fields.")
            if "quick_card" in patch and patch["quick_card"].get("layout") not in ["definition","comparison","steps","flow","cue"]:
                raise RuntimeError("Invalid quick_card layout returned by Gemini.")
            for k,v in patch.items():
                if v is not None: obj[k]=v
            result={"status":"REWRITTEN","at":now(),"instruction":r.get("instruction",""),"target":ident}
            r.update({"status":"DONE","result":result,"updated_at":now()})
            track["items"]["request:"+rid]=result
            processed.append(rid)
        except Exception as e:
            msg=str(e)
            r.update({"status":"ERROR","error":msg,"updated_at":now()})
            errors.append(rid); error_details.append({"id":rid,"error":msg})
    raw=json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n"
    DATA.write_text(raw,encoding="utf-8")
    DATAJS.write_text("window.NETPSY_DATA = "+raw+";\n",encoding="utf-8")
    reqs["updated_at"]=now(); save(REQUESTS,reqs)
    track["updated_at"]=now(); save(TRACK,track)
    print(json.dumps({"processed":len(processed),"errors":len(errors),"processed_ids":processed,"error_ids":errors,"error_details":error_details},ensure_ascii=False))
    if errors: raise SystemExit(1 if not processed else 0)

if __name__=="__main__": main()
