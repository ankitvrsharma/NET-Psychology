#!/usr/bin/env python3
"""Generate a non-authoritative content-health triage report from canonical pools."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))

def text(value):
    if isinstance(value, list):
        return " ".join(text(v) for v in value)
    if isinstance(value, dict):
        return " ".join(text(v) for v in value.values())
    return str(value or "").strip()

syllabus = load("data/syllabus-index.json")
canonical = {}
for unit in syllabus.get("units", []):
    for topic in unit.get("topics", []):
        for micro in topic.get("microtopics", []):
            key = f"{unit['id']}-{topic['id']}-{micro['id']}"
            canonical[key] = {"title": micro.get("title", ""), "unit": unit.get("title", "")}

pools = {
    "understand": load("content/microtopics/micro_topics.json"),
    "expand": load("content/deep-dive/deep_dive.json"),
    "retrieve": load("content/active-recall/active_recall.json"),
    "reinforce": load("content/revision/revision_guidance.json"),
    "apply": load("content/practice/practice_mcqs.json"),
}
report = {"schema_version": 1, "note": "Structural triage only; PASS does not verify factual accuracy.", "units": len(syllabus.get("units", [])), "topics": sum(len(u.get("topics", [])) for u in syllabus.get("units", [])), "microtopics": len(canonical), "components": {}, "needs_attention": []}

for name, pool in pools.items():
    missing = sorted(set(canonical) - set(pool))
    extra = sorted(set(pool) - set(canonical))
    thin = []
    for key in sorted(set(canonical) & set(pool)):
        item = pool[key]
        if name == "understand":
            body = text([item.get("expert_explanation"), item.get("content_notes"), item.get("study_notes")])
            good = len(body) >= 80
        elif name == "expand":
            body = text([item.get("detailed_explanation"), item.get("deep_learning"), item.get("deep")])
            good = len(body) >= 80
        elif name == "retrieve":
            prompts = item.get("prompts", [])
            good = isinstance(prompts, list) and len(prompts) > 0
        elif name == "reinforce":
            good = all(text(item.get(k)) for k in ("recall_before_review", "self_check", "weak_point_prompt", "rating_instruction"))
        else:
            questions = item.get("questions", [])
            good = isinstance(questions, list) and bool(questions) and all(
                text(q.get("question")) and isinstance(q.get("options"), list) and len(q["options"]) >= 2
                and text(q.get("correct_answer")) and text(q.get("explanation")) for q in questions if isinstance(q, dict)
            ) and all(isinstance(q, dict) for q in questions)
        if not good:
            thin.append(key)
    report["components"][name] = {"records": len(pool), "missing_ids": len(missing), "extra_ids": len(extra), "needs_content_review": len(thin)}
    if missing or extra or thin:
        report["needs_attention"].append({"component": name, "missing_ids": missing[:25], "extra_ids": extra[:25], "needs_content_review": thin[:100]})

register = load("sources/source-register.json")
ids = [item.get("id") for item in register.get("sources", [])]
assert len(ids) == len(set(ids)), "Source register contains duplicate IDs"
paths = [item.get("path") for item in register.get("sources", [])]
assert len(paths) == len(set(paths)), "Source register contains duplicate paths"
for item in register.get("sources", []):
    assert item.get("id") and item.get("title") and item.get("path", "").startswith("sources/inbox/"), f"Invalid source register entry: {item}"
    assert item.get("type") in {"official-syllabus", "textbook", "pyq-compilation", "unit-notes", "research-reference", "other"}, f"Invalid source type: {item}"
    assert item.get("status") in {"available", "needs-review", "superseded", "restricted"}, f"Invalid source status: {item}"
    assert isinstance(item.get("scope"), list) and item["scope"], f"Source needs scope: {item}"
    if item["status"] == "available":
        assert (ROOT / item["path"]).is_file(), f"Available source file not found: {item['path']}"
report["source_register"] = {"entries": len(register.get("sources", [])), "unique_ids": len(set(ids)), "unique_paths": len(set(paths))}
print(json.dumps(report, indent=2, ensure_ascii=False))
