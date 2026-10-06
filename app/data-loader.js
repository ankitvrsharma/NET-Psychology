/* Study-data loader. Fetches the same sources and applies the same enrichment pipeline as before. */
(function(){
'use strict';
window.NETPsychologyDataLoader={
  create:function(ctx){
async function loadStudyData(){
  const response=await fetch('./data.json?v='+ctx.dataVersion,{cache:'default'});
  if(!response.ok) throw new Error('Study data request failed: '+response.status);
  const json=await response.json();
  try{
    const kr=await fetch('./kaplan_enrichment.json?v='+ctx.dataVersion+'',{cache:'default'});
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
    const sr=await fetch('./study_sources.json?v='+ctx.dataVersion,{cache:'default'});
    if(sr.ok) json.study_source_config=await sr.json();
  }catch(e){console.warn('Study source configuration could not be loaded:',e)}
  try{
    const sp=await fetch('./simply_psychology_enrichment.json?v='+ctx.dataVersion,{cache:'default'});
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
  ctx.data=json;
  // Render core UI immediately; optional enrichment must never block a usable page.
  if(document.body.dataset.page==='home'||document.body.dataset.page==='practice'||document.body.dataset.page==='practice-session'||document.body.dataset.page==='start') ctx.render();
  if(document.body.dataset.page==='practice'||document.body.dataset.page==='practice-session'||document.body.dataset.page==='active-recall'||document.body.dataset.page==='daily-practice'){
    try{
      const pq=await fetch('./practice_questions.json?v=20261001-pyq1',{cache:'default'});
      if(pq.ok){const parsed=await pq.json();if(Array.isArray(parsed))ctx.questions=parsed;}
      try{const pe=await fetch('./practice_explanations.json?v=20261001-pyq1',{cache:'default'});if(pe.ok){const parsed=await pe.json();if(parsed&&typeof parsed==='object'){ctx.explanations=parsed;ctx.questions=ctx.questions.map(q=>({...q,explanation:ctx.explanations[q.id]||q.explanation}));}}}catch(e){console.warn('PYQ explanations could not be loaded:',e)}
    }catch(e){console.warn('PYQ bank could not be loaded:',e)}
    try{
      const mm=await fetch('./mcq_mapping.json?v='+ctx.dataVersion,{cache:'default'});
      if(mm.ok){
        const map=await mm.json();
        const overrides=map&&map.question_overrides&&typeof map.question_overrides==='object'?map.question_overrides:{};
        ctx.questions=ctx.questions.map(q=>{
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
  ctx.render();
  return true;
}

    return loadStudyData;
  }
};
})();