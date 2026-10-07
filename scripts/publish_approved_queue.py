#!/usr/bin/env python3
"""Publish owner-approved connected-package components into static learner pools."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, hashlib, json

ROOT=Path(__file__).resolve().parents[1]
QUEUE=ROOT/"data/content-approval-queue.json"
MICRO=ROOT/"content/microtopics/micro_topics.json"
DEEP=ROOT/"content/deep-dive/deep_dive.json"
RECALL=ROOT/"content/active-recall/active_recall.json"
REVISION=ROOT/"content/revision/revision_guidance.json"
PRACTICE=ROOT/"content/practice/practice_mcqs.json"
VERIFICATION_KEYS={"microtopic":"microtopics","deep_dive":"deepDive","active_recall":"activeRecall","revision":"revision","practice":"practice"}
VERIFICATION=ROOT/"data/verification-state.json"

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
    practice=load(PRACTICE) if PRACTICE.exists() else {}
    verification=load(VERIFICATION) if VERIFICATION.exists() else {"schema_version":1,"items":{},"updated_at":""}
    verification.setdefault("items",{})
    now=datetime.now(timezone.utc).isoformat()
    marker="OWNER APPROVAL "+hashlib.sha256(now.encode()).hexdigest()[:12]
    for item in selected:
        mid=str(item["microtopic_id"]); component=str(item.get("component") or "")
        g=item.get("package") or {}
        approved_components=item.get("approved_components") or ([component] if component else ["microtopic","deep_dive","active_recall","revision"])
        if mid not in micro: raise SystemExit(f"Cannot publish {mid}: canonical micro-topic is missing.")
        me=micro[mid]
        if "microtopic" in approved_components:
            me["expert_explanation"]=g["core_explanation"]
            me["detailed_explanation"]=g["detailed_explanation"]
            me["cross_references"]=g.get("cross_references") or []
        if "deep_dive" in approved_components:
            de=deep.get(mid) or {"id":mid,"title":me.get("title","")}
            de["id"]=mid+"D"; de["microtopic_id"]=mid; de["title"]=me.get("title",de.get("title",""))
            de["detailed_explanation"]=g["detailed_explanation"]; deep[mid]=de
        if "active_recall" in approved_components:
            ae=recall.get(mid) or {"id":mid,"title":me.get("title",""),"prompts":[]}
            ae["id"]=mid+"A"; ae["microtopic_id"]=mid; ae["title"]=me.get("title",ae.get("title",""))
            ae["prompts"]=g.get("recall_prompts") or []; recall[mid]=ae
        if "revision" in approved_components:
            rg=g.get("revision_guidance") or {}; rev=revision.get(mid) or {"id":mid,"title":me.get("title","")}
            rev["id"]=mid+"R"; rev["microtopic_id"]=mid; rev["title"]=me.get("title",rev.get("title",""))
            for field in ("recall_before_review","self_check","weak_point_prompt","rating_instruction"): rev[field]=rg.get(field,"")
            revision[mid]=rev
        if "practice" in approved_components:
            practice[mid]={"id":mid+"P","microtopic_id":mid,"title":me.get("title",""),"questions":g.get("practice_mcqs") or []}
        for component in approved_components:
            verification.setdefault("items",{}).setdefault(VERIFICATION_KEYS.get(component,component),{})[mid]="EXPERT VERIFIED"
        item["status"]="PUBLISHED"; item["published_at"]=now; item["publication"]="OWNER_APPROVED_COMPONENT"
    save(MICRO,micro); save(DEEP,deep); save(RECALL,recall); save(REVISION,revision); PRACTICE.parent.mkdir(parents=True,exist_ok=True); save(PRACTICE,practice); save(VERIFICATION,verification)
    queue["updated_at"]=now; queue["pending"]=pending; save(QUEUE,queue)
    print(f"Published {len(selected)} owner-approved package(s) surgically.")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
