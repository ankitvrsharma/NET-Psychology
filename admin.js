(function(){
'use strict';
const OWNER='ankitvrsharma',REPO='ankitvrsharma/NET-Psychology',BRANCH='main';
const root=document.querySelector('#adminApp'),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let verificationState={schema_version:2,items:{},updated_at:''},instructions={schema_version:1,enabled:true,default_instruction:'',user_instruction:'',target_microtopics:[],updated_at:'',updated_by:''},data=null,microPool={},deepPool={},recallPool={},revisionPool={},practicePool={},questionStore=null,questions=[],filter='ALL';
let filterUnit='ALL',filterTopic='ALL';
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
function packageHealth(id){
  const item=microInStore(id)||{},deep=deepPool?.[String(id)]||{},recall=recallPool?.[String(id)]||{},revision=revisionPool?.[String(id)]||{},practice=practicePool?.[String(id)]||{};
  const practiceItems=Array.isArray(practice.questions)?practice.questions:[];
  const checks={
    microtopic:String(item.expert_explanation||item.content_notes||'').trim().length>=80,
    deepDive:String(deep.detailed_explanation||deep.deep_learning||deep.deep||'').trim().length>=80,
    activeRecall:Array.isArray(recall.prompts)&&recall.prompts.length>0,
    revision:['recall_before_review','self_check','weak_point_prompt','rating_instruction'].every(k=>String(revision[k]||'').trim()),
    practice:Array.isArray(practiceItems)&&practiceItems.length>0&&practiceItems.every(q=>q&&String(q.question||'').trim()&&Array.isArray(q.options)&&q.options.length>=2&&String(q.correct_answer||'').trim()&&String(q.explanation||'').trim())
  };
  const labels={microtopic:'Micro-topic',deepDive:'Deep Dive',activeRecall:'Active Recall',revision:'Revision',practice:'Practice'};
  const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>labels[key]);
  const score=Math.round(Object.values(checks).filter(Boolean).length/5*100);
  return {status:missing.length?'FAIL':'PASS',score,issues:missing.length?['Missing or incomplete: '+missing.join(', ')]:[],checks};
}
function questionHealth(q){
  const ok=Boolean(q&&String(q.question||q.q||'').trim()&&Array.isArray(q.options||q.o)&&(q.options||q.o).length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&String(q.explanation||'').trim());
  return {status:ok?'PASS':'FAIL',score:ok?100:0,issues:ok?[]:['Question fields are incomplete or invalid.']};
}

async function loadAuditState(){const r=await fetch('./data/verification-state.json?v=20261006-verification',{cache:'no-store'});if(r.ok)verificationState=await r.json();if(!verificationState.items)verificationState.items={};}
function packageText(value){if(Array.isArray(value))return value.map(packageText).join('\n');if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>k+': '+packageText(v)).join('\n');return String(value??'');}
async function loadInstructions(){const r=await fetch('./data/content-enrichment-instructions.json?v=20261006-enrichment',{cache:'no-store'});if(r.ok)instructions=await r.json();if(!Array.isArray(instructions.target_microtopics))instructions.target_microtopics=[]}
function instructionCard(){return `<section class="card admin-instructions"><div class="eyebrow">CONTENT GENERATION</div><h2>Prepare a source-grounded ChatGPT task</h2><p>Choose the content operation. Every packet applies the full standing instructions and uses only source files already present in this repository. ChatGPT runs manually in any conversation; no model API key is needed.</p><div class="admin-learning-contract"><b>Learning contract:</b> Micro-topic → Deep Dive → Active Recall → Revision → Practice. Authentic PYQs remain distinct and are never rewritten as practice questions.</div><label class="admin-field"><span>What should be improved in this run?</span><select id="generationMode"><option value="package_rewrite">Rewrite a connected micro-topic learning package</option><option value="unit_rewrite">First-time enrichment / rewrite a whole unit</option><option value="quick_cards_rewrite">Rewrite Quick Learn cards</option><option value="mcq_improvement">Improve MCQ formatting and explanations</option><option value="pyq_improvement">Improve PYQ formatting and explanations</option></select></label><label class="admin-field" id="unitTargetField"><span>Unit for whole-unit enrichment</span><select id="targetUnit"><option value="">Choose a unit</option></select></label><label class="admin-field"><span id="targetIdsLabel">Optional micro-topic IDs</span><input id="enrichmentTargets" type="text" value="" placeholder="Example: 5-3-2, 5-3-3"></label><label class="admin-field"><span>Task-specific guidance (optional but recommended)</span><textarea id="enrichmentInstruction" rows="5" placeholder="Example: Improve conceptual distinctions and explanation quality using only the repository sources. Preserve expert-verified content and authentic PYQ wording."></textarea></label><div class="admin-actions"><button class="btn primary" id="saveEnrichment">PREPARE CHATGPT PACKET</button></div><p class="admin-help">Whole-unit mode includes every canonical micro-topic in the selected unit. Quick Learn mode rewrites card content while preserving IDs and syllabus mapping. MCQ mode may improve stem/options formatting and explanation; PYQ mode preserves the authentic question, options, answer and year and improves only its explanation/presentation. Returned JSON is validated and proposed for review; nothing publishes directly to main.</p><div id="enrichmentStatus" class="admin-status-note" aria-live="polite"></div></section>`;}
function populateGenerationTargets(){const select=document.querySelector('#targetUnit');if(!select||!data?.units)return;const previous=select.value;select.innerHTML='<option value="">Choose a unit</option>'+(data.units||[]).map(u=>'<option value="'+esc(u.id)+'">'+esc('Unit '+u.id+' · '+u.title)+'</option>').join('');if(previous)select.value=previous;const mode=document.querySelector('#generationMode')?.value||'package_rewrite';const field=document.querySelector('#unitTargetField');if(field)field.hidden=false;const unitLabel=field?.querySelector('span');if(unitLabel)unitLabel.textContent=mode==='unit_rewrite'?'Unit for whole-unit enrichment':'Optional unit scope';const label=document.querySelector('#targetIdsLabel');const input=document.querySelector('#enrichmentTargets');if(label&&input){const cfg={package_rewrite:['Optional micro-topic IDs','Example: 5-3-2, 5-3-3'],unit_rewrite:['Micro-topic IDs (optional; leave blank for entire unit)','Blank means all micro-topics in the selected unit'],quick_cards_rewrite:['Optional Quick Learn card IDs','Blank means all eligible cards in the selected unit or repository'],mcq_improvement:['Optional MCQ IDs','Blank means eligible MCQs from repository question pool'],pyq_improvement:['Optional PYQ IDs','Blank means eligible authentic PYQs from repository question pool']};const v=cfg[mode]||cfg.package_rewrite;label.textContent=v[0];input.placeholder=v[1];}}
async function saveInstructions(){
  const userInstruction=document.querySelector('#enrichmentInstruction')?.value.trim()||'';
  const mode=document.querySelector('#generationMode')?.value||'package_rewrite';
  const targetUnitId=document.querySelector('#targetUnit')?.value||'';
  const targets=(document.querySelector('#enrichmentTargets')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const note=document.querySelector('#enrichmentStatus');
  if(mode==='unit_rewrite'&&!targetUnitId){if(note)note.textContent='Choose a unit for whole-unit enrichment.';return}
  if(mode==='package_rewrite'&&!targets.length){if(note)note.textContent='Choose one or more micro-topic IDs, or use whole-unit enrichment.';return}
  if(['quick_cards_rewrite','mcq_improvement','pyq_improvement'].includes(mode)&&!targets.length&&!targetUnitId){if(note)note.textContent='Choose a unit scope or enter specific record IDs.';return}
  if(!window.NETPSY_AUTH?.githubWrite){
    if(note)note.textContent='The secure generation bridge is unavailable. Please sign in again.';
    return
  }
  const button=document.querySelector('#saveEnrichment');
  if(button){button.disabled=true;button.textContent='STARTING…'}
  if(note)note.textContent='Submitting the source-grounded ChatGPT packet request…';
  const request={
    schema_version:2,
    request_id:'admin-'+Date.now(),
    operation:mode,
    target_unit_id:targetUnitId,
    instruction:userInstruction,
    target_microtopics:mode==='package_rewrite'||mode==='unit_rewrite'?targets:[],
    target_record_ids:mode==='quick_cards_rewrite'||mode==='mcq_improvement'||mode==='pyq_improvement'?targets:[],
    requested_at:new Date().toISOString(),
    requested_by:OWNER
  };
  try{
    await window.NETPSY_AUTH.githubWrite('write_file',{
      path:'data/content-generation-request.json',
      content:JSON.stringify(request,null,2)+'\n',
      message:'Admin: request source-grounded content generation'
    });
    if(note)note.textContent='Request submitted. GitHub Actions will prepare a source-grounded packet using the standing instructions and approved source library. Download the packet artifact, use it in any ChatGPT conversation, then add the returned JSON as content-staging/chatgpt-response.json on a new branch. The workflow validates it and opens a review PR; it does not publish directly to main.';
    renderQueue()
  }catch(e){
    if(note)note.textContent='Could not submit generation request: '+e.message
  }finally{
    const current=document.querySelector('#saveEnrichment');
    if(current){current.disabled=false;current.textContent='PREPARE CHATGPT PACKET'}
  }
}
function buildAdminData(syllabus,microPool){return {...syllabus,units:(syllabus.units||[]).map(u=>({...u,topics:(u.topics||[]).map(t=>({...t,microtopics:(t.microtopics||[]).map(ref=>{const content=microPool[String(u.id)+'-'+String(t.id)+'-'+String(ref.id)];return content?{...content,id:ref.id}:ref;})}))}))};}
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
function toggleVisibility(type,id){
  const key=adminHiddenKey(type,id);
  if(hiddenForMe.has(key))hiddenForMe.delete(key);else hiddenForMe.add(key);
  saveHiddenForMe();
  renderQueue();
}
function titleFor(type,id){if(type==='microtopics'){const [u,t,m]=String(id).split('-').map(Number),unit=data?.units?.find(x=>x.id===u),topic=unit?.topics?.find(x=>x.id===t),micro=topic?.microtopics?.find(x=>x.id===m);return micro?unit.title+' · '+topic.title+' · '+micro.title:id}const q=questions.find(x=>String(x.id)===String(id));return q?.question||id}
function learnerHref(type,id){const parts=String(id).split('-');return type==='microtopics'?'microtopic.html?unit='+encodeURIComponent(parts[0])+'&topic='+encodeURIComponent(parts[1])+'&micro='+encodeURIComponent(parts[2])+'&preview=1':'practice-session.html?previewQuestion='+encodeURIComponent(id)}
function componentReview(component,id){
  const key=component==='microtopics'?'microtopics':component==='deepDive'?'deepDive':component==='activeRecall'?'activeRecall':component==='revision'?'revision':'practice';
  return String(verificationState?.items?.[key]?.[String(id)]||'');
}
function componentReviewButton(component,id){
  const status=componentReview(component,id);
  if(status==='EXPERT VERIFIED') return '<span class="admin-package-lock">EXPERT VERIFIED</span><button class="btn admin-component-review clear" type="button" data-component-review="'+component+'" data-id="'+esc(id)+'" data-review-value="">CLEAR VERIFICATION</button>';
  const label=status==='AI REVIEWED'?'AI REVIEWED':'NOT VERIFIED';
  return '<span class="admin-package-status">'+label+'</span><button class="btn admin-component-review" type="button" data-component-review="'+component+'" data-id="'+esc(id)+'" data-review-value="SATISFACTORY">MARK EXPERT VERIFIED</button>';
}
function packageComponent(component,title,body,id){
  const safeBody=packageText(body).trim();
  return '<details class="admin-package-component" open><summary><div><span class="eyebrow">'+esc(title)+'</span><strong>'+esc(componentReview(component,id)||'NOT VERIFIED')+'</strong></div><span class="admin-package-chevron">⌄</span></summary><div class="admin-package-component-body">'+
    (safeBody?'<div class="admin-package-content">'+esc(safeBody)+'</div>':'<div class="admin-package-empty">No published content for this component yet.</div>')+
    '<div class="admin-package-component-actions">'+componentReviewButton(component,id)+'</div></div></details>';
}
function makePackageItem(type,id,audit){
  const item=microInStore(id)||{},deep=deepPool?.[String(id)]||{},recall=recallPool?.[String(id)]||{},revision=revisionPool?.[String(id)]||{},practice=practicePool?.[String(id)]||{};
  const hidden=isHiddenForMe(type,id);
  const locked=Object.entries({microtopics:'Micro-topic',deepDive:'Deep Dive',activeRecall:'Active Recall',revision:'Revision',practice:'Practice'}).filter(([component])=>componentReview(component,id)==='EXPERT VERIFIED').map(([,label])=>label);
  const practiceQuestions=Array.isArray(practice.questions)?practice.questions:[];
  const practiceBody=practiceQuestions.map((q,i)=>'Question '+(i+1)+': '+packageText(q.question)+'\nOptions: '+packageText(q.options)+'\nCorrect answer: '+packageText(q.correct_answer)+'\nExplanation: '+packageText(q.explanation)).join('\n\n');
  const revisionBody='Recall before review: '+packageText(revision.recall_before_review)+'\nSelf-check: '+packageText(revision.self_check)+'\nWeak-point prompt: '+packageText(revision.weak_point_prompt)+'\nRating instruction: '+packageText(revision.rating_instruction);
  const recallBody=Array.isArray(recall.prompts)?recall.prompts.map((p,i)=>(i+1)+'. '+packageText(p.type)+'\nPrompt: '+packageText(p.prompt)+'\nAnswer: '+packageText(p.answer)).join('\n\n'):'';
  const actions='<button class="btn admin-edit" type="button">EDIT MICRO-TOPIC</button>'+
    (hidden?'<button class="btn admin-show" type="button" data-type="'+type+'" data-id="'+esc(id)+'">RESTORE TO MY LIST</button>':'<button class="btn admin-hide" type="button" data-type="'+type+'" data-id="'+esc(id)+'">HIDE FOR NOW</button>');
  return '<article class="admin-item admin-item-package"><div class="admin-package-head"><div><span class="eyebrow">ONE MICRO-TOPIC · COMPLETE LEARNING PACKAGE</span><h3>'+esc(titleFor(type,id))+'</h3><p>Audit all five learning functions together. '+(locked.length?'Locked by you: <b>'+esc(locked.join(', '))+'</b>.':'No component is expert verified yet.')+'</p></div><a class="btn" target="_blank" rel="noopener" href="'+learnerHref(type,id)+'">OPEN LEARNER VIEW</a></div>'+
    '<div class="admin-package-grid">'+
      packageComponent('microtopics','1 · UNDERSTAND · MICRO-TOPIC',item.expert_explanation||item.content_notes||'',id)+
      packageComponent('deepDive','2 · EXPAND · DEEP DIVE',deep.detailed_explanation||deep.deep_learning||deep.deep||'',id)+
      packageComponent('activeRecall','3 · RETRIEVE · ACTIVE RECALL',recallBody,id)+
      packageComponent('revision','4 · REINFORCE · REVISION',revisionBody,id)+
      packageComponent('practice','5 · APPLY · PRACTICE MCQs',practiceBody,id)+
    '</div><div class="admin-review-bar"><div class="admin-item-copy"><span class="admin-status '+(hidden?'hidden':'published')+'">'+(hidden?'REMOVED FROM MY LIST':'VISIBLE TO LEARNERS')+'</span><span class="admin-status '+String(audit.status).toLowerCase()+'">'+esc(audit.status)+'</span><p>Package health: <b>'+audit.score+'%</b> · '+esc((audit.issues||[]).join(', ')||'No audit issues')+'</p></div><div class="admin-actions">'+actions+'</div></div>'+editorFor(type,id)+'</article>';
}
function makeItem(type,id,audit){
  if(type==='microtopics') return makePackageItem(type,id,audit);
  const owner=ownerReview(type,id),hidden=isHiddenForMe(type,id);
  const actions=owner?'<button class="btn admin-clear" data-type="'+type+'" data-id="'+esc(id)+'">CLEAR OWNER REVIEW</button>':'<button class="btn primary admin-review" data-review="SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK SATISFACTORY</button><button class="btn admin-review" data-review="NOT_SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK NOT SATISFACTORY</button>';
  const visibilityButton=hidden?'<button class="btn admin-show" type="button" data-type="'+type+'" data-id="'+esc(id)+'">RESTORE TO MY LIST</button>':'<button class="btn admin-hide" type="button" data-type="'+type+'" data-id="'+esc(id)+'">HIDE FOR NOW</button>';
  return '<article class="admin-item admin-item-learner"><div class="admin-learner-preview"><div class="admin-preview-head"><div><span class="eyebrow">LEARNER VIEW · '+(type==='microtopics'?'MICRO-TOPIC':'QUESTION')+'</span><strong>'+(hidden?'REMOVED FROM MY LIST':'VISIBLE TO LEARNERS')+'</strong></div></div><iframe class="admin-preview-frame" data-src="'+learnerHref(type,id)+'" loading="lazy" title="Exact learner-facing render"></iframe></div><div class="admin-review-bar"><div class="admin-item-copy">'+(owner?'<span class="review-status">EXPERT VERIFIED</span>':'')+'<span class="admin-status '+(hidden?'hidden':'published')+'">'+(hidden?'REMOVED FROM MY LIST':'VISIBLE TO LEARNERS')+'</span><span class="admin-status '+String(audit.status).toLowerCase()+'">'+esc(audit.status)+'</span><h3>'+esc(titleFor(type,id))+'</h3><p>Content health: <b>'+audit.score+'%</b> · '+esc((audit.issues||[]).join(', ')||'No audit issues')+'</p></div><div class="admin-actions"><button class="btn admin-edit" type="button">EDIT CONTENT</button>'+visibilityButton+actions+'</div></div>'+editorFor(type,id)+'</article>';
}
function rowMeta(x){
  if(x.type!=='microtopics')return {unitId:null,topicId:null};
  const parts=String(x.id).split('-').map(Number);
  return {unitId:parts[0],topicId:parts[1]};
}
function rowsFor(selectedFilter='ALL'){
  const audit=x=>x.type==='microtopics'?packageHealth(x.id):questionHealth(questionInStore(x.id));
  const micros=(data?.units||[]).flatMap(u=>(u.topics||[]).flatMap(t=>(t.microtopics||[]).map(m=>({type:'microtopics',id:String(u.id)+'-'+String(t.id)+'-'+String(m.id)}))));
  const qs=questions.map(q=>({type:'questions',id:String(q.id)}));
  const rows=[...micros,...qs].map(x=>{const a=audit(x.type,x.id),reviewStatus=review(x.type,x.id),meta=rowMeta(x);return{x,a,reviewStatus,unitId:meta.unitId,topicId:meta.topicId}});
  return rows.filter(r=>{
    const h=isHiddenForMe(r.x.type,r.x.id),a=r.a,rv=r.reviewStatus;
    if(selectedFilter==='REMOVED FROM MY LIST')return h;
    if(h)return false;
    if(filterUnit!=='ALL'&&String(r.unitId)!==String(filterUnit))return false;
    if(filterTopic!=='ALL'&&String(r.topicId)!==String(filterTopic))return false;
    if(selectedFilter==='MICRO-TOPICS')return r.x.type==='microtopics';
    if(selectedFilter==='QUESTIONS')return r.x.type==='questions';
    if(selectedFilter==='PYQ')return r.x.type==='questions'&&String(questionInStore(r.x.id)?.type||'').toLowerCase().includes('pyq');
    if(selectedFilter==='MCQ')return r.x.type==='questions'&&!String(questionInStore(r.x.id)?.type||'').toLowerCase().includes('pyq');
    if(selectedFilter==='NEED REVIEW')return a.status!=='PASS'&&!rv;
    if(selectedFilter==='NOT YET REVIEWED')return !rv;
    if(selectedFilter==='AI REVIEWED')return aiReview(r.x.type,String(r.x.id));
    if(selectedFilter==='EXPERT VERIFIED')return rv==='EXPERT VERIFIED';
    if(selectedFilter==='CONTENT PASS')return a.status==='PASS';
    if(selectedFilter==='CONTENT FAIL')return a.status==='FAIL';
    if(selectedFilter==='MISSING CONTENT')return r.x.type==='microtopics'&&!hasContent(microInStore(r.x.id)||{});
    if(selectedFilter==='CONTENT READY')return r.x.type==='microtopics'&&hasContent(microInStore(r.x.id)||{});
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
function filterControls(){
  const units=data?.units||[];
  const selectedUnit=units.find(u=>String(u.id)===String(filterUnit));
  const topics=selectedUnit?.topics||[];
  const filters=['ALL','MICRO-TOPICS','QUESTIONS','PYQ','MCQ','NEED REVIEW','NOT YET REVIEWED','AI REVIEWED','EXPERT VERIFIED','CONTENT PASS','CONTENT FAIL','MISSING CONTENT','CONTENT READY','REMOVED FROM MY LIST'];
  return '<div class="admin-filter-groups"><div class="admin-filter-group"><span class="admin-filter-label">CONTENT & REVIEW</span><div class="admin-filters">'+filters.map(x=>'<button class="admin-filter '+(filter===x?'active':'')+'" data-filter="'+x+'">'+x.replace(/_/g,' ')+'</button>').join('')+'</div></div><div class="admin-filter-selects"><label><span>UNIT</span><select id="adminUnitFilter"><option value="ALL">All units</option>'+units.map(u=>'<option value="'+esc(u.id)+'" '+(String(filterUnit)===String(u.id)?'selected':'')+'>'+esc(u.title)+'</option>').join('')+'</select></label><label><span>TOPIC</span><select id="adminTopicFilter" '+(selectedUnit?'':'disabled')+'><option value="ALL">All topics</option>'+topics.map(t=>'<option value="'+esc(t.id)+'" '+(String(filterTopic)===String(t.id)?'selected':'')+'>'+esc(t.title)+'</option>').join('')+'</select></label></div></div>';
}
function renderQueue(){
  const allRows=rowsFor('ALL'),visible=rowsFor(filter),need=allRows.filter(r=>r.a.status!=='PASS'&&!r.reviewStatus).length,sat=allRows.filter(r=>r.reviewStatus==='EXPERT VERIFIED').length,hiddenCount=hiddenForMe.size,aiPassed=aiPassedRows();
  root.querySelector('#adminQueue').innerHTML='<section class="admin-toolbar card"><div><strong>'+allRows.length+'</strong><span>content items</span></div><div><strong>'+need+'</strong><span>need owner review</span></div><div><strong>'+aiPassed.length+'</strong><span>AI passed</span></div><div><strong>'+sat+'</strong><span>expert verified</span></div><div><strong>'+hiddenCount+'</strong><span>removed from my list</span></div></section>'+filterControls()+(visible.length?visible.map(r=>makeItem(r.x.type,r.x.id,r.a)).join(''):'<section class="card admin-empty"><h2>No items in this view</h2><p>Change the filter or selection to see another content set.</p></section>');
  root.querySelectorAll('.admin-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderQueue()});
  const unit=root.querySelector('#adminUnitFilter');if(unit)unit.onchange=()=>{filterUnit=unit.value;filterTopic='ALL';renderQueue()};
  const topic=root.querySelector('#adminTopicFilter');if(topic)topic.onchange=()=>{filterTopic=topic.value;renderQueue()};
  root.querySelectorAll('.admin-review').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,b.dataset.review));
  root.querySelectorAll('.admin-component-review').forEach(b=>b.onclick=()=>changeReview(b.dataset.componentReview,b.dataset.id,b.dataset.reviewValue));
  root.querySelectorAll('.admin-clear').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,''));
  root.querySelectorAll('.admin-hide,.admin-show').forEach(b=>b.onclick=()=>toggleVisibility(b.dataset.type,b.dataset.id));
  root.querySelectorAll('.admin-edit').forEach(b=>b.onclick=()=>{const editor=b.closest('.admin-item')?.querySelector('.admin-editor');if(editor){editor.hidden=!editor.hidden;if(!editor.hidden)editor.scrollIntoView({behavior:'smooth',block:'start'})}});
  root.querySelectorAll('.admin-edit-close').forEach(b=>b.onclick=()=>{const editor=b.closest('.admin-editor');if(editor)editor.hidden=true});
  root.querySelectorAll('.admin-save-content').forEach(b=>b.onclick=async()=>{const editor=b.closest('.admin-item')?.querySelector('.admin-editor');if(!editor)return;b.disabled=true;b.textContent='SAVING…';try{await saveContent(editor.dataset.editorType,editor.dataset.editorId,editor)}catch(e){alert('Could not save content: '+e.message);b.disabled=false;b.textContent='SAVE CONTENT'}});
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
async function checkSite(){const checks=await Promise.all(['./index.html','./app/runtime.js','./style.css','./data/syllabus-index.json','./content/microtopics/micro_topics.json','./content/deep-dive/deep_dive.json','./content/active-recall/active_recall.json','./content/revision/revision_guidance.json','./content/practice/practice_mcqs.json','./content/questions/questions.json'].map(async path=>{try{const r=await fetch(path+'?health='+Date.now(),{cache:'no-store'});return r.ok}catch{return false}}));return checks.every(Boolean)}
async function reloadAdminContent(){const [syllabus,micro,deep,recall,revision,practice,qpool]=await Promise.all([loadJSON('data/syllabus-index.json'),loadJSON('content/microtopics/micro_topics.json'),loadJSON('content/deep-dive/deep_dive.json'),loadJSON('content/active-recall/active_recall.json'),loadJSON('content/revision/revision_guidance.json'),loadJSON('content/practice/practice_mcqs.json'),loadJSON('content/questions/questions.json')]);microPool=micro||{};deepPool=deep||{};recallPool=recall||{};revisionPool=revision||{};practicePool=practice||{};questionStore=qpool;data=buildAdminData(syllabus,microPool);questions=Array.isArray(qpool)?qpool:[...(Array.isArray(qpool?.pyq)?qpool.pyq:[]),...(Array.isArray(qpool?.practice)?qpool.practice:[])];renderQueue();}

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
  root.innerHTML='<section class="admin-hero"><div class="eyebrow">CONTENT MANAGEMENT</div><h1>Content Audit</h1><p>Each item opens in its real learner-facing view. Edit the canonical content, prepare a ChatGPT content packet, hide it temporarily, or record your expert review without leaving this page.</p></section><div id="contentTaskBox">'+instructionCard()+'</div><div id="adminQueue" class="admin-queue"><div class="card">Loading content…</div></div>';
  try{
    const [syllabus,micro,deep,recall,revision,practice,qpool]=await Promise.all([loadJSON('data/syllabus-index.json'),loadJSON('content/microtopics/micro_topics.json'),loadJSON('content/deep-dive/deep_dive.json'),loadJSON('content/active-recall/active_recall.json'),loadJSON('content/revision/revision_guidance.json'),loadJSON('content/practice/practice_mcqs.json'),loadJSON('content/questions/questions.json'),loadAuditState(),loadInstructions()]);
    microPool=micro||{};deepPool=deep||{};recallPool=recall||{};revisionPool=revision||{};practicePool=practice||{};questionStore=qpool;data=buildAdminData(syllabus,microPool);
    questions=Array.isArray(qpool)?qpool:[...(Array.isArray(qpool?.pyq)?qpool.pyq:[]),...(Array.isArray(qpool?.practice)?qpool.practice:[])];
    const running=await checkSite();
    root.querySelector('#adminQueue').insertAdjacentHTML('afterbegin','<section class="card admin-health"><div><div class="eyebrow">STATIC CONTENT SOURCE</div><strong>CANONICAL STATIC POOLS</strong><p>Owner audit reads the published static content pools directly. Supabase is not an audit source.</p></div></section>'+bridgeStatusCard()+'<section class="card admin-health"><div><div class="eyebrow">WEBSITE STATUS</div><strong>'+ (running?'RUNNING':'CHECK FAILED') +'</strong><p>Core pages, runtime, stylesheet and published content pools '+(running?'are responding.':'did not all respond.')+'</p></div></section>');
    const saveEnrichment=root.querySelector('#saveEnrichment');
    if(saveEnrichment)saveEnrichment.onclick=saveInstructions;
    const generationMode=root.querySelector('#generationMode');if(generationMode)generationMode.onchange=populateGenerationTargets;
    populateGenerationTargets();
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