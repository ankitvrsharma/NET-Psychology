const CACHE='netpsych-shell-v15-home-resilient';
const SHELL=[
  './',
  './index.html',
  './learn.html',
  './practice.html',
  './microtopic.html',
  './topic.html',
  './unit.html',
  './start.html',
  './progress.html',
  './revision.html',
  './daily3.html',
  './style.css',
  './app.js',
  './data.json',
  './content-version.js',
  './kaplan_enrichment.json',
  './study_sources.json',
  './mcq_mapping.json',
  './practice_questions.json',
  './practice_explanations.json',
  './manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;

  const url=new URL(req.url);
  const isDocument=/\.html?$/.test(url.pathname)||url.pathname.endsWith('/');
  const isAsset=/\.(css|js)$/.test(url.pathname);
  const isData=/\.json$/.test(url.pathname);

  // Always prefer the network for HTML, CSS, JS and data. This prevents
  // stale learning content from surviving behind a cache-first response.
  if(isDocument||isAsset||isData){
    event.respondWith(
      fetch(req).then(res=>{
        if(res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
        }
        return res;
      }).catch(()=>caches.match(req).then(cached=>cached||caches.match(url.pathname)))
    );
    return;
  }

  // Other same-origin requests remain cache-first, with a network fallback.
  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(res.ok){
        const copy=res.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
      }
      return res;
    }))
  );
});
