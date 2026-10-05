(()=>{'use strict';
const OWNER='ankitvrsharma',REPO='NET-Psychology',BRANCH='main',API='https://api.github.com';
const FILES={questions:'content/questions/questions.json',microtopics:'content/microtopics/micro_topics.json',quickLearnCards:'content/quick-learn/quick_cards.json',deepDive:'content/deep-dive/deep_dive.json',activeRecall:'content/active-recall/active_recall.json'};
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let modal=null,current=null,cache=new Map();

function b64(text){const bytes=new TextEncoder().encode(text);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(bin)}
function u8(raw){const bin=atob(String(raw||'').replace(/\n/g,''));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
async function getFile(path){
  if(cache.has(path))return cache.get(path);
  const r=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+path+'?ref='+BRANCH+'&v='+Date.now(),{headers:{Accept:'application/vnd.github+json'}});
  if(!r.ok)throw Error('Could not load '+path+' ('+r.status+')');
  const x=await r.json(),data=JSON.parse(u8(x.content));
  const out={sha:x.sha,data};cache.set(path,out);return out;
}
async function putFile(path,data,token,message){
  const existing=await getFile(path);
  const body={message,content:b64(JSON.stringify(data,null,2)+'\n'),branch:BRANCH,sha:existing.sha};
  const r=await fetch(API+'/repos/'+OWNER+'/'+REPO+'/contents/'+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw Error('GitHub could not save '+path+' ('+r.status+')');
  const x=await r.json();cache.set(path,{sha:x.content?.sha||existing.sha,data});return x;
}
async function approve(type,id,token){
  const path='config/content-owner-overrides.json';
  const f=await getFile(path),d=f.data&&typeof f.data==='object'?f.data:{schema_version:6,owner_approved:{},owner_rejected:{},notes:{}};
  d.owner_approved=d.owner_approved||{};d.owner_rejected=d.owner_rejected||{};d.notes=d.notes||{};
  const gateType=type==='deepDive'?'microtopics':type;
  d.owner_approved[gateType]=Array.isArray(d.owner_approved[gateType])?d.owner_approved[gateType]:[];
  if(!d.owner_approved[gateType].includes(String(id)))d.owner_approved[gateType].push(String(id));
  if(Array.isArray(d.owner_rejected[gateType]))d.owner_rejected[gateType]=d.owner_rejected[gateType].filter(x=>String(x)!==String(id));
  d.updated_at=new Date().toISOString();
  await putFile(path,d,token,'Publish owner-edited content: '+type+' '+id);
}
function input(label,key,value,large=false){
  return '<label class="ce-field"><span>'+esc(label)+'</span>'+(large?'<textarea data-key="'+esc(key)+'" rows="7">'+esc(value)+'</textarea>':'<input data-key="'+esc(key)+'" value="'+esc(value)+'">')+'</label>';
}
function fields(type,item){
  if(type==='questions'){
    const opts=Array.isArray(item.options)?item.options:[];
    return input('Question','question',item.question,true)+opts.map((x,i)=>input('Option '+String.fromCharCode(65+i),'option'+i,x,true)).join('')+input('Explanation','explanation',item.explanation||'',true)+input('Exam takeaway','exam_takeaway',item.exam_takeaway||'',true);
  }
  if(type==='microtopics'){
    return input('Title','title',item.title||'')+input('Core learner explanation','expert_explanation',item.expert_explanation||'',true)+input('Learning notes','content_notes',item.content_notes||'',true)+input('Detailed explanation','detailed_explanation',item.detailed_explanation||'',true)+input('Distinction / exam caution','distinction',item.distinction||'',true)+input('Application question','application_question',item.application_question||'',true)+input('Exam takeaway','exam_takeaway',item.exam_takeaway||'',true);
  }
  if(type==='quickLearnCards'){
    return input('Card title','title',item.title||'')+input('Learner-facing card explanation','explanation',item.explanation||'',true);
  }
  if(type==='deepDive'){
    return input('Detailed explanation','detailed_explanation',item.detailed_explanation||'',true)+input('Distinction / exam caution','distinction',item.distinction||'',true)+input('Exam takeaway','exam_takeaway',item.exam_takeaway||'',true);
  }
  if(type==='activeRecall'){
    const prompts=Array.isArray(item.prompts)?item.prompts:[];
    return prompts.map((p,i)=>'<fieldset class="ce-recall"><legend>Recall '+(i+1)+' · '+esc(p.type||'Prompt')+'</legend>'+input('Prompt','prompt'+i,p.prompt||'',true)+input('Expected answer','answer'+i,p.answer||'',true)+'</fieldset>').join('')||'<p class="ce-muted">No recall prompts are currently stored for this item.</p>';
  }
  return '';
}
async function resolve(type,id){
  const f=await getFile(FILES[type]);
  let item;
  if(type==='questions'){const items=[...(Array.isArray(f.data?.pyq)?f.data.pyq:[]),...(Array.isArray(f.data?.practice)?f.data.practice:[])];item=items.find(x=>String(x.id)===String(id));}
  else item=f.data?.[id];
  if(!item)throw Error('The canonical content record was not found. Run the content-category build first.');
  return {f,item};
}
function ensureModal(){
  if(modal)return;
  modal=document.createElement('div');modal.className='ce-modal';modal.hidden=true;
  modal.innerHTML='<div class="ce-backdrop" data-ce-close></div><section class="ce-dialog" role="dialog" aria-modal="true" aria-labelledby="ce-title"><div class="ce-head"><div><div class="eyebrow">OWNER EDIT · LEARNER VIEW</div><h2 id="ce-title">Correct learner-facing content</h2><p id="ce-target"></p></div><button type="button" class="ce-close" data-ce-close aria-label="Close">×</button></div><div class="ce-note">Your manual correction is authoritative. It is saved directly to the canonical content file and marked owner-approved — <strong>no automatic re-audit is required.</strong></div><form id="ce-form"><div id="ce-fields"></div><div class="ce-actions"><button type="button" class="btn" data-ce-close>Cancel</button><button type="submit" class="btn primary" id="ce-save">Save Correction & Publish</button></div><p id="ce-status" class="ce-status" role="status"></p></form></section>';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target.closest('[data-ce-close]'))close()});
  modal.querySelector('#ce-form').addEventListener('submit',save);
}
function open(type,id){
  ensureModal();current={type,id};modal.hidden=false;
  modal.querySelector('#ce-status').textContent='Loading canonical learner content…';
  modal.querySelector('#ce-fields').innerHTML='';
  resolve(type,id).then(({item})=>{
    modal.querySelector('#ce-target').textContent=type+' · '+id;
    modal.querySelector('#ce-fields').innerHTML=fields(type,item);
    modal.querySelector('#ce-status').textContent='Edit only the learner-facing correction you want to make.';
  }).catch(e=>{modal.querySelector('#ce-status').textContent=e.message});
}
function close(){if(modal){modal.hidden=true;current=null}}
function collect(type,item){
  const root=modal.querySelector('#ce-fields'),out={...item};
  root.querySelectorAll('[data-key]').forEach(el=>{
    const k=el.dataset.key;
    if(k.startsWith('option'))return;
    if(k.startsWith('prompt')||k.startsWith('answer'))return;
    out[k]=el.value;
  });
  if(type==='questions'){
    out.options=[0,1,2,3].map(i=>root.querySelector('[data-key="option'+i+'"]')?.value??'');
  }
  if(type==='activeRecall'){
    out.prompts=(item.prompts||[]).map((p,i)=>({...p,prompt:root.querySelector('[data-key="prompt'+i+'"]')?.value??p.prompt,answer:root.querySelector('[data-key="answer'+i+'"]')?.value??p.answer}));
  }
  return out;
}
async function save(e){
  e.preventDefault();if(!current)return;
  const token=prompt('Enter your GitHub fine-grained token (Contents: Read and write). It is used only for this save and is not stored.');
  if(!token)return;
  const btn=modal.querySelector('#ce-save');btn.disabled=true;modal.querySelector('#ce-status').textContent='Saving correction…';
  try{
    const {type,id}=current,{f,item}=await resolve(current.type,current.id);
    const updated=collect(type,item);
    if(type==='questions'){const pyq=Array.isArray(f.data?.pyq)?f.data.pyq.slice():[],practice=Array.isArray(f.data?.practice)?f.data.practice.slice():[];let idx=pyq.findIndex(x=>String(x.id)===String(id));if(idx>=0)pyq[idx]=updated;else{idx=practice.findIndex(x=>String(x.id)===String(id));if(idx<0)throw Error('Question record not found.');practice[idx]=updated;}f.data={...f.data,pyq,practice};}
    else f.data={...(f.data||{}),[id]:updated};
    cache.set(FILES[type],f);
    await putFile(FILES[type],f.data,token,'Owner correction: '+type+' '+id);
    await approve(type,id,token);
    markRow(type,id);
    modal.querySelector('#ce-status').textContent='✓ Saved and published as an owner correction. No re-audit required.';
    setTimeout(close,1200);
  }catch(err){modal.querySelector('#ce-status').textContent='Save failed: '+err.message}
  finally{btn.disabled=false}
}
function markRow(type,id){
  document.querySelectorAll('.qa-row').forEach(row=>{
    const button=row.querySelector('[data-edit-learner]');
    if(button?.dataset.type===type&&button?.dataset.id===id){
      const pill=document.createElement('span');pill.className='pill pass';pill.textContent='OWNER EDITED · PUBLISHED';button.replaceWith(pill);
    }
  });
}
function injectButtons(){
  document.querySelectorAll('.qa-row').forEach(row=>{
    if(row.querySelector('[data-edit-learner]'))return;
    const ref=row.querySelector('[data-request-rewrite]');
    if(!ref)return;
    const b=document.createElement('button');b.type='button';b.className='qa-owner-action qa-edit-learner';b.dataset.editLearner='1';b.dataset.type=ref.dataset.type;b.dataset.id=ref.dataset.id;b.textContent='Edit Learner Content';
    const actions=row.querySelector('.qa-actions-bottom');if(actions)actions.prepend(b);
  });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-edit-learner]');if(b)open(b.dataset.type,b.dataset.id)});
const observer=new MutationObserver(injectButtons);
observer.observe(document.body,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectButtons,{once:true});else injectButtons();
})();