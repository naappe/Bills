(()=>{
'use strict';
const VERSION=7;
const TITLES={dashboard:'Dashboard',bills:'Bills',new:'New Bill',rates:'Price Intelligence',mobile:'Mobile demo',products:'Products',vendors:'Vendors',prices:'Price Intelligence',reports:'Reports',settings:'Settings',admin:'Admin'};
const VALID=Object.keys(TITLES);
let transitionTimer=null;
let renderSequence=0;

const installTransitionStyles=()=>{
 if(document.getElementById('wsRouteTransitionStyles'))return;
 const style=document.createElement('style');
 style.id='wsRouteTransitionStyles';
 style.textContent=`
 .content{position:relative;isolation:isolate}
 .content::after{content:'';position:absolute;inset:0;z-index:999;background:#fff;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 160ms ease,visibility 0s linear 160ms}
 .content>*{opacity:1;transform:none!important;transition:opacity 160ms ease!important}
 body.ws-route-loading .content::after{opacity:.55;visibility:visible;pointer-events:none;transition:opacity 80ms ease,visibility 0s}
 body.ws-route-loading .content>*{opacity:.72}
 body.ws-route-ready .content::after{opacity:0;visibility:hidden;transition:opacity 160ms ease,visibility 0s linear 160ms}
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
 return ++renderSequence;
};
const endRender=(view,sequence)=>{
 if(sequence!==renderSequence)return;
 window.UI?.afterRender?.(view);
 requestAnimationFrame(()=>{
  if(sequence!==renderSequence)return;
  document.body.classList.remove('ws-route-loading');
  document.body.classList.add('ws-route-ready');
  transitionTimer=setTimeout(()=>document.body.classList.remove('ws-route-ready'),180);
 });
};
const renderBuildError=(view,sequence)=>{
 const content=document.getElementById('content');
 if(!content)return;
 content.innerHTML=`<div class="page-head"><div><h1>Build error</h1><div class="muted">The consolidated page module did not load.</div></div></div><section class="card"><div class="card-body"><strong>Missing renderer: ${esc(view)}</strong><p class="muted">Refresh after the current GitHub Pages deployment finishes.</p></div></section>`;
 endRender(view,sequence);
};
const finishRender=(view,result,sequence)=>Promise.resolve(result).then(value=>{endRender(view,sequence);return value});

window.show=view=>{
 view=VALID.includes(view)?view:'dashboard';
 if((view==='admin'||view==='rates'||view==='prices')&&state.role!=='admin'){
  if(location.hash!=='#dashboard')history.replaceState(null,'','#dashboard');
  view='dashboard';
 }
 const sequence=beginRender();
 state.view=view;
 document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
 const title=document.getElementById('topTitle');
 if(title)title.textContent=TITLES[view];
 document.getElementById('sidebar')?.classList.remove('open');
 window.__WS_ADMIN__?.updatePresence?.(view);

 if(view==='admin')return finishRender(view,window.renderAdmin?.(),sequence).catch(error=>{console.error('[router] admin render failed',error);renderBuildError(view,sequence)});
 if(!window.__WS_PAGES__){console.error('[router] pages.js missing; legacy renderer blocked');renderBuildError(view,sequence);return}
 const renderer={dashboard:window.renderDashboard,bills:window.renderBills,new:window.renderNewBill,rates:window.renderRates,mobile:window.renderMobileDemo,products:window.renderProducts,vendors:window.renderVendors,prices:window.renderPrices,reports:window.renderReports,settings:window.renderSettings}[view];
 if(typeof renderer!=='function'){renderBuildError(view,sequence);return}
 return finishRender(view,renderer(),sequence).catch(error=>{
  console.error(`[router] ${view} render failed`,error);
  if(sequence!==renderSequence)return;
  const content=document.getElementById('content');
  if(content)content.innerHTML=`<div class="page-head"><div><h1>${esc(TITLES[view])}</h1><div class="muted">Unable to render this page.</div></div></div><section class="card"><div class="card-body">${esc(error?.message||String(error))}</div></section>`;
  endRender(view,sequence);
 });
};
installTransitionStyles();
window.__WS_ROUTER__={version:VERSION};
})();
