const CACHE='netpsych-v8';
const VERSION='20261001-5';
const STATIC=['./','./index.html','./unit.html','./topic.html','./microtopic.html','./practice.html','./revision.html','./progress.html',`./style.css?v=${VERSION}`,`./app.js?v=${VERSION}`,'./data.json','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>{
      if(cached) return cached;
      if(url.pathname.endsWith('/data.json') || url.pathname==='./data.json') return caches.match('./data.json');
      return caches.match('./index.html');
    }))
  );
});