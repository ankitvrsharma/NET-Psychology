(function(){
'use strict';
const $=s=>document.querySelector(s);
const Q=new URLSearchParams(location.search); let D=null,PRACTICE_QUESTIONS=[],PRACTICE_EXPLANATIONS={};
const KEY='netPsychProgress';
const DATA_VERSION=window.NETPSY_DATA_VERSION||'2026-10-02-unit-parts-v1';
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
  for(const u of json.units||[]) for(const t of u.topics||[]) for(const m of t.microtopics||[]){
    m.study_source_config=json.study_source_config||null;
  }
  D=json;
  // Render core UI immediately; optional enrichment must never block a usable page.
  if(document.body.dataset.page==='home'||document.body.dataset.page==='practice'||document.body.dataset.page==='start') render();
  if(document.body.dataset.page==='practice'){
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
  render();
  return true;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state=()=>{if(STATE_CACHE)return STATE_CACHE;try{STATE_CACHE=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{STATE_CACHE={}}return STATE_CACHE};
const validBackup=x=>{if(!x||typeof x!=='object'||x.version!==1||!x.progress||typeof x.progress!=='object'||Array.isArray(x.progress))return false;const allowed=new Set(['NEW','LEARNING','RETENTION','MASTERED']);return Object.entries(x.progress).every(([k,v])=>{if(k==='_practiceHistory'||k==='_practiceStats')return Array.isArray(v)||typeof v==='object';if(!/^\\d+-\\d+-\\d+$/.test(k)||!v||typeof v!=='object'||Array.isArray(v))return false;if(v.status&&!allowed.has(v.status))return false;return true})};
const save=s=>{STATE_CACHE=s;localStorage.setItem(KEY,JSON.stringify(s));};
const key=(u,t,m)=>`${u}-${t}-${m}`;
const getP=k=>state()[k]||{status:'NEW',stage:0,lastCompletedStage:-1};
const setP=(k,patch)=>{const s=state();s[k]={...getP(k),...patch};save(s);return s[k]};
const units=()=>D?.units||[];
const all=()=>units().flatMap(u=>u.topics.flatMap(t=>t.microtopics.map(m=>({u,t,m,k:key(u.id,t.id,m.id)}))));
const find=()=>{const u=units().find(x=>String(x.id)===String(Q.get('unit'))),t=u?.topics.find(x=>String(x.id)===String(Q.get('topic'))),m=t?.microtopics.find(x=>String(x.id)===String(Q.get('micro')));return {u,t,m,k:u&&t&&m?key(u.id,t.id,m.id):null}};
const section=(s,a,b)=>{s=String(s||'');const i=s.indexOf(a);if(i<0)return '';const j=b?s.indexOf(b,i+a.length):-1;return s.slice(i+a.length,j<0?s.length:j).trim()};
const bullets=s=>String(s||'').split('\n').map(x=>x.trim().replace(/^[-•]\s*/,'')).filter(Boolean);
const stripLegacy=s=>String(s||'').replace(/\nPYQ-STYLE PATTERN[\s\S]*?(?=\nCOMMON TRAP|\n5-MINUTE TEACHING FOCUS|\nMEMORY HOOK|$)/,'').replace(/\nCOMMON TRAP[\s\S]*?(?=\n5-MINUTE TEACHING FOCUS|\nMEMORY HOOK|$)/,'').replace(/\n5-MINUTE TEACHING FOCUS[\s\S]*?(?=\nMEMORY HOOK|$)/,'').replace(/\nMEMORY HOOK[\s\S]*?$/,'').trim();
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
  return blocks;
};
const studyNotesHTML=(m,concept,kp,core,trap,hook)=>{
  const blocks=normalizeNoteBlocks(m,concept,kp,core,trap,hook);
  const sourceConfig=m.study_source_config||{};
  const noteSources=Array.isArray(sourceConfig.notes_primary)?sourceConfig.notes_primary:[];
  const provenance=noteSources.length?'<div class="study-note-source-note">Primary learning sources: '+noteSources.map(esc).join(' · ')+'</div>':'';
  return '<div class="study-notes"><div class="study-note-intro"><span class="eyebrow">SOURCE-GROUNDED STUDY NOTES</span><h2>'+esc(m.title)+'</h2><p>Use only the parts you need: understand the idea, make the useful connection, then close the notes and retrieve it.</p></div>'+blocks.map(b=>{
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
function progressSummary(){const ps=all().map(x=>getP(x.k)),total=all().length,started=ps.filter(isStartedProgress).length,mastered=ps.filter(p=>p.status==='MASTERED').length,delayed=ps.filter(p=>p.delayedRetention).length,answered=ps.flatMap(p=>p.mcqHistory||[]),practice=state()._practiceHistory||[],allAnswers=answered.concat(practice),correct=allAnswers.filter(x=>x.correct).length;return {total,started,mastered,delayed,coverage:total?Math.round(started/total*100):0,mastery:total?Math.round(mastered/total*100):0,retention:started?Math.round(delayed/started*100):0,accuracy:allAnswers.length?Math.round(correct/allAnswers.length*100):0,answers:allAnswers.length}}
function startPage(){
  document.title='Start Learning — UGC NET Psychology';
  const root=$('#startPage');
  if(!root)return;
  root.innerHTML=\`<section class="start-hero"><div class="eyebrow">START YOUR LEARNING JOURNEY</div><h1>Let’s understand how you learn best.</h1><p>A short profile helps us shape your starting experience. You can change your answers later.</p></section>
  <form class="start-form" id="startForm">
    <div class="start-progress"><span>1 of 4</span><i><b style="width:25%"></b></i></div>
    <div class="start-step active" data-step="1"><fieldset><legend>1. Where are you starting from?</legend>
      <label><input type="radio" name="experience" value="new-net" required><span>I’m new to UGC NET Psychology</span></label>
      <label><input type="radio" name="experience" value="psych-new-net"><span>I know Psychology but I’m new to NET preparation</span></label>
      <label><input type="radio" name="experience" value="prepared"><span>I’ve prepared for NET before</span></label>
      <label><input type="radio" name="experience" value="appeared"><span>I’ve appeared for NET before</span></label>
      <label><input type="radio" name="experience" value="revision"><span>I mainly need revision and practice</span></label>
    </fieldset></div>
    <div class="start-step" data-step="2"><fieldset><legend>2. How confident do you currently feel?</legend>
      <label><input type="radio" name="confidence" value="1" required><span>I struggle with most concepts</span></label>
      <label><input type="radio" name="confidence" value="2"><span>I know some basics</span></label>
      <label><input type="radio" name="confidence" value="3"><span>I understand many topics</span></label>
      <label><input type="radio" name="confidence" value="4"><span>I’m fairly confident</span></label>
      <label><input type="radio" name="confidence" value="5"><span>I can explain and apply most concepts</span></label>
    </fieldset></div>
    <div class="start-step" data-step="3"><fieldset><legend>3. What are your biggest challenges?</legend><p class="start-help">Choose up to 2.</p>
      <label><input type="checkbox" name="challenge" value="0"><span>Understanding difficult concepts</span></label><label><input type="checkbox" name="challenge" value="1"><span>Remembering what I study</span></label><label><input type="checkbox" name="challenge" value="2"><span>Confusing similar theories or concepts</span></label><label><input type="checkbox" name="challenge" value="3"><span>Applying concepts to situations</span></label><label><input type="checkbox" name="challenge" value="4"><span>Solving MCQs and PYQs</span></label><label><input type="checkbox" name="challenge" value="5"><span>Revising consistently</span></label><label><input type="checkbox" name="challenge" value="6"><span>Knowing what to study next</span></label><label><input type="checkbox" name="challenge" value="7"><span>Managing the large syllabus</span></label>
    </fieldset></div>
    <div class="start-step" data-step="4"><fieldset><legend>4. What helps you learn best?</legend><p class="start-help">Choose up to 3. These are preferences, not fixed learning styles.</p>
      <label><input type="checkbox" name="preference" value="0"><span>Clear explanations</span></label><label><input type="checkbox" name="preference" value="1"><span>Examples and applications</span></label><label><input type="checkbox" name="preference" value="2"><span>Active-recall questions</span></label><label><input type="checkbox" name="preference" value="3"><span>MCQs and PYQs</span></label><label><input type="checkbox" name="preference" value="4"><span>Visual summaries</span></label><label><input type="checkbox" name="preference" value="5"><span>Short revision notes</span></label><label><input type="checkbox" name="preference" value="6"><span>Comparisons between similar concepts</span></label>
    </fieldset></div>
    <div class="start-actions"><button class="btn" type="button" id="startBack" hidden>← Back</button><button class="btn primary" type="button" id="startNext">Next →</button></div>
  </form>\`;
  const form=$('#startForm'),steps=$('.start-step'),progress=form.querySelector('.start-progress'),next=$('#startNext'),back=$('#startBack'); let current=0;
  const update=()=>{steps.forEach((s,i)=>s.classList.toggle('active',i===current));progress.querySelector('span').textContent=(current+1)+' of '+steps.length;progress.querySelector('b').style.width=((current+1)/steps.length*100)+'%';back.hidden=current===0;next.textContent=current===steps.length-1?'Create my learning profile →':'Next →';};
  form.addEventListener('change',e=>{
    if(e.target.name==='challenge' && form.querySelectorAll('input[name="challenge"]:checked').length>2)e.target.checked=false;
    if(e.target.name==='preference' && form.querySelectorAll('input[name="preference"]:checked').length>3)e.target.checked=false;
  });
  const valid=()=>{const active=steps[current]; if(current<2)return !!active.querySelector('input[required]:checked'); return current===2?form.querySelectorAll('input[name="challenge"]:checked').length>0:form.querySelectorAll('input[name="preference"]:checked').length>0;};
  next.addEventListener('click',()=>{
    if(!valid()){alert(current===2?'Choose at least one challenge.':current===3?'Choose at least one preference.':'Please select an answer to continue.');return;}
    if(current<steps.length-1){current++;update();window.scrollTo({top:0,behavior:'smooth'});return;}
    const data={experience:form.querySelector('[name="experience"]:checked').value,confidence:form.querySelector('[name="confidence"]:checked').value,challenges:Array.from(form.querySelectorAll('[name="challenge"]:checked')).map(x=>x.value),learningPreferences:Array.from(form.querySelectorAll('[name="preference"]:checked')).map(x=>x.value),created:new Date().toISOString(),updated:new Date().toISOString()};
    localStorage.setItem('netPsychStartProfile',JSON.stringify(data));
    root.innerHTML='<section class="start-profile card"><div class="eyebrow">YOUR LEARNING PROFILE</div><h2>Profile created.</h2><p>Your starting path will focus on understanding, active recall, application, practice and spaced revision.</p><div class="start-profile-actions"><a class="btn primary" href="'+((data.experience==='revision')?'revision.html':(data.experience==='prepared'||data.experience==='appeared')?'practice.html':'learn.html')+'">START MY LEARNING PATH →</a><a class="btn" href="learn.html">EXPLORE ALL UNITS</a></div></section>';
  });
  back.addEventListener('click',()=>{if(current>0){current--;update();window.scrollTo({top:0,behavior:'smooth'});}});
  update();
}function learnPage(){
  document.title='Learn — UGC NET Psychology';
  const resume=all().filter(x=>{const p=getP(x.k);return p.status&&p.status!=='NEW'}).sort((a,b)=>new Date(getP(b.k).lastRevision||0)-new Date(getP(a.k).lastRevision||0))[0];
  const countNode=document.querySelector('#learnMicroCount');if(countNode)countNode.textContent=all().length+' micro-topics';
  const stats=u=>{
    const items=u.topics.flatMap(t=>t.microtopics.map(m=>getP(key(u.id,t.id,m.id))));
    const started=items.filter(p=>p.status&&p.status!=='NEW').length;
    const mastered=items.filter(p=>p.status==='MASTERED').length;
    const due=items.filter(p=>p.next&&new Date(p.next)<=new Date()).length;
    return {started,mastered,due,total:items.length,percent:items.length?Math.round(started/items.length*100):0};
  };
  const draw=q=>{
    q=(q||'').trim().toLowerCase();
    const list=units().filter(u=>!q||JSON.stringify({title:u.title,description:u.description,topics:u.topics.map(t=>({title:t.title,explanation:t.explanation}))}).toLowerCase().includes(q));
    $('#learnUnits').innerHTML=list.map(u=>{
      const s=stats(u);
      return `<a class="learn-unit-card" href="unit.html?id=${u.id}"><div class="learn-unit-top"><span class="eyebrow">UNIT ${String(u.id).padStart(2,'0')}</span><span class="learn-unit-arrow">→</span></div><h2>${esc(u.title)}</h2><p>${esc(u.description||'Explore this part of the Psychology syllabus.')}</p><div class="learn-unit-progress"><div><span>${s.started}/${s.total} concepts started</span><b>${s.percent}%</b></div><div class="bar"><i style="width:${s.percent}%"></i></div></div><div class="learn-unit-meta"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span>${unitParts(u).length?`<span>${unitParts(u).length} parts</span>`:''}${s.due?'<span class="learn-due">'+s.due+' due</span>':''}</div><span class="link">${s.started?'Continue unit':'Start unit'} <b>→</b></span></a>`;
    }).join('')||'<div class="panel empty"><h3>No units found</h3><p>Try a different search.</p></div>';
  };
  const r=document.querySelector('#learnResume');
  if(resume){
    r.innerHTML=`<div><div class="eyebrow">YOUR CURRENT POSITION</div><strong>${esc(resume.m.title)}</strong><span>${esc(resume.t.title)} · Unit ${resume.u.id}</span></div><a class="btn primary" href="microtopic.html?unit=${resume.u.id}&topic=${resume.t.id}&micro=${resume.m.id}">Resume →</a>`;
    r.hidden=false;
  }else r.hidden=true;
  draw('');
  $('#learnSearch')?.addEventListener('input',e=>draw(e.target.value));
}function cycleForFallback(date){
  const july=date.getMonth()===6;
  return {label:'July '+date.getFullYear()+' cycle',dateLabel:july?'1 July '+date.getFullYear():'1 December '+date.getFullYear()};
}
function renderNetCountdown(summary=progressSummary()){
  const root=$('#netCountdown');
  if(!root)return;
  const coverage=summary.coverage||0,total=summary.total||0,started=summary.started||0;
  fetch('./exam_schedule.json?v='+DATA_VERSION,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{
    const configured=cfg?.next_exam||{},now=new Date();
    let exam={...configured};
    let target=exam.start_date?new Date(exam.start_date+'T00:00:00+05:30'):null;
    if(!target||Number.isNaN(target.getTime())||target<=now){
      const future=now.getMonth()<6?new Date(now.getFullYear(),6,1):new Date(now.getFullYear(),11,1);
      if(future<=now)future.setFullYear(future.getFullYear()+1);
      const cycle=cycleForFallback(future);
      exam={label:'UGC NET '+cycle.label,start_date:future.getFullYear()+'-'+String(future.getMonth()+1).padStart(2,'0')+'-'+String(future.getDate()).padStart(2,'0'),status:'fallback'};
      target=future;
    }
    const cycleLabel=String(exam.label||'UGC NET cycle').replace(/^UGC NET\s*/i,'');
    const status=exam.status||(exam.tentative===true?'tentative':'confirmed');
    const statusText=status==='confirmed'?'Confirmed date':status==='tentative'?'Tentative date':'Reference date';
    const update=()=>{
      const diff=Math.max(0,target-new Date()),days=Math.ceil(diff/86400000);
      const dateText=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(target);
      root.innerHTML='<div class="net-countdown-inner"><div class="exam-status-head"><div class="eyebrow">EXAM READINESS</div><span>UGC NET PSYCHOLOGY</span></div><div class="net-countdown-copy"><div class="eyebrow">NEXT UGC NET</div><strong>'+days+' <span>DAYS TO GO</span></strong><p>'+esc(cycleLabel)+' · '+statusText+': '+dateText+'</p></div><div class="syllabus-coverage"><div class="eyebrow">SYLLABUS COVERAGE</div><strong>'+coverage+'%</strong><div class="coverage-bar"><i style="width:'+coverage+'%"></i></div><span>'+started+' of '+total+' micro-topics started</span></div></div>';
    };
    update();
    clearInterval(window.__netCountdownTimer);window.__netCountdownTimer=setInterval(update,60000);
  }).catch(()=>{
    const now=new Date(),future=now.getMonth()<6?new Date(now.getFullYear(),6,1):new Date(now.getFullYear(),11,1);
    if(future<=now)future.setFullYear(future.getFullYear()+1);
    const cycle=cycleForFallback(future),days=Math.ceil(Math.max(0,future-now)/86400000);
    root.innerHTML='<div class="net-countdown-inner"><div class="exam-status-head"><div class="eyebrow">EXAM READINESS</div><span>UGC NET PSYCHOLOGY</span></div><div class="net-countdown-copy"><div class="eyebrow">NEXT UGC NET</div><strong>'+days+' <span>DAYS TO GO</span></strong><p>UGC NET '+esc(cycle.label)+' · Reference date: '+esc(cycle.dateLabel)+'</p></div><div class="syllabus-coverage"><div class="eyebrow">SYLLABUS COVERAGE</div><strong>'+coverage+'%</strong><div class="coverage-bar"><i style="width:'+coverage+'%"></i></div><span>'+started+' of '+total+' micro-topics started</span></div></div>';
  });
}
function quickClean(x){return String(x||'').replace(/^[-•*]\s*/,'').replace(/\s+/g,' ').trim()}
function quickStudyParts(m){const d=String(m.deep_learning||''),n=String(m.content_notes||''),core=quickClean(section(d,'ACADEMIC CORE','\n\nKEY POINTS')||section(n,'CORE CONCEPT','\n\nKEY POINTS')||m.title),points=bullets(section(d,'KEY POINTS','\n\nDISTINCTION / CAUTION')||section(n,'KEY POINTS','\n\nPYQ-STYLE PATTERN')).map(quickClean).filter(Boolean),dist=quickClean(section(d,'DISTINCTION / CAUTION','\n\nSOURCE BASIS')||section(n,'COMMON EXAM TRAP','\n\nMEMORY CUE')||section(n,'COMMON TRAP','\n\n5-MINUTE TEACHING FOCUS')),exam=quickClean(m.exam_takeaway||''),hook=quickClean(section(n,'MEMORY CUE')||'');return{core,points,dist,exam,hook}}
function quickClassify(t,x){const s=(t+' '+x).toLowerCase();if(/\b(timeline|history|development of|origin|emergence|chronology)\b/.test(s))return'TIMELINE';if(/\b(study|experiment|finding|effect|law|principle)\b/.test(s))return'FINDING';if(/\b(vs\.?|versus|difference|distinguish|distinction|compared with)\b/.test(s))return'DISTINCTION';if(/\b(psychologist|theorist|contribution)\b/.test(s))return'PSYCHOLOGIST';if(/\b(school|structuralism|functionalism|gestalt|behavio(u)rism|psychoanalysis|humanistic psychology)\b/.test(s))return'SCHOOL';if(/\b(approach|therapy|perspective)\b/.test(s))return'APPROACH';if(/\b(theory|model|framework)\b/.test(s))return'THEORY';return'CONCEPT'}
function quickSources(m){return[...new Set(sourceNames(m).concat((m.study_source_config||{}).notes_primary||[]).filter(Boolean))]}
function quickVisual(m,k,p){const t=String(m.title||'').toLowerCase(),s=(t+' '+p.join(' ')).toLowerCase();if(/shape constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-shape-stage"><span class="qv-coin circle"></span><span class="qv-coin ellipse"></span><span class="qv-arrow">→</span><span class="qv-coin ellipse tilted"></span></div><div class="qv-caption"><b>RETINAL IMAGE</b><span>viewing angle changes the image; perceived shape remains stable</span></div></div>';if(/size constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-size-stage"><span class="qv-person small"></span><span class="qv-person large"></span></div><div class="qv-caption"><b>RETINAL SIZE CHANGES</b><span>distance changes the image; perceived size remains relatively stable</span></div></div>';if(/brightness constancy|color constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-light-stage"><span class="qv-light">LIGHT</span><span class="qv-object"></span><span class="qv-light dim">SHADE</span></div><div class="qv-caption"><b>CONTEXT CHANGES</b><span>the object is perceived as relatively stable across illumination</span></div></div>';if(k==='DISTINCTION'||/\b(vs|versus|difference|distinction|compare)\b/.test(s)){const a=p[0]||'Identify the defining feature.',b=p[1]||'Identify the contrasting feature.';return'<div class="quick-visual quick-table"><div><b>COMPARE</b><span>'+esc(a.slice(0,150))+'</span></div><div><b>CONTRAST</b><span>'+esc(b.slice(0,150))+'</span></div></div>'}if(k==='TIMELINE'||/\b(stage|stages|sequence|process|cycle|conditioning|development)\b/.test(s)){const i=p.slice(0,4);if(i.length>=2)return'<div class="quick-visual quick-flow">'+i.map((x,j)=>'<div><b>'+(j+1)+'</b><span>'+esc(x.slice(0,120))+'</span></div>').join('<i>→</i>')+'</div>'}return''}
function buildQuickLearnBank(){if(QUICK_BANK_CACHE)return QUICK_BANK_CACHE;const bank=[],angles=[['CORE IDEA',x=>x.core],['KEY FEATURES',x=>[x.core,x.points.slice(0,3).join(' ')].filter(Boolean).join(' ')],['PYQ FOCUS',x=>x.dist?('In questions, watch this distinction: '+x.dist):(x.exam||x.core)],['EXAM TRAP',x=>x.dist||x.core],['SOURCE DETAIL',x=>[x.core,x.points.slice(0,2).join(' ')].filter(Boolean).join(' ')],['RECALL CUE',x=>[x.hook,x.core].filter(Boolean).join(' — ')],['CONNECTION',x=>[x.core,x.dist].filter(Boolean).join(' ')]];units().forEach(u=>u.topics.forEach(t=>t.microtopics.forEach(m=>{const p=quickStudyParts(m),joined=[p.core,...p.points].filter(Boolean).join(' ');if(!joined)return;const cat=quickClassify(m.title,joined),src=quickSources(m);angles.forEach(a=>{const e=quickClean(a[1](p));if(e)bank.push({id:'QL-'+String(bank.length+1).padStart(4,'0'),title:m.title,category:cat,angle:a[0],explanation:e.slice(0,900),secondary:'',visual:quickVisual(m,cat,p.points),unit:u.id,topic:t.id,micro:m.id,sources:src})})})));QUICK_BANK_CACHE=bank;return bank}
function quickLearnItem(){const bank=buildQuickLearnBank();if(!bank.length)return null;let seen=[];try{seen=JSON.parse(sessionStorage.getItem('netpsych_quick_cards_seen')||'[]')}catch(e){}const unseen=bank.filter(x=>!seen.includes(x.id)),pool=unseen.length?unseen:bank,item=pool[Math.floor(Math.random()*pool.length)];seen=[item.id,...seen.filter(x=>x!==item.id)].slice(0,120);try{sessionStorage.setItem('netpsych_quick_cards_seen',JSON.stringify(seen))}catch(e){}return{...item,href:'microtopic.html?unit='+encodeURIComponent(item.unit)+'&topic='+encodeURIComponent(item.topic)+'&micro='+encodeURIComponent(item.micro)+'&focus=detailed&quick='+encodeURIComponent(item.id)}}function home(){
  const started=startedMicrotopics().sort((a,b)=>new Date(getP(b.k).lastRevision||getP(b.k).last||getP(b.k).startedAt||0)-new Date(getP(a.k).lastRevision||getP(a.k).last||getP(a.k).startedAt||0));
  const hasStarted=started.length>0,hero=$('#homeHero'),resume=started[0],summary=progressSummary();
  if(hasStarted&&resume){
    hero.innerHTML='<div class="hero-kicker"><div class="eyebrow">YOUR NEXT STEP</div></div><h1>KEEP BUILDING KNOWLEDGE YOU CAN RECALL.</h1><p>Learn at your own pace, strengthen recall, apply what you know, and return to concepts when they need attention.</p><div class="hero-actions"><a class="hero-cta" href="microtopic.html?unit='+encodeURIComponent(resume.u.id)+'&topic='+encodeURIComponent(resume.t.id)+'&micro='+encodeURIComponent(resume.m.id)+'"><span>CONTINUE LEARNING</span><b>→</b></a></div>';
  }else{
    hero.innerHTML='<div class="hero-kicker"><div class="eyebrow">UGC NET PSYCHOLOGY</div></div><h1>LEARN. UNDERSTAND MORE.<br>REMEMBER LONGER.</h1><p>Learn the concept. Strengthen recall. Revise it at the right time.</p><div class="hero-actions"><a class="hero-cta" href="start.html"><span>START LEARNING</span></a></div>';
  }
  renderNetCountdown(summary);
  const cards={learn:'<a class="daily-focus-card" href="daily3.html"><strong>LEARN</strong><span>→</span></a>',revise:'<a class="daily-focus-card" href="revision.html"><strong>REVISE</strong><span>→</span></a>',practice:'<a class="daily-focus-card" href="practice.html"><strong>PRACTICE</strong><span>→</span></a>'};
  const sequence=hasStarted?[cards.revise,cards.learn,cards.practice]:[cards.learn,cards.revise,cards.practice];
  $('#today').innerHTML='<section class="study-focus study-focus-enhanced"><div class="study-focus-main"><div class="eyebrow">YOUR DAILY LEARNING</div><p>Every study session has a purpose: learn a concept, strengthen your recall, or test what you know.</p></div><div class="study-focus-actions daily-focus-actions">'+sequence.join('')+'</div></section>';
  const quick=quickLearnItem(),quickBox=$('#quickLearn');
  if(quickBox&&quick) quickBox.innerHTML='<section class="quick-learn-card"><div class="quick-learn-top"><div class="eyebrow">QUICK LEARN</div><span class="quick-learn-type">'+esc(quick.category)+'</span></div><div class="quick-learn-body"><div class="quick-learn-angle">'+esc(quick.angle)+'</div><h3>'+esc(quick.title)+'</h3><p>'+esc(quick.explanation)+'</p>'+(quick.visual||'')+'</div><a class="quick-learn-link" href="'+quick.href+'">Explore this concept →</a></section>';
  const approach=$('#learningApproach');if(approach)approach.innerHTML=`<div class="learning-approach-head"><div class="eyebrow">LEARNING PATH</div><h2>A systematic approach to learning</h2><p>Move from learning to lasting recall through a simple, repeatable rhythm.</p></div><div class="learning-steps"><div><b>Learn</b><span>Build the conceptual framework.</span></div><div><b>Active Recall</b><span>Retrieve without looking at the notes.</span></div><div><b>Apply</b><span>Use the concept in questions and situations.</span></div><div><b>Spaced Revision</b><span>Return to it at spaced intervals.</span></div></div>`;
}
function daily3(){
  document.title='3-Concept Learning — UGC NET Psychology';
  const now=new Date(); const todayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const allItems=all();
  const due=dueItems();
  const candidates=[...due,...allItems.filter(x=>getP(x.k).status==='NEW')];
  const pick=interleaveBy(candidates,x=>x.u.id,3);
  const keyName='netPsychDaily3';
  let stored=null; try{stored=JSON.parse(localStorage.getItem(keyName)||'null')}catch{stored=null}
  const validStored=stored&&stored.date===todayKey&&Array.isArray(stored.items);
  const session=validStored?stored.items.map(k=>allItems.find(x=>x.k===k)).filter(Boolean):pick;
  if(!validStored)localStorage.setItem(keyName,JSON.stringify({date:todayKey,items:session.map(x=>x.k)}));
  $('#daily3App').innerHTML=`<section class="page-hero daily3-hero"><div class="eyebrow">DAILY 3-CONCEPT SESSION</div><h1>Learn three concepts today.</h1><p>Your session is kept simple: work through three concepts using understand → recall → apply → practice → revision.</p></section><section class="daily3-list">${session.map((x,i)=>`<article class="daily3-item card"><div class="daily3-number">0${i+1}</div><div class="daily3-copy"><div class="eyebrow">UNIT ${x.u.id}${partForTopic(x.u,x.t)?` · PART ${esc(partForTopic(x.u,x.t).id)}`:''} · TOPIC ${x.t.id}</div><h2>${esc(x.m.title)}</h2><p>${esc(x.t.title)}</p></div><a class="btn primary" href="microtopic.html?unit=${x.u.id}&topic=${x.t.id}&micro=${x.m.id}">START CONCEPT →</a></article>`).join('')||'<section class="panel empty"><h2>No concepts available</h2><p>Return to the learning path to choose a topic.</p></section>'}</section><section class="panel daily3-note"><b>Why three?</b><span>A small daily set keeps the session focused while leaving room for recall, application and spaced revision.</span></section>`;
}
function nextLink(){const ps=state(),due=all().find(x=>ps[x.k]?.next&&new Date(ps[x.k].next)<=new Date());if(due)return `microtopic.html?unit=${due.u.id}&topic=${due.t.id}&micro=${due.m.id}`;const started=all().find(x=>ps[x.k]?.status&&ps[x.k].status!=='NEW');if(started)return `microtopic.html?unit=${started.u.id}&topic=${started.t.id}&micro=${started.m.id}`;return 'unit.html?id=1'}
function dueItems(){const now=Date.now();return all().filter(x=>getP(x.k).next&&new Date(getP(x.k).next).getTime()<=now).sort((a,b)=>new Date(getP(a.k).next)-new Date(getP(b.k).next))}
function interleaveBy(list,keyFn,limit){const buckets=new Map();for(const item of list){const key=keyFn(item);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(item)}const out=[];while(out.length<limit&&buckets.size){for(const [key,bucket] of [...buckets]){const item=bucket.shift();if(item)out.push(item);if(!bucket.length)buckets.delete(key);if(out.length===limit)break}}return out}
function unitPage(){
  const u=units().find(x=>String(x.id)===String(Q.get('id')||1));
  if(!u)return $('#unitPage').innerHTML='<div class="panel empty">Unit not found.</div>';
  document.title=`${u.title} — UGC NET Psychology`;
  const pos=units().findIndex(x=>String(x.id)===String(u.id)),prev=units()[pos-1],next=units()[pos+1];
  const prevLink=prev?`<a href="unit.html?id=${prev.id}">← Previous</a>`:'<span class="disabled">← Previous</span>';
  const nextLink=next?`<a href="unit.html?id=${next.id}">Next →</a>`:'<span class="disabled">Next →</span>';
  $('#unitPage').innerHTML=`<div class="breadcrumbs"><a href="learn.html">Learning Path</a><span>›</span><span>Unit ${u.id}</span></div><section class="page-hero"><div class="eyebrow">UNIT ${u.id} OF ${units().length}</div><h1>${esc(u.title)}</h1><p>${esc(u.description||'Build your understanding of this part of the syllabus.')}</p><p class="page-guidance">${unitParts(u).length?'This unit is divided into focused learning parts. Choose a part, then move into its topics and micro-topics.':'Choose a topic, then move into its micro-topics to learn one concept at a time.'}</p><div class="unit-progress"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span>${unitParts(u).length?`<span>${unitParts(u).length} parts</span>`:''}</div></section><div class="unit-navigation"><a href="learn.html">All units</a><div>${prevLink}${nextLink}</div></div>${unitParts(u).length?unitParts(u).map(part=>`<section class="unit-part-section panel"><div class="eyebrow">PART ${esc(part.id)}</div><h2>${esc(part.title)}</h2><p>${esc(part.description||'Focused learning section within this unit.')}</p><div class="topic-grid">${u.topics.filter(t=>part.topic_ids?.map(String).includes(String(t.id))).map(t=>`<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><span class="eyebrow">TOPIC ${t.id}</span><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p><span class="link">${t.microtopics.length} micro-topics →</span></a>`).join('')}</div></section>`).join(''):`<div class="topic-grid">${u.topics.map(t=>`<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><span class="eyebrow">TOPIC ${t.id}</span><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p><span class="link">${t.microtopics.length} micro-topics →</span></a>`).join('')}</div>`}`;
}
function topicPage(){
  const {u,t}=find();
  if(!u||!t)return $('#topicPage').innerHTML='<div class="panel empty">Topic not found.</div>';
  document.title=`${t.title} — UGC NET Psychology`;
  const topicItems=t.microtopics||[];
  const progress=()=>{const ps=topicItems.map(m=>getP(key(u.id,t.id,m.id))),started=ps.filter(p=>p.status&&p.status!=='NEW').length,mastered=ps.filter(p=>p.status==='MASTERED').length,due=ps.filter(p=>p.next&&new Date(p.next)<=new Date()).length;return {started,mastered,due,total:topicItems.length,percent:topicItems.length?Math.round(started/topicItems.length*100):0}};
  const firstOpen=()=>{const ps=topicItems.map(m=>getP(key(u.id,t.id,m.id)));return topicItems.find((m,i)=>ps[i].status==='NEW'||(ps[i].next&&new Date(ps[i].next)<=new Date()))||topicItems[0]};
  const render=filter=>{
    const s=progress(),pinned=firstOpen();
    const list=topicItems.filter(m=>{const p=getP(key(u.id,t.id,m.id));if(filter==='new')return p.status==='NEW';if(filter==='learning')return p.status==='LEARNING'||p.status==='RETENTION';if(filter==='mastered')return p.status==='MASTERED';if(filter==='due')return p.next&&new Date(p.next)<=new Date();return true});
    const cards=list.map(m=>{
      const p=getP(key(u.id,t.id,m.id)),concept=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title,kp=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN')),qs=practiceFor(u.id,t.id,m.id),due=p.next&&new Date(p.next)<=new Date();
      return `<a class="micro-card topic-micro-card" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${m.id}"><div class="micro-card-top"><span class="micro-index">${String(topicItems.indexOf(m)+1).padStart(2,'0')}</span><span class="status ${p.status.toLowerCase()}">${p.status}</span>${due?'<span class="due">DUE</span>':''}</div><h3>${esc(m.title)}</h3><p>${esc(concept)}</p><div class="micro-card-info"><span>${kp.length||'Key'} key ideas</span><span>${qs.length} practice ${qs.length===1?'question':'questions'}</span></div><span class="link">${p.status==='NEW'?'Start learning':due?'Review now':'Continue learning'} <b>→</b></span></a>`;
    }).join('');
    const filters=['all','new','learning','mastered','due'].map(f=>`<button class="topic-filter ${filter===f?'active':''}" data-filter="${f}">${f==='all'?'All':f[0].toUpperCase()+f.slice(1)}${f==='due'&&s.due?' · '+s.due:''}</button>`).join('');
    $('#topicPage').innerHTML=`<div class="breadcrumbs"><a href="unit.html?id=${u.id}">Unit ${u.id}</a>${partForTopic(u,t)?`<span>›</span><span>Part ${esc(partForTopic(u,t).id)}</span>`:''}<span>›</span><span>Topic ${t.id}</span></div><section class="topic-learning-hero"><div class="topic-learning-copy"><div class="eyebrow">UNIT ${u.id}${partForTopic(u,t)?` · PART ${esc(partForTopic(u,t).id)}`:''} · TOPIC ${t.id}</div><h1>${esc(t.title)}</h1><p>${esc(t.explanation||'Build a clear understanding of this topic and its key distinctions.')}</p><div class="topic-hero-actions"><a class="btn primary" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${pinned.id}">${s.started?'Continue Learning':'Start Learning'} <span>→</span></a><a class="btn" href="practice.html">Practice Questions</a></div></div><div class="topic-progress-card"><div class="eyebrow">TOPIC PROGRESS</div><strong>${s.percent}%</strong><div class="bar"><i style="width:${s.percent}%"></i></div><div class="topic-progress-stats"><span>${s.started}/${s.total} started</span><span>${s.mastered} mastered</span></div></div></section><section class="card topic-notes-card"><div class="eyebrow">TOPIC NOTES</div><div class="notes topic-notes">${esc(t.notes||'Build the topic map first, then learn each micro-topic.')}</div></section><section class="topic-study-strip"><div><div class="eyebrow">HOW TO STUDY</div><h2>Move from understanding to durable recall.</h2></div><div class="topic-study-steps"><span><b>1</b> Understand</span><span><b>2</b> Recall</span><span><b>3</b> Apply</span><span><b>4</b> Practice</span><span><b>5</b> Revise</span></div></section><section class="topic-micro-section"><div class="topic-section-head"><div><div class="eyebrow">MICRO-TOPICS</div><h2>${topicItems.length} concepts to work through</h2><p>Choose one concept at a time. Your progress is saved on this device.</p></div><div class="topic-filters" role="tablist">${filters}</div></div><div class="micro-grid topic-micro-grid">${cards||'<div class="panel empty topic-empty"><h3>No micro-topics in this filter</h3><p>Try another filter or return to All.</p></div>'}</div></section>`;
    $$('.topic-filter').forEach(b=>b.onclick=()=>render(b.dataset.filter));
  };
  render('all');
}
function practiceFor(u,t,m){
  return PRACTICE_QUESTIONS.filter(q=>Number(q.unit)===Number(u)&&Number(q.topic)===Number(t)&&Number(q.micro)===Number(m));
}
function mcqHTML(q,i,source='MCQ'){
  const opts=q.options||q.o||[];
  const ans=Number.isInteger(q.answer)?q.answer:0;
  const tags=Array.isArray(q.source_tags)&&q.source_tags.length?q.source_tags:[source];
  const provenance=tags.join(' · ');
  return `<article class="mcq" data-i="${i}" data-answer="${ans}"><div class="mcq-meta"><span>${esc(provenance)}</span><span>Question ${i+1}</span></div><h3>${esc(q.question || q.q || '')}</h3><div class="mcq-options">${opts.map((o,j)=>`<button class="mcq-option" data-a="${j}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}</div><div class="mcq-feedback" hidden></div></article>`;
}
function mappedConcept(q){
  if(!q||q.unit==null||q.topic==null||q.micro==null||!D)return null;
  const u=units().find(x=>String(x.id)===String(q.unit));
  const t=u?.topics.find(x=>String(x.id)===String(q.topic));
  const m=t?.microtopics.find(x=>String(x.id)===String(q.micro));
  if(!m)return null;
  const core=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS');
  const points=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN')).slice(0,3);
  return {title:m.title,core,points};
}
function contextualExplanation(q){
  const base=String(q?.explanation||'').trim();
  const generic=/^(The keyed response is|Correct answer:|Evaluate each statement independently|Arrange the items according to|Check each List-I item)/i.test(base);
  const c=mappedConcept(q);
  if(!c||!generic)return base;
  const detail=[c.core&&c.core.trim(),c.points.length?'Key points: '+c.points.join(' · '):''].filter(Boolean).join(' ');
  return detail?base+' Study link — '+c.title+': '+detail:base;
}
function wireMCQ(container,k,qs){container.querySelectorAll('.mcq').forEach(card=>{card.querySelectorAll('.mcq-option').forEach(btn=>btn.onclick=()=>{const chosen=+btn.dataset.a,answer=+card.dataset.answer,correct=chosen===answer;card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);const q=qs[+card.dataset.i],fb=card.querySelector('.mcq-feedback');fb.hidden=false;fb.innerHTML=correct?`<b class="correct">✓ Correct</b> ${esc(contextualExplanation(q))}`:`<b class="incorrect">✕ Not quite.</b> Correct answer: <b>${String.fromCharCode(65+answer)}. ${esc((q.options||q.o)[answer])}</b><br>${esc(contextualExplanation(q))}`;if(k){const p=getP(k);setP(k,{mcqHistory:[...(p.mcqHistory||[]),{correct,at:new Date().toISOString()}].slice(-50)})}else{const s=state();s._practiceHistory=[...(s._practiceHistory||[]),{correct,at:new Date().toISOString()}].slice(-200);save(s)}})})}
function micro(){
  const {u,t,m,k}=find();
  if(!u||!t||!m)return $('#microPage').innerHTML='<div class="panel empty">Micro-topic not found.</div>';
  const p=getP(k);
  document.title=`${m.title} — UGC NET Psychology`;
  const items=all(),idx=items.findIndex(x=>x.k===k),prev=items[idx-1],next=items[idx+1];
  const concept=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title;
  const kp=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN'));
  const core=stripLegacy(m.content_notes);
  const trap=section(m.content_notes,'COMMON TRAP','\n\n5-MINUTE TEACHING FOCUS');
  const hook=section(m.content_notes,'MEMORY HOOK');
  const deep=[m.detailed_explanation,m.deep,m.deep_learning,m.source_lens&&'Study lens: '+m.source_lens,trap&&'Distinction to check: '+trap,hook&&'Memory cue: '+hook].filter(Boolean).join('\n\n')||core;
  const sources=sourceNames(m),qs=practiceFor(u.id,t.id,m.id);

  $('#microPage').innerHTML=`<div class="breadcrumbs"><span>${esc(m.title)}</span></div>
  <section class="micro-hero">
    <div><div class="eyebrow">MICRO-TOPIC ${m.id}</div><h1>${esc(m.title)}</h1><p>${esc(t.title)}</p></div>
    <div class="status-box"><span class="status ${p.status.toLowerCase()}">${p.status}</span><strong>${p.next?'Next revision '+date(p.next):'Ready to learn'}</strong><small>${p.rating?`Last rating: ${p.rating}`:'No revision scheduled yet'}</small></div>
  </section>
  <div class="session-shell">
    <div class="learning-path"><span class="step active">1 Understand</span><span class="step">2 Recall</span><span class="step">3 Apply</span><span class="step">4 Practice</span><span class="step">5 Schedule Revision</span></div>
    <div class="content-layout">
      <main class="content-stack">
        <section class="card stage" data-stage="understand">
          <div class="stage-label">UNDERSTAND</div>
          <h2>Understand the concept</h2>
          <p class="lead micro-main-explanation">${esc(concept)}</p>
          ${kp.length?`<ul class="key-points">${kp.slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
          <div class="micro-resource-actions" aria-label="Concept resources">
            <button type="button" class="micro-resource-btn" data-resource-target="microShortNotes"><span>SHORT NOTES</span><b>→</b></button>
            <button type="button" class="micro-resource-btn primary-action next-stage" data-next="recall"><span>I UNDERSTAND</span><b>→</b></button>
            <button type="button" class="micro-resource-btn" data-resource-target="microDetailedExplanation"><span>DETAILED EXPLANATION</span><b>→</b></button>
          </div>
          <section class="micro-resource-panel hidden" id="microShortNotes" aria-labelledby="microShortNotesTitle">
            <div class="micro-resource-panel-head"><div><div class="eyebrow">SHORT NOTES</div><h3 id="microShortNotesTitle">${esc(m.title)}</h3></div><span class="micro-resource-hint">Quick revision view</span></div>
            ${studyNotesHTML(m,concept,kp,core,trap,hook)}
          </section>
          <section class="micro-resource-panel hidden" id="microDetailedExplanation" aria-labelledby="microDetailedExplanationTitle">
            <div class="micro-resource-panel-head"><div><div class="eyebrow">DETAILED EXPLANATION</div><h3 id="microDetailedExplanationTitle">${esc(m.title)}</h3></div><span class="micro-resource-hint">Deeper conceptual view</span></div>
            <div class="notes micro-detailed-copy">${esc(deep)}</div>
          </section>
        </section>

        <section class="card stage hidden" data-stage="recall">
          <div class="stage-label">RECALL</div><h2>Close the notes. Reconstruct it.</h2>
          ${(m.retrieval_questions||[`Define ${m.title} from memory.`,`State one distinction or example.`]).map((q,i)=>`<label class="retrieval-item"><b>Recall ${i+1}</b><span>${esc(q)}</span><textarea class="recall-box" placeholder="Write from memory…"></textarea></label>`).join('')}
          <div class="confidence"><span>Before revealing feedback, rate your confidence.</span><button class="btn" data-confidence="low">Low</button><button class="btn" data-confidence="medium">Medium</button><button class="btn" data-confidence="high">High</button></div>
          <button class="btn primary next-stage" data-next="apply" disabled id="recallNext">I recalled it — continue →</button>
        </section>

        <section class="card stage hidden" data-stage="apply">
          <div class="stage-label">APPLY</div><h2>Transfer the idea</h2><p>${esc(m.application_question||'Apply the concept to an unfamiliar situation and explain why it fits.')}</p>
          <textarea class="recall-box" placeholder="Explain your reasoning…"></textarea>
          <button class="btn primary next-stage" data-next="practice">I applied it — continue →</button>
        </section>

        <section class="card stage hidden" data-stage="practice">
          <div class="stage-label">PRACTICE · PYQ</div><h2>Answer before the explanation</h2>
          <div id="microQuestions">${qs.length?qs.map((q,i)=>mcqHTML(q,i,'PYQ')).join(''):'<div class="panel empty"><h3>No PYQ mapped here yet</h3><p>This concept can still be completed. Use the application task, then continue directly to revision scheduling.</p></div>'}</div>
          <button class="btn primary next-stage" data-next="schedule">${qs.length?'Finish practice →':'Continue to revision scheduling →'}</button>
        </section>

        <section class="card stage hidden" data-stage="schedule">
          <div class="stage-label">SCHEDULE REVISION</div><h2>How well could you recall it?</h2><p class="muted">Your rating changes the next interval. Forgetting brings the next return closer; it does not erase your learning.</p>
          <div class="rating-grid">${[['again','Again','I could not recall it'],['hard','Hard','I recalled it with effort'],['good','Good','Normal successful recall'],['easy','Easy','Easy successful recall']].map(x=>`<button class="rating" data-rating="${x[0]}"><strong>${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div>
          <div id="scheduleResult" class="schedule-result">Choose a rating to schedule your next revision.</div>
        </section>
      </main>

      <aside class="content-stack">
        <section class="card source-card"><div class="eyebrow">SOURCE-GROUNDED LEARNING</div><h2>Use the right source for the right job</h2><div class="source-details">${(m.study_source_config?.notes_primary||[]).map(s=>`<div class="source-detail"><b>${esc(s)}</b><span>Primary notes source</span></div>`).join("")}${(m.study_source_config?.mcq_primary||[]).map(s=>`<div class="source-detail"><b>${esc(s)}</b><span>Primary practice source</span></div>`).join("")}</div><p class="source-note">Notes teach the concept; practice tests retrieval and application. The page does not force every source into every micro-topic.</p></section>
        <section class="card"><div class="eyebrow">KEEP IT WITH YOU</div><h2>Check it after some time</h2><p class="muted">A concept is becoming secure when you can understand it, recall it, use it, and still bring it back later.</p><button class="btn" id="master">Mark delayed retention demonstrated</button><div id="masterResult" class="schedule-result"></div></section>
        <section class="card"><div class="eyebrow">NEXT</div><div class="side-list">${prev?`<a href="microtopic.html?unit=${prev.u.id}&topic=${prev.t.id}&micro=${prev.m.id}">← Previous</a>`:''}${next?`<a href="microtopic.html?unit=${next.u.id}&topic=${next.t.id}&micro=${next.m.id}">Next →</a>`:''}<a href="topic.html?unit=${u.id}&topic=${t.id}">Back to topic</a></div></section>
      </aside>
    </div>
  </div>`;

  const stages=$$('.stage'),show=s=>stages.forEach(x=>x.classList.toggle('hidden',x.dataset.stage!==s));
  $$('.next-stage').forEach(b=>b.onclick=()=>{
    const target=b.dataset.next;
    if(target==='recall'){setP(k,{understanding:true,status:'LEARNING',last:new Date().toISOString()});show(target);return}
    if(target==='apply'){
      const boxes=Array.from(document.querySelectorAll('[data-stage="recall"] .recall-box'));
      if(boxes.some(x=>!x.value.trim())){alert('Write at least a short response to each recall prompt before continuing.');return}
      show(target);return
    }
    if(target==='practice'){
      const box=document.querySelector('[data-stage="apply"] .recall-box');
      if(!box?.value.trim()){alert('Write your application reasoning before continuing.');return}
      setP(k,{application:true,status:'RETENTION',last:new Date().toISOString()});show(target);return
    }
    show(target)
  });

  $$('.micro-resource-btn[data-resource-target]').forEach(b=>b.onclick=()=>{
    const target=document.getElementById(b.dataset.resourceTarget);
    if(!target)return;
    $$('.micro-resource-panel').forEach(panel=>panel.classList.add('hidden'));
    target.classList.remove('hidden');
    requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
  });

  $$('[data-confidence]').forEach(b=>b.onclick=()=>{
    const boxes=Array.from(document.querySelectorAll('[data-stage="recall"] .recall-box'));
    if(boxes.some(x=>!x.value.trim())){alert('Complete the recall prompts before rating your confidence.');return}
    $$('[data-confidence]').forEach(x=>x.classList.toggle('selected',x===b));
    $('#recallNext').disabled=false;
    setP(k,{confidence:b.dataset.confidence,retrieval:true,status:'LEARNING',last:new Date().toISOString()})
  });

  wireMCQ($('#microQuestions'),k,qs);
  $$('[data-rating]').forEach(b=>b.onclick=()=>{
    const patch=setDue(k,b.dataset.rating);setP(k,patch);
    $('#scheduleResult').innerHTML=patch.lateReset?`<b>Revision reset to your last successful checkpoint.</b> Next revision: ${date(patch.next)}`:`<b>Next revision scheduled.</b> ${patch.next?date(patch.next):'today'}`;
  });
  const masterBtn=$('#master');
  if(!(p.understanding&&p.retrieval&&p.application&&p.revisionCount>0))masterBtn.disabled=true;
  masterBtn.onclick=()=>{
    const current=getP(k);
    if(!(current.understanding&&current.retrieval&&current.application&&current.revisionCount>0))return;
    setP(k,{status:'MASTERED',delayedRetention:true,masteredAt:new Date().toISOString()});
    $('#masterResult').textContent='Delayed retention recorded. You can still revisit this concept whenever it needs more work.'
  }
}
function practice(){
  const box=$('#practiceApp');
  const sessions=[...new Set(PRACTICE_QUESTIONS.map(q=>q.session))];
  const availableSources=[...new Set(PRACTICE_QUESTIONS.flatMap(q=>Array.isArray(q.source_tags)&&q.source_tags.length?q.source_tags:['PYQ']))];
  const sourceOptions=['all',...availableSources.filter(s=>s!=='all')];
  const unitOptions=units().map(u=>`<option value="${u.id}">Unit ${u.id} · ${esc(u.title)}</option>`).join('');
  const sourceLabel=s=>s==='all'?'All sources':s;
  const sourceTip=availableSources.map(s=>`${s}: ${PRACTICE_QUESTIONS.filter(q=>(q.source_tags||['PYQ']).includes(s)).length}`).join(' · ');
  box.innerHTML=`<section class="page-hero practice-hero"><div class="eyebrow">PRACTICE · MAPPED MCQs</div><h1>Practise the questions linked to what you are learning.</h1><p>The practice bank keeps authentic PYQs separate from source-specific mappings. REVISATHON tags are shown only where the question has been explicitly mapped; no question is labelled from a source without provenance.</p></section><section class="practice-config card"><div class="practice-config-head"><div><div class="eyebrow">SET UP YOUR SESSION</div><h2>Choose your question set.</h2></div><span class="practice-tip">${PRACTICE_QUESTIONS.length} questions · ${esc(sourceTip)}</span></div><div class="practice-toolbar"><label>Questions<select id="setSize"><option>5</option><option>10</option><option>20</option></select></label><label>Source<select id="practiceSource">${sourceOptions.map(s=>`<option value="${esc(s)}">${esc(sourceLabel(s))}</option>`).join('')}</select></label><label>Session<select id="session"><option value="all">All sessions</option>${sessions.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label><label>Unit<select id="practiceUnit"><option value="all">All units</option>${unitOptions}</select></label><label>Topic<select id="practiceTopic"><option value="all">All topics</option></select></label><button class="btn primary" id="startSet">Start Practice <span>→</span></button></div></section><div id="practiceSet"></div>`;
  const updateTopics=()=>{const id=$('#practiceUnit').value;const list=id==='all'?units().flatMap(u=>u.topics.map(t=>({u,t}))):units().filter(u=>String(u.id)===id).flatMap(u=>u.topics.map(t=>({u,t})));$('#practiceTopic').innerHTML='<option value="all">All topics</option>'+list.map(x=>`<option value="${x.u.id}-${x.t.id}">${esc(x.t.title)}</option>`).join('')};
  $('#practiceUnit').onchange=updateTopics;updateTopics();
  function draw(){
    let qs=PRACTICE_QUESTIONS.slice();
    const source=$('#practiceSource').value,session=$('#session').value,unit=$('#practiceUnit').value,topic=$('#practiceTopic').value;
    if(source!=='all')qs=qs.filter(q=>(q.source_tags||['PYQ']).includes(source));
    if(session!=='all')qs=qs.filter(q=>q.session===session);
    if(unit!=='all')qs=qs.filter(q=>String(q.unit)===unit);
    if(topic!=='all'){const [u,t]=topic.split('-');qs=qs.filter(q=>String(q.unit)===u&&String(q.topic)===t)}
    const limit=+$('#setSize').value;
    const groupingKey=unit==='all'?'unit':topic==='all'?'topic':'random';
    qs=groupingKey==='random'?qs.sort(()=>Math.random()-.5).slice(0,limit):interleaveBy(qs,x=>groupingKey==='unit'?x.unit:x.topic,limit);
    if(!qs.length){$('#practiceSet').innerHTML='<section class="panel empty practice-empty"><h2>No mapped questions match these filters.</h2><p>Try another source, session, unit or topic.</p></section>';return}
    $('#practiceSet').innerHTML=`<section class="practice-session card"><div class="session-head"><div><div class="eyebrow">MAPPED QUESTION SESSION</div><h2 id="sessionTitle">Question 1 of ${qs.length}</h2></div><a class="text-link" href="practice.html">Reset</a></div><div class="session-progress"><i id="sessionProgress" style="width:${100/qs.length}%"></i></div><div class="session-questions">${qs.map((q,i)=>mcqHTML(q,i,'PYQ')).join('')}</div><div class="practice-complete hidden" id="practiceComplete"><div class="eyebrow">SESSION COMPLETE</div><h2 id="practiceScore"></h2><p id="practiceSummary"></p><div class="complete-actions"><a class="btn primary" href="practice.html">Try another set <span>→</span></a><a class="btn" href="revision.html">Go to Revision</a></div></div></section>`;
    const cards=$$('#practiceSet .mcq');
    cards.forEach((card,i)=>{if(i!==0)card.classList.add('session-hidden');const next=document.createElement('button');next.className='btn primary mcq-next';next.textContent=i===cards.length-1?'Finish Session →':'Next Question →';card.appendChild(next);next.hidden=true});
    wireMCQ($('#practiceSet'),null,qs);
    let correct=0;
    cards.forEach((card,i)=>{
      card.querySelectorAll('.mcq-option').forEach(btn=>btn.addEventListener('click',()=>{if(card.dataset.done)return;card.dataset.done='1';if(+btn.dataset.a===+card.dataset.answer)correct++;card.querySelector('.mcq-next').hidden=false}));
      card.querySelector('.mcq-next').onclick=()=>{if(i<cards.length-1){card.classList.add('session-hidden');cards[i+1].classList.remove('session-hidden');$('#sessionTitle').textContent=`Question ${i+2} of ${cards.length}`;$('#sessionProgress').style.width=`${((i+2)/cards.length)*100}%`;window.scrollTo({top:document.querySelector('.practice-session').offsetTop-20,behavior:'smooth'})}else{$('#sessionProgress').style.width='100%';$('#sessionTitle').textContent='Session complete';$('#practiceComplete').classList.remove('hidden');$('#practiceScore').textContent=`${correct} of ${cards.length} correct · ${Math.round(correct/cards.length*100)}%`;const missed=cards.length-correct;$('#practiceSummary').textContent=missed?`${missed} concept${missed===1?'':'s'} may need another pass. Use Revision to return to weak areas.`:'Strong session. Keep the concepts durable with spaced revision.';card.querySelector('.mcq-next').hidden=true}};
    });
  }
  $('#startSet').onclick=draw;
  draw();
}
function revision(){const items=dueItems(),shown=items.slice(0,5);$('#revisionApp').innerHTML=`<section class="page-hero"><div class="eyebrow">REVISION</div><h1>Bring earlier learning back to mind.</h1><p>Start with what is due. Try to recall it before looking back, notice what you missed, and strengthen the weak parts.</p></section><div class="revision-summary"><div><strong>${items.length}</strong><span>due now</span></div><div><strong>${Math.min(items.length,5)}</strong><span>in today’s queue</span></div><div><strong>${all().filter(x=>getP(x.k).status==='MASTERED').length}</strong><span>mastered</span></div></div>${shown.length?`<section class="revision-list">${shown.map(x=>{const p=getP(x.k),late=(Date.now()-new Date(p.next).getTime())/86400000;return `<article class="revision-item"><div><span class="status ${p.status.toLowerCase()}">${p.status}</span><h3>${esc(x.m.title)}</h3><p>${esc(x.t.title)} · Unit ${x.u.id}</p><small>${late>0?`Overdue by ${Math.floor(late)} day${Math.floor(late)===1?'':'s'}`:'Due today'}${p.rating?` · Last: ${p.rating}`:''}</small></div><a class="btn primary" href="microtopic.html?unit=${x.u.id}&topic=${x.t.id}&micro=${x.m.id}">Start Recall →</a></article>`}).join('')}</section>`:'<section class="panel empty"><h2>No revisions due</h2><p>Your next scheduled return will appear here.</p><a class="btn primary" href="unit.html?id=1">Continue Learning</a></section>'}<section class="panel revision-rules"><h2>A simple way to revise</h2><ul><li><b>Again</b> — rebuild the idea before moving on.</li><li><b>Hard</b> — you remembered it, but with effort.</li><li><b>Good</b> — you recalled it successfully.</li><li><b>Easy</b> — you could bring it back quickly.</li><li>If you missed a revision, simply return to the concept and rebuild from your last successful recall.</li></ul></section>`}
function progress(){
  const s=progressSummary(),ps=state(),due=dueItems().length;
  const attention=all().filter(x=>{const p=ps[x.k];return p?.confidence==='low'||p?.rating==='again'||(p?.next&&new Date(p.next)<=new Date())}).slice(0,6);
  const started=s.started,total=s.total;
  const nextAction=due?{label:'Revise due concepts',href:'revision.html',note:`${due} concept${due===1?'':'s'} ready for another pass.`}:started<total?{label:'Continue Learning',href:'unit.html?id=1',note:'Keep building coverage one micro-topic at a time.'}:{label:'Practice Questions',href:'practice.html',note:'Use recall and application to test what you know.'};
  const units=D.units.map(u=>{const items=all().filter(x=>x.u.id===u.id),startedU=items.filter(x=>{const p=ps[x.k];return p?.status&&p.status!=='NEW'}).length,masteredU=items.filter(x=>ps[x.k]?.status==='MASTERED').length;return {u,total:items.length,started:startedU,mastered:masteredU,coverage:items.length?Math.round(startedU/items.length*100):0}});
  $('#progressApp').innerHTML=`<section class="page-hero progress-hero"><div class="eyebrow">YOUR PROGRESS</div><h1>See what is becoming secure.</h1><p>Track what you have explored, what you can recall, what needs another pass, and how your learning is building across the syllabus.</p></section><section class="progress-next card"><div><div class="eyebrow">NEXT STEP</div><h2>${nextAction.label}</h2><p>${nextAction.note}</p></div><a class="btn primary" href="${nextAction.href}">Continue <span>→</span></a></section><div class="measure-grid"><div class="measure"><span>Syllabus Coverage</span><strong>${s.coverage}%</strong><div class="bar"><i style="width:${s.coverage}%"></i></div><small>${s.started} of ${s.total} micro-topics started</small></div><div class="measure"><span>Concept Mastery</span><strong>${s.mastery}%</strong><div class="bar"><i style="width:${s.mastery}%"></i></div><small>${s.mastered} micro-topics mastered</small></div><div class="measure"><span>MCQ/PYQ Performance</span><strong>${s.accuracy}%</strong><div class="bar"><i style="width:${s.accuracy}%"></i></div><small>${s.answers} answered questions</small></div><div class="measure"><span>Delayed Recall</span><strong>${s.retention}%</strong><div class="bar"><i style="width:${s.retention}%"></i></div><small>${s.delayed} delayed-recall checkpoints</small></div></div><section class="panel readiness"><div class="readiness-copy"><div class="eyebrow">EXAM READINESS</div><h2>${readiness(s).label}</h2><p>${readiness(s).note}</p><div class="readiness-focus"><b>What to focus on now</b><ul>${readiness(s).focus.map(x=>"<li>"+esc(x)+"</li>").join("")}</ul></div></div><a class="btn primary" href="${readiness(s).href}">${readiness(s).action} <span>→</span></a></section><section class="attention"><div class="section-head"><div><div class="eyebrow">NEEDS ATTENTION</div><h2>Concepts that need another pass</h2><p class="page-guidance">Start here when a concept was difficult to recall, marked Again, or is due.</p></div></div>${attention.length?attention.map(x=>`<a class="attention-item" href="microtopic.html?unit=${x.u.id}&topic=${x.t.id}&micro=${x.m.id}"><span>${getP(x.k).rating==='again'?'Again':getP(x.k).confidence==='low'?'Low confidence':'Due'}</span><b>${esc(x.m.title)}</b><small>${esc(x.t.title)} · Unit ${x.u.id}</small></a>`).join(''):'<div class="panel empty">Nothing needs attention yet. Keep learning and this space will highlight concepts that need another pass.</div>'}</section><section class="unit-progress-section"><div class="section-head"><div><div class="eyebrow">SYLLABUS</div><h2>Your progress across the 10 units</h2><p class="page-guidance">See where you have started and where your learning is still new.</p></div></div><div class="unit-progress-grid">${units.map(x=>`<a class="unit-progress-card" href="unit.html?id=${x.u.id}"><div class="unit-progress-top"><span>UNIT ${x.u.id}</span><b>${x.coverage}%</b></div><h3>${esc(x.u.title)}</h3><div class="bar"><i style="width:${x.coverage}%"></i></div><small>${x.started}/${x.total} started · ${x.mastered} mastered</small></a>`).join('')}</div></section><section class="panel data-panel"><div><div class="eyebrow">YOUR STUDY DATA</div><h2>Keep your progress safe</h2><p>Your learning record stays on this device. Download a backup if you want to move or preserve your progress.</p></div><div class="actions"><button class="btn" id="exportData">Download backup</button><label class="btn">Restore backup<input id="importData" type="file" accept="application/json" hidden></label></div></section>`;
  $('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),progress:state()},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ugc-net-psychology-learning-data.json';a.click();URL.revokeObjectURL(a.href)};
  $('#importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!validBackup(x))throw Error();save(x.progress);location.reload()}catch{alert('That backup file is not valid.')}};r.readAsText(f)};
}
function readiness(s){if(s.coverage>=80&&s.mastery>=70&&s.accuracy>=70&&s.retention>=60)return {label:'Strong study profile',note:'Your learning record shows broad coverage, strong mastery signals, question performance, and delayed recall. Use mixed practice and spaced revision to maintain these gains; this is a study indicator, not a guarantee of exam performance.',focus:['Maintain delayed recall across older concepts','Mix MCQs and PYQs across units','Keep revising concepts before they become due'],action:'Open Mixed Practice',href:'practice.html'};if(s.coverage>=60&&s.mastery>=45&&s.accuracy>=60)return {label:'Ready for Exam Practice',note:'You have built a substantial base. The next step is to strengthen retrieval, application, and delayed recall while continuing to expand coverage.',focus:['Strengthen concept mastery','Use recall before checking notes','Practice across different units'],action:'Practice Questions',href:'practice.html'};if(s.coverage>=25)return {label:'Developing',note:'You are building the foundation. Keep moving through the syllabus while turning each new concept into something you can recall and apply.',focus:['Build syllabus coverage','Strengthen concept mastery','Use recall before checking notes'],action:'Continue Learning',href:'unit.html?id=1'};return {label:'Building',note:'You are still establishing your foundation. Start with one concept at a time and move through understanding, recall, and application.',focus:['Build syllabus coverage','Strengthen concept mastery','Use recall before checking notes'],action:'Start Learning',href:'unit.html?id=1'}}
function render(){
  const page=document.body?.dataset?.page||'';
  document.querySelectorAll('.nav-link[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===page));
  const routes={home,learn:learnPage,start:startPage,daily3,unit:unitPage,topic:topicPage,microtopic:micro,practice,revision,progress};
  const fn=routes[page];
  if(typeof fn==='function') fn();
  else console.warn('No renderer registered for page:',page);
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
loadStudyData().catch(err=>{
  console.error('NET Psychology data loading failed:',err);
  if(D&&Array.isArray(D.units)) {
    const pageRoot=document.querySelector('#practiceApp,#startPage,#homeHero');
    if(pageRoot&&!pageRoot.innerHTML.trim()) pageRoot.innerHTML='<section class="panel empty"><h1>This section could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" onclick="location.reload()">Retry</button></section>';
    return;
  }
  const shell=document.querySelector('main.shell');
  if(shell) shell.innerHTML='<section class="panel empty"><h1>Study data could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" onclick="location.reload()">Retry</button></section>';
});
})();