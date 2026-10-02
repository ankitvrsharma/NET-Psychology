import json,re,hashlib
from pathlib import Path
P=Path('data.json')
data=json.loads(P.read_text(encoding='utf-8'))

def sec(txt,name,nexts=[]):
    if not txt:return ''
    m=re.search(r'(?m)^'+re.escape(name)+r'\s*\n(.*?)(?=\n(?:'+ '|'.join(map(re.escape,nexts))+r')\s*\n|\Z)',txt,re.S|re.I)
    return m.group(1).strip() if m else ''

def bullets(s):
    out=[]
    for x in re.split(r'\n',s or ''):
        x=re.sub(r'^\s*[•\-]\s*','',x).strip()
        if x: out.append(x)
    return out

def clean(s): return re.sub(r'\s+',' ',s or '').strip()

count=0
for unit in data['units']:
  for topic in unit['topics']:
    tdesc=clean(topic.get('explanation') or topic.get('notes') or topic.get('detailed_notes') or '')
    for m in topic.get('microtopics',[]):
      old=m.get('content_notes','')
      core=clean(sec(old,'CORE CONCEPT',['KEY POINTS','PYQ-STYLE PATTERN','COMMON TRAP','5-MINUTE TEACHING FOCUS','MEMORY HOOK']))
      kps=bullets(sec(old,'KEY POINTS',['PYQ-STYLE PATTERN','COMMON TRAP','5-MINUTE TEACHING FOCUS','MEMORY HOOK']))[:7]
      trap=clean(sec(old,'COMMON TRAP',['5-MINUTE TEACHING FOCUS','MEMORY HOOK']))
      hook=clean(sec(old,'MEMORY HOOK',[]))
      if not core: core=clean(m.get('exam_takeaway') or m['title'])
      explanation=f"{m['title']} is best understood through its defining idea: {core}."
      if kps: explanation += " The key elements are " + ", ".join(kps[:4]) + "."
      if tdesc and len(tdesc)>80:
          first=re.split(r'(?<=[.!?])\s+',tdesc)[0]
          if first and m['title'].lower() not in first.lower(): explanation += " In this topic, " + first[0].lower()+first[1:]
      recognition=f"For a question on {m['title']}, first decide whether the stem is testing the definition, a component, a distinction, a process, or an application. Then anchor the answer to the defining feature and the relevant keywords: " + (', '.join(kps[:5]) if kps else core) + "."
      distinction=trap or f"Do not confuse {m['title']} with a neighboring construct; use its defining feature rather than a familiar keyword alone."
      apply=clean(m.get('application_question') or '')
      recall=clean(m.get('exam_takeaway') or hook or core)
      m['content_notes']=(f"CORE IDEA\n{core}\n\nUNDERSTAND IT\n{explanation}\n\nKEY POINTS\n" + ('\n'.join('• '+x for x in kps) if kps else '• '+core) + "\n\nHOW TO RECOGNIZE IT\n" + recognition + "\n\nCOMMON CONFUSION\n" + distinction + "\n\nAPPLY\n" + (apply or f"Use the defining feature of {m['title']} to identify the concept in a new example or question stem.") + "\n\n1-MINUTE RECALL\n" + recall)
      m['deep_learning']=(f"ACADEMIC CORE\n{core}\n\nKEY RELATIONSHIPS\n" + ('\n'.join('• '+x for x in kps) if kps else '• '+core) + f"\n\nDISTINCTION / CAUTION\n{distinction}\n\nSTUDY USE\n{recognition}")
      m['retrieval_questions']=[f"Define or state the core idea of “{m['title']}” without looking at the notes.",f"List the key elements of “{m['title']}” and explain how they are related.",f"What distinction or common confusion must you watch for when answering a question on “{m['title']}”?"]
      m['application_question']=apply or f"A new question gives a definition, example, or comparison related to “{m['title']}”. Identify the concept being tested and justify the answer using its defining feature and key elements."
      m['content_level']='Source-grounded learner note — concept, relationships, recognition, application, retrieval'
      count+=1
raw=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
P.write_text(raw,encoding='utf-8')
Path('data.js').write_text('window.NETPSY_DATA = '+raw+';\n',encoding='utf-8')
version=hashlib.sha256(raw.encode()).hexdigest()[:16]
Path('content-version.js').write_text('window.NETPSY_DATA_VERSION = '+json.dumps(version)+';\n',encoding='utf-8')
print(f'Rewrote {count} micro-topics; content version {version}')

# Trigger rewrite workflow after workflow installation.
