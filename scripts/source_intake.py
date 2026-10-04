#!/usr/bin/env python3
"""Validate and inventory source files uploaded to sources/inbox."""
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
INBOX=ROOT/"sources"/"inbox"
SUPPORTED={".pdf",".docx",".pptx",".txt",".md",".csv",".tsv",".json"}

def sha256(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def pdf_pages(path):
    try:
        out=subprocess.run(["pdfinfo",str(path)],capture_output=True,text=True,check=True).stdout
        for line in out.splitlines():
            if line.startswith("Pages:"):
                return int(line.split(":",1)[1].strip())
    except Exception:
        return None

def main():
    INBOX.mkdir(parents=True,exist_ok=True)
    items=[]
    for p in sorted(INBOX.rglob("*")):
        if not p.is_file() or p.name==".gitkeep":
            continue
        ext=p.suffix.lower()
        item={"path":str(p.relative_to(ROOT)).replace("\\","/"),
              "filename":p.name,"extension":ext,"bytes":p.stat().st_size,
              "sha256":sha256(p),"supported":ext in SUPPORTED}
        if ext==".pdf":
            item["pages"]=pdf_pages(p)
        items.append(item)
    result={"schema_version":1,"source_count":len(items),
            "unsupported":[x for x in items if not x["supported"]],"sources":items}
    print(json.dumps(result,indent=2,ensure_ascii=False))
    return 1 if result["unsupported"] else 0

if __name__=="__main__":
    raise SystemExit(main())
