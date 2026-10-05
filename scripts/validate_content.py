import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    path = ROOT / path
    if not path.exists():
        raise AssertionError(f"Missing required file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))

data = load("content-source.json")
questions = load("practice_questions.json")
micro = load("content/microtopic_explanations.json")
quick = load("content/quick_learn_cards.json")
deep = load("content/deep_dive_explanations.json")
recall = load("content/active_recall.json")
explanations = load("practice_explanations.json")

assert isinstance(data, dict) and isinstance(data.get("units"), list) and data["units"], "content-source.json: invalid units structure"
assert isinstance(questions, list), "practice_questions.json: expected list"

micro_ids = {
    (u["id"], t["id"], m["id"])
    for u in data["units"]
    for t in u.get("topics", [])
    for m in t.get("microtopics", [])
}
expected_micro = {f"{u}-{t}-{m}" for u, t, m in micro_ids}
assert len(expected_micro) == 440, f"Expected 440 syllabus micro-topics, found {len(expected_micro)}"
assert set(micro) == expected_micro, "Canonical micro-topic IDs do not exactly match the syllabus source"
assert set(deep) == expected_micro, "Canonical deep-dive IDs do not exactly match the syllabus source"
assert set(recall) == expected_micro, "Canonical active-recall IDs do not exactly match the syllabus source"
assert all(k in expected_micro for k in [x.rsplit("|", 1)[0] for x in quick]), "Quick-learn card references an unknown micro-topic"
assert len(quick) == 440 * 7, f"Expected 3080 quick-learn cards, found {len(quick)}"
assert len(questions) == len(load("content/practice_questions.json")), "Canonical practice bank is out of sync"
assert isinstance(explanations, dict), "practice_explanations.json: expected object"

ids = [q.get("id") for q in questions]
assert all(ids), "PYQ: missing question id"
assert len(ids) == len(set(ids)), "PYQ: duplicate question ids"

bad_answers = [
    q["id"] for q in questions
    if not isinstance(q.get("answer"), int)
    or not 0 <= q["answer"] < len(q.get("options", []))
]
assert not bad_answers, f"PYQ: invalid answer indexes: {bad_answers[:10]}"

bad_mapping = []
for q in questions:
    key = (q.get("unit"), q.get("topic"), q.get("micro"))
    if any(v is not None for v in key) and key not in micro_ids:
        bad_mapping.append(q["id"])
assert not bad_mapping, f"PYQ: invalid non-null syllabus mappings: {bad_mapping[:10]}"

missing_explanations = sum(not str(q.get("explanation", "")).strip() for q in questions)
assert missing_explanations == 0, f"PYQ: {missing_explanations} missing explanations"

print(f"Source units: {len(data['units'])}")
print(f"Source micro-topics: {len(expected_micro)}")
print(f"Canonical quick cards: {len(quick)}")
print(f"PYQs: {len(questions)}")
print("Canonical content integrity: PASS")
