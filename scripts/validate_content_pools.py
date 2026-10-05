#!/usr/bin/env python3
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(rel): return json.loads((ROOT/rel).read_text(encoding="utf-8"))
registry=load("content-pools/registry.json")
assert re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)",str(registry.get("version",""))),"Invalid semantic version"
syllabus=load("syllabus-index.json"); units=syllabus.get("units"); assert isinstance(units,list) and units
micro_ids={f"{u['id']}-{t['id']}-{m['id']}" for u in units for t in u.get("topics",[]) for m in t.get("microtopics",[])}
assert len(micro_ids)==440,f"Expected 440 micro-topics, found {len(micro_ids)}"
def pool(name):
    meta=registry["pools"].get(name); assert meta and meta.get("enabled") is True,f"Pool not enabled: {name}"
    return load(meta["path"])
micro=pool("microtopics"); quick=pool("quickLearn"); deep=pool("deepDive"); recall=pool("activeRecall"); questions=pool("questions")
assert set(micro)==micro_ids
assert set(deep)==micro_ids
assert set(recall)==micro_ids
assert all(k.rsplit("|",1)[0] in micro_ids for k in quick)
assert len(quick)==3080
assert isinstance(questions,dict) and isinstance(questions.get("pyq"),list) and isinstance(questions.get("practice"),list)
pyq=questions["pyq"]; practice=questions["practice"]; allq=pyq+practice
assert all(str(q.get("type"))=="PYQ" for q in pyq)
ids=[q.get("id") for q in allq]; assert all(ids) and len(ids)==len(set(ids))
bad=[q["id"] for q in allq if not isinstance(q.get("answer"),int) or not 0<=q["answer"]<len(q.get("options",[]))]
assert not bad,f"Invalid answer indexes: {bad[:10]}"
print("Semantic version:",registry["version"]); print("Microtopics:",len(micro)); print("Quick learn:",len(quick)); print("Deep dive:",len(deep)); print("Active recall:",len(recall)); print("PYQ:",len(pyq)); print("Practice:",len(practice)); print("Content pool integrity: PASS")
