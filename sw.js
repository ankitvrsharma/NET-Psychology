const CACHE='netpsych-shell-v1.2.0';
const SHELL=[
  './',
  './index.html',
  './learn.html',
  './practice.html',
  './practice-session.html',
  './microtopic.html',
  './active-recall.html',
  './topic.html',
  './unit.html',
  './start.html',
  './progress.html',
  './revision.html',
  './daily3.html',
  './daily-practice.html',
  './learner.html',
  './deep-dive.html',
  './style.css',
  './app.js',
  './syllabus-index.json',
  './content-version.js',
  './manifest.webmanifest',
  './content-pools/registry.json',
  './question-renderer.js'
];
const RUNTIME_DATA=new Set([
  'kaplan_enrichment.json',
  'study_sources.json',
  'simply_psychology_enrichment.json',
  'mcq_mapping.json',
  'questions.json',
  'home-learning.json',
  'microtopic_explanations.json',
  'quick_learn_cards.json',
  'deep_dive_explanations.json',
  'active_recall.json',
  'source_synthesis.json',
  'content-publish-config.json',
  'content-publish-manifest.json',
  'content-owner-overrides.json'
]);
const NEVER_CACHE=new Set(['exam_schedule.json']);
const canonicalRequest=url=>new Request(url.origin+url.pathname,{method:'GET'});
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(NEVER_CACHE.has(url.pathname.split('/').pop())){event.respondWith(fetch(req,{cache:'no-store'}));return;}
  const name=url.pathname.split('/').pop();
  const isShell=SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname);
  const isRuntimeData=RUNTIME_DATA.has(name);
  if(!isShell&&!isRuntimeData)return;
  const cacheKey=canonicalRequest(url);
  event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
    if(!res.ok)throw new Error('Network response '+res.status);
    const copy=res.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(cacheKey,copy)));
    return res;
  }).catch(()=>caches.match(cacheKey)));
});
