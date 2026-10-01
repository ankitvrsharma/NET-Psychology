(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const Q=new URLSearchParams(location.search); let D=null;
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

  const response=await fetch('./data.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok) throw new Error('Study data request failed: '+response.status);
  const json=await response.json();
  if(!json || !Array.isArray(json.units)) throw new Error('Study data has an invalid structure');
  D=json;
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
function render(){layout();const p=document.body.dataset.page;({home:home,unit:unitPage,topic:topicPage,micro:micro,practice:practice,revision:revision,progress:progress}[p]||home)()}
function home(){const sum=progressSummary(),hero=$('#homeHero'),has=sum.started>0;hero.innerHTML=has?`<div class="eyebrow">YOUR NEXT STEP</div><h1>Keep building knowledge you can recall.</h1><p>Pick up the next concept that needs attention. Understand it, recall it from memory, use it, and come back to it later.</p><div class="hero-actions"><a class="btn primary" href="${nextLink()}">Continue Learning →</a><a class="btn" href="#syllabus">Choose a Topic</a></div>`:`<div class="eyebrow">UGC NET PSYCHOLOGY</div><h1>Learn. Understand More.<br>Remember Longer.</h1><p>Start with one concept at a time. Understand it, recall it without your notes, apply it, and return to it after some time.</p><div class="hero-actions"><a class="btn primary" href="unit.html?id=1">Start Learning →</a><a class="btn" href="#syllabus">Choose a Topic</a></div>`;
$('#today').innerHTML=`<section class="study-focus"><div><div class="eyebrow">TODAY’S STUDY FOCUS</div><h2>${has?'Continue with your next concept.':'Select one concept to begin.'}</h2><p>Select one concept, understand its core ideas, recall what you remember, and apply it before moving on.</p></div><div class="study-actions"><a href="${nextLink()}">${has?'Continue Learning':'Start Learning'} <span>→</span></a><a href="revision.html">Revise Previous Concepts <span>→</span></a><a href="practice.html">Practice Questions <span>→</span></a></div></section>`;
const approach=$('#learningApproach');if(approach)approach.innerHTML=`<div class="learning-approach-head"><div class="eyebrow">LEARNING PATH</div><h2>A systematic approach to learning</h2><p>Move from understanding to lasting recall through a simple, repeatable rhythm.</p></div><div class="learning-steps"><div><b>Understand</b><span>Build the conceptual framework.</span></div><div><b>Recall</b><span>Recall without looking at the notes.</span></div><div><b>Apply</b><span>Use the concept in questions and situations.</span></div><div><b>Revise</b><span>Return to it at spaced intervals.</span></div></div>`;const g=$('#unitGrid');const draw=q=>{q=(q||'').toLowerCase();g.innerHTML=units().filter(u=>!q||JSON.stringify(u).toLowerCase().includes(q)).map(u=>`<a class="unit-card" href="unit.html?id=${u.id}"><div class="unit-card-top"><div class="unit-num">UNIT ${u.id}</div><span class="unit-arrow" aria-hidden="true">→</span></div><h3>${esc(u.title)}</h3><p>${esc(u.description||'Build your understanding of this part of the syllabus.')}</p><div class="unit-meta"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span></div></a>`).join('')||'<div class="panel empty">No matching topic found.</div>'};draw('');$('#search')?.addEventListener('input',e=>draw(e.target.value))}
function nextLink(){const ps=state(),due=all().find(x=>ps[x.k]?.next&&new Date(ps[x.k].next)<=new Date());if(due)return `microtopic.html?unit=${due.u.id}&topic=${due.t.id}&micro=${due.m.id}`;const started=all().find(x=>ps[x.k]?.status&&ps[x.k].status!=='NEW');if(started)return `microtopic.html?unit=${started.u.id}&topic=${started.t.id}&micro=${started.m.id}`;return 'unit.html?id=1'}
function dueItems(){const now=Date.now();return all().filter(x=>getP(x.k).next&&new Date(getP(x.k).next).getTime()<=now).sort((a,b)=>new Date(getP(a.k).next)-new Date(getP(b.k).next))}
function dueCount(){return dueItems().length}
function unitPage(){const u=units().find(x=>String(x.id)===String(Q.get('id')||1));if(!u)return $('#unitPage').innerHTML='<div class="panel empty">Unit not found.</div>';document.title=`${u.title} — UGC NET Psychology`;$('#unitPage').innerHTML=`<div class="breadcrumbs"><span>${esc(u.title)}</span></div><section class="page-hero"><div class="eyebrow">UNIT ${u.id}</div><h1>${esc(u.title)}</h1><p>${esc(u.description||'Build your understanding of this part of the syllabus.')}</p><p class="page-guidance">Explore the topics below, then choose a micro-topic and learn it step by step.</p><div class="unit-progress"><span>${u.topics.length} topics</span><span>${countMicro(u)} micro-topics</span></div></section><div class="topic-grid">${u.topics.map(t=>`<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><span class="eyebrow">TOPIC ${t.id}</span><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p><span class="link">${t.microtopics.length} micro-topics →</span></a>`).join('')}</div>`}
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
      const p=getP(key(u.id,t.id,m.id)),concept=section(m.content_notes,'CORE CONCEPT','\\n\\nKEY POINTS')||m.title,kp=bullets(section(m.content_notes,'KEY POINTS','\\n\\nPYQ-STYLE PATTERN')),qs=buildQuestions(m,t),due=p.next&&new Date(p.next)<=new Date();
      return `<a class="micro-card topic-micro-card" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${m.id}"><div class="micro-card-top"><span class="micro-index">${String(topicItems.indexOf(m)+1).padStart(2,'0')}</span><span class="status ${p.status.toLowerCase()}">${p.status}</span>${due?'<span class="due">DUE</span>':''}</div><h3>${esc(m.title)}</h3><p>${esc(concept)}</p><div class="micro-card-info"><span>${kp.length||'Key'} key ideas</span><span>${qs.length} practice ${qs.length===1?'question':'questions'}</span></div><span class="link">${p.status==='NEW'?'Start learning':due?'Review now':'Continue learning'} <b>→</b></span></a>`;
    }).join('');
    const filters=['all','new','learning','mastered','due'].map(f=>`<button class="topic-filter ${filter===f?'active':''}" data-filter="${f}">${f==='all'?'All':f[0].toUpperCase()+f.slice(1)}${f==='due'&&s.due?' · '+s.due:''}</button>`).join('');
    $('#topicPage').innerHTML=`<div class="breadcrumbs"><a href="unit.html?id=${u.id}">Unit ${u.id}</a><span>›</span><span>Topic ${t.id}</span></div><section class="topic-learning-hero"><div class="topic-learning-copy"><div class="eyebrow">UNIT ${u.id} · TOPIC ${t.id}</div><h1>${esc(t.title)}</h1><p>${esc(t.explanation||'Build a clear understanding of this topic and its key distinctions.')}</p><div class="topic-hero-actions"><a class="btn primary" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${pinned.id}">${s.started?'Continue Learning':'Start Learning'} <span>→</span></a><a class="btn" href="practice.html">Practice Questions</a></div></div><div class="topic-progress-card"><div class="eyebrow">TOPIC PROGRESS</div><strong>${s.percent}%</strong><div class="bar"><i style="width:${s.percent}%"></i></div><div class="topic-progress-stats"><span>${s.started}/${s.total} started</span><span>${s.mastered} mastered</span></div></div></section><section class="topic-study-strip"><div><div class="eyebrow">HOW TO STUDY</div><h2>Move from understanding to durable recall.</h2></div><div class="topic-study-steps"><span><b>1</b> Understand</span><span><b>2</b> Recall</span><span><b>3</b> Apply</span><span><b>4</b> Practice</span><span><b>5</b> Revise</span></div></section><section class="topic-micro-section"><div class="topic-section-head"><div><div class="eyebrow">MICRO-TOPICS</div><h2>${topicItems.length} concepts to work through</h2><p>Choose one concept at a time. Your progress is saved on this device.</p></div><div class="topic-filters" role="tablist">${filters}</div></div><div class="micro-grid topic-micro-grid">${cards||'<div class="panel empty topic-empty"><h3>No micro-topics in this filter</h3><p>Try another filter or return to All.</p></div>'}</div></section>`;
    $$('.topic-filter').forEach(b=>b.onclick=()=>render(b.dataset.filter));
  };
  render('all');
}
;