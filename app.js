(function(){
'use strict';
const $=s=>document.querySelector(s);
const qsa=s=>Array.from(document.querySelectorAll(s));
function initMobileNavigation(){
  const toggle=document.querySelector('.menu-toggle');
  const nav=document.querySelector('#site-navigation');
  if(!toggle||!nav||toggle.dataset.menuReady==='1') return;
  toggle.dataset.menuReady='1';
  const close=()=>{document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')};
  const open=()=>{document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation')};
  toggle.addEventListener('click',()=>document.body.classList.contains('menu-open')?close():open());
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('click',e=>{if(!document.body.classList.contains('menu-open'))return;if(!toggle.contains(e.target)&&!nav.contains(e.target))close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>820)close()},{passive:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initMobileNavigation,{once:true}); else initMobileNavigation();
const Q=new URLSearchParams(location.search); let D=null,PRACTICE_QUESTIONS=[],PRACTICE_EXPLANATIONS={};
const KEY='netPsychProgress';
const DATA_VERSION=window.NETPSY_DATA_VERSION||'2026-10-03-unit-descriptions-v1';
let STATE_CACHE=null,QUICK_BANK_CACHE=null;
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Could not load '+src));
    document.head.appendChild(s);
  });
}

async function loadStudyData(){
  let json=window.NETPSY_DATA||null;
  if(!json){
    try{
      const response=await fetch('./data.json?v='+DATA_VERSION+'',{cache:'default'});
      if(!response.ok) throw new Error('Study data request failed: '+response.status);
      json=await response.json();
    }catch(fetchError){
      console.warn('Study data JSON fetch failed; falling back to browser bundle.',fetchError);
      await loadScript('./data.js?v='+DATA_VERSION+'');
      json=window.NETPSY_DATA||null;
    }
  }
  if(!json || !Array.isArray(json.units)) throw new Error('Study data has an invalid structure');
  try{
    const kr=await fetch('./kaplan_enrichment.json?v='+DATA_VERSION+'',{cache:'default'});
    if(kr.ok){
      const kp=await kr.json();
      const map=kp&&kp.microtopics&&typeof kp.microtopics==='object'?kp.microtopics:{};
      for(const u of json.units||[]) for(const t of u.topics||[]) for(const m of t.microtopics||[]){
        if(map[m.title]) m.kaplan_enrichment={source:kp.source?.title||'Kaplan AP Psychology Prep Plus',role:kp.source?.role||'Primary enrichment source',notes:map[m.title]};
      }
      json.kaplan_enrichment_meta=kp.source||null;
    }
  }catch(e){console.warn('Kaplan enrichment could not be loaded:',e)}
  try{
    const sr=await fetch('./study_sources.json?v='+DATA_VERSION,{cache:'default'});
    if(sr.ok) json.study_source_config=await sr.json();
  }catch(e){console.warn('Study source configuration could not be loaded:',e)}
  try{
    const sp=await fetch('./simply_psychology_enrichment.json?v='+DATA_VERSION,{cache:'default'});
    if(sp.ok){
      const cfg=await sp.json();
      const entries=Array.isArray(cfg?.topics)?cfg.topics:[];
      for(const u of json.units||[]) for(const t of u.topics||[]) for(const m of t.microtopics||[]){
        const title=String(m.title||'').toLowerCase();
        const match=entries.find(x=>x?.match&&title.includes(String(x.match).toLowerCase()));
        if(match?.notes) m.simply_psychology_enrichment={source:cfg.source?.title||'Simply Psychology',role:cfg.source?.role||'Selective web-based explanation and example layer',notes:match.notes};
      }
      json.simply_psychology_enrichment_meta=cfg.source||null;
    }
  }catch(e){console.warn('Simply Psychology enrichment could not be loaded:',e)}
  for(const u of json.units||[]) for(const t of u.topics||[]) for(const m of t.microtopics||[]){
    m.study_source_config=json.study_source_config||null;
  }
  D=json;
  // Render core UI immediately; optional enrichment must never block a usable page.
  if(document.body.dataset.page==='home'||document.body.dataset.page==='practice'||document.body.dataset.page==='practice-session'||document.body.dataset.page==='start') safeRender();
  if(document.body.dataset.page==='practice'||document.body.dataset.page==='practice-session'||document.body.dataset.page==='active-recall'||document.body.dataset.page==='daily-practice'){
    try{
      const pq=await fetch('./practice_questions.json?v=20261001-pyq1',{cache:'default'});
      if(pq.ok){const parsed=await pq.json();if(Array.isArray(parsed))PRACTICE_QUESTIONS=parsed;}
      try{const pe=await fetch('./practice_explanations.json?v=20261001-pyq1',{cache:'default'});if(pe.ok){const parsed=await pe.json();if(parsed&&typeof parsed==='object'){PRACTICE_EXPLANATIONS=parsed;PRACTICE_QUESTIONS=PRACTICE_QUESTIONS.map(q=>({...q,explanation:PRACTICE_EXPLANATIONS[q.id]||q.explanation}));}}}catch(e){console.warn('PYQ explanations could not be loaded:',e)}
    }catch(e){console.warn('PYQ bank could not be loaded:',e)}
    try{
      const mm=await fetch('./mcq_mapping.json?v='+DATA_VERSION,{cache:'default'});
      if(mm.ok){
        const map=await mm.json();
        const overrides=map&&map.question_overrides&&typeof map.question_overrides==='object'?map.question_overrides:{};
        PRACTICE_QUESTIONS=PRACTICE_QUESTIONS.map(q=>{
          const o=overrides[q.id];
          const base={...q,source_tags:Array.isArray(q.source_tags)&&q.source_tags.length?q.source_tags:['PYQ']};
          if(!o)return base;
          const parts=String(o.target||'').split('-').map(Number);
          if(parts.length!==3||parts.some(Number.isNaN))return {...base,source_tags:o.sources||base.source_tags,source_topic:o.topic||''};
          return {...base,unit:parts[0],topic:parts[1],micro:parts[2],source_tags:o.sources||base.source_tags,source_topic:o.topic||''};
        });
        json.mcq_mapping=map;
      }
    }catch(e){console.warn('MCQ mapping could not be loaded:',e)}
  }
  safeRender();
  return true;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state=()=>{if(STATE_CACHE)return STATE_CACHE;try{STATE_CACHE=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{STATE_CACHE={}}return STATE_CACHE};
const save=s=>{STATE_CACHE=s;localStorage.setItem(KEY,JSON.stringify(s));};
const key=(u,t,m)=>`${u}-${t}-${m}`;
const getP=k=>state()[k]||{status:'NEW',stage:0,lastCompletedStage:-1};
const setP=(k,patch)=>{const s=state();s[k]={...getP(k),...patch};save(s);return s[k]};
const units=()=>D?.units||[];
const all=()=>units().flatMap(u=>u.topics.flatMap(t=>t.microtopics.map(m=>({u,t,m,k:key(u.id,t.id,m.id)}))));
const find=()=>{const u=units().find(x=>String(x.id)===String(Q.get('unit'))),t=u?.topics.find(x=>String(x.id)===String(Q.get('topic'))),m=t?.microtopics.find(x=>String(x.id)===String(Q.get('micro')));return {u,t,m,k:u&&t&&m?key(u.id,t.id,m.id):null}};
const section=(s,a,b)=>{s=String(s||'');const i=s.indexOf(a);if(i<0)return '';const j=b?s.indexOf(b,i+a.length):-1;return s.slice(i+a.length,j<0?s.length:j).trim()};
const bullets=s=>String(s||'').split('\n').map(x=>x.trim().replace(/^[-•]\s*/,'')).filter(Boolean);
const normalizeNoteBlocks=(m,concept,kp,core,trap,hook)=>{
  const explicit=Array.isArray(m.study_notes)?m.study_notes:[];
  if(explicit.length)return explicit.map((b)=>({
    title:b?.title||b?.label||'Study note',
    content:Array.isArray(b?.content)?b.content.join('\n'):b?.content,
    type:b?.type||'note',
    source:b?.source||b?.sources||''
  })).filter(b=>String(b.content||'').trim());
  const blocks=[];
  const add=(title,content,type='note',source='')=>{if(String(content||'').trim())blocks.push({title,content,type,source})};
  add('Core idea',concept,'core');
  if(kp.length)add('Key points',kp,'list');
  const sourceNotes=m.source_notes&&typeof m.source_notes==='object'?m.source_notes:{};
  Object.entries(sourceNotes).forEach(([source,content])=>add(source,content,'source',source));
  add('Explanation & connections',core,'explanation');
  add('Apply it',m.application_question,'application');
  add('Exam focus',section(m.content_notes,'PYQ-STYLE PATTERN','\n\nCOMMON TRAP')||section(m.content_notes,'PYQ-STYLE PATTERN','\n\n5-MINUTE TEACHING FOCUS'),'exam');
  add('Common trap / distinction',trap,'trap');
  add('Teaching focus',section(m.content_notes,'5-MINUTE TEACHING FOCUS','\n\nMEMORY HOOK'),'teaching');
  add('Memory cue',hook,'memory');
  if(m.kaplan_enrichment?.notes)add(m.kaplan_enrichment.source||'Kaplan source note',m.kaplan_enrichment.notes,'source',m.kaplan_enrichment.source||'Kaplan');
  if(m.simply_psychology_enrichment?.notes)add(m.simply_psychology_enrichment.source||'Simply Psychology',m.simply_psychology_enrichment.notes,'source',m.simply_psychology_enrichment.source||'Simply Psychology');
  return blocks;
};
const studyNotesHTML=(m,concept,kp,core,trap,hook)=>{
  const blocks=normalizeNoteBlocks(m,concept,kp,core,trap,hook);
  const sourceConfig=m.study_source_config||{};
  const noteSources=Array.isArray(sourceConfig.notes_primary)?sourceConfig.notes_primary:[];
  const provenance=noteSources.length?'<div class="study-note-source-note">Primary learning sources: '+noteSources.map(esc).join(' · ')+'</div>':'';
  return '<div class="study-notes"><div class="study-note-intro"><span class="eyebrow">SOURCE-GROUNDED STUDY NOTES</span><h2>'+esc(m.title)+'</h2><p>Use only the parts you need: understand the idea, make the useful connection, then close the notes and recall it.</p></div>'+blocks.map(b=>{
    const content=Array.isArray(b.content)?'<ul class="study-note-list">'+b.content.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':esc(b.content);
    const cls=b.type==='trap'?'trap':b.type==='core'?'core':b.type==='exam'?'exam-focus':b.type==='memory'?'memory':'';
    const src=b.source?'<small class="study-note-source-label">'+esc(Array.isArray(b.source)?b.source.join(' · '):b.source)+'</small>':'';
    return '<section class="study-note-block '+cls+'"><h3>'+esc(b.title)+'</h3>'+src+'<div class="study-note-text">'+content+'</div></section>';
  }).join('')+provenance+'</div>';
};
const date=x=>x?new Date(x).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Not scheduled';
const countMicro=u=>u.topics.reduce((n,t)=>n+t.microtopics.length,0);
const unitParts=u=>Array.isArray(u?.parts)?u.parts:[];
const partForTopic=(u,t)=>unitParts(u).find(p=>Array.isArray(p.topic_ids)&&p.topic_ids.map(String).includes(String(t?.id)))||null;
function sourceEntries(m){return (m.sources||[]).map(id=>D.source_library?.find(s=>s.id===id)).filter(Boolean)}
function sourceNames(m){return sourceEntries(m).map(s=>s.title)}
function isStartedProgress(p){return !!(p&&((p.status&&p.status!=='NEW')||p.started===true||p.startedAt||p.understanding||p.application||p.last||p.lastRevision))}
function startedMicrotopics(){return all().filter(x=>isStartedProgress(getP(x.k)))}
function progressSummary(){const ps=all().map(x=>getP(x.k)),total=all().length,started=ps.filter(isStartedProgress).length,learned=ps.filter(p=>p.learnedAt||p.recallCompletedAt).length,mastered=ps.filter(p=>p.status==='MASTERED').length,revisionScheduled=ps.filter(p=>p.revisionCount>0||p.next||p.lastRevision).length,answered=ps.flatMap(p=>p.mcqHistory||[]),practice=state()._practiceHistory||[],allAnswers=answered.concat(practice),correct=allAnswers.filter(x=>x.correct).length;return {total,started,learned,mastered,revisionScheduled,coverage:total?Math.round(learned/total*100):0,mastery:learned?Math.round(mastered/learned*100):0,retention:learned?Math.round(revisionScheduled/learned*100):0,accuracy:allAnswers.length?Math.round(correct/allAnswers.length*100):0,answers:allAnswers.length}}
function progressTopicSummary(){const topics=units().flatMap(u=>(u.topics||[]).map(t=>({u,t,microtopics:t.microtopics||[]})));const touched=topics.filter(x=>x.microtopics.some(m=>isStartedProgress(getP(key(x.u.id,x.t.id,m.id)))));const mastered=topics.filter(x=>x.microtopics.length>0&&x.microtopics.every(m=>getP(key(x.u.id,x.t.id,m.id)).status==='MASTERED'));const revised=topics.filter(x=>x.microtopics.some(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return (p.revisionCount||0)>0||!!p.lastRevision}));const pending=topics.filter(x=>x.microtopics.some(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return !!p.next&&Date.parse(p.next)<=Date.now()}));const notRevision=topics.filter(x=>x.microtopics.every(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return !(p.revisionCount>0||p.next||p.lastRevision)}));return {total:topics.length,touched:touched.length,mastered:mastered.length,untouched:topics.length-touched.length,revised:revised.length,pending:pending.length,notRevision:notRevision.length}}
function progress(){
  const s=progressSummary(),topics=progressTopicSummary(),due=dueItems().length;
  const started=s.started,total=s.total,interpretation=progressInterpretation(s);
  const nextAction=due?{label:'Start Revision',href:'revision.html',note:due+' concept'+(due===1?'':'s')+' ready for another pass.'}:started<total?{label:'Continue Learning',href:'unit.html?id=1',note:'Build your foundation one concept at a time. Continue from the learning path, work through the explanation, check your understanding with Active Recall, and then move forward. Completing this cycle helps turn a concept from something you have read into something you can recall and use in questions.'}:{label:'Practice Questions',href:'practice.html',note:'Use recall and application to test what you know.'};
  const errorRate=s.answers?100-s.accuracy:0;
  $('#progressApp').innerHTML=`<section class="page-hero progress-hero"><div class="eyebrow">PROGRESS</div><h1>See how your learning is building.</h1><p>See what you have explored, what you can recall, how you are performing in questions, and how consistently you are returning to what you have learned.</p></section>
  <section class="progress-signals"><div class="section-head"><div><div class="eyebrow">YOUR LEARNING SIGNALS</div><h2>Look at the pattern, not just the numbers.</h2><p class="page-guidance">These signals show different parts of your learning process. Use them together to understand where your learning is becoming secure and where it needs more work.</p></div></div>
    <div class="progress-category-stack">
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">LEARNING</div><h2>Build your understanding across the syllabus.</h2><p>See how many topics you have started, mastered, or have not touched yet.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Mastered</span><strong>${topics.mastered}</strong><small>all micro-topics in the topic mastered</small></div>
        <div class="progress-indicator"><span>Topics Explored</span><strong>${topics.touched}</strong><small>at least one micro-topic started</small></div>
        <div class="progress-indicator"><span>Topics Not Touched Yet</span><strong>${topics.untouched}</strong><small>no micro-topic started yet</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">REVISION</div><h2>Keep important concepts coming back.</h2><p>See which topics have entered revision, which are currently due, and which have not entered the process yet.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Revised</span><strong>${topics.revised}</strong><small>revision activity recorded</small></div>
        <div class="progress-indicator"><span>Topics Pending for Revision</span><strong>${topics.pending}</strong><small>revision currently due</small></div>
        <div class="progress-indicator"><span>Topics Not Yet in Revision Process</span><strong>${topics.notRevision}</strong><small>no revision checkpoint recorded</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">PRACTICE</div><h2>See how well you are applying what you know.</h2><p>Use your question performance to see accuracy, errors, and the amount of practice completed.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Accuracy</span><strong>${s.accuracy}%</strong><small>answered questions correct</small></div>
        <div class="progress-indicator"><span>Error Rate</span><strong>${errorRate}%</strong><small>answered questions incorrect</small></div>
        <div class="progress-indicator"><span>Total Questions Attempted</span><strong>${s.answers}</strong><small>questions answered across practice</small></div>
      </div></section>
    </div>
  </section>
  <section class="progress-analysis panel"><div class="eyebrow">WHAT YOUR PROGRESS TELLS YOU</div><h2>${interpretation.title}</h2><p>${interpretation.note}</p><ul>${interpretation.focus.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></section>
  <section class="progress-next card"><div><div class="eyebrow">WHAT SHOULD YOU DO NEXT?</div><p>${nextAction.note}</p></div><a class="btn primary" href="${nextAction.href}">${nextAction.label} <span>→</span></a></section>`;
}
function progressInterpretation(s){
  if(!s.started) return {title:'Start with understanding, then build recall.',note:'You have not started any micro-topics yet. Use Learn to build your foundation, then use recall and practice to turn new understanding into something you can recall.',focus:['Build syllabus coverage','Use active recall after learning','Schedule revision after completing a concept']};
  if(s.coverage>=s.mastery+25 && s.coverage>=25) return {title:'Your coverage is ahead of your mastery.',note:'You have explored more concepts than you have secured. This is a useful point to slow down, recall what you know, and revisit concepts that are not yet stable.',focus:['Strengthen concept mastery','Use recall before reopening notes','Return through scheduled revision']};
  if(s.answers>=10 && s.accuracy<60) return {title:'Your question performance needs more attention.',note:'Your answered questions show that application is currently less secure than it needs to be. Use Practice to identify whether errors come from concept gaps, similar theories, or difficulty applying what you know.',focus:['Review missed questions','Revisit the linked concepts','Practise again after learning from the errors']};
  if(s.started>=10 && s.revisionScheduled<s.started*0.5) return {title:'Your learning needs more scheduled revision.',note:'You have started learning several concepts, but fewer than half have a revision checkpoint recorded. Use spaced revision so important ideas return after you have had time away from them.',focus:['Schedule revision after learning','Recall before checking explanations','Keep returning to concepts over time']};
  if(s.mastery>=s.coverage*0.75 && s.retention<50) return {title:'Your concepts are being mastered, but spaced return is still developing.',note:'Your mastery signal is relatively strong compared with your coverage, while fewer started concepts have a scheduled revision checkpoint. Keep returning to older concepts rather than only adding new ones.',focus:['Use scheduled revision','Mix older and newer concepts','Check recall before reviewing']};
  return {title:'Your learning is building across the main stages.',note:'Your signals show activity across learning, mastery, questions, and revision. Keep using the full cycle rather than relying on one study method alone.',focus:['Continue learning new concepts','Test recall and application','Return through spaced revision']};
}
function render(){
  const page=document.body?.dataset?.page||'';
  document.querySelectorAll('.nav-link[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===(page==='practice-session'?'practice':page)));
  const routes={home,learn:learnPage,learner:learnerPage,'deep-dive':deepDive,'active-recall':activeRecall,start:startPage,daily3,'daily-practice':dailyPractice,unit:unitPage,topic:topicPage,microtopic:micro,practice, 'practice-session':practice,revision,progress};
  const fn=routes[page];
  if(typeof fn==='function') fn();
  else console.warn('No renderer registered for page:',page);
}
function safeRender(){
  try{render()}catch(err){
    console.error('NET Psychology page render failed:',err);
    const root=document.querySelector('#practiceApp,#practiceSessionApp,#startPage,#homeHero,#revisionApp');
    if(root&&!root.innerHTML.trim()) root.innerHTML='<section class="panel empty"><h1>This section could not be rendered.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" onclick="location.reload()">Retry</button></section>';
  }
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
loadStudyData().catch(err=>{
  console.error('NET Psychology data loading failed:',err);
  if(D&&Array.isArray(D.units)) {
    const pageRoot=document.querySelector('#practiceApp,#startPage,#homeHero,#revisionApp');
    if(pageRoot&&!pageRoot.innerHTML.trim()) pageRoot.innerHTML='<section class="panel empty"><h1>This section could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" onclick="location.reload()">Retry</button></section>';
    return;
  }
  const shell=document.querySelector('main.shell');
  if(shell) shell.innerHTML='<section class="panel empty"><h1>Study data could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" onclick="location.reload()">Retry</button></section>';
});
})();function progress(){
  const s=progressSummary(),topics=progressTopicSummary(),due=dueItems().length;
  const started=s.started,total=s.total,interpretation=progressInterpretation(s);
  const nextAction=due?{label:'Start Revision',href:'revision.html',note:due+' concept'+(due===1?'':'s')+' ready for another pass.'}:started<total?{label:'Continue Learning',href:'unit.html?id=1',note:'Build your foundation one concept at a time. Continue from the learning path, work through the explanation, check your understanding with Active Recall, and then move forward. Completing this cycle helps turn a concept from something you have read into something you can recall and use in questions.'}:{label:'Practice Questions',href:'practice.html',note:'Use recall and application to test what you know.'};
  const errorRate=s.answers?100-s.accuracy:0;
  $('#progressApp').innerHTML=`<section class="page-hero progress-hero"><div class="eyebrow">PROGRESS</div><h1>See how your learning is building.</h1><p>See what you have explored, what you can recall, how you are performing in questions, and how consistently you are returning to what you have learned.</p></section>
  <section class="progress-signals"><div class="section-head"><div><div class="eyebrow">YOUR LEARNING SIGNALS</div><h2>Look at the pattern, not just the numbers.</h2><p class="page-guidance">These signals show different parts of your learning process. Use them together to understand where your learning is becoming secure and where it needs more work.</p></div></div>
    <div class="progress-category-stack">
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">LEARNING</div><h2>Build your understanding across the syllabus.</h2><p>See how many topics you have started, mastered, or have not touched yet.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Mastered</span><strong>${topics.mastered}</strong><small>all micro-topics in the topic mastered</small></div>
        <div class="progress-indicator"><span>Topics Explored</span><strong>${topics.touched}</strong><small>at least one micro-topic started</small></div>
        <div class="progress-indicator"><span>Topics Not Touched Yet</span><strong>${topics.untouched}</strong><small>no micro-topic started yet</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">REVISION</div><h2>Keep important concepts coming back.</h2><p>See which topics have entered revision, which are currently due, and which have not entered the process yet.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Revised</span><strong>${topics.revised}</strong><small>revision activity recorded</small></div>
        <div class="progress-indicator"><span>Topics Pending for Revision</span><strong>${topics.pending}</strong><small>revision currently due</small></div>
        <div class="progress-indicator"><span>Topics Not Yet in Revision Process</span><strong>${topics.notRevision}</strong><small>no revision checkpoint recorded</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">PRACTICE</div><h2>See how well you are applying what you know.</h2><p>Use your question performance to see accuracy, errors, and the amount of practice completed.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Accuracy</span><strong>${s.accuracy}%</strong><small>answered questions correct</small></div>
        <div class="progress-indicator"><span>Error Rate</span><strong>${errorRate}%</strong><small>answered questions incorrect</small></div>
        <div class="progress-indicator"><span>Total Questions Attempted</span><strong>${s.answers}</strong><small>questions answered across practice</small></div>
      </div></section>
    </div>
  </section>
  <section class="progress-analysis panel"><div class="eyebrow">WHAT YOUR PROGRESS TELLS YOU</div><h2>${interpretation.title}</h2><p>${interpretation.note}</p><ul>${interpretation.focus.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></section>
  <section class="progress-next card"><div><div class="eyebrow">WHAT SHOULD YOU DO NEXT?</div><p>${nextAction.note}</p></div><a class="btn primary" href="${nextAction.href}">${nextAction.label} <span>→</span></a></section>`;
}
