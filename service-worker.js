const CACHE_NAME = 'white-saffron-pwa-v16';
const OFFLINE_URL = './offline.html';
const APP_SHELL = [
  './','./index.html','./supply-rates.html','./prices.html','./master.html','./stock.html','./setup-stock.html','./erp.html',
  './brand-system.css','./color-system.css','./pwa-install.js','./navigation-system.js','./session-timeout.js','./manifest.webmanifest',OFFLINE_URL,
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

const withNavigationSystem = async response => {
  if(!response?.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('navigation-system.js')){
    html=html.replace(/<\/body>/i,'  <script src="./navigation-system.js" defer></script>\n</body>');
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
};

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'})
      .then(async response=>{
        const enhanced=await withNavigationSystem(response);
        if(enhanced.ok){const copy=enhanced.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
        return enhanced;
      })
      .catch(async()=>withNavigationSystem(await caches.match(request)||await caches.match(OFFLINE_URL))));
    return;
  }

  const liveAsset=/\.(?:html|css|js|json|webmanifest)$/.test(url.pathname);
  if(liveAsset){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(async()=>await caches.match(request)||Response.error()));
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