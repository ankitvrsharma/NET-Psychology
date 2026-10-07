#!/usr/bin/env python3
"""Synchronize the canonical static Psychology content pools into Supabase.

The GitHub static pools are authoritative. Supabase is a derived delivery copy.
This sync upserts every canonical record and prunes database records that no
longer exist in the static pools, so the database mirrors the canonical pools.
"""
from pathlib import Path
import json, os, urllib.error, urllib.parse, urllib.request

ROOT=Path(__file__).resolve().parents[1]
SUPABASE_URL=os.getenv("SUPABASE_URL","").rstrip("/")
SUPABASE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY","").strip()
BATCH_SIZE=100

POOLS=[
    ("microtopics","content/microtopics/micro_topics.json"),
    ("deepDive","content/deep-dive/deep_dive.json"),
    ("activeRecall","content/active-recall/active_recall.json"),
    ("revisionGuidance","content/revision/revision_guidance.json"),
    ("practice","content/practice/practice_mcqs.json"),
    ("questions","content/questions/questions.json"),
    ("quickLearn","content/quick-learn/quick_cards.json"),
]

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def iter_records(content_type, path):
    value=load(ROOT/path)
    if content_type=="questions":
        items=value if isinstance(value,list) else [*(value.get("pyq") or []),*(value.get("practice") or [])]
        for item in items:
            yield item
        return
    if not isinstance(value,dict):
        return
    for item in value.values():
        if isinstance(item,dict):
            yield item

def row(content_type, item):
    mid=item.get("microtopic_id")
    unit=item.get("unit")
    topic=item.get("topic")
    micro=item.get("micro")
    if mid and (unit is None or topic is None or micro is None):
        try:
            unit,topic,micro=[int(x) for x in str(mid).split("-")]
        except (TypeError,ValueError):
            pass
    rid=str(item.get("id") or item.get("microtopic_id") or "")
    if not rid:
        return None
    return {
        "id":rid,
        "content_type":content_type,
        "title":item.get("title") or item.get("question") or "",
        "unit_id":unit,
        "topic_id":topic,
        "micro_id":micro,
        "item_type":item.get("item_type"),
        "session":item.get("session"),
        "question_number":item.get("question_number"),
        "source_tags":item.get("source_tags") or [],
        "content":item,
        "published":True,
    }

def request(path, method="GET", body=None, query="", return_json=False):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
    url=SUPABASE_URL+"/rest/v1/"+path+query
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode("utf-8")
    req=urllib.request.Request(url,data=data,method=method,headers={
        "apikey":SUPABASE_KEY,
        "Authorization":"Bearer "+SUPABASE_KEY,
        "Content-Type":"application/json",
        "Prefer":"resolution=merge-duplicates,return=minimal",
    })
    try:
        with urllib.request.urlopen(req,timeout=60) as response:
            raw=response.read().decode("utf-8")
            return json.loads(raw) if return_json and raw else response.status
    except urllib.error.HTTPError as exc:
        detail=exc.read().decode("utf-8","replace")
        raise RuntimeError(f"Supabase sync failed ({exc.code}): {detail}") from exc

def upsert(rows):
    for start in range(0,len(rows),BATCH_SIZE):
        batch=rows[start:start+BATCH_SIZE]
        request("content_items","POST",batch,"?on_conflict=content_type,id")
        print(f"  synced {start+len(batch)}/{len(rows)}")

def existing_ids(content_type):
    query=urllib.parse.urlencode({
        "select":"id",
        "content_type":f"eq.{content_type}",
    })
    data=request("content_items","GET",query="?"+query,return_json=True)
    return {str(item["id"]) for item in data if isinstance(item,dict) and item.get("id") is not None}

def prune(content_type, canonical_ids):
    stale=sorted(existing_ids(content_type)-canonical_ids)
    if not stale:
        print(f"  {content_type}: no stale Supabase records")
        return 0
    for start in range(0,len(stale),BATCH_SIZE):
        batch=stale[start:start+BATCH_SIZE]
        query=urllib.parse.urlencode({
            "content_type":f"eq.{content_type}",
            "id":f"in.({','.join(batch)})",
        })
        request("content_items","DELETE",query="?"+query)
        print(f"  {content_type}: pruned {start+len(batch)}/{len(stale)} stale records")
    return len(stale)

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
    total=0
    pruned=0
    for content_type,relative in POOLS:
        path=ROOT/relative
        if not path.exists():
            print(f"skip {content_type}: {relative} not found")
            # A missing canonical pool must not silently delete its database data.
            continue
        rows=[]
        for item in iter_records(content_type,relative):
            value=row(content_type,item)
            if value:
                rows.append(value)
        print(f"{content_type}: {len(rows)} canonical records")
        upsert(rows)
        pruned += prune(content_type,{str(x["id"]) for x in rows})
        total += len(rows)
    print(f"Supabase synchronization complete: {total} canonical records synced; {pruned} stale records pruned.")

if __name__=="__main__":
    main()
