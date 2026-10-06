#!/usr/bin/env python3
"""Publish owner-approved AI content surgically into the four learner pools."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, json

ROOT=Path(__file__).resolve().parents[1]
QUEUE=ROOT/"data/content-approval-queue.json"
MICRO=ROOT/"content/microtopics/micro_topics.json"
DEEP=ROOT/"content/deep-dive/deep_dive.json"
RECALL=ROOT/"content/active-recall/active_recall.json"
REVISION=ROOT/"content/revision/revision_guidance.json"

def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def save(p,o): Path(p).write_text(json.dumps(o,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--microtopic-id",default="")
    args=ap.parse_args()
    if not QUEUE.exists():
        print("No approval queue exists."); return 0
    queue=load(QUEUE)
    pending=queue.get("pending",[])
    selected=[x for x in pending if x.get("status")=="APPROVED" and (not args.microtopic_id or str(x.get("microtopic_id"))==args.microtopic_id)]
    if not selected:
        print("No owner-approved content is waiting for publication."); return 0
    micro=load(MICRO); deep=load(DEEP); recall=load(RECALL); revision=load(REVISION)
    now=datetime.now(timezone.utc).isoformat()
    marker="OWNER APPROVAL "+hashlib.sha256(now.encode()).hexdigest()[:12]
    for item in selected:
        mid=str(item["microtopic_id"]); g=item.get("package") or {}
        if mid not in micro: raise SystemExit(f"Cannot publish {mid}: canonical micro-topic is missing.")
        me=micro[mid]
        me["expert_explanation"]=g["core_explanation"]
        me["detailed_explanation"]=g["detailed_explanation"]
        de=deep.get(mid) or {"id":mid,"title":me.get("title","")}
        de["id"]=mid; de["title"]=me.get("title",de.get("title","")); de["detailed_explanation"]=g["detailed_explanation"]; deep[mid]=de
        ae=recall.get(mid) or {"id":mid,"title":me.get("title",""),"prompts":[]}
        ae["id"]=mid; ae["title"]=me.get("title",ae.get("title","")); ae["prompts"]=g.get("recall_prompts") or []; recall[mid]=ae
        rg=g.get("revision_guidance") or {}; rev=revision.get(mid) or {"id":mid,"title":me.get("title","")}
        rev["id"]=mid; rev["title"]=me.get("title",rev.get("title",""))
        for field in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"): rev[field]=rg.get(field,"")
        revision[mid]=rev
        item["status"]="PUBLISHED"; item["published_at"]=now; item["publication"]="OWNER_APPROVED"
    save(MICRO,micro); save(DEEP,deep); save(RECALL,recall); save(REVISION,revision)
    queue["updated_at"]=now; queue["pending"]=pending; save(QUEUE,queue)
    print(f"Published {len(selected)} owner-approved package(s) surgically.")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
