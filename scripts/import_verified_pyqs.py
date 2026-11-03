#!/usr/bin/env python3
"""Import the authoritative workbook into the website PYQ pool without losing other pool data."""
from pathlib import Path
from collections import Counter
import json, re
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "telegram-quiz/data/question_bank.xlsx"
SYLLABUS = ROOT / "data/syllabus-index.json"
MAPPING = ROOT / "data/mcq_mapping.json"
OUTPUT = ROOT / "content/questions/questions.json"
AUDIT = ROOT / "data/pyq-import-audit.json"

def read_json(path, default):
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    return json.loads(text) if text.strip() else default

def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

def slug(value):
    return re.sub(r"[^A-Za-z0-9]+", "-", str(value).strip()).strip("-")

def answer_index(value):
    token = str(value or "").strip().upper()
    if token in {"A","B","C","D"}: return ord(token)-65
    if token in {"1","2","3","4"}: return int(token)-1
    return None

def question_kind(stem):
    s = str(stem or "").lower()
    if "assertion" in s and "reason" in s: return "assertion-reason"
    if "match" in s and ("list" in s or "following" in s): return "match"
    if any(x in s for x in ("correct sequence","chronological order","sequence of")): return "sequence"
    if "statement" in s and any(x in s for x in ("which of the following","how many","select the correct")): return "statement-set"
    return "direct"

def build_taxonomy(syllabus):
    micro = {}
    for unit in syllabus.get("units", []):
        for topic in unit.get("topics", []):
            for item in topic.get("microtopics", []):
                key = f'{unit["id"]}-{topic["id"]}-{item["id"]}'
                micro[key] = {"unit":int(unit["id"]),"topic":int(topic["id"]),"micro":int(item["id"]),
                              "unit_title":unit.get("title",""),"topic_title":topic.get("title",""),
                              "micro_title":item.get("title","")}
    return micro

STOP = {"the","and","for","with","from","into","what","which","when","where","who","why","how","are","was","were",
        "is","of","in","on","to","by","an","a","as","or","at","following","given","below","correct","according",
        "select","identify","match","psychology","psychological","theory","theories","approach","approaches","types",
        "best","most","least","all","none","one","two","three","four","five"}

def map_question(text, override_id, micro, mapping):
    override = mapping.get("question_overrides", {}).get(override_id)
    if override and str(override.get("target","")) in micro:
        return micro[str(override["target"])], "curated-question-override", 1.0
    normalized = norm(text)
    hits = []
    for item in mapping.get("topic_map", {}).values():
        title = norm(item.get("title"))
        targets = item.get("targets", [])
        if title and len(targets) == 1 and title in normalized and str(targets[0]) in micro:
            hits.append((len(title.split()), micro[str(targets[0])]))
    if hits:
        hits.sort(key=lambda x:x[0], reverse=True)
        return hits[0][1], "curated-topic-map", min(.95,.75+hits[0][0]*.02)
    tokens = set(normalized.split()) - STOP
    ranked = []
    for item in micro.values():
        title_tokens = set(norm(item["micro_title"]).split()) - STOP
        topic_tokens = set(norm(item["topic_title"]).split()) - STOP
        if not title_tokens: continue
        overlap = len(tokens & title_tokens)
        if overlap:
            score = (overlap/len(title_tokens))*.82 + (len(tokens & topic_tokens)/max(1,len(topic_tokens)))*.18
            ranked.append((score, overlap, item))
    ranked.sort(key=lambda x:(x[0],x[1]), reverse=True)
    if not ranked: return None,"unmapped",0.0
    best, second = ranked[0], ranked[1][0] if len(ranked)>1 else 0.0
    if best[0] >= .72 and best[0]-second >= .16:
        return best[2],"conservative-title-match",round(best[0],3)
    return None,"needs-manual-mapping",round(best[0],3)

def source_rows():
    if not WORKBOOK.exists(): raise FileNotFoundError(WORKBOOK)
    wb = load_workbook(WORKBOOK, read_only=True, data_only=True)
    ws = wb["Question Bank"] if "Question Bank" in wb.sheetnames else wb.active
    rows = ws.iter_rows(values_only=True)
    headers = [str(x).strip() if x is not None else "" for x in next(rows)]
    for values in rows: yield dict(zip(headers, values))

def text_cell(value):
    return str(value).strip().replace("\r\n","\n").replace("\r","\n") if value is not None else ""

def main():
    micro = build_taxonomy(read_json(SYLLABUS,{}))
    mapping = read_json(MAPPING,{})
    raw = read_json(OUTPUT,{"pyq":[],"practice":[]})
    if isinstance(raw,list): raw={"pyq":raw,"practice":[]}
    if not isinstance(raw,dict): raise ValueError("Existing question pool must be an array or object.")
    existing = {str(q["id"]):q for q in raw.get("pyq",[]) if q.get("id") is not None and q.get("source_provenance") != "telegram-quiz/data/question_bank.xlsx"}
    practice = list(raw.get("practice",[]))
    imported, review = {}, []
    methods, conflicts, seen = Counter(), [], set()

    for row in source_rows():
        session, paper, qno = text_cell(row.get("Exam Session")), text_cell(row.get("Paper")), text_cell(row.get("Q No."))
        if not session or not paper or not qno: continue
        # Paper II keeps the legacy key used by curated question overrides. Paper III
        # receives an explicit suffix so its same-numbered questions cannot collide.
        legacy_id = f"{slug(session)}-{slug(qno)}"
        qid = legacy_id if paper.strip().lower() == "paper ii" else f"{slug(session)}-{slug(paper)}-{slug(qno)}"
        if qid in seen:
            conflicts.append(qid)
            continue
        seen.add(qid)
        stem = text_cell(row.get("Question / Instructions"))
        list_i, list_ii = text_cell(row.get("List I — Items")), text_cell(row.get("List II — Items"))
        passage = text_cell(row.get("Shared Passage / Case Context"))
        if passage and re.fullmatch(r"[\d\s.,;:/-]+", passage): passage = ""
        parts = [stem]
        if list_i: parts.append("List I:\n"+list_i)
        if list_ii: parts.append("List II:\n"+list_ii)
        if passage: parts.append("Shared passage / case context:\n"+passage)
        question = "\n\n".join(x for x in parts if x)
        options = [text_cell(row.get(f"Option {x}")) for x in "ABCD"]
        answer = answer_index(row.get("Correct Option"))
        if not stem or any(not x for x in options):
            review.append({"id":qid,"session":session,"paper":paper,"question_number":qno,
                           "reason":"missing-stem-or-option","answer_key":text_cell(row.get("Correct Option"))})
            continue
        if answer is None:
            review.append({"id":qid,"session":session,"paper":paper,"question_number":qno,
                           "reason":"non-standard-or-unresolved-answer-key","answer_key":text_cell(row.get("Correct Option")),
                           "question":question,"options":options})
            continue

        mapped, method, confidence = map_question(question+"\n"+"\n".join(options), legacy_id, micro, mapping)
        prior = existing.get(qid)
        # Existing website mappings are useful only if they point to the current canonical taxonomy.
        if mapped is None and prior:
            prior_key = f'{prior.get("unit")}-{prior.get("topic")}-{prior.get("micro")}'
            if prior_key in micro:
                mapped, method, confidence = micro[prior_key], "existing-pool-canonical-mapping", 0.9
        methods[method] += 1

        record = {
            "id":qid,"question":question,"options":options,"answer":answer,
            "session":session,"paper":paper,
            "question_number":int(float(qno)) if re.fullmatch(r"\d+(?:\.0)?",qno) else qno,
            "kind":question_kind(question),"questionCategory":"pyq",
            "source_tags":["PYQ","VERIFIED INVENTORY"],
            "source_provenance":"telegram-quiz/data/question_bank.xlsx",
            "answer_key_provenance":"Authoritative verified inventory designated by the site owner",
            "explanation":"The source workbook provides the answer key but no explanatory rationale. Use the mapped micro-topic learning notes to study the concept; an authored explanation has not been added.",
            "source_page":(text_cell(row.get("Source PDF Page")) if re.fullmatch(r"\d+", text_cell(row.get("Source PDF Page"))) else None),
            "mapping_method":method,"mapping_confidence":confidence,
            "unit":mapped["unit"] if mapped else None,
            "topic":mapped["topic"] if mapped else None,
            "micro":mapped["micro"] if mapped else None
        }
        if mapped:
            record.update({"unit_title":mapped["unit_title"],"topic_title":mapped["topic_title"],"micro_title":mapped["micro_title"]})
        if prior:
            for key in ("explanation","source_tags","kind"):
                if prior.get(key) not in (None,"",[]): record[key]=prior[key]
            record["source_tags"]=list(dict.fromkeys(["PYQ","VERIFIED INVENTORY"]+list(prior.get("source_tags",[]))))
            if any(prior.get(k)!=record.get(k) for k in ("question","options","answer")):
                conflicts.append(qid)
        imported[qid]=record

    merged = dict(existing)
    merged.update(imported)
    ordered = sorted(merged.values(),key=lambda q:(str(q.get("session","")),str(q.get("paper","")),str(q.get("question_number",""))))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema_version":1,"pyq":ordered,"practice":practice,"review":review},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    mapped_count=sum(q.get("unit") is not None for q in imported.values())
    audit={"source":"telegram-quiz/data/question_bank.xlsx","source_sheet":"Question Bank",
           "source_rows_seen":len(seen),"imported_pyq_count":len(imported),
           "unresolved_answer_or_structure_count":len(review),"mapped_count":mapped_count,
           "unmapped_count":len(imported)-mapped_count,"mapping_methods":dict(methods),
           "existing_practice_mcq_count_preserved":len(practice),"preexisting_pyq_count":len(existing),
           "duplicate_or_conflict_ids":sorted(set(conflicts)),
           "policy":"Workbook is the authoritative PYQ inventory. Paper II uses legacy IDs; Paper III has paper-qualified IDs to prevent collisions. Existing website explanations and canonical mappings are retained where available. Unresolved answer keys remain review-only."}
    AUDIT.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(audit,ensure_ascii=False,indent=2))

if __name__=="__main__": main()
