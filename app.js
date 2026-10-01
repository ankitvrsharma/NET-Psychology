(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const Q=new URLSearchParams(location.search); let D=null,PRACTICE_QUESTIONS=[],PRACTICE_EXPLANATIONS={};
const KEY='netPsychProgress';
const ladder=[0,1,3,7,14,30,60,90,180];
const SW_MIGRATION_KEY='netPsychSwMigratedV2';

async function retireLegacyServiceWorker(){
  if(!('serviceWorker' in navigator)) return false;
  try{
    const regs=await navigator.serviceWorker.getRegistrations();
    const keys=await caches.keys();
    const hasOldSW=regs.length>0||keys.some(k=>k.startsWith('netpsych-'));
    if(!hasOldSW) return false;
    await Promise.all(regs.map(r=>r.unregister()));
    await Promise.all(keys.filter(k=>k.startsWith('netpsych-')).map(k=>caches.delete(k)));
    if(sessionStorage.getItem(SW_MIGRATION_KEY)!=='1'){
      sessionStorage.setItem(SW_MIGRATION_KEY,'1');
      location.reload();
      return true;
    }
  }catch{}
  return false;
}

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
  const migrated=await retireLegacyServiceWorker();
  if(migrated) return false;

  let json=window.NETPSY_DATA||null;
  if(!json){
    try{
      const response=await fetch('./data.json?v='+Date.now(),{cache:'no-store'});
      if(!response.ok) throw new Error('Study data request failed: '+response.status);
      json=await response.json();
    }catch(fetchError){
      console.warn('Study data JSON fetch failed; falling back to browser bundle.',fetchError);
      await loadScript('./data.js?v='+Date.now());
      json=window.NETPSY_DATA||null;
    }
  }
  if(!json || !Array.isArray(json.units)) throw new Error('Study data has an invalid structure');
  D=json;
  try{
    const pq=await fetch('./practice_questions.json?v='+Date.now(),{cache:'no-store'});
    if(pq.ok){const parsed=await pq.json();if(Array.isArray(parsed))PRACTICE_QUESTIONS=parsed;}
    try{const pe=await fetch('./practice_explanations.json?v='+Date.now(),{cache:'no-store'});if(pe.ok){const parsed=await pe.json();if(parsed&&typeof parsed==='object'){PRACTICE_EXPLANATIONS=parsed;PRACTICE_QUESTIONS=PRACTICE_QUESTIONS.map(q=>({...q,explanation:PRACTICE_EXPLANATIONS[q.id]||q.explanation}));}}}catch(e){console.warn('PYQ explanations could not be loaded:',e)}
  }catch(e){console.warn('PYQ bank could not be loaded:',e)}
  render();
  return true;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state=()=>JSON.parse(localStorage.getItem(KEY)||'{}');
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
const key=(u,t,m)=>`${u}-${t}-${m}`;
const getP=k=>state()[k]||{status:'NEW',stage:0,lastCompletedStage:-1};
const setP=(k,patch)=>{const s=state();s[k]={...getP(k),...patch};save(s);return s[k]};
const units=()=>D?.units||[];
const all=()=>units().flatMap(u=>u.topics.flatMap(t=>t.microtopics.map(m=>({u,t,m,k:key(u.id,t.id,m.id)}))));
const find=()=>{const u=units().find(x=>String(x.id)===String(Q.get('unit'))),t=u?.topics.find(x=>String(x.id)===String(Q.get('topic'))),m=t?.microtopics.find(x=>String(x.id)===String(Q.get('micro')));return {u,t,m,k:u&&t&&m?key(u.id,t.id,m.id):null}};
const section=(s,a,b)=>{s=String(s||'');const i=s.indexOf(a);if(i<0)return '';const j=b?s.indexOf(b,i+a.length):-1;return s.slice(i+a.length,j<0?s.length:j).trim()};
const bullets=s=>String(s||'').split('\n').map(x=>x.trim().replace(/^[-•]\s*/,'')).filter(Boolean);
const stripLegacy=s=>String(s||'').replace(/\nPYQ-STYLE PATTERN[\s\S]*?(?=\nCOMMON TRAP|\n5-MINUTE TEACHING FOCUS|\nMEMORY HOOK|$)/,'').replace(/\nCOMMON TRAP[\s\S]*?(?=\n5-MINUTE TEACHING FOCUS|\nMEMORY HOOK|$)/,'').replace(/\n5-MINUTE TEACHING FOCUS[\s\S]*?(?=\nMEMORY HOOK|$)/,'').replace(/\nMEMORY HOOK[\s\S]*?$/,'').trim();
const date=x=>x?new Date(x).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Not scheduled';
const countMicro=u=>u.topics.reduce((n,t)=>n+t.microtopics.length,0);
function sourceNames(m){return (m.sources||[]).map(id=>D.source_library?.find(s=>s.id===id)?.title).filter(Boolean)}
function progressSummary(){const ps=Object.values(state()),total=all().length,started=ps.filter(p=>p.status&&p.status!=='NEW').length,mastered=ps.filter(p=>p.status==='MASTERED').length,delayed=ps.filter(p=>p.delayedRetention).length,answered=ps.flatMap(p=>p.mcqHistory||[]),practice=state()._practiceHistory||[],allAnswers=answered.concat(practice),correct=allAnswers.filter(x=>x.correct).length;return {total,started,mastered,delayed,coverage:total?Math.round(started/total*100):0,mastery:total?Math.round(mastered/total*100):0,retention:started?Math.round(delayed/started*100):0,accuracy:allAnswers.length?Math.round(correct/allAnswers.length*100):0,answers:allAnswers.length}}
function setDue(k,rating){const p=getP(k),now=new Date(),late=p.next&&new Date(p.next)<now,prior=Number.isInteger(p.lastCompletedStage)?p.lastCompletedStage:-1;let base=Math.max(0,late?prior:(p.stage||0));let jump=late?({again:0,hard:0,good:1,easy:2}[rating]??1):({again:0,hard:1,good:2,easy:3}[rating]??1);let nextStage=Math.min(ladder.length-1,base+jump);let days=ladder[nextStage];if(rating==='again')days=0;const d=new Date(now);d.setDate(d.getDate()+days);return {status:rating==='again'?'RETENTION':(p.status==='MASTERED'?'MASTERED':'RETENTION'),rating,next:d.toISOString(),stage:nextStage,lastCompletedStage:nextStage,revisionCount:(p.revisionCount||0)+1,lastRevision:now.toISOString(),lateReset:!!late}}
function navActive(){const page=document.body.dataset.page;$$('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.nav===page))}
function layout(){navActive();const menu=$('.menu-toggle');if(menu)menu.onclick=()=>document.body.classList.toggle('menu-open')}
function render(){layout();const p=document.body.dataset.page;({home:home,learn:learnPage,daily3:daily3,unit:unitPage,topic:topicPage,micro:micro,practice:practice,revision:revision,progress:progress}[p]||home)()}
function learnPage(){
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
      return `<a class="learn-unit-card" href="unit.html?id=${u.id}"><div class="learn-unit-top"><span class="eyebrow">UNIT ${String(u.id).padStart(2,'0')}</span><span class="learn-unit-arrow">→</span></div><h2>${esc(u.title)}</h2><p>${esc(u.description||'Explore this part of the Psychology syllabus.')}</p><div class="learn-unit-progress"><div><span>${s.started}/${s.total} concepts started</span><b>${s.percent}%</b></div><div class="bar"><i style="width:${s.percent}%"></i></div></div><div class="learn-unit-meta"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span>${s.due?'<span class="learn-due">'+s.due+' due</span>':''}</div><span class="link">${s.started?'Continue unit':'Start unit'} <b>→</b></span></a>`;
    }).join('')||'<div class="panel empty"><h3>No units found</h3><p>Try a different search.</p></div>';
  };
  const r=document.querySelector('#learnResume');
  if(resume){
    r.innerHTML=`<div><div class="eyebrow">YOUR CURRENT POSITION</div><strong>${esc(resume.m.title)}</strong><span>${esc(resume.t.title)} · Unit ${resume.u.id}</span></div><a class="btn primary" href="microtopic.html?unit=${resume.u.id}&topic=${resume.t.id}&micro=${resume.m.id}">Resume →</a>`;
    r.hidden=false;
  }else r.hidden=true;
  draw('');
  $('#learnSearch')?.addEventListener('input',e=>draw(e.target.value));
}function home(){const sum=progressSummary(),hero=$('#homeHero'),has=sum.started>0;hero.innerHTML=has?\`<div class="eyebrow">YOUR NEXT STEP</div><h1>KEEP BUILDING KNOWLEDGE YOU CAN RECALL.</h1><p>Pick up the next concept that needs attention. Understand it, recall it from memory, use it, and come back to it later.</p><div class="hero-actions"><a class="btn primary" href="daily3.html">START 3-CONCEPT LEARNING →</a></div>\`:\`<div class="eyebrow">UGC NET PSYCHOLOGY</div><h1>LEARN. UNDERSTAND MORE.<br>REMEMBER LONGER.</h1><p>Start with one concept at a time. Understand it, recall it without your notes, apply it, and return to it after some time.</p><div class="hero-actions"><a class="btn primary" href="daily3.html">START 3-CONCEPT LEARNING →</a></div>\`;
$('#today').innerHTML=\`<section class="study-focus study-focus-enhanced"><div class="study-focus-main"><div class="eyebrow">TODAY’S STUDY FOCUS</div><h2>Three focused actions for today.</h2><p>Keep the daily routine simple: learn three concepts, revisit what is due, then test yourself with MCQs.</p></div><div class="study-focus-actions daily-focus-actions"><a class="study-primary-action daily-focus-card" href="daily3.html"><span class="action-icon">01</span><span><small>DAILY LEARNING</small>START 3-CONCEPT LEARNING</span><b>→</b></a><a class="study-primary-action daily-focus-card" href="revision.html"><span class="action-icon">02</span><span><small>SPACED REVISION</small>TODAY’S REVISION</span><b>→</b></a><a class="study-primary-action daily-focus-card" href="practice.html"><span class="action-icon">03</span><span><small>RETRIEVAL PRACTICE</small>DAILY MCQ PRACTICE</span><b>→</b></a></div></section>\`;
const approach=$('#learningApproach');if(approach)approach.innerHTML=\`<div class="learning-approach-head"><div class="eyebrow">LEARNING PATH</div><h2>A systematic approach to learning</h2><p>Move from understanding to lasting recall through a simple, repeatable rhythm.</p></div><div class="learning-steps"><div><b>Understand</b><span>Build the conceptual framework.</span></div><div><b>Recall</b><span>Recall without looking at the notes.</span></div><div><b>Apply</b><span>Use the concept in questions and situations.</span></div><div><b>Revise</b><span>Return to it at spaced intervals.</span></div></div>\`;const g=$('#unitGrid');const draw=q=>{q=(q||'').toLowerCase();g.innerHTML=units().filter(u=>!q||JSON.stringify(u).toLowerCase().includes(q)).map(u=>\`<a class="unit-card" href="unit.html?id=${u.id}"><div class="unit-card-top"><div class="unit-num">UNIT ${u.id}</div><span class="unit-arrow" aria-hidden="true">→</span></div><h3>${esc(u.title)}</h3><p>${esc(u.description||'Build your understanding of this part of the syllabus.')}</p><div class="unit-meta"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span></div></a>\`).join('')||'<div class="panel empty">No matching topic found.</div>'};draw('');$('#search')?.addEventListener('input',e=>draw(e.target.value))}

function daily3(){
  document.title='3-Concept Learning — UGC NET Psychology';
  const todayKey=new Date().toISOString().slice(0,10);
  const allItems=all();
  const due=dueItems();
  const candidates=[...due,...allItems.filter(x=>getP(x.k).status==='NEW')];
  const seen=new Set(),pick=[];
  for(const x of candidates){if(!seen.has(x.k)){seen.add(x.k);pick.push(x)}if(pick.length===3)break}
  if(pick.length<3){for(const x of allItems){if(!seen.has(x.k)){seen.add(x.k);pick.push(x)}if(pick.length===3)break}}
  const keyName='netPsychDaily3-'+todayKey;
  const stored=JSON.parse(localStorage.getItem(keyName)||'null');
  const session=stored&&Array.isArray(stored.items)?stored.items.map(k=>allItems.find(x=>x.k===k)).filter(Boolean):pick;
  if(!stored)localStorage.setItem(keyName,JSON.stringify({date:todayKey,items:session.map(x=>x.k)}));
  $('#daily3App').innerHTML=\`<section class="page-hero daily3-hero"><div class="eyebrow">DAILY 3-CONCEPT SESSION</div><h1>Learn three concepts today.</h1><p>Your session is kept simple: work through three concepts using understand → recall → apply → practice → revision.</p></section><section class="daily3-list">${session.map((x,i)=>\`<article class="daily3-item card"><div class="daily3-number">0${i+1}</div><div class="daily3-copy"><div class="eyebrow">UNIT ${x.u.id} · TOPIC ${x.t.id}</div><h2>${esc(x.m.title)}</h2><p>${esc(x.t.title)}</p></div><a class="btn primary" href="microtopic.html?unit=${x.u.id}&topic=${x.t.id}&micro=${x.m.id}">START CONCEPT →</a></article>\`).join('')||'<section class="panel empty"><h2>No concepts available</h2><p>Return to the learning path to choose a topic.</p></section>'}</section><section class="panel daily3-note"><b>Why three?</b><span>A small daily set keeps the session focused while leaving room for recall, application and spaced revision.</span></section>\`;
}
function nextLink(){const ps=state(),due=all().find(x=>ps[x.k]?.next&&new Date(ps[x.k].next)<=new Date());if(due)return `microtopic.html?unit=${due.u.id}&topic=${due.t.id}&micro=${due.m.id}`;const started=all().find(x=>ps[x.k]?.status&&ps[x.k].status!=='NEW');if(started)return `microtopic.html?unit=${started.u.id}&topic=${started.t.id}&micro=${started.m.id}`;return 'unit.html?id=1'}
function dueItems(){const now=Date.now();return all().filter(x=>getP(x.k).next&&new Date(getP(x.k).next).getTime()<=now).sort((a,b)=>new Date(getP(a.k).next)-new Date(getP(b.k).next))}
function dueCount(){return dueItems().length}
function unitPage(){
  const u=units().find(x=>String(x.id)===String(Q.get('id')||1));
  if(!u)return $('#unitPage').innerHTML='<div class="panel empty">Unit not found.</div>';
  document.title=`${u.title} — UGC NET Psychology`;
  const pos=units().findIndex(x=>String(x.id)===String(u.id)),prev=units()[pos-1],next=units()[pos+1];
  const prevLink=prev?`<a href="unit.html?id=${prev.id}">← Previous</a>`:'<span class="disabled">← Previous</span>';
  const nextLink=next?`<a href="unit.html?id=${next.id}">Next →</a>`:'<span class="disabled">Next →</span>';
  $('#unitPage').innerHTML=`<div class="breadcrumbs"><a href="learn.html">Learning Path</a><span>›</span><span>Unit ${u.id}</span></div><section class="page-hero"><div class="eyebrow">UNIT ${u.id} OF ${units().length}</div><h1>${esc(u.title)}</h1><p>${esc(u.description||'Build your understanding of this part of the syllabus.')}</p><p class="page-guidance">Choose a topic, then move into its micro-topics to learn one concept at a time.</p><div class="unit-progress"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span></div></section><div class="unit-navigation"><a href="learn.html">All units</a><div>${prevLink}${nextLink}</div></div><div class="topic-grid">${u.topics.map(t=>`<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><span class="eyebrow">TOPIC ${t.id}</span><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p><span class="link">${t.microtopics.length} micro-topics →</span></a>`).join('')}</div>`;
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
    $('#topicPage').innerHTML=`<div class="breadcrumbs"><a href="unit.html?id=${u.id}">Unit ${u.id}</a><span>›</span><span>Topic ${t.id}</span></div><section class="topic-learning-hero"><div class="topic-learning-copy"><div class="eyebrow">UNIT ${u.id} · TOPIC ${t.id}</div><h1>${esc(t.title)}</h1><p>${esc(t.explanation||'Build a clear understanding of this topic and its key distinctions.')}</p><div class="topic-hero-actions"><a class="btn primary" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${pinned.id}">${s.started?'Continue Learning':'Start Learning'} <span>→</span></a><a class="btn" href="practice.html">Practice Questions</a></div></div><div class="topic-progress-card"><div class="eyebrow">TOPIC PROGRESS</div><strong>${s.percent}%</strong><div class="bar"><i style="width:${s.percent}%"></i></div><div class="topic-progress-stats"><span>${s.started}/${s.total} started</span><span>${s.mastered} mastered</span></div></div></section><section class="topic-study-strip"><div><div class="eyebrow">HOW TO STUDY</div><h2>Move from understanding to durable recall.</h2></div><div class="topic-study-steps"><span><b>1</b> Understand</span><span><b>2</b> Recall</span><span><b>3</b> Apply</span><span><b>4</b> Practice</span><span><b>5</b> Revise</span></div></section><section class="topic-micro-section"><div class="topic-section-head"><div><div class="eyebrow">MICRO-TOPICS</div><h2>${topicItems.length} concepts to work through</h2><p>Choose one concept at a time. Your progress is saved on this device.</p></div><div class="topic-filters" role="tablist">${filters}</div></div><div class="micro-grid topic-micro-grid">${cards||'<div class="panel empty topic-empty"><h3>No micro-topics in this filter</h3><p>Try another filter or return to All.</p></div>'}</div></section>`;
    $$('.topic-filter').forEach(b=>b.onclick=()=>render(b.dataset.filter));
  };
  render('all');
}
function practiceFor(u,t,m){
  return PRACTICE_QUESTIONS.filter(q=>Number(q.unit)===Number(u)&&Number(q.topic)===Number(t)&&Number(q.micro)===Number(m));
}
function mcqHTML(q,i,source='MCQ'){const opts=q.options||q.o||[];const ans=Number.isInteger(q.answer)?q.answer:0;return `<article class="mcq" data-i="${i}" data-answer="${ans}"><div class="mcq-meta"><span>${source}</span><span>Question ${i+1}</span></div><h3>${esc(q.question || q.q || '')}</h3><div class="mcq-options">${opts.map((o,j)=>`<button class="mcq-option" data-a="${j}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}</div><div class="mcq-feedback" hidden></div></article>`}
function wireMCQ(container,k,qs){container.querySelectorAll('.mcq').forEach(card=>{card.querySelectorAll('.mcq-option').forEach(btn=>btn.onclick=()=>{const chosen=+btn.dataset.a,answer=+card.dataset.answer,correct=chosen===answer;card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);const q=qs[+card.dataset.i],fb=card.querySelector('.mcq-feedback');fb.hidden=false;fb.innerHTML=correct?`<b class="correct">✓ Correct</b> ${esc(q.explanation||'')}`:`<b class="incorrect">✕ Not quite.</b> Correct answer: <b>${String.fromCharCode(65+answer)}. ${esc((q.options||q.o)[answer])}</b><br>${esc(q.explanation||'')}`;if(k){const p=getP(k);setP(k,{mcqHistory:[...(p.mcqHistory||[]),{correct,at:new Date().toISOString()}].slice(-50)})}else{const s=state();s._practiceHistory=[...(s._practiceHistory||[]),{correct,at:new Date().toISOString()}].slice(-200);save(s)}})})}
function micro(){const {u,t,m,k}=find();if(!u||!t||!m)return $('#microPage').innerHTML='<div class="panel empty">Micro-topic not found.</div>';const p=getP(k);document.title=`${m.title} — UGC NET Psychology`;const items=all(),idx=items.findIndex(x=>x.k===k),prev=items[idx-1],next=items[idx+1],concept=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title,kp=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN')),core=stripLegacy(m.content_notes),trap=section(m.content_notes,'COMMON TRAP','\n\n5-MINUTE TEACHING FOCUS'),hook=section(m.content_notes,'MEMORY HOOK'),deep=[m.deep,m.deep_learning,m.source_lens&&`Study lens: ${m.source_lens}`,trap&&`Distinction to check: ${trap}`,hook&&`Memory cue: ${hook}`].filter(Boolean).join('\n\n')||core,sources=sourceNames(m),qs=practiceFor(u.id,t.id,m.id);
$('#microPage').innerHTML=`<div class="breadcrumbs"><span>${esc(m.title)}</span></div><section class="micro-hero"><div><div class="eyebrow">MICRO-TOPIC ${m.id}</div><h1>${esc(m.title)}</h1><p>${esc(t.title)}</p></div><div class="status-box"><span class="status ${p.status.toLowerCase()}">${p.status}</span><strong>${p.next?'Next revision '+date(p.next):'Ready to learn'}</strong><small>${p.rating?`Last rating: ${p.rating}`:'No revision scheduled yet'}</small></div></section><div class="session-shell"><div class="learning-path"><span class="step active">1 Understand</span><span class="step">2 Recall</span><span class="step">3 Apply</span><span class="step">4 Practice</span><span class="step">5 Schedule Revision</span></div><div class="content-layout"><main class="content-stack"><section class="card stage" data-stage="understand"><div class="stage-label">UNDERSTAND · QUICK</div><h2>Get the core idea</h2><p class="lead">${esc(concept)}</p>${kp.length?`<ul class="key-points">${kp.slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<details><summary>Core Learning · 5–10 min</summary><div class="notes">${esc(core)}</div></details><details><summary>Deep Learning</summary><div class="notes">${esc(deep)}</div></details><button class="btn primary next-stage" data-next="recall">I understand — continue →</button></section><section class="card stage hidden" data-stage="recall"><div class="stage-label">RECALL</div><h2>Close the notes. Reconstruct it.</h2>${(m.retrieval_questions||[`Define ${m.title} from memory.`,`State one distinction or example.`]).map((q,i)=>`<label class="retrieval-item"><b>Recall ${i+1}</b><span>${esc(q)}</span><textarea class="recall-box" placeholder="Write from memory…"></textarea></label>`).join('')}<div class="confidence"><span>Before revealing feedback, rate your confidence.</span><button class="btn" data-confidence="low">Low</button><button class="btn" data-confidence="medium">Medium</button><button class="btn" data-confidence="high">High</button></div><button class="btn primary next-stage" data-next="apply" disabled id="recallNext">I recalld it — continue →</button></section><section class="card stage hidden" data-stage="apply"><div class="stage-label">APPLY</div><h2>Transfer the idea</h2><p>${esc(m.application_question||'Apply the concept to an unfamiliar situation and explain why it fits.')}</p><textarea class="recall-box" placeholder="Explain your reasoning…"></textarea><button class="btn primary next-stage" data-next="practice">I applied it — continue →</button></section><section class="card stage hidden" data-stage="practice"><div class="stage-label">PRACTICE · VERIFIED PYQ</div><h2>Answer before the explanation</h2><div id="microQuestions">${qs.length?qs.map((q,i)=>mcqHTML(q,i,'PYQ')).join(''):'<div class="panel empty"><h3>No verified PYQ mapped here yet</h3><p>This concept remains available for learning; no supplied question has been confidently mapped to this micro-topic.</p></div>'}</div>${qs.length?'<button class="btn primary next-stage" data-next="schedule">Finish practice →</button>':''}</section><section class="card stage hidden" data-stage="schedule"><div class="stage-label">SCHEDULE REVISION</div><h2>How well could you recall it?</h2><p class="muted">Your rating changes the next interval. Forgetting brings the next return closer; it does not erase your learning.</p><div class="rating-grid">${[['again','Again','I could not recall it'],['hard','Hard','I recalled it with effort'],['good','Good','Normal successful recall'],['easy','Easy','Easy successful recall']].map(x=>`<button class="rating" data-rating="${x[0]}"><strong>${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div><div id="scheduleResult" class="schedule-result">Choose a rating to schedule your next revision.</div></section></main><aside class="content-stack"><section class="card source-card"><div class="eyebrow">STUDY SUPPORT</div><h2>Go deeper when you need to</h2><div class="source-tags">${sources.map(s=>`<span class="pill">${esc(s)}</span>`).join('')||'<span class="muted">Mapped source metadata not available.</span>'}</div><p class="source-note">Use the mapped sources when you want a fuller explanation or a second perspective. Verified PYQs are shown only when their source is available.</p></section><section class="card"><div class="eyebrow">KEEP IT WITH YOU</div><h2>Check it after some time</h2><p class="muted">A concept is becoming secure when you can understand it, recall it, use it, and still bring it back later.</p><button class="btn" id="master">Mark delayed retention demonstrated</button><div id="masterResult" class="schedule-result"></div></section><section class="card"><div class="eyebrow">NEXT</div><div class="side-list">${prev?`<a href="microtopic.html?unit=${prev.u.id}&topic=${prev.t.id}&micro=${prev.m.id}">← Previous</a>`:''}${next?`<a href="microtopic.html?unit=${next.u.id}&topic=${next.t.id}&micro=${next.m.id}">Next →</a>`:''}<a href="topic.html?unit=${u.id}&topic=${t.id}">Back to topic</a></div></section></aside></div></div>`;
const stages=$('.stage'),show=s=>stages.forEach(x=>x.classList.toggle('hidden',x.dataset.stage!==s));$('.next-stage').forEach(b=>b.onclick=()=>{if(b.dataset.next==='recall'){setP(k,{understanding:true,status:'LEARNING',last:new Date().toISOString()})}if(b.dataset.next==='practice'){setP(k,{application:true,status:'RETENTION',last:new Date().toISOString()})}show(b.dataset.next)});$$('[data-confidence]').forEach(b=>b.onclick=()=>{$$('[data-confidence]').forEach(x=>x.classList.toggle('selected',x===b));$('#recallNext').disabled=false;setP(k,{confidence:b.dataset.confidence,retrieval:true,status:'LEARNING',last:new Date().toISOString()})});wireMCQ($('#microQuestions'),k,qs);$('[data-rating]').forEach(b=>b.onclick=()=>{const patch=setDue(k,b.dataset.rating);setP(k,patch);$('#scheduleResult').innerHTML=patch.lateReset?`<b>Revision reset to your last successful checkpoint.</b> Next revision: ${date(patch.next)}`:`<b>Next revision scheduled.</b> ${patch.next?date(patch.next):'today'}`});const masterBtn=$('#master');if(!(p.understanding&&p.retrieval&&p.application&&p.revisionCount>0))masterBtn.disabled=true;masterBtn.onclick=()=>{const current=getP(k);if(!(current.understanding&&current.retrieval&&current.application&&current.revisionCount>0))return;setP(k,{status:'MASTERED',delayedRetention:true,masteredAt:new Date().toISOString()});$('#masterResult').textContent='Delayed retention recorded. You can still revisit this concept whenever it needs more work.'}}
function practice(){
  const box=$('#practiceApp');
  const sessions=[...new Set(PRACTICE_QUESTIONS.map(q=>q.session))];
  const unitOptions=units().map(u=>`<option value="${u.id}">Unit ${u.id} · ${esc(u.title)}</option>`).join('');
  box.innerHTML=`<section class="page-hero practice-hero"><div class="eyebrow">PRACTICE · VERIFIED PYQs</div><h1>Practise with the questions you were actually given.</h1><p>Every question in this bank comes from the supplied UGC NET Psychology question-paper source. No model-generated MCQ is mixed into the PYQ bank.</p></section><section class="practice-config card"><div class="practice-config-head"><div><div class="eyebrow">SET UP YOUR SESSION</div><h2>Choose your question set.</h2></div><span class="practice-tip">${PRACTICE_QUESTIONS.length} verified PYQs available.</span></div><div class="practice-toolbar"><label>Questions<select id="setSize"><option>5</option><option>10</option><option>20</option></select></label><label>Session<select id="session"><option value="all">All sessions</option>${sessions.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label><label>Unit<select id="practiceUnit"><option value="all">All units</option>${unitOptions}</select></label><label>Topic<select id="practiceTopic"><option value="all">All topics</option></select></label><button class="btn primary" id="startSet">Start Practice <span>→</span></button></div></section><div id="practiceSet"></div>`;
  const updateTopics=()=>{const id=$('#practiceUnit').value;const list=id==='all'?units().flatMap(u=>u.topics.map(t=>({u,t}))):units().filter(u=>String(u.id)===id).flatMap(u=>u.topics.map(t=>({u,t})));$('#practiceTopic').innerHTML='<option value="all">All topics</option>'+list.map(x=>`<option value="${x.u.id}-${x.t.id}">${esc(x.t.title)}</option>`).join('')};
  $('#practiceUnit').onchange=updateTopics;updateTopics();
  function draw(){
    let qs=PRACTICE_QUESTIONS.slice();
    const session=$('#session').value,unit=$('#practiceUnit').value,topic=$('#practiceTopic').value;
    if(session!=='all')qs=qs.filter(q=>q.session===session);
    if(unit!=='all')qs=qs.filter(q=>String(q.unit)===unit);
    if(topic!=='all'){const [u,t]=topic.split('-');qs=qs.filter(q=>String(q.unit)===u&&String(q.topic)===t)}
    qs.sort(()=>Math.random()-.5);qs=qs.slice(0,+$('#setSize').value);
    if(!qs.length){$('#practiceSet').innerHTML='<section class="panel empty practice-empty"><h2>No verified PYQs match these filters.</h2><p>Choose a broader session, unit or topic.</p></section>';return}
    $('#practiceSet').innerHTML=`<section class="practice-session card"><div class="session-head"><div><div class="eyebrow">VERIFIED PYQ SESSION</div><h2 id="sessionTitle">Question 1 of ${qs.length}</h2></div><a class="text-link" href="practice.html">Reset</a></div><div class="session-progress"><i id="sessionProgress" style="width:${100/qs.length}%"></i></div><div class="session-questions">${qs.map((q,i)=>mcqHTML(q,i,'PYQ')).join('')}</div><div class="practice-complete hidden" id="practiceComplete"><div class="eyebrow">SESSION COMPLETE</div><h2 id="practiceScore"></h2><p id="practiceSummary"></p><div class="complete-actions"><a class="btn primary" href="practice.html">Try another set <span>→</span></a><a class="btn" href="revision.html">Go to Revision</a></div></div></section>`;
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
  $('#importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.progress)throw Error();save(x.progress);location.reload()}catch{alert('That backup file is not valid.')}};r.readAsText(f)};
}
function readiness(s){if(s.coverage>=80&&s.mastery>=70&&s.accuracy>=70&&s.retention>=60)return {label:'Exam Ready',note:'Your learning record shows broad coverage, solid mastery, question performance, and delayed recall. Keep maintaining these gains through mixed practice and spaced revision.',focus:['Maintain delayed recall across older concepts','Mix MCQs and PYQs across units','Keep revising concepts before they become due'],action:'Open Mixed Practice',href:'practice.html'};if(s.coverage>=60&&s.mastery>=45&&s.accuracy>=60)return {label:'Ready for Exam Practice',note:'You have built a substantial base. The next step is to strengthen retrieval, application, and delayed recall while continuing to expand coverage.',focus:['Strengthen concept mastery','Use recall before checking notes','Practice across different units'],action:'Practice Questions',href:'practice.html'};if(s.coverage>=25)return {label:'Developing',note:'You are building the foundation. Keep moving through the syllabus while turning each new concept into something you can recall and apply.',focus:['Build syllabus coverage','Strengthen concept mastery','Use recall before checking notes'],action:'Continue Learning',href:'unit.html?id=1'};return {label:'Building',note:'You are still establishing your foundation. Start with one concept at a time and move through understanding, recall, and application.',focus:['Build syllabus coverage','Strengthen concept mastery','Use recall before checking notes'],action:'Start Learning',href:'unit.html?id=1'}}
loadStudyData().catch(err=>{
  console.error('NET Psychology data loading failed:',err);
  if(!D){
    document.body.innerHTML='<main class="shell"><section class="panel empty"><h1>Study data could not be loaded.</h1><p>Please refresh once the site connection is available.</p></section></main>';
  }
});
})();