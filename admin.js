(function(){
'use strict';
const OWNER='ankitvrsharma',REPO='ankitvrsharma/NET-Psychology',BRANCH='main';
const root=document.querySelector('#adminApp'),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let approvalQueue=[],verificationState={schema_version:2,items:{},updated_at:''},visibilityState={schema_version:1,items:{microtopics:{},questions:{}},updated_at:''},instructions={schema_version:1,enabled:true,default_instruction:'',user_instruction:'',target_microtopics:[],updated_at:'',updated_by:''},data=null,microPool={},questionStore=null,questions=[],filter='ALL';
const ADMIN_HIDDEN_KEY='netPsychAdminHiddenContent:v1';
let hiddenForMe=new Set();
try{hiddenForMe=new Set(JSON.parse(localStorage.getItem(ADMIN_HIDDEN_KEY)||'[]'))}catch(e){}
const adminHiddenKey=(type,id)=>type+'::'+String(id);
const isHiddenForMe=(type,id)=>hiddenForMe.has(adminHiddenKey(type,id));
const saveHiddenForMe=()=>localStorage.setItem(ADMIN_HIDDEN_KEY,JSON.stringify(Array.from(hiddenForMe)));
const loadJSON=async(path)=>{const r=await fetch('./'+path+'?v=20261006-audit-static-pools',{cache:'no-store'});if(!r.ok)throw new Error(path+' '+r.status);return r.json()};
const review=(type,id)=>String(verificationState?.items?.[type]?.[String(id)]||'');
const ownerReview=(type,id)=>review(type,id)==='EXPERT VERIFIED'?'EXPERT VERIFIED':'';
const aiReview=(type,id)=>['AI REVIEWED','EXPERT VERIFIED'].includes(review(type,id));
const hasContent=m=>{const values=[m.expert_explanation,m.detailed_explanation,m.deep_learning,m.deep,m.content_notes,m.study_notes,m.application_question,m.recall_cue,m.memory_hook,m.exam_takeaway];const text=values.map(v=>Array.isArray(v)?v.map(x=>typeof x==='object'&&x?JSON.stringify(x):String(x||'')).join(' '):v&&typeof v==='object'?JSON.stringify(v):String(v||'')).join(' ').replace(/\s+/g,' ').trim();return text.length>=80};
async function loadAuditState(){const r=await fetch('./data/verification-state.json?v=20261006-verification',{cache:'no-store'});if(r.ok)verificationState=await r.json();if(!verificationState.items)verificationState.items={};}
async function loadApprovalQueue(){
  const r=await fetch('./data/content-approval-queue.json?v=20261006-approval-queue',{cache:'no-store'});
  if(r.ok){const q=await r.json();approvalQueue=Array.isArray(q.pending)?q.pending:[];} else approvalQueue=[];
}
async function saveApprovalQueue(next){
  const payload=JSON.stringify({schema_version:2,updated_at:new Date().toISOString(),pending:next},null,2)+'\n';
  await window.NETPSY_AUTH.githubWrite('write_file',{path:'data/content-approval-queue.json',content:payload,message:'Admin: approve queued AI content'});
}
function approvalQueueCard(){
  const pending=approvalQueue.filter(x=>x.status==='PENDING_OWNER_APPROVAL');
  if(!pending.length) return '<section class="card admin-approval-queue"><div class="eyebrow">AI ESCALATION QUEUE</div><h2>No content awaiting owner approval</h2><p>Components that fail their independent audit after two package-aware rewrite attempts are held here instead of entering learner-facing pools.</p></section>';
  return '<section class="card admin-approval-queue"><div class="eyebrow">AI ESCALATION QUEUE</div><h2>'+pending.length+' package'+(pending.length===1?'':'s')+' awaiting approval</h2><p>These components failed their independent audit after two package-aware rewrite attempts. Passing components are published statically; queued components remain withheld until approval.</p>'+pending.map(x=>'<article class="admin-item"><div class="admin-item-copy"><span class="admin-status fail">PENDING APPROVAL</span><h3>'+esc(x.title||x.microtopic_id)+'</h3><p>Micro-topic: <b>'+esc(x.microtopic_id)+'</b> · Component: <b>'+esc(x.component||'package')+'</b> · Rewrite attempts: <b>2</b> · Final score: <b>'+esc(x.final_audit?.score??'—')+'</b></p><p>'+esc((x.final_audit?.issues||[]).join(', ')||'See audit history for details.')+'</p></div><div class="admin-actions"><button class="btn primary approve-queued" data-id="'+esc(x.microtopic_id)+'" data-component="'+esc(x.component||'')+'">APPROVE & PUBLISH</button></div></article>').join('')+'</section>';
}
async function approveQueued(id,component){
  const next=approvalQueue.map(x=>(String(x.microtopic_id)===String(id)&&String(x.component||'')===String(component||''))?{...x,status:'APPROVED',approved_at:new Date().toISOString(),approved_by:OWNER}:x);
  try{
    await saveApprovalQueue(next);
    approvalQueue=next;
    await window.NETPSY_AUTH.githubWrite('dispatch_workflow',{workflow:'publish-approved-content.yml',ref:BRANCH,inputs:{microtopic_id:String(id)}});
    renderQueue();
  }catch(e){alert('Could not approve/publish queued content: '+e.message)}
}
async function loadInstructions(){const r=await fetch('./data/content-enrichment-instructions.json?v=20261006-enrichment',{cache:'no-store'});if(r.ok)instructions=await r.json();if(!Array.isArray(instructions.target_microtopics))instructions.target_microtopics=[]}
function instructionCard(){const ids=(instructions.target_microtopics||[]).join(', ');return `<section class="card admin-instructions"><div class="eyebrow">CONTENT ENRICHMENT</div><h2>Tell Gemini what to enrich</h2><p>These instructions guide the hidden source-to-content pipeline. Saving them does <b>not</b> edit learner content directly; the pipeline uses the instruction with approved source evidence, audits each package, publishes passes, and queues final failures for owner approval.</p><div class="admin-learning-contract"><b>Locked learning package:</b> Micro-topic → Deep Dive → Recall → Revision → Practice. The micro-topic remains the canonical knowledge source; Deep Dive, Recall, Revision and Practice form one connected learning package.</div><label class="admin-field"><span>Your enrichment instruction</span><textarea id="enrichmentInstruction" rows="8" placeholder="Example: Strengthen the distinction between classical and operant conditioning using the uploaded sources. Include named researchers only when the sources support them.">${esc(instructions.user_instruction||'')}</textarea></label><label class="admin-field"><span>Optional micro-topic IDs</span><input id="enrichmentTargets" type="text" value="${esc(ids)}" placeholder="Example: 5-3-2, 5-3-3"></label><div class="admin-instruction-meta">Last saved: ${esc(instructions.updated_at||'Not yet saved')} · ${instructions.updated_by?esc(instructions.updated_by):'Owner instruction'}</div><div class="admin-actions"><button class="btn primary" id="saveEnrichment">SAVE INSTRUCTION</button></div><p class="admin-help">Saving triggers the source-to-content workflow. Gemini will use the saved instruction with approved sources. Audit-passed packages publish directly; packages that still fail after two rewrite attempts enter the owner approval queue.</p><div id="enrichmentStatus" class="admin-status-note" aria-live="polite"></div></section>'`}
async function saveInstructions(){const userInstruction=document.querySelector('#enrichmentInstruction')?.value.trim()||'';const targets=(document.querySelector('#enrichmentTargets')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);const next={...instructions,user_instruction:userInstruction,target_microtopics:targets,updated_at:new Date().toISOString(),updated_by:OWNER};try{await window.NETPSY_AUTH.githubWrite('write_file',{path:'data/content-enrichment-instructions.json',content:JSON.stringify(next,null,2)+'\n',message:'Admin: update content enrichment instruction'});instructions=next;renderQueue();const note=document.querySelector('#enrichmentStatus');if(note)note.textContent='Saved. The source-to-content workflow will now use this instruction and create a review PR when source-backed content changes are generated.'}catch(e){const note=document.querySelector('#enrichmentStatus');if(note)note.textContent='Could not save: '+e.message}}
function buildAdminData(syllabus,microPool){return {...syllabus,units:(syllabus.units||[]).map(u=>({...u,topics:(u.topics||[]).map(t=>({...t,microtopics:(t.microtopics||[]).map(ref=>microPool[String(u.id)+'-'+String(t.id)+'-'+String(ref.id)]||ref)}))}))};}
function titleFor(type,id){if(type==='microtopics'){const [u,t,m]=String(id).split('-').map(Number),unit=data?.units?.find(x=>x.id===u),topic=unit?.topics?.find(x=>x.id===t),micro=topic?.microtopics?.find(x=>x.id===m);return micro?unit.title+' · '+topic.title+' · '+micro.title:id}const q=questions.find(x=>String(x.id)===String(id));return q?.question||id}
function hrefFor(type,id){if(type==='microtopics'){const [u,t,m]=String(id).split('-');return 'microtopic.html?unit='+encodeURIComponent(u)+'&topic='+encodeURIComponent(t)+'&micro='+encodeURIComponent(m)}return 'practice.html'}
function questionInStore(id){if(Array.isArray(questionStore))return questionStore.find(q=>String(q?.id)===String(id))||null;for(const value of Object.values(questionStore||{})){if(Array.isArray(value)){const q=value.find(x=>String(x?.id)===String(id));if(q)return q;}}return null}
function microInStore(id){return microPool?.[String(id)]||null}
function editorField(label,key,value,rows=6){return '<label class="admin-editor-field"><span>'+esc(label)+'</span><textarea data-edit-field="'+esc(key)+'" rows="'+rows+'">'+esc(value||'')+'</textarea></label>'}
function editorFor(type,id){
  if(type==='microtopics'){
    const item=microInStore(id);if(!item)return '<div class="admin-editor-error">Content item could not be loaded.</div>';
    const coreKey=Object.prototype.hasOwnProperty.call(item,'expert_explanation')?'expert_explanation':'content_notes';
    const detailKey=Object.prototype.hasOwnProperty.call(item,'detailed_explanation')?'detailed_explanation':Object.prototype.hasOwnProperty.call(item,'deep_learning')?'deep_learning':Object.prototype.hasOwnProperty.call(item,'deep')?'deep':'';
    return '<div class="admin-editor" hidden data-editor-type="'+type+'" data-editor-id="'+esc(id)+'"><div class="admin-editor-head"><div><span class="eyebrow">EDIT LEARNER CONTENT</span><strong>Micro-topic explanation</strong><p>The title and syllabus structure stay locked. Edit the learner-facing explanation.</p></div><button class="btn admin-edit-close" type="button">CANCEL</button></div>'+editorField('Core explanation · shown to learners',coreKey,item[coreKey],8)+(detailKey?editorField('Detailed explanation · Deep Dive fallback',detailKey,item[detailKey],8):'')+'<div class="admin-editor-actions"><button class="btn primary admin-save-content" type="button">SAVE CONTENT</button></div></div>';
  }
  const q=questionInStore(id);if(!q)return '<div class="admin-editor-error">Question could not be loaded.</div>';
  const opts=Array.isArray(q.options)?q.options:(Array.isArray(q.o)?q.o:[]);
  return '<div class="admin-editor" hidden data-editor-type="'+type+'" data-editor-id="'+esc(id)+'"><div class="admin-editor-head"><div><span class="eyebrow">EDIT LEARNER CONTENT</span><strong>Question</strong><p>Edit the fields used by the learner question renderer.</p></div><button class="btn admin-edit-close" type="button">CANCEL</button></div>'+editorField('Question','question',q.question||q.q,7)+'<div class="admin-option-grid">'+opts.map((v,i)=>editorField('Option '+String.fromCharCode(65+i),'option-'+i,v,3)).join('')+'</div><label class="admin-editor-field"><span>Correct answer</span><select data-edit-field="answer">'+opts.map((v,i)=>'<option value="'+i+'" '+(Number(q.answer)===i?'selected':'')+'>'+String.fromCharCode(65+i)+'</option>').join('')+'</select></label>'+editorField('Explanation shown after answering','explanation',q.explanation,7)+'<div class="admin-editor-actions"><button class="btn primary admin-save-content" type="button">SAVE CONTENT</button></div></div>';
}
async function saveContent(type,id,editor){
  if(type==='microtopics'){
    const item=microInStore(id);if(!item)throw new Error('Micro-topic not found.');
    editor.querySelectorAll('[data-edit-field]').forEach(field=>{item[field.dataset.editField]=field.value.trim()});
    if(!String(item.expert_explanation||item.content_notes||'').trim())throw new Error('Core explanation cannot be empty.');
    await window.NETPSY_AUTH.githubWrite('write_file',{path:'content/microtopics/micro_topics.json',content:JSON.stringify(microPool,null,2)+'\n',message:'Admin: edit micro-topic '+id});
  }else{
    const q=questionInStore(id);if(!q)throw new Error('Question not found.');
    const stem=editor.querySelector('[data-edit-field="question"]');if(stem){if(Object.prototype.hasOwnProperty.call(q,'question'))q.question=stem.value.trim();else q.q=stem.value.trim();}
    editor.querySelectorAll('[data-edit-field^="option-"]').forEach(field=>{const i=Number(field.dataset.editField.split('-')[1]);if(Array.isArray(q.options))q.options[i]=field.value.trim();else if(Array.isArray(q.o))q.o[i]=field.value.trim()});
    q.answer=Number(editor.querySelector('[data-edit-field="answer"]').value);
    q.explanation=editor.querySelector('[data-edit-field="explanation"]').value.trim();
    if(!String(q.question||q.q||'').trim())throw new Error('Question cannot be empty.');
    if(!String(q.explanation||'').trim())throw new Error('Explanation cannot be empty.');
    await window.NETPSY_AUTH.githubWrite('write_file',{path:'content/questions/questions.json',content:JSON.stringify(questionStore,null,2)+'\n',message:'Admin: edit question '+id});
  }
  await reloadAdminContent();
}
async function toggleVisibility(type,id){
  const next=JSON.parse(JSON.stringify(visibilityState||{schema_version:1,items:{microtopics:{},questions:{}}}));
  next.items=next.items||{};next.items[type]=next.items[type]||{};
  if(isHiddenForMe(type,id))delete next.items[type][String(id)];else next.items[type][String(id)]='HIDDEN';
  next.updated_at=new Date().toISOString();
  await window.NETPSY_AUTH.githubWrite('write_file',{path:'data/content-visibility.json',content:JSON.stringify(next,null,2)+'\n',message:'Admin: change visibility '+type+' '+id});
  visibilityState=next;renderQueue();
}
function titleFor(type,id){if(type==='microtopics'){const [u,t,m]=String(id).split('-').map(Number),unit=data?.units?.find(x=>x.id===u),topic=unit?.topics?.find(x=>x.id===t),micro=topic?.microtopics?.find(x=>x.id===m);return micro?unit.title+' · '+topic.title+' · '+micro.title:id}const q=questions.find(x=>String(x.id)===String(id));return q?.question||id}
function learnerHref(type,id){const parts=String(id).split('-');return type==='microtopics'?'microtopic.html?unit='+encodeURIComponent(parts[0])+'&topic='+encodeURIComponent(parts[1])+'&micro='+encodeURIComponent(parts[2])+'&preview=1':'practice-session.html?previewQuestion='+encodeURIComponent(id)}
function makeItem(type,id,audit){
  const owner=ownerReview(type,id),hidden=isHiddenForMe(type,id);
  const actions=owner?'<button class="btn admin-clear" data-type="'+type+'" data-id="'+esc(id)+'">CLEAR OWNER REVIEW</button>':'<button class="btn primary admin-review" data-review="SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK SATISFACTORY</button><button class="btn admin-review" data-review="NOT_SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK NOT SATISFACTORY</button>';
  const visibilityButton=hidden?'<button class="btn admin-show" type="button" data-type="'+type+'" data-id="'+esc(id)+'">SHOW AGAIN</button>':'<button class="btn admin-hide" type="button" data-type="'+type+'" data-id="'+esc(id)+'">HIDE FOR NOW</button>';
  return '<article class="admin-item admin-item-learner"><div class="admin-learner-preview"><div class="admin-preview-head"><div><span class="eyebrow">LEARNER VIEW · '+(type==='microtopics'?'MICRO-TOPIC':'QUESTION')+'</span><strong>'+(hidden?'HIDDEN':'PUBLISHED')+'</strong></div></div><iframe class="admin-preview-frame" data-src="'+learnerHref(type,id)+'" loading="lazy" title="Exact learner-facing render"></iframe></div><div class="admin-review-bar"><div class="admin-item-copy">'+(owner?'<span class="review-status">EXPERT VERIFIED</span>':'')+'<span class="admin-status '+(hidden?'hidden':'published')+'">'+(hidden?'HIDDEN':'PUBLISHED')+'</span><span class="admin-status '+String(audit.status).toLowerCase()+'">'+esc(audit.status)+'</span><h3>'+esc(titleFor(type,id))+'</h3><p>Audit score: <b>'+audit.score+'</b> · '+esc((audit.issues||[]).join(', ')||'No audit issues')+'</p></div><div class="admin-actions"><button class="btn admin-edit" type="button">EDIT CONTENT</button>'+visibilityButton+actions+'</div></div>'+editorFor(type,id)+'</article>';
}
function rowsFor(selectedFilter='ALL'){
  const audit=window.NETPsychologyContentAudit.create({data:data,questions:questions}).expertAudit;
  const micros=(data?.units||[]).flatMap(u=>(u.topics||[]).flatMap(t=>(t.microtopics||[]).map(m=>({type:'microtopics',id:String(u.id)+'-'+String(t.id)+'-'+String(m.id)}))));
  const qs=questions.map(q=>({type:'questions',id:String(q.id)}));
  const rows=[...micros,...qs].map(x=>{const a=audit(x.type,x.id),r=review(x.type,x.id);return{x,a,reviewStatus:r}});
  return rows.filter(r=>{
    const h=isHiddenForMe(r.x.type,r.x.id),a=r.a,rv=r.reviewStatus;
    if(selectedFilter==='HIDDEN FOR ME')return h;
    if(h)return false;
    if(selectedFilter==='MICRO-TOPICS')return r.x.type==='microtopics';
    if(selectedFilter==='QUESTIONS')return r.x.type==='questions';
    if(selectedFilter==='NEED REVIEW')return a.status!=='PASS'&&!rv;
    if(selectedFilter==='AI REVIEWED')return aiReview(r.x.type,String(r.x.id));
    if(selectedFilter==='EXPERT VERIFIED')return rv==='EXPERT VERIFIED';
    if(selectedFilter==='AUDIT PASS')return a.status==='PASS';
    if(selectedFilter==='AUDIT FAIL')return a.status==='FAIL';
    return true;
  }).sort((a,b)=>a.a.score-b.a.score);
}
function aiPassedRows(){
  const componentLabels={microtopics:'Micro-topic',deepDive:'Deep Dive',activeRecall:'Recall',revision:'Revision',practice:'Practice MCQs'};
  const out=[];
  for(const [component,items] of Object.entries(verificationState?.items||{})){
    if(!items||typeof items!=='object')continue;
    for(const [id,status] of Object.entries(items)){
      if(!['AI REVIEWED','EXPERT VERIFIED'].includes(status)||!componentLabels[component])continue;
      const parts=String(id).split('-').map(Number),u=data?.units?.find(x=>x.id===parts[0]),t=u?.topics?.find(x=>x.id===parts[1]),m=t?.microtopics?.find(x=>x.id===parts[2]);
      if(!u||!t||!m)continue;
      out.push({component,id,title:u.title+' · '+t.title+' · '+m.title,componentLabel:componentLabels[component],href:component==='deepDive'?'deep-dive.html':component==='activeRecall'?'active-recall.html':component==='revision'?'revision.html':component==='practice'?'practice.html':'microtopic.html'});
    }
  }
  return out.sort((a,b)=>a.title.localeCompare(b.title)||a.componentLabel.localeCompare(b.componentLabel));
}
function aiPassedCard(){
  const passed=aiPassedRows(),counts={microtopics:0,deepDive:0,activeRecall:0,revision:0,practice:0};
  passed.forEach(r=>{if(counts[r.component]!=null)counts[r.component]++});
  return '<section class="card admin-ai-passed"><div class="eyebrow">CONTENT · REVIEWED</div><h2>'+passed.length+' components passed the source-grounded AI audit</h2><p>These components passed the independent AI gate and were recorded as <b>REVIEWED</b>. Review status is separate from your expert verification.</p><div class="admin-toolbar ai-passed-summary"><div><strong>'+counts.microtopics+'</strong><span>micro-topics</span></div><div><strong>'+counts.deepDive+'</strong><span>deep dives</span></div><div><strong>'+counts.activeRecall+'</strong><span>recall</span></div><div><strong>'+counts.revision+'</strong><span>revision</span></div><div><strong>'+counts.practice+'</strong><span>practice MCQs</span></div></div>'+(passed.length?'<div class="admin-ai-passed-list">'+passed.slice(0,80).map(r=>'<article class="admin-item"><div class="admin-item-copy"><span class="admin-status pass">REVIEWED · '+esc(r.componentLabel)+'</span><h3>'+esc(r.title)+'</h3><p>Reviewed component: <b>'+esc(r.componentLabel)+'</b></p></div><div class="admin-actions"><a class="btn" href="'+r.href+'">OPEN</a></div></article>').join('')+'</div>':'<p>No reviewed components are currently recorded in verification-state.json.</p>')+'</section>'}
function mountLearnerPreviews(){
  const frames=Array.from(root.querySelectorAll('.admin-preview-frame[data-src]'));
  const load=frame=>{if(frame.dataset.loaded==='1')return;frame.dataset.loaded='1';frame.src=frame.dataset.src+'&previewRefresh='+Date.now()};
  if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){load(entry.target);io.unobserve(entry.target)}}),{rootMargin:'900px 0px'});frames.forEach(frame=>io.observe(frame))}else frames.slice(0,3).forEach(load);
}
function renderQueue(){
  const allRows=rowsFor('ALL'),visible=rowsFor(filter),need=allRows.filter(r=>r.a.status!=='PASS'&&!r.reviewStatus).length,sat=allRows.filter(r=>r.reviewStatus==='EXPERT VERIFIED').length,hiddenCount=hiddenForMe.size,aiPassed=aiPassedRows();
  root.querySelector('#adminQueue').innerHTML='<section class="admin-toolbar card"><div><strong>'+allRows.length+'</strong><span>content items</span></div><div><strong>'+need+'</strong><span>need owner review</span></div><div><strong>'+aiPassed.length+'</strong><span>AI passed</span></div><div><strong>'+sat+'</strong><span>expert verified</span></div><div><strong>'+hiddenCount+'</strong><span>hidden</span></div></section><div class="admin-filters">'+['ALL','NEED REVIEW','MICRO-TOPICS','QUESTIONS','AI REVIEWED','EXPERT VERIFIED','AUDIT PASS','AUDIT FAIL','HIDDEN FOR ME'].map(x=>'<button class="admin-filter '+(filter===x?'active':'')+'" data-filter="'+x+'">'+x.replace(/_/g,' ')+'</button>').join('')+'</div>'+(visible.length?visible.map(r=>makeItem(r.x.type,r.x.id,r.a)).join(''):'<section class="card admin-empty"><h2>No items in this view</h2><p>Change the filter to see another review state.</p></section>');
  root.querySelectorAll('.admin-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderQueue()});
  root.querySelectorAll('.admin-review').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,b.dataset.review));
  root.querySelectorAll('.admin-clear').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,''));
  root.querySelectorAll('.admin-hide,.admin-show').forEach(b=>b.onclick=()=>{const key=adminHiddenKey(b.dataset.type,b.dataset.id);if(hiddenForMe.has(key))hiddenForMe.delete(key);else hiddenForMe.add(key);saveHiddenForMe();renderQueue()});
  root.querySelectorAll('.admin-edit').forEach(b=>b.onclick=()=>{const editor=b.closest('.admin-item')?.querySelector('.admin-editor');if(editor){editor.hidden=!editor.hidden;if(!editor.hidden)editor.scrollIntoView({behavior:'smooth',block:'start'})}});
  root.querySelectorAll('.admin-edit-close').forEach(b=>b.onclick=()=>{const editor=b.closest('.admin-editor');if(editor)editor.hidden=true});
  root.querySelectorAll('.admin-save-content').forEach(b=>b.onclick=async()=>{const editor=b.closest('.admin-editor');if(!editor)return;b.disabled=true;b.textContent='SAVING…';try{await saveContent(editor.dataset.editorType,editor.dataset.editorId,editor)}catch(e){alert('Could not save content: '+e.message);b.disabled=false;b.textContent='SAVE CONTENT'}});
  root.querySelectorAll('.approve-queued').forEach(b=>b.onclick=()=>approveQueued(b.dataset.id,b.dataset.component));
  mountLearnerPreviews();
}
async function changeReview(type,id,value){
  verificationState.items[type]=verificationState.items[type]||{};
  if(value==='SATISFACTORY')verificationState.items[type][String(id)]='EXPERT VERIFIED';
  else if(verificationState.items[type][String(id)]==='EXPERT VERIFIED')delete verificationState.items[type][String(id)];
  verificationState.updated_at=new Date().toISOString();
  try{
    await window.NETPSY_AUTH.githubWrite('write_file',{path:'data/verification-state.json',content:JSON.stringify(verificationState,null,2)+'\n',message:'Admin: '+(value?'set '+value.toLowerCase().replace(/_/g,' '):'clear verification')+' '+type+' '+id});
    await loadAuditState();renderQueue();
  }catch(e){alert('Could not save the verification status: '+e.message)}
}
async function checkSite(){const checks=await Promise.all(['./index.html','./app/runtime.js','./style.css','./data/syllabus-index.json','./content/microtopics/micro_topics.json','./content/questions/questions.json','./data/content-visibility.json'].map(async path=>{try{const r=await fetch(path+'?health='+Date.now(),{cache:'no-store'});return r.ok}catch{return false}}));return checks.every(Boolean)}
async function reloadAdminContent(){const [syllabus,micro,qpool]=await Promise.all([loadJSON('data/syllabus-index.json'),loadJSON('content/microtopics/micro_topics.json'),loadJSON('content/questions/questions.json')]);microPool=micro||{};questionStore=qpool;data=buildAdminData(syllabus,microPool);questions=Array.isArray(qpool)?qpool:[...(Array.isArray(qpool?.pyq)?qpool.pyq:[]),...(Array.isArray(qpool?.practice)?qpool.practice:[])];await loadVisibility();renderQueue();}

let bridgeHealth={ok:false,error:'Not checked'};
function bridgeMessage(error){
  const raw=String(error?.message||error||'Unknown bridge error');
  if(/Failed to fetch|NetworkError|Load failed/i.test(raw)) return 'The browser could not reach the secure GitHub bridge. This is usually a deployment, CORS, network, or browser security-connection problem.';
  if(/GITHUB_ADMIN_TOKEN/i.test(raw)) return 'The Supabase Edge Function is reachable, but its GitHub credential is not configured.';
  if(/Admin access required|403/i.test(raw)) return 'The secure bridge rejected this account. Confirm that the signed-in Supabase profile has the admin role.';
  if(/404/i.test(raw)) return 'The secure GitHub bridge endpoint was not found. Deploy the admin-github-write Edge Function to the configured Supabase project.';
  return raw;
}
function bridgeStatusCard(){
  if(bridgeHealth.ok) return '<section class="card admin-health"><div><div class="eyebrow">SECURE GITHUB BRIDGE</div><strong>CONNECTED</strong><p>Admin writes can reach GitHub through the protected Supabase Edge Function.</p></div></section>';
  return '<section class="card admin-health admin-health-warning"><div><div class="eyebrow">SECURE GITHUB BRIDGE</div><strong>NOT CONNECTED</strong><p>'+esc(bridgeMessage(bridgeHealth.error))+'</p><p class="admin-help">Learner-facing content is still available. Review changes cannot be written until the bridge is available.</p><button class="btn primary" id="retryBridge">RETRY CONNECTION</button></div></section>';
}
async function checkBridge(){
  try{
    await window.NETPSY_AUTH.githubWrite('health',{repository:REPO});
    bridgeHealth={ok:true,error:''};
  }catch(e){bridgeHealth={ok:false,error:e}}
  return bridgeHealth.ok;
}
async function dashboard(){
  root.innerHTML='<section class="admin-hero"><div class="eyebrow">CONTENT MANAGEMENT</div><h1>Content Audit</h1><p>Each item opens in its real learner-facing view. Edit the canonical content, hide it temporarily, or record your expert review without leaving this page.</p></section><div id="adminQueue" class="admin-queue"><div class="card">Loading content…</div></div>';
  try{
    const [syllabus,micro,qpool]=await Promise.all([loadJSON('data/syllabus-index.json'),loadJSON('content/microtopics/micro_topics.json'),loadJSON('content/questions/questions.json'),loadAuditState(),loadApprovalQueue(),loadVisibility()]);
    microPool=micro||{};questionStore=qpool;data=buildAdminData(syllabus,microPool);
    questions=Array.isArray(qpool)?qpool:[...(Array.isArray(qpool?.pyq)?qpool.pyq:[]),...(Array.isArray(qpool?.practice)?qpool.practice:[])];
    const running=await checkSite();
    root.querySelector('#adminQueue').insertAdjacentHTML('afterbegin','<section class="card admin-health"><div><div class="eyebrow">STATIC CONTENT SOURCE</div><strong>CANONICAL STATIC POOLS</strong><p>Owner audit reads the published static content pools directly. Supabase is not an audit source.</p></div></section>'+bridgeStatusCard()+'<section class="card admin-health"><div><div class="eyebrow">WEBSITE STATUS</div><strong>'+ (running?'RUNNING':'CHECK FAILED') +'</strong><p>Core pages, runtime, stylesheet and published content pools '+(running?'are responding.':'did not all respond.')+'</p></div></section>');
    const retry=root.querySelector('#retryBridge');
    if(retry)retry.onclick=async()=>{retry.disabled=true;retry.textContent='CHECKING…';await checkBridge();await dashboard()};
    renderQueue();
  }catch(e){
    root.innerHTML='<section class="card"><h2>Could not load audit data</h2><p>'+esc(e.message)+'</p><button class="btn" id="adminLogout">SIGN OUT</button></section>';
    document.querySelector('#adminLogout').onclick=logout;
  }
}
async function start(){
  try{
    if(window.NETPSY_AUTH?.ready) await window.NETPSY_AUTH.ready;
    if(!window.NETPSY_AUTH?.getUser?.()){location.href='login.html';return}
    if(!window.NETPSY_AUTH.isAdmin()){location.href='progress.html';return}
  }catch(e){
    root.innerHTML='<section class="card admin-auth"><div class="eyebrow">OWNER AUDIT</div><h1>Content Audit</h1><p>We could not initialise your admin session.</p><p class="admin-help">'+esc(e.message)+'</p></section>';
    return;
  }
  // Never block the audit UI on the optional GitHub bridge health check.
  await dashboard();
  checkBridge().then(()=>{
    const queue=root.querySelector('#adminQueue');
    if(queue){const current=root.querySelector('.admin-health');if(current)current.outerHTML=bridgeStatusCard();}
  });
}
start();
})();