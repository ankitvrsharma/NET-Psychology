#!/usr/bin/env python3
"""Import the authoritative Telegram quiz workbook into the website PYQ pool.

The workbook remains the source of truth. Existing website question-pool content is
merged (never silently discarded), while the currently empty pool contributes no
question rows. Existing curated mcq_mapping overrides are reused first.
"""
from pathlib import Path
from collections import Counter
import json
import re
import sys
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "telegram-quiz/data/question_bank.xlsx"
SYLLABUS = ROOT / "data/syllabus-index.json"
MAPPING = ROOT / "data/mcq_mapping.json"
OUTPUT = ROOT / "content/questions/questions.json"
AUDIT = ROOT / "data/pyq-import-audit.json"

def read_json(path, default):
    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

def session_slug(value):
    return re.sub(r"[^A-Za-z0-9]+", "-", str(value).strip()).strip("-")

def answer_index(value):
    token = str(value or "").strip().upper()
    if token in {"A", "B", "C", "D"}:
        return ord(token) - 65
    if token in {"1", "2", "3", "4"}:
        return int(token) - 1
    return None

def question_kind(stem):
    s = str(stem or "").lower()
    if "assertion" in s and "reason" in s:
        return "assertion-reason"
    if "match" in s and ("list" in s or "following" in s):
        return "match"
    if any(x in s for x in ("arrange in the correct sequence", "correct sequence", "chronological order", "sequence of")):
        return "sequence"
    if "statement" in s and any(x in s for x in ("which of the following", "how many", "select the correct")):
        return "statement-set"
    return "direct"

def build_taxonomy(syllabus):
    units = {}
    micro = {}
    topic_lookup = {}
    for unit in syllabus.get("units", []):
        units[str(unit["id"])] = unit
        for topic in unit.get("topics", []):
            topic_lookup[norm(topic.get("title"))] = (unit, topic)
            for item in topic.get("microtopics", []):
                key = f'{unit["id"]}-{topic["id"]}-{item["id"]}'
                micro[key] = {
                    "unit": int(unit["id"]), "topic": int(topic["id"]),
                    "micro": int(item["id"]), "unit_title": unit.get("title", ""),
                    "topic_title": topic.get("title", ""),
                    "micro_title": item.get("title", "")
                }
    return micro

STOP = {"the","and","for","with","from","into","what","which","when","where","who","why",
        "how","are","was","were","is","of","in","on","to","by","an","a","as","or","at",
        "following","given","below","correct","according","select","identify","match",
        "psychology","psychological","theory","theories","approach","approaches","types",
        "following","best","most","least","all","none","one","two","three","four","five"}

def map_question(text, qid, micro, mapping):
    override = mapping.get("question_overrides", {}).get(qid)
    if override:
        target = str(override.get("target", ""))
        if target in micro:
            return micro[target], "curated-question-override", 1.0
    normalized = norm(text)
    # Reuse explicit topic-level mappings only when their title is clearly present
    # in the question material and the target is unambiguous.
    hits = []
    for item in mapping.get("topic_map", {}).values():
        title = norm(item.get("title"))
        targets = item.get("targets", [])
        if title and len(targets) == 1 and (title in normalized or normalized in title):
            target = str(targets[0])
            if target in micro:
                hits.append((len(title.split()), micro[target]))
    if hits:
        hits.sort(key=lambda x: x[0], reverse=True)
        return hits[0][1], "curated-topic-map", min(0.95, 0.75 + hits[0][0] * 0.02)
    # Conservative lexical mapping: only distinctive micro-topic terms are eligible.
    tokens = set(normalized.split()) - STOP
    ranked = []
    for key, item in micro.items():
        title_tokens = set(norm(item["micro_title"]).split()) - STOP
        topic_tokens = set(norm(item["topic_title"]).split()) - STOP
        if not title_tokens:
            continue
        overlap = len(tokens & title_tokens)
        title_score = overlap / len(title_tokens)
        topic_score = len(tokens & topic_tokens) / max(1, len(topic_tokens))
        score = title_score * 0.82 + topic_score * 0.18
        if overlap:
            ranked.append((score, overlap, item))
    ranked.sort(key=lambda x: (x[0], x[1]), reverse=True)
    if not ranked:
        return None, "unmapped", 0.0
    best = ranked[0]
    second = ranked[1][0] if len(ranked) > 1 else 0.0
    if best[0] >= 0.72 and (best[0] - second) >= 0.16 and best[1] >= 1:
        return best[2], "conservative-title-match", round(best[0], 3)
    return None, "needs-manual-mapping", round(best[0], 3)

def parse_rows():
    if not WORKBOOK.exists():
        raise FileNotFoundError(f"Authoritative workbook not found: {WORKBOOK}")
    wb = load_workbook(WORKBOOK, read_only=True, data_only=True)
    ws = wb["Question Bank"] if "Question Bank" in wb.sheetnames else wb.active
    rows = ws.iter_rows(values_only=True)
    headers = [str(x).strip() if x is not None else "" for x in next(rows)]
    for values in rows:
        yield dict(zip(headers, values))

def format_list(value):
    if value is None or str(value).strip() == "":
        return ""
    return str(value).strip().replace("\r\n", "\n").replace("\r", "\n")

def existing_pool():
    raw = read_json(OUTPUT, {"pyq": [], "practice": []})
    if isinstance(raw, list):
        return {"pyq": raw, "practice": []}
    if not isinstance(raw, dict):
        raise ValueError("Existing question pool must be an array or object.")
    return {"pyq": list(raw.get("pyq", [])), "practice": list(raw.get("practice", []))}

def main():
    syllabus = read_json(SYLLABUS, {})
    mapping = read_json(MAPPING, {})
    micro = build_taxonomy(syllabus)
    pool = existing_pool()
    existing_pyq = {str(q.get("id")): q for q in pool["pyq"] if q.get("id") is not None}
    practice = pool["practice"]
    imported, unresolved = {}, []
    map_counts = Counter()
    duplicate_conflicts = []
    seen_source_ids = set()

    for row in parse_rows():
        session = str(row.get("Exam Session") or "").strip()
        qno = str(row.get("Q No.") or "").strip()
        if not session or not qno:
            continue
        qid = f"{session_slug(session)}-{session_slug(qno)}"
        if qid in seen_source_ids:
            duplicate_conflicts.append(qid)
            continue
        seen_source_ids.add(qid)
        stem = str(row.get("Question / Instructions") or "").strip()
        list_i = format_list(row.get("List I — Items"))
        list_ii = format_list(row.get("List II — Items"))
        passage = str(row.get("Shared Passage / Case Context") or "").strip()
        parts = [stem]
        if list_i:
            parts.append("List I:\n" + list_i)
        if list_ii:
            parts.append("List II:\n" + list_ii)
        if passage:
            parts.append("Shared passage / case context:\n" + passage)
        question = "\n\n".join(x for x in parts if x)
        options = [str(row.get(f"Option {letter}") or "").strip() for letter in "ABCD"]
        answer = answer_index(row.get("Correct Option"))
        if not stem or len(options) != 4 or any(not x for x in options):
            unresolved.append({"id": qid, "session": session, "question_number": qno,
                               "reason": "missing-stem-or-option", "answer_key": str(row.get("Correct Option") or "")})
            continue
        if answer is None:
            unresolved.append({"id": qid, "session": session, "question_number": qno,
                               "reason": "non-standard-or-unresolved-answer-key", "answer_key": str(row.get("Correct Option") or ""),
                               "question": question, "options": options})
            continue
        mapped, method, confidence = map_question(question + "\n" + "\n".join(options), qid, micro, mapping)
        map_counts[method] += 1
        # Never replace an existing website question silently. Keep its authored
        # explanation/metadata and merge workbook provenance/options only when identical.
        record = {
            "id": qid, "question": question, "options": options, "answer": answer,
            "session": session, "paper": str(row.get("Paper") or "Paper II"),
            "question_number": int(float(qno)) if re.fullmatch(r"\d+(?:\.0)?", qno) else qno,
            "kind": question_kind(question), "questionCategory": "pyq",
            "source_tags": ["PYQ", "VERIFIED INVENTORY"],
            "source_provenance": "telegram-quiz/data/question_bank.xlsx",
            "answer_key_provenance": "Authoritative verified inventory designated by the site owner",
            "explanation": "The source workbook provides the answer key but no explanatory rationale. Use the mapped micro-topic learning notes to study the concept; an authored explanation has not been added.",
            "source_page": str(row.get("Source PDF Page") or "").strip() or None,
            "mapping_method": method, "mapping_confidence": confidence
        }
        if mapped:
            record.update({"unit": mapped["unit"], "topic": mapped["topic"], "micro": mapped["micro"],
                           "unit_title": mapped["unit_title"], "topic_title": mapped["topic_title"],
                           "micro_title": mapped["micro_title"]})
        else:
            record.update({"unit": None, "topic": None, "micro": None})
        prior = existing_pyq.get(qid)
        if prior:
            # Existing pool data wins for editorial fields; workbook remains the
            # authoritative source for stem/options/answer and provenance.
            for key in ("explanation", "source_tags", "kind", "unit", "topic", "micro",
                        "unit_title", "topic_title", "micro_title"):
                if prior.get(key) not in (None, "", []):
                    record[key] = prior[key]
            record["source_tags"] = list(dict.fromkeys(list(record.get("source_tags", [])) +
                                                       list(prior.get("source_tags", []))))
            if any(prior.get(k) != record.get(k) for k in ("question", "options", "answer")):
                duplicate_conflicts.append(qid)
        imported[qid] = record

    # Keep all previously authored pool entries, including practice MCQs, and
    # merge the workbook PYQs by stable session/question identity.
    merged = dict(existing_pyq)
    merged.update(imported)
    ordered_pyq = sorted(merged.values(), key=lambda q: (str(q.get("session", "")), str(q.get("question_number", ""))))
    output = {"schema_version": 1, "pyq": ordered_pyq, "practice": practice, "review": unresolved}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    mapped_count = sum(1 for q in imported.values() if q.get("unit") is not None)
    audit = {
        "source": "telegram-quiz/data/question_bank.xlsx",
        "source_sheet": "Question Bank",
        "source_rows_seen": len(seen_source_ids),
        "imported_pyq_count": len(imported),
        "unresolved_answer_or_structure_count": len(unresolved),
        "mapped_count": mapped_count,
        "unmapped_count": len(imported) - mapped_count,
        "mapping_methods": dict(map_counts),
        "existing_practice_mcq_count_preserved": len(practice),
        "preexisting_pyq_count": len(existing_pyq),
        "duplicate_or_conflict_ids": sorted(set(duplicate_conflicts)),
        "policy": "Workbook is the authoritative PYQ inventory. Existing website-authored data is preserved where it does not conflict with workbook question/answer fields. Unresolved keys are kept in review and are not exposed as answerable quiz items."
    }
    AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))
    if duplicate_conflicts:
        print("WARNING: duplicate/conflicting stable IDs require review.", file=sys.stderr)

if __name__ == "__main__":
    main()
