
const KEY="psychologyNetStudyHub_v5";
let db=null, meta=null;

async function loadAll(){
  const saved=localStorage.getItem(KEY);
  if(saved){
    try{
      const x=JSON.parse(saved); db=x.db; meta=x.meta;
      // Merge the latest syllabus structure (including micro-topics) into saved local data
      // without overwriting the learner's notes, status or bookmarks.
      const fresh=await (await fetch("data.json",{cache:"no-store"})).json();
      fresh.units.forEach(fu=>{
        const su=db?.units?.find(u=>u.id===fu.id); if(!su) return;
        fu.topics.forEach(ft=>{
          const st=su.topics?.find(t=>t.id===ft.id); if(st && ft.microtopics) st.microtopics=ft.microtopics;
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
function progress(uid){const u=unitById(uid);return Math.round(u.topics.filter(t=>t.status==="Mastered").length/u.topics.length*100);}
function overall(){const a=allTopics();return Math.round(a.filter(t=>t.status==="Mastered").length/a.length*100);}
function renderNav(){
  document.querySelectorAll("[data-nav]").forEach(e=>e.innerHTML=`
    <a href="index.html">Home</a><a href="dashboard.html">Dashboard</a>
    <a href="practice.html">Practice</a><a href="flashcards.html">Flashcards</a><a href="bookmarks.html">Bookmarks</a>`);
}
function exportData(){
 const blob=new Blob([JSON.stringify({db,meta},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="psychology-net-study-backup.json";a.click();
}
function importData(file){
 const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.db)throw 0;db=x.db;meta=x.meta||meta;saveAll();location.reload()}catch(e){alert("Invalid backup file.")}};r.readAsText(file);
}
function todayKey(){return new Date().toISOString().slice(0,10);}
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
function getActivity(){
  const key="psychologyNetActivity_v1";let a={days:{}};
  try{a=JSON.parse(localStorage.getItem(key))||a;}catch(e){}
  return a;
}
function getStreak(){
  const days=getActivity().days||{};let d=new Date(),count=0;
  while(true){const k=d.toISOString().slice(0,10);if(!days[k] || ((days[k].topics||[]).length===0 && (days[k].mcqs||0)===0))break;count++;d.setDate(d.getDate()-1);}
  return count;
}
function resetData(){if(confirm("Reset all your notes, progress, bookmarks and study data?")){localStorage.removeItem(KEY);localStorage.removeItem("psychologyNetActivity_v1");location.reload();}}

async function initIndex(){
 await loadAll();renderNav();
 const topics=allTopics();
 const mastered=topics.filter(t=>t.status==="Mastered").length;
 const studying=topics.filter(t=>t.status==="Studying").length;
 const saved=topics.filter(t=>t.bookmarks).length;
 const pct=overall();
 document.querySelector("#overall").textContent=pct+"%";
 document.querySelector("#mastered").textContent=mastered;
 document.querySelector("#studying").textContent=studying;
 document.querySelector("#topicCount").textContent=topics.length;
 document.querySelector("#heroPercent").textContent=pct+"%";
 document.querySelector("#heroProgress").style.width=pct+"%";
 document.querySelector("#overallBar").style.width=pct+"%";
 document.querySelector("#heroMastered").textContent=mastered;
 document.querySelector("#heroStudying").textContent=studying;
 document.querySelector("#heroSaved").textContent=saved;

 // Today cockpit: a small deterministic daily plan built from unfinished syllabus topics.
 const todayTopics=topics.filter(t=>t.status!=="Mastered");
 const plan=[]; const add=(arr)=>arr.forEach(t=>{if(t&&!plan.some(x=>x.unitId===t.unitId&&x.id===t.id)&&plan.length<3)plan.push(t)});
 add(topics.filter(t=>t.status==="Studying")); add(topics.filter(t=>t.bookmarks)); add(todayTopics); add(topics);
 const act=getActivity(), day=act.days?.[todayKey()]||{topics:[],mcqs:0};
 const doneTopics=day.topics||[], mcqGoal=20, mcqs=Math.min(day.mcqs||0,mcqGoal), streak=getStreak();
 const todayTitle=document.querySelector("#todayDate"); if(todayTitle) todayTitle.textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"});
 const streakEl=document.querySelector("#streak"); if(streakEl) streakEl.textContent=streak;
 const topicDone=plan.filter(t=>doneTopics.includes(`${t.unitId}-${t.id}`)).length;
 const todayTopicCount=document.querySelector("#todayTopicCount"); if(todayTopicCount) todayTopicCount.textContent=`${topicDone}/${plan.length}`;
 const todayMcq=document.querySelector("#todayMcq"); if(todayMcq) todayMcq.textContent=`${mcqs}/${mcqGoal}`;
 const todayBar=document.querySelector("#todayBar"); if(todayBar) todayBar.style.width=Math.min(100,Math.round(((topicDone/Math.max(1,plan.length))+(mcqs/mcqGoal))/2*100))+"%";
 const todayList=document.querySelector("#todayList");
 if(todayList) todayList.innerHTML=plan.map((t,i)=>{const done=doneTopics.includes(`${t.unitId}-${t.id}`);return `<a class="today-task ${done?"done":""}" href="${topicUrl(t.unitId,t.id)}"><span class="today-check">${done?"✓":i+1}</span><span><strong>${esc(t.title)}</strong><small>Unit ${t.unitId} · ${done?"Completed today":"Study this topic"}</small></span><b>→</b></a>`}).join("") || `<div class="callout"><strong>Syllabus complete.</strong><p>Use today for revision and MCQ practice.</p></div>`;

 const next=topics.find(t=>t.status==="Studying") || topics.find(t=>t.bookmarks) || topics.find(t=>t.status!=="Mastered") || topics[0];
 if(next){
   const cb=document.querySelector("#continueBtn"); cb.href=topicUrl(next.unitId,next.id);
   cb.textContent=(next.status==="Studying"?"Continue studying →":next.bookmarks?"Resume saved topic →":"Start your first topic →");
   document.querySelector("#heroFocus").textContent=next.title;
   document.querySelector("#heroFocusMeta").textContent=`Unit ${next.unitId} · ${next.status}`;
 }
 const queue=[];
 const addUnique=(arr)=>arr.forEach(t=>{if(t && !queue.some(x=>x.unitId===t.unitId&&x.id===t.id))queue.push(t)});
 addUnique(topics.filter(t=>t.status==="Studying"));
 addUnique(topics.filter(t=>t.bookmarks));
 addUnique(topics.filter(t=>t.status!=="Mastered"));
 const fg=document.querySelector("#focusGrid");
 fg.innerHTML=queue.slice(0,6).map(t=>`<a class="focus-item" href="${topicUrl(t.unitId,t.id)}"><strong>${esc(t.title)}</strong><small>Unit ${t.unitId} · ${esc(t.unitTitle)}</small><span class="focus-state ${t.status.toLowerCase().replace(/\s+/g,'-')}">${t.status}${t.bookmarks?" · ★ Saved":""}</span></a>`).join("") || `<div class="callout"><strong>Your study queue is empty.</strong><p>Open any syllabus topic and set its status to Studying or bookmark it.</p></div>`;

 const grid=document.querySelector("#unitGrid");
 const render=(q="")=>{
  q=q.toLowerCase().trim();
  const units=db.units.filter(u=>(`unit ${u.id} ${u.title} ${u.topics.map(t=>t.title).join(" ")}`).toLowerCase().includes(q));
  grid.innerHTML=units.map(u=>`<a class="unit-card" href="${unitUrl(u.id)}"><div class="unit-num">UNIT ${u.id}</div><h3>${esc(u.title)}</h3><p>${u.topics.length} outline points · ${u.topics.reduce((n,t)=>n+(t.microtopics||[]).length,0)} micro topics</p><div class="progress"><i style="width:${progress(u.id)}%"></i></div><small>${progress(u.id)}% mastered</small></a>`).join("") || `<div class="callout"><strong>No matching unit or topic.</strong><p>Try a broader search term.</p></div>`;
 };
 render();
 document.querySelector("#search").oninput=e=>render(e.target.value);
 document.querySelector("#export").onclick=exportData;document.querySelector("#reset").onclick=resetData;
 document.querySelector("#importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
 const homeInstall=document.querySelector("#homeInstall");
 homeInstall?.addEventListener("click",()=>document.querySelector("#installBtn")?.click());
}

async function initUnit(){
 await loadAll();renderNav();const id=new URLSearchParams(location.search).get("unit"),u=unitById(id);
 if(!u){location.href="index.html";return}
 const microCount=u.topics.reduce((n,t)=>n+(t.microtopics||[]).length,0);
 document.querySelector("#title").textContent=`Unit ${u.id} — ${u.title}`;
 document.querySelector("#count").textContent=`${u.topics.length} outline points · ${microCount} micro topics`;
 document.querySelector("#progress").textContent=`${progress(u.id)}% mastered`;
 const list=document.querySelector("#outline");
 const render=q=>{
   q=q.toLowerCase().trim();
   const topics=u.topics.filter(t=>{
     const hay=[t.title,...(t.microtopics||[]).map(m=>m.title)].join(" ").toLowerCase();
     return hay.includes(q);
   });
   list.innerHTML=topics.map(t=>{
     const mts=t.microtopics||[];
     return `<section class="outline-group" id="outline-${u.id}-${t.id}">
       <div class="outline-item outline-heading">
         <span class="num">${t.id}</span>
         <div class="outline-main"><h3>${esc(t.title)}</h3><p>${t.status==="Mastered"?"✓ Mastered":t.status==="Studying"?"◐ Studying":"○ Not started"}${t.bookmarks?" · ★ Bookmarked":""} · ${mts.length} micro topics</p></div>
         <a class="outline-open btn ghost" href="${topicUrl(u.id,t.id)}">Open workspace →</a>
       </div>
       <div class="microtopic-grid">
         ${mts.map(m=>`<a class="microtopic-card" id="micro-${u.id}-${t.id}-${m.id}" href="${topicUrl(u.id,t.id)}#micro-${u.id}-${t.id}-${m.id}">
           <span class="microtopic-num">${t.id}.${m.id}</span><div><strong>${esc(m.title)}</strong><small>Micro topic · Study within this outline point</small></div><span class="microtopic-arrow">→</span>
         </a>`).join("")}
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
 document.querySelector("#num").textContent=`Topic ${t.id}`;document.querySelector("#title").textContent=t.title;document.querySelector("#syllabus").textContent=t.title;document.querySelector("#explanation").textContent=t.explanation;
 const mt=document.querySelector("#microtopics"); if(mt){mt.innerHTML=(t.microtopics||[]).map((x,i)=>`<li id="micro-${u.id}-${t.id}-${x.id}" class="microtopic-panel"><span class="microtopic-num">${t.id}.${x.id}</span><div><strong>${esc(x.title)}</strong><small>Micro topic study space</small></div></li>`).join("");}
 ["detailed","notes","pyqs","mcqs","flashcards","references"].forEach(k=>document.querySelector("#"+k).value=t[k]||"");
 document.querySelector("#status").value=t.status||"Not started";document.querySelector("#bookmark").textContent=t.bookmarks?"★ Bookmarked":"☆ Bookmark";
 const side=document.querySelector("#side");side.innerHTML=u.topics.map(x=>`<a class="${x.id===t.id?"active":""}" href="${topicUrl(u.id,x.id)}">${x.id}. ${esc(x.title)}</a>`).join("");
 const save=()=>{["detailed","notes","pyqs","mcqs","flashcards","references"].forEach(k=>t[k]=document.querySelector("#"+k).value);t.status=document.querySelector("#status").value;t.last_reviewed=new Date().toISOString();recordActivity("topic",t);saveAll();document.querySelector("#saved").textContent="Saved ✓";setTimeout(()=>document.querySelector("#saved").textContent="",1200)};
 document.querySelector("#save").onclick=save;
 document.querySelector("#bookmark").onclick=()=>{t.bookmarks=!t.bookmarks;recordActivity("topic",t);document.querySelector("#bookmark").textContent=t.bookmarks?"★ Bookmarked":"☆ Bookmark";saveAll()};
 document.querySelector("#clear").onclick=()=>{if(confirm("Clear this topic workspace?")){["detailed","notes","pyqs","mcqs","flashcards","references"].forEach(k=>document.querySelector("#"+k).value="");document.querySelector("#status").value="Not started";save()}};
 document.querySelector("#prev").onclick=()=>{const i=u.topics.findIndex(x=>x.id===t.id);if(i>0)location.href=topicUrl(u.id,u.topics[i-1].id)};
 document.querySelector("#next").onclick=()=>{const i=u.topics.findIndex(x=>x.id===t.id);if(i<u.topics.length-1)location.href=topicUrl(u.id,u.topics[i+1].id)};
}
async function initDashboard(){
 await loadAll();renderNav();
 const topics=allTopics();document.querySelector("#overall").textContent=overall()+"%";
 document.querySelector("#mastered").textContent=topics.filter(t=>t.status==="Mastered").length;
 document.querySelector("#studying").textContent=topics.filter(t=>t.status==="Studying").length;
 document.querySelector("#bookmarks").textContent=topics.filter(t=>t.bookmarks).length;
 document.querySelector("#units").innerHTML=db.units.map(u=>`<div class="dash-row"><a href="${unitUrl(u.id)}"><strong>Unit ${u.id}</strong> ${esc(u.title)}</a><span>${progress(u.id)}%</span></div>`).join("");
 const due=topics.filter(t=>t.status!=="Mastered" || t.bookmarks).slice(0,12);
 document.querySelector("#focus").innerHTML=due.length?due.map(t=>`<a href="${topicUrl(t.unitId,t.id)}" class="focus-item"><strong>${esc(t.title)}</strong><small>Unit ${t.unitId} · ${t.status}${t.bookmarks?" · ★":""}</small></a>`).join(""):"<p>Nothing queued yet.</p>";
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
 const a=allTopics().filter(t=>t.bookmarks);
 document.querySelector("#list").innerHTML=a.length?a.map(t=>`<a class="focus-item" href="${topicUrl(t.unitId,t.id)}"><strong>${esc(t.title)}</strong><small>Unit ${t.unitId} · ${t.status}</small></a>`).join(""):`<div class="callout">No bookmarked topics yet.</div>`;
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
 if(p==="index")initIndex();if(p==="unit")initUnit();if(p==="topic")initTopic();if(p==="dashboard")initDashboard();if(p==="practice")initPractice();if(p==="flashcards")initFlashcards();if(p==="bookmarks")initBookmarks();
 setupPWA();
});
