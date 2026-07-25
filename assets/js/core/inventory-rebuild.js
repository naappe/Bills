(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const text=v=>String(v??'').trim();
const get=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const rows=()=>Array.isArray(state?.rows)?state.rows:[];
const amount=row=>Number(String(get(row,'amount','Amount','total','Total','grand_total','Grand Total')||0).replace(/,/g,''))||0;
const vendor=row=>text(get(row,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown vendor';
const status=row=>text(get(row,'payment_status','Payment Status','status','Status')||'Pending');
const billNo=row=>text(get(row,'bill_no','Bill No','invoice_no','Invoice No'))||'-';
const category=row=>text(get(row,'category','Category'))||'Uncategorised';
const dateValue=row=>get(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const dateObj=value=>{if(!value)return new Date(0);const raw=String(value).trim();let match=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(match)return new Date(Number(match[3]),Number(match[2])-1,Number(match[1]));const parsed=new Date(value);return Number.isNaN(parsed.getTime())?new Date(0):parsed};
const fmtDate=value=>{const d=dateObj(value);return d.getTime()?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'-'};
const safe=v=>typeof esc==='function'?esc(v):text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=v=>typeof money==='function'?money(v):`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const go=view=>{location.hash=`#${view}`};

function rebuildShell(){
 const nav=document.querySelector('.nav');
 if(nav&&!nav.dataset.rebuilt){
  const items=[['Overview',null,null],['Dashboard','dashboard','fa-th-large'],['Procurement',null,null],['Bills','bills','fa-file-invoice'],['Price Intelligence','rates','fa-chart-line'],['Products','products','fa-box'],['Vendors','vendors','fa-building'],['Insights',null,null],['Reports','reports','fa-chart-pie'],['Workspace',null,null],['Settings','settings','fa-sliders-h'],['Admin & users','admin','fa-user-cog']];
  nav.innerHTML=items.map(([label,view,icon])=>view?`<a href="#${view}" data-view="${view}"><i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span></a>`:`<div class="nav-section-label">${label}</div>`).join('');
  nav.dataset.rebuilt='1';
 }
 const title=byId('topTitle');
 if(title&&!title.parentElement.classList.contains('topbar-page')){
  const wrap=document.createElement('div');wrap.className='topbar-page';title.parentNode.insertBefore(wrap,title);wrap.appendChild(title);const sub=document.createElement('div');sub.className='topbar-subtitle';sub.id='topSubtitle';sub.textContent='Overview of your procurement metrics';wrap.appendChild(sub);
 }
 document.querySelector('.inventory-top-actions')?.remove();
 syncTopbar();
}
function syncTopbar(){
 const view=(location.hash||'#dashboard').slice(1);const meta={dashboard:['Dashboard','Overview of your procurement metrics'],bills:['Bills','Manage invoices, payments, and supplier records'],rates:['Price Intelligence','Track purchase rates and supplier pricing'],products:['Products','Manage the product catalogue'],vendors:['Vendors','Manage your supplier network'],reports:['Reports','Review procurement performance'],settings:['Settings','Configure workspace preferences'],admin:['Admin & users','Manage access, roles, and activity']}[view]||['Dashboard','Overview of your procurement metrics'];
 if(byId('topTitle'))byId('topTitle').textContent=meta[0];if(byId('topSubtitle'))byId('topSubtitle').textContent=meta[1];document.querySelectorAll('.nav a[data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
}

window.renderDashboard=()=>{
 const list=rows();const total=list.reduce((sum,row)=>sum+amount(row),0);const paidRows=list.filter(row=>status(row).toLowerCase()==='paid');const paid=paidRows.reduce((sum,row)=>sum+amount(row),0);const pending=Math.max(0,total-paid);const pendingCount=list.length-paidRows.length;const supplierMap=new Map();const categoryMap=new Map();
 list.forEach(row=>{const v=vendor(row);const current=supplierMap.get(v)||{count:0,total:0};current.count++;current.total+=amount(row);supplierMap.set(v,current);const c=category(row);categoryMap.set(c,(categoryMap.get(c)||0)+amount(row))});
 const suppliers=[...supplierMap.entries()].sort((a,b)=>b[1].total-a[1].total);const recent=[...list].sort((a,b)=>dateObj(dateValue(b))-dateObj(dateValue(a))||Number(b.id||0)-Number(a.id||0)).slice(0,6);const paidPct=total?Math.round(paid/total*100):0;
 const now=new Date();const months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleDateString('en-US',{month:'short'})})}const trend=months.map(month=>list.filter(row=>{const d=dateObj(dateValue(row));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===month.key}).reduce((sum,row)=>sum+amount(row),0));
 const content=byId('content');if(!content)return;content.innerHTML=`<div class="ip-dashboard">
 <header class="ip-page-header"><div><h1>Dashboard</h1><p>Overview of your procurement metrics</p></div><div class="ip-actions"><button class="ip-btn" id="ipNewBill"><i class="fas fa-plus"></i> New Bill</button></div></header>
 <section class="ip-kpis">
  <article class="ip-kpi"><i class="fas fa-coins"></i><span>Total Procurement</span><strong>${cash(total)}</strong><small>${list.length.toLocaleString()} recorded bills</small></article>
  <article class="ip-kpi"><i class="fas fa-file-invoice"></i><span>Total Bills</span><strong>${list.length.toLocaleString()}</strong><small>All active bill records</small></article>
  <article class="ip-kpi"><i class="fas fa-clock"></i><span>Pending Payment</span><strong>${cash(pending)}</strong><small>${pendingCount.toLocaleString()} bills awaiting payment</small></article>
  <article class="ip-kpi"><i class="fas fa-building"></i><span>Suppliers</span><strong>${supplierMap.size.toLocaleString()}</strong><small>Active purchasing relationships</small></article>
 </section>
 <section class="ip-grid">
  <article class="ip-card"><div class="ip-card-head"><h2>Recent Bills</h2><button id="ipAllBills">View all →</button></div><div class="ip-table-wrap"><table class="ip-table"><thead><tr><th>Bill date</th><th>Invoice</th><th>Vendor</th><th>Amount</th><th>Payment</th></tr></thead><tbody>${recent.map(row=>`<tr><td><strong>${safe(fmtDate(dateValue(row)))}</strong></td><td>${safe(billNo(row))}</td><td>${safe(vendor(row))}</td><td><strong>${safe(cash(amount(row)))}</strong></td><td><span class="ip-status ${status(row).toLowerCase()==='paid'?'paid':'pending'}"><i class="fas ${status(row).toLowerCase()==='paid'?'fa-check-circle':'fa-clock'}"></i>${safe(status(row))}</span></td></tr>`).join('')||'<tr><td colspan="5">No bills recorded.</td></tr>'}</tbody></table></div></article>
  <article class="ip-card"><div class="ip-card-head"><h2>Top Suppliers</h2><button id="ipAllVendors">View all →</button></div><div class="ip-card-body">${suppliers.slice(0,6).map(([name,data])=>`<div class="ip-supplier"><div class="ip-supplier-main"><span class="ip-supplier-avatar">${safe(name.slice(0,2).toUpperCase())}</span><div><strong>${safe(name)}</strong><small>${data.count} bill${data.count===1?'':'s'}</small></div></div><span class="ip-supplier-amount">${safe(cash(data.total))}</span></div>`).join('')||'<div class="muted">No supplier data yet.</div>'}</div></article>
 </section>
 <section class="ip-grid">
  <article class="ip-card"><div class="ip-card-head"><h2>Six-Month Spending</h2><span class="muted">MVR</span></div><div class="ip-chart"><canvas id="ipSpendChart"></canvas></div></article>
  <article class="ip-card"><div class="ip-card-head"><h2>Payment Status</h2></div><div class="ip-payment"><div class="ip-payment-value"><strong>${paidPct}%</strong><span>of recorded procurement value paid</span></div><div class="ip-progress"><i style="width:${paidPct}%"></i></div><div class="ip-payment-grid"><div><span>Paid</span><strong>${safe(cash(paid))}</strong></div><div><span>Pending</span><strong>${safe(cash(pending))}</strong></div></div></div></article>
 </section>
 <section class="ip-grid">
  <article class="ip-card"><div class="ip-card-head"><h2>Category Distribution</h2></div><div class="ip-card-body"><div class="ip-tags">${[...categoryMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name])=>`<span class="ip-tag">${safe(name)}</span>`).join('')||'<span class="muted">No categories recorded.</span>'}</div></div></article>
  <article class="ip-card"><div class="ip-card-head"><h2>Procurement Summary</h2></div><div class="ip-card-body"><div class="ip-supplier"><div><strong>Average bill value</strong><small>Across active records</small></div><span class="ip-supplier-amount">${safe(cash(list.length?total/list.length:0))}</span></div><div class="ip-supplier"><div><strong>Largest supplier</strong><small>By purchase value</small></div><span class="ip-supplier-amount">${safe(suppliers[0]?.[0]||'—')}</span></div><div class="ip-supplier"><div><strong>Paid bills</strong><small>Completed payments</small></div><span class="ip-supplier-amount">${paidRows.length}</span></div></div></article>
 </section></div>`;
 byId('ipNewBill').onclick=()=>go('bills');byId('ipAllBills').onclick=()=>go('bills');byId('ipAllVendors').onclick=()=>go('vendors');
 if(window.Chart&&byId('ipSpendChart')){try{window.__IP_CHART__?.destroy();window.__IP_CHART__=new Chart(byId('ipSpendChart'),{type:'bar',data:{labels:months.map(m=>m.label),datasets:[{data:trend,backgroundColor:'#1a5cff',borderRadius:7,borderSkipped:false,maxBarThickness:46}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,callbacks:{label:ctx=>cash(ctx.raw)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#8a9aa8'}},y:{grid:{color:'#e6edf4'},border:{display:false},ticks:{color:'#8a9aa8',callback:v=>`MVR ${Number(v).toLocaleString('en-US')}`}}}}})}catch(error){console.warn('[inventory-rebuild] chart unavailable',error)}};
};

document.addEventListener('DOMContentLoaded',rebuildShell,{once:true});window.addEventListener('hashchange',()=>setTimeout(syncTopbar,0));setTimeout(rebuildShell,0);
window.__WS_INVENTORY_REBUILD__={version:1,rebuildShell};
})();