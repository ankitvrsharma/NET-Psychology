/* Owner-only syllabus structure editor. Saves to an isolated branch and opens a PR. */
(function(){
'use strict';
const REPO='ankitvrsharma/NET-Psychology', BASE='main', PREFIX='admin-structure/';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const root=document.querySelector('#adminApp');
let syllabus=null,selectedUnit=1,dirty=false,busy=false;
const status=s=>{const el=document.querySelector('#structureStatus');if(el)el.textContent=s};
const field=(label,path,value,rows=2)=>'<label class="structure-field"><span>'+esc(label)+'</span><textarea rows="'+rows+'" data-path="'+esc(path)+'">'+esc(value||'')+'</textarea></label>';
const unit=()=>syllabus?.units?.find(u=>String(u.id)===String(selectedUnit));
const move=(kind,index,dir)=>'<button type="button" class="btn structure-move" data-kind="'+kind+'" data-index="'+index+'" data-dir="'+dir+'" '+((index+dir<0||index+dir>=(kind==='part'?unit().parts:unit().topics).length)?'disabled':'')+'>'+(dir<0?'↑ Move up':'↓ Move down')+'</button>';
function draw(){
 if(!syllabus||!root)return;const u=unit();if(!u)return;
 const unitOptions=syllabus.units.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selectedUnit)?'selected':'')+'>Unit '+esc(x.id)+' · '+esc(x.title)+'</option>').join('');
 const parts=(u.parts||[]).map((p,i)=>'<details class="structure-node" open><summary><b>Part '+esc(p.id)+' · '+esc(p.title)+'</b><span>Navigation grouping</span></summary>'+field('Part title','part:'+i+':title',p.title)+field('Part description','part:'+i+':description',p.description,3)+'<div class="structure-moves">'+move('part',i,-1)+move('part',i,1)+'</div></details>').join('');
 const topics=(u.topics||[]).map((t,i)=>'<details class="structure-node"><summary><b>Topic '+esc(t.id)+' · '+esc(t.title)+'</b><span>'+((t.microtopics||[]).length)+' micro-topics</span></summary>'+field('Topic title','topic:'+i+':title',t.title)+field('Topic explanation','topic:'+i+':explanation',t.explanation,3)+field('Topic notes','topic:'+i+':notes',t.notes,5)+'<div class="structure-micro-list"><b>Micro-topics (labels only)</b>'+((t.microtopics||[]).map((m,j)=>field('Micro-topic '+esc(m.id)+' title','micro:'+i+':'+j+':title',m.title)).join('')||'<p>No micro-topics listed.</p>')+'</div><div class="structure-moves">'+move('topic',i,-1)+move('topic',i,1)+'</div></details>').join('');
 root.querySelector('#syllabusStructureEditor').innerHTML='<div class="structure-toolbar"><label>Choose unit<select id="structureUnit">'+unitOptions+'</select></label><span class="structure-count">'+(u.topics||[]).length+' topics · '+(u.parts||[]).length+' parts</span></div>'+field('Unit title','unit:title',u.title)+field('Unit description','unit:description',u.description,4)+'<h3>Parts</h3><p class="admin-help">Parts are navigation groupings. Moving a Part changes its display order, not its topic mappings.</p>'+parts+'<h3>Topics and micro-topics</h3><p class="admin-help">Topic order can be changed here. Micro-topic labels are editable; IDs and question mappings are preserved.</p>'+topics+'<div class="structure-actions"><button class="btn primary" id="saveStructure" '+(busy?'disabled':'')+'>VALIDATE & CREATE REVIEW PR</button><button class="btn" id="discardStructure" '+(busy?'disabled':'')+'>DISCARD UNSAVED CHANGES</button></div><p class="admin-help">Nothing is published directly. Save creates a branch and pull request for review.</p>';
 root.querySelector('#structureUnit').onchange=e=>{if(dirty&&!confirm('Discard unsaved edits and switch units?')){e.target.value=selectedUnit;return}selectedUnit=e.target.value;dirty=false;draw()};
 root.querySelectorAll('[data-path]').forEach(el=>el.oninput=()=>{dirty=true;status('Unsaved structure changes')});
 root.querySelectorAll('.structure-move').forEach(btn=>btn.onclick=()=>{const arr=btn.dataset.kind==='part'?u.parts:u.topics;const i=Number(btn.dataset.index),j=i+Number(btn.dataset.dir);if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];dirty=true;draw();status('Order changed — save to create a review PR')});
 root.querySelector('#discardStructure').onclick=()=>load(true);
 root.querySelector('#saveStructure').onclick=save;
}
function applyFields(){
 const u=unit();
 root.querySelectorAll('#syllabusStructureEditor [data-path]').forEach(el=>{
  const [kind,a,b,c]=el.dataset.path.split(':');const v=el.value.trim();
  if(kind==='unit')u[a]=v;
  if(kind==='part'&&u.parts[Number(a)])u.parts[Number(a)][b]=v;
  if(kind==='topic'&&u.topics[Number(a)])u.topics[Number(a)][b]=v;
  if(kind==='micro'&&u.topics[Number(a)]?.microtopics?.[Number(b)])u.topics[Number(a)].microtopics[Number(b)][c]=v;
 });
}
function validate(){
 const errors=[],unitIds=new Set();
 if(!Array.isArray(syllabus.units)||!syllabus.units.length)errors.push('No syllabus units found.');
 for(const u of syllabus.units||[]){
  if(unitIds.has(String(u.id)))errors.push('Duplicate unit ID '+u.id);unitIds.add(String(u.id));
  if(!String(u.title||'').trim())errors.push('Unit '+u.id+' has no title.');
  const localTopics=new Set();
  for(const t of u.topics||[]){
   if(localTopics.has(String(t.id)))errors.push('Duplicate topic ID '+t.id+' in unit '+u.id);localTopics.add(String(t.id));
   const key=u.id+'-'+t.id;if(!String(t.title||'').trim())errors.push('Topic '+key+' has no title.');
   for(const m of t.microtopics||[])if(!String(m.title||'').trim())errors.push('Micro-topic '+key+'-'+m.id+' has no title.');
  }
  const known=new Set((u.topics||[]).map(t=>String(t.id)));
  for(const p of u.parts||[])for(const id of p.topic_ids||[])if(!known.has(String(id)))errors.push('Part '+p.id+' points to missing topic '+id+' in unit '+u.id);
 }
 return errors;
}
async function save(){
 if(busy)return;applyFields();const errors=validate();if(errors.length){status('Validation failed: '+errors.slice(0,8).join(' · '));return}
 if(!window.NETPSY_AUTH?.githubWrite){status('Secure GitHub bridge unavailable. Sign in again.');return}
 busy=true;draw();status('Creating review branch…');
 const branch=PREFIX+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z').toLowerCase();
 try{
  await window.NETPSY_AUTH.githubWrite('create_branch',{branch_name:branch,base_ref:BASE});
  await window.NETPSY_AUTH.githubWrite('write_file',{path:'data/syllabus-index.json',content:JSON.stringify(syllabus,null,2)+'\n',message:'Admin: edit syllabus structure',branch});
  const pr=await window.NETPSY_AUTH.githubWrite('create_pull_request',{head:branch,base:BASE,title:'Review syllabus structure edits',body:'## Syllabus structure editor\n\n- Edits to unit/part/topic/micro-topic labels and descriptions.\n- Part/topic order changes are preserved.\n- IDs and topic-to-part mappings are validated.\n- Please review the syllabus hierarchy and learner-facing navigation before merging.\n\nGenerated by the owner-only Content Audit editor.'});
  dirty=false;status('Review PR created: '+(pr?.url||pr?.html_url||'open the repository Pull Requests tab')+'. Changes are not live until reviewed and merged.');
 }catch(e){status('Could not create review PR: '+String(e.message||e)+'. No changes were intentionally written to main.')}
 finally{busy=false;draw()}
}
async function load(discard=false){
 if(dirty&&!discard&&!confirm('Discard unsaved structure edits?'))return;
 status('Loading canonical syllabus…');
 try{const r=await fetch('./data/syllabus-index.json?structure-editor='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Syllabus file returned HTTP '+r.status);syllabus=await r.json();dirty=false;draw();status('Loaded canonical syllabus. Edits remain local until you create a review PR.')}
 catch(e){status('Could not load syllabus: '+e.message)}
}
function mount(){
 if(!root||!root.querySelector('.admin-hero')||root.querySelector('#syllabusStructureEditor'))return;
 const section=document.createElement('section');section.className='card admin-structure-editor';section.innerHTML='<div class="eyebrow">LIVE STRUCTURE EDITOR</div><h2>Edit syllabus hierarchy</h2><p>Make changes in the current browser session, validate IDs and mappings, then create a GitHub pull request. This does not publish directly to learners.</p><div id="structureStatus" class="admin-status-note" aria-live="polite"></div><div id="syllabusStructureEditor"><p>Loading…</p></div>';
 const target=root.querySelector('#contentTaskBox');if(target)target.insertAdjacentElement('afterend',section);else root.prepend(section);load();
}
const observer=new MutationObserver(mount);observer.observe(root,{childList:true,subtree:true});mount();
})();
