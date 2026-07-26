import {store,money,escapeHtml,text,number,billDate,vendor,amount,status,productOf,itemOf,get} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const unique=values=>[...new Set(values.filter(Boolean))];
const today=()=>new Date().toISOString().slice(0,10);
const dateOnly=value=>new Date(`${value}T00:00:00`);
const iso=date=>date.toISOString().slice(0,10);
const state=store.reportFilters||(store.reportFilters={period:'year',from:'',to:'',vendor:'',category:'',status:''});

function header(){return `<header class="page-head"><div><h1>Reports</h1><p>Management analytics for procurement spend, suppliers, products and payment health.</p></div><div class="actions"><button class="btn secondary" id="printReport"><i class="fa-solid fa-print"></i> Print</button><button class="btn" id="exportReport"><i class="fa-solid fa-file-csv"></i> Export CSV</button></div></header>`}
function kpi(label,value,meta=''){return `<article class="kpi"><span>${escapeHtml(label)}</span><strong>${value}</strong>${meta?`<small>${escapeHtml(meta)}</small>`:''}</article>`}
function categoryOf(row){return text(get(itemOf(row),'category')||get(row,'category'))||'Other'}
function rangeFor(period,from='',to=''){
  const now=dateOnly(today()),start=new Date(now),end=new Date(now);
  if(period==='today')return{from:today(),to:today(),label:'Today'};
  if(period==='week'){start.setDate(now.getDate()-((now.getDay()+6)%7));return{from:iso(start),to:today(),label:'This Week'}}
  if(period==='month')return{from:`${today().slice(0,7)}-01`,to:today(),label:'This Month'};
  if(period==='lastMonth'){start.setDate(1);start.setMonth(start.getMonth()-1);end.setDate(0);return{from:iso(start),to:iso(end),label:'Last Month'}}
  if(period==='threeMonths'){start.setMonth(start.getMonth()-2);start.setDate(1);return{from:iso(start),to:today(),label:'Last 3 Months'}}
  if(period==='year')return{from:`${today().slice(0,4)}-01-01`,to:today(),label:'This Year'};
  if(period==='custom')return{from,to,label:'Custom Range'};
  return{from:'',to:'',label:'All Time'};
}
function inRange(row,range){const date=billDate(row);return !!date&&(!range.from||date>=range.from)&&(!range.to||date<=range.to)}
function aggregate(rows,keyFn){const map=new Map();rows.forEach(row=>{const key=keyFn(row)||'Unknown';if(!map.has(key))map.set(key,{name:key,value:0,count:0});const item=map.get(key);item.value+=amount(row);item.count++});return[...map.values()].sort((a,b)=>b.value-a.value)}
function monthKey(row){return billDate(row).slice(0,7)||'Unknown'}
function csvCell(value){const string=String(value??'');return /[",\n]/.test(string)?`"${string.replace(/"/g,'""')}"`:string}

export function reportsPage(){
  const range=rangeFor(state.period,state.from,state.to);
  const all=store.rows.filter(row=>inRange(row,range));
  const vendors=unique(store.rows.map(vendor)).sort();
  const categories=unique(store.rows.map(categoryOf)).sort();
  const rows=all.filter(row=>(!state.vendor||vendor(row)===state.vendor)&&(!state.category||categoryOf(row)===state.category)&&(!state.status||status(row).toLowerCase()===state.status.toLowerCase()));
  const total=rows.reduce((sum,row)=>sum+amount(row),0);
  const paidRows=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pendingRows=rows.filter(row=>status(row).toLowerCase()!=='paid');
  const paid=paidRows.reduce((sum,row)=>sum+amount(row),0);
  const pending=pendingRows.reduce((sum,row)=>sum+amount(row),0);
  const average=rows.length?total/rows.length:0;
  const vendorData=aggregate(rows,vendor).slice(0,10);
  const categoryData=aggregate(rows,categoryOf).slice(0,10);
  const productData=aggregate(rows,productOf).slice(0,10);
  const monthData=aggregate(rows,monthKey).sort((a,b)=>a.name.localeCompare(b.name));
  const maxMonth=Math.max(1,...monthData.map(item=>item.value));
  const maxVendor=Math.max(1,...vendorData.map(item=>item.value));
  const maxCategory=Math.max(1,...categoryData.map(item=>item.value));
  const paidPct=total?paid/total*100:0;

  content().innerHTML=`${header()}
  <section class="report-toolbar">
    <label>Period<select id="reportPeriod"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="threeMonths">Last 3 Months</option><option value="year">This Year</option><option value="custom">Custom Range</option><option value="all">All Time</option></select></label>
    <label class="report-custom">From<input id="reportFrom" type="date" value="${escapeHtml(state.from)}"></label>
    <label class="report-custom">To<input id="reportTo" type="date" value="${escapeHtml(state.to)}"></label>
    <label>Vendor<select id="reportVendor"><option value="">All vendors</option>${vendors.map(name=>`<option ${state.vendor===name?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></label>
    <label>Category<select id="reportCategory"><option value="">All categories</option>${categories.map(name=>`<option ${state.category===name?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></label>
    <label>Payment<select id="reportStatus"><option value="">All statuses</option><option ${state.status==='Paid'?'selected':''}>Paid</option><option ${state.status==='Pending'?'selected':''}>Pending</option></select></label>
    <div class="report-range"><span>${rows.length.toLocaleString()} records</span><strong>${escapeHtml(range.label)}</strong><small>${escapeHtml(range.from||'First record')} → ${escapeHtml(range.to||'Latest record')}</small></div>
  </section>
  <section class="grid-4">${kpi('Procurement value',money(total),`${rows.length} records`)}${kpi('Paid',money(paid),`${paidPct.toFixed(1)}% of spend`)}${kpi('Pending',money(pending),`${pendingRows.length} records`)}${kpi('Average bill',money(average),`${unique(rows.map(vendor)).length} suppliers`)}</section>
  <section class="report-grid">
    <article class="card report-wide"><header class="card-head"><div><h2>Spend trend</h2><small>Monthly procurement value</small></div></header><div class="card-body report-bars">${monthData.map(item=>`<div class="report-bar"><span>${escapeHtml(item.name)}</span><div class="track"><span style="width:${item.value/maxMonth*100}%"></span></div><strong>${money(item.value)}</strong><small>${item.count} records</small></div>`).join('')||'<div class="empty">No dated records match the selected filters.</div>'}</div></article>
    <article class="card"><header class="card-head"><div><h2>Payment health</h2><small>Paid versus pending</small></div></header><div class="card-body"><div class="payment-ring" style="--paid:${paidPct.toFixed(1)}"><div><strong>${paidPct.toFixed(1)}%</strong><span>paid</span></div></div><div class="payment-legend"><div><span>Paid</span><strong>${money(paid)}</strong></div><div><span>Pending</span><strong>${money(pending)}</strong></div></div></div></article>
    <article class="card"><header class="card-head"><div><h2>Top suppliers</h2><small>Ranked by spend</small></div></header><div class="card-body report-list">${vendorData.map((item,index)=>`<div><b>${index+1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${item.count} records</small></span><em>${money(item.value)}</em><i style="width:${item.value/maxVendor*100}%"></i></div>`).join('')||'<div class="empty">No supplier data.</div>'}</div></article>
    <article class="card"><header class="card-head"><div><h2>Category spend</h2><small>Largest procurement categories</small></div></header><div class="card-body report-list">${categoryData.map((item,index)=>`<div><b>${index+1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${item.count} records</small></span><em>${money(item.value)}</em><i style="width:${item.value/maxCategory*100}%"></i></div>`).join('')||'<div class="empty">No category data.</div>'}</div></article>
    <article class="card report-wide"><header class="card-head"><div><h2>Top purchased products</h2><small>Products ranked by recorded procurement value</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Rank</th><th>Product</th><th>Records</th><th>Share</th><th class="num">Spend</th></tr></thead><tbody>${productData.map((item,index)=>`<tr><td>${index+1}</td><td><strong>${escapeHtml(item.name)}</strong></td><td>${item.count}</td><td>${total?(item.value/total*100).toFixed(1):'0.0'}%</td><td class="num"><strong>${money(item.value)}</strong></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No product data.</td></tr>'}</tbody></table></div></article>
  </section>`;

  $('#reportPeriod').value=state.period;
  const showCustom=()=>document.querySelectorAll('.report-custom').forEach(element=>element.hidden=$('#reportPeriod').value!=='custom');
  showCustom();
  $('#reportPeriod').onchange=event=>{state.period=event.target.value;showCustom();reportsPage()};
  $('#reportFrom').onchange=event=>{state.from=event.target.value;if(state.period==='custom')reportsPage()};
  $('#reportTo').onchange=event=>{state.to=event.target.value;if(state.period==='custom')reportsPage()};
  $('#reportVendor').onchange=event=>{state.vendor=event.target.value;reportsPage()};
  $('#reportCategory').onchange=event=>{state.category=event.target.value;reportsPage()};
  $('#reportStatus').onchange=event=>{state.status=event.target.value;reportsPage()};
  $('#printReport').onclick=()=>window.print();
  $('#exportReport').onclick=()=>{
    const headings=['Bill Date','Bill No','Vendor','Product','Category','Payment Status','Amount'];
    const lines=[headings,...rows.map(row=>[billDate(row),get(row,'bill_no','Bill No'),vendor(row),productOf(row),categoryOf(row),status(row),amount(row).toFixed(2)])];
    const blob=new Blob([lines.map(line=>line.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`white-saffron-report-${range.from||'all'}-${range.to||'latest'}.csv`;link.click();URL.revokeObjectURL(link.href);
  };
}
