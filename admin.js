(function(){
'use strict';
const OWNER='ankitvrsharma',REPO='ankitvrsharma/NET-Psychology',BRANCH='main';
const root=document.querySelector('#adminApp'),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let approvalQueue=[],verificationState={schema_version:2,items:{},updated_at:''},instructions={schema_version:1,enabled:true,default_instruction:'',user_instruction:'',target_microtopics:[],updated_at:'',updated_by:''},data=null,questions=[],filter='NEED REVIEW';
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
function makeItem(type,id,audit){const owner=ownerReview(type,id),ownerLabel=owner?'<span class="review-status">'+esc(owner)+'</span>':'';const actions=owner?'<button class="btn admin-clear" data-type="'+type+'" data-id="'+esc(id)+'">CLEAR OWNER REVIEW</button>':'<button class="btn primary admin-review" data-review="SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK SATISFACTORY</button><button class="btn admin-review" data-review="NOT_SATISFACTORY" data-type="'+type+'" data-id="'+esc(id)+'">MARK NOT SATISFACTORY</button>';const auto=aiReview(type,id)?'REVIEWED':'NOT REVIEWED';return '<article class="admin-item"><div class="admin-item-copy">'+ownerLabel+'<span class="admin-status '+String(audit.status).toLowerCase()+'">'+esc(audit.status)+'</span><h3>'+esc(titleFor(type,id))+'</h3><p>Audit score: <b>'+audit.score+'</b> · '+esc((audit.issues||[]).join(', ')||'No audit issues')+' · Learner tag: <b>'+auto+'</b></p></div><div class="admin-actions"><a class="btn" href="'+hrefFor(type,id)+'">OPEN</a>'+actions+'</div></article>'}
function rowsFor(selectedFilter='ALL'){const ctx={get data(){return data},get questions(){return questions}},audit=window.NETPsychologyContentAudit.create(ctx).expertAudit;const micros=(data?.units||[]).flatMap(u=>(u.topics||[]).flatMap(t=>(t.microtopics||[]).filter(hasContent).map(m=>({type:'microtopics',id:String(u.id)+'-'+String(t.id)+'-'+String(m.id)}))));const qs=questions.map(q=>({type:'questions',id:String(q.id)}));const rows=[...micros,...qs].map(x=>{const a=audit(x.type,x.id),r=review(x.type,x.id);return{x,a,st:r||a.status}});return rows.filter(r=>selectedFilter==='ALL'||(selectedFilter==='NEED REVIEW'?r.a.status!=='PASS'&&r.st==='':selectedFilter==='REVIEWED'?aiReview(r.x.type==='microtopics'?'microtopics':r.x.type,String(r.x.id)):selectedFilter===r.st)).sort((a,b)=>a.a.score-b.a.score)}
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
function renderQueue(){const allRows=rowsFor('ALL'),visible=rowsFor(filter),need=allRows.filter(r=>r.a.status!=='PASS'&&r.st==='').length,sat=allRows.filter(r=>r.st==='SATISFACTORY').length,unsat=allRows.filter(r=>r.st==='NOT_SATISFACTORY').length,aiPassed=aiPassedRows();root.querySelector('#adminQueue').innerHTML=instructionCard()+approvalQueueCard()+aiPassedCard()+'<section class="admin-toolbar card"><div><strong>'+allRows.length+'</strong><span>content items</span></div><div><strong>'+need+'</strong><span>need owner review</span></div><div><strong>'+aiPassed.length+'</strong><span>AI passed</span></div><div><strong>'+sat+'</strong><span>expert satisfactory</span></div><div><strong>'+unsat+'</strong><span>not satisfactory</span></div></section><div class="admin-filters">'+['ALL','NEED REVIEW','REVIEWED','SATISFACTORY','NOT_SATISFACTORY'].map(x=>'<button class="admin-filter '+(filter===x?'active':'')+'" data-filter="'+x+'">'+x.replace(/_/g,' ')+'</button>').join('')+'</div>'+(visible.length?visible.map(r=>makeItem(r.x.type,r.x.id,r.a)).join(''):'<section class="card admin-empty"><h2>No items in this view</h2><p>Change the filter to see another review state.</p></section>');const saveButton=root.querySelector('#saveEnrichment');if(saveButton)saveButton.onclick=saveInstructions;root.querySelectorAll('.admin-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderQueue()});root.querySelectorAll('.admin-review').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,b.dataset.review));root.querySelectorAll('.admin-clear').forEach(b=>b.onclick=()=>changeReview(b.dataset.type,b.dataset.id,''));root.querySelectorAll('.approve-queued').forEach(b=>b.onclick=()=>approveQueued(b.dataset.id,b.dataset.component))}
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
async function checkSite(){const checks=await Promise.all(['./index.html','./app/runtime.js','./style.css','./data/syllabus-index.json','./content/microtopics/micro_topics.json','./content/questions/questions.json'].map(async path=>{try{const r=await fetch(path+'?health='+Date.now(),{cache:'no-store'});return r.ok}catch{return false}}));return checks.every(Boolean)}

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
  root.innerHTML='<section class="admin-hero"><div class="eyebrow">OWNER AUDIT</div><h1>Content Audit</h1><p>Review source-backed content after the independent AI audit. AI-passed content is listed separately from your expert judgement.</p></section><div id="adminQueue" class="admin-queue"><div class="card">Loading content…</div></div>';
  try{
    const [syllabus,microPool,qpool]=await Promise.all([loadJSON('data/syllabus-index.json'),loadJSON('content/microtopics/micro_topics.json'),loadJSON('content/questions/questions.json'),loadAuditState(),loadInstructions(),loadApprovalQueue()]);
    data=buildAdminData(syllabus,microPool);
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