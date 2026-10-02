#!/usr/bin/env python3
"""Discover and ingest publicly accessible official NTA UGC-NET Psychology PYQ assets.

The public NTA site reliably exposes final answer keys and notices. Question papers with
recorded responses may be candidate-authenticated rather than public. This script therefore
never invents question text: it ingests a question-paper PDF only when NTA exposes a public
download link, and otherwise records the official answer-key asset as pending_question_paper.
"""
from __future__ import annotations
import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

BASE="https://ugcnet.nta.ac.in/"
PAGES=[
    "",
    "AnswerKey_june2025.html",
    "AnswerKey.html",
    "archive.html",
]
OUT=Path("data/nta_pyq_registry.json")
PRACTICE=Path("practice_questions.json")
MAPPING=Path("mcq_mapping.json")
TIMEOUT=30
UA="NET-Psychology-NTA-Sync/1.0 (+https://github.com/ankitvrsharma/NET-Psychology)"

def get(url):
    r=requests.get(url,headers={"User-Agent":UA},timeout=TIMEOUT)
    r.raise_for_status()
    return r

def clean(s):
    return re.sub(r"\s+"," ",s or "").strip()

def session_from_text(text,url):
    m=re.search(r"UGC\\s*-?\\s*NET\\s+(JUNE|DECEMBER)\\s*-?\\s*(20\\d{2})",text,re.I)
    if m:
        return f"{m.group(1).title()} {m.group(2)}"
    m=re.search(r"(JUNE|DECEMBER)[_-](20\\d{2})",url,re.I)
    return f"{m.group(1).title()} {m.group(2)}" if m else "Unknown session"

def discover():
    found={}
    for page in PAGES:
        url=urljoin(BASE,page)
        try:
            html=get(url).text
        except Exception:
            continue
        soup=BeautifulSoup(html,"html.parser")
        page_text=clean(soup.get_text(" ",strip=True))
        session=session_from_text(page_text,url)
        for a in soup.find_all("a",href=True):
            label=clean(a.get_text(" ",strip=True))
            href=urljoin(url,a["href"])
            blob=f"{label} {href}".lower()
            if "psychology" not in blob and "(004)" not in blob:
                continue
            if not (href.lower().endswith(".pdf") or "004" in href.lower()):
                continue
            key=session+"|"+href
            found[key]={
                "session":session,
                "subject":"Psychology",
                "subject_code":"004",
                "answer_key_url":href,
                "discovered_from":url,
            }
    return list(found.values())

def parse_answer_key(url):
    # NTA answer-key PDFs are tabular; pdftotext extraction is intentionally delegated
    # to the runner when available. We retain the source URL even when text extraction
    # is unavailable so the asset remains traceable.
    try:
        data=get(url).content
    except Exception:
        return {}
    return {
        "sha256":hashlib.sha256(data).hexdigest(),
        "bytes":len(data),
    }

def load_registry():
    if OUT.exists():
        try:return json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:pass
    return {"schema_version":2,"source":"NTA","subject":"Psychology","subject_code":"004","items":[]}

def main():
    reg=load_registry()
    items={x.get("answer_key_url"):x for x in reg.get("items",[])}
    for item in discover():
        meta=parse_answer_key(item["answer_key_url"])
        old=items.get(item["answer_key_url"],{})
        item.update({
            "status": old.get("status","pending_question_paper"),
            "question_paper_url": old.get("question_paper_url"),
            "question_paper_access": old.get("question_paper_access","not_publicly_discovered"),
            "answer_key_status":"final" if "FINAL" in item["answer_key_url"].upper() or "KEY_PDF" in item["answer_key_url"].upper() else "unknown",
            "last_checked":datetime.now(timezone.utc).isoformat(),
            **meta,
        })
        items[item["answer_key_url"]]=item
    reg["items"]=sorted(items.values(),key=lambda x:(x.get("session",""),x.get("answer_key_url","")))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Discovered {len(reg['items'])} official Psychology answer-key assets.")

if __name__=="__main__":
    main()
