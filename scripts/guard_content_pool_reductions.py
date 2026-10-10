#!/usr/bin/env python3
"""Fail PR validation on suspicious top-level JSON pool shrinkage."""
import json, subprocess, sys
from pathlib import Path

DEFAULTS = [
 'data/syllabus-index.json', 'data/mcq_mapping.json', 'data/nta_pyq_registry.json',
 'content/microtopics/micro_topics.json', 'content/quick-learn/quick_cards.json',
 'content/deep-dive/deep_dive.json', 'content/active-recall/active_recall.json',
 'content/revision/revision_guidance.json', 'content/practice/practice_mcqs.json',
 'content/questions/questions.json', 'content/home/home-learning.json'
]

def read_base(ref, path):
    p = subprocess.run(['git','show',f'{ref}:{path}'],capture_output=True,text=True)
    if p.returncode: return None
    try: return json.loads(p.stdout)
    except Exception: return None

def count_records(obj):
    if isinstance(obj, list): return len(obj)
    if isinstance(obj, dict):
        if any(isinstance(obj.get(k), list) for k in ('pyq','practice')):
            return sum(len(obj.get(k, [])) for k in ('pyq','practice') if isinstance(obj.get(k), list))
        return len(obj)
    return 0

def main():
    if len(sys.argv) < 2:
        print('Usage: guard_content_pool_reductions.py BASE_REF [PATH ...]', file=sys.stderr); return 2
    base = sys.argv[1]; paths = sys.argv[2:] or DEFAULTS; errors=[]
    for name in paths:
        before=read_base(base,name); p=Path(name)
        if before is None:
            if not p.exists():
                errors.append(f'{name}: missing in base and working tree; review path removal')
            continue
        if not p.exists():
            errors.append(f'{name}: existing content pool was deleted')
            continue
        try: after=json.loads(p.read_text(encoding='utf-8'))
        except Exception as exc:
            errors.append(f'{name}: current JSON invalid: {exc}'); continue
        old,new=count_records(before),count_records(after)
        if old >= 20 and new < old and (old-new) >= max(10, int(old*0.20)):
            errors.append(f'{name}: suspicious reduction {old} -> {new} records; explain and review before merging')
        print(f'{name}: {old} -> {new}')
    if errors:
        print('CONTENT REDUCTION GUARD FAILED\n'+'\n'.join(errors),file=sys.stderr); return 1
    print('Content reduction guard passed.'); return 0
if __name__=='__main__': raise SystemExit(main())
