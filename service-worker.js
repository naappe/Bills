const CACHE_NAME = "white-saffron-pwa-v5";
const OFFLINE_URL = "./offline.html";
const APP_SHELL = [
  "./",
  "./index.html",
  "./supply-rates.html",
  "./prices.html",
  "./master.html",
  "./stock.html",
  "./setup-stock.html",
  "./brand-system.css",
  "./pwa-install.js",
  "./session-timeout.js",
  "./manifest.webmanifest",
  OFFLINE_URL,
  "./assets/pwa/icon-192.svg",
  "./assets/pwa/icon-512.svg",
  "./assets/pwa/icon-maskable.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const optimizeBillsHtml = async response => {
  if (!response.ok) return response;
  const html = await response.text();
  const startMarker = "         async function loadBills()";
  const endMarker = "    function buildPayload(form)";
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }

  const fastLoader = `         async function loadBills(){notice('','');els.recordStatus.textContent='Loading latest six months...';els.filterSummary.classList.toggle('hidden',!isAdmin());if(isAdmin())els.filterSummary.textContent='Loading recent records from Supabase...';const previousRows=state.rows.slice(),now=new Date(),cutoff=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString();try{const{data,error}=await db.from(TABLE_NAME).select('*').gte('created_at',cutoff).order('id',{ascending:false});if(error)throw error;state.rows=data||[];state.yearRows=state.rows.filter(isThisYear);rebuildVendorCanonicals();renderVendorOptions();applyFilters();$('lastUpdated').textContent=\`Updated \${maldivesNow().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false})} MVT\`;els.recordStatus.textContent=\`\${state.rows.length.toLocaleString()} bills loaded from the latest six months\`;notice('','')}catch(error){notice('error',\`Bills could not load: \${error?.message||'Network request failed'}. Press Refresh to try again.\`);if(!previousRows.length){state.rows=[];state.yearRows=[];state.filtered=[];render()}else{els.recordStatus.textContent=\`Showing \${previousRows.length.toLocaleString()} previously loaded records\`}}}\n`;
  const optimized = html.slice(0, start) + fastLoader + html.slice(end);
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.delete("content-length");
  return new Response(optimized, { status: response.status, statusText: response.statusText, headers });
};

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isBillsNavigation = request.mode === "navigate" &&
    (url.pathname.endsWith("/Bills/") || url.pathname.endsWith("/Bills/index.html") || url.pathname.endsWith("/index.html"));

  if (isBillsNavigation) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(optimizeBillsHtml)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  const isLiveAppAsset =
    request.mode === "navigate" ||
    /\.(?:html|css|js|json|webmanifest)$/.test(url.pathname);

  if (isLiveAppAsset) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (request.mode === "navigate" ? await caches.match(OFFLINE_URL) : Response.error())
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});