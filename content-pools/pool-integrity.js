/* Canonical learning-pool integrity validator.
   Admin/content-build layer only. Learner runtime should consume prebuilt pools, not audit or repair them. */
(function(root){
'use strict';
function idsFromSyllabus(syllabus){
  const ids=[];
  for(const unit of (syllabus&&syllabus.units)||[])
    for(const topic of unit.topics||[])
      for(const micro of topic.microtopics||[])
        ids.push({id:`${unit.id}-${topic.id}-${micro.id}`,title:micro.title});
  return ids;
}
function validate(syllabus,pools){
  const canonical=idsFromSyllabus(syllabus), expected=new Map(canonical.map(x=>[x.id,x.title]));
  const report={expected:canonical.length,pools:{},valid:true};
  for(const [name,pool] of Object.entries(pools||{})){
    const keys=Object.keys(pool||{}), missing=[],extra=[],titleMismatches=[];
    for(const [id,title] of expected){ if(!(id in pool)) missing.push(id); else if(String(pool[id].title||'')!==String(title||'')) titleMismatches.push({id,expected:title,actual:pool[id].title||''}); }
    for(const id of keys) if(!expected.has(id)) extra.push(id);
    const valid=missing.length===0&&extra.length===0&&titleMismatches.length===0;
    report.pools[name]={entries:keys.length,missing,extra,titleMismatches,valid};
    if(!valid) report.valid=false;
  }
  return report;
}
root.NETPsychologyPoolIntegrity={idsFromSyllabus,validate};
})(typeof window!=='undefined'?window:globalThis);
