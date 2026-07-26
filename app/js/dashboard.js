import {store,money,escapeHtml,text,billDate,vendor,amount,status,productOf,itemOf,get} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>today().slice(0,7);
const unique=values=>[...new Set(values.filter(Boolean))];
const filterState=store.filters||(store.filters={});
filterState.dashboard||={period:'month',from:'',to:''};

function dateOnly(value){return new Date(`${value}T00:00:00`)}
function iso(value){return value.toISOString().slice(0,10)}
function rangeFor(period,from='',to=''){
  const now=dateOnly(today()),start=new Date(now),end=new Date(now);
  if(period==='today')return{from:today(),to:today(),label:'Today'};
  if(period==='week'){start.setDate(now.getDate()-((now.getDay()+6)%7));return{from:iso(start),to:today(),label:'This Week'}}
  if(period==='month')return{from:`${month()}-01`,to:today(),label:'This Month'};
  if(period==='lastMonth'){start.setDate(1);start.setMonth(start.getMonth()-1);end.setDate(0);return{from:iso(start),to:iso(end),label:'Last Month'}}
  if(period==='threeMonths'){start.setMonth(start.getMonth()-2);start.setDate(1);return{from:iso(start),to:today(),label:'Last 3 Months'}}
  if(period==='year')return{from:`${today().slice(0,4)}-01-01`,to:today(),label:'This Year'};
  if(period==='custom')return{from,to,label:'Custom Range'};
  return{from:'',to:'',label:'All Time'};
}
function inRange(row,range){const date=billDate(row);return Boolean(date)&&(!range.from||date>=range.from)&&(!range.to||date<=range.to)}
function groupSpend(rows,range){
  const days=range.from&&range.to?Math.max(1,(dateOnly(range.to)-dateOnly(range.from))/86400000):9999;
  const mode=days<=45?'day':days<=730?'month':'year',map=new Map();
  rows.forEach(row=>{const date=billDate(row);if(!date)return;const key=mode==='day'?date:mode==='month'?date.slice(0,7):date.slice(0,4);map.set(key,(map.get(key)||0)+amount(row))});
  return{mode,list:[...map.entries()].filter(([,value])=>value>0).sort((a,b)=>a[0].localeCompare(b[0]))};
}
function formatPeriodLabel(value,mode){
  if(mode==='day'){const date=dateOnly(value);return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(date)}
  if(mode==='month'){const date=new Date(`${value}-01T00:00:00`);return new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric'}).format(date)}
  return value;
}
function kpi(label,value,meta,route='',filter=''){return`<article class="kpi${route?' clickable':''}" ${route?`data-route="${route}"`:''} ${filter?`data-filter="${filter}"`:''} tabindex="${route?'0':'-1'}"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(meta)}</small></article>`}
function bindRoutes(){content().querySelectorAll('[data-route]').forEach(element=>{const go=()=>{if(element.dataset.filter){store.filters.bills||={};store.filters.bills.status=element.dataset.filter}location.hash=`#${element.dataset.route}`};element.onclick=go;element.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();go()}}})}

export function dashboardPage(){
  const state=filterState.dashboard,range=rangeFor(state.period,state.from,state.to),rows=store.rows.filter(row=>inRange(row,range));
  const total=rows.reduce((sum,row)=>sum+amount(row),0),paidRows=rows.filter(row=>status(row).toLowerCase()==='paid'),pendingRows=rows.filter(row=>status(row).toLowerCase()!=='paid');
  const paidTotal=paidRows.reduce((sum,row)=>sum+amount(row),0),pendingTotal=pendingRows.reduce((sum,row)=>sum+amount(row),0);
  const supplierCount=unique(rows.map(vendor)).length,productCount=unique(rows.map(productOf)).length;
  const trend=groupSpend(rows,range),ranked=[...trend.list].sort((a,b)=>b[1]-a[1]);
  const topDays=ranked.slice(0,6),peak=topDays[0]||['—',0],averageBill=rows.length?total/rows.length:0,paidRate=total?paidTotal/total*100:0,maxSpend=Math.max(1,...topDays.map(([,value])=>value));
  const categories=new Map();rows.forEach(row=>{const category=text(get(itemOf(row),'category')||get(row,'category'))||'Other';categories.set(category,(categories.get(category)||0)+amount(row))});
  const topCategories=[...categories.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);

  content().innerHTML=`<header class="page-head"><div><h1>Procurement Dashboard</h1><p>Clear purchasing overview for ${escapeHtml(range.label)}.</p></div><div class="actions"><button class="btn" data-route="new">+ New Bill</button></div></header>
  <section class="date-toolbar dashboard-filter"><label>Period<select id="dashPeriod"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="threeMonths">Last 3 Months</option><option value="year">This Year</option><option value="custom">Custom Range</option><option value="all">All Time</option></select></label><label class="custom-date">From<input id="dashFrom" type="date" value="${escapeHtml(state.from)}"></label><label class="custom-date">To<input id="dashTo" type="date" value="${escapeHtml(state.to)}"></label><div class="range-summary"><span>${rows.length.toLocaleString()} records</span><strong>${escapeHtml(range.from||'First record')} → ${escapeHtml(range.to||'Latest record')}</strong></div></section>
  <section class="grid-4">${kpi('Procurement value',money(total),`${rows.length} records`,'bills')}${kpi('Paid amount',money(paidTotal),`${paidRows.length} paid records`,'bills','Paid')}${kpi('Pending amount',money(pendingTotal),`${pendingRows.length} pending records`,'bills','Pending')}${kpi('Supplier coverage',supplierCount.toLocaleString(),`${productCount} tracked products`,'vendors')}</section>
  <section class="dashboard-insights"><article><span>Highest spend</span><strong>${money(peak[1])}</strong><small>${peak[1]?formatPeriodLabel(peak[0],trend.mode):'No spending recorded'}</small></article><article><span>Average per record</span><strong>${money(averageBill)}</strong><small>Across ${rows.length.toLocaleString()} records</small></article><article><span>Paid share</span><strong>${paidRate.toFixed(1)}%</strong><small>${money(paidTotal)} paid</small></article></section>
  <section class="dashboard-analysis"><article class="card dashboard-chart-card"><header class="card-head"><div><h2>Top spending periods</h2><small>Highest ${trend.mode==='day'?'days':trend.mode==='month'?'months':'years'} only — zero-value dates removed</small></div></header><div class="card-body dashboard-bars">${topDays.map(([label,value],index)=>`<div class="dashboard-bar-row"><span class="dashboard-rank">${index+1}</span><div class="dashboard-bar-copy"><strong>${escapeHtml(formatPeriodLabel(label,trend.mode))}</strong><small>${((value/Math.max(total,1))*100).toFixed(1)}% of selected spend</small></div><div class="dashboard-track" aria-label="${escapeHtml(formatPeriodLabel(label,trend.mode))}: ${money(value)}"><span style="width:${Math.max(3,value/maxSpend*100)}%"></span></div><strong class="dashboard-amount">${money(value)}</strong></div>`).join('')||'<div class="empty">No spending recorded in this period.</div>'}</div></article>
  <article class="card dashboard-category-card"><header class="card-head"><div><h2>Where the money went</h2><small>Top categories by share</small></div></header><div class="card-body category-list">${topCategories.map(([label,value])=>`<div class="category-row"><div><strong>${escapeHtml(label)}</strong><small>${((value/Math.max(total,1))*100).toFixed(1)}% of total</small></div><strong>${money(value)}</strong><div class="category-track"><span style="width:${value/Math.max(topCategories[0]?.[1]||1,1)*100}%"></span></div></div>`).join('')||'<div class="empty">No category data in this period.</div>'}</div></article></section>`;

  $('#dashPeriod').value=state.period;
  const custom=()=>document.querySelectorAll('.custom-date').forEach(element=>element.hidden=$('#dashPeriod').value!=='custom');
  custom();
  $('#dashPeriod').onchange=event=>{state.period=event.target.value;custom();dashboardPage()};
  $('#dashFrom').onchange=event=>{state.from=event.target.value;if(state.period==='custom')dashboardPage()};
  $('#dashTo').onchange=event=>{state.to=event.target.value;if(state.period==='custom')dashboardPage()};
  bindRoutes();
}
