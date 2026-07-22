const CACHE_NAME = 'white-saffron-pwa-v31';
const OFFLINE_URL = './offline.html';
const APP_SHELL = [
  './','./index.html','./master.html',
  './ocean-breeze.css','./pwa-install.js','./manifest.webmanifest',OFFLINE_URL,
  './assets/pwa/icon-192.svg','./assets/pwa/icon-512.svg','./assets/pwa/icon-maskable.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const liveAsset=request.mode==='navigate'||/\.(?:html|css|js|json|webmanifest)$/.test(url.pathname);
  if(liveAsset){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(async()=>await caches.match(request)||(request.mode==='navigate'?await caches.match(OFFLINE_URL):Response.error())));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>{
    const network=fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(()=>cached);
    return cached||network;
  }));
});