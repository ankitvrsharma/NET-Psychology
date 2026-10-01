import hashlib,json,re,subprocess,urllib.request
from pathlib import Path
SOURCE_URL="https://www.psycourse.in/upload/1/Pdf/Question%20Bank/UGC_NET_JRF_Psychology_Question_Paper.pdf"
EXPECTED_SHA256="6a68178656b7b8122e3d034439f872202ee2ba0daf68376b77c04fd419a7ad69"
SESSIONS=['June 2012','December 2012','June 2013','September 2013','December 2013','June 2014','December 2014','June 2015','December 2015','July 2016','January 2017','November 2017','July 2018','December 2018','June 2019','December 2019','September 2020','June 2021','July 2022','March 2023','June 2023','December 2023']
def clean(s):return re.sub(r'\s+',' ',s.replace('\u200c','').replace('\ufeff','').replace('\x0c',' ')).strip()
def download_source(path):
 r=urllib.request.urlopen(urllib.request.Request(SOURCE_URL,headers={'User-Agent':'NET-Psychology-content-builder/1.0'}),timeout=60);data=r.read();r.close()
 if hashlib.sha256(data).hexdigest()!=EXPECTED_SHA256:raise SystemExit('Source PDF checksum mismatch')
 Path(path).write_bytes(data)
def page_text(pdf):
 out=Path(pdf).with_suffix('.raw.txt');subprocess.run(['pdftotext','-raw',pdf,str(out)],check=True);return out.read_text(encoding='utf-8',errors='ignore').split('\f')
def question_chunks(pages,session):
 needle=f'UGC NET JRF {session} Paper II';hits=[i for i,p in enumerate(pages) if any(line.strip()==needle for line in p.splitlines())]
 if not hits:return []
 lines='\n'.join(pages[min(hits):max(hits)+1]).splitlines();chunks=[];cur=None;expected=1
 for line in lines:
  line=line.strip().replace('\u200c','').replace('\ufeff','')
  if not line or line.startswith('www.upseducation.in') or 'Tap to check answer key' in line:continue
  m=re.match(r'^(\d+)\.\s*(.*)$',line)
  if m and int(m.group(1))==expected and (len(m.group(2).strip())>12 or not m.group(2).strip()):
   if cur is not None:chunks.append(cur)
   cur=[expected,[m.group(2).strip()] if m.group(2).strip() else []];expected+=1
  elif cur is not None:cur[1].append(line)
 if cur is not None:chunks.append(cur)
 return chunks
def parse_question(chunk):
 _,parts=chunk;lines=[l.replace('\u200c','').strip() for p in parts for l in p.splitlines() if l.strip()];c=[];cur=None
 for line in lines:
  m=re.match(r'^([a-d])\)\.?\s*(.*)$',line,re.I) or re.match(r'^([1-4])\)\.?\s*(.*)$',line)
  if m:
   if cur is not None:c.append(cur)
   cur=[m.group(1).lower(),m.group(2).strip()]
  elif cur is not None:cur[1]+=' '+line
 if cur is not None:c.append(cur)
 for i in range(len(c)-4,-1,-1):
  labs=[x[0] for x in c[i:i+4]]
  if labs in (['a','b','c','d'],['1','2','3','4']):
   first=c[i][1];idx=next((j for j,l in enumerate(lines) if first[:25] and first[:25] in l),len(lines));return clean(' '.join(lines[:idx])),[clean(x[1]) for x in c[i:i+4]]
 return clean(' '.join(lines)),[]
def answer_map(pages,session):
 needle=re.sub(r' ',lambda m:r'\s*',session)+r'\s*Paper\s*II';hits=[i for i,p in enumerate(pages[674:],start=674) if re.search(needle,p,re.I)]
 if not hits:return {}
 text='\n'.join(pages[hits[0]:min(len(pages),hits[0]+3)]);pairs=[]
 for m in re.finditer(r'(?m)^\s*(\d{1,3})\.\s*([^\n]+)',text):
  n=int(m.group(1));v=m.group(2).strip()
  if n<=100 and v and re.fullmatch(r'[A-Za-z*]|Dropped|N/F|WQ|X|S|[1-4](?:\s*(?:[,;&]\s*[1-4])+)?|\*',v):pairs.append((n,v))
 mp={};expected=1
 for n,v in pairs:
  if n==expected:mp[n]=v;expected+=1
 return mp
def normalize_answer(v):
 if re.fullmatch(r'[ABCDabcd]',v):return ord(v.upper())-65
 if re.fullmatch(r'[1-4]',v):return int(v)-1
def classify(q):
 s=q.lower()
 if 'assertion (a)' in s and 'reason (r)' in s:return 'assertion-reason'
 if 'match list' in s or ('match the' in s and 'list' in s):return 'match'
 if 'sequence' in s or 'arrange' in s:return 'sequence'
 if 'choose the correct' in s or 'which of the following are' in s:return 'statement-set'
 return 'direct'
def explain(ans,kind):
 k=', '.join(chr(65+i) for i in ans) if isinstance(ans,list) else chr(65+ans)
 return {'assertion-reason':f'The keyed response is {k}. Evaluate Assertion (A) and Reason (R) separately, then determine whether R correctly explains A.','match':f'The keyed response is {k}. It is the option whose pairings preserve the defining relationship between List I and List II.','sequence':f'The keyed response is {k}. It follows the established temporal or logical order of the concepts in the question.','statement-set':f'The keyed response is {k}. It is the combination in which the listed statements satisfy the condition asked in the stem.','direct':f'The keyed response is {k}. It matches the defining concept or relationship asked about in the stem.'}[kind]
def map_syllabus(qtext,units):
 text=qtext.lower();stop={'the','and','of','in','to','a','an','is','are','which','following','with','from','for','on','what','given','correct','according','using','only','does','not','be','as','or','this','that','than','how','can'};tokens={re.sub(r'[^a-z0-9-]','',w) for w in re.findall(r'[a-z0-9-]{4,}',text) if w not in stop};best=(0,None,None,None)
 for u in units:
  for t in u.get('topics',[]):
   for m in t.get('microtopics',[]):
    tt={re.sub(r'[^a-z0-9-]','',w) for w in re.findall(r'[a-z0-9-]{4,}',(m.get('title','')+' '+t.get('title','')).lower()) if w not in stop};score=len(tokens&tt)
    if score>best[0]:best=(score,u['id'],t['id'],m['id'])
 score,u,t,m=best
 return {'unit':u,'topic':t,'micro':m,'mapping_score':score,'mapping_confidence':('high' if score>=3 else ('medium' if score==2 else ('low' if score==1 else 'unmapped')))}
def main():
 download_source('ugc_net_psychology_source.pdf');pages=page_text('ugc_net_psychology_source.pdf');data=json.loads(Path('data.json').read_text(encoding='utf-8'));out=[];dropped=[]
 for s in SESSIONS:
  key=answer_map(pages,s)
  for n,parts in question_chunks(pages,s):
   q,opts=parse_question((n,parts))
   if len(opts)!=4:dropped.append([s,n,'incomplete-options']);continue
   ans=normalize_answer(key.get(n))
   if ans is None:dropped.append([s,n,key.get(n,'missing-key')]);continue
   kind=classify(q); q=re.sub(r'\\s+(?:Instructions for Questions(?: Nos\\.)?|Questions)\\s+\\d+\\s+to\\s+\\d+\\s*:', '', q, flags=re.I).strip(); opts=[re.sub(r'\\s+(?:Instructions for Questions(?: Nos\\.)?|Questions)\\s+\\d+\\s+to\\s+\\d+\\s*:', '', o, flags=re.I).strip() for o in opts]; out.append({'id':f'{s.replace(" ","-")}-{n}','session':s,'question_number':n,'question':q,'options':opts,'answer':ans,'type':'PYQ','explanation':explain(ans,kind),'kind':kind,**map_syllabus(q,data['units'])})
 # Preserve any richer learner-facing explanations maintained in the repository.
 explanations_path=Path('practice_explanations.json')
 if explanations_path.exists():
  try:
   enriched=json.loads(explanations_path.read_text(encoding='utf-8'))
   if isinstance(enriched,dict):
    for item in out:
     if enriched.get(item['id']): item['explanation']=enriched[item['id']]
  except Exception as e:
   print(f'Could not merge practice_explanations.json: {e}')
 Path('practice_questions.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 Path('practice-build-report.json').write_text(json.dumps({'questions':len(out),'dropped':dropped,'source':SOURCE_URL,'source_sha256':EXPECTED_SHA256,'mapping_note':'Syllabus mapping is generated by token overlap; mapping_confidence is a navigation aid, not independent verification.'},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'Built {len(out)} PYQs; dropped {len(dropped)}.')
if __name__=='__main__':main()
