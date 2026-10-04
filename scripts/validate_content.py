import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    p = ROOT / path
    assert p.exists(), f"Missing required file: {path}"
    return json.loads(p.read_text(encoding="utf-8"))

syllabus = load("syllabus-index.json")
questions = load("content/practice_questions.json")

assert isinstance(syllabus, dict) and isinstance(syllabus.get("units"), list), (
    "syllabus-index.json: invalid units structure"
)
assert isinstance(questions, list), "content/practice_questions.json: expected list"

micro_ids = {
    (str(u.get("id")), str(t.get("id")), str(m.get("id")))
    for u in syllabus["units"]
    for t in u.get("topics", [])
    for m in t.get("microtopics", [])
}
assert micro_ids, "syllabus-index.json: no micro-topics found"

ids = [q.get("id") for q in questions]
assert all(ids), "PYQ: missing question id"
assert len(ids) == len(set(ids)), "PYQ: duplicate question ids"

bad_answers = [
    q["id"]
    for q in questions
    if not isinstance(q.get("answer"), int)
    or not 0 <= q["answer"] < len(q.get("options", []))
]
assert not bad_answers, f"PYQ: invalid answer indexes: {bad_answers[:10]}"

bad_mapping = []
confidence_counts = {"high": 0, "medium": 0, "low": 0, "unmapped": 0, "missing": 0}
for q in questions:
    key = (str(q.get("unit")), str(q.get("topic")), str(q.get("micro")))
    conf = q.get("mapping_confidence")
    confidence_counts[conf if conf in confidence_counts else "missing"] += 1
    if any(v is not None for v in (q.get("unit"), q.get("topic"), q.get("micro"))) and key not in micro_ids:
        bad_mapping.append(q["id"])

assert not bad_mapping, f"PYQ: invalid non-null syllabus mappings: {bad_mapping[:10]}"

generic_markers = (
    "The stem describes the concept or relationship represented by",
    "Evaluate each statement independently against the relevant psychological principle",
    "Arrange the items according to the established chronological, developmental, or logical order",
    "Check each List-I item against its specific person, concept, function, or description",
)
generic = sum(
    any(marker in str(q.get("explanation", "")) for marker in generic_markers)
    for q in questions
)
missing_explanations = sum(not str(q.get("explanation", "")).strip() for q in questions)

print(f"Content units: {len(syllabus['units'])}")
print(f"Micro-topics: {len(micro_ids)}")
print(f"PYQs: {len(questions)}")
print(f"Mapping confidence: {confidence_counts}")
print(f"Generic explanation templates remaining: {generic}")
print(f"Missing explanations: {missing_explanations}")
assert missing_explanations == 0, "PYQ: missing explanations"
