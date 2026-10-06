import json
from pathlib import Path

def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

syllabus=load("data/syllabus-index.json")
assert isinstance(syllabus,dict) and isinstance(syllabus.get("units"),list), "syllabus-index.json: invalid units structure"

canonical={}
for unit in syllabus["units"]:
    for topic in unit.get("topics",[]):
        for micro in topic.get("microtopics",[]):
            key=f"{unit['id']}-{topic['id']}-{micro['id']}"
            canonical[key]=micro.get("title","")

pool_paths={
    "microtopics":"content/microtopics/micro_topics.json",
    "deepDive":"content/deep-dive/deep_dive.json",
    "activeRecall":"content/active-recall/active_recall.json",
    "revisionGuidance":"content/revision/revision_guidance.json",
    "practice":"content/practice/practice_mcqs.json",
}
for name,path in pool_paths.items():
    pool=load(path)
    if name=="practice" and not pool:
        # Topic-wise generated practice is a future content layer. An empty pool is valid
        # until the first audited Practice package is published.
        print("practice: 0 entries; empty pool accepted until Practice content is published")
        continue
    missing=[k for k in canonical if k not in pool]
    extra=[k for k in pool if k not in canonical]
    mismatched=[k for k in canonical if k in pool and str(pool[k].get("title",""))!=str(canonical[k])]
    assert not missing and not extra and not mismatched, f"{name}: missing={len(missing)} extra={len(extra)} title_mismatches={len(mismatched)}"
    print(f"{name}: {len(pool)} entries; OK")

quick=load("content/quick-learn/quick_cards.json")
quick_micro_ids={f"{v.get('unit')}-{v.get('topic')}-{v.get('micro')}" for v in quick.values()}
stale_quick=[k for k in quick_micro_ids if k not in canonical]
print(f"quickLearn: {len(quick)} cards covering {len(quick_micro_ids)} micro-topics; stale/non-canonical references: {len(stale_quick)}")

practice=load("content/practice/practice_mcqs.json")
assert isinstance(practice,dict), "practice_mcqs.json: expected object/map"
practice_missing=[k for k in practice if k not in canonical]
assert not practice_missing, f"practice: non-canonical micro-topic IDs: {len(practice_missing)}"
for mid,item in practice.items():
    assert str(item.get("id",""))==mid+"P", f"practice: invalid component id for {mid}"
    assert str(item.get("microtopic_id",""))==mid, f"practice: invalid microtopic_id for {mid}"
    for q in item.get("questions",[]):
        assert isinstance(q,dict) and str(q.get("question","")).strip(), f"practice {mid}: missing question"
        assert isinstance(q.get("options"),list) and len(q["options"])>=2, f"practice {mid}: invalid options"
        assert str(q.get("correct_answer","")).strip(), f"practice {mid}: missing correct answer"
        assert str(q.get("explanation","")).strip(), f"practice {mid}: missing explanation"
print(f"Practice packages: {len(practice)}; OK")

questions=load("content/questions/questions.json")
questions=questions if isinstance(questions,list) else [*questions.get("pyq",[]),*questions.get("practice",[])]
assert questions, "questions.json: empty question pool"
ids=[q.get("id") for q in questions]
assert all(ids), "questions: missing question id"
assert len(ids)==len(set(ids)), "questions: duplicate question ids"
assert all(isinstance(q.get("options"),list) and len(q["options"])==4 for q in questions), "questions: invalid options"
assert all(isinstance(q.get("answer"),int) and 0<=q["answer"]<4 for q in questions), "questions: invalid answer indexes"

bad_mapping=[]
for q in questions:
    key=(q.get("unit"),q.get("topic"),q.get("micro"))
    if any(v is not None for v in key):
        expected=f"{key[0]}-{key[1]}-{key[2]}"
        if expected not in canonical:
            bad_mapping.append(q["id"])

unmapped=sum(any(q.get(k) is None for k in ("unit","topic","micro")) for q in questions)
missing_explanations=sum(not str(q.get("explanation","")).strip() for q in questions)
print(f"Canonical micro-topics: {len(canonical)}")
print(f"Questions: {len(questions)}")
print(f"Unmapped questions: {unmapped}")
print(f"Non-canonical question mappings: {len(bad_mapping)}")
print(f"Missing question explanations: {missing_explanations}")
assert missing_explanations == 0, "questions: missing explanations"
