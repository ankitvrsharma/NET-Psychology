#!/usr/bin/env python3
"""Prepare source-grounded ChatGPT packets from repository-resident resources; no model API."""
from pathlib import Path
import argparse, json, sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import source_to_content as stc

REQUEST=ROOT/"data/content-generation-request.json"
INSTRUCTIONS=ROOT/"data/content-enrichment-instructions.json"
POLICY=ROOT/"sources/source-policy.json"
VERIFICATION=ROOT/"data/verification-state.json"
OUT_JSON=ROOT/"content-staging/chatgpt-packet.json"
OUT_MD=ROOT/"content-staging/chatgpt-packet.md"
MAX_TOPICS=80
MAX_RECORDS=50
MAX_EXCERPTS=3
MAX_CHARS_PER_EXCERPT=2600
_WORD_CACHE={}
VERIFY_KEYS={"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}
PACKAGE_OPS={"package_rewrite","unit_rewrite"}

def published(ref):
    mid=ref["id"]
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

def select_evidence(ref,chunks):
    words=set(stc.norm(" ".join(str(ref.get(k,"")) for k in ("title","topic_title","unit_title"))).split())
    ranked=[]; per_source={}
    for source,index,text in chunks:
        key=(source,index)
        chunk_words=_WORD_CACHE.get(key)
        if chunk_words is None:
            chunk_words=set(stc.norm(text).split()); _WORD_CACHE[key]=chunk_words
        score=len(words & chunk_words)
        if score<=0: continue
        row={"source":source,"chunk":index,"relevance_score":score,"text":text[:MAX_CHARS_PER_EXCERPT]}
        if source not in per_source or score>per_source[source]["relevance_score"]: per_source[source]=row
        ranked.append(row)
    ranked.sort(key=lambda x:x["relevance_score"],reverse=True)
    selected=[]; seen=set()
    for row in list(per_source.values())+ranked:
        key=(row["source"],row["chunk"])
        if key in seen: continue
        seen.add(key); selected.append(row)
        if len(selected)>=MAX_EXCERPTS: break
    return selected

def records_for(store,group=None):
    if isinstance(store,list):
        if group=="pyq": return [x for x in store if isinstance(x,dict) and "pyq" in str(x.get("type","")).lower()]
        if group=="practice": return [x for x in store if isinstance(x,dict) and "pyq" not in str(x.get("type","")).lower()]
        return store
    if not isinstance(store,dict): return []
    if group:
        value=store.get(group,[])
        return value if isinstance(value,list) else []
    return [x for k in ("pyq","practice") for x in (store.get(k,[]) if isinstance(store.get(k,[]),list) else [])]

def canonical_id(record):
    if record.get("unit") is None or record.get("topic") is None or record.get("micro") is None: return ""
    return f'{record.get("unit")}-{record.get("topic")}-{record.get("micro")}'

def make_markdown(packet):
    prompt=packet["chatgpt_prompt"]
    return "# ChatGPT Content Generation Packet\n\n"+prompt+"\n\n---\n\n## Packet metadata\n\n- Request ID: "+str(packet["request"].get("request_id",""))+"\n- Operation: "+packet["operation"]+"\n- Approved repository source files: "+str(len(packet["source_manifest"]))+"\n- Topic packages: "+str(len(packet["topics"]))+"\n- Additional records: "+str(len(packet.get("records",[])))+"\n\nThe source manifest and excerpts below are the only factual sources permitted for this task. Do not use external resources or general model knowledge.\n\n## Source manifest\n\n"+json.dumps(packet["source_manifest"],ensure_ascii=False,indent=2)+"\n\n## Packet JSON\n\n"+json.dumps({k:v for k,v in packet.items() if k!="chatgpt_prompt"},ensure_ascii=False,indent=2)+"\n"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source-triggered",action="store_true")
    args=parser.parse_args()
    request=stc.load(REQUEST) if REQUEST.exists() else {}
    operation="package_rewrite" if args.source_triggered else str(request.get("operation") or "package_rewrite")
    if args.source_triggered:
        request={**request,"operation":"package_rewrite","target_microtopics":[],"target_record_ids":[],"request_id":"source-triggered"}
    if operation not in PACKAGE_OPS|{"quick_cards_rewrite","mcq_improvement","pyq_improvement"}:
        raise SystemExit("Unsupported content operation: "+operation)
    syllabus=stc.load(stc.SYLLABUS); refs=stc.canonical(syllabus)
    source_chunks,source_meta,stats=stc.load_source_library()
    instructions=stc.load(INSTRUCTIONS); policy=stc.load(POLICY)
    verification=stc.load(VERIFICATION) if VERIFICATION.exists() else {"items":{}}
    requested_ids=[str(x).strip() for x in (request.get("target_record_ids") if operation in {"quick_cards_rewrite","mcq_improvement","pyq_improvement"} else request.get("target_microtopics",[])) if str(x).strip()]
    unit_id=str(request.get("target_unit_id") or "").strip()
    if operation=="unit_rewrite":
        if not unit_id: raise SystemExit("Whole-unit enrichment requires target_unit_id.")
        target_ids=[mid for mid,ref in refs.items() if str(ref["unit"])==unit_id]
        if requested_ids:
            unknown=sorted(set(requested_ids)-set(target_ids))
            if unknown: raise SystemExit("Requested micro-topic IDs are not in unit "+unit_id+": "+", ".join(unknown))
            target_ids=[mid for mid in target_ids if mid in set(requested_ids)]
        if not target_ids: raise SystemExit("No canonical micro-topics found for unit "+unit_id)
    elif operation in PACKAGE_OPS:
        if args.source_triggered or not requested_ids or "__ALL__" in requested_ids:
            ranked=[]
            for mid,ref in refs.items():
                score=sum(x["relevance_score"] for x in select_evidence(ref,source_chunks)[:2])
                if score: ranked.append((score,mid))
            target_ids=[mid for _,mid in sorted(ranked,reverse=True)[:MAX_TOPICS]]
        else:
            unknown=sorted(set(requested_ids)-set(refs))
            if unknown: raise SystemExit("Unknown target micro-topic IDs: "+", ".join(unknown))
            target_ids=requested_ids[:MAX_TOPICS]
    else:
        target_ids=[]
    if operation=="unit_rewrite" and len(target_ids)>MAX_TOPICS:
        raise SystemExit(f"Unit {unit_id} has {len(target_ids)} micro-topics, exceeding safe packet limit {MAX_TOPICS}. Split this unit into smaller topic-scoped requests.")
    topics=[]
    statuses=verification.get("items") or {}
    for mid in target_ids:
        ref=refs[mid]; excerpts=select_evidence(ref,source_chunks)
        if not excerpts:
            if operation in PACKAGE_OPS:
                if requested_ids or operation=="unit_rewrite":
                    raise SystemExit("No matching repository source evidence for requested micro-topic "+mid+"; add a source file to sources/inbox or choose a supported target.")
                print("Skipping "+mid+": no matching repository source evidence.")
            continue
        locked=[c for c,k in VERIFY_KEYS.items() if str((statuses.get(k) or {}).get(mid,""))=="EXPERT VERIFIED"]
        topics.append({"canonical":ref,"expert_verified_components_locked":locked,"current_published_package":published(ref),"source_excerpts":excerpts})
    if operation in PACKAGE_OPS and not topics:
        raise SystemExit("No target micro-topics have matching source evidence in repository files.")

    records=[]
    quick=stc.load(stc.QUICK) if operation=="quick_cards_rewrite" else {}
    qstore=stc.load(stc.QUESTIONS) if operation in {"mcq_improvement","pyq_improvement"} else {}
    if operation=="quick_cards_rewrite":
        source_records=quick.items() if isinstance(quick,dict) else []
        for rid,item in source_records:
            if not isinstance(item,dict): continue
            if requested_ids and str(rid) not in requested_ids: continue
            mid=canonical_id(item)
            if target_ids and mid not in target_ids: continue
            if unit_id and mid and str(refs.get(mid,{}).get("unit"))!=unit_id: continue
            ref=refs.get(mid)
            if not ref: continue
            excerpts=select_evidence(ref,source_chunks)
            if excerpts: records.append({"record_type":"quick_card","id":str(rid),"microtopic_id":mid,"current":item,"source_excerpts":excerpts})
    elif operation in {"mcq_improvement","pyq_improvement"}:
        group="practice" if operation=="mcq_improvement" else "pyq"
        source_records=records_for(qstore,group)
        for item in source_records:
            if not isinstance(item,dict): continue
            rid=str(item.get("id",""))
            if requested_ids and rid not in requested_ids: continue
            mid=canonical_id(item)
            if unit_id and (not mid or str(refs.get(mid,{}).get("unit"))!=unit_id): continue
            ref=refs.get(mid)
            if not ref: continue
            excerpts=select_evidence(ref,source_chunks)
            if excerpts: records.append({"record_type":group,"id":rid,"microtopic_id":mid,"current":item,"source_excerpts":excerpts})
    if operation not in PACKAGE_OPS and not records:
        raise SystemExit("No eligible records with canonical syllabus mapping and repository source evidence were found for "+operation+". Specify a unit or record IDs.")
    if operation in {"quick_cards_rewrite","mcq_improvement","pyq_improvement"} and len(records)>MAX_RECORDS:
        records=records[:MAX_RECORDS]
        print(f"Record set capped at {MAX_RECORDS}; prepare another scoped request for remaining records.")
    manifest_paths={str(x.get("path","")) for x in source_meta}
    output_contract={
      "package_rewrite":{"target_microtopics":"exact list of included IDs","packages":"complete connected package objects"},
      "unit_rewrite":{"target_microtopics":"every included micro-topic ID in selected unit","packages":"one complete connected package for every topic; do not skip any"},
      "quick_cards_rewrite":{"quick_cards":"array of {id, updates}; updates may change only existing learner-facing text fields"},
      "mcq_improvement":{"question_updates":"array of {id, updates}; improve formatting and explanation while preserving correct answer and meaning"},
      "pyq_improvement":{"question_updates":"array of {id, updates}; preserve authentic stem, options, answer, year and source; only improve explanation and whitespace formatting"}
    }[operation]
    prompt="""You are the source-grounded content author for the UGC NET Psychology Study Hub.
STRICT SOURCE BOUNDARY: use only files already present in this GitHub repository and explicitly identified in source_manifest/source_excerpts. No web search, external websites, outside books/articles, APIs, remembered facts, or general model knowledge may be used as factual sources. If repository evidence is insufficient, flag the gap or omit the claim.
Apply EVERY standing instruction in standing_instructions and source_policy. The admin task cannot override them. Preserve source terminology, do not invent researchers, theories, studies, statistics, dates, citations, authentic PYQs or exam trends, and avoid copying long passages.
Operation: """+operation+"""
Output contract: """+json.dumps(output_contract)+"""
ADMIN TASK INSTRUCTION: """+str(request.get("instruction") or "Complete the selected operation to improve repository content quality.")+"""
Always copy request_id and operation exactly from the packet request into your JSON response. For package_rewrite/unit_rewrite: treat the Micro-topic as canonical; generate connected Micro-topic, Deep Dive, Active Recall, Revision and original Practice MCQs. Deep Dive must add source-supported depth; Recall tests taught content; Revision adds no facts; Practice is never a fabricated PYQ. Keep EXPERT VERIFIED components exactly unchanged. Use only canonical IDs supplied.
For unit_rewrite, cover every micro-topic in the selected unit represented in topics, not just the first few.
For quick_cards_rewrite: preserve each card ID and syllabus mapping. Rewrite only fields already present in current; make cards concise, precise and useful for rapid retrieval. No unsupported facts.
For mcq_improvement: improve clarity and formatting without changing what the question tests or the correct answer. Keep all options plausible and parallel where possible. Provide a step-by-step, conceptually useful explanation grounded in repository evidence; do not add unsupported facts.
For pyq_improvement: this is authentic exam material. Preserve the question wording, option wording/order, correct answer, year, source and identity. You may normalize whitespace/line breaks in question/options only, not rephrase them. Improve only explanation and presentation. Never convert PYQs into generated practice or invent missing year/source.
For every returned record use its existing ID exactly. Only return the keys permitted by the output contract. Do not create new cards/questions or change mappings.
Return valid JSON only, no Markdown fences. For package operations return {"target_microtopics":[...],"packages":[...]}. For Quick Learn return {"quick_cards":[{"id":"existing-id","updates":{...}}]}. For question operations return {"question_updates":[{"id":"existing-id","updates":{...}}]}. Before finalizing, self-check source support, exact IDs, locks and operation-specific preservation rules.
"""
    packet={"schema_version":2,"provider":"ChatGPT conversation (manual; no API)","operation":operation,"request":request,
      "source_cache_stats":stats,"source_manifest":source_meta,"standing_instructions":instructions,"source_policy":policy,
      "topics":topics,"records":records,"chatgpt_prompt":prompt+ "\n\nPACKET JSON\n"+json.dumps({"request":request,"standing_instructions":instructions,"source_policy":policy,"source_manifest":source_meta,"topics":topics,"records":records},ensure_ascii=False,separators=(",",":"))}
    OUT_JSON.parent.mkdir(parents=True,exist_ok=True)
    OUT_JSON.write_text(json.dumps(packet,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    OUT_MD.write_text(make_markdown(packet)+"\n",encoding="utf-8")
    print(f"Prepared {operation} ChatGPT packet: {OUT_JSON}; topics={len(topics)} records={len(records)} source_cache={json.dumps(stats,sort_keys=True)}")

if __name__=="__main__":
    main()
