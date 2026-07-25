(()=>{
'use strict';
const VERSION=6;
const TITLES={dashboard:'Dashboard',bills:'Bills',new:'New Bill',rates:'Price Intelligence',mobile:'Mobile demo',products:'Products',vendors:'Vendors',prices:'Price Intelligence',reports:'Reports',settings:'Settings',admin:'Admin'};
const VALID=Object.keys(TITLES);
let transitionTimer=null;

const installTransitionStyles=()=>{
 if(document.getElementById('wsRouteTransitionStyles'))document.getElementById('wsRouteTransitionStyles').remove();
 const style=document.createElement('style');
 style.id='wsRouteTransitionStyles';
 style.textContent=`
 .content{position:relative;isolation:isolate}
 .content::after{content:'';position:absolute;inset:0;z-index:999;background:#fff;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 1s ease,visibility 0s linear 1s}
 .content>*{opacity:1;transform:none!important;transition:opacity 1s ease!important}
 body.ws-route-loading .content::after{opacity:1;visibility:visible;pointer-events:auto;transition:opacity 120ms ease,visibility 0s}
 body.ws-route-loading .content>*{opacity:0}
 body.ws-route-ready .content::after{opacity:0;visibility:hidden;transition:opacity 1s ease,visibility 0s linear 1s}
 body.ws-route-ready .content>*{opacity:1;transform:none!important}
 @media(prefers-reduced-motion:reduce){.content::after,.content>*{transition:none!important;transform:none!important}}
 `;
 document.head.appendChild(style);
};

const beginRender=()=>{
 installTransitionStyles();
 clearTimeout(transitionTimer);
 document.body.classList.remove('ws-route-ready');
 document.body.classList.add('ws-route-loading');
};
const endRender=view=>{
 window.UI?.afterRender?.(view);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  document.body.classList.remove('ws-route-loading');
  document.body.classList.add('ws-route-ready');
  transitionTimer=setTimeout(()=>document.body.classList.remove('ws-route-ready'),1050);
 }));
};
const renderBuildError=view=>{
 const content=document.getElementById('content');
 if(!content)return;
 content.innerHTML=`<div class="page-head"><div><h1>Build error</h1><div class="muted">The consolidated page module did not load.</div></div></div><section class="card"><div class="card-body"><strong>Missing renderer: ${esc(view)}</strong><p class="muted">Refresh after the current GitHub Pages deployment finishes.</p></div></section>`;
 endRender(view);
};
const finishRender=(view,result)=>Promise.resolve(result).then(value=>{endRender(view);return value});

window.show=view=>{
 view=VALID.includes(view)?view:'dashboard';
 if((view==='admin'||view==='rates'||view==='prices')&&state.role!=='admin'){
  if(location.hash!== '#dashboard')history.replaceState(null,'','#dashboard');
  view='dashboard';
 }
 beginRender();
 state.view=view;
 document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
 const title=document.getElementById('topTitle');
 if(title)title.textContent=TITLES[view];
 document.getElementById('sidebar')?.classList.remove('open');
 window.__WS_ADMIN__?.updatePresence?.(view);

 if(view==='admin')return finishRender(view,window.renderAdmin?.()).catch(error=>{console.error('[router] admin render failed',error);renderBuildError(view)});
 if(!window.__WS_PAGES__){console.error('[router] pages.js missing; legacy renderer blocked');renderBuildError(view);return}
 const renderer={dashboard:window.renderDashboard,bills:window.renderBills,new:window.renderNewBill,rates:window.renderRates,mobile:window.renderMobileDemo,products:window.renderProducts,vendors:window.renderVendors,prices:window.renderPrices,reports:window.renderReports,settings:window.renderSettings}[view];
 if(typeof renderer!=='function'){renderBuildError(view);return}
 return finishRender(view,renderer()).catch(error=>{
  console.error(`[router] ${view} render failed`,error);
  const content=document.getElementById('content');
  if(content)content.innerHTML=`<div class="page-head"><div><h1>${esc(TITLES[view])}</h1><div class="muted">Unable to render this page.</div></div></div><section class="card"><div class="card-body">${esc(error?.message||String(error))}</div></section>`;
  endRender(view);
 });
};
installTransitionStyles();
window.__WS_ROUTER__={version:VERSION};
})();