function initLearningJourney(){
  const tour=document.querySelector('#journeyTour'); if(!tour)return;
  let seen=false; try{seen=localStorage.getItem('netPsychJourneySeen')==='1'}catch(e){}
  const steps=[
    {eyebrow:'START HERE',title:'Start Learning',body:'Start here if you are new to the Study Hub. Your answers help the system choose an appropriate starting route and emphasis for your learning. When you return later, your learning progress stays on this device, so you can continue from where your learning left off rather than starting over.',target:()=>document.querySelector('#homeHero .hero-cta'),preview:'start'},
    {eyebrow:'NAVIGATION · 1 OF 4',title:'Learn',body:'Learn takes you through the UGC NET Psychology syllabus, from units to topics and micro-topics where concept learning happens.',target:()=>document.querySelector('#site-navigation a[data-nav="learn"]'),preview:'learn'},
    {eyebrow:'NAVIGATION · 2 OF 4',title:'Practice',body:'Practice is where you apply what you know through MCQs and previous-year questions, helping you test understanding rather than only read it.',target:()=>document.querySelector('#site-navigation a[data-nav="practice"]'),preview:'practice'},
    {eyebrow:'NAVIGATION · 3 OF 4',title:'Revision',body:'Revision brings back concepts when they are due for spaced review. The aim is to strengthen retrieval over time, not simply reread notes.',target:()=>document.querySelector('#site-navigation a[data-nav="revision"]'),preview:'revision'},
    {eyebrow:'NAVIGATION · 4 OF 4',title:'Progress',body:'Progress shows how your learning is developing across concept learning, mastery, practice performance, and revision.',target:()=>document.querySelector('#site-navigation a[data-nav="progress"]'),preview:'progress'},
    {eyebrow:'EXAM READINESS',title:'Exam Readiness',body:'This card keeps the exam in view while you learn. It gives you a visible readiness signal so your study is connected to the NET goal rather than becoming an endless syllabus checklist.',target:()=>document.querySelector('#netCountdown'),preview:'readiness'},
    {eyebrow:'YOUR MINIMUM TARGET',title:'Daily Learning',body:'Your daily target has two actions: Learn first, then Practice. Both are part of the same daily learning session.',target:()=>[document.querySelector('#today .daily-focus-card[data-daily-preview="learn"]'),document.querySelector('#today .daily-focus-card[data-daily-preview="practice"]')],preview:'daily'},
    {eyebrow:'QUICK CONCEPT HELP',title:'Quick Learn Card',body:'Quick Learn gives you a short, focused concept preview or review when you need a quick refresher. It supports your learning but does not replace the Daily Learning target.',target:()=>document.querySelector('#quickLearn'),preview:'quick'}
  ];
  const previews={
    start:{label:'WHAT YOU’LL SEE',title:'A short learner setup',items:['A few questions help choose your starting route.','Your learning activity is saved on this device.','When you return, the Study Hub can guide you back to your current learning.']},
    learn:{label:'WHAT YOU’LL SEE',title:'Learn',items:['UGC NET Psychology units','Topics within each unit','Micro-topics where concept learning happens']},
    practice:{label:'WHAT YOU’LL SEE',title:'Practice',items:['Practice setup','MCQs and previous-year questions','Answer, check, and learn from performance']},
    revision:{label:'WHAT YOU’LL SEE',title:'Revision',items:['Concepts that are due for review','Spaced retrieval at the appropriate time','A focused route back to concepts needing attention']},
    progress:{label:'WHAT YOU’LL SEE',title:'Progress',items:['Learning progress','Mastery and practice performance','Revision activity and overall development']},
    readiness:{label:'WHAT YOU’LL SEE',title:'Exam Readiness',items:['A visible NET-focused readiness signal','Your exam timeline','A reminder that learning activity is connected to the exam goal']},
    daily:{label:'WHAT YOU’LL SEE',title:'Your Daily Learning',items:['LEARN — your focused concept-learning activity','PRACTICE — your 10-question application/test activity','Both actions belong to the same daily target']},
    quick:{label:'WHAT YOU’LL SEE',title:'Quick Learn',items:['A short concept preview or refresher','Focused help when you need it','A supplement to—not a replacement for—Daily Learning']}
  };
  let step=0,activeTargets=[];
  const clearTargets=()=>{activeTargets.forEach(t=>{if(t){t.classList.remove('journey-highlight');t.removeAttribute('data-journey-target')}});activeTargets=[]};
  const close=()=>{clearTargets();tour.hidden=true;tour.setAttribute('aria-hidden','true');document.body.classList.remove('tour-open')};
  const placeDialog=(targets)=>{
    const dialog=tour.querySelector('.journey-dialog'); if(!dialog)return;
    const margin=16,arr=targets.filter(Boolean),rect=arr[0]?.getBoundingClientRect();
    if(!rect){dialog.style.left='50%';dialog.style.top='50%';dialog.style.transform='translate(-50%,-50%)';return}
    dialog.style.transform='none'; const width=Math.min(560,window.innerWidth-margin*2); dialog.style.width=width+'px';
    const dialogHeight=dialog.offsetHeight; let left=Math.max(margin,Math.min(window.innerWidth-width-margin,rect.left+(rect.width/2)-(width/2))); let top=rect.bottom+18;
    if(top+dialogHeight>window.innerHeight-margin)top=rect.top-dialogHeight-18; if(top<margin)top=margin;
    dialog.style.left=left+'px';dialog.style.top=top+'px';
  };
  const previewMarkup=kind=>{const p=previews[kind];if(!p)return '';return '<div class="journey-preview" aria-label="'+p.label+'"><div class="journey-preview-label">'+p.label+'</div><div class="journey-preview-title">'+p.title+'</div><div class="journey-preview-list">'+p.items.map(x=>'<div><span>✓</span>'+x+'</div>').join('')+'</div></div>'};
  const render=()=>{
    clearTargets(); const s=steps[step],raw=s.target?.(),targets=Array.isArray(raw)?raw.filter(Boolean):[raw].filter(Boolean);
    tour.innerHTML='<div class="journey-backdrop"></div><section class="journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journeyTitle"><div class="journey-progress"><span>KNOW YOUR LEARNING JOURNEY</span><b>'+String(step+1).padStart(2,'0')+' / '+String(steps.length).padStart(2,'0')+'</b></div><div class="eyebrow">'+s.eyebrow+'</div><h2 id="journeyTitle">'+s.title+'</h2><p>'+s.body+'</p><div class="journey-preview-slot" hidden></div><div class="journey-actions">'+(step>0?'<button class="btn" data-journey="back">Back</button>':'<button class="btn" data-journey="skip">Skip</button>')+'<button class="btn primary" data-journey="next">'+(step===steps.length-1?'Finish':'Next')+'</button></div></section>';
    tour.hidden=false;tour.setAttribute('aria-hidden','false');document.body.classList.add('tour-open'); activeTargets=targets;
    targets.forEach(t=>{t.classList.add('journey-highlight');t.setAttribute('data-journey-target','true')});
    requestAnimationFrame(()=>{if(targets.length)targets[0].scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTimeout(()=>placeDialog(targets),220)});
  };
  const finish=()=>{try{localStorage.setItem('netPsychJourneySeen','1')}catch(e){}close()};
  window.__openLearningJourney=()=>{step=0;render()};
  tour.addEventListener('click',e=>{
    const action=e.target.closest('[data-journey]');
    if(action){const act=action.dataset.journey;if(act==='skip'){finish();return}if(act==='back'){step=Math.max(0,step-1);render();return}if(step===steps.length-1){finish();return}step+=1;render();return}
    const target=e.target.closest('[data-journey-target]');
    if(target){e.preventDefault();e.stopPropagation();const slot=tour.querySelector('.journey-preview-slot');if(slot&&!slot.innerHTML){slot.innerHTML=previewMarkup(steps[step].preview);slot.hidden=false;requestAnimationFrame(()=>placeDialog(activeTargets))}}
  });
  document.addEventListener('click',e=>{if(!document.body.classList.contains('tour-open'))return;const target=e.target.closest('[data-journey-target]');if(target){e.preventDefault();e.stopPropagation()}},true);
  window.addEventListener('resize',()=>{if(!tour.hidden&&activeTargets.length)placeDialog(activeTargets)});
  if(!seen)setTimeout(render,700);
}
let deferredInstallPrompt=null;
function initPwaInstallPrompt(){
  const box=document.querySelector('#installPrompt'); if(!box)return;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault(); deferredInstallPrompt=event;
    let dismissed=false; try{dismissed=localStorage.getItem('netPsychInstallDismissed')==='1'}catch(e){}
    if(dismissed||window.matchMedia('(display-mode: standalone)').matches)return;
    box.innerHTML='<div><strong>Make NET Psychology your study app</strong><span>Install this Study Hub for quicker access and an app-like study experience.</span></div><div class="install-actions"><button class="btn" data-install="dismiss">Not now</button><button class="btn primary" data-install="install">Install App</button></div>';
    box.hidden=false;box.setAttribute('aria-hidden','false');
  });
  box.addEventListener('click',async e=>{const b=e.target.closest('[data-install]');if(!b)return;if(b.dataset.install==='dismiss'){try{localStorage.setItem('netPsychInstallDismissed','1')}catch(e){}box.hidden=true;return}if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch(e){}deferredInstallPrompt=null;box.hidden=true;}});
  window.addEventListener('appinstalled',()=>{box.hidden=true;deferredInstallPrompt=null});
}
function home(){
  const started=startedMicrotopics().sort((a,b)=>new Date(getP(b.k).lastRevision||getP(b.k).last||getP(b.k).startedAt||0)-new Date(getP(a.k).lastRevision||getP(a.k).last||getP(a.k).startedAt||0));
  const practiceActivity=Array.isArray(state()._practiceHistory)&&state()._practiceHistory.length>0;
  const hasStarted=started.length>0||practiceActivity,hero=$('#homeHero'),resume=started[0],summary=progressSummary();
  const continueHref='learner.html';
  if(hasStarted){
    hero.innerHTML='<div class="hero-kicker"><div class="eyebrow">YOUR NEXT STEP</div></div><h1>KEEP BUILDING KNOWLEDGE YOU CAN RECALL.</h1><p>Learn at your own pace, strengthen recall, apply what you know, and return to concepts when they need attention.</p><div class="hero-actions"><a class="hero-cta" href="'+continueHref+'"><span>CONTINUE LEARNING</span><b>→</b></a></div>';
  }else{
    hero.innerHTML='<div class="hero-kicker"><div class="eyebrow">UGC NET PSYCHOLOGY</div></div><h1>LEARN. UNDERSTAND MORE.<br>REMEMBER LONGER.</h1><p>Learn the concept. Strengthen recall. Revise it at the right time.</p><div class="hero-actions"><a class="hero-cta" href="start.html"><span>START LEARNING</span></a></div>';
  }
  renderNetCountdown(summary);
  const cards={learn:'<a class="daily-focus-card" data-daily-preview="learn" href="daily3.html" aria-label="Learn"><strong>LEARN</strong><span>→</span></a>',practice:'<a class="daily-focus-card" data-daily-preview="practice" href="daily-practice.html" aria-label="Practice"><strong>PRACTICE</strong><span>→</span></a>'};
  const sequence=[cards.learn,cards.practice];
  $('#today').innerHTML='<section class="study-focus study-focus-enhanced"><div class="study-focus-main"><div class="eyebrow">YOUR DAILY LEARNING</div><h2>Your minimum study target for today</h2><p>Daily Learning is the day’s complete study target: <strong>3 focused concepts followed by a 10-question practice test</strong>. Finish both parts to complete today’s learning session. Scheduled revision is handled separately when concepts become due.</p></div><div class="study-focus-actions daily-focus-actions">'+sequence.join('')+'</div></section>';
  // Quick Learn is injected after Home has rendered, from the compact home-learning payload.
  const quick=quickLearnItem(),quickBox=$('#quickLearn');
  if(quickBox&&quick) renderHomeLearning();
  const approach=$('#learningApproach');if(approach)approach.innerHTML=`<div class="learning-path-bar"><div class="learning-path-label"><span class="eyebrow">LEARNING PATH</span><button class="text-button" type="button" data-open-journey>Know Your Learning Journey</button></div><div class="learning-path-sequence" aria-label="Learning sequence"><span class="learning-step active"><b>01</b>Learn</span><i aria-hidden="true">→</i><span class="learning-step"><b>02</b>Recall</span><i aria-hidden="true">→</i><span class="learning-step"><b>03</b>Revise</span><i aria-hidden="true">→</i><span class="learning-step"><b>04</b>Practice</span></div></div>`;
}
function daily3(){
  document.title='3-Concept Learning — UGC NET Psychology';
  const now=new Date(); const todayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const allItems=all(),keyName='netPsychDailyLearning';
  let existingToday=null;
  try{const storedToday=JSON.parse(localStorage.getItem('netPsychDaily3')||'null');if(storedToday?.date===todayKey&&Array.isArray(storedToday.items))existingToday=storedToday.items.map(k=>allItems.find(x=>x.k===k)).filter(Boolean)}catch(e){}
  if(existingToday?.length){
    $('#daily3App').innerHTML='<section class="page-hero daily3-hero"><div class="eyebrow">3-CONCEPT DAILY SESSION</div><h1>Learn three concepts today.</h1><p>Today’s learning target has two parts: <strong>3 focused concepts</strong>, followed by a <strong>10-question practice test</strong>. Complete both to finish today’s Daily Learning.</p></section><section class="daily3-list">'+existingToday.map((x,i)=>'<article class="daily3-item card"><div class="daily3-number">0'+(i+1)+'</div><div class="daily3-copy"><div class="eyebrow">UNIT '+x.u.id+(partForTopic(x.u,x.t)?' · PART '+esc(partForTopic(x.u,x.t).id):'')+' · TOPIC '+x.t.id+'</div><h2>'+esc(x.m.title)+'</h2><p>'+esc(x.t.title)+'</p></div>'+(()=>{const p=getP(key(x.u.id,x.t.id,x.m.id));const done=!!p.recallCompletedAt||p.status==='MASTERED';return done?'<a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">COMPLETED ✓</a>':'<a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">START CONCEPT</a>'})()+'</article>').join('')+'</section><section class="panel daily3-note"><b>Part 1 of today’s target: 3 concepts.</b><span>After completing these concepts, take today’s 10-question practice test to complete Daily Learning.</span><div style="margin-top:12px"><a class="btn primary" href="daily-practice.html">TAKE TODAY’S 10-QUESTION TEST →</a></div></section>';
    return;
  }
  let firstLearner=false;
  try{firstLearner=!localStorage.getItem('netPsychDailyLearning');}catch(e){}
  const predefined=firstLearner?(CANONICAL_CONTENT.homeLearning?.daily_concepts||[]).map(c=>allItems.find(x=>x.k===String(c.unit)+'-'+String(c.topic)+'-'+String(c.micro))).filter(Boolean):[];
  if(firstLearner&&predefined.length===3){
    const session=predefined;
    try{localStorage.setItem('netPsychDaily3',JSON.stringify({date:todayKey,items:session.map(x=>x.k)}))}catch(e){}
    $('#daily3App').innerHTML='<section class="page-hero daily3-hero"><div class="eyebrow">3-CONCEPT DAILY SESSION</div><h1>Learn three concepts today.</h1><p>Part 1 of today’s target: complete these 3 concepts. Then take the 10-question practice test to finish Daily Learning.</p></section><section class="daily3-list">'+session.map((x,i)=>'<article class="daily3-item card"><div class="daily3-number">0'+(i+1)+'</div><div class="daily3-copy"><div class="eyebrow">UNIT '+x.u.id+(partForTopic(x.u,x.t)?' · PART '+esc(partForTopic(x.u,x.t).id):'')+' · TOPIC '+x.t.id+'</div><h2>'+esc(x.m.title)+'</h2><p>'+esc(x.t.title)+'</p></div><a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">START CONCEPT</a></article>').join('')+'</section><section class="panel daily3-note"><b>Part 1 of today’s target: 3 concepts.</b><span>This starter set is predefined for new learners. Then take the 10-question practice test to complete Daily Learning. Scheduled revision remains separate.</span><div style="margin-top:12px"><a class="btn primary" href="daily-practice.html">TAKE TODAY’S 10-QUESTION TEST →</a></div></section>';
    return;
  }
  let rotation={served:[],cycle:0,lastDate:null};
  try{const stored=JSON.parse(localStorage.getItem(keyName)||'null');if(stored&&Array.isArray(stored.served))rotation={served:stored.served,cycle:Number(stored.cycle)||0,lastDate:stored.lastDate||null}}catch(e){}
  const validKeys=new Set(allItems.map(x=>x.k)); let served=rotation.served.filter(k=>validKeys.has(k));
  const chosen=[]; const addUnique=list=>{for(const x of list){if(!chosen.some(y=>y.k===x.k))chosen.push(x);if(chosen.length===3)break}};
  addUnique(allItems.filter(x=>getP(x.k).status==='NEW'&&!served.includes(x.k)));
  addUnique(allItems.filter(x=>getP(x.k).status==='NEW'));
  addUnique(allItems.filter(x=>!served.includes(x.k)));
  addUnique(dueItems());
  addUnique(allItems);
  const session=interleaveBy(chosen,x=>x.u.id,3);
  if(!session.length){$('#daily3App').innerHTML='<section class="panel empty"><h2>No concepts available</h2><p>Choose a topic from Learn when you are ready to continue.</p></section>';return}
  const nextServed=[...served,...session.map(x=>x.k)],completedCycle=nextServed.length>=allItems.length;
  try{localStorage.setItem('netPsychDaily3',JSON.stringify({date:todayKey,items:session.map(x=>x.k)}));localStorage.setItem(keyName,JSON.stringify({served:completedCycle?[]:nextServed,cycle:completedCycle?rotation.cycle+1:rotation.cycle,lastDate:todayKey}))}catch(e){}
  $('#daily3App').innerHTML='<section class="page-hero daily3-hero"><div class="eyebrow">3-CONCEPT DAILY SESSION</div><h1>Learn three concepts today.</h1><p>Work through three focused concepts today. Start with each concept, build your understanding, and move on when you are ready.</p></section><section class="daily3-list">'+session.map((x,i)=>'<article class="daily3-item card"><div class="daily3-number">0'+(i+1)+'</div><div class="daily3-copy"><div class="eyebrow">UNIT '+x.u.id+(partForTopic(x.u,x.t)?' · PART '+esc(partForTopic(x.u,x.t).id):'')+' · TOPIC '+x.t.id+'</div><h2>'+esc(x.m.title)+'</h2><p>'+esc(x.t.title)+'</p></div><a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">START CONCEPT</a></article>').join('')+'</section><section class="panel daily3-note"><b>Part 1 of today’s target: 3 concepts.</b><span>Three concepts keep the learning load focused. Your Daily Learning session is completed by taking the 10-question practice test next. Scheduled revisions remain separate.</span><div style="margin-top:12px"><a class="btn primary" href="daily-practice.html">TAKE TODAY’S 10-QUESTION TEST →</a></div></section>';
}
function nextLink(){const ps=state(),due=all().find(x=>ps[x.k]?.next&&new Date(ps[x.k].next)<=new Date());if(due)return `microtopic.html?unit=${due.u.id}&topic=${due.t.id}&micro=${due.m.id}`;const started=all().find(x=>ps[x.k]?.status&&ps[x.k].status!=='NEW');if(started)return `microtopic.html?unit=${started.u.id}&topic=${started.t.id}&micro=${started.m.id}`;return 'unit.html?id=1'}
function dueItems(){const now=Date.now();return all().filter(x=>getP(x.k).next&&Date.parse(getP(x.k).next)<=now).sort((a,b)=>Date.parse(getP(a.k).next)-Date.parse(getP(b.k).next))}
function scheduleRevision(k,rating='initial'){const p=getP(k),now=new Date(),history=Array.isArray(p.revisionHistory)?p.revisionHistory.slice(-20):[];if(rating==='initial'){const next=new Date(now.getTime()+86400000);setP(k,{next:next.toISOString(),nextInterval:1,revisionCount:Number(p.revisionCount)||0,revisionStartedAt:p.revisionStartedAt||now.toISOString(),revisionHistory:history});return next}const count=(Number(p.revisionCount)||0)+1,previous=Math.max(1,Number(p.nextInterval)||1);let days=1;if(rating==='hard')days=Math.max(2,Math.round(previous*1.5));if(rating==='good')days=count===1?3:Math.max(4,Math.round(previous*2));if(rating==='easy')days=count===1?7:Math.max(7,Math.round(previous*2.5));const next=new Date(now.getTime()+days*86400000),successful=(p.successfulRevisions||0)+(rating==='good'||rating==='easy'?1:0),mastered=successful>=3&&count>=3&&rating!=='again';setP(k,{next:next.toISOString(),nextInterval:days,revisionCount:count,lastRevision:now.toISOString(),lastRating:rating,rating,successfulRevisions:successful,status:mastered?'MASTERED':'RETENTION',revisionHistory:[...history,{rating,at:now.toISOString(),interval:days}].slice(-20),last:now.toISOString()});return next}
function interleaveBy(list,keyFn,limit){const buckets=new Map();for(const item of list){const key=keyFn(item);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(item)}const out=[];while(out.length<limit&&buckets.size){for(const [key,bucket] of [...buckets]){const item=bucket.shift();if(item)out.push(item);if(!bucket.length)buckets.delete(key);if(out.length===limit)break}}return out}
function dailyPractice(){
  const root=$('#dailyPracticeApp');
  if(!root)return;
  const today=new Date(),todayKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const allQuestions=Array.isArray(PRACTICE_QUESTIONS)?PRACTICE_QUESTIONS.filter(Boolean):[];
  const configured=Number(CANONICAL_CONTENT.homeLearning?.daily_practice?.count)||10;
  const setSize=Math.max(1,Math.min(10,configured));
  let stored=null;
  try{stored=JSON.parse(localStorage.getItem('netPsychDailyPractice')||'null')}catch{}
  let questions=stored&&stored.date===todayKey&&Array.isArray(stored.ids)
    ?stored.ids.map(id=>allQuestions.find(q=>String(q.id)===String(id))).filter(Boolean)
    :[];
  if(questions.length!==setSize){
    questions=allQuestions.slice().sort(()=>Math.random()-.5).slice(0,setSize);
    try{localStorage.setItem('netPsychDailyPractice',JSON.stringify({date:todayKey,ids:questions.map(q=>q.id)}))}catch{}
  }
  if(!questions.length){
    root.innerHTML='<section class="panel empty"><div class="eyebrow">DAILY LEARNING</div><h1>Today’s practice is not available yet.</h1><p>The 10-question practice bank could not be loaded. Please refresh once the content connection is available.</p><button class="btn primary" type="button" data-action="reload">RETRY</button></section>';
    return;
  }
  let current=0,correctCount=0,answers={};
  const renderComplete=()=>{
    const percent=Math.round(correctCount/questions.length*100);
    const review=questions.map((q,i)=>{
      const record=answers[i],opts=q.options||q.o||[],answer=Number.isInteger(q.answer)?q.answer:0,chosen=record?.chosen;
      const selectedText=chosen==null?'Not answered':String.fromCharCode(65+chosen)+'. '+(opts[chosen]??'');
      const correctText=String.fromCharCode(65+answer)+'. '+(opts[answer]??'');
      const status=record?.correct?'correct':'incorrect';
      return '<article class="practice-review-item"><div class="practice-review-head"><span class="eyebrow">QUESTION '+(i+1)+'</span><span class="practice-review-status '+status+'">'+(record?.correct?'CORRECT':record?'REVIEW':'NOT ANSWERED')+'</span></div>'+mcqHTML(q,i,'DAILY PRACTICE',false)+'<div class="practice-review-answers"><p><b>Your answer:</b> '+esc(selectedText)+'</p><p><b>Correct answer:</b> '+esc(correctText)+'</p></div><div class="practice-review-explanation"><b>Explanation</b><p>'+esc(contextualExplanation(q))+'</p></div></article>';
    }).join('');
    root.innerHTML='<section class="practice-complete card"><div class="eyebrow">DAILY PRACTICE COMPLETE</div><h1>You completed today’s 10-question check.</h1><p class="practice-score">'+correctCount+' of '+questions.length+' correct · '+percent+'%</p><p>This completes the practice part of today’s Daily Learning target. Review the explanations, especially the concepts behind questions you missed or found difficult.</p><div class="actions"><a class="btn primary" href="daily3.html">BACK TO DAILY LEARNING</a><a class="btn" href="practice.html">MORE PRACTICE</a></div></section><section class="practice-review"><div class="practice-review-intro"><div class="eyebrow">REVIEW</div><h2>Learn from your answers</h2><p>Use the explanations to identify what needs another look.</p></div>'+review+'</section>';
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const renderQuestion=()=>{
    const q=questions[current],answered=Object.prototype.hasOwnProperty.call(answers,current);
    root.innerHTML='<section class="practice-session card"><div class="session-head"><div><div class="eyebrow">DAILY PRACTICE · DAILY LEARNING</div><h1 id="dailySessionTitle">Question '+(current+1)+' of '+questions.length+'</h1><p>Answer from memory. Feedback appears after you choose.</p></div><a class="text-link" href="daily3.html">Back to Daily Learning</a></div><div class="session-progress"><i style="width:'+(((current+1)/questions.length)*100)+'%"></i></div><div class="session-questions">'+mcqHTML(q,0,'DAILY PRACTICE',false)+'</div><div class="session-navigation"><button class="btn" id="dailyPrev" type="button"'+(current===0?' disabled':'')+'>← PREVIOUS</button><button class="btn primary" id="dailyNext" type="button"'+(answered?'':' disabled')+'>'+(current===questions.length-1?'FINISH PRACTICE':'NEXT QUESTION')+'</button></div></section>';
    const session=root.querySelector('.practice-session'),card=session?.querySelector('.mcq'),nextBtn=session?.querySelector('#dailyNext');
    if(!session||!card||!nextBtn)return;
    if(answered){
      card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
      nextBtn.disabled=false;
    }
    session.onclick=event=>{
      const option=event.target.closest('.mcq-option');
      if(option&&session.contains(option)&&!Object.prototype.hasOwnProperty.call(answers,current)){
        const chosen=Number(option.dataset.a),answer=Number(card.dataset.answer),correct=chosen===answer;
        answers[current]={chosen,correct}; if(correct)correctCount++;
        card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
        option.classList.add(correct?'selected-correct':'selected-incorrect');
        nextBtn.disabled=false; return;
      }
      if(event.target.closest('#dailyNext')&&Object.prototype.hasOwnProperty.call(answers,current)){
        if(current<questions.length-1){current++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}
        else{
          const st=state();
          questions.forEach((q,i)=>st._practiceHistory=[...(st._practiceHistory||[]),{correct:Boolean(answers[i]?.correct),at:new Date().toISOString(),source:'daily'}].slice(-200));
          save(st);renderComplete();
        }
      }
      if(event.target.closest('#dailyPrev')&&current>0){current--;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}
    };
  };
  try{renderQuestion()}catch(err){
    console.error('Daily Practice render failed:',err);
    root.innerHTML='<section class="panel empty"><div class="eyebrow">DAILY PRACTICE</div><h1>We could not start today’s practice.</h1><p>Please refresh and try again.</p><button class="btn primary" type="button" data-action="reload">RETRY</button></section>';
  }
}
function unitPage(){
  const u=units().find(x=>String(x.id)===String(Q.get('id')||1));
  if(!u)return $('#unitPage').innerHTML='<div class="panel empty">Unit not found.</div>';
  document.title=`${u.title} — UGC NET Psychology`;
  const pos=units().findIndex(x=>String(x.id)===String(u.id)),prev=units()[pos-1],next=units()[pos+1];
  const prevLink=prev?`<a href="unit.html?id=${prev.id}">← Previous</a>`:'<span class="disabled">← Previous</span>';
  const nextLink=next?`<a href="unit.html?id=${next.id}">Next →</a>`:'<span class="disabled">Next →</span>';
  const explored=u.topics.reduce((n,t)=>n+t.microtopics.filter(m=>{const p=getP(key(u.id,t.id,m.id));return !!p.learnedAt||!!p.recallCompletedAt}).length,0);
  const topicCard=t=>{
    const published=t.microtopics.filter(m=>contentIsPublished('microtopics',key(u.id,t.id,m.id))),total=published.length,done=published.filter(m=>isStartedProgress(getP(key(u.id,t.id,m.id)))).length;
    return `<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><div class="topic-card-meta"><span class="eyebrow">TOPIC ${t.id}</span><span class="topic-progress">${done} of ${total} explored</span></div><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p></a>`;
  };
  const topicContent=unitParts(u).length?unitParts(u).map(part=>`<section class="unit-part-section panel"><div class="eyebrow">PART ${esc(part.id)}</div><h2>${esc(part.title)}</h2><p>${esc(part.description||'Focused learning section within this unit.')}</p><div class="topic-grid">${u.topics.filter(t=>part.topic_ids?.map(String).includes(String(t.id))).map(topicCard).join('')}</div></section>`).join(''):`<div class="topic-grid">${u.topics.map(topicCard).join('')}</div>`;
  $('#unitPage').innerHTML=`<div class="breadcrumbs"><a href="learn.html">Learning Path</a><span>›</span><span>Unit ${u.id}</span></div><section class="page-hero unit-hero"><h1>${esc(u.title)}</h1><p>${esc(u.description||'Build your understanding of this unit and connect its topics into a clear exam-ready framework.')}</p><div class="unit-progress"><strong>${explored} of ${countMicro(u)} concepts learned</strong>${unitParts(u).length?`<span>${unitParts(u).length} parts</span>`:''}</div></section><div class="unit-navigation"><a class="unit-nav-prev" href="${prev?`unit.html?id=${prev.id}`:'#'}">← Previous</a><a class="unit-nav-all" href="learn.html">All units</a><a class="unit-nav-next" href="${next?`unit.html?id=${next.id}`:'#'}">Next →</a></div>${topicContent}`;
}
function topicPage(){
  const {u,t}=find();
  if(!u||!t)return $('#topicPage').innerHTML='<div class="panel empty">Topic not found.</div>';
  document.title=`${t.title} — UGC NET Psychology`;
  const topicItems=(t.microtopics||[]).filter(m=>contentIsPublished('microtopics',key(u.id,t.id,m.id)));
  const progress=()=>{const ps=topicItems.map(m=>getP(key(u.id,t.id,m.id))),learned=ps.filter(p=>p.learnedAt||p.recallCompletedAt).length,mastered=ps.filter(p=>p.status==='MASTERED').length,due=ps.filter(p=>p.next&&Date.parse(p.next)<=Date.now()).length;return {started:learned,mastered,due,total:topicItems.length,percent:topicItems.length?Math.round(learned/topicItems.length*100):0}};
  const firstOpen=()=>{const ps=topicItems.map(m=>getP(key(u.id,t.id,m.id)));return topicItems.find((m,i)=>ps[i].status==='NEW'||(ps[i].next&&new Date(ps[i].next)<=new Date()))||topicItems[0]};
  const render=filter=>{
    const s=progress(),pinned=firstOpen();
    const list=topicItems.filter(m=>{const p=getP(key(u.id,t.id,m.id));if(filter==='new')return p.status==='NEW';if(filter==='learning')return p.status==='LEARNING'||p.status==='RETENTION';if(filter==='mastered')return p.status==='MASTERED';if(filter==='due')return p.next&&new Date(p.next)<=new Date();return true});
    const cards=list.map(m=>{
      const p=getP(key(u.id,t.id,m.id)),concept=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title,kp=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN')),qs=practiceFor(u.id,t.id,m.id),due=p.next&&new Date(p.next)<=new Date();
      return `<a class="micro-card topic-micro-card" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${m.id}"><div class="micro-card-top"><span class="micro-index">${String(topicItems.indexOf(m)+1).padStart(2,'0')}</span><span class="status ${p.status.toLowerCase()}">${p.status}</span>${due?'<span class="due">DUE</span>':''}</div><h3>${esc(m.title)}</h3><p>${esc(concept)}</p><div class="micro-card-info"><span>${kp.length||'Key'} key ideas</span><span>${qs.length} practice ${qs.length===1?'question':'questions'}</span></div><span class="link">${p.status==='NEW'?'Start learning':due?'Review now':'Continue learning'} <b>→</b></span></a>`;
    }).join('');
    const filters=['all','new','learning','mastered','due'].map(f=>`<button class="topic-filter ${filter===f?'active':''}" data-filter="${f}">${f==='all'?'All':f[0].toUpperCase()+f.slice(1)}${f==='due'&&s.due?' · '+s.due:''}</button>`).join('');
    $('#topicPage').innerHTML=`<div class="breadcrumbs"><a href="unit.html?id=${u.id}">Unit ${u.id}</a>${partForTopic(u,t)?`<span>›</span><span>Part ${esc(partForTopic(u,t).id)}</span>`:''}<span>›</span><span>Topic ${t.id}</span></div><section class="topic-learning-hero"><div class="topic-learning-copy"><div class="eyebrow">UNIT ${u.id}${partForTopic(u,t)?` · PART ${esc(partForTopic(u,t).id)}`:''} · TOPIC ${t.id}</div><h1>${esc(t.title)}</h1><p>${esc(t.explanation||'Build a clear understanding of this topic and its key distinctions.')}</p><div class="topic-hero-actions"><a class="btn primary" href="microtopic.html?unit=${u.id}&topic=${t.id}&micro=${pinned.id}">${s.started?'Continue Learning':'Start Learning'} <span>→</span></a><a class="btn" href="practice.html">Practice Questions</a></div></div><div class="topic-progress-card"><div class="eyebrow">TOPIC PROGRESS</div><strong>${s.percent}%</strong><div class="bar"><i style="width:${s.percent}%"></i></div><div class="topic-progress-stats"><span>${s.started}/${s.total} learned</span><span>${s.mastered} mastered</span></div></div></section><section class="card topic-notes-card"><div class="eyebrow">TOPIC NOTES</div><div class="notes topic-notes">${esc(t.notes||'Build the topic map first, then learn each micro-topic.')}</div></section><section class="topic-study-strip"><div><div class="eyebrow">HOW TO STUDY</div><h2>Move from understanding to durable recall.</h2></div><div class="topic-study-steps"><span><b>1</b> Understand</span><span><b>2</b> Recall</span><span><b>3</b> Apply</span><span><b>4</b> Practice</span><span><b>5</b> Revise</span></div></section><section class="topic-micro-section"><div class="topic-section-head"><div><div class="eyebrow">MICRO-TOPICS</div><h2>${topicItems.length} concepts to work through</h2><p>Choose one concept at a time, learn it fully, and use your progress to see what you have already worked through.</p></div><div class="topic-filters" role="tablist">${filters}</div></div><div class="micro-grid topic-micro-grid">${cards||'<div class="panel empty topic-empty"><h3>No micro-topics in this filter</h3><p>Try another filter or return to All.</p></div>'}</div></section>`;
    qsa('.topic-filter').forEach(b=>b.onclick=()=>render(b.dataset.filter));
  };
  render('all');
}
function practiceFor(u,t,m){
  return PRACTICE_QUESTIONS.filter(q=>Number(q.unit)===Number(u)&&Number(q.topic)===Number(t)&&Number(q.micro)===Number(m));
}

function cleanPracticeText(value){
  let text=String(value??"")
    .replace(/\r/g,"")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/&nbsp;/gi," ")
    .replace(/Tap\s+to\s+check\s+answer\s+key/gi," ")
    .replace(/\b\d+\s+UGC\s+NET(?:\s+JRF)?\s+[A-Za-z]+\s+\d{4}\s+Paper\s*(?:II|2)\b/gi," ")
    .replace(/\bUGC\s+NET(?:\s+JRF)?\s+[A-Za-z]+\s+\d{4}\s+Paper\s*(?:II|2)\b/gi," ")
    .replace(/\s+-\s+/g,"-")
    .replace(/\bchi-\s+square\b/gi,"chi-square")
    .replace(/\s*\*\s*/g," × ");
  return text.replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function stripQuestionTail(value){
  let text=cleanPracticeText(value);
  text=text.replace(/\s+\d+\s*\.?\s*Codes?\s*:\s*[\s\S]*$/i,"");
  text=text.replace(/\s+Codes?\s*:\s*[\s\S]*$/i,"");
  return text.trim();
}
function splitLabelledItems(value){
  const text=cleanPracticeText(value);
  const marker=/(?<!\S)([A-Za-z0-9]+)\s*[.)]+(?:\s+)/g;
  const hits=[];
  let match;
  while((match=marker.exec(text))) hits.push({label:match[1],start:match.index,end:marker.lastIndex});
  return hits.map((hit,i)=>{
    const end=i+1<hits.length?hits[i+1].start:text.length;
    return {label:hit.label.toLowerCase(),text:text.slice(hit.end,end).trim()};
  }).filter(x=>x.text);
}
function extractBeforeCodes(value){
  const text=cleanPracticeText(value);
  const i=text.search(/\s+\d+\s*[.)]?\s*Codes?\s*:/i);
  return i>=0?text.slice(0,i).trim():text;
}
function listItems(value,kind){
  const body=extractBeforeCodes(value);
  const items=splitLabelledItems(body);
  if(kind==='match'){
    return items;
  }
  return items;
}
function kindLabel(kind){
  return ({
    match:"MATCH THE COLUMNS",
    "assertion-reason":"ASSERTION · REASON",
    sequence:"SEQUENCE",
    "statement-set":"STATEMENT SET",
    direct:"MULTIPLE CHOICE"
  })[kind]||"QUESTION";
}
function practiceListHTML(items){
  return items.map(x=>"<div class=\"structured-item\"><span class=\"structured-item-label\">"+esc(x.label)+".</span><span>"+esc(x.text)+"</span></div>").join("");
}
function matchListsHTML(q){
  const raw=cleanPracticeText(q?.question||q?.q||"");
  const parsed=parseMatchLists(raw);
  const stem=stripQuestionTail(raw);
  if(!parsed.hasLeftHeader||!parsed.hasRightHeader||parsed.left.length<4||parsed.right.length<4){
    return "<div class=\"question-stem match-stem\"><p>"+esc(stem)+"</p></div>";
  }
  const cleanedStem=stem.replace(/^[\s\S]*?(?:match(?:\s+the\s+following)?|match)\s+list\s*[-–—]?\s*i\b[\s\S]*?List\s*[-–—]?\s*II\b/i,"").trim();
  return "<div class=\"question-stem match-stem\">"+(cleanedStem?"<p>"+esc(cleanedStem)+"</p>":"")+"<div class=\"matching-lists\"><section><div class=\"matching-label\">LIST I</div><div class=\"matching-items\">"+practiceListHTML(parsed.left)+"</div></section><section><div class=\"matching-label\">LIST II</div><div class=\"matching-items\">"+practiceListHTML(parsed.right)+"</div></section></div></div>";
}
function assertionReasonHTML(q){
  const raw=cleanPracticeText(q?.question||q?.q||"");
  const assertion=(raw.match(/Assertion\s*\(A\)\s*:\s*([\s\S]*?)(?=\s+\d+\s*\.?\s*Reason\s*\(R\)|\s+Reason\s*\(R\)\s*:)/i)||[])[1]||"";
  const reason=(raw.match(/Reason\s*\(R\)\s*:\s*([\s\S]*?)(?=\s+\d+\s*\.?\s*Codes?\s*:|\s+Codes?\s*:|$)/i)||[])[1]||"";
  const stem=raw.split(/Assertion\s*\(A\)\s*:/i)[0].replace(/[\s:–-]+$/,"").replace(/\s+\d+\s*\.?\s*$/,"").trim();
  return "<div class=\"question-stem assertion-stem\">"+
    (stem?"<p>"+esc(stem)+"</p>":"")+
    "<div class=\"assertion-reason-grid\">"+
    "<section><span class=\"statement-label\">A</span><div><b>Assertion</b><p>"+esc(assertion||"Assertion statement")+"</p></div></section>"+
    "<section><span class=\"statement-label\">R</span><div><b>Reason</b><p>"+esc(reason||"Reason statement")+"</p></div></section>"+
    "</div></div>";
}
function structuredQuestionHTML(q){
  if(window.NETPSYQuestionRenderer?.structuredQuestionHTML)return window.NETPSYQuestionRenderer.structuredQuestionHTML(q);
  const kind=q?.kind||"direct";
  const raw=cleanPracticeText(q?.question||q?.q||"");
  if(kind==="match")return matchListsHTML(q);
  if(kind==="assertion-reason")return assertionReasonHTML(q);
  if(kind==="sequence"||kind==="statement-set"){
    const body=extractBeforeCodes(raw);
    const items=splitLabelledItems(body);
    const hasNumeric=items.filter(x=>/^\d+$/.test(x.label)).length>=2;
    const preferred=hasNumeric?items.filter(x=>/^\d+$/.test(x.label)):items.filter(x=>/^(?:[a-d]|i{1,3}|iv|v|vi|vii|viii)$/i.test(x.label));
    let stem=body;
    if(preferred.length){
      const firstLabel=preferred[0].label;
      const markerRe=new RegExp("(?<!\\S)"+firstLabel+"\\s*[.)]+\\s+","i");
      const markerIndex=body.search(markerRe);
      if(markerIndex>=0)stem=body.slice(0,markerIndex);
    }
    const optionMarker=stem.search(/\s(?:\([a-d]\)|[a-d]\.)\s+/i);
    const cleanStem=(optionMarker>=0?stem.slice(0,optionMarker):stem).replace(/\s*:\s*$/,"").trim();
    return "<div class=\"question-stem structured-stem\">"+(cleanStem?"<p>"+esc(cleanStem)+"</p>":"")+(preferred.length?"<div class=\"question-items\">"+practiceListHTML(preferred)+"</div>":"")+"</div>";
  }
  return "<div class=\"question-stem direct-stem\"><p>"+esc(stripQuestionTail(raw))+"</p></div>";
}
function mcqHTML(q,i,source='MCQ',showSource=true){
  const opts=q.options||q.o||[];
  const ans=Number.isInteger(q.answer)?q.answer:0;
  const tags=Array.isArray(q.source_tags)&&q.source_tags.length?q.source_tags:[source];
  const provenance=tags.join(' · ');
  const kind=q.kind||"direct";
  const sourceLabel=q.session?String(q.session)+" · PYQ":provenance;
  return "<article class=\"mcq\" data-i=\""+i+"\" data-answer=\""+ans+"\" data-kind=\""+esc(kind)+"\">"+
    "<div class=\"mcq-meta\"><span class=\"question-kind\">"+esc(kindLabel(kind))+"</span>"+(showSource?"<span class=\"question-source\">"+esc(sourceLabel)+" · Q"+esc(q.question_number??(i+1))+"</span>":"")+"</div>"+
    structuredQuestionHTML(q)+
    "<div class=\"mcq-options\">"+opts.map((o,j)=>"<button class=\"mcq-option\" type=\"button\" data-a=\""+j+"\"><span class=\"option-letter\">"+String.fromCharCode(65+j)+"</span><span class=\"option-text\">"+esc(o)+"</span></button>").join("")+"</div>"+
    "<div class=\"mcq-feedback\" hidden></div></article>";
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
  document.title=m.title+' — UGC NET Psychology';
  if(!contentIsPublished('microtopics',k)){
    $('#microPage').innerHTML='<section class="panel empty"><div class="eyebrow">CONTENT UNDER REVIEW</div><h1>This concept is temporarily unavailable.</h1><p>The learning content is being quality-checked before it is served.</p><a class="btn primary" href="learn.html">BACK TO LEARN</a></section>';
    return;
  }
  const items=all(),idx=items.findIndex(x=>x.k===k),next=items[idx+1];
  const notes=String(m.content_notes||'');
  const concept=String(m.expert_explanation||section(notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title).trim();
  const kp=bullets(section(notes,'KEY POINTS','\n\nDISTINCTION / CAUTION'));
  const distinction=section(notes,'DISTINCTION / CAUTION','\n\nPYQ-STYLE PATTERN').trim();
  const deep=String(m.detailed_explanation||m.deep||concept).trim();
  const nextHref=next?'microtopic.html?unit='+encodeURIComponent(next.u.id)+'&topic='+encodeURIComponent(next.t.id)+'&micro='+encodeURIComponent(next.m.id):'learn.html';
  const fromRevision=Q.get('from')==='revision';const recallHref='active-recall.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id)+(fromRevision?'&from=revision':'');
  setP(k,{started:true,status:p.status==='NEW'?'LEARNING':p.status,last:new Date().toISOString()});
  $('#microPage').innerHTML='<section class="micro-learn-page">'+
    '<div class="micro-breadcrumb"><a href="learn.html">Learn</a><span>›</span><span>'+esc(t.title)+'</span></div>'+
    '<header class="micro-learn-header"><h1>'+esc(m.title)+'</h1></header>'+
    '<article class="micro-exam-content card"><div class="micro-exam-copy">'+
    '<p class="micro-expert-explanation">'+esc(concept)+'</p>'+
    (kp.length?'<section class="micro-exam-section"><h3>KEY POINTS</h3><ul class="key-points">'+kp.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>':'')+
    (distinction?'<section class="micro-exam-section"><h3>DISTINCTION</h3><p>'+esc(distinction.replace(/^•\s*/,'').trim())+'</p></section>':'')+
    '</div></article>'+
    '<section class="micro-learning-actions">'+
    '<a class="micro-action" href="deep-dive.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id)+'"><span>DEEP DIVE</span></a>'+
    '<a class="micro-action" href="'+recallHref+'"><span>CHECK YOUR RECALL</span></a>'+
    '<a class="micro-action" href="'+nextHref+'"><span>NEXT</span></a>'+
    '</section></section>';
}
function practice(){
  const box=$('#practiceApp');
  const unitOptions=units().map(u=>{
    const unit=`<button class="practice-unit-option" type="button" data-practice-choice data-choice-group="scope" data-multi="true" data-scope="unit" data-value="${esc(u.id)}" data-unit="${esc(u.id)}" aria-pressed="false"><span><b>Unit ${esc(u.id)}</b> — ${esc(u.title)}</span></button>`;
    const partOptions=unitParts(u).map(part=>`<button class="practice-unit-option practice-part-option" type="button" data-practice-choice data-choice-group="scope" data-multi="true" data-scope="part" data-unit="${esc(u.id)}" data-value="${esc(part.id)}" aria-pressed="false"><span>↳ Part ${esc(part.id)} — ${esc(part.title)}</span></button>`).join('');
    return unit+partOptions;
  }).join('');
  const scopeHTML=`<button class="practice-unit-trigger" id="practiceUnitTrigger" type="button" aria-expanded="false" aria-controls="practiceUnitList"><span class="practice-unit-summary" id="practiceUnitSummary">No units selected</span></button><div class="practice-unit-list" id="practiceUnitList" hidden><button class="practice-unit-option practice-all-option" type="button" data-practice-choice data-choice-group="scope" data-multi="true" data-scope="all" data-value="all" aria-pressed="false"><span><b>All Units</b></span></button>${unitOptions}</div>`;
  box.innerHTML=`<section class="page-hero practice-hero"><h1>How well can you apply what you know?</h1><p>Check how well you can apply Psychology. Choose what you want to practise, answer one question at a time, and learn from your mistakes.</p></section><section class="practice-config card"><div class="practice-config-head"><div><div class="eyebrow">PLAN YOUR PRACTICE SESSION</div><p class="practice-config-intro">Choose what you want to practise, then work through one question at a time. In timed practice, you can skip a question and return to it before you finish.</p></div></div><div class="practice-toolbar">
<div class="practice-unit-field"><span class="practice-field-label">Select unit</span>${scopeHTML}</div>
<div class="practice-choice-field"><span class="practice-field-label">Type of questions</span><div class="practice-choice-group" id="practiceTypeChoices" role="group" aria-label="Question types"><button class="practice-choice" type="button" data-practice-choice data-choice-group="type" data-multi="true" data-value="mcq" aria-pressed="false">MCQs</button><button class="practice-choice" type="button" data-practice-choice data-choice-group="type" data-multi="true" data-value="pyq" aria-pressed="false">PYQs</button></div><small class="practice-choice-help">Select one or both.</small></div>
<div class="practice-choice-field"><span class="practice-field-label">Practice mode</span><div class="practice-choice-group" id="practiceModeChoices" role="group" aria-label="Practice mode"><button class="practice-choice" type="button" data-practice-choice data-choice-group="mode" data-value="self-paced" aria-pressed="false">SELF-PACED</button><button class="practice-choice" type="button" data-practice-choice data-choice-group="mode" data-value="timed" aria-pressed="false">TIMED</button></div></div>
<div class="practice-choice-field" id="practiceSizeField"><span class="practice-field-label">Number of questions</span><div class="practice-choice-group practice-size-group" id="practiceSizeChoices" role="group" aria-label="Number of questions"><button class="practice-choice" type="button" data-practice-choice data-choice-group="size" data-value="10" aria-pressed="false">10</button><button class="practice-choice" type="button" data-practice-choice data-choice-group="size" data-value="25" aria-pressed="false">25</button><button class="practice-choice" type="button" data-practice-choice data-choice-group="size" data-value="50" aria-pressed="false">50</button><button class="practice-choice" type="button" data-practice-choice data-choice-group="size" data-value="100" aria-pressed="false">100</button></div></div>
</div></div><section class="practice-expect"><div class="eyebrow">WHAT TO EXPECT</div><p id="practiceExpectation">Choose your settings to shape the practice session around what you want to work on.</p></section><div class="practice-start"><button class="btn primary" id="startSet" type="button" disabled>START PRACTICE →</button></div></section><div id="practiceSet"></div>`;
  const unitTrigger=$('#practiceUnitTrigger');
  const unitList=$('#practiceUnitList');
  unitTrigger.addEventListener('click',()=>{
    const open=unitList.hidden;
    unitList.hidden=!open;
    unitTrigger.setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('click',e=>{
    if(unitList.hidden||unitTrigger.contains(e.target)||unitList.contains(e.target))return;
    unitList.hidden=true;
    unitTrigger.setAttribute('aria-expanded','false');
  });
  // Units, parts and All Units use the same choice model as MCQs/PYQs.
  const scopeInputs=()=>Array.from(document.querySelectorAll('#practiceUnitList [data-practice-choice][data-choice-group="scope"]'));
  const selectedScope=()=>scopeInputs().filter(x=>x.classList.contains('selected'));
  const updateScopeSummary=()=>{
    const selected=selectedScope();
    const allSelected=selected.some(x=>x.dataset.scope==='all');
    const summary=$('#practiceUnitSummary');
    if(!summary)return;
    const trigger=$('#practiceUnitTrigger');
    if(trigger)trigger.classList.toggle('has-selection',selected.length>0);
    if(allSelected){summary.textContent='All units selected';return}
    if(!selected.length){summary.textContent='No units selected';return}
    const unitsSelected=selected.filter(x=>x.dataset.scope==='unit').map(x=>`Unit ${x.dataset.value}`);
    const partsSelected=selected.filter(x=>x.dataset.scope==='part').map(x=>`Part ${x.dataset.unit}${x.dataset.value}`);
    const labels=[...unitsSelected,...partsSelected];
    if(unitsSelected.length>1&&partsSelected.length===0)summary.textContent=`${unitsSelected.length} units selected`;
    else if(partsSelected.length>1&&unitsSelected.length===0)summary.textContent=`${partsSelected.length} parts selected`;
    else if(unitsSelected.length===1&&partsSelected.length===0)summary.textContent=`${unitsSelected[0]} selected`;
    else if(partsSelected.length===1&&unitsSelected.length===0)summary.textContent=`${partsSelected[0]} selected`;
    else summary.textContent=`${labels.length} selections`;
  };
  const selectedPracticeChoices=group=>Array.from(document.querySelectorAll('[data-practice-choice][data-choice-group="'+group+'"].selected')).map(x=>x.dataset.value);
  const selectedPracticeChoice=group=>selectedPracticeChoices(group)[0]||'';
  const setPracticeChoices=(group,values)=>document.querySelectorAll('[data-practice-choice][data-choice-group="'+group+'"]').forEach(btn=>{const on=values.includes(btn.dataset.value);btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',String(on))});
  const getPracticePool=(types,selected)=>{
    let qs=PRACTICE_QUESTIONS.slice();
    if(types.length===1){
      qs=qs.filter(q=>{
        const tags=(q.source_tags||[]).map(x=>String(x).toLowerCase());
        const isPyq=tags.some(x=>x.includes('pyq')||x.includes('previous'));
        return types[0]==='pyq'?isPyq:!isPyq;
      });
    }
    const allUnits=selected.length===0||selected.some(x=>x.dataset.scope==='all');
    if(allUnits)return qs;
    const unitIds=new Set(selected.filter(x=>x.dataset.scope==='unit').map(x=>String(x.dataset.value)));
    const partKeys=new Set(selected.filter(x=>x.dataset.scope==='part').map(x=>`${x.dataset.unit}:${x.dataset.value}`));
    return qs.filter(q=>{
      if(unitIds.has(String(q.unit)))return true;
      const u=units().find(x=>String(x.id)===String(q.unit));
      const t=u?.topics.find(x=>String(x.id)===String(q.topic));
      return [...partKeys].some(k=>{
        const [uid,pid]=k.split(':');
        const part=units().find(x=>String(x.id)===uid)?.parts?.find(x=>String(x.id)===pid);
        return String(q.unit)===uid&&!!part?.topic_ids?.map(String).includes(String(t?.id));
      });
    });
  };
  const syncPracticeSetup=()=>{
    const selectedTypes=selectedPracticeChoices('type'),mode=selectedPracticeChoice('mode'),selected=selectedScope();
    const pool=getPracticePool(selectedTypes,selected);
    const unitCount=new Set(selected.filter(x=>x.dataset.scope==='unit').map(x=>String(x.dataset.value))).size;
    const hasAll=selected.some(x=>x.dataset.scope==='all');
    const hideSize=!hasAll&&((selectedTypes.length===1&&unitCount>0&&unitCount<=5)||(selectedTypes.length===2&&unitCount>0&&unitCount<=3));
    const sizeField=$('#practiceSizeField');
    if(sizeField)sizeField.hidden=hideSize;
    if(hideSize)setPracticeChoices('size',['10']);
    const size=hideSize?'10':selectedPracticeChoice('size');
    const start=$('#startSet');
    start.disabled=!Boolean(size&&selectedTypes.length&&mode&&selected.length&&pool.length>=Number(size));
    const scopeLabel=hasAll?'the selected units':selected.filter(x=>x.dataset.scope!=='all').map(x=>x.dataset.scope==='unit'?'the selected unit':'the selected part').join(' and ');
    const expectation=$('#practiceExpectation');
    if(expectation){
      if(!selectedTypes.length||!mode||!selected.length) expectation.textContent='Select your unit, question type, and practice mode to see what your session will be like.';
      else if(pool.length<Number(size)) expectation.textContent='There are not enough questions for this practice selection. Choose a different question type or add more units.';
      else if(hideSize) expectation.textContent='You’ll practise a focused 10-question set from '+scopeLabel+'. '+(mode==='timed'?'The session is timed, and explanations appear after you finish.':'The session is self-paced, with feedback as you work through each question.');
      else if(!size) expectation.textContent='Choose how many questions you want in this practice session.';
      else expectation.textContent='You’ll practise '+size+' questions from '+scopeLabel+'. '+(mode==='timed'?'The session is timed, and explanations appear after you finish.':'The session is self-paced, with feedback as you work through each question.');
    }
  };
  qsa('[data-practice-choice]').forEach(btn=>btn.addEventListener('click',()=>{
    const group=btn.dataset.choiceGroup;
    if(group==='scope'){
      const isAll=btn.dataset.scope==='all';
      const wasSelected=btn.classList.contains('selected');
      if(isAll){
        document.querySelectorAll('[data-practice-choice][data-choice-group="scope"]').forEach(x=>{
          const on=!wasSelected&&x===btn;
          x.classList.toggle('selected',on);
          x.setAttribute('aria-pressed',String(on));
        });
        if(!wasSelected){
          unitList.hidden=true;
          unitTrigger.setAttribute('aria-expanded','false');
        }
      }else{
        const allBtn=document.querySelector('[data-practice-choice][data-choice-group="scope"][data-scope="all"]');
        if(allBtn){
          allBtn.classList.remove('selected');
          allBtn.setAttribute('aria-pressed','false');
        }
        const on=!wasSelected;
        btn.classList.toggle('selected',on);
        btn.setAttribute('aria-pressed',String(on));
      }
      updateScopeSummary();
      syncPracticeSetup();
      return;
    }
    if(group==='size'){
      const selected=selectedScope(),types=selectedPracticeChoices('type'),pool=getPracticePool(types,selected),n=Number(btn.dataset.value);
      const unitCount=new Set(selected.filter(x=>x.dataset.scope==='unit').map(x=>String(x.dataset.unit))).size;
      const hasAll=selected.some(x=>x.dataset.scope==='all');
      const hideSize=!hasAll&&((types.length===1&&unitCount>0&&unitCount<=5)||(types.length===2&&unitCount>0&&unitCount<=3));
      if(hideSize||pool.length<n){
        const expectation=$('#practiceExpectation');
        if(expectation)expectation.textContent='Not enough questions available for this practice selection.';
        return;
      }
    }
    if(btn.dataset.multi==='true'){
      const on=!btn.classList.contains('selected');
      btn.classList.toggle('selected',on);
      btn.setAttribute('aria-pressed',String(on));
    }else setPracticeChoices(group,[btn.dataset.value]);
    syncPracticeSetup();
  }));
  updateScopeSummary();
  syncPracticeSetup();
  let timerId=null;
  const stopTimer=()=>{if(timerId){clearInterval(timerId);timerId=null}};
  const formatTime=seconds=>{
    const s=Math.max(0,seconds),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };
  function draw(){
    unitList.hidden=true;
    unitTrigger.setAttribute('aria-expanded','false');
    const selectedMode=selectedPracticeChoice('mode'),selectedTypes=selectedPracticeChoices('type'),selectedScopes=selectedScope();
    const unitCount=new Set(selectedScopes.filter(x=>x.dataset.scope==='unit').map(x=>String(x.dataset.value))).size;
    const hasAll=selectedScopes.some(x=>x.dataset.scope==='all');
    const hideSize=!hasAll&&((selectedTypes.length===1&&unitCount>0&&unitCount<=5)||(selectedTypes.length===2&&unitCount>0&&unitCount<=3));
    const selectedSize=hideSize?'10':selectedPracticeChoice('size');
    if(!selectedSize||!selectedTypes.length||!selectedMode||!selectedScopes.length)return;
    if(getPracticePool(selectedTypes,selectedScopes).length<Number(selectedSize)){
      $('#practiceSet').innerHTML='<section class="panel empty practice-empty"><h2>Not enough questions available.</h2><p>Try another question type or choose more units, then start again.</p></section>';
      return;
    }
    stopTimer();
    let qs=getPracticePool(selectedPracticeChoices('type'),selectedScopes);
    const limit=+selectedSize;
    const allUnits=selectedScopes.length===0||selectedScopes.some(x=>x.dataset.scope==='all');
    const unitScope=selectedScopes;
    const groupingKey=allUnits?'unit':unitScope.some(x=>x.dataset.scope==='part')?'topic':'random';
    let seen=[];try{seen=JSON.parse(localStorage.getItem('netPsychPracticeSeen')||'[]')}catch{}
    const idOf=q=>String(q.id??q.question??'').trim();
    const fresh=qs.filter(q=>{const id=idOf(q);return id&&!seen.includes(id)});
    const pool=fresh.length>=limit?fresh:qs;
    qs=groupingKey==='random'?pool.sort(()=>Math.random()-.5).slice(0,limit):interleaveBy(pool.sort(()=>Math.random()-.5),x=>groupingKey==='unit'?x.unit:x.topic,limit);
    try{const next=[...seen,...qs.map(idOf).filter(Boolean)];localStorage.setItem('netPsychPracticeSeen',JSON.stringify(next.slice(-5000)))}catch{}
    if(!qs.length){
      $('#practiceSet').innerHTML='<section class="panel empty practice-empty"><h2>We couldn’t find questions for this selection.</h2><p>Try another question type or choose more units, then start again.</p></section>';
      return;
    }
    const mode=selectedMode,timed=mode==='timed';
    const totalSeconds=timed?Math.round(qs.length*(180*60/100)):0;
    let remaining=totalSeconds,current=0,correct=0,answered=false,ended=false,answers={},skipped=new Set();
    const recordPracticeAnswer=wasCorrect=>{
      const s=state();
      s._practiceHistory=[...(s._practiceHistory||[]),{correct:wasCorrect,at:new Date().toISOString()}].slice(-200);
      save(s);
    };
    const learningHrefForQuestion=q=>{
      const u=units().find(x=>String(x.id)===String(q?.unit)),t=u?.topics.find(x=>String(x.id)===String(q?.topic)),m=t?.microtopics.find(x=>String(x.id)===String(q?.micro));
      return u&&t&&m?'microtopic.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id):'learn.html';
    };
    const renderComplete=(timeUp=false)=>{
      stopTimer();
      const percent=Math.round(correct/qs.length*100);
      const resultText=timeUp?'The unanswered questions were left unanswered. Review the explanations now that the timed session has ended.':correct===qs.length?'You answered every question correctly.':'Some questions may need another look. Use the review below to understand the answer and explanation.';
      const review=timed?qs.map((q,i)=>{
        const record=answers[i],opts=q.options||q.o||[],answer=Number.isInteger(q.answer)?q.answer:0,chosen=record?record.chosen:null;
        const selectedText=chosen==null?'Not answered':String.fromCharCode(65+chosen)+'. '+opts[chosen];
        const correctText=String.fromCharCode(65+answer)+'. '+opts[answer];
        const status=record?.correct?'correct':'incorrect';
        return '<article class="practice-review-item"><div class="practice-review-head"><span class="eyebrow">QUESTION '+(i+1)+'</span><span class="practice-review-status '+status+'">'+(record?.correct?'CORRECT':record?'REVIEW':'NOT ANSWERED')+'</span></div>'+practiceQuestionHTML(q)+'<div class="practice-review-answers"><p><b>Your answer:</b> '+esc(selectedText)+'</p><p><b>Correct answer:</b> '+esc(correctText)+'</p></div><div class="practice-review-explanation"><b>Explanation</b><p>'+esc(contextualExplanation(q))+'</p></div></article>';
      }).join(''):'';
      const continueHref=learningHrefForQuestion(qs[0]);
      const reviewSection=timed?'<section class="practice-review"><div class="practice-review-intro"><div class="eyebrow">REVIEW</div><h2>Now learn from the questions.</h2><p>Read the explanation only after finishing the test. Focus on why the correct answer fits and why your response needs another look.</p></div>'+review+'</section>':'';
      $('#practiceSet').innerHTML='<section class="practice-complete card"><div class="eyebrow">'+(timeUp?'TIME UP':'PRACTICE COMPLETE')+'</div><h2>'+(timeUp?'Your practice time has ended.':'You completed the practice set.')+'</h2><p class="practice-score">'+correct+' of '+qs.length+' correct · '+percent+'%</p><p>'+resultText+'</p><div class="complete-actions"><a class="btn primary" href="practice.html">PRACTICE MORE →</a><a class="btn" href="'+continueHref+'">CONTINUE LEARNING →</a></div></section>'+reviewSection;
    };
    const finishForTime=()=>{
      if(ended)return;
      ended=true;
      const active=$('#practiceSet .mcq');
      if(active){
        active.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
        const fb=active.querySelector('.mcq-feedback');
        if(fb){fb.hidden=false;fb.innerHTML='<b class="incorrect">Time is up.</b> Your unanswered response was not counted.'}
      }
      renderComplete(true);
    };
    const updateTimer=()=>{
      const timer=$('#practiceTimer');
      if(!timer||!timed)return;
      timer.textContent=formatTime(remaining);
      timer.classList.toggle('is-urgent',remaining<=60);
    };
    const renderQuestion=()=>{
      const q=qs[current];
      answered=Boolean(answers[current]);
      const skippedList=timed&&skipped.size?Array.from(skipped).sort((a,b)=>a-b):[];
      const lastWithSkipped=timed&&current===qs.length-1&&skippedList.length>0;
      const nextLabel=lastWithSkipped?'ATTEMPT SKIPPED →':current===qs.length-1?'FINISH PRACTICE →':'NEXT QUESTION →';
      const skippedPanel=lastWithSkipped?'<div class="timed-skipped-panel"><div class="eyebrow">SKIPPED QUESTIONS</div><p>You can return to these before finishing the timed session.</p><div class="timed-skipped-list">'+skippedList.map(i=>'<button class="btn timed-skipped-question" type="button" data-skipped-index="'+i+'">QUESTION '+(i+1)+'</button>').join('')+'</div></div>':'';
      $('#practiceSet').innerHTML=`<section class="practice-session card"><div class="session-head"><div><div class="eyebrow">PRACTICE SESSION</div><h2 id="sessionTitle">Question ${current+1} of ${qs.length}</h2></div><div class="session-head-actions">${timed?`<span class="practice-timer" id="practiceTimer" aria-live="polite">${formatTime(remaining)}</span>`:''}<a class="text-link" href="practice.html">Start over</a></div></div><div class="session-progress"><i id="sessionProgress" style="width:${((current+1)/qs.length)*100}%"></i></div>${skippedPanel}<div class="session-questions">${mcqHTML(q,0,'PYQ',false)}</div><div class="session-navigation"><button class="btn" id="prevQuestion" type="button"${current===0?' disabled':''}>← PREVIOUS</button><button class="btn" id="skipQuestion" type="button"${answered?' disabled':''}>SKIP QUESTION</button><button class="btn primary" id="nextQuestion" type="button"${answered?'':' disabled'}>${nextLabel}</button></div></section>`;
      const card=$('#practiceSet .mcq');
      const prevBtn=$('#prevQuestion'),skipBtn=$('#skipQuestion'),nextBtn=$('#nextQuestion');
      const skippedButtons=qsa('.timed-skipped-question');
      if(answered){card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);if(!timed){const fb=card.querySelector('.mcq-feedback'),a=+card.dataset.answer;fb.hidden=false;fb.innerHTML=answers[current].correct?`<b class="correct">✓ Correct</b> ${esc(contextualExplanation(q))}`:`<b class="incorrect">✕ Not quite.</b> Correct answer: <b>${String.fromCharCode(65+a)}. ${esc((q.options||q.o)[a])}</b><br>${esc(contextualExplanation(q))}`}}
      card.querySelectorAll('.mcq-option').forEach(btn=>btn.onclick=()=>{
        if(answered||ended)return;
        answered=true;
        skipped.delete(current);
        const chosen=+btn.dataset.a,answer=+card.dataset.answer,wasCorrect=chosen===answer;
        answers[current]={chosen,correct:wasCorrect};
        if(wasCorrect)correct++;
        recordPracticeAnswer(wasCorrect);
        card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
        if(!timed){const fb=card.querySelector('.mcq-feedback');fb.hidden=false;fb.innerHTML=wasCorrect?`<b class="correct">✓ Correct</b> ${esc(contextualExplanation(q))}`:`<b class="incorrect">✕ Not quite.</b> Correct answer: <b>${String.fromCharCode(65+answer)}. ${esc((q.options||q.o)[answer])}</b><br>${esc(contextualExplanation(q))}`}nextBtn.disabled=false;
        if(timed&&current===qs.length-1&&skipped.size)renderQuestion();
      });
      skipBtn.onclick=()=>{if(ended||answered)return;skipped.add(current);if(current<qs.length-1){current++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}else renderQuestion()};
      skippedButtons.forEach(btn=>btn.onclick=()=>{const target=Number(btn.dataset.skippedIndex);if(Number.isInteger(target)){current=target;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}});
      prevBtn.onclick=()=>{if(current<=0)return;current--;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})};
      nextBtn.onclick=()=>{if(ended||!answers[current])return;if(current<qs.length-1){current++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}else if(timed&&skipped.size){current=Array.from(skipped).sort((a,b)=>a-b)[0];renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}else renderComplete(false)};
    };
    renderQuestion();
    if(timed){
      updateTimer();
      timerId=setInterval(()=>{
        if(ended){stopTimer();return}
        remaining-=1;
        updateTimer();
        if(remaining<=0)finishForTime();
      },1000);
    }
  }
  $('#startSet').onclick=()=>{
    const selected=selectedScope(),session={size:selectedPracticeChoice('size'),type:selectedPracticeChoices('type').join(','),mode:selectedPracticeChoice('mode'),units:selected.map(x=>({scope:x.dataset.scope,value:x.dataset.value,unit:x.dataset.unit||''}))};
    sessionStorage.setItem('netPsychPracticeSetup',JSON.stringify(session));
    location.href='practice-session.html';
  };
  if(document.body.dataset.page==='practice-session'){
    const saved=(()=>{try{return JSON.parse(sessionStorage.getItem('netPsychPracticeSetup')||'null')}catch{return null}})();
    if(saved){
      setPracticeChoices('size',[String(saved.size||'')]);setPracticeChoices('type',String(saved.type||'').split(',').filter(Boolean));setPracticeChoices('mode',[String(saved.mode||'')]);
      document.querySelectorAll('[data-practice-choice][data-choice-group="scope"]').forEach(option=>{
        const match=(saved.units||[]).some(u=>u.scope===option.dataset.scope&&String(u.unit||'')===String(option.dataset.unit||'')&&String(u.value)===String(option.dataset.scope==='all'?'all':option.dataset.scope==='unit'?String(option.dataset.unit):String(option.dataset.value).split(':').slice(2).join(':')));
        option.classList.toggle('selected',match);
        option.setAttribute('aria-pressed',String(match));
      });
      updateScopeSummary();syncPracticeSetup();
      $('.practice-config').classList.add('session-hidden');
      draw();
    }
  }
}function revision(){
  const root=$('#revisionApp');
  if(!root)return;
  const allScheduled=all().filter(x=>{const p=getP(x.k);return p.next&&Number.isFinite(Date.parse(p.next))}).sort((a,b)=>Date.parse(getP(a.k).next)-Date.parse(getP(b.k).next));
  const now=Date.now(),due=allScheduled.filter(x=>Date.parse(getP(x.k).next)<=now),upcoming=allScheduled.filter(x=>Date.parse(getP(x.k).next)>now);
  const dueRow=x=>{
    const p=getP(x.k),nextAt=Date.parse(p.next||''),late=Number.isFinite(nextAt)?(now-nextAt)/86400000:0;
    const dateText=late>0?'Overdue by '+Math.max(1,Math.floor(late))+' day'+(Math.floor(late)===1?'':'s'):'Due today',last=p.rating?' · Last: '+esc(p.rating):'';
    return '<article class="revision-item"><div><span class="status due">DUE NOW</span><h3>'+esc(x.m.title)+'</h3><p>'+esc(x.t.title)+' · Unit '+esc(x.u.id)+'</p><small>'+dateText+last+'</small></div><a class="btn primary" href="microtopic.html?unit='+encodeURIComponent(x.u.id)+'&topic='+encodeURIComponent(x.t.id)+'&micro='+encodeURIComponent(x.m.id)+'&from=revision">REVISE →</a></article>';
  };
  const upcomingRow=x=>{
    const p=getP(x.k),nextAt=Date.parse(p.next||''),dateText='Due '+new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short'}).format(new Date(nextAt)),last=p.rating?' · Last: '+esc(p.rating):'';
    return '<article class="revision-item"><div><span class="status scheduled">SCHEDULED</span><h3>'+esc(x.m.title)+'</h3><p>'+esc(x.t.title)+' · Unit '+esc(x.u.id)+'</p><small>'+dateText+last+'</small></div></article>';
  };
  const dueRows=due.slice(0,5).map(dueRow).join(''),upcomingRows=upcoming.slice(0,5).map(upcomingRow).join('');
  const stateBlock=allScheduled.length
    ? '<section class="panel empty"><h2>'+allScheduled.length+' concept'+(allScheduled.length===1?' is':'s are')+' in your revision cycle</h2><p>'+(due.length?due.length+' '+(due.length===1?'concept is':'concepts are')+' ready to revise now. '+upcoming.length+' '+(upcoming.length===1?'concept is':'concepts are')+' scheduled for later.':'Your completed concepts are scheduled. They will become ready to revise when their revision date arrives.')+'</p>'+(due[0]?'<a class="btn primary" href="microtopic.html?unit='+encodeURIComponent(due[0].u.id)+'&topic='+encodeURIComponent(due[0].t.id)+'&micro='+encodeURIComponent(due[0].m.id)+'&from=revision">REVISE →</a>':'')+'</section>'
    : '<section class="panel empty"><h2>You’re caught up.</h2><p>Complete a concept and its first spaced revision will appear here when it is scheduled.</p><a class="btn primary" href="unit.html?id=1">CONTINUE LEARNING →</a></section>';
  const dueSection=dueRows?'<section class="revision-section"><div class="section-head"><div><div class="eyebrow">DUE NOW</div><h2>Strengthen these concepts.</h2><p>Bring each idea back from memory before looking at it again.</p></div></div><div class="revision-list">'+dueRows+'</div></section>':'';
  const upcomingSection=upcomingRows?'<section class="revision-section"><div class="section-head"><div><div class="eyebrow">UPCOMING</div><h2>These will be ready later.</h2><p>Nothing is required from you yet. Return when the scheduled date arrives.</p></div></div><div class="revision-list">'+upcomingRows+'</div></section>':'';
  root.innerHTML='<section class="page-hero revision-hero"><h1>Bring back what you’ve learned.</h1><p>Try to remember the idea before looking at it again. Strengthen what feels uncertain, notice what you’ve forgotten, and make important concepts easier to retrieve next time.</p></section>'+stateBlock+dueSection+upcomingSection+
    '<section class="panel revision-rules"><h2>When you revise</h2><p>Recall the idea first, check the explanation, then rate how well you remembered it. Your rating determines when you will meet the concept again.</p><ul><li><b>Again</b> — I could not recall it.</li><li><b>Hard</b> — I recalled it with effort.</li><li><b>Good</b> — I recalled it successfully.</li><li><b>Easy</b> — I recalled it quickly.</li></ul></section>';
}
function progress(){
  const s=progressSummary(),topics=progressTopicSummary();
  const started=s.started,total=s.total,interpretation=progressInterpretation(s);
  const nextAction=topics.pending?{label:'Start Revision',href:'revision.html',note:topics.pending+' topic'+(topics.pending===1?'':'s')+' have revision work due.'}:started<total?{label:'Continue Learning',href:'unit.html?id=1',note:'Build your foundation one concept at a time. Continue from the learning path, work through the explanation, check your understanding with Active Recall, and then move forward. Completing this cycle helps turn a concept from something you have read into something you can recall and use in questions.'}:{label:'Practice Questions',href:'practice.html',note:'Use recall and application to test what you know.'};
  const errorRate=s.answers?100-s.accuracy:0;
  $('#progressApp').innerHTML=`<section class="page-hero progress-hero"><div class="eyebrow">PROGRESS</div><h1>See how your learning is building.</h1><p>See what you have explored, what you can recall, how you are performing in questions, and how consistently you are returning to what you have learned.</p></section>
  <section class="progress-signals"><div class="section-head"><div><div class="eyebrow">YOUR LEARNING SIGNALS</div><h2>Look at the pattern, not just the numbers.</h2><p class="page-guidance">These signals show different parts of your learning process. Use them together to understand where your learning is becoming secure and where it needs more work.</p></div></div>
    <div class="progress-category-stack">
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">LEARNING</div><h2>Build your understanding across the syllabus.</h2><p>See how far you’ve explored the syllabus, what you’ve fully learned, and where you can begin next.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Mastered</span><strong>${topics.mastered}</strong><small>all micro-topics in the topic mastered</small></div>
        <div class="progress-indicator"><span>Topics Explored</span><strong>${topics.touched}</strong><small>at least one micro-topic started</small></div>
        <div class="progress-indicator"><span>Topics Not Touched Yet</span><strong>${topics.untouched}</strong><small>no micro-topic started yet</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">REVISION</div><h2>Keep important concepts coming back.</h2><p>See what you’ve already revised, what needs another review now, and which topics have not entered your revision cycle yet.</p></div></div><div class="progress-indicators">
        <div class="progress-indicator"><span>Topics Revised</span><strong>${topics.revised}</strong><small>revision activity recorded</small></div>
        <div class="progress-indicator"><span>Topics Pending for Revision</span><strong>${topics.pending}</strong><small>revision currently due</small></div>
        <div class="progress-indicator"><span>Topics Not Yet in Revision Process</span><strong>${topics.notRevision}</strong><small>no revision checkpoint recorded</small></div>
      </div></section>
      <section class="progress-category card"><div class="progress-category-head"><div><div class="eyebrow">PRACTICE</div><h2>See how well you are applying what you know.</h2><p>See how accurately you’re answering questions, where errors are occurring, and how much practice you’ve completed.</p></div></div><div class="progress-indicators">
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
    if(root&&!root.innerHTML.trim()) root.innerHTML='<section class="panel empty"><h1>This section could not be rendered.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" data-action="reload">Retry</button></section>';
  }
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
window.addEventListener('DOMContentLoaded',()=>{initLearningJourney();initPwaInstallPrompt();document.addEventListener('click',e=>{if(e.target.closest('[data-open-journey]')&&window.__openLearningJourney){window.__openLearningJourney();}});});
loadStudyData().catch(err=>{
  console.error('NET Psychology data loading failed:',err);
  if(D&&Array.isArray(D.units)) {
    const pageRoot=document.querySelector('#practiceApp,#startPage,#homeHero,#revisionApp');
    if(pageRoot&&!pageRoot.innerHTML.trim()) pageRoot.innerHTML='<section class="panel empty"><h1>This section could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" data-action="reload">Retry</button></section>';
    return;
  }
  const shell=document.querySelector('main.shell');
  if(shell) shell.innerHTML='<section class="panel empty"><h1>Study data could not be loaded.</h1><p>Please refresh once the site connection is available.</p><button class="btn primary" type="button" data-action="reload">Retry</button></section>';
});
})();