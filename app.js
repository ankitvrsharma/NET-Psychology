
const KEY="psychologyNetStudyHub_v11_0";
const LEARN_KEY="psychologyNetLearning_v2";
const ACTIVITY_KEY="psychologyNetActivity_v2";
const ERROR_KEY="psychologyNetErrors_v1";
let db=null, meta=null;

async function loadAll(){
  const saved=localStorage.getItem(KEY) || localStorage.getItem("psychologyNetStudyHub_v9_4") || localStorage.getItem("psychologyNetStudyHub_v9_3") || localStorage.getItem("psychologyNetStudyHub_v5");
  if(saved){
    try{
      const x=JSON.parse(saved); db=x.db; meta=x.meta;
      // Merge the latest syllabus structure (including micro-topics) into saved local data
      // without overwriting the learner's notes, status or bookmarks.
      const fresh=await (await fetch("data.json",{cache:"no-store"})).json();
      fresh.units.forEach(fu=>{
        const su=db?.units?.find(u=>u.id===fu.id); if(!su) return;
        fu.topics.forEach(ft=>{
          const st=su.topics?.find(t=>t.id===ft.id); if(!st) return;
          const preserved={notes:st.notes,detailed_notes:st.detailed_notes,references:st.references};
          Object.assign(st,ft);
          if(preserved.notes) st.notes=preserved.notes;
          if(preserved.detailed_notes) st.detailed_notes=preserved.detailed_notes;
          if(preserved.references) st.references=preserved.references;
        });
      });
      return;
    }catch(e){}
  }
  db=await (await fetch("data.json",{cache:"no-store"})).json();
  meta=await (await fetch("meta.json",{cache:"no-store"})).json();
}
function saveAll(){localStorage.setItem(KEY,JSON.stringify({db,meta}));}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function unitById(id){return db.units.find(u=>u.id===Number(id));}
function topicById(u,t){return unitById(u)?.topics.find(x=>x.id===Number(t));}
function allTopics(){return db.units.flatMap(u=>u.topics.map(t=>({...t,unitId:u.id,unitTitle:u.title})));}
function unitUrl(id){return `unit.html?unit=${id}`;}
function topicUrl(u,t){return `topic.html?unit=${u}&topic=${t}`;}
function microUrl(u,t,m){return `microtopic.html?unit=${u}&topic=${t}&micro=${m}`;}
function progress(uid){return microProgress(uid);}
function overall(){return overallMicro();}
function renderNav(){
  const page=document.body?.dataset?.page||"index";
  const items=[
    ["index","index.html","Home"],["dashboard","dashboard.html","Dashboard"],["planner","planner.html","Planner"],["pyq","pyq.html","Question Lab"],["practice","practice.html","Practice"],["flashcards","flashcards.html","Flashcards"],["bookmarks","bookmarks.html","Saved"]
  ];
  document.querySelectorAll("[data-nav]").forEach(e=>e.innerHTML=items.map(([key,url,label])=>`<a href="${url}" ${page===key?'aria-current="page"':''}>${label}</a>`).join(""));
}
function todayKey(d=new Date()){
  const x=new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}
function startOfLocalDay(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function daysOverdue(iso){if(!iso)return 0;const diff=startOfLocalDay()-startOfLocalDay(new Date(iso));return Math.max(0,Math.floor(diff/86400000));}
function reviewStats(micros=allMicrotopics()){
  const due=[],upcoming=[];
  micros.forEach(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);if(!s.nextReview) return;const late=daysOverdue(s.nextReview);if(new Date(s.nextReview)<=new Date()) due.push({...m,reviewState:s,overdueDays:late});else upcoming.push({...m,reviewState:s,overdueDays:0});});
  due.sort((a,b)=>b.overdueDays-a.overdueDays || new Date(a.reviewState.nextReview)-new Date(b.reviewState.nextReview));
  upcoming.sort((a,b)=>new Date(a.reviewState.nextReview)-new Date(b.reviewState.nextReview));
  return {due,overdue:due.filter(x=>x.overdueDays>0),today:due.filter(x=>x.overdueDays===0),upcoming};
}
function touchVisit(){
  const x=loadLearning();x.lastVisit=todayKey();x.visitCount=(x.visitCount||0)+1;saveLearning(x);
}
function reviewLabel(m){
  const s=getMicroState(m.unitId,m.topicId,m.id);
  if(!s.nextReview)return "New learning";
  const late=daysOverdue(s.nextReview);
  if(late>0)return `Overdue by ${late} ${late===1?"day":"days"}`;
  if(new Date(s.nextReview)<=new Date())return "Due today";
  return formatDue(s.nextReview);
}
function escapeICS(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function icsDate(iso){const d=new Date(iso);return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;}
function exportReviewCalendar(){
  const stats=reviewStats();
  const scheduled=[...stats.upcoming,...stats.due];
  const seen=new Set();
  const events=scheduled.filter(m=>{const k=m.unitId+"-"+m.topicId+"-"+m.id;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,90).map(m=>{
    const s=getMicroState(m.unitId,m.topicId,m.id);
    const day=icsDate(s.nextReview||new Date().toISOString());
    const title=`Psychology NET review: ${m.title}`;
    return `BEGIN:VEVENT\nUID:netpsych-${m.unitId}-${m.topicId}-${m.id}@studyhub\nDTSTART;VALUE=DATE:${day}\nSUMMARY:${escapeICS(title)}\nDESCRIPTION:${escapeICS(`Spaced review · Unit ${m.unitId} · ${m.topicId}.${m.id}. Open the study hub and complete active recall + PYQ practice.`)}\nEND:VEVENT`;
  });
  if(!events.length){alert("No scheduled reviews yet. Complete a recall and rate the micro-topic first.");return;}
  const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//UGC NET Psychology Study Hub//EN\nCALSCALE:GREGORIAN\n${events.join("\n")}\nEND:VCALENDAR`;
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ugc-net-psychology-review-calendar.ics";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function recordActivity(kind, topic){
  const key=ACTIVITY_KEY;
  let a={days:{},today:{topics:[],mcqs:0}};
  try{a=JSON.parse(localStorage.getItem(key))||a;}catch(e){}
  const d=todayKey(); if(!a.days[d]) a.days[d]={topics:[],mcqs:0};
  if(kind==="topic" && topic){const id=`${topic.unitId}-${topic.id}`;if(!a.days[d].topics.includes(id))a.days[d].topics.push(id);}
  if(kind==="mcq")a.days[d].mcqs=(a.days[d].mcqs||0)+1;
  a.today=a.days[d];
  localStorage.setItem(key,JSON.stringify(a));
}
function recordMicroActivity(m){
  const key=ACTIVITY_KEY; let a=getActivity(); const d=todayKey(); if(!a.days[d])a.days[d]={topics:[],mcqs:0}; const id=`${m.unitId}-${m.topicId}-${m.id}`; if(!a.days[d].topics.includes(id))a.days[d].topics.push(id); a.today=a.days[d]; localStorage.setItem(key,JSON.stringify(a));
}
function getActivity(){
  const key=ACTIVITY_KEY;let a={days:{}};
  try{a=JSON.parse(localStorage.getItem(key))||null;}catch(e){}
  if(!a){try{a=JSON.parse(localStorage.getItem("psychologyNetActivity_v1"))||{days:{}};}catch(e){a={days:{}};}}
  a.days=a.days||{};return a;
}
function getStreak(){
  const days=getActivity().days||{};let d=new Date(),count=0;
  while(true){const k=todayKey(d);if(!days[k] || ((days[k].topics||[]).length===0 && (days[k].mcqs||0)===0))break;count++;d.setDate(d.getDate()-1);}
  return count;
}

function loadLearning(){let x={micro:{},profile:null,dailyMode:"30",diagnostic:null};try{x=JSON.parse(localStorage.getItem(LEARN_KEY))||x;}catch(e){};if(!Object.keys(x.micro||{}).length){try{const old=JSON.parse(localStorage.getItem("psychologyNetLearning_v1"));if(old?.micro)x.micro=old.micro;}catch(e){}}x.micro=x.micro||{};x.dailyMode=x.dailyMode||"30";return x;}
function saveLearning(x){localStorage.setItem(LEARN_KEY,JSON.stringify(x));}
function microKey(u,t,m){return `${u}-${t}-${m}`;}
function getMicroState(u,t,m){return loadLearning().micro[microKey(u,t,m)]||{status:"NEW",bookmark:false,recall:"",pyqResponse:"",reviewLevel:0,nextReview:null,history:[],confidence:[],blurting:"",teachback:"",applicationCorrect:null,sourceStatus:"SOURCE-ALIGNED"};}
function setMicroState(u,t,m,patch){const x=loadLearning(),k=microKey(u,t,m);x.micro[k]={...getMicroState(u,t,m),...patch};saveLearning(x);return x.micro[k];}
function allMicrotopics(){return db.units.flatMap(u=>u.topics.flatMap(t=>(t.microtopics||[]).map(m=>({...m,unitId:u.id,unitTitle:u.title,topicId:t.id,topicTitle:t.title,topic:t}))));}
function isMasteredState(s){return ["Mastered","MASTERED"].includes(s.status)}
function isLearningState(s){return ["Studying","LEARNING","RECALLING","STABLE"].includes(s.status)}
function microProgress(uid){const ms=allMicrotopics().filter(m=>m.unitId===Number(uid));if(!ms.length)return 0;return Math.round(ms.filter(m=>isMasteredState(getMicroState(m.unitId,m.topicId,m.id))).length/ms.length*100);}
function overallMicro(){const ms=allMicrotopics();if(!ms.length)return 0;return Math.round(ms.filter(m=>isMasteredState(getMicroState(m.unitId,m.topicId,m.id))).length/ms.length*100);}
function microDue(m){const s=getMicroState(m.unitId,m.topicId,m.id);if(!s.nextReview)return true;return new Date(s.nextReview)<=new Date();}
function isoPlusDays(n){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.toISOString();}
function formatDue(iso){if(!iso)return "Ready to learn";const d=new Date(iso),now=new Date();const day=Math.round((d-now)/86400000);if(day<=0)return "Due now";if(day===1)return "Due tomorrow";return `Due in ${day} days`;}
function parsePyqBlocks(raw){return String(raw||"").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);}
function microContent(m){
  const parent=m.topic?.explanation||"";
  const title=m.title;
  return `<div class="content-note-grid"><div><span class="eyebrow">MICRO-TOPIC</span><h3>${esc(title)}</h3><p>This is a dedicated learning node under the syllabus outline point <strong>${esc(m.topicTitle)}</strong>.</p></div><div><span class="eyebrow">WHAT TO RETRIEVE</span><ul><li>Define or explain the concept in your own words.</li><li>Recall its key features, components, stages, assumptions, theorists or distinctions as applicable.</li><li>Connect it back to the parent syllabus point and one example or application.</li></ul></div></div><div class="source-note"><strong>Parent syllabus context:</strong> ${esc(parent)}</div>`;
}


async function loadAdaptiveContent(){try{return await (await fetch("adaptive_content.json",{cache:"no-store"})).json();}catch(e){return {confusion_pairs:[],study_modes:[]};}}
function getErrors(){try{return JSON.parse(localStorage.getItem(ERROR_KEY))||[];}catch(e){return [];}}
function saveErrors(x){localStorage.setItem(ERROR_KEY,JSON.stringify(x.slice(-250)));}
function recordError(entry){const e=getErrors();e.push({...entry,date:new Date().toISOString()});saveErrors(e);}
function learningMetrics(){
 const ms=allMicrotopics(); const states=ms.map(m=>getMicroState(m.unitId,m.topicId,m.id));
 const encountered=states.filter(s=>s.status!=="NEW"&&s.status!=="Not started").length;
 const histories=states.flatMap(s=>s.history||[]);
 const retrievalAttempts=histories.filter(h=>h.rating).length;
 const retrievalSuccess=histories.filter(h=>["good","easy"].includes(h.rating)).length;
 const delayed=histories.filter(h=>(h.days||0)>=3);
 const delayedSuccess=delayed.filter(h=>["good","easy"].includes(h.rating)).length;
 const mcq=getActivity().metrics||{};
 return {coverage:ms.length?Math.round(encountered/ms.length*100):0,retrieval:retrievalAttempts?Math.round(retrievalSuccess/retrievalAttempts*100):0,accuracy:mcq.attempts?Math.round(mcq.correct/mcq.attempts*100):0,retention:delayed.length?Math.round(delayedSuccess/delayed.length*100):0};
}
function updateMCQMetric(correct){const a=getActivity();a.metrics=a.metrics||{attempts:0,correct:0};a.metrics.attempts++;if(correct)a.metrics.correct++;localStorage.setItem(ACTIVITY_KEY,JSON.stringify(a));}
function setDailyMode(mode){const x=loadLearning();x.dailyMode=String(mode);saveLearning(x);}
function getDailyMode(){return loadLearning().dailyMode||"30";}
function sessionPlan(){
 const modes={"15":{reviews:3,newItems:3,questions:5},"30":{reviews:10,newItems:10,questions:10},"60":{reviews:20,newItems:20,questions:20}};
 const cfg=modes[getDailyMode()]||modes["30"]; const ms=allMicrotopics(),rs=reviewStats(ms); const chosen=[]; const add=(m)=>{if(m&&!chosen.some(x=>microKey(x.unitId,x.topicId,x.id)===microKey(m.unitId,m.topicId,m.id)))chosen.push(m)};
 rs.due.slice(0,cfg.reviews).forEach(add); ms.filter(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);return s.status==="NEW"||s.status==="Not started";}).slice(0,cfg.newItems).forEach(add);
 return {cfg,topics:chosen};
}
function nextBestAction(){
 const plan=sessionPlan(); const rs=reviewStats(); const due=rs.due[0]; if(due)return {...due,reason:"Due review"};
 const weak=allMicrotopics().map(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);const h=s.history||[];const bad=h.filter(x=>x.rating==="again"||x.rating==="hard").length;return {...m,weak:bad};}).sort((a,b)=>b.weak-a.weak)[0];
 if(weak?.weak)return {...weak,reason:"Weak retrieval"}; return plan.topics[0]||allMicrotopics()[0];
}
function renderBottomStudyBar(){
 if(document.querySelector(".study-bar"))return; const n=nextBestAction(); if(!n)return; const s=getMicroState(n.unitId,n.topicId,n.id); const el=document.createElement("a");el.className="study-bar";el.href=microUrl(n.unitId,n.topicId,n.id);el.innerHTML=`<span>🔥 ${getStreak()} day consistency</span><strong>Continue: ${esc(n.title)}</strong><small>${esc(n.reason||reviewLabel(n))} · ${s.status}</small><b>→</b>`;document.body.appendChild(el);
}
function setupOnboarding(){
 const x=loadLearning(); if(x.profile||document.querySelector("#onboardingModal"))return; const modal=document.createElement("div");modal.id="onboardingModal";modal.className="modal-backdrop";modal.innerHTML=`<div class="onboarding card-panel"><button class="modal-close" id="skipOnboarding" aria-label="Close">×</button><span class="eyebrow">BUILD YOUR STUDY PROFILE</span><h2>Let's make the hub adaptive.</h2><p>Choose your target and time. Then take a 20-question diagnostic across all 10 units.</p><div class="profile-grid"><label>Exam target<select id="profileExam"><option>UGC NET</option><option>JRF</option><option>Both</option></select></label><label>Preparation stage<select id="profileStage"><option>Starting</option><option>Building concepts</option><option>Revision</option><option>Mock-test phase</option></select></label><label>Available time<select id="profileTime"><option value="15">30 min/day</option><option value="30">1 hour</option><option value="60">2 hours</option><option value="60">3+ hours</option></select></label></div><button id="startDiagnostic" class="btn primary">Start 20-question diagnostic →</button><div id="diagnosticBox" hidden></div></div>`;document.body.appendChild(modal);
 document.querySelector("#skipOnboarding").onclick=()=>{x.profile={skipped:true};saveLearning(x);modal.remove();};
 document.querySelector("#startDiagnostic").onclick=()=>runDiagnostic(modal);
}
function runDiagnostic(modal){
 const bank=questionBank(), picks=[]; for(let u=1;u<=10;u++){bank.filter(q=>q.unit===u).slice(0,2).forEach(q=>picks.push(q));} const box=modal.querySelector("#diagnosticBox");box.hidden=false;modal.querySelector("#startDiagnostic").hidden=true;box.innerHTML=`<div class="diagnostic-progress"><strong>20 questions</strong><span>One sample set per unit</span></div><div id="diagQuestions"></div><button id="finishDiagnostic" class="btn primary">Finish diagnostic</button>`;
 const qwrap=box.querySelector("#diagQuestions");qwrap.innerHTML=picks.map((q,i)=>{const x=parseQuestionText(q.text);const opts=parseOptions(x.body);return `<article class="diag-q" data-q="${i}"><b>${i+1}. Unit ${q.unit} · ${esc(q.topicTitle)}</b><p>${esc(opts.question)}</p><div>${opts.options.map(o=>`<label><input type="radio" name="diag${i}" value="${esc(o.key)}"> ${esc(o.key)}. ${esc(o.text)}</label>`).join("")}</div></article>`}).join("");
 box.querySelector("#finishDiagnostic").onclick=()=>{const scores={};picks.forEach((q,i)=>{const selected=modal.querySelector(`input[name=diag${i}]:checked`)?.value;const x=parseQuestionText(q.text);const correct=answerMatches(selected,x.answer);scores[q.unit]=scores[q.unit]||{correct:0,total:0};scores[q.unit].total++;if(correct)scores[q.unit].correct++;});const focus=Object.entries(scores).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total)).slice(0,3).map(([u,v])=>({unit:Number(u),score:Math.round(v.correct/v.total*100)}));const l=loadLearning();l.profile={exam:modal.querySelector("#profileExam").value,stage:modal.querySelector("#profileStage").value,time:modal.querySelector("#profileTime").value,created:new Date().toISOString(),focus};l.diagnostic=scores;saveLearning(l);modal.innerHTML=`<div class="onboarding card-panel"><span class="eyebrow">YOUR LEARNING PROFILE</span><h2>Immediate focus</h2><p>Your lowest diagnostic areas are shown for targeted retrieval. This is a starting signal, not a permanent label.</p><div class="diag-result">${focus.map(f=>`<div><strong>Unit ${f.unit}</strong><span>${f.score}%</span></div>`).join("")}</div><button id="closeProfile" class="btn primary">Start my first session →</button></div>`;modal.querySelector("#closeProfile").onclick=()=>modal.remove();};
}
function parseOptions(body){
 const lines=String(body).split(/\n/).map(x=>x.trim()).filter(Boolean); const options=[]; let question=[]; lines.forEach(line=>{const m=line.match(/^([A-D])\.\s*(.*)$/);if(m)options.push({key:m[1],text:m[2]});else if(!/^Q\d*\./i.test(line)&&!/^PYQ-STYLE/i.test(line))question.push(line.replace(/^Q\.\s*/i,""));}); return {question:question.join(" "),options};
}
function answerMatches(selected,answer){if(!selected||!answer)return false;const a=String(answer).trim().toUpperCase();return a===selected.toUpperCase()||a.startsWith(selected.toUpperCase()+".")||a.includes(selected+" ");}
function parseAnswerBlock(text){const x=parseQuestionText(text);const p=parseOptions(x.body);return {...x,...p};}
async function initIndex(){
 await loadAll();touchVisit();renderNav();
 const adaptive=await loadAdaptiveContent();
 const topics=allTopics();
 const microsForStats=allMicrotopics();
 const mastered=microsForStats.filter(m=>isMasteredState(getMicroState(m.unitId,m.topicId,m.id))).length;
 const studying=microsForStats.filter(m=>isLearningState(getMicroState(m.unitId,m.topicId,m.id))).length;
 const saved=microsForStats.filter(m=>getMicroState(m.unitId,m.topicId,m.id).bookmark).length;
 const pct=overall();
 document.querySelector("#overall").textContent=pct+"%";
 document.querySelector("#mastered").textContent=mastered;
 document.querySelector("#studying").textContent=studying;
 document.querySelector("#topicCount").textContent=allMicrotopics().length;
 document.querySelector("#heroPercent").textContent=pct+"%";
 document.querySelector("#heroProgress").style.width=pct+"%";
 document.querySelector("#overallBar").style.width=pct+"%";
 document.querySelector("#heroMastered").textContent=mastered;
 document.querySelector("#heroStudying").textContent=studying;
 document.querySelector("#heroSaved").textContent=saved;

 // Spaced-repetition cockpit: due/overdue reviews always outrank new learning.
 const micros=allMicrotopics();
 const rs=reviewStats(micros);
 const plan=[];
 const add=(arr)=>arr.forEach(m=>{if(m&&!plan.some(x=>x.unitId===m.unitId&&x.topicId===m.topicId&&x.id===m.id)&&plan.length<3)plan.push(m)});
 const addInterleaved=(arr)=>{const seen=new Set();for(const m of arr){if(plan.length>=3)break;if(!seen.has(m.unitId)){add([m]);seen.add(m.unitId);}}};
 addInterleaved(rs.due);
 add(rs.due);
 // Only introduce new material when the review queue does not fill today's small plan.
 addInterleaved(micros.filter(m=>{const st=getMicroState(m.unitId,m.topicId,m.id);return !st.nextReview && st.status!=="Mastered";}));
 add(micros.filter(m=>{const st=getMicroState(m.unitId,m.topicId,m.id);return !st.nextReview && st.status!=="Mastered";}));
 const act=getActivity(), day=act.days?.[todayKey()]||{topics:[],mcqs:0};
 const doneTopics=day.topics||[], mcqGoal=20, mcqs=Math.min(day.mcqs||0,mcqGoal), streak=getStreak();
 const todayTitle=document.querySelector("#todayDate"); if(todayTitle) todayTitle.textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
 const streakEl=document.querySelector("#streak"); if(streakEl) streakEl.textContent=streak;
 const topicDone=plan.filter(m=>doneTopics.includes(`${m.unitId}-${m.topicId}-${m.id}`)).length;
 const todayTopicCount=document.querySelector("#todayTopicCount"); if(todayTopicCount) todayTopicCount.textContent=`${topicDone}/${plan.length} micro topics`;
 const todayMcq=document.querySelector("#todayMcq"); if(todayMcq) todayMcq.textContent=`${mcqs}/${mcqGoal}`;
 const todayBar=document.querySelector("#todayBar"); if(todayBar) todayBar.style.width=Math.min(100,Math.round(((topicDone/Math.max(1,plan.length))+(mcqs/mcqGoal))/2*100))+"%";
 const todayList=document.querySelector("#todayList");
 if(todayList) todayList.innerHTML=plan.map((m,i)=>{const done=doneTopics.includes(`${m.unitId}-${m.topicId}-${m.id}`);return `<a class="today-task ${done?"done":""}" href="${microUrl(m.unitId,m.topicId,m.id)}"><span class="today-check">${done?"✓":i+1}</span><span><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${done?"Completed today":reviewLabel(m)}</small></span><b>→</b></a>`}).join("") || `<div class="callout"><strong>Syllabus complete.</strong><p>Use today for spaced revision and PYQ practice.</p></div>`;

 const next=rs.due[0] || micros.find(m=>{const st=getMicroState(m.unitId,m.topicId,m.id);return !st.nextReview && st.status!=="Mastered";}) || rs.upcoming[0] || micros[0];
 const reviewLabelEl=document.querySelector("#heroReviewLabel");
 const reviewMetaEl=document.querySelector("#heroReviewMeta");
 if(reviewLabelEl){reviewLabelEl.textContent=rs.overdue.length?"OVERDUE SPACED REVIEW":(rs.today.length?"TODAY'S SPACED REVIEW":"NEXT SCHEDULED REVIEW");}
 if(reviewMetaEl){reviewMetaEl.textContent=`${rs.due.length} due · ${rs.overdue.length} overdue · ${rs.upcoming.length} scheduled`; }
 if(next){
   const nextUrl=microUrl(next.unitId,next.topicId,next.id);
   const cb=document.querySelector("#continueBtn"); cb.href=nextUrl;
   cb.textContent="Start Learning →";
   document.querySelector("#heroFocus").textContent=next.title;
   document.querySelector("#heroFocusMeta").textContent=`Unit ${next.unitId} · ${next.topicId}.${next.id} · ${reviewLabel(next)}`;
   const hs=document.querySelector("#heroStartBtn"); if(hs){hs.href=nextUrl; hs.textContent=rs.due.length?"Start review →":"Start studying →";}
 }
 const queue=[];
 const addUnique=(arr)=>arr.forEach(m=>{if(m && !queue.some(x=>x.unitId===m.unitId&&x.topicId===m.topicId&&x.id===m.id))queue.push(m)});
 addUnique(rs.due);
 addUnique(micros.filter(m=>isLearningState(getMicroState(m.unitId,m.topicId,m.id)) && !getMicroState(m.unitId,m.topicId,m.id).nextReview));
 const fg=document.querySelector("#focusGrid");
 fg.innerHTML=queue.slice(0,6).map(m=>`<a class="focus-item" href="${microUrl(m.unitId,m.topicId,m.id)}"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${esc(m.topicTitle)}</small><span class="focus-state">${getMicroState(m.unitId,m.topicId,m.id).status}${getMicroState(m.unitId,m.topicId,m.id).bookmark?" · ★ Saved":""}</span></a>`).join("") || `<div class="callout"><strong>Your study queue is empty.</strong><p>Open a micro topic and start a recall cycle.</p></div>`;

 const grid=document.querySelector("#unitGrid");
 const render=(q="")=>{
  q=q.toLowerCase().trim();
  const units=db.units.filter(u=>(`unit ${u.id} ${u.title} ${u.topics.map(t=>t.title).join(" ")}`).toLowerCase().includes(q));
  grid.innerHTML=units.map(u=>`<a class="unit-card" href="${unitUrl(u.id)}"><div class="unit-num">UNIT ${u.id}</div><h3>${esc(u.title)}</h3><p>${u.topics.length} outline points · ${u.topics.reduce((n,t)=>n+(t.microtopics||[]).length,0)} micro topics</p><div class="progress"><i style="width:${progress(u.id)}%"></i></div><small>${progress(u.id)}% mastered</small></a>`).join("") || `<div class="callout"><strong>No matching unit or topic.</strong><p>Try a broader search term.</p></div>`;
 };
 render();
 document.querySelector("#search").oninput=e=>{
   const q=e.target.value.toLowerCase().trim();render(q);const box=document.querySelector("#universalResults");if(!box)return;
   if(!q){box.hidden=true;box.innerHTML="";return;} box.hidden=false;
   const micros=allMicrotopics().filter(m=>`${m.title} ${m.topicTitle} ${m.unitTitle} ${m.content_notes}`.toLowerCase().includes(q)).slice(0,8);
   const qs=questionBank().filter(x=>`${x.text} ${x.topicTitle} ${x.unitTitle}`.toLowerCase().includes(q)).slice(0,6);
   const cps=(adaptive.confusion_pairs||[]).filter(x=>`${x.a} ${x.b} ${x.quick}`.toLowerCase().includes(q)).slice(0,4);
   box.innerHTML=`<div class="search-result-group"><span>MICRO-TOPICS</span>${micros.map(m=>`<a href="${microUrl(m.unitId,m.topicId,m.id)}"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${esc(m.topicTitle)}</small></a>`).join("")||"<p>No matching micro-topics.</p>"}</div><div class="search-result-group"><span>QUESTIONS</span>${qs.map(x=>`<a href="${topicUrl(x.unit,x.topic)}"><strong>${esc(parseQuestionText(x.text).body.slice(0,90))}</strong><small>${x.type==="pyq"?"PYQ-style":"Practice"} · Unit ${x.unit}</small></a>`).join("")||"<p>No matching questions.</p>"}</div><div class="search-result-group"><span>CONFUSION PAIRS</span>${cps.map(x=>`<div><strong>${esc(x.a)} vs ${esc(x.b)}</strong><small>${esc(x.quick)}</small></div>`).join("")||"<p>No matching confusion pair.</p>"}</div>`;
 };
 document.querySelector("#exportReviews")?.addEventListener("click",exportReviewCalendar);
 const metrics=learningMetrics(); ["coverage","retrieval","accuracy","retention"].forEach(k=>document.querySelector("#metric-"+k)&&(document.querySelector("#metric-"+k).textContent=metrics[k]+"%"));
 const mode=getDailyMode();document.querySelectorAll("[data-study-mode]").forEach(b=>{b.classList.toggle("active",b.dataset.studyMode===mode);b.onclick=()=>{setDailyMode(b.dataset.studyMode);location.reload();}});
 const nextAction=nextBestAction(); if(nextAction){document.querySelector("#nextActionTitle")?.replaceChildren(document.createTextNode(nextAction.title));document.querySelector("#nextActionMeta")&&(document.querySelector("#nextActionMeta").textContent=`Unit ${nextAction.unitId} · ${nextAction.topicTitle} · ${nextAction.reason||reviewLabel(nextAction)}`);document.querySelector("#nextActionBtn")&&(document.querySelector("#nextActionBtn").href=microUrl(nextAction.unitId,nextAction.topicId,nextAction.id));}
 setupOnboarding();renderBottomStudyBar();
 const homeInstall=document.querySelector("#homeInstall");
 homeInstall?.addEventListener("click",()=>document.querySelector("#installBtn")?.click());
}

async function initUnit(){
 await loadAll();renderNav();const id=new URLSearchParams(location.search).get("unit"),u=unitById(id);
 if(!u){location.href="index.html";return}
 const microCount=u.topics.reduce((n,t)=>n+(t.microtopics||[]).length,0);
 document.querySelector("#title").textContent=`Unit ${u.id} — ${u.title}`;
 document.querySelector("#count").textContent=`${u.topics.length} Topics · ${microCount} Micro Topics`;
 document.querySelector("#progress").textContent=`${progress(u.id)}% mastered`;
 const list=document.querySelector("#outline");
 const render=q=>{
   q=q.toLowerCase().trim();
   const topics=u.topics.filter(t=>[t.title,...(t.microtopics||[]).map(m=>m.title)].join(" ").toLowerCase().includes(q));
   list.innerHTML=topics.map(t=>{
     const mts=t.microtopics||[];
     return `<section class="outline-group" id="outline-${u.id}-${t.id}">
       <div class="outline-item outline-heading">
         <span class="num">${t.id}</span>
         <div class="outline-main"><h3>${esc(t.title)}</h3><p>${mts.length} micro topics · ${mts.filter(m=>isMasteredState(getMicroState(u.id,t.id,m.id))).length} mastered</p></div>
         <a class="outline-open btn ghost" href="topic.html?unit=${u.id}&topic=${t.id}">Open Topic →</a>
       </div>
       <div class="microtopic-grid">
         ${mts.map(m=>{const s=getMicroState(u.id,t.id,m.id);return `<a class="microtopic-card" href="${microUrl(u.id,t.id,m.id)}">
           <span class="microtopic-num">${t.id}.${m.id}</span><div><strong>${esc(m.title)}</strong><small>${s.status} · ${microDue({...m,unitId:u.id,topicId:t.id,topic:t})?"Due now":formatDue(s.nextReview)}</small></div><span class="microtopic-arrow">→</span>
         </a>`}).join("")}
       </div>
     </section>`;
   }).join("") || `<div class="callout"><strong>No matching syllabus point or micro topic.</strong><p>Try a broader search term.</p></div>`;
 };
 render("");document.querySelector("#search").oninput=e=>render(e.target.value);
}
async function initTopic(){
 await loadAll();renderNav();
 const p=new URLSearchParams(location.search),u=unitById(p.get("unit")),t=topicById(p.get("unit"),p.get("topic"));
 if(!u||!t){location.href="index.html";return}
 document.querySelector("#unitLink").textContent=`Unit ${u.id} — ${u.title}`;document.querySelector("#unitLink").href=unitUrl(u.id);
 document.querySelector("#num").textContent=`Outline point ${t.id}`;document.querySelector("#title").textContent=t.title;document.querySelector("#syllabus").textContent=t.title;document.querySelector("#explanation").textContent=t.explanation;
 const mt=document.querySelector("#microtopics"); if(mt){mt.innerHTML=(t.microtopics||[]).map(x=>`<li class="microtopic-panel"><a href="${microUrl(u.id,t.id,x.id)}"><span class="microtopic-num">${t.id}.${x.id}</span><div><strong>${esc(x.title)}</strong><small>Open dedicated micro-topic page →</small></div><span class="microtopic-arrow">→</span></a></li>`).join("");}
 // Remove legacy note workspace from the outline page: this page is now an orientation layer.
 document.querySelector(".workspace")?.remove();document.querySelector(".topic-actions")?.remove();
 document.querySelectorAll("#bookmark,#status,#save,#clear,#prev,#next").forEach(e=>e?.remove());
 const side=document.querySelector("#side");side.innerHTML=u.topics.map(x=>`<a class="${x.id===t.id?"active":""}" href="${topicUrl(u.id,x.id)}">${x.id}. ${esc(x.title)}</a>`).join("");
}
async function initMicrotopic(){
 await loadAll();renderNav();
 const p=new URLSearchParams(location.search),u=unitById(p.get("unit")),t=topicById(p.get("unit"),p.get("topic")),m=(t?.microtopics||[]).find(x=>x.id===Number(p.get("micro")));
 if(!u||!t||!m){location.href=unitUrl(p.get("unit"));return}
 const full={...m,unitId:u.id,unitTitle:u.title,topicId:t.id,topicTitle:t.title,topic:t}; let s=getMicroState(u.id,t.id,m.id);
 document.querySelector("#unitLink").textContent=`Unit ${u.id} — ${u.title}`;document.querySelector("#unitLink").href=unitUrl(u.id);document.querySelector("#outlineLink").textContent=`${t.id}. ${t.title}`;document.querySelector("#outlineLink").href=topicUrl(u.id,t.id);document.querySelector("#microNum").textContent=`Micro topic ${t.id}.${m.id}`;document.querySelector("#microTitle").textContent=m.title;document.querySelector("#microParent").textContent=`Unit ${u.id} · ${t.title}`;
 const content=String(m.content_notes||""); const bullets=content.split(/\n/).map(x=>x.trim().replace(/^[-•]\s*/,"")).filter(x=>x.length>8).slice(0,6); const firstQ=parseMCQForTopic(t);
 document.querySelector("#syllabusAnchor").textContent=t.title;document.querySelector("#contentNotes").innerHTML=`<div class="three-layer"><div class="layer quick"><span>30-SECOND RECALL</span><strong>${esc(m.title)}</strong><p>${esc((bullets[0]||content.split("\n")[1]||"Define the core idea in one sentence."))}</p></div><div class="layer core"><span>5-MINUTE CORE</span><div class="rich-note-text">${esc(content)}</div></div><details class="layer deep"><summary>DEEP DIVE</summary><p>${esc(t.explanation||"Connect this micro-topic to the wider syllabus point, examples and distinctions.")}</p><p class="muted">Source: ${esc(m.source||"Source-aligned study content")}</p></details></div>`;
 const statusEl=document.querySelector("#microStatus"),dueEl=document.querySelector("#dueLabel"),recall=document.querySelector("#recallResponse"),pyqResp=document.querySelector("#pyqResponse");
 const renderState=()=>{statusEl.textContent=s.status;dueEl.textContent=formatDue(s.nextReview);document.querySelector("#bookmarkMicro").textContent=s.bookmark?"★ Bookmarked":"☆ Bookmark micro topic";recall.value=s.recall||"";pyqResp.value=s.pyqResponse||"";document.querySelector("#nextReview").textContent=s.nextReview?`Next review: ${new Date(s.nextReview).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})} · ${formatDue(s.nextReview)}`:"Complete recall + confidence rating to schedule revision."};renderState();
 document.querySelector("#learningStage").textContent=s.status==="NEW"?"Understand":s.status==="RECALLING"?"Retrieve":s.status==="STABLE"?"Space":"Apply";
 const prompt=document.querySelector("#recallPrompt");prompt.innerHTML=`<strong>Without looking at the notes, explain “${esc(m.title)}”.</strong><span>Retrieve the definition/core idea, key components or distinctions, and one example or application.</span>`;
 let timer=null,seconds=120;const timerEl=document.querySelector("#recallTimer");document.querySelector("#startRecall").onclick=()=>{recordMicroActivity(full);seconds=120;clearInterval(timer);document.querySelector("#contentNotes").classList.add("notes-hidden");document.querySelector("#hideNotes").textContent="Show notes";timer=setInterval(()=>{seconds--;timerEl.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;if(seconds<=0){clearInterval(timer);document.querySelector("#checkRecall").disabled=false}},1000);document.querySelector("#checkRecall").disabled=false;recall.focus();};
 document.querySelector("#hideNotes").onclick=()=>{const hidden=document.querySelector("#contentNotes").classList.toggle("notes-hidden");document.querySelector("#hideNotes").textContent=hidden?"Show notes":"Hide notes for recall"};
 document.querySelector("#checkRecall").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.recall=recall.value.trim();s.status=s.status==="NEW"||s.status==="Not started"?"RECALLING":s.status;setMicroState(u.id,t.id,m.id,s);document.querySelector("#keyPoints").hidden=false;document.querySelector("#keyPoints").innerHTML=`<strong>Essential ideas to compare</strong><ul>${(bullets.length?bullets:["Core definition","Key distinction","One example or application"]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;document.querySelector("#recallSaved").textContent="Recall attempt saved ✓";renderState();};
 document.querySelectorAll(".confidence").forEach(btn=>btn.onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.confidence=s.confidence||[];s.confidence.push({rating:btn.dataset.confidence,date:new Date().toISOString()});setMicroState(u.id,t.id,m.id,s);document.querySelectorAll(".confidence").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected")});
 document.querySelectorAll(".rating").forEach(btn=>btn.onclick=()=>{const r=btn.dataset.rating;s=getMicroState(u.id,t.id,m.id);s.reviewLevel=(s.reviewLevel||0)+1;const lvl=Math.max(1,s.reviewLevel),schedule={again:0,hard:1,good:[3,7,14,30,60][Math.min(lvl-1,4)],easy:[7,14,30,60,90][Math.min(lvl-1,4)]};const days=schedule[r];s.intervalDays=days;s.lastReview=new Date().toISOString();s.overdueCount=(s.overdueCount||0)+(daysOverdue(s.nextReview)>0?1:0);s.status=r==="easy"&&s.reviewLevel>=3?"MASTERED":r==="good"&&s.reviewLevel>=2?"STABLE":"RECALLING";s.nextReview=isoPlusDays(days);s.history=s.history||[];s.history.push({date:new Date().toISOString(),rating:r,days});setMicroState(u.id,t.id,m.id,s);recordMicroActivity(full);document.querySelector("#nextReview").textContent=`Next review: ${new Date(s.nextReview).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})} · ${formatDue(s.nextReview)}`;renderState();});
 // Apply stage: a real question with confidence and answer feedback.
 const apply=document.querySelector("#applyQuestion");if(firstQ&&apply){apply.innerHTML=`<div class="apply-q"><span class="source-pill mcq">PRACTICE / APPLY</span><p>${esc(firstQ.question)}</p><div class="apply-options">${firstQ.options.map(o=>`<button data-opt="${o.key}" class="apply-option">${o.key}. ${esc(o.text)}</button>`).join("")}</div><div id="applyFeedback" class="apply-feedback"></div></div>`;apply.querySelectorAll(".apply-option").forEach(b=>b.onclick=()=>{const ok=answerMatches(b.dataset.opt,firstQ.answer);s=getMicroState(u.id,t.id,m.id);s.applicationCorrect=ok;setMicroState(u.id,t.id,m.id,s);updateMCQMetric(ok);document.querySelectorAll(".apply-option").forEach(x=>x.disabled=true);document.querySelector("#applyFeedback").textContent=ok?"✓ Correct — application retrieved successfully.":`✗ Revisit the core distinction. Correct answer: ${firstQ.answer}`;});}
 const pyqs=parsePyqBlocks(t.pyqs);document.querySelector("#pyqList").innerHTML=pyqs.length?pyqs.slice(0,3).map((q,i)=>`<article class="pyq-item"><span class="source-pill pyq">PYQ-STYLE PRACTICE ${i+1}</span><p>${esc(q)}</p></article>`).join(""):`<div class="callout">No practice question has been added to this outline point yet.</div>`;
 document.querySelector("#savePyq").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.pyqResponse=pyqResp.value.trim();s.status=s.status==="NEW"?"RECALLING":s.status;setMicroState(u.id,t.id,m.id,s);recordMicroActivity(full);document.querySelector("#pyqSaved").textContent="Application response saved ✓";renderState();};
 document.querySelector("#saveBlurting")?.addEventListener("click",()=>{s=getMicroState(u.id,t.id,m.id);s.blurting=document.querySelector("#blurting").value.trim();setMicroState(u.id,t.id,m.id,s);document.querySelector("#blurtingSaved").textContent="Blurt saved ✓";});
 document.querySelector("#saveTeachback")?.addEventListener("click",()=>{s=getMicroState(u.id,t.id,m.id);s.teachback=document.querySelector("#teachback").value.trim();setMicroState(u.id,t.id,m.id,s);document.querySelector("#teachbackSaved").textContent="Teach-back saved ✓";});
 document.querySelector("#bookmarkMicro").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.bookmark=!s.bookmark;setMicroState(u.id,t.id,m.id,s);renderState()};document.querySelector("#backOutline").href=topicUrl(u.id,t.id);
 const mts=t.microtopics||[],idx=mts.findIndex(x=>x.id===m.id),next=idx<mts.length-1?mts[idx+1]:null,nextBtn=document.querySelector("#nextMicro");if(next){nextBtn.href=microUrl(u.id,t.id,next.id)}else{nextBtn.href=unitUrl(u.id);nextBtn.textContent="Back to unit →"};
 let focusTimer=null,focusSeconds=1500;document.querySelector("#focusStart")?.addEventListener("click",()=>{const ft=document.querySelector("#focusTimer");ft.hidden=false;focusSeconds=1500;clearInterval(focusTimer);focusTimer=setInterval(()=>{focusSeconds--;ft.textContent=`${Math.floor(focusSeconds/60)}:${String(focusSeconds%60).padStart(2,"0")}`;if(focusSeconds<=0){clearInterval(focusTimer);alert("Focus session complete. Do the 3-question retrieval check now.");}},1000);});renderBottomStudyBar();
}
function parseMCQForTopic(t){const b=parsePyqBlocks(t.mcqs||"")[0];return b?parseAnswerBlock(b):null;}
async function loadHubContent(){
  try{return await (await fetch("hub_content.json",{cache:"no-store"})).json();}
  catch(e){return {unit_packs:[],study_system:[]};}
}
function questionBank(){
  const out=[];
  allTopics().forEach(t=>{
    const add=(raw,type)=>parsePyqBlocks(raw).forEach((text,i)=>out.push({id:`${type}-${t.unitId}-${t.id}-${i}`,type,unit:t.unitId,unitTitle:t.unitTitle,topic:t.id,topicTitle:t.title,text}));
    add(t.pyqs,"pyq"); add(t.mcqs,"mcq");
  });
  return out;
}
function parseQuestionText(text){
  const raw=String(text||'').trim();
  const m=raw.match(/(?:^|\n)Answer\s*:\s*(.+?)(?=\n|$)/i);
  const answer=m?m[1].trim():'';
  const body=m?raw.replace(m[0],'').trim():raw;
  return {body,answer};
}
async function initPyq(){
  await loadAll();renderNav();
  const bank=questionBank();
  const total=document.querySelector("#bankTotal"); if(total) total.textContent=bank.length;
  const uf=document.querySelector("#unitFilter");
  if(uf) uf.innerHTML='<option value="">All units</option>'+db.units.map(u=>`<option value="${u.id}">Unit ${u.id} — ${esc(u.title)}</option>`).join("");
  const grid=document.querySelector("#questionGrid");
  const render=()=>{
    const q=(document.querySelector("#pyqSearch")?.value||"").toLowerCase().trim();
    const unit=document.querySelector("#unitFilter")?.value||""; const type=document.querySelector("#typeFilter")?.value||"all";
    let rows=bank.filter(x=>(!unit||String(x.unit)===unit)&&(type==="all"||x.type===type)&&(!q||`${x.text} ${x.topicTitle} ${x.unitTitle}`.toLowerCase().includes(q)));
    if(document.querySelector("#randomBtn")?.dataset.random==="1") rows=[...rows].sort(()=>Math.random()-.5).slice(0,20);
    grid.innerHTML=rows.slice(0,120).map((x,i)=>{const qx=parseQuestionText(x.text);const key=`ans-${x.id}`;return `<article class="question-card"><div class="q-meta"><span class="source-pill ${x.type}">${x.type==="pyq"?"PYQ-STYLE":"SOURCE / TOPIC MCQ"}</span><span>Unit ${x.unit} · ${x.topic}</span></div><div class="q-text">${esc(qx.body).replace(/\n/g,"<br>")}</div><div class="answer-reveal"><button class="btn ghost reveal-btn" data-target="${key}">Reveal answer</button><div id="${key}" class="hidden-answer" hidden><b>Answer:</b> ${esc(qx.answer||'No answer embedded in this item.')}</div></div><div class="q-foot"><a href="${topicUrl(x.unit,x.topic)}">Study this concept →</a><span>${esc(x.topicTitle)}</span></div></article>`}).join("")||`<div class="callout"><strong>No questions match those filters.</strong><p>Try another unit, source type or search term.</p></div>`;
    grid.querySelectorAll('.reveal-btn').forEach(btn=>btn.addEventListener('click',()=>{const el=document.getElementById(btn.dataset.target);el.hidden=!el.hidden;btn.textContent=el.hidden?'Reveal answer':'Hide answer';}));
  };
  ["pyqSearch","unitFilter","typeFilter"].forEach(id=>document.querySelector("#"+id)?.addEventListener("input",()=>{document.querySelector("#randomBtn").dataset.random="0";render()}));
  document.querySelector("#randomBtn")?.addEventListener("click",()=>{document.querySelector("#randomBtn").dataset.random="1";render()});
  render();
}
async function initPlanner(){
  await loadAll();renderNav();
  const content=await loadHubContent();
  const pct=overall();document.querySelector("#plannerPct").textContent=pct+"%";
  const system=document.querySelector("#studySystem");
  system.innerHTML=(content.study_system||[]).map((x,i)=>`<article class="system-card"><span>${String(i+1).padStart(2,"0")}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div></article>`).join("");
  const packs=document.querySelector("#unitPacks");
  packs.innerHTML=(content.unit_packs||[]).map(x=>`<article class="pack-card"><div class="pack-top"><span>UNIT ${x.id}</span><strong>${progress(x.id)}%</strong></div><h3>${esc(x.title)}</h3><p class="pack-focus">${esc(x.focus)}</p><p>${esc(x.rapid)}</p><ul>${(x.exam_moves||[]).map(y=>`<li>${esc(y)}</li>`).join("")}</ul><a href="${unitUrl(x.id)}">Open unit →</a></article>`).join("");
  const adaptive=await loadAdaptiveContent();const cg=document.querySelector("#confusionGrid");if(cg)cg.innerHTML=(adaptive.confusion_pairs||[]).map(x=>`<article class="confusion-card"><div><strong>${esc(x.a)}</strong><span>VS</span><strong>${esc(x.b)}</strong></div><p>${esc(x.quick)}</p><small>Contrastive retrieval prompt: define both, then state the difference.</small></article>`).join("");
  const rs=reviewStats();const t=rs.due[0]||allMicrotopics().find(m=>!isMasteredState(getMicroState(m.unitId,m.topicId,m.id)));
  if(t){document.querySelector("#todayPlanTitle").textContent=t.title;document.querySelector("#todayPlanText").textContent=`Unit ${t.unitId} · ${t.topicTitle} · ${reviewLabel(t)}`;}
}

async function initDashboard(){
 await loadAll();touchVisit();renderNav();
 const micros=allMicrotopics();document.querySelector("#overall").textContent=overall()+"%";
 document.querySelector("#mastered").textContent=micros.filter(m=>isMasteredState(getMicroState(m.unitId,m.topicId,m.id))).length;
 document.querySelector("#studying").textContent=micros.filter(m=>isLearningState(getMicroState(m.unitId,m.topicId,m.id))).length;
 document.querySelector("#bookmarks").textContent=micros.filter(m=>getMicroState(m.unitId,m.topicId,m.id).bookmark).length;
 document.querySelector("#units").innerHTML=db.units.map(u=>`<div class="dash-row"><a href="${unitUrl(u.id)}"><strong>Unit ${u.id}</strong> ${esc(u.title)}</a><span>${progress(u.id)}%</span></div>`).join("");
 const rs=reviewStats(micros);
 const due=rs.due.slice(0,12);
 const reviewSummary=document.querySelector("#reviewSummary");
 if(reviewSummary) reviewSummary.innerHTML=`<strong>${rs.overdue.length} overdue</strong><span>${rs.today.length} due today · ${rs.upcoming.length} scheduled</span><small>Missed reviews are carried forward; intervals are not silently reset.</small>`;
 document.querySelector("#focus").innerHTML=due.length?due.map(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);return `<a href="${microUrl(m.unitId,m.topicId,m.id)}" class="focus-item"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${reviewLabel(m)}${s.bookmark?" · ★":""}</small></a>`}).join(""):"<p>No reviews are due today. New learning can continue.</p>";
 document.querySelector("#exportReviews")?.addEventListener("click",exportReviewCalendar);
 const lm=learningMetrics();["coverage","retrieval","accuracy","retention"].forEach(k=>document.querySelector("#dash-"+k)&&(document.querySelector("#dash-"+k).textContent=lm[k]+"%"));
 const errs=getErrors();document.querySelector("#errorCount")&&(document.querySelector("#errorCount").textContent=errs.length);
 const heat=document.querySelector("#weaknessHeatmap");if(heat)heat.innerHTML=db.units.map(u=>{const p=progress(u.id);return `<a href="${unitUrl(u.id)}"><span>U${u.id}</span><i><b style="width:${p}%"></b></i><strong>${p}%</strong></a>`}).join("");
}
function parseMCQs(){
 return allTopics().flatMap(t=>{
  const raw=t.mcqs||""; if(!raw.trim()) return [];
  return raw.split(/\n\s*\n/).filter(Boolean).map(block=>({unit:t.unitId,topic:t.id,text:block}));
 });
}
async function initPractice(){
 await loadAll();renderNav(); let bank=parseMCQs().map(q=>({...q,...parseAnswerBlock(q.text)})); const params=new URLSearchParams(location.search); if(params.get("mode")==="errors"){const keys=new Set(getErrors().map(e=>`${e.unit}-${e.topic}`));bank=bank.filter(q=>keys.has(`${q.unit}-${q.topic}`));} document.querySelector("#bankCount").textContent=bank.length;if(!bank.length){document.querySelector("#q").innerHTML=`<div class="callout"><strong>No recorded error topics yet.</strong><p>Complete a few practice questions first, then your error drill will become targeted.</p></div>`;return;}
 let idx=0,score=0,errors=0;const render=()=>{const q=bank[idx%bank.length];document.querySelector("#qnum").textContent=`Question ${idx+1}`;document.querySelector("#q").innerHTML=`<div class="source-pill mcq">EXAM PRACTICE</div><p>${esc(q.question)}</p><div class="practice-options">${q.options.map(o=>`<button class="practice-option" data-opt="${o.key}">${o.key}. ${esc(o.text)}</button>`).join("")}</div>`;document.querySelector("#feedback").textContent="";document.querySelector("#errorReason")?.classList.add("hidden");};
 document.querySelector("#q").onclick=e=>{const b=e.target.closest(".practice-option");if(!b)return;const q=bank[idx%bank.length],ok=answerMatches(b.dataset.opt,q.answer);updateMCQMetric(ok);if(ok){score++;document.querySelector("#feedback").textContent="✓ Correct — retrieve the reason, not only the letter.";}else{errors++;document.querySelector("#feedback").textContent=`✗ Incorrect. Correct answer: ${q.answer}`;document.querySelector("#errorReason")?.classList.remove("hidden");document.querySelector("#saveError")&&(document.querySelector("#saveError").onclick=()=>{recordError({question:q.question,unit:q.unit,topic:q.topic,topicTitle:q.topicTitle,selected:b.dataset.opt,correct:q.answer,reason:document.querySelector("#errorReasonSelect")?.value||"Not classified"});document.querySelector("#errorSaved").textContent="Error card created ✓";setTimeout(()=>document.querySelector("#errorSaved").textContent="",1200);});}document.querySelectorAll(".practice-option").forEach(x=>x.disabled=true);};
 document.querySelector("#nextQuestion").onclick=()=>{idx++;render();};document.querySelector("#skip")?.addEventListener("click",()=>{idx++;render()});render();
}
async function initFlashcards(){
 await loadAll();renderNav();const cards=allMicrotopics().slice(0,100).map(m=>{const lines=String(m.content_notes||"").split(/\n/).map(x=>x.trim()).filter(Boolean);return {unit:m.unitId,topic:m.topicId,id:m.id,front:`What is ${m.title}?`,back:(lines.find(x=>x&&!x.match(/^[A-Z ]+$/))||lines[1]||"Recall the core idea and one application.")};});document.querySelector("#count").textContent=cards.length;if(!cards.length)return;let i=0,shown=false;const draw=()=>{const c=cards[i%cards.length];document.querySelector("#cardText").textContent=shown?c.back:c.front;document.querySelector("#card").classList.toggle("flipped",shown);document.querySelector("#cardMeta")&&(document.querySelector("#cardMeta").textContent=`Unit ${c.unit} · Micro-topic ${c.topic}.${c.id}`)};document.querySelector("#card").onclick=()=>{shown=!shown;draw()};document.querySelector("#next").onclick=()=>{i++;shown=false;draw()};document.querySelector("#cardAgain")?.addEventListener("click",()=>{shown=false;i++;draw()});document.querySelector("#cardKnown")?.addEventListener("click",()=>{shown=false;i++;draw()});draw();
}
async function initBookmarks(){
 await loadAll();renderNav();
 const a=allMicrotopics().filter(m=>getMicroState(m.unitId,m.topicId,m.id).bookmark);
 document.querySelector("#list").innerHTML=a.length?a.map(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);return `<a class="focus-item" href="${microUrl(m.unitId,m.topicId,m.id)}"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${s.status}</small></a>`}).join(""):`<div class="callout">No bookmarked micro topics yet.</div>`;
}
// PWA / mobile app experience
let deferredInstallPrompt=null;
function setupPWA(){
  if("serviceWorker" in navigator && location.protocol !== "file:"){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
  const installBtn=document.querySelector("#installBtn");
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault(); deferredInstallPrompt=e;
    if(installBtn) installBtn.hidden=false;
  });
  async function install(){
    if(!deferredInstallPrompt){ return; }
    deferredInstallPrompt.prompt();
    try{ await deferredInstallPrompt.userChoice; }catch(e){}
    deferredInstallPrompt=null;
    if(installBtn) installBtn.hidden=true;
  }
  installBtn?.addEventListener("click",install);
  window.addEventListener("appinstalled",()=>{if(installBtn) installBtn.hidden=true;});
}
document.addEventListener("DOMContentLoaded",()=>{
 const p=document.body.dataset.page;
 if(p==="index")initIndex();if(p==="unit")initUnit();if(p==="topic")initTopic();if(p==="dashboard")initDashboard();if(p==="planner")initPlanner();if(p==="pyq")initPyq();if(p==="practice")initPractice();if(p==="flashcards")initFlashcards();if(p==="bookmarks")initBookmarks();if(p==="microtopic")initMicrotopic();
 setupPWA();
 setTimeout(()=>{if(document.body.dataset.page!=="index")renderBottomStudyBar();},250);
});
