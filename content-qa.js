(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const OWNER='ankitvrsharma',REPO='NET-Psychology',BRANCH='main',API='https://api.github.com',OWNER_FILE='content-owner-overrides.json',REWRITE_FILE='rewrite-requests.json';
const MAX_REWRITE_CYCLES=2,PASS=70,REVIEW=60,PAGE_SIZE=40;
let audit=null,rows=[],visibleRows=[],pageSize=PAGE_SIZE;
let filters={type:'all',audit:'all',owner:'all',workflow:'all',ownerReview:'pending'};
const store=()=>{try{return JSON.parse(localStorage.getItem('netPsychOwnerContentQA')||'{}')}catch{return{}}};
const save=x=>{try{localStorage.setItem('netPsychOwnerContentQA',JSON.stringify(x))}catch{}};
const statusFor=(type,id)=>{const s=store();if((s.rejected?.[type]||[]).map(String).includes(String(id)))return'REJECTED';if((s.approved?.[type]||[]).map(String).includes(String(id)))return'APPROVED';return'AUTO'};
const revisionFor=(type,id)=>{const s=store();return s.revisions?.[type]?.[id]||{cycles:0,history:[]}};
const setStatus=(type,id,status,reason)=>{
  const s=store();s.approved=s.approved||{};s.rejected=s.rejected||{};s.rejectionReasons=s.rejectionReasons||{};
  for(const k of ['approved','rejected'])s[k][type]=(s[k][type]||[]).filter(x=>String(x)!==String(id));
  s.rejectionReasons[type]=s.rejectionReasons[type]||{};
  if(status==='APPROVED')s.approved[type].push(String(id));
  if(status==='REJECTED'){s.rejected[type].push(String(id));s.rejectionReasons[type][id]=String(reason||'').trim()}
  else delete s.rejectionReasons[type][id];
  save(s);renderRows();
};
const queueRewrite=(type,id)=>{
  const s=store();s.revisions=s.revisions||{};s.revisions[type]=s.revisions[type]||{};
  const r=revisionFor(type,id);
  if(r.cycles>=MAX_REWRITE_CYCLES){r.history.push({action:'REWRITE_LIMIT_REACHED',at:new Date().toISOString()});s.revisions[type][id]=r;save(s);renderRows();return}
  r.cycles+=1;r.history.push({action:'REWRITE_REQUESTED',cycle:r.cycles,at:new Date().toISOString()});s.revisions[type][id]=r;save(s);renderRows();
};
const ownerPayload=()=>{
  const s=store(),queue=[];
  for(const type of Object.keys(s.rejected||{}))for(const id of s.rejected[type]||[])queue.push({type,id,rejection_comment:String(s.rejectionReasons?.[type]?.[id]||''),status:'REWRITE_REQUIRED',instruction:'Rewrite this content using the owner rejection comment, then re-audit it before learner use.'});
  return{schema_version:7,owner_approved:s.approved||{},owner_rejected:s.rejected||{},notes:s.rejectionReasons||{},rewrite_queue:queue,updated_at:new Date().toISOString()};
};
function signals(values){
  const text=(Array.isArray(values)?values:[values]).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'')).join(' ').replace(/\s+/g,' ').trim();
  const low=text.toLowerCase();
  const generic=['this topic is important','plays a crucial role','understanding this concept','in simple terms','it is important to note','in conclusion','this helps us understand'];
  const domain=['mechanism','construct','process','theory','model','criterion','validity','reliability','reinforcement','cognition','behaviour','behavior','assessment','experiment','correlation','causal','development','memory','perception','motivation','personality','attitude','learning','stress'];
  const teaching=['exam','pyq','trap','recall','application','example','scenario','cue','mnemonic','distinguish'];
  return{text,length:text.length,generic:generic.filter(x=>low.includes(x)).length,domain:domain.filter(x=>low.includes(x)).length,teaching:teaching.filter(x=>low.includes(x)).length,mechanism:(low.match(/\b(because|therefore|leads to|results in|involves|through|mechanism|process)\b/g)||[]).length,contrast:(low.match(/\b(distinguish|whereas|contrast|however|not the same as)\b/g)||[]).length};
}
function microAudit(m){
  const x=signals([m.title,m.expert_explanation,m.detailed_explanation,m.content_notes,m.study_notes,m.application_question,m.recall_cue,m.memory_hook,m.source_notes]);
  const issues=[];
  if(!String(m.title||'').trim())issues.push('missing_title');
  if(!Array.isArray(m.sources)||!m.sources.length)issues.push('no_explicit_source_mapping');
  if(x.length<220)issues.push('too_thin');
  if(x.generic>=3)issues.push('generic_ai_style');
  if(x.domain<3)issues.push('low_psychology_specificity');
  if(!x.mechanism&&!x.contrast)issues.push('weak_explanation_structure');
  let score=(m.sources?.length?15:0)+Math.min(25,10+x.domain*2+x.mechanism*2+x.contrast*2)+Math.min(20,8+(x.length>=500?5:0)+(x.domain>=6?4:0))+Math.min(15,6+x.teaching*2)+Math.min(10,4+(m.application_question?2:0)+(m.recall_cue||m.memory_hook?2:0)+(x.contrast?2:0))+Math.max(0,10-x.generic*3-(x.length<180?4:0));
  if(!m.sources?.length)score-=10;if(x.generic>=3)score-=8;
  score=Math.max(0,Math.min(100,Math.round(score)));
  return{score,status:(!m.title||!m.sources?.length||score<REVIEW)?'ISSUE':score>=PASS?'PASS':'REVIEW',issues};
}
function questionAudit(q){
  const x=signals([q.question,q.explanation,q.session,q.type,q.kind]),issues=[];
  if(!q.question)issues.push('missing_question');
  if(!Array.isArray(q.options)||q.options.length!==4)issues.push('invalid_options');
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)issues.push('invalid_answer');
  if(q.unit==null||q.topic==null||q.micro==null)issues.push('unmapped');
  if(!q.explanation)issues.push('missing_explanation');
  if(x.generic>=2)issues.push('generic_explanation_style');
  if(x.length<180)issues.push('thin_explanation');
  if(!q.session||q.type!=='PYQ')issues.push('weak_provenance');
  let score=(q.session&&q.type==='PYQ'?20:0)+(Array.isArray(q.options)&&q.options.length===4?15:0)+(q.unit!=null&&q.topic!=null&&q.micro!=null?15:0)+Math.min(20,x.length>=300?20:x.length>=220?16:x.length>=180?12:6)+Math.min(15,x.domain*1.5)+Math.min(10,x.contrast*2+x.mechanism*2)+(q.kind?5:0)-Math.min(15,x.generic*4);
  score=Math.max(0,Math.min(100,Math.round(score)));
  return{score,status:issues.some(i=>['missing_question','missing_explanation','invalid_options','invalid_answer'].includes(i))?'ISSUE':score>=PASS?'PASS':score>=REVIEW?'REVIEW':'ISSUE',issues};
}
function findMicro(data,id){const p=String(id).split('-').map(Number);return data.units?.find(u=>u.id===p[0])?.topics?.find(t=>t.id===p[1])?.microtopics?.find(m=>m.id===p[2])||null}
function microText(m){return [m.expert_explanation,m.detailed_explanation,m.content_notes,m.study_notes,m.application_question,m.recall_cue,m.memory_hook].filter(Boolean).join(' ')}
function cardAudit(id,data){
  const parts=String(id).split('|'),base=parts[0],angle=parts[1]||'',m=findMicro(data,base);
  if(!m)return{score:0,status:'ISSUE',issues:['missing_parent_microtopic']};
  const a=microAudit(m),text=microText(m).toLowerCase();
  const req={'CORE IDEA':/core|definition|means|concept|theor/,'KEY FEATURES':/feature|characteristic|component|dimension|factor|type/,'PYQ FOCUS':/pyq|exam|question|distinguish|trap/,'EXAM TRAP':/trap|distinguish|whereas|common error/,'SOURCE DETAIL':/source|study|research|author|model|theory/,'RECALL CUE':/recall|cue|memory|mnemonic/,'CONNECTION':/connect|relationship|link|related|contrast|compare/};
  const missing=req[angle]&&!req[angle].test(text),score=Math.max(0,a.score-(missing?15:0)),issues=a.issues.slice();if(missing)issues.push('weak_angle_specific_support');
  return{score,status:score>=PASS?'PASS':score>=REVIEW?'REVIEW':'ISSUE',issues};
}
function recallPrompts(m){
  const core=String(m.expert_explanation||'').trim(),n=String(m.content_notes||''),dist=String(m.distinction||'').trim(),app=String(m.application_question||'').trim(),p=[];
  if(core)p.push({type:'FREE RECALL',prompt:'Without looking at your notes, what is '+m.title+'? State its meaning and central idea.',answer:core});
  if(dist)p.push({type:'DISTINCTION',prompt:'What distinction or exam caution must you keep clear for '+m.title+'?',answer:dist});
  if(app)p.push({type:'APPLICATION',prompt:'How would you apply '+m.title+' to a psychology situation or NET question?',answer:app});
  if(n)p.push({type:'SOURCE RECALL',prompt:'What source-grounded point about '+m.title+' should you be able to retrieve without notes?',answer:n.slice(0,1000)});
  return p.slice(0,5);
}
function build(data,qs,ex){
  const out={questions:[],microtopics:[],quickLearnCards:[],deepDive:[],activeRecall:[]};
  for(const q of qs){const content={...q,explanation:ex[q.id]||q.explanation},a=questionAudit(content);out.questions.push({id:q.id,title:q.question,score:a.score,status:a.status,issues:a.issues,content})}
  for(const u of data.units||[])for(const t of u.topics||[])for(const m of t.microtopics||[]){
    const id=u.id+'-'+t.id+'-'+m.id,a=microAudit(m);
    out.microtopics.push({id,title:m.title,score:a.score,status:a.status,issues:a.issues,content:m});
    out.deepDive.push({id,title:m.title,score:a.score,status:a.status,issues:a.issues,content:m});
    for(const angle of ['CORE IDEA','KEY FEATURES','PYQ FOCUS','EXAM TRAP','SOURCE DETAIL','RECALL CUE','CONNECTION']){const c=cardAudit(id+'|'+angle,data);out.quickLearnCards.push({id:id+'|'+angle,title:m.title+' — '+angle,score:c.score,status:c.status,issues:c.issues,content:m,angle})}
    out.activeRecall.push({id,title:m.title,score:a.score,status:a.status,issues:a.issues,content:m,prompts:recallPrompts(m)});
  }
  return out;
}
function workflow(x){const o=statusFor(x.type,x.id),r=revisionFor(x.type,x.id);if(o==='REJECTED')return{label:'REWRITE REQUIRED',cls:'rewrite',cycles:r.cycles};if(o==='APPROVED')return{label:'OWNER APPROVED',cls:'pass',cycles:r.cycles};if(x.status==='PASS')return{label:'OWNER REVIEW',cls:'pass',cycles:r.cycles};return{label:'REWRITE REQUIRED',cls:'rewrite',cycles:r.cycles}}
function preview(x){
  const m=x.content||{};
  if(x.type==='questions'){const opts=(m.options||[]).map((v,i)=>'<li><span>'+String.fromCharCode(65+i)+'</span>'+esc(v)+'</li>').join('');return '<div class="qa-preview learner-preview"><h4>'+esc(m.question||x.title)+'</h4><ol class="qa-options">'+opts+'</ol><p><strong>Explanation:</strong> '+esc(m.explanation||'No explanation available.')+'</p></div>'}
  if(x.type==='activeRecall'){return '<div class="qa-preview learner-preview"><h4>Bring this idea back from memory.</h4>'+((x.prompts||[]).map((p,i)=>'<section class="qa-recall-item"><span>'+esc(p.type)+'</span><p><strong>'+String(i+1)+'.</strong> '+esc(p.prompt)+'</p><details><summary>Expected answer</summary><p>'+esc(p.answer)+'</p></details></section>').join(''))+'</div>'}
  const text=m.detailed_explanation||m.expert_explanation||m.content_notes||'';
  const dist=m.distinction||'';
  return '<div class="qa-preview learner-preview"><div class="qa-angle">'+esc(x.angle||x.type)+'</div><h4>'+esc(m.title||x.title)+'</h4><p class="qa-deep-copy">'+esc(text)+'</p>'+(dist?'<h5>EXAM CAUTION</h5><p>'+esc(dist)+'</p>':'')+'</div>';
}
function ownerActions(x){
  const w=workflow(x),o=statusFor(x.type,x.id);
  return '<div class="qa-actions qa-actions-bottom"><span class="pill '+w.cls+'">'+esc(w.label)+'</span><span class="pill '+o.toLowerCase()+'">Decision · '+esc(o)+'</span><button class="qa-owner-action qa-rewrite-request" data-request-rewrite="1" data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'">Request Rewrite</button>'+(x.status!=='PASS'?'<button class="qa-owner-action" data-rewrite="1" data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'">Queue rewrite</button>':'<button class="qa-owner-action qa-approve" data-set="APPROVED" data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'">Approve</button><button class="qa-owner-action qa-reject" data-set="REJECTED" data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'">Reject</button><button class="qa-owner-action qa-clear" data-set="AUTO" data-type="'+esc(x.type)+'" data-id="'+esc(x.id)+'">Clear</button>')+'</div>';
}
function renderSummary(){
  const sets=[['Practice Questions',audit.questions,'questions'],['Micro-topic Explanations',audit.microtopics,'microtopics'],['Quick Learn Cards',audit.quickLearnCards,'quickLearnCards'],['Deep Dive Explanations',audit.deepDive,'deepDive'],['Active Recall',audit.activeRecall,'activeRecall']];
  $('#summary').innerHTML=sets.map(([name,a,type])=>{const p=a.filter(x=>x.status==='PASS').length,r=a.filter(x=>x.status==='REVIEW').length,i=a.filter(x=>x.status==='ISSUE').length;return '<article class="qa-stat" data-summary-type="'+type+'" role="button" tabindex="0"><div class="qa-stat-title">'+esc(name)+'</div><div class="qa-stat-total"><span class="qa-stat-total-label">Total</span><strong class="qa-stat-total-value">'+a.length+'</strong></div><div class="qa-stat-row pass"><span class="qa-stat-row-label">Passed</span><strong class="qa-stat-row-value">'+p+'</strong></div><div class="qa-stat-row review"><span class="qa-stat-row-label">Need Review</span><strong class="qa-stat-row-value">'+r+'</strong></div><div class="qa-stat-row issue"><span class="qa-stat-row-label">Issue</span><strong class="qa-stat-row-value">'+i+'</strong></div></article>'}).join('');
  const total=sets.reduce((n,x)=>n+x[1].length,0),passCount=sets.reduce((n,x)=>n+x[1].filter(y=>y.status==='PASS').length,0);
  $('#gate').innerHTML='<div class="qa-gate"><div class="qa-gate-title">Audit &amp; Publishing Workflow</div><div class="qa-gate-copy"><strong>PASS:</strong> content can enter owner review. <strong>REWRITE → RE-AUDIT:</strong> REVIEW/ISSUE content is held until improved. <strong>OWNER EDIT:</strong> your manual correction is authoritative and does not require re-audit.</div><div class="qa-gate-status">'+passCount+' pass now · '+(total-passCount)+' currently held · Maximum automatic rewrites: '+MAX_REWRITE_CYCLES+'</div></div>';
}
function matches(x){
  const q=String($('#search')?.value||'').toLowerCase().trim(),o=statusFor(x.type,x.id),w=workflow(x);
  if(q&&!JSON.stringify([x.id,x.title,x.content]).toLowerCase().includes(q))return false;
  if(filters.type!=='all'&&filters.type!==x.type)return false;
  if(filters.audit!=='all'&&filters.audit!==x.status.toLowerCase())return false;
  if(filters.owner==='approved'&&o!=='APPROVED')return false;
  if(filters.owner==='rejected'&&o!=='REJECTED')return false;
  if(filters.owner==='auto'&&o!=='AUTO')return false;
  if(filters.workflow==='rewrite'&&w.label!=='REWRITE REQUIRED')return false;
  if(filters.workflow==='owner-review'&&!(x.status==='PASS'&&o==='AUTO'))return false;
  if(filters.workflow==='pass'&&x.status!=='PASS')return false;
  if(filters.ownerReview==='pending'&&!(x.status==='PASS'&&o==='AUTO'))return false;
  if(filters.ownerReview==='reviewed'&&o==='AUTO')return false;
  return true;
}
function rowHTML(x){
  const w=workflow(x),o=statusFor(x.type,x.id);
  return '<article class="qa-row"><div class="qa-content"><div class="qa-row-head"><div><h3>'+esc(x.title)+'</h3><small>'+esc(x.id)+'</small></div><span class="audit-status '+w.cls+'">'+esc(x.status)+' · '+x.score+'/100</span></div>'+preview(x)+'<div class="qa-audit-meta"><p class="qa-issues">'+(x.issues.length?'Issues: '+esc(x.issues.join(', ')):'No blocking issues detected.')+'</p></div>'+ownerActions(x)+'</div></article>';
}
function renderRows(){
  if(!audit)return;
  rows=[...audit.questions.map(x=>({...x,type:'questions',pool:'Practice Questions'})),...audit.microtopics.map(x=>({...x,type:'microtopics',pool:'Micro-topic Explanations'})),...audit.quickLearnCards.map(x=>({...x,type:'quickLearnCards',pool:'Quick Learn Cards'})),...audit.deepDive.map(x=>({...x,type:'deepDive',pool:'Deep Dive Explanations'})),...audit.activeRecall.map(x=>({...x,type:'activeRecall',pool:'Active Recall'}))];
  visibleRows=rows.filter(matches);pageSize=PAGE_SIZE;
  paintRows();
}
function paintRows(){
  const shown=visibleRows.slice(0,pageSize);
  $('#rows').innerHTML=shown.length?shown.map(rowHTML).join(''):'<div class="empty">No matching audit items.</div>';
  if(visibleRows.length>pageSize)$('#rows').insertAdjacentHTML('beforeend','<div class="empty"><button class="qa-owner-action" id="qa-load-more">Load next '+Math.min(PAGE_SIZE,visibleRows.length-pageSize)+' items</button><p>'+pageSize+' of '+visibleRows.length+' shown</p></div>');
}
function applyFilters(){renderRows()}
async function jsonFetch(path){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{const r=await fetch('./'+path+'?v=20261004-qa1',{signal:controller.signal,cache:'default'});if(!r.ok)throw Error(path+' returned '+r.status);return await r.json()}
  catch(e){if(e.name==='AbortError')throw Error(path+' timed out after 45 seconds');throw e}
  finally{clearTimeout(timer)}
}
async function ownerState(){
  try{const r=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+OWNER_FILE+'?ref='+BRANCH+'&v='+Date.now(),{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)return;const x=await r.json(),bin=atob(String(x.content||'').replace(/\n/g,'')),data=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))));const s=store();s.approved=data.owner_approved||s.approved||{};s.rejected=data.owner_rejected||s.rejected||{};s.rejectionReasons=data.notes||s.rejectionReasons||{};save(s);renderRows()}catch(e){console.warn('Owner state refresh failed',e)}}
function b64(text){const bytes=new TextEncoder().encode(text);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(bin)}
async function commitFile(path,data,token,message){
  const r=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+path+'?ref='+BRANCH,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('GitHub could not read '+path+' ('+r.status+')');
  const x=await r.json(),body={message,content:b64(JSON.stringify(data,null,2)+'\n'),branch:BRANCH,sha:x.sha};
  const put=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!put.ok)throw Error('GitHub commit failed ('+put.status+')');return put.json();
}
async function commitOwner(){
  const token=prompt('Enter your GitHub fine-grained token (Contents: Read and write). It is used only for this commit and is not saved.');
  if(!token)return;
  try{const result=await commitFile(OWNER_FILE,ownerPayload(),token,'Update owner content decisions');alert('Owner decisions committed: '+String(result.commit?.sha||'').slice(0,12));}catch(e){alert('Commit failed: '+e.message)}
}
async function requestRewrite(type,id){
  const instruction=prompt('Describe the rewrite you want for '+type+' · '+id);
  if(!instruction?.trim())return;
  const token=prompt('Enter GitHub fine-grained token (Contents: Read and write).');
  if(!token)return;
  try{
    const r=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+REWRITE_FILE+'?ref='+BRANCH,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token}});
    if(!r.ok)throw Error('Could not read '+REWRITE_FILE+' ('+r.status+')');
    const x=await r.json(),bin=atob(String(x.content||'').replace(/\n/g,'')),data=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))));
    data.requests=Array.isArray(data.requests)?data.requests:[];data.requests.push({id:'RR-'+Date.now().toString(36),type,target_id:id,instruction:instruction.trim(),status:'PENDING',requested_at:new Date().toISOString()});data.updated_at=new Date().toISOString();
    const result=await commitFile(REWRITE_FILE,data,token,'Request content rewrite: '+type+' '+id);alert('Rewrite request queued: '+String(result.commit?.sha||'').slice(0,12));
  }catch(e){alert('Rewrite request failed: '+e.message)}
}
function bind(){
  $('#search').addEventListener('input',()=>renderRows());
  $('#open-filters').addEventListener('click',()=>$('#filter-panel').classList.add('open'));
  $('#close-filters').addEventListener('click',()=>$('#filter-panel').classList.remove('open'));
  $('#apply-filters').addEventListener('click',()=>{$('#filter-panel').classList.remove('open');applyFilters()});
  $('#clear-filters').addEventListener('click',()=>{filters={type:'all',audit:'all',owner:'all',workflow:'all',ownerReview:'pending'};document.querySelectorAll('.qa-filter').forEach(b=>b.classList.toggle('active',b.dataset.filterValue===filters[b.dataset.filterGroup]));applyFilters()});
  document.addEventListener('click',e=>{
    const f=e.target.closest('.qa-filter');if(f){filters[f.dataset.filterGroup]=f.dataset.filterValue;document.querySelectorAll('.qa-filter').forEach(b=>b.classList.toggle('active',b.dataset.filterValue===filters[b.dataset.filterGroup]));return}
    const stat=e.target.closest('.qa-stat[data-summary-type]');if(stat){filters.type=stat.dataset.summaryType;applyFilters();return}
    const more=e.target.closest('#qa-load-more');if(more){pageSize+=PAGE_SIZE;paintRows();return}
    const set=e.target.closest('[data-set]');if(set){if(set.dataset.set==='REJECTED'){const reason=prompt('Reason for rejection:');if(reason?.trim())setStatus(set.dataset.type,set.dataset.id,'REJECTED',reason);return}setStatus(set.dataset.type,set.dataset.id,set.dataset.set);return}
    const rw=e.target.closest('[data-rewrite]');if(rw){queueRewrite(rw.dataset.type,rw.dataset.id);return}
    const rr=e.target.closest('[data-request-rewrite]');if(rr){requestRewrite(rr.dataset.type,rr.dataset.id);return}
    if(e.target.closest('#commit-owner-decisions')){commitOwner();return}
    if(e.target.closest('#export'))download('content-owner-overrides.json',ownerPayload());
    if(e.target.closest('#export-revisions'))download('content-qa-revision-log.json',store().revisions||{});
    if(e.target.closest('#export-report'))download('content-audit-report.json',{generated_at:new Date().toISOString(),audit});
  });
}
function download(name,obj){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
async function boot(){
  try{
    bind();
    const [data,qs,ex]=await Promise.all([jsonFetch('data.json'),jsonFetch('practice_questions.json'),jsonFetch('practice_explanations.json')]);
    audit=build(data,Array.isArray(qs)?qs:[],ex&&typeof ex==='object'?ex:{});
    renderSummary();
    renderRows();
    ownerState();
  }catch(e){
    $('#summary').innerHTML='<div class="empty"><h3>Audit could not load.</h3><p>'+esc(e.message)+'</p><button class="qa-owner-action" type="button" onclick="location.reload()">Retry Audit</button></div>';
    $('#gate').innerHTML='<div class="qa-gate"><strong>Audit is waiting for the required content files.</strong><p>'+esc(e.message)+'</p></div>';
  }
}
boot();
})();