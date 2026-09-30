
const KEY="psychologyNetStudyHub_v9_3";
let db=null, meta=null;

async function loadAll(){
  const saved=localStorage.getItem(KEY) || localStorage.getItem("psychologyNetStudyHub_v5");
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
    ["index","index.html","Home"],["dashboard","dashboard.html","Dashboard"],["practice","practice.html","Practice"],["flashcards","flashcards.html","Flashcards"],["bookmarks","bookmarks.html","Bookmarks"]
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
  const key="psychologyNetActivity_v1";
  let a={days:{},today:{topics:[],mcqs:0}};
  try{a=JSON.parse(localStorage.getItem(key))||a;}catch(e){}
  const d=todayKey(); if(!a.days[d]) a.days[d]={topics:[],mcqs:0};
  if(kind==="topic" && topic){const id=`${topic.unitId}-${topic.id}`;if(!a.days[d].topics.includes(id))a.days[d].topics.push(id);}
  if(kind==="mcq")a.days[d].mcqs=(a.days[d].mcqs||0)+1;
  a.today=a.days[d];
  localStorage.setItem(key,JSON.stringify(a));
}
function recordMicroActivity(m){
  const key="psychologyNetActivity_v1"; let a=getActivity(); const d=todayKey(); if(!a.days[d])a.days[d]={topics:[],mcqs:0}; const id=`${m.unitId}-${m.topicId}-${m.id}`; if(!a.days[d].topics.includes(id))a.days[d].topics.push(id); a.today=a.days[d]; localStorage.setItem(key,JSON.stringify(a));
}
function getActivity(){
  const key="psychologyNetActivity_v1";let a={days:{}};
  try{a=JSON.parse(localStorage.getItem(key))||a;}catch(e){}
  return a;
}
function getStreak(){
  const days=getActivity().days||{};let d=new Date(),count=0;
  while(true){const k=todayKey(d);if(!days[k] || ((days[k].topics||[]).length===0 && (days[k].mcqs||0)===0))break;count++;d.setDate(d.getDate()-1);}
  return count;
}

const LEARN_KEY="psychologyNetLearning_v1";
function loadLearning(){let x={micro:{}};try{x=JSON.parse(localStorage.getItem(LEARN_KEY))||x;}catch(e){};x.micro=x.micro||{};return x;}
function saveLearning(x){localStorage.setItem(LEARN_KEY,JSON.stringify(x));}
function microKey(u,t,m){return `${u}-${t}-${m}`;}
function getMicroState(u,t,m){return loadLearning().micro[microKey(u,t,m)]||{status:"Not started",bookmark:false,recall:"",pyqResponse:"",reviewLevel:0,nextReview:null,history:[]};}
function setMicroState(u,t,m,patch){const x=loadLearning(),k=microKey(u,t,m);x.micro[k]={...getMicroState(u,t,m),...patch};saveLearning(x);return x.micro[k];}
function allMicrotopics(){return db.units.flatMap(u=>u.topics.flatMap(t=>(t.microtopics||[]).map(m=>({...m,unitId:u.id,unitTitle:u.title,topicId:t.id,topicTitle:t.title,topic:t}))));}
function microProgress(uid){const ms=allMicrotopics().filter(m=>m.unitId===Number(uid));if(!ms.length)return 0;return Math.round(ms.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Mastered").length/ms.length*100);}
function overallMicro(){const ms=allMicrotopics();if(!ms.length)return 0;return Math.round(ms.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Mastered").length/ms.length*100);}
function microDue(m){const s=getMicroState(m.unitId,m.topicId,m.id);if(!s.nextReview)return true;return new Date(s.nextReview)<=new Date();}
function isoPlusDays(n){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.toISOString();}
function formatDue(iso){if(!iso)return "Ready to learn";const d=new Date(iso),now=new Date();const day=Math.round((d-now)/86400000);if(day<=0)return "Due now";if(day===1)return "Due tomorrow";return `Due in ${day} days`;}
function parsePyqBlocks(raw){return String(raw||"").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);}
function microContent(m){
  const parent=m.topic?.explanation||"";
  const title=m.title;
  return `<div class="content-note-grid"><div><span class="eyebrow">MICRO-TOPIC</span><h3>${esc(title)}</h3><p>This is a dedicated learning node under the syllabus outline point <strong>${esc(m.topicTitle)}</strong>.</p></div><div><span class="eyebrow">WHAT TO RETRIEVE</span><ul><li>Define or explain the concept in your own words.</li><li>Recall its key features, components, stages, assumptions, theorists or distinctions as applicable.</li><li>Connect it back to the parent syllabus point and one example or application.</li></ul></div></div><div class="source-note"><strong>Parent syllabus context:</strong> ${esc(parent)}</div>`;
}

async function initIndex(){
 await loadAll();touchVisit();renderNav();
 const topics=allTopics();
 const microsForStats=allMicrotopics();
 const mastered=microsForStats.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Mastered").length;
 const studying=microsForStats.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Studying").length;
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
 addUnique(micros.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Studying" && !getMicroState(m.unitId,m.topicId,m.id).nextReview));
 const fg=document.querySelector("#focusGrid");
 fg.innerHTML=queue.slice(0,6).map(m=>`<a class="focus-item" href="${microUrl(m.unitId,m.topicId,m.id)}"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${esc(m.topicTitle)}</small><span class="focus-state">${getMicroState(m.unitId,m.topicId,m.id).status}${getMicroState(m.unitId,m.topicId,m.id).bookmark?" · ★ Saved":""}</span></a>`).join("") || `<div class="callout"><strong>Your study queue is empty.</strong><p>Open a micro topic and start a recall cycle.</p></div>`;

 const grid=document.querySelector("#unitGrid");
 const render=(q="")=>{
  q=q.toLowerCase().trim();
  const units=db.units.filter(u=>(`unit ${u.id} ${u.title} ${u.topics.map(t=>t.title).join(" ")}`).toLowerCase().includes(q));
  grid.innerHTML=units.map(u=>`<a class="unit-card" href="${unitUrl(u.id)}"><div class="unit-num">UNIT ${u.id}</div><h3>${esc(u.title)}</h3><p>${u.topics.length} outline points · ${u.topics.reduce((n,t)=>n+(t.microtopics||[]).length,0)} micro topics</p><div class="progress"><i style="width:${progress(u.id)}%"></i></div><small>${progress(u.id)}% mastered</small></a>`).join("") || `<div class="callout"><strong>No matching unit or topic.</strong><p>Try a broader search term.</p></div>`;
 };
 render();
 document.querySelector("#search").oninput=e=>render(e.target.value);
 document.querySelector("#exportReviews")?.addEventListener("click",exportReviewCalendar);
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
         <div class="outline-main"><h3>${esc(t.title)}</h3><p>${mts.length} micro topics · ${mts.filter(m=>getMicroState(u.id,t.id,m.id).status==="Mastered").length} mastered</p></div>
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
 const full={...m,unitId:u.id,unitTitle:u.title,topicId:t.id,topicTitle:t.title,topic:t};
 let s=getMicroState(u.id,t.id,m.id);
 document.querySelector("#unitLink").textContent=`Unit ${u.id} — ${u.title}`;document.querySelector("#unitLink").href=unitUrl(u.id);
 document.querySelector("#outlineLink").textContent=`${t.id}. ${t.title}`;document.querySelector("#outlineLink").href=topicUrl(u.id,t.id);
 document.querySelector("#microNum").textContent=`Micro topic ${t.id}.${m.id}`;document.querySelector("#microTitle").textContent=m.title;document.querySelector("#microParent").textContent=`Unit ${u.id} · ${t.title}`;
 document.querySelector("#syllabusAnchor").textContent=t.title;document.querySelector("#contentNotes").innerHTML=m.content_notes?`<div class="rich-note"><div class="source-note"><strong>Content source:</strong> ${esc(m.source||"Source-aligned study content")}</div><div class="rich-note-text">${esc(m.content_notes)}</div></div>`:microContent(full);
 const statusEl=document.querySelector("#microStatus"),dueEl=document.querySelector("#dueLabel"),recall=document.querySelector("#recallResponse"),pyqResp=document.querySelector("#pyqResponse");
 const renderState=()=>{statusEl.textContent=s.status;dueEl.textContent=formatDue(s.nextReview);document.querySelector("#bookmarkMicro").textContent=s.bookmark?"★ Bookmarked":"☆ Bookmark micro topic";recall.value=s.recall||"";pyqResp.value=s.pyqResponse||"";document.querySelector("#nextReview").textContent=s.nextReview?`Next review: ${new Date(s.nextReview).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})} · ${formatDue(s.nextReview)}`:"Complete a recall attempt to schedule revision."};
 renderState();
 const prompt=document.querySelector("#recallPrompt");prompt.innerHTML=`<strong>Without looking at the notes, explain “${esc(m.title)}”.</strong><span>Try to retrieve the definition/core idea, key components or distinctions, and one example or application.</span>`;
 let timer=null,seconds=120;const timerEl=document.querySelector("#recallTimer");
 document.querySelector("#startRecall").onclick=()=>{recordMicroActivity(full);seconds=120;clearInterval(timer);document.querySelector("#contentNotes").classList.add("notes-hidden");document.querySelector("#hideNotes").textContent="Show notes";timer=setInterval(()=>{seconds--;timerEl.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;if(seconds<=0){clearInterval(timer);document.querySelector("#checkRecall").disabled=false}},1000);document.querySelector("#checkRecall").disabled=false;recall.focus();};
 document.querySelector("#hideNotes").onclick=()=>{const hidden=document.querySelector("#contentNotes").classList.toggle("notes-hidden");document.querySelector("#hideNotes").textContent=hidden?"Show notes":"Hide notes for recall"};
 document.querySelector("#checkRecall").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.recall=recall.value.trim();s.status=s.status==="Not started"?"Studying":s.status;setMicroState(u.id,t.id,m.id,s);document.querySelector("#keyPoints").hidden=false;document.querySelector("#keyPoints").innerHTML=`<strong>Check against the content above.</strong><p>Look for missing concepts, inaccurate details and weak connections. Your next step is to rate how well you retrieved the micro topic.</p>`;document.querySelector("#recallSaved").textContent="Recall attempt saved ✓";setTimeout(()=>document.querySelector("#recallSaved").textContent="",1600);renderState();};
 document.querySelectorAll(".rating").forEach(btn=>btn.onclick=()=>{
   const r=btn.dataset.rating;s=getMicroState(u.id,t.id,m.id);
   s.reviewLevel=(s.reviewLevel||0)+1;
   const lvl=Math.max(1,s.reviewLevel);
   const schedule={again:0,hard:1,good:[3,7,14,30,60][Math.min(lvl-1,4)],easy:[7,14,30,60,90][Math.min(lvl-1,4)]};
   const days=schedule[r];
   s.intervalDays=days;s.lastReview=new Date().toISOString();s.overdueCount=(s.overdueCount||0)+(daysOverdue(s.nextReview)>0?1:0);
   s.status=r==="easy"&&s.reviewLevel>=2?"Mastered":"Studying";
   s.nextReview=isoPlusDays(days);s.history=s.history||[];s.history.push({date:new Date().toISOString(),rating:r,days});
   setMicroState(u.id,t.id,m.id,s);recordMicroActivity(full);
   document.querySelector("#nextReview").textContent=`Next review: ${new Date(s.nextReview).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})} · ${formatDue(s.nextReview)}`;renderState();
 });
 const pyqs=parsePyqBlocks(t.pyqs);document.querySelector("#pyqList").innerHTML=pyqs.length?pyqs.map((q,i)=>`<article class="pyq-item"><span>PYQ-STYLE ${i+1}</span><p>${esc(q)}</p></article>`).join(""): `<div class="callout"><strong>No question has been added to this outline point yet.</strong><p>Generated practice questions are clearly labelled PYQ-style and should not be treated as verified past-year questions.</p></div>`;
 document.querySelector("#savePyq").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.pyqResponse=pyqResp.value.trim();s.status=s.status==="Not started"?"Studying":s.status;setMicroState(u.id,t.id,m.id,s);recordMicroActivity(full);document.querySelector("#pyqSaved").textContent="PYQ response saved ✓";renderState();setTimeout(()=>document.querySelector("#pyqSaved").textContent="",1600)};
 document.querySelector("#bookmarkMicro").onclick=()=>{s=getMicroState(u.id,t.id,m.id);s.bookmark=!s.bookmark;setMicroState(u.id,t.id,m.id,s);renderState()};
 document.querySelector("#backOutline").href=topicUrl(u.id,t.id);
 const mts=t.microtopics||[],idx=mts.findIndex(x=>x.id===m.id);const next=idx<mts.length-1?mts[idx+1]:null;const nextBtn=document.querySelector("#nextMicro");if(next){nextBtn.href=microUrl(u.id,t.id,next.id)}else{nextBtn.href=unitUrl(u.id);nextBtn.textContent="Back to unit →";}
}
async function initDashboard(){
 await loadAll();touchVisit();renderNav();
 const micros=allMicrotopics();document.querySelector("#overall").textContent=overall()+"%";
 document.querySelector("#mastered").textContent=micros.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Mastered").length;
 document.querySelector("#studying").textContent=micros.filter(m=>getMicroState(m.unitId,m.topicId,m.id).status==="Studying").length;
 document.querySelector("#bookmarks").textContent=micros.filter(m=>getMicroState(m.unitId,m.topicId,m.id).bookmark).length;
 document.querySelector("#units").innerHTML=db.units.map(u=>`<div class="dash-row"><a href="${unitUrl(u.id)}"><strong>Unit ${u.id}</strong> ${esc(u.title)}</a><span>${progress(u.id)}%</span></div>`).join("");
 const rs=reviewStats(micros);
 const due=rs.due.slice(0,12);
 const reviewSummary=document.querySelector("#reviewSummary");
 if(reviewSummary) reviewSummary.innerHTML=`<strong>${rs.overdue.length} overdue</strong><span>${rs.today.length} due today · ${rs.upcoming.length} scheduled</span><small>Missed reviews are carried forward; intervals are not silently reset.</small>`;
 document.querySelector("#focus").innerHTML=due.length?due.map(m=>{const s=getMicroState(m.unitId,m.topicId,m.id);return `<a href="${microUrl(m.unitId,m.topicId,m.id)}" class="focus-item"><strong>${esc(m.title)}</strong><small>Unit ${m.unitId} · ${m.topicId}.${m.id} · ${reviewLabel(m)}${s.bookmark?" · ★":""}</small></a>`}).join(""):"<p>No reviews are due today. New learning can continue.</p>";
 document.querySelector("#exportReviews")?.addEventListener("click",exportReviewCalendar);
}
function parseMCQs(){
 return allTopics().flatMap(t=>{
  const raw=t.mcqs||""; if(!raw.trim()) return [];
  return raw.split(/\n\s*\n/).filter(Boolean).map(block=>({unit:t.unitId,topic:t.id,text:block}));
 });
}
async function initPractice(){
 await loadAll();renderNav();
 const bank=parseMCQs();document.querySelector("#bankCount").textContent=bank.length;
 if(!bank.length){document.querySelector("#practice").innerHTML=`<div class="callout"><strong>Your MCQ bank is empty.</strong><p>Add MCQs inside individual topic pages. They will automatically appear here.</p></div>`;return}
 let idx=0,score=0;
 const draw=()=>{const q=bank[idx%bank.length];document.querySelector("#q").textContent=q.text;document.querySelector("#qnum").textContent=`Question ${idx+1}`;document.querySelector("#feedback").textContent="";document.querySelector("#answer").value=""};
 document.querySelector("#submit").onclick=()=>{recordActivity("mcq");document.querySelector("#feedback").textContent="Answer saved for your review. The platform does not invent an answer key; compare with your verified source.";idx++;draw()};
 document.querySelector("#skip").onclick=()=>{idx++;draw()};draw();
}
async function initFlashcards(){
 await loadAll();renderNav();
 const cards=allTopics().flatMap(t=>{
  const raw=t.flashcards||"";return raw.split("\n").map(x=>x.trim()).filter(Boolean).map(x=>({unit:t.unitId,topic:t.id,text:x}));
 });
 document.querySelector("#count").textContent=cards.length;
 if(!cards.length){document.querySelector("#card").innerHTML=`<div class="callout">No flashcards yet. Add them in topic workspaces.</div>`;return}
 let i=0,shown=false;const draw=()=>{document.querySelector("#cardText").textContent=cards[i%cards.length].text;shown=false;document.querySelector("#card").classList.remove("flipped")};
 document.querySelector("#card").onclick=()=>{shown=!shown;document.querySelector("#card").classList.toggle("flipped",shown)};
 document.querySelector("#next").onclick=()=>{i++;draw()};draw();
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
 if(p==="index")initIndex();if(p==="unit")initUnit();if(p==="topic")initTopic();if(p==="dashboard")initDashboard();if(p==="practice")initPractice();if(p==="flashcards")initFlashcards();if(p==="bookmarks")initBookmarks();if(p==="microtopic")initMicrotopic();
 setupPWA();
});
