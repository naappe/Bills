(()=>{
'use strict';
const VERSION=1;
const TITLES={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings',admin:'Admin'};
const VALID=Object.keys(TITLES);

const renderBuildError=view=>{
  const content=document.getElementById('content');
  if(!content)return;
  content.innerHTML=`<div class="page-head"><div><h1>Build error</h1><div class="muted">The consolidated page module did not load.</div></div></div><section class="card"><div class="card-body"><strong>Missing renderer: ${esc(view)}</strong><p class="muted">Refresh after the current GitHub Pages deployment finishes.</p></div></section>`;
};

window.show=view=>{
  view=VALID.includes(view)?view:'dashboard';
  state.view=view;
  document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
  const title=document.getElementById('topTitle');
  if(title)title.textContent=TITLES[view];
  document.getElementById('sidebar')?.classList.remove('open');
  window.__WS_ADMIN__?.updatePresence?.(view);

  if(view==='admin'){
    if(state.role!=='admin')return window.show('dashboard');
    return Promise.resolve(window.renderAdmin?.()).catch(error=>{
      console.error('[router] admin render failed',error);
      renderBuildError(view);
    });
  }

  if(!window.__WS_PAGES__){
    console.error('[router] pages.js missing; legacy renderer blocked');
    renderBuildError(view);
    return;
  }

  const renderer={
    dashboard:window.renderDashboard,
    bills:window.renderBills,
    new:window.renderNewBill,
    products:window.renderProducts,
    vendors:window.renderVendors,
    prices:window.renderPrices,
    reports:window.renderReports,
    settings:window.renderSettings
  }[view];

  if(typeof renderer!=='function'){
    renderBuildError(view);
    return;
  }

  return Promise.resolve(renderer()).catch(error=>{
    console.error(`[router] ${view} render failed`,error);
    const content=document.getElementById('content');
    if(content)content.innerHTML=`<div class="page-head"><div><h1>${esc(TITLES[view])}</h1><div class="muted">Unable to render this page.</div></div></div><section class="card"><div class="card-body">${esc(error?.message||String(error))}</div></section>`;
  });
};

window.__WS_ROUTER__={version:VERSION};
})();
