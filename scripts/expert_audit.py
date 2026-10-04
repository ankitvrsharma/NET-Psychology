# expert_audit.py
# Deterministic expert-likeness audit. Thresholds are intentionally aligned with the publishing gate.\n# Rewrite cycle: source-grounded substantive notes first; dependent cards are re-audited afterward.\n# External PYQ rebuild is intentionally not part of this workflow.
import json,re,statistics
from pathlib import Path
THRESHOLD=70; REVIEW=60; VERSION='2026-10-04-expert5'
def text(v):
    if isinstance(v,list): return ' '.join(text(x) for x in v)
    if isinstance(v,dict): return ' '.join(text(x) for x in v.values())
    return str(v or '')
def sig(v):
    s=re.sub(r'\\s+',' ',text(v)).strip(); low=s.lower()
    generic=['this topic is important','plays a crucial role','understanding this concept','in simple terms','it is important to note','in conclusion','this helps us understand','is very important']
    domain=['mechanism','distinguish','contrast','whereas','condition','evidence','study','research','theory','model','construct','process','predict','criterion','validity','reliability','reinforcement','cognition','behaviour','behavior','individual difference','development','assessment','experiment','correlation','causal']
    teaching=['exam','pyq','trap','recall','application','example','scenario','cue','mnemonic']
    return {'length':len(s),'genericHits':sum(x in low for x in generic),'domainHits':sum(x in low for x in domain),'teachingHits':sum(x in low for x in teaching),'contrastHits':len(re.findall(r'\\b(distinguish|different from|whereas|unlike|contrast|not the same as|however)\\b',low)),'mechanismHits':len(re.findall(r'\\b(because|therefore|leads to|results in|involves|through|mechanism|process)\\b',low)),'names':len(re.findall(r'\\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)?\\b',s))}
def micro(m):
    core=text([m.get('title'),m.get('expert_explanation'),m.get('detailed_explanation'),m.get('content_notes'),m.get('study_notes'),m.get('application_question'),m.get('recall_cue'),m.get('memory_hook'),m.get('kaplan_enrichment',{}).get('notes') if isinstance(m.get('kaplan_enrichment'),dict) else '',m.get('simply_psychology_enrichment',{}).get('notes') if isinstance(m.get('simply_psychology_enrichment'),dict) else '']); x=sig(core); issues=[]
    if not text(m.get('title')).strip(): issues.append('missing_title')
    if x['length']<220: issues.append('too_thin')
    if not isinstance(m.get('sources'),list) or not m['sources']: issues.append('no_explicit_source_mapping')
    if x['genericHits']>=3: issues.append('generic_ai_style')
    if x['domainHits']<3: issues.append('low_psychology_specificity')
    if x['mechanismHits']<1 and x['contrastHits']<1: issues.append('weak_explanation_structure')
    source=15 if isinstance(m.get('sources'),list) and m['sources'] else 0
    if (isinstance(m.get('kaplan_enrichment'),dict) and m['kaplan_enrichment'].get('notes')) or (isinstance(m.get('simply_psychology_enrichment'),dict) and m['simply_psychology_enrichment'].get('notes')) or m.get('source_notes'): source+=5
    accuracy=min(25,10+x['domainHits']*2+x['mechanismHits']*2+x['contrastHits']*2); expert=min(20,8+(5 if x['length']>=500 else 0)+(4 if x['domainHits']>=6 else 0)+(3 if x['names']>=2 else 0)); net=min(15,6+x['teachingHits']*2+(3 if 'pyq' in text(m.get('content_notes')).lower() else 0)); learning=min(10,4+(2 if m.get('application_question') else 0)+(2 if m.get('recall_cue') or m.get('memory_hook') else 0)+(2 if x['contrastHits'] else 0)); originality=max(0,10-x['genericHits']*3-(4 if x['length']<180 else 0)); score=max(0,min(100,round(source+accuracy+expert+net+learning+originality-(8 if x['genericHits']>=3 else 0)-(10 if not m.get('sources') else 0))))
    status='ISSUE' if any(i in issues for i in ('missing_title','no_explicit_source_mapping')) or score<REVIEW else 'PASS' if score>=THRESHOLD else 'REVIEW'; return score,status,issues
def qaudit(q):
    x=sig([q.get('question'),q.get('explanation'),q.get('session'),q.get('type'),q.get('kind')]); issues=[]
    if not text(q.get('question')).strip(): issues.append('missing_question')
    if not isinstance(q.get('options'),list) or len(q['options'])!=4: issues.append('invalid_options')
    if not isinstance(q.get('answer'),int) or not 0<=q['answer']<=3: issues.append('invalid_answer')
    if q.get('unit') is None or q.get('topic') is None or q.get('micro') is None: issues.append('unmapped')
    if not text(q.get('explanation')).strip(): issues.append('missing_explanation')
    if x['genericHits']>=2: issues.append('generic_explanation_style')
    if x['length']<180: issues.append('thin_explanation')
    if not q.get('session') or q.get('type')!='PYQ': issues.append('weak_provenance')
    score=(20 if q.get('session') and q.get('type')=='PYQ' else 0)+(15 if isinstance(q.get('options'),list) and len(q['options'])==4 and isinstance(q.get('answer'),int) and 0<=q['answer']<4 else 0)+(15 if q.get('unit') is not None and q.get('topic') is not None and q.get('micro') is not None else 0)+min(20,20 if len(text(q.get('explanation')))>=300 else 16 if len(text(q.get('explanation')))>=220 else 12 if len(text(q.get('explanation')))>=180 else 6)+min(15,x['domainHits']*1.5)+min(10,x['contrastHits']*2+x['mechanismHits']*2)+(5 if q.get('kind') else 0)-min(15,x['genericHits']*4); score=max(0,min(100,round(score))); status='ISSUE' if any(i in issues for i in ('missing_question','missing_explanation','invalid_options','invalid_answer')) else 'PASS' if score>=THRESHOLD else 'REVIEW' if score>=REVIEW else 'ISSUE'; return score,status,issues
data=json.loads(Path('data.json').read_text(encoding='utf-8')); qs=json.loads(Path('practice_questions.json').read_text(encoding='utf-8')); ex=json.loads(Path('practice_explanations.json').read_text(encoding='utf-8')); rows={'questions':[],'microtopics':[],'quickLearnCards':[],'activeRecall':[]}
for q in qs:
    qq=dict(q); qq['explanation']=ex.get(str(q.get('id')),q.get('explanation','')); score,status,issues=qaudit(qq); rows['questions'].append({'id':q.get('id'),'score':score,'status':status,'issues':issues})
for u in data['units']:
  for t in u.get('topics',[]):
    for m in t.get('microtopics',[]):
      mid=f"{u['id']}-{t['id']}-{m['id']}"; score,status,issues=micro(m); rows['microtopics'].append({'id':mid,'title':m.get('title'),'score':score,'status':status,'issues':issues})
      txt=text([m.get('expert_explanation'),m.get('detailed_explanation'),m.get('content_notes'),m.get('study_notes'),m.get('application_question'),m.get('recall_cue'),m.get('memory_hook')]).lower()
      req={'CORE IDEA':r'core|definition|means|refers|concept|theor','KEY FEATURES':r'feature|characteristic|component|dimension|factor|type','PYQ FOCUS':r'pyq|exam|question|distinguish|trap','EXAM TRAP':r'trap|distinguish|not the same|whereas|common error','SOURCE DETAIL':r'source|study|research|author|model|theory','RECALL CUE':r'recall|cue|memory|mnemonic','CONNECTION':r'connect|relationship|link|related|contrast|compare'}
      for angle,pattern in req.items():
        miss=not re.search(pattern,txt); sc=max(0,score-(15 if miss else 0)); st='PASS' if sc>=THRESHOLD else 'REVIEW' if sc>=REVIEW else 'ISSUE'; rows['quickLearnCards'].append({'id':mid+'|'+angle,'title':m.get('title')+' — '+angle,'score':sc,'status':st,'issues':issues+(['weak_angle_specific_support'] if miss else [])})
rows['activeRecall']=[dict(x) for x in rows['questions']]
summary={k:{'total':len(a),'PASS':sum(x['status']=='PASS' for x in a),'REVIEW':sum(x['status']=='REVIEW' for x in a),'ISSUE':sum(x['status']=='ISSUE' for x in a),'average':round(statistics.mean(x['score'] for x in a),1) if a else 0} for k,a in rows.items()}
baseline={'questions':{'total':1583,'PASS':74,'REVIEW':1356,'ISSUE':153,'average':68},'microtopics':{'total':440,'PASS':133,'REVIEW':307,'ISSUE':0,'average':77},'quickLearnCards':{'total':3080,'PASS':478,'REVIEW':2091,'ISSUE':511,'average':69},'activeRecall':{'total':1583,'PASS':74,'REVIEW':1356,'ISSUE':153,'average':68}}
Path('expert-audit-report.json').write_text(json.dumps({'generated_at':'2026-10-04','audit_version':VERSION,'pass_threshold':THRESHOLD,'review_threshold':REVIEW,'policy':'REWRITE_AND_REAUDIT_UNTIL_PASS_THEN_OWNER_REVIEW','baseline_from_approved_audit':baseline,'reaudit':summary,'note':'Baseline is the approved pre-rewrite audit. Re-audit is generated from repository content after substantive rewrite/build steps; dependent Quick Learn Cards are evaluated from parent micro-topic content.','priority_order':['ISSUE','lowest-scoring REVIEW','parent microtopic before dependent Quick Learn Cards']},ensure_ascii=False,indent=2)+'\n')
tracking={'schema_version':1,'audit_version':VERSION,'pass_threshold':THRESHOLD,'max_automatic_rewrite_cycles':2,'generated_from':'expert-audit-report.json','pools':{k:{'total':len(a),'pass':sum(x['status']=='PASS' for x in a),'review':sum(x['status']=='REVIEW' for x in a),'issue':sum(x['status']=='ISSUE' for x in a),'rewrite_queue':[{'id':x['id'],'score':x['score'],'status':x['status'],'cycles':1,'next_action':'RE-AUDIT'} for x in sorted(a,key=lambda z:z['score']) if x['status']!='PASS']} for k,a in rows.items()}}
Path('rewrite-reaudit-tracking.json').write_text(json.dumps(tracking,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,indent=2))
