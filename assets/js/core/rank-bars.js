(()=>{
'use strict';
const VERSION=1;
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const vendor=row=>String(window.vendorVal?.(row)||'Unknown').trim()||'Unknown';
const amount=row=>Number(window.amountVal?.(row)||0);
const original=window.renderDashboard;
window.renderDashboard=async()=>{
  await original?.();
  const target=document.querySelector('#content .rank');
  if(!target)return;
  const totals=new Map();
  rows().forEach(row=>totals.set(vendor(row),(totals.get(vendor(row))||0)+amount(row)));
  const ranked=[...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maximum=ranked[0]?.[1]||1;
  target.classList.add('horizontal-rank');
  target.innerHTML=ranked.map(([name,total],index)=>{
    const width=Math.max(3,Math.round(total/maximum*100));
    return `<article class="rank-bar-row"><div class="rank-bar-head"><span><b>${index+1}</b>${esc(name)}</span><strong>${money(total)}</strong></div><div class="rank-bar-track" role="img" aria-label="${esc(name)} ${width}% of highest vendor"><span style="width:${width}%"></span></div></article>`;
  }).join('')||'<div class="empty">No vendor data</div>';
};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.dashboard=window.renderDashboard;
window.__WS_RANK_BARS__={version:VERSION};
})();
