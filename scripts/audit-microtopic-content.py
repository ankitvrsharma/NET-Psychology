#!/usr/bin/env python3
"""Audit the quality signals in the UGC NET Psychology micro-topic JSON."""
import json
import re
import sys
from pathlib import Path

DEFAULT = Path("content/microtopics/micro_topics.json")
SOURCE_IDS = {
    "powerwithin", "baron-misra", "ciccarelli-white",
    "self-teaching-guide", "kaplan-ap", "chromeias-personality",
    "simply-psychology",
}
GENERIC_EXPLANATION = re.compile(
    r"source-grounded UGC NET Psychology micro-topic|"
    r"Identify its defining construct|application/context|"
    r"Use source terminology and do not infer beyond the study material",
    re.I,
)
GENERIC_REVISION = {
    "Recall the central idea and two supporting points before checking the note.",
    "Recall the central idea and two supporting points before reopening the explanation.",
}
GENERIC_TAKEAWAY = "definition/core construct"

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, dict):
        raise SystemExit("Expected a JSON object keyed by syllabus micro-topic ID.")

    counts = {
        "records": len(records),
        "missing_title_or_id": 0,
        "missing_sources": 0,
        "unknown_sources": 0,
        "generic_explanations": 0,
        "learner_ready_records": 0,
        "provenance_in_explanation": 0,
        "empty_key_points": 0,
        "generic_revision_checks": 0,
        "generic_exam_takeaways": 0,
    }
    generic_ids = []
    for key, item in records.items():
        if not isinstance(item, dict):
            counts["missing_title_or_id"] += 1
            continue
        if not item.get("id") or not item.get("title"):
            counts["missing_title_or_id"] += 1
        sources = item.get("sources")
        if not isinstance(sources, list) or not sources:
            counts["missing_sources"] += 1
        else:
            counts["unknown_sources"] += sum(source not in SOURCE_IDS for source in sources)
        explanation = " ".join(str(item.get(field) or "") for field in
                               ("explanation", "expert_explanation", "content_notes"))
        if GENERIC_EXPLANATION.search(explanation):
            counts["generic_explanations"] += 1
            generic_ids.append((key, item.get("title", "")))
        else:
            readiness_fields = ("expert_explanation", "detailed_explanation", "deep_learning", "deep",
                                "content_notes", "study_notes", "application_question", "recall_cue",
                                "memory_hook", "exam_takeaway")
            readiness_text = " ".join(str(item.get(field) or "") for field in readiness_fields).strip()
            if len(readiness_text) >= 80:
                counts["learner_ready_records"] += 1
        if re.search(r"\bSOURCE BASIS\b", explanation, re.I):
            counts["provenance_in_explanation"] += 1
        if not item.get("key_points"):
            counts["empty_key_points"] += 1
        if item.get("revision_check") in GENERIC_REVISION:
            counts["generic_revision_checks"] += 1
        if item.get("exam_takeaway") == GENERIC_TAKEAWAY:
            counts["generic_exam_takeaways"] += 1

    print("Micro-topic content audit")
    for name, value in counts.items():
        print(f"{name}: {value}")
    if generic_ids:
        print("\nGeneric explanation records:")
        for key, title in generic_ids:
            print(f"{key} | {title}")

if __name__ == "__main__":
    main()
