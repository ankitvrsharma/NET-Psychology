#!/usr/bin/env python3
"""Create a reproducible manifest and ZIP snapshot of canonical learner JSON pools."""
import hashlib, json, zipfile
from datetime import datetime, timezone
from pathlib import Path

PATHS=[
 'data/syllabus-index.json','data/mcq_mapping.json','data/exam_schedule.json','data/nta_pyq_registry.json','data/verification-state.json',
 'content/microtopics/micro_topics.json','content/quick-learn/quick_cards.json','content/deep-dive/deep_dive.json',
 'content/active-recall/active_recall.json','content/revision/revision_guidance.json','content/practice/practice_mcqs.json',
 'content/questions/questions.json','content/home/home-learning.json','content-pools/registry.json'
]

def records(obj):
    if isinstance(obj,list): return len(obj)
    if isinstance(obj,dict):
        if any(isinstance(obj.get(k),list) for k in ('pyq','practice')):
            return sum(len(obj.get(k,[])) for k in ('pyq','practice') if isinstance(obj.get(k),list))
        return len(obj)
    return 0

def main():
    manifest={'created_utc':datetime.now(timezone.utc).isoformat(),'note':'Recovery snapshot of canonical JSON pools; Git history remains the primary version history.','files':[]}
    for rel in PATHS:
        p=Path(rel)
        if not p.exists(): raise SystemExit(f'Missing canonical pool: {rel}')
        raw=p.read_bytes()
        try: data=json.loads(raw.decode('utf-8'))
        except Exception as e: raise SystemExit(f'Invalid JSON in {rel}: {e}')
        manifest['files'].append({'path':rel,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'top_level_records':records(data)})
    z=Path('content-pools-snapshot.zip')
    with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json',json.dumps(manifest,indent=2)+'\n')
        for row in manifest['files']: archive.write(row['path'],row['path'])
    print(json.dumps({'snapshot':str(z),'files':len(manifest['files']),'manifest':manifest},indent=2))
if __name__=='__main__': main()
