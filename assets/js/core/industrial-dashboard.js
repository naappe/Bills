(()=>{
'use strict';
const VERSION=1;
const text=value=>String(value??'').trim();
const valueOf=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null&&text(row[key])!=='')return row[key]}return''};
const amount=row=>Number(String(valueOf(row,'amount','Amount','total','Total','grand_total','Grand Total')||0).replace(/,/g,''))||0;
const status=row=>text(valueOf(row,'payment_status','Payment Status','status','Status')||'Pending');
const vendor=row=>text(valueOf(row,'vendor','Vendor','vendor_name','supplier','Supplier')||'Unknown supplier');
const dateOf=row=>{const raw=valueOf(row,'bill_date','bill_day','Bill Date','date','Date','created_at');if(!raw)return null;const s=String(raw).slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const d=new Date(`${s}T00:00:00`);return Number.isNaN(d.getTime())?null:d}const d=new Date(raw);return Number.isNaN(d.getTime())?null:d};
const moneyValue=value=>typeof money==='function'?money(value):`MVR ${Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const escValue=value=>typeof esc==='function'?esc(value):text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const rows=()=>Array.isArray(state?.rows)?state.rows:[];
const itemsOf=row=>{let items=row?.items;if(typeof items==='string'){try{items=JSON.parse(items)}catch{items=[]}}return Array.isArray(items)?items:[]};
const categoryOf=(row,item)=>text(valueOf(item,'category','Category')||valueOf(row,'category','Category')||'Uncategorised');

function categoryComposition(list){
 const map=new Map();
 list.forEach(row=>{
  const billAmount=amount(row),items=itemsOf(row);
  if(items.length){
   const itemTotal=items.reduce((sum,item)=>sum+(Number(item?.line_total)||Number(item?.subtotal)||0),0);
   items.forEach(item=>{const key=categoryOf(row,item),share=itemTotal?(Number(item?.line_total)||Number(item?.subtotal)||0):billAmount/items.length;map.set(key,(map.get(key)||0)+share)})
  }else{
   const key=categoryOf(row,null);map.set(key,(map.get(key)||0)+billAmount);
  }
 });
 return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
}

function yearlyHistory(list){
 const map=new Map();
 list.forEach(row=>{const d=dateOf(row);if(!d)return;const year=d.getFullYear();map.set(year,(map.get(year)||0)+amount(row))});
 const years=[...map.keys()].sort((a,b)=>a-b);
 if(!years.length)return{labels:[new Date().getFullYear()],values:[0]};
 const min=years[0],max=years[years.length-1];
 if(min===max)return{labels:[min],values:[map.get(min)||0]};
 const start=Math.floor(min/5)*5,end=Math.ceil(max/5)*5,labels=[];
 for(let year=start;year<=end;year+=5)labels.push(year);
 if(!labels.includes(max))labels.push(max);
 return{labels,values:labels.map(year=>map.get(year)||0)};
}

function render(){
 const list=rows(),now=new Date(),monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
 const dated=list.map(row=>({row,date:dateOf(row)}));
 const total=list.reduce((sum,row)=>sum+amount(row),0);
 const monthRows=dated.filter(entry=>entry.date&&`${entry.date.getFullYear()}-${String(entry.date.getMonth()+1).padStart(2,'0')}`===monthKey).map(entry=>entry.row);
 const monthTotal=monthRows.reduce((sum,row)=>sum+amount(row),0);
 const paidRows=list.filter(row=>status(row).toLowerCase()==='paid');
 const paid=paidRows.reduce((sum,row)=>sum+amount(row),0);
 const pending=Math.max(0,total-paid);
 const suppliers=new Set(list.map(vendor).filter(Boolean));
 const productNames=new Set();list.forEach(row=>itemsOf(row).forEach(item=>{const name=text(valueOf(item,'product','description','name','item'));if(name)productNames.add(name.toLowerCase())}));
 const avg=list.length?total/list.length:0;
 const paidPct=total?Math.round(paid/total*100):0;
 const composition=categoryComposition(list),compositionTotal=composition.reduce((sum,entry)=>sum+entry[1],0)||1;
 const history=yearlyHistory(list);
 const mount=document.getElementById('content');if(!mount)return;
 mount.dataset.page='dashboard';
 mount.innerHTML=`<section class="ws-sales-dashboard"><header class="ws-sales-head"><div class="ws-sales-head-copy"><span class="ws-sales-eyebrow">Industrial procurement intelligence</span><h1>Procurement Dashboard</h1><p>Financial, supplier, product, and purchase-order performance from recorded bills.</p></div><button class="btn" type="button" data-go="new"><i class="fa-solid fa-plus"></i>New bill</button></header><section class="ws-industrial-kpis"><article class="ws-industrial-kpi"><div class="ws-kpi-top"><div class="ws-kpi-label"><small>Procurement value</small><strong>${moneyValue(total)}</strong></div><span class="ws-kpi-icon"><i class="fa-solid fa-chart-column"></i></span></div><div class="ws-kpi-sub"><div><span>This month</span><b>${moneyValue(monthTotal)}</b></div><div><span>Average bill</span><b>${moneyValue(avg)}</b></div></div></article><article class="ws-industrial-kpi"><div class="ws-kpi-top"><div class="ws-kpi-label"><small>Payment health</small><strong>${paidPct}% paid</strong></div><span class="ws-kpi-icon"><i class="fa-solid fa-wallet"></i></span></div><div class="ws-kpi-sub"><div><span>Paid value</span><b>${moneyValue(paid)}</b></div><div><span>Pending</span><b>${moneyValue(pending)}</b></div></div></article><article class="ws-industrial-kpi"><div class="ws-kpi-top"><div class="ws-kpi-label"><small>Supplier coverage</small><strong>${suppliers.size.toLocaleString()}</strong></div><span class="ws-kpi-icon"><i class="fa-solid fa-building"></i></span></div><div class="ws-kpi-sub"><div><span>Tracked products</span><b>${productNames.size.toLocaleString()}</b></div><div><span>Active this month</span><b>${new Set(monthRows.map(vendor)).size.toLocaleString()}</b></div></div></article><article class="ws-industrial-kpi"><div class="ws-kpi-top"><div class="ws-kpi-label"><small>Purchase orders</small><strong>${list.length.toLocaleString()}</strong></div><span class="ws-kpi-icon"><i class="fa-solid fa-file-invoice"></i></span></div><div class="ws-kpi-sub"><div><span>This month</span><b>${monthRows.length.toLocaleString()}</b></div><div><span>Paid orders</span><b>${paidRows.length.toLocaleString()}</b></div></div></article></section><section class="ws-industrial-grid"><article class="ws-industrial-card"><header class="ws-industrial-card-head"><div><h2>Spend Composition</h2><p>Top four procurement categories by recorded value.</p></div><span>Share</span></header>${composition.length?`<div class="ws-composition">${composition.map(([name,value])=>`<div class="ws-composition-row"><div class="ws-composition-name"><strong>${escValue(name)}</strong><small>${Math.round(value/compositionTotal*100)}% of top categories</small></div><div class="ws-composition-track"><i style="width:${Math.max(4,value/compositionTotal*100)}%"></i></div><div class="ws-composition-value">${moneyValue(value)}</div></div>`).join('')}</div>`:'<div class="ws-dashboard-empty">No category data is available yet.</div>'}</article><article class="ws-industrial-card"><header class="ws-industrial-card-head"><div><h2>Revenue History</h2><p>Procurement value by recorded year with five-year intervals.</p></div><span>MVR</span></header><div class="ws-history-body"><canvas id="wsRevenueHistory"></canvas></div></article></section></section>`;
 mount.querySelectorAll('[data-go]').forEach(button=>button.onclick=()=>window.show?.(button.dataset.go));
 if(window.Chart&&document.getElementById('wsRevenueHistory')){
  try{window.__WS_INDUSTRIAL_HISTORY__?.destroy();window.__WS_INDUSTRIAL_HISTORY__=new Chart(document.getElementById('wsRevenueHistory'),{type:'line',data:{labels:history.labels,datasets:[{data:history.values,borderColor:'#1A3C6E',backgroundColor:'rgba(245,166,35,.16)',fill:true,tension:.3,pointRadius:4,pointHoverRadius:5,pointBackgroundColor:'#F5A623',pointBorderColor:'#1A3C6E',pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,callbacks:{label:context=>moneyValue(context.raw)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#718096',font:{weight:700}}},y:{beginAtZero:true,grid:{color:'#e8edf2'},border:{display:false},ticks:{color:'#718096',callback:value=>'MVR '+Number(value).toLocaleString('en-US')}}}}})}catch(error){console.warn('[industrial-dashboard] chart unavailable',error)}
 }
 window.UI?.afterRender?.('dashboard');
}
window.renderDashboard=render;
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.dashboard=render;
console.info('[industrial-dashboard] v1 ready');
})();
