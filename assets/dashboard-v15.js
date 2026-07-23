(()=>{
'use strict';
const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const validDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const pct=(current,previous)=>previous?((current-previous)/previous)*100:(current?100:0);
const escText=v=>esc(v??'');
const fmtShort=v=>{const d=validDate(v);return d?d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):String(v||'-')};
const compact=v=>num(v).toLocaleString('en-US',{maximumFractionDigits:0});

function dashboardData(){
  const rows=Array.isArray(state.rows)?state.rows:[];
  const now=new Date();
  const startCurrent=new Date(now.getFullYear(),now.getMonth(),1);
  const startNext=new Date(now.getFullYear(),now.getMonth()+1,1);
  const startPrevious=new Date(now.getFullYear(),now.getMonth()-1,1);
  const current=rows.filter(r=>{const d=validDate(dateVal(r));return d&&d>=startCurrent&&d<startNext});
  const previous=rows.filter(r=>{const d=validDate(dateVal(r));return d&&d>=startPrevious&&d<startCurrent});
  const currentSpend=current.reduce((s,r)=>s+amountVal(r),0);
  const previousSpend=previous.reduce((s,r)=>s+amountVal(r),0);
  const paid=current.filter(r=>statusVal(r).toLowerCase()==='paid');
  const pending=current.filter(r=>statusVal(r).toLowerCase()==='pending');
  const avg=current.length?currentSpend/current.length:0;
  const months=[];
  for(let offset=5;offset>=0;offset--){
    const d=new Date(now.getFullYear(),now.getMonth()-offset,1);
    months.push({key:monthKey(d),label:d.toLocaleDateString('en-US',{month:'short'}),total:0});
  }
  const monthMap=new Map(months.map(m=>[m.key,m]));
  rows.forEach(r=>{const d=validDate(dateVal(r));if(d){const m=monthMap.get(monthKey(d));if(m)m.total+=amountVal(r)}});
  const high=[...rows].sort((a,b)=>amountVal(b)-amountVal(a)).slice(0,6);
  const latest=[...rows].sort((a,b)=>{const da=validDate(dateVal(a))?.getTime()||0;const db=validDate(dateVal(b))?.getTime()||0;return db-da}).slice(0,7);
  const status={paid:0,pending:0,cancelled:0,other:0};
  current.forEach(r=>{const s=statusVal(r).toLowerCase();if(s==='paid')status.paid++;else if(s==='pending')status.pending++;else if(s==='cancelled')status.cancelled++;else status.other++});
  return {rows,current,previous,currentSpend,previousSpend,paid,pending,avg,months,high,latest,status};
}

function renderBars(months){
  const max=Math.max(...months.map(m=>m.total),1);
  return months.map(m=>`<div class="bar-item"><div class="bar" style="height:${Math.max(3,(m.total/max)*100)}%"><span class="bar-value">${m.total?`MVR ${compact(m.total)}`:'0'}</span></div><span class="bar-label">${m.label}</span></div>`).join('');
}

function renderDashboardLive(){
  const d=dashboardData();
  const change=pct(d.currentSpend,d.previousSpend);
  const totalStatus=d.status.paid+d.status.pending+d.status.cancelled+d.status.other;
  const paidDeg=totalStatus?d.status.paid/totalStatus*360:0;
  const pendingDeg=totalStatus?d.status.pending/totalStatus*360:0;
  const cancelledDeg=totalStatus?d.status.cancelled/totalStatus*360:0;
  const donut=`conic-gradient(#19a866 0 ${paidDeg}deg,#f4a340 ${paidDeg}deg ${paidDeg+pendingDeg}deg,#d64a55 ${paidDeg+pendingDeg}deg ${paidDeg+pendingDeg+cancelledDeg}deg,#7c8ca5 ${paidDeg+pendingDeg+cancelledDeg}deg 360deg)`;
  $('#content').innerHTML=`<div class="dashboard-live">
    <div class="dash-toolbar"><div><h1 style="margin:0 0 5px;font-size:28px">Purchasing overview</h1><div class="muted">Live spending, bill activity and cost movement.</div></div><div class="actions"><span class="live-badge"><span class="live-dot"></span>Live data</span><button class="btn secondary dash-refresh" id="dashRefresh" type="button">↻ Refresh</button><button class="btn" data-go="new" type="button">＋ New Bill</button></div></div>
    <section class="dash-metrics">
      <article class="dash-stat primary"><small>This month spend</small><strong>${money(d.currentSpend)}</strong><span class="${change>=0?'trend-up':'trend-down'}">${change>=0?'▲':'▼'} ${Math.abs(change).toFixed(1)}% vs last month</span></article>
      <article class="dash-stat"><small>Bills this month</small><strong>${d.current.length}</strong><span>${d.previous.length} last month</span></article>
      <article class="dash-stat"><small>Average bill</small><strong>${money(d.avg)}</strong><span>Current month average</span></article>
      <article class="dash-stat"><small>Paid value</small><strong>${money(d.paid.reduce((s,r)=>s+amountVal(r),0))}</strong><span>${d.paid.length} paid bills</span></article>
      <article class="dash-stat"><small>Pending value</small><strong>${money(d.pending.reduce((s,r)=>s+amountVal(r),0))}</strong><span>${d.pending.length} pending bills</span></article>
    </section>
    <section class="dash-grid">
      <article class="dash-card"><div class="dash-card-head"><strong>Monthly purchasing trend</strong><span>Last 6 months</span></div><div class="chart-wrap"><div class="bar-chart">${renderBars(d.months)}</div></div></article>
      <article class="dash-card"><div class="dash-card-head"><strong>Payment status</strong><span>This month</span></div><div class="donut-area"><div class="donut" style="background:${donut}"><div class="donut-center"><strong>${totalStatus}</strong><span>bills</span></div></div><div class="legend"><div class="legend-row"><span class="legend-swatch" style="background:#19a866"></span><span>Paid</span><strong>${d.status.paid}</strong></div><div class="legend-row"><span class="legend-swatch" style="background:#f4a340"></span><span>Pending</span><strong>${d.status.pending}</strong></div><div class="legend-row"><span class="legend-swatch" style="background:#d64a55"></span><span>Cancelled</span><strong>${d.status.cancelled}</strong></div><div class="legend-row"><span class="legend-swatch" style="background:#7c8ca5"></span><span>Other</span><strong>${d.status.other}</strong></div></div></div></article>
    </section>
    <section class="dash-lists">
      <article class="dash-card"><div class="dash-card-head"><strong>Highest-cost bills</strong><span>Top 6 loaded records</span></div><div class="live-list">${d.high.length?d.high.map(r=>`<div class="live-row high-bill"><div><b>${escText(vendorVal(r)||'Unknown vendor')}</b><small>${fmtShort(dateVal(r))} · Bill ${escText(get(r,'bill_no','Bill No','number')||'-')}</small></div><strong>${money(amountVal(r))}</strong></div>`).join(''):'<div class="empty-live">No bills available.</div>'}</div></article>
      <article class="dash-card"><div class="dash-card-head"><strong>Latest bill updates</strong><span>Newest activity</span></div><div class="live-list">${d.latest.length?d.latest.map(r=>`<div class="live-row"><div><b>${escText(vendorVal(r)||'Unknown vendor')}</b><small>${fmtShort(dateVal(r))} · ${escText(statusVal(r))}</small></div><strong>${money(amountVal(r))}</strong></div>`).join(''):'<div class="empty-live">No recent activity.</div>'}</div></article>
    </section>
    <div class="dash-updated" id="dashUpdated">Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
  </div>`;
  bindGo();
  $('#dashRefresh').onclick=refreshDashboard;
}

async function refreshDashboard(){
  const button=$('#dashRefresh');
  if(button){button.disabled=true;button.textContent='Refreshing…'}
  try{await loadBills();if(state.view==='dashboard')renderDashboardLive()}catch(error){console.error(error);if(button){button.disabled=false;button.textContent='↻ Refresh'}}
}

window.renderDashboard=renderDashboardLive;
let timer=setInterval(()=>{if(state.user&&state.view==='dashboard'&&!document.hidden)refreshDashboard()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user&&state.view==='dashboard')refreshDashboard()});
})();