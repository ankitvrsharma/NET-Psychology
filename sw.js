const CACHE='netpsych-shell-v1.7.0';
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
  './admin.html',
  './admin.js',
  './revision.html',
  './daily3.html',
  './daily-practice.html',
  './style.css',
  './app.js',
  './app/runtime.js',
  './feedback-config.js',
  './content-version.js',
  './manifest.webmanifest'
];
const RUNTIME_DATA=new Set([
  'syllabus-index.json',
  'active_recall.json',
  'quick_cards.json',
  'micro_topics.json',
  'deep_dive.json',
  'questions.json',
  'revision_guidance.json',
  'home-learning.json',
  'mcq_mapping.json',
  'verification-state.json'
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
  event.respondWith((async()=>{
    const cached=await caches.match(cacheKey);
    const refresh=fetch(req,{cache:'no-store'}).then(res=>{
      if(!res.ok)throw new Error('Network response '+res.status);
      const copy=res.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(cacheKey,copy)));
      return res;
    }).catch(()=>null);
    if(cached){
      event.waitUntil(refresh.then(()=>undefined));
      return cached;
    }
    const fresh=await refresh;
    if(fresh)return fresh;
    throw new Error('Cached resource unavailable and network request failed');
  })());
});
