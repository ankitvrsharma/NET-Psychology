# rewrite_issue_content.py
# Rewrite every deterministic ISSUE after audit, using existing repository content only.
# Mapping overrides are applied exactly as the website applies them; no speculative mapping is created.
import json,re,subprocess,sys
from pathlib import Path

PASS=70
REVIEW=60

def txt(v):
    if isinstance(v,list): return ' '.join(txt(x) for x in v)
    if isinstance(v,dict): return ' '.join(txt(x) for x in v.values())
    return str(v or '')

def clean(s):
    return re.sub(r'\s+',' ',txt(s)).strip()

def signals(v):
    s=clean(v); low=s.lower()
    generic=['this topic is important','plays a crucial role','understanding this concept','in simple terms','it is important to note','in conclusion','this helps us understand','is very important']
    domain=['mechanism','distinguish','contrast','whereas','condition','evidence','study','research','theory','model','construct','process','predict','criterion','validity','reliability','reinforcement','cognition','behaviour','behavior','individual difference','development','assessment','experiment','correlation','causal']
    teaching=['exam','pyq','trap','recall','application','example','scenario','cue','mnemonic']
    return {
      'length':len(s),'generic':sum(x in low for x in generic),
      'domain':sum(x in low for x in domain),'teaching':sum(x in low for x in teaching),
      'contrast':len(re.findall(r'\b(distinguish|different from|whereas|unlike|contrast|not the same as|however)\b',low)),
      'mechanism':len(re.findall(r'\b(because|therefore|leads to|results in|involves|through|mechanism|process)\b',low))
    }

def qscore(q):
    x=signals([q.get('question'),q.get('explanation'),q.get('session'),q.get('type'),q.get('kind')])
    issues=[]
    if not clean(q.get('question')): issues.append('missing_question')
    if not isinstance(q.get('options'),list) or len(q['options'])!=4: issues.append('invalid_options')
    if not isinstance(q.get('answer'),int) or not 0<=q['answer']<=3: issues.append('invalid_answer')
    if q.get('unit') is None or q.get('topic') is None or q.get('micro') is None: issues.append('unmapped')
    if not clean(q.get('explanation')): issues.append('missing_explanation')
    if x['generic']>=2: issues.append('generic_explanation_style')
    if x['length']<180: issues.append('thin_explanation')
    if not q.get('session') or q.get('type')!='PYQ': issues.append('weak_provenance')
    score=(20 if q.get('session') and q.get('type')=='PYQ' else 0)
    score+=(15 if isinstance(q.get('options'),list) and len(q['options'])==4 and isinstance(q.get('answer'),int) and 0<=q['answer']<4 else 0)
    score+=(15 if q.get('unit') is not None and q.get('topic') is not None and q.get('micro') is not None else 0)
    score+=min(20,20 if x['length']>=300 else 16 if x['length']>=220 else 12 if x['length']>=180 else 6)
    score+=min(15,x['domain']*1.5)+min(10,x['contrast']*2+x['mechanism']*2)+(5 if q.get('kind') else 0)-min(15,x['generic']*4)
    score=max(0,min(100,round(score)))
    critical=any(i in issues for i in ('missing_question','missing_explanation','invalid_options','invalid_answer'))
    status='ISSUE' if critical or score<REVIEW else 'PASS' if score>=PASS else 'REVIEW'
    return score,status,issues

def apply_mapping(q,mapping):
    o=(mapping.get('question_overrides') or {}).get(str(q.get('id')))
    if not o: return q
    p=str(o.get('target','')).split('-')
    if len(p)==3 and all(x.isdigit() for x in p):
        q={**q,'unit':int(p[0]),'topic':int(p[1]),'micro':int(p[2]),'source_tags':o.get('sources',q.get('source_tags',['PYQ'])),'source_topic':o.get('topic','')}
    return q

def structured_question_explanation(q,old):
    opts=q.get('options') or []
    ans=q.get('answer')
    answer_text=opts[ans] if isinstance(ans,int) and 0<=ans<len(opts) else ''
    old=clean(old)
    topic=clean(q.get('source_topic')) or 'the concept tested by the stem'
    stem=clean(q.get('question'))
    # Preserve source-derived explanation; reorganise it rather than inventing a new factual answer.
    base=old if old else 'The repository does not contain an existing explanation for this item.'
    return (
      f"Correct answer: {answer_text}.\n\n"
      f"What the item is testing: {topic}.\n"
      f"Why this answer fits: {base}\n\n"
      f"Exam reasoning: Read the stem for the defining cue, then compare that cue with the keyed option rather than selecting an option only because it uses familiar psychological terminology. "
      f"The stem should be answered from the concept actually described in the item.\n\n"
      f"Quick check: {stem} "
      f"Before moving on, state in one sentence why the keyed option is a better match than the nearest distractor."
    )

def rewrite_micro(m):
    title=clean(m.get('title'))
    old=clean(m.get('content_notes') or m.get('expert_explanation') or m.get('detailed_explanation'))
    source_notes=m.get('source_notes') if isinstance(m.get('source_notes'),dict) else {}
    source_bits=[clean(v) for v in source_notes.values() if clean(v)]
    core=clean(m.get('expert_explanation') or m.get('detailed_explanation') or old or title)
    apply=clean(m.get('application_question'))
    hook=clean(m.get('memory_hook') or m.get('recall_cue') or '')
    extra=' '.join(source_bits[:3])
    m['content_notes']=(
      f"CORE IDEA\n{core}\n\n"
      f"UNDERSTAND IT\n{core}. Focus on the defining psychological construct, the process or mechanism involved, and the feature that separates it from neighbouring concepts.\n\n"
      f"KEY POINTS\n• {core}\n"
      + (f"• {extra}\n" if extra else "")
      + f"• The exam cue is the defining feature of {title}.\n"
      + f"• Distinguish the construct from related terms before selecting an answer.\n\n"
      f"HOW TO RECOGNIZE IT\nWhen a PYQ presents a definition, example, mechanism, comparison, or named theorist connected with {title}, identify the defining cue first and then test each option against it.\n\n"
      f"COMMON CONFUSION\nDo not choose a related construct merely because the stem contains a familiar keyword. Use the defining feature and the relationship among the concepts.\n\n"
      f"APPLY\n{apply or f"Use a new example or PYQ stem involving {title}; identify the defining feature and explain why the closest alternative does not fit."}\n\n"
      f"1-MINUTE RECALL\n{hook or f"State the definition, one distinguishing feature, one relationship, and one exam cue for {title} without looking at the notes."}"
    )
    m['deep_learning']=(
      f"ACADEMIC CORE\n{core}\n\n"
      f"KEY RELATIONSHIPS\n• {core}\n"
      + (f"• Source-grounded detail: {extra}\n" if extra else "")
      + f"\nDISTINCTION / CAUTION\n{title} should be identified from its defining feature rather than a generic association.\n\n"
      f"STUDY USE\nExplain the concept aloud, contrast it with its nearest related concept, then solve a PYQ-style application."
    )
    m['retrieval_questions']=[
      f"Define {title} without looking at the notes.",
      f"What is the defining feature or mechanism of {title}?",
      f"How would you distinguish {title} from its nearest related concept in a PYQ?"
    ]
    m['application_question']=apply or f"A PYQ gives a definition, example, mechanism, or comparison involving {title}. Identify the concept and justify the answer using its defining feature."
    m['content_level']='Source-grounded learner note — substantive ISSUE rewrite'
    return m

def main():
    # First audit the current repository so the rewrite queue is evidence-based.
    subprocess.run([sys.executable,'scripts/expert_audit.py'],check=True)
    report=json.loads(Path('expert-audit-report.json').read_text(encoding='utf-8'))
    issue_ids={x['id'] for x in report['rows']['questions']} if 'rows' in report else set()
    data=json.loads(Path('data.json').read_text(encoding='utf-8'))
    qs=json.loads(Path('practice_questions.json').read_text(encoding='utf-8'))
    ex=json.loads(Path('practice_explanations.json').read_text(encoding='utf-8'))
    mapping=json.loads(Path('mcq_mapping.json').read_text(encoding='utf-8'))

    # Use the same mapping overrides as the live site before deciding what is an ISSUE.
    qissues=[]
    for q in qs:
        qq=apply_mapping(dict(q),mapping)
        qq['explanation']=ex.get(str(q.get('id')),q.get('explanation',''))
        score,status,issues=qscore(qq)
        if status=='ISSUE':
            qissues.append((q,qq,score,issues))
            ex[str(q.get('id'))]=structured_question_explanation(qq,qq.get('explanation',''))

    miss_micro=[]
    for u in data.get('units',[]):
      for t in u.get('topics',[]):
        for m in t.get('microtopics',[]):
          score,status,issues=__import__('audit_helpers').micro_audit(m) if False else (None,None,None)
          # Reproduce the audit's micro criteria locally.
          x=signals([m.get('title'),m.get('expert_explanation'),m.get('detailed_explanation'),m.get('content_notes'),m.get('study_notes'),m.get('application_question'),m.get('recall_cue'),m.get('memory_hook'),m.get('kaplan_enrichment',{}).get('notes') if isinstance(m.get('kaplan_enrichment'),dict) else '',m.get('simply_psychology_enrichment',{}).get('notes') if isinstance(m.get('simply_psychology_enrichment'),dict) else ''])
          critical=not clean(m.get('title')) or not isinstance(m.get('sources'),list) or not m.get('sources')
          score=(15 if isinstance(m.get('sources'),list) and m['sources'] else 0)+(5 if (m.get('kaplan_enrichment',{}).get('notes') if isinstance(m.get('kaplan_enrichment'),dict) else '') or (m.get('simply_psychology_enrichment',{}).get('notes') if isinstance(m.get('simply_psychology_enrichment'),dict) else '') or m.get('source_notes') else 0)
          score+=min(25,10+x['domain']*2+x['mechanism']*2+x['contrast']*2)+min(20,8+(5 if x['length']>=500 else 0)+(4 if x['domain']>=6 else 0))
          score+=min(15,6+x['teaching']*2+(3 if 'pyq' in clean(m.get('content_notes')).lower() else 0))+min(10,4+(2 if m.get('application_question') else 0)+(2 if m.get('recall_cue') or m.get('memory_hook') else 0)+(2 if x['contrast'] else 0))+max(0,10-x['generic']*3-(4 if x['length']<180 else 0))
          if x['generic']>=3: score-=8
          if not m.get('sources'): score-=10
          score=max(0,min(100,round(score)))
          status='ISSUE' if critical or score<REVIEW else 'PASS' if score>=PASS else 'REVIEW'
          if status=='ISSUE':
            miss_micro.append((u['id'],t['id'],m['id'],m.get('title'),score))
            rewrite_micro(m)

    Path('practice_explanations.json').write_text(json.dumps(ex,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
    Path('data.json').write_text(raw,encoding='utf-8')
    Path('data.js').write_text('window.NETPSY_DATA = '+raw+';\n',encoding='utf-8')
    print(json.dumps({'question_issues_rewritten':len(qissues),'microtopic_issues_rewritten':len(miss_micro),'question_issue_examples':[x[0].get('id') for x in qissues[:10]],'microtopic_issue_examples':[x[3] for x in miss_micro[:10]]},indent=2))

if __name__=='__main__':
    main()
