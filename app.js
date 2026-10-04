(function(){
'use strict';
const $=s=>document.querySelector(s);
const qsa=s=>Array.from(document.querySelectorAll(s));
function initMobileNavigation(){
  const toggle=document.querySelector('.menu-toggle');
  const nav=document.querySelector('#site-navigation');
  if(!toggle||!nav||toggle.dataset.menuReady==='1') return;
  toggle.dataset.menuReady='1';
  // Older page markup contained an inline toggle handler. Remove it so navigation has one source of truth.
  if(toggle.hasAttribute('onclick')) toggle.removeAttribute('onclick');
  const close=()=>{document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation')};
  const open=()=>{document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation')};
  toggle.addEventListener('click',()=>document.body.classList.contains('menu-open')?close():open());
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('click',e=>{if(!document.body.classList.contains('menu-open'))return;if(!toggle.contains(e.target)&&!nav.contains(e.target))close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>820)close()},{passive:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{initMobileNavigation();initDataActions()},{once:true}); else {initMobileNavigation();initDataActions();}
function initDataActions(){
  if(document.documentElement.dataset.actionHandlersReady==='1') return;
  document.documentElement.dataset.actionHandlersReady='1';
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]');
    if(!action) return;
    if(action.dataset.action==='reload') location.reload();
  });
}

const Q=new URLSearchParams(location.search); let D=null,PRACTICE_QUESTIONS=[],PRACTICE_EXPLANATIONS={};
let CONTENT_GATE={ready:false,failClosed:true,mode:'ai_or_owner',ai:{},owner:{approved:{},rejected:{}}};
const KEY='netPsychProgress';
async function loadContentGate(){
  try{
    const [cfgRes,manifestRes,ownerRes]=await Promise.all([
      fetch('./content-publish-config.json?v=20261004-expert3',{cache:'default'}),
      fetch('./content-publish-manifest.json?v=20261004-expert3',{cache:'default'}),
      fetch('./content-owner-overrides.json?v=20261004-expert3',{cache:'default'})
    ]);
    if(!cfgRes.ok||!manifestRes.ok||!ownerRes.ok) throw new Error('Content publishing gate unavailable');
    const cfg=await cfgRes.json(), manifest=await manifestRes.json(), owner=await ownerRes.json();
    CONTENT_GATE={
      ready:true,failClosed:false,mode:cfg.mode||manifest.mode||'ai_or_owner',
      ai:manifest.ai_pass||{questions:{pass:[]},microtopics:{pass:[]},quickLearnCards:{pass:[]},activeRecall:{pass:[]}},
      owner:{
        approved:owner.owner_approved||{},
        rejected:owner.owner_rejected||{}
      }
    };
  }catch(e){
    console.error('Content publishing gate failed:',e);
    CONTENT_GATE={ready:false,failClosed:true,mode:'owner_only',ai:{},owner:{approved:{},rejected:{}}};
  }
}
function gateSet(obj,key){return new Set(Array.isArray(obj?.[key])?obj[key]:[])}
const EXPERT_AUDIT_VERSION='2026-10-04-expert1';
const EXPERT_THRESHOLDS={pass:85,review:60};
function expertText(value){if(Array.isArray(value))return value.map(expertText).join(' ');if(value&&typeof value==='object')return Object.values(value).map(expertText).join(' ');return String(value??'');}
function expertSignals(text){const s=expertText(text).replace(/\s+/g,' ').trim(),low=s.toLowerCase();const generic=['this topic is important','plays a crucial role','understanding this concept','in simple terms','it is important to note','in conclusion','this helps us understand','is very important'];const domain=['mechanism','distinguish','contrast','whereas','condition','evidence','study','research','theory','model','construct','process','predict','criterion','validity','reliability','reinforcement','cognition','behaviour','behavior','individual difference','development','assessment','experiment','correlation','causal'];const teaching=['exam','pyq','trap','recall','application','example','scenario','cue','mnemonic'];return{length:s.length,genericHits:generic.filter(x=>low.includes(x)).length,domainHits:domain.filter(x=>low.includes(x)).length,teachingHits:teaching.filter(x=>low.includes(x)).length,contrastHits:(low.match(/\b(distinguish|different from|whereas|unlike|contrast|not the same as|however)\b/g)||[]).length,mechanismHits:(low.match(/\b(because|therefore|leads to|results in|involves|through|mechanism|process)\b/g)||[]).length,names:(s.match(/\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)?\b/g)||[]).length};}
function expertMicroAudit(m){const core=expertText([m.title,m.expert_explanation,m.detailed_explanation,m.content_notes,m.study_notes,m.application_question,m.recall_cue,m.memory_hook,m.kaplan_enrichment?.notes,m.simply_psychology_enrichment?.notes]),sig=expertSignals(core),issues=[];if(!String(m.title||'').trim())issues.push('missing_title');if(sig.length<220)issues.push('too_thin');if(!Array.isArray(m.sources)||!m.sources.length)issues.push('no_explicit_source_mapping');if(sig.genericHits>=3)issues.push('generic_ai_style');if(sig.domainHits<3)issues.push('low_psychology_specificity');if(sig.mechanismHits<1&&sig.contrastHits<1)issues.push('weak_explanation_structure');let source=Array.isArray(m.sources)&&m.sources.length?15:0;if(m.kaplan_enrichment?.notes||m.simply_psychology_enrichment?.notes||m.source_notes)source+=5;const accuracy=Math.min(25,10+(sig.domainHits*2)+(sig.mechanismHits*2)+(sig.contrastHits*2));const expert=Math.min(20,8+(sig.length>=500?5:0)+(sig.domainHits>=6?4:0)+(sig.names>=2?3:0));const net=Math.min(15,6+(sig.teachingHits*2)+(String(m.content_notes||'').toLowerCase().includes('pyq')?3:0));const learning=Math.min(10,4+(m.application_question?2:0)+(m.recall_cue||m.memory_hook?2:0)+(sig.contrastHits?2:0));const originality=Math.max(0,10-(sig.genericHits*3)-(sig.length<180?4:0));let score=source+accuracy+expert+net+learning+originality;if(sig.genericHits>=3)score-=8;if(!m.sources?.length)score-=10;score=Math.max(0,Math.min(100,Math.round(score)));const critical=issues.some(x=>['missing_title','no_explicit_source_mapping'].includes(x));const status=critical||score<EXPERT_THRESHOLDS.review?'ISSUE':score>=EXPERT_THRESHOLDS.pass?'PASS':'REVIEW';return{score,status,issues,signals:sig};}
function expertQuestionAudit(q){const text=expertText([q.question,q.explanation,q.session,q.type,q.kind]),sig=expertSignals(text),issues=[];if(!String(q.question||'').trim())issues.push('missing_question');if(!Array.isArray(q.options)||q.options.length!==4)issues.push('invalid_options');if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)issues.push('invalid_answer');const mapped=q.unit!=null&&q.topic!=null&&q.micro!=null;if(!mapped)issues.push('unmapped');if(!String(q.explanation||'').trim())issues.push('missing_explanation');if(sig.genericHits>=2)issues.push('generic_explanation_style');if(sig.length<180)issues.push('thin_explanation');if(!q.session||q.type!=='PYQ')issues.push('weak_provenance');let score=0;score+=(q.session&&q.type==='PYQ'?20:0);score+=(Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4?15:0);score+=(mapped?15:0);score+=Math.min(20,String(q.explanation||'').length>=300?20:String(q.explanation||'').length>=220?16:String(q.explanation||'').length>=180?12:6);score+=Math.min(15,sig.domainHits*1.5);score+=Math.min(10,sig.contrastHits*2+sig.mechanismHits*2);score+=(q.kind?5:0);score-=Math.min(15,sig.genericHits*4);score=Math.max(0,Math.min(100,Math.round(score)));const status=issues.some(i=>['missing_question','missing_explanation','invalid_options','invalid_answer'].includes(i))?'ISSUE':score>=85?'PASS':score>=60?'REVIEW':'ISSUE';return{score,status,issues,signals:sig};}
function expertQuickCardAudit(id){const parts=String(id||'').split('|'),mid=parts[0],angle=parts[1]||'',p=mid.split('-').map(Number),mt=D?.units?.find(x=>x.id===p[0])?.topics?.find(x=>x.id===p[1])?.microtopics?.find(x=>x.id===p[2]);if(!mt)return{score:0,status:'ISSUE',issues:['missing_parent_microtopic']};const base=expertMicroAudit(mt),text=expertText([mt.expert_explanation,mt.detailed_explanation,mt.content_notes,mt.study_notes,mt.application_question,mt.recall_cue,mt.memory_hook]).toLowerCase();const requirements={'CORE IDEA':/core|definition|means|refers|concept|theor/i,'KEY FEATURES':/feature|characteristic|component|dimension|factor|type/i,'PYQ FOCUS':/pyq|exam|question|distinguish|trap/i,'EXAM TRAP':/trap|distinguish|not the same|whereas|common error/i,'SOURCE DETAIL':/source|study|research|author|model|theory/i,'RECALL CUE':/recall|cue|memory|mnemonic/i,'CONNECTION':/connect|relationship|link|related|contrast|compare/i};const missing=requirements[angle]&&!requirements[angle].test(text),issues=base.issues.slice();if(missing)issues.push('weak_angle_specific_support');const score=Math.max(0,base.score-(missing?15:0));return{score,status:score>=85?'PASS':score>=60?'REVIEW':'ISSUE',issues};}
function expertAudit(type,id){if(type==='microtopics'){const p=String(id).split('-').map(Number),mt=D?.units?.find(x=>x.id===p[0])?.topics?.find(x=>x.id===p[1])?.microtopics?.find(x=>x.id===p[2]);return mt?expertMicroAudit(mt):{score:0,status:'ISSUE',issues:['missing_microtopic']};}if(type==='quickLearnCards')return expertQuickCardAudit(id);const q=(PRACTICE_QUESTIONS||[]).find(x=>String(x.id)===String(id));return q?expertQuestionAudit(q):{score:0,status:'ISSUE',issues:['content_not_loaded']};}
function contentIsPublished(type,id){if(!CONTENT_GATE.ready)return false;const approved=gateSet(CONTENT_GATE.owner.approved,type),rejected=gateSet(CONTENT_GATE.owner.rejected,type);if(rejected.has(String(id)))return false;if(approved.has(String(id)))return true;if(CONTENT_GATE.mode==='owner_only')return false;if(CONTENT_GATE.mode==='expert_or_owner')return expertAudit(type,id).status==='PASS';return gateSet(CONTENT_GATE.ai,type).has(String(id));}
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
  await loadContentGate();
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
    PRACTICE_QUESTIONS=PRACTICE_QUESTIONS.filter(q=>contentIsPublished('questions',q.id));
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
const all=()=>units().flatMap(u=>u.topics.flatMap(t=>t.microtopics.filter(m=>contentIsPublished('microtopics',key(u.id,t.id,m.id))).map(m=>({u,t,m,k:key(u.id,t.id,m.id)}))));
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
function progressTopicSummary(){
  const topics=units().flatMap(u=>(u.topics||[]).map(t=>({u,t,microtopics:t.microtopics||[]})));
  const touched=topics.filter(x=>x.microtopics.some(m=>isStartedProgress(getP(key(x.u.id,x.t.id,m.id)))));
  const mastered=topics.filter(x=>x.microtopics.length>0&&x.microtopics.every(m=>getP(key(x.u.id,x.t.id,m.id)).status==='MASTERED'));
  const revised=topics.filter(x=>x.microtopics.some(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return (p.revisionCount||0)>0||!!p.lastRevision}));
  const pending=topics.filter(x=>x.microtopics.some(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return !!p.next&&Date.parse(p.next)<=Date.now()}));
  const notRevision=topics.filter(x=>x.microtopics.every(m=>{const p=getP(key(x.u.id,x.t.id,m.id));return !(p.revisionCount>0||p.next||p.lastRevision)}));
  return {total:topics.length,touched:touched.length,mastered:mastered.length,untouched:topics.length-touched.length,revised:revised.length,pending:pending.length,notRevision:notRevision.length};
}
function startPage(){
  document.title='Start Learning — UGC NET Psychology';
  const root=$('#startPage');
  if(!root)return;
  let existing=null;
  try{existing=JSON.parse(localStorage.getItem('netPsychStartProfile')||'null')}catch{existing=null}
  if(existing&&existing.experience){
    const target='learner.html';
    root.innerHTML='<section class="start-profile card"><div class="eyebrow">YOUR LEARNING PROFILE</div><h1>Welcome back.</h1><p>Your starting point is saved. You can continue from where you left off or change your learning profile.</p><div class="start-profile-actions"><a class="btn primary" href="'+target+'">CONTINUE MY LEARNING →</a><button class="btn" type="button" id="editStartProfile">EDIT PROFILE</button></div></section>';
    $('#editStartProfile').onclick=()=>{localStorage.removeItem('netPsychStartProfile');startPage()};
    return;
  }
  root.innerHTML="<section class=\"start-hero\"><div class=\"eyebrow\">START YOUR LEARNING JOURNEY</div><h1>Let’s understand how you learn best.</h1><p>Tell us where you are starting and what you want help with, so your first learning steps feel relevant to you. You can change your answers later.</p></section>\n  <form class=\"start-form\" id=\"startForm\">\n    <div class=\"start-progress\"><span>1 of 4</span><i><b style=\"width:25%\"></b></i></div>\n    <div class=\"start-step active\" data-step=\"1\"><fieldset><legend>1. Where are you starting from?</legend>\n      <label><input type=\"radio\" name=\"experience\" value=\"new-net\" required><span>I’m new to UGC NET Psychology</span></label>\n      <label><input type=\"radio\" name=\"experience\" value=\"psych-new-net\"><span>I know Psychology but I’m new to NET preparation</span></label>\n      <label><input type=\"radio\" name=\"experience\" value=\"prepared\"><span>I’ve prepared for NET before</span></label>\n      <label><input type=\"radio\" name=\"experience\" value=\"appeared\"><span>I’ve appeared for NET before</span></label>\n      <label><input type=\"radio\" name=\"experience\" value=\"revision\"><span>I mainly need revision and practice</span></label>\n    </fieldset></div>\n    <div class=\"start-step\" data-step=\"2\"><fieldset><legend>2. How confident do you currently feel?</legend>\n      <label><input type=\"radio\" name=\"confidence\" value=\"1\" required><span>I struggle with most concepts</span></label>\n      <label><input type=\"radio\" name=\"confidence\" value=\"2\"><span>I know some basics</span></label>\n      <label><input type=\"radio\" name=\"confidence\" value=\"3\"><span>I understand many topics</span></label>\n      <label><input type=\"radio\" name=\"confidence\" value=\"4\"><span>I’m fairly confident</span></label>\n      <label><input type=\"radio\" name=\"confidence\" value=\"5\"><span>I can explain and apply most concepts</span></label>\n    </fieldset></div>\n    <div class=\"start-step\" data-step=\"3\"><fieldset><legend>3. What are your biggest challenges?</legend><p class=\"start-help\">Choose up to 2.</p>\n      <label><input type=\"checkbox\" name=\"challenge\" value=\"0\"><span>Understanding difficult concepts</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"1\"><span>Remembering what I study</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"2\"><span>Confusing similar theories or concepts</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"3\"><span>Applying concepts to situations</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"4\"><span>Solving MCQs and PYQs</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"5\"><span>Revising consistently</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"6\"><span>Knowing what to study next</span></label><label><input type=\"checkbox\" name=\"challenge\" value=\"7\"><span>Managing the large syllabus</span></label>\n    </fieldset></div>\n    <div class=\"start-step\" data-step=\"4\"><fieldset><legend>4. What helps you learn best?</legend><p class=\"start-help\">Choose up to 3. These are preferences, not fixed learning styles.</p>\n      <label><input type=\"checkbox\" name=\"preference\" value=\"0\"><span>Clear explanations</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"1\"><span>Examples and applications</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"2\"><span>Active-recall questions</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"3\"><span>MCQs and PYQs</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"4\"><span>Visual summaries</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"5\"><span>Short revision notes</span></label><label><input type=\"checkbox\" name=\"preference\" value=\"6\"><span>Comparisons between similar concepts</span></label>\n    </fieldset></div>\n    <div class=\"start-actions\"><button class=\"btn\" type=\"button\" id=\"startBack\" hidden>← Back</button><button class=\"btn primary\" type=\"button\" id=\"startNext\">Next →</button></div>\n";
  const form=$('#startForm'),steps=Array.from(form.querySelectorAll('.start-step')),progress=form.querySelector('.start-progress'),next=$('#startNext'),back=$('#startBack'); let current=0;
  const update=()=>{steps.forEach((s,i)=>s.classList.toggle('active',i===current));progress.querySelector('span').textContent=(current+1)+' of '+steps.length;progress.querySelector('b').style.width=((current+1)/steps.length*100)+'%';back.hidden=current===0;next.textContent=current===steps.length-1?'Create my learning profile →':'Next →';};
  form.addEventListener('change',e=>{
    if(e.target.name==='challenge' && form.querySelectorAll('input[name="challenge"]:checked').length>2)e.target.checked=false;
    if(e.target.name==='preference' && form.querySelectorAll('input[name="preference"]:checked').length>3)e.target.checked=false;
  });
  const valid=()=>{if(current===0)return !!form.querySelector('input[name="experience"]:checked');if(current===1)return !!form.querySelector('input[name="confidence"]:checked');if(current===2)return form.querySelectorAll('input[name="challenge"]:checked').length>0;return form.querySelectorAll('input[name="preference"]:checked').length>0;};
  next.addEventListener('click',()=>{
    if(!valid()){alert(current===2?'Choose at least one challenge.':current===3?'Choose at least one preference.':'Please select an answer to continue.');return;}
    if(current<steps.length-1){current++;update();window.scrollTo({top:0,behavior:'smooth'});return;}
    const data={experience:form.querySelector('[name="experience"]:checked').value,confidence:form.querySelector('[name="confidence"]:checked').value,challenges:Array.from(form.querySelectorAll('[name="challenge"]:checked')).map(x=>x.value),learningPreferences:Array.from(form.querySelectorAll('[name="preference"]:checked')).map(x=>x.value),created:new Date().toISOString(),updated:new Date().toISOString()};
    localStorage.setItem('netPsychStartProfile',JSON.stringify(data));
    const startTarget='learner.html';
    root.innerHTML='<section class="start-profile card"><div class="eyebrow">YOUR JOURNEY STARTS HERE</div><h1>A new learning journey begins.</h1><p>We have your starting point. From here, your journey will help you understand concepts, strengthen recall, practise what you know, and return to important ideas at the right time.</p><div class="start-profile-actions"><a class="btn primary" href="'+startTarget+'">BEGIN MY JOURNEY →</a></div></section>';
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
      return `<a class="learn-unit-card" href="unit.html?id=${u.id}"><div class="learn-unit-top"><span class="eyebrow">UNIT ${String(u.id).padStart(2,'0')}</span></div><h2>${esc(u.title)}</h2><div class="learn-unit-progress"><div><span>${s.started} of ${s.total} concepts explored</span><b>${s.percent}%</b></div><div class="bar"><i style="width:${s.percent}%"></i></div></div></a>`;
    }).join('')||'<div class="panel empty"><h3>No units found</h3><p>Try a different search.</p></div>';
  };
  const r=document.querySelector('#learnResume');
  if(r&&resume){
    r.innerHTML=`<div><div class="eyebrow">YOUR CURRENT POSITION</div><strong>${esc(resume.m.title)}</strong><span>${esc(resume.t.title)} · Unit ${resume.u.id}</span></div><a class="btn primary" href="microtopic.html?unit=${resume.u.id}&topic=${resume.t.id}&micro=${resume.m.id}">Resume →</a>`;
    r.hidden=false;
  }else if(r) r.hidden=true;
  draw('');
  $('#learnSearch')?.addEventListener('input',e=>draw(e.target.value));
}function learnerPage(){
  document.title='My Learning — UGC NET Psychology';
  const root=$('#learnJourney');
  if(!root)return;
  const started=startedMicrotopics().sort((a,b)=>new Date(getP(b.k).last||getP(b.k).startedAt||0)-new Date(getP(a.k).last||getP(a.k).startedAt||0));
  const current=started[0]||all()[0];
  if(!current){
    root.innerHTML='<section class="panel empty"><h2>Your learning path is ready.</h2><p>Study data is not available yet.</p></section>';
    return;
  }
  const p=getP(current.k), currentIndex=all().findIndex(x=>x.k===current.k);
  const upcoming=all().slice(Math.max(0,currentIndex+1),Math.max(0,currentIndex+1)+3);
  const summary=progressSummary();
  const learned=summary.learned||0, mastered=summary.mastered||0, scheduled=summary.revisionScheduled||0;
  const progress=summary.coverage;
  root.innerHTML=
    '<section class="learn-journey-hero"><div class="eyebrow">YOUR LEARNING JOURNEY</div><h1>Learn one concept at a time.</h1><p>Pick up where you left off, open your current concept, and keep building your understanding one idea at a time.</p></section>'+'<section class="learning-summary card"><div><div class="eyebrow">LEARNING SUMMARY</div><h2>Your progress so far.</h2></div><div class="learning-summary-grid"><div><strong>'+learned+'</strong><span>Concepts learned</span></div><div><strong>'+mastered+'</strong><span>Concepts mastered</span></div><div><strong>'+scheduled+'</strong><span>In spaced revision</span></div></div></section>'+
    '<section class="learn-current card"><div class="learn-current-head"><div><div class="eyebrow">CONTINUE LEARNING</div><h2>'+esc(current.m.title)+'</h2><p>'+esc(current.t.title)+' · Unit '+esc(current.u.id)+'</p></div><span class="learn-current-progress">'+progress+'%</span></div><div class="bar"><i style="width:'+progress+'%"></i></div><p class="learn-current-note">'+esc(section(current.m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||current.m.title)+'</p><a class="btn primary" href="microtopic.html?unit='+encodeURIComponent(current.u.id)+'&topic='+encodeURIComponent(current.t.id)+'&micro='+encodeURIComponent(current.m.id)+'">'+(p.status&&p.status!=='NEW'?'CONTINUE LEARNING':'START LEARNING')+' →</a></section>'+

    '<section class="learn-up-next"><div class="section-head"><div><div class="eyebrow">UP NEXT</div><h2>Keep moving through the syllabus.</h2></div></div>'+
    (upcoming.length?upcoming.map(x=>'<a class="learn-up-next-item" href="microtopic.html?unit='+encodeURIComponent(x.u.id)+'&topic='+encodeURIComponent(x.t.id)+'&micro='+encodeURIComponent(x.m.id)+'"><span><small>UNIT '+esc(x.u.id)+' · '+esc(x.t.title)+'</small><strong>'+esc(x.m.title)+'</strong></span><b>→</b></a>').join(''):'<div class="panel empty"><p>You have reached the end of the current learning sequence.</p></div>')+
    '</section><a class="learn-syllabus-link" href="learn.html">Browse the syllabus →</a>';
}
function deepDive(){
  const {u,t,m,k}=find(),root=$('#deepDivePage');
  if(!root)return;
  if(!u||!t||!m){root.innerHTML='<section class="panel empty"><h2>Micro-topic not found.</h2><p>Return to Learn and choose a concept.</p></section>';return}
  document.title='Deep Dive — '+m.title+' — UGC NET Psychology';
  const concept=section(m.content_notes,'CORE CONCEPT','\n\nKEY POINTS')||m.title;
  const kp=bullets(section(m.content_notes,'KEY POINTS','\n\nPYQ-STYLE PATTERN'));
  const deep=String(m.detailed_explanation||m.deep||m.content_notes||concept).trim();
  const distinction=String(m.distinction||section(m.content_notes,'COMMON TRAP','\n\n5-MINUTE TEACHING FOCUS')||'').trim();
  const recallHref='active-recall.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id);
  root.innerHTML=
    '<div class="breadcrumbs"><a href="microtopic.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id)+'">Micro-topic</a><span>›</span><span>Deep Dive</span></div>'+
    '<section class="page-hero deep-dive-hero"><div class="eyebrow">DEEP DIVE · UNIT '+esc(u.id)+'</div><h1>'+esc(m.title)+'</h1><p>'+esc(t.title)+' · '+esc(u.title)+'</p></section>'+
    '<article class="deep-dive-content card"><div class="eyebrow">DETAILED EXPLANATION</div><div class="deep-dive-copy">'+esc(deep)+'</div>'+
    (kp.length?'<section class="deep-dive-section"><div class="eyebrow">KEY POINTS</div><ul>'+kp.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>':'')+
    (distinction?'<section class="deep-dive-section"><div class="eyebrow">DISTINCTION / EXAM CAUTION</div><p>'+esc(distinction)+'</p></section>':'')+
    '</article>'+
    '<section class="deep-dive-next card"><div><div class="eyebrow">NEXT STEP</div><h2>Check what you can recall.</h2><p>Close the explanation, then test the concept with its mapped recall questions.</p></div><a class="btn primary" href="'+recallHref+'">CHECK YOUR RECALL →</a></section>';
}
function activeRecall(){
  const {u,t,m,k}=find(),root=$('#activeRecallPage');
  const fromRevision=Q.get('from')==='revision';
  if(!root)return;
  if(!u||!t||!m){root.innerHTML='<section class="panel empty"><h2>Micro-topic not found.</h2><p>Return to Learn and choose a concept.</p></section>';return}
  document.title='Active Recall — '+m.title+' — UGC NET Psychology';
  const qs=practiceFor(u.id,t.id,m.id),groups={};
  qs.forEach((q,index)=>{const kind=q.kind||'direct';(groups[kind]||(groups[kind]=[])).push({q,index})});
  const labels={direct:'MULTIPLE CHOICE',match:'MATCH THE COLUMNS','assertion-reason':'ASSERTION · REASON',sequence:'SEQUENCE','statement-set':'STATEMENT SET'};
  const ordered=['direct','match','assertion-reason','sequence','statement-set'];
  const cards=ordered.filter(kind=>groups[kind]?.length).map(kind=>'<section class="active-recall-group"><div class="eyebrow">'+esc(labels[kind]||kind.toUpperCase())+'</div><div class="active-recall-questions">'+groups[kind].map(item=>mcqHTML(item.q,item.index,'ACTIVE RECALL',false)).join('')+'</div></section>').join('');
  root.innerHTML='<section class="page-hero active-recall-hero"><div class="eyebrow">ACTIVE RECALL</div><h1>Actively recall what you learned.</h1><p>'+esc(m.title)+' · '+esc(t.title)+' · Unit '+esc(u.id)+'</p><div class="active-recall-rule">Close the explanation first. Recall the idea, distinguish similar concepts, and answer before checking feedback.</div></section>'+
    (cards||'<section class="panel empty"><h2>No mapped recall questions yet.</h2><p>This micro-topic does not have mapped questions in the current question pool.</p><button class="btn primary" type="button" id="confirmRecall">I RECALLED THIS CONCEPT</button></section>')+
    '<section class="active-recall-complete card" id="activeRecallComplete" hidden><div class="eyebrow">RECALL COMPLETE</div><h2>You rehearsed this concept.</h2><p>'+ (fromRevision?'Rate how well you recalled it. Your rating sets the next revision date.':'Your first revision has been scheduled for tomorrow.') +'</p><div class="complete-actions"><a class="btn primary" href="microtopic.html?unit='+encodeURIComponent(u.id)+'&topic='+encodeURIComponent(t.id)+'&micro='+encodeURIComponent(m.id)+'">BACK TO LEARNING →</a><a class="btn" href="learner.html">MY LEARNING</a></div></section>'+
    '<section class="revision-rating panel" id="revisionRating" hidden><div class="eyebrow">HOW WELL DID YOU RECALL IT?</div><div class="revision-rating-actions"><button class="btn" type="button" data-revision-rating="again">AGAIN</button><button class="btn" type="button" data-revision-rating="hard">HARD</button><button class="btn" type="button" data-revision-rating="good">GOOD</button><button class="btn primary" type="button" data-revision-rating="easy">EASY</button></div></section>';
  const cardsAll=Array.from(root.querySelectorAll('.mcq'));
  wireMCQ(root,k,qs);
  const finishRecall=()=>{
    const pNow=getP(k);
    setP(k,{recallCompletedAt:new Date().toISOString(),learnedAt:pNow.learnedAt||new Date().toISOString(),status:pNow.status==='MASTERED'?'MASTERED':'LEARNING',last:new Date().toISOString()});
    if(!fromRevision&&!pNow.next)scheduleRevision(k,'initial');
    const complete=$('#activeRecallComplete');if(complete)complete.hidden=false;
    const ratingBox=$('#revisionRating');if(ratingBox)ratingBox.hidden=!fromRevision;
  };
  if(cardsAll.length){
    cardsAll.forEach(card=>card.querySelectorAll('.mcq-option').forEach(btn=>btn.addEventListener('click',()=>{
      const done=cardsAll.every(x=>Array.from(x.querySelectorAll('.mcq-option')).every(b=>b.disabled));
      if(done)finishRecall();
    })));
  }else{
    $('#confirmRecall')?.addEventListener('click',finishRecall);
  }
  root.querySelectorAll('[data-revision-rating]').forEach(btn=>btn.addEventListener('click',()=>{
    const rating=btn.dataset.revisionRating,next=scheduleRevision(k,rating);
    const days=Math.max(1,Math.round((Date.parse(next)-Date.now())/86400000));
    const box=$('#revisionRating');if(box)box.innerHTML='<div class="eyebrow">NEXT REVISION SCHEDULED</div><h3>'+esc(rating[0].toUpperCase()+rating.slice(1))+' — next in '+days+' day'+(days===1?'':'s')+'</h3><p>This concept will return according to your rating.</p><a class="btn primary" href="revision.html">BACK TO REVISION →</a>';
  }));
}
function cycleForFallback(date){
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
function quickVisual(m,k,p){const t=String(m.title||'').toLowerCase(),s=(t+' '+p.join(' ')).toLowerCase();if(/shape constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-shape-stage"><span class="qv-coin circle"></span><span class="qv-coin ellipse"></span><span class="qv-arrow">→</span><span class="qv-coin ellipse tilted"></span></div><div class="qv-caption"><b>RETINAL IMAGE</b><span>viewing angle changes the image; perceived shape remains stable</span></div></div>';if(/size constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-size-stage"><span class="qv-person small"></span><span class="qv-person large"></span></div><div class="qv-caption"><b>RETINAL SIZE CHANGES</b><span>distance changes the image; perceived size remains relatively stable</span></div></div>';if(/brightness constancy|color constancy/.test(t))return'<div class="quick-visual-diagram"><div class="qv-light-stage"><span class="qv-light">LIGHT</span><span class="qv-object"></span><span class="qv-light dim">SHADE</span></div><div class="qv-caption"><b>CONTEXT CHANGES</b><span>the object is perceived as relatively stable across illumination</span></div></div>';if(k==='TIMELINE'||/\b(stage|stages|sequence|process|cycle|conditioning|development)\b/.test(s)){const i=p.slice(0,4);if(i.length>=2)return'<div class="quick-visual quick-flow">'+i.map((x,j)=>'<div><b>'+(j+1)+'</b><span>'+esc(x.slice(0,120))+'</span></div>').join('<i>→</i>')+'</div>'}return''}
function buildQuickLearnBank(){if(QUICK_BANK_CACHE)return QUICK_BANK_CACHE;const bank=[],angles=[['CORE IDEA',x=>x.core],['KEY FEATURES',x=>[x.core,x.points.slice(0,3).join(' ')].filter(Boolean).join(' ')],['PYQ FOCUS',x=>x.dist?('In questions, watch this distinction: '+x.dist):(x.exam||x.core)],['EXAM TRAP',x=>x.dist||x.core],['SOURCE DETAIL',x=>[x.core,x.points.slice(0,2).join(' ')].filter(Boolean).join(' ')],['RECALL CUE',x=>[x.hook,x.core].filter(Boolean).join(' — ')],['CONNECTION',x=>[x.core,x.dist].filter(Boolean).join(' ')]];units().forEach(u=>u.topics.forEach(t=>t.microtopics.forEach(m=>{const p=quickStudyParts(m),joined=[p.core,...p.points].filter(Boolean).join(' ');if(!joined)return;const cat=quickClassify(m.title,joined),src=quickSources(m);angles.forEach(a=>{const cardKey=key(u.id,t.id,m.id)+'|'+a[0];const e=quickClean(a[1](p));if(e&&contentIsPublished('microtopics',key(u.id,t.id,m.id))&&contentIsPublished('quickLearnCards',cardKey))bank.push({id:'QL-'+String(bank.length+1).padStart(4,'0'),title:m.title,category:cat,angle:a[0],explanation:e.slice(0,900),secondary:'',visual:quickVisual(m,cat,p.points),unit:u.id,topic:t.id,micro:m.id,sources:src})})})));QUICK_BANK_CACHE=bank;return bank}
function quickLearnItem(){const bank=buildQuickLearnBank();if(!bank.length)return null;const keyName='netPsychQuickLearnCycle';let cycle={seen:[],cycle:0};try{const stored=JSON.parse(localStorage.getItem(keyName)||'null');if(stored&&Array.isArray(stored.seen))cycle={seen:stored.seen,cycle:Number(stored.cycle)||0}}catch(e){}const validIds=new Set(bank.map(x=>x.id));let seen=cycle.seen.filter(id=>validIds.has(id));let unseen=bank.filter(x=>!seen.includes(x.id));if(!unseen.length){cycle={seen:[],cycle:cycle.cycle+1};seen=[];unseen=bank.slice()}const last=seen[seen.length-1];let pool=unseen;if(pool.length>1&&last)pool=pool.filter(x=>x.id!==last);if(!pool.length)pool=unseen;const item=pool[Math.floor(Math.random()*pool.length)];seen=[...seen,item.id];try{localStorage.setItem(keyName,JSON.stringify({cycle:cycle.cycle,seen}))}catch(e){}return{...item,href:'microtopic.html?unit='+encodeURIComponent(item.unit)+'&topic='+encodeURIComponent(item.topic)+'&micro='+encodeURIComponent(item.micro)+'&focus=detailed&quick='+encodeURIComponent(item.id)}}function home(){
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
  const cards={learn:'<a class="daily-focus-card" href="daily3.html"><strong>LEARN</strong><span>→</span></a>',practice:'<a class="daily-focus-card" href="daily-practice.html"><strong>PRACTICE</strong><span>→</span></a>'};
  const sequence=[cards.learn,cards.practice];
  $('#today').innerHTML='<section class="study-focus study-focus-enhanced"><div class="study-focus-main"><div class="eyebrow">YOUR DAILY LEARNING</div><p>Every study session has a clear purpose: learn a new concept or test what you know.</p></div><div class="study-focus-actions daily-focus-actions">'+sequence.join('')+'</div></section>';
  const quick=quickLearnItem(),quickBox=$('#quickLearn');
  if(quickBox&&quick) quickBox.innerHTML='<section class="quick-learn-card"><div class="quick-learn-top"><div class="eyebrow">QUICK LEARN</div><span class="quick-learn-type">'+esc(quick.category)+'</span></div><div class="quick-learn-body"><h3>'+esc(quick.title)+'</h3><p>'+esc(quick.explanation)+'</p>'+(quick.visual||'')+'</div><a class="quick-learn-link" href="'+quick.href+'">Explore this concept →</a></section>';
  const approach=$('#learningApproach');if(approach)approach.innerHTML=`<div class="learning-approach-head"><div class="eyebrow">LEARNING PATH</div><h2>A systematic approach to learning</h2><p>Move from learning to lasting recall through a simple, repeatable rhythm.</p></div><div class="learning-steps"><div><b>Learn</b><span>Break the topic into smaller, meaningful chunks.</span></div><div><b>Recall</b><span>Use active recall: recall the concept without looking at the notes.</span></div><div><b>Practice</b><span>Practise with normal MCQs and previous-year questions (PYQs).</span></div><div><b>Revise</b><span>Use spaced revision by returning to the concept at spaced intervals.</span></div></div>`;
}
function daily3(){
  document.title='3-Concept Learning — UGC NET Psychology';
  const now=new Date(); const todayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const allItems=all(),keyName='netPsychDailyLearning';
  let existingToday=null;
  try{const storedToday=JSON.parse(localStorage.getItem('netPsychDaily3')||'null');if(storedToday?.date===todayKey&&Array.isArray(storedToday.items))existingToday=storedToday.items.map(k=>allItems.find(x=>x.k===k)).filter(Boolean)}catch(e){}
  if(existingToday?.length){
    $('#daily3App').innerHTML='<section class="page-hero daily3-hero"><div class="eyebrow">3-CONCEPT DAILY SESSION</div><h1>Learn three concepts today.</h1><p>Work through three focused concepts today. Start with each concept, build your understanding, and move on when you are ready.</p></section><section class="daily3-list">'+existingToday.map((x,i)=>'<article class="daily3-item card"><div class="daily3-number">0'+(i+1)+'</div><div class="daily3-copy"><div class="eyebrow">UNIT '+x.u.id+(partForTopic(x.u,x.t)?' · PART '+esc(partForTopic(x.u,x.t).id):'')+' · TOPIC '+x.t.id+'</div><h2>'+esc(x.m.title)+'</h2><p>'+esc(x.t.title)+'</p></div>'+(()=>{const p=getP(key(x.u.id,x.t.id,x.m.id));const done=!!p.recallCompletedAt||p.status==='MASTERED';return done?'<a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">COMPLETED ✓</a>':'<a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">START CONCEPT</a>'})()+'</article>').join('')+'</section><section class="panel daily3-note"><b>Today’s set is fixed.</b><span>Return tomorrow for the next syllabus set. Scheduled revision remains handled by the separate Revision system.</span></section>';
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
  $('#daily3App').innerHTML='<section class="page-hero daily3-hero"><div class="eyebrow">3-CONCEPT DAILY SESSION</div><h1>Learn three concepts today.</h1><p>Work through three focused concepts today. Start with each concept, build your understanding, and move on when you are ready.</p></section><section class="daily3-list">'+session.map((x,i)=>'<article class="daily3-item card"><div class="daily3-number">0'+(i+1)+'</div><div class="daily3-copy"><div class="eyebrow">UNIT '+x.u.id+(partForTopic(x.u,x.t)?' · PART '+esc(partForTopic(x.u,x.t).id):'')+' · TOPIC '+x.t.id+'</div><h2>'+esc(x.m.title)+'</h2><p>'+esc(x.t.title)+'</p></div><a class="btn primary" href="microtopic.html?unit='+x.u.id+'&topic='+x.t.id+'&micro='+x.m.id+'">START CONCEPT</a></article>').join('')+'</section><section class="panel daily3-note"><b>Why three?</b><span>Three concepts give you a manageable study load while helping you keep moving through the syllabus. Your scheduled revisions remain available separately when concepts are due.</span></section>';
}
function nextLink(){const ps=state(),due=all().find(x=>ps[x.k]?.next&&new Date(ps[x.k].next)<=new Date());if(due)return `microtopic.html?unit=${due.u.id}&topic=${due.t.id}&micro=${due.m.id}`;const started=all().find(x=>ps[x.k]?.status&&ps[x.k].status!=='NEW');if(started)return `microtopic.html?unit=${started.u.id}&topic=${started.t.id}&micro=${started.m.id}`;return 'unit.html?id=1'}
function dueItems(){const now=Date.now();return all().filter(x=>getP(x.k).next&&Date.parse(getP(x.k).next)<=now).sort((a,b)=>Date.parse(getP(a.k).next)-Date.parse(getP(b.k).next))}
function scheduleRevision(k,rating='initial'){const p=getP(k),now=new Date(),history=Array.isArray(p.revisionHistory)?p.revisionHistory.slice(-20):[];if(rating==='initial'){const next=new Date(now.getTime()+86400000);setP(k,{next:next.toISOString(),nextInterval:1,revisionCount:Number(p.revisionCount)||0,revisionStartedAt:p.revisionStartedAt||now.toISOString(),revisionHistory:history});return next}const count=(Number(p.revisionCount)||0)+1,previous=Math.max(1,Number(p.nextInterval)||1);let days=1;if(rating==='hard')days=Math.max(2,Math.round(previous*1.5));if(rating==='good')days=count===1?3:Math.max(4,Math.round(previous*2));if(rating==='easy')days=count===1?7:Math.max(7,Math.round(previous*2.5));const next=new Date(now.getTime()+days*86400000),successful=(p.successfulRevisions||0)+(rating==='good'||rating==='easy'?1:0),mastered=successful>=3&&count>=3&&rating!=='again';setP(k,{next:next.toISOString(),nextInterval:days,revisionCount:count,lastRevision:now.toISOString(),lastRating:rating,rating,successfulRevisions:successful,status:mastered?'MASTERED':'RETENTION',revisionHistory:[...history,{rating,at:now.toISOString(),interval:days}].slice(-20),last:now.toISOString()});return next}
function interleaveBy(list,keyFn,limit){const buckets=new Map();for(const item of list){const key=keyFn(item);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(item)}const out=[];while(out.length<limit&&buckets.size){for(const [key,bucket] of [...buckets]){const item=bucket.shift();if(item)out.push(item);if(!bucket.length)buckets.delete(key);if(out.length===limit)break}}return out}
function dailyPractice(){
  const root=$('#dailyPracticeApp');
  if(!root)return;
  const now=new Date(); const todayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const allQuestions=PRACTICE_QUESTIONS.slice();
  let stored=null;
  try{stored=JSON.parse(localStorage.getItem('netPsychDailyPractice')||'null')}catch{stored=null}
  let questions=stored&&stored.date===todayKey&&Array.isArray(stored.ids)?stored.ids.map(id=>allQuestions.find(q=>String(q.id)===String(id))).filter(Boolean):[];
  if(questions.length!==10){
    const shuffled=allQuestions.slice().sort(()=>Math.random()-0.5);
    questions=shuffled.slice(0,10);
    localStorage.setItem('netPsychDailyPractice',JSON.stringify({date:todayKey,ids:questions.map(q=>q.id)}));
  }
  root.innerHTML='<section class="page-hero daily-practice-hero"><div class="eyebrow">DAILY PRACTICE</div><h1>10 questions. One focused check.</h1><p>Work through today’s questions one at a time. Finish the set first, then review your answers and explanations to strengthen what needs another look.</p></section><section id="dailyPracticeSession"></section>';
  let current=0,ended=false,correctCount=0,answers={};
  const renderComplete=()=>{
    ended=true;
    const percent=Math.round(correctCount/questions.length*100);
    const review=questions.map((q,i)=>{
      const record=answers[i],opts=q.options||q.o||[],answer=Number.isInteger(q.answer)?q.answer:0,chosen=record?.chosen;
      const selectedText=chosen==null?'Not answered':String.fromCharCode(65+chosen)+'. '+opts[chosen];
      const correctText=String.fromCharCode(65+answer)+'. '+opts[answer];
      const status=record?.correct?'correct':'incorrect';
      return '<article class="practice-review-item"><div class="practice-review-head"><span class="eyebrow">QUESTION '+(i+1)+'</span><span class="practice-review-status '+status+'">'+(record?.correct?'CORRECT':record?'REVIEW':'NOT ANSWERED')+'</span></div>'+practiceQuestionHTML(q)+'<div class="practice-review-answers"><p><b>Your answer:</b> '+esc(selectedText)+'</p><p><b>Correct answer:</b> '+esc(correctText)+'</p></div><div class="practice-review-explanation"><b>Explanation</b><p>'+esc(contextualExplanation(q))+'</p></div></article>';
    }).join('');
    $('#dailyPracticeSession').innerHTML='<section class="practice-complete card"><div class="eyebrow">DAILY PRACTICE COMPLETE</div><h2>You completed today’s check.</h2><p class="practice-score">'+correctCount+' of '+questions.length+' correct · '+percent+'%</p><p>Now review the explanations. Focus on the concepts behind the questions you missed or found difficult.</p></section><section class="practice-review"><div class="practice-review-intro"><div class="eyebrow">REVIEW</div><h2>Now learn from the questions.</h2><p>Your explanations are shown only after the full daily set is complete.</p></div>'+review+'</section>';
  };
  const renderQuestion=()=>{
    if(ended)return;
    const q=questions[current],answered=Boolean(answers[current]);
    $('#dailyPracticeSession').innerHTML='<section class="practice-session card"><div class="session-head"><div><div class="eyebrow">DAILY PRACTICE</div><h2 id="dailySessionTitle">Question '+(current+1)+' of '+questions.length+'</h2></div><a class="text-link" href="daily3.html">Back to Daily Learning</a></div><div class="session-progress"><i style="width:'+(((current+1)/questions.length)*100)+'%"></i></div><div class="session-questions">'+mcqHTML(q,0,'DAILY PRACTICE',false)+'</div><div class="session-navigation"><button class="btn" id="dailyPrev" type="button"'+(current===0?' disabled':'')+'>← PREVIOUS</button><button class="btn primary" id="dailyNext" type="button"'+(answered?'':' disabled')+'>'+(current===questions.length-1?'FINISH PRACTICE':'NEXT QUESTION')+'</button></div></section>';
    const card=$('#dailyPracticeSession .mcq'),nextBtn=$('#dailyNext'),prevBtn=$('#dailyPrev');
    if(answered)card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
    card.querySelectorAll('.mcq-option').forEach(btn=>btn.onclick=()=>{
      if(answered||ended)return;
      answered=true;
      const chosen=+btn.dataset.a,answer=+card.dataset.answer,wasCorrect=chosen===answer;
      answers[current]={chosen,correct:wasCorrect};
      if(wasCorrect)correctCount++;
      card.querySelectorAll('.mcq-option').forEach(b=>b.disabled=true);
      nextBtn.disabled=false;
    });
    prevBtn.onclick=()=>{if(current<=0)return;current--;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})};
    nextBtn.onclick=()=>{
      if(ended||!answers[current])return;
      if(current<questions.length-1){current++;renderQuestion();window.scrollTo({top:0,behavior:'smooth'})}
      else{
        const s=state();
        questions.forEach((q,i)=>s._practiceHistory=[...(s._practiceHistory||[]),{correct:Boolean(answers[i]?.correct),at:new Date().toISOString(),source:'daily'}].slice(-200));
        save(s);
        renderComplete();
        window.scrollTo({top:0,behavior:'smooth'});
      }
    };
  };
  renderQuestion();
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
    const total=t.microtopics.length,done=t.microtopics.filter(m=>isStartedProgress(getP(key(u.id,t.id,m.id)))).length;
    return `<a class="topic-card" href="topic.html?unit=${u.id}&topic=${t.id}"><div class="topic-card-meta"><span class="eyebrow">TOPIC ${t.id}</span><span class="topic-progress">${done} of ${total} explored</span></div><h3>${esc(t.title)}</h3><p>${esc(t.explanation||'Build your understanding of this topic.')}</p></a>`;
  };
  const topicContent=unitParts(u).length?unitParts(u).map(part=>`<section class="unit-part-section panel"><div class="eyebrow">PART ${esc(part.id)}</div><h2>${esc(part.title)}</h2><p>${esc(part.description||'Focused learning section within this unit.')}</p><div class="topic-grid">${u.topics.filter(t=>part.topic_ids?.map(String).includes(String(t.id))).map(topicCard).join('')}</div></section>`).join(''):`<div class="topic-grid">${u.topics.map(topicCard).join('')}</div>`;
  $('#unitPage').innerHTML=`<div class="breadcrumbs"><a href="learn.html">Learning Path</a><span>›</span><span>Unit ${u.id}</span></div><section class="page-hero unit-hero"><h1>${esc(u.title)}</h1><p>${esc(u.description||'Build your understanding of this unit and connect its topics into a clear exam-ready framework.')}</p><div class="unit-progress"><strong>${explored} of ${countMicro(u)} concepts learned</strong>${unitParts(u).length?`<span>${unitParts(u).length} parts</span>`:''}</div></section><div class="unit-navigation"><a class="unit-nav-prev" href="${prev?`unit.html?id=${prev.id}`:'#'}">← Previous</a><a class="unit-nav-all" href="learn.html">All units</a><a class="unit-nav-next" href="${next?`unit.html?id=${next.id}`:'#'}">Next →</a></div>${topicContent}`;
}
function topicPage(){
  const {u,t}=find();
  if(!u||!t)return $('#topicPage').innerHTML='<div class="panel empty">Topic not found.</div>';
  document.title=`${t.title} — UGC NET Psychology`;
  const topicItems=t.microtopics||[];
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
  const headerMatch=raw.match(/List\s*[-–—]?\s*I\b[\s\S]*?List\s*[-–—]?\s*II\b(?:\s*\([^)]*\))?/i);
  const body=headerMatch?raw.slice(headerMatch.index+headerMatch[0].length):raw;
  const beforeCodes=extractBeforeCodes(body);
  const letterHits=[];
  const letterRe=/(?<!\S)([a-d])\s*[.)]+\s+/gi;
  let m;
  while((m=letterRe.exec(beforeCodes))) letterHits.push({label:m[1].toLowerCase(),start:m.index,end:letterRe.lastIndex});
  const left=letterHits.slice(0,4).map((hit,i)=>{
    const end=i+1<letterHits.length?letterHits[i+1].start:beforeCodes.length;
    let value=beforeCodes.slice(hit.end,end).trim();
    value=value.split(/(?<!\S)[1-4]\s*[.)]+\s+/)[0].trim();
    return {label:hit.label,text:value};
  }).filter(x=>x.text);
  const numHits=[];
  const numRe=/(?<!\S)([1-4])\s*[.)]+\s+/g;
  while((m=numRe.exec(beforeCodes))) numHits.push({label:m[1],start:m.index,end:numRe.lastIndex});
  const right=numHits.slice(0,4).map((hit,i)=>{
    const end=i+1<numHits.length?numHits[i+1].start:beforeCodes.length;
    let value=beforeCodes.slice(hit.end,end).trim();
    value=value.split(/(?<!\S)[a-d]\s*[.)]+\s+/i)[0].trim();
    return {label:hit.label,text:value};
  }).filter(x=>x.text);
  const stem=stripQuestionTail(raw).replace(/^[\s\S]*?(?:match(?:\s+the\s+following)?|match)\s+list\s*[-–—]?\s*i\b/i,"").trim();
  const cleanedStem=(left.length>=2&&right.length>=2)?"":stem.replace(/List\s*[-–—]?\s*I\b[\s\S]*$/i,"").trim();
  return "<div class=\"question-stem match-stem\">"+(cleanedStem?"<p>"+esc(cleanedStem)+"</p>":"")+((left.length||right.length)?("<div class=\"matching-lists\">"+
    "<section><div class=\"matching-label\">LIST I</div><div class=\"matching-items\">"+practiceListHTML(left)+"</div></section>"+
    "<section><div class=\"matching-label\">LIST II</div><div class=\"matching-items\">"+practiceListHTML(right)+"</div></section>"+
    "</div>"):"<p>"+esc(stripQuestionTail(raw))+"</p>")+"</div>";
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
    return "<div class=\"question-stem structured-stem\">"+
      (cleanStem?"<p>"+esc(cleanStem)+"</p>":"")+
      (preferred.length?"<div class=\"question-items\">"+practiceListHTML(preferred)+"</div>":"")+
      "</div>";
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
  const items=dueItems(),shown=items.slice(0,5);
  const rows=shown.map(x=>{
    const p=getP(x.k);
    const nextAt=Date.parse(p.next||'');
    const late=Number.isFinite(nextAt)?(Date.now()-nextAt)/86400000:0;
    const overdue=late>0?'Overdue by '+Math.floor(late)+' day'+(Math.floor(late)===1?'':'s'):'Due today';
    const last=p.rating?' · Last: '+esc(p.rating):'';
    return '<article class="revision-item"><div><span class="status '+esc(String(p.status||'NEW').toLowerCase())+'">'+esc(p.status||'NEW')+'</span><h3>'+esc(x.m.title)+'</h3><p>'+esc(x.t.title)+' · Unit '+esc(x.u.id)+'</p><small>'+overdue+last+'</small></div><a class="btn primary" href="microtopic.html?unit='+encodeURIComponent(x.u.id)+'&topic='+encodeURIComponent(x.t.id)+'&micro='+encodeURIComponent(x.m.id)+'&from=revision">Start Recall →</a></article>';
  }).join('');
  const first=items[0];
  const startHref=first?'microtopic.html?unit='+encodeURIComponent(first.u.id)+'&topic='+encodeURIComponent(first.t.id)+'&micro='+encodeURIComponent(first.m.id)+'&from=revision':'unit.html?id=1';
  const stateBlock=items.length
    ? '<section class="panel empty"><h2>'+items.length+' concept'+(items.length===1?' is':'s are')+' ready to revise</h2><p>These are your scheduled revisions. Recall first, then check the explanation.</p><a class="btn primary" href="'+startHref+'">START REVISION →</a></section>'
    : '<section class="panel empty"><h2>You’re caught up.</h2><p>There is nothing waiting for revision right now. Your next scheduled revision will appear here.</p><a class="btn primary" href="unit.html?id=1">CONTINUE LEARNING →</a></section>';
  const queue=rows?'<section class="revision-list">'+rows+'</section>':'';
  root.innerHTML='<section class="page-hero revision-hero"><h1>Strengthen what you’ve already learned.</h1><p>Try to recall a concept before looking back. Revisit what was difficult, strengthen what is fading, and build memories that last.</p></section>'+
    stateBlock+
    queue+
    '<section class="panel revision-rules"><h2>How to use revision</h2><p>Recall the idea first, check the explanation, then rate how well you remembered it. Your rating sets the next scheduled revision.</p><ul><li><b>Again</b> — I could not recall it.</li><li><b>Hard</b> — I recalled it with effort.</li><li><b>Good</b> — I recalled it successfully.</li><li><b>Easy</b> — I recalled it quickly.</li></ul></section>';
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