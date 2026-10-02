const CACHE='netpsych-shell-v27-practice-session1';
const SHELL=[
  './',
  './index.html',
  './learn.html',
  './practice.html',
  './practice-session.html',
  './microtopic.html',
  './topic.html',
  './unit.html',
  './start.html',
  './progress.html',
  './revision.html',
  './daily3.html',
  './style.css',
  './app.js',
  './data.js',
  './data.json',
  './exam_schedule.json',
  './content-version.js',
  './kaplan_enrichment.json',
  './study_sources.json',
  './mcq_mapping.json',
  './practice_questions.json',
  './practice_explanations.json',
  './manifest.webmanifest'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  const url=new URL(req.url);
  const networkFirst=/\.(?:html?|json|js|css|webmanifest)$/i.test(url.pathname);
  if(networkFirst){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      if(!res.ok) throw new Error('Network response '+res.status);
      const copy=res.clone(); event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy))); return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true})));
    return;
  }
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{
    const copy=res.clone(); event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy))); return res;
  })));
});
