import {store,money,escapeHtml,billDate,vendor,amount,status,itemsOf,productName,itemCategory,today} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const unique=values=>[...new Set(values.filter(Boolean))];
const filterState=store.filters||(store.filters={});
filterState.dashboard||={period:'month',from:'',to:''};

const dateOnly=value=>new Date(`${value}T00:00:00`);
const iso=value=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;

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

const inRange=(row,range)=>{const date=billDate(row);return Boolean(date)&&(!range.from||date>=range.from)&&(!range.to||date<=range.to)};

function groupSpend(rows,range){
  const days=range.from&&range.to?Math.max(1,(dateOnly(range.to)-dateOnly(range.from))/86400000):9999;
  const mode=days<=45?'day':days<=730?'month':'year',map=new Map();
  rows.forEach(row=>{const date=billDate(row);if(!date)return;const key=mode==='day'?date:mode==='month'?date.slice(0,7):date.slice(0,4);map.set(key,(map.get(key)||0)+amount(row))});
  return{mode,list:[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))};
}

function formatLabel(value,mode){
  if(mode==='day')return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(dateOnly(value));
  if(mode==='month')return new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric'}).format(new Date(`${value}-01T00:00:00`));
  return value;
}

function metric(icon,label,value,meta,route='',filter=''){
  return `<article class="dashboard-metric${route?' clickable':''}" ${route?`data-route="${route}"`:''} ${filter?`data-filter="${filter}"`:''} tabindex="${route?'0':'-1'}"><span class="dashboard-metric-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><div><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(meta)}</small></div></article>`;
}

export function dashboardPage(){
  const state=filterState.dashboard,range=rangeFor(state.period,state.from,state.to);
  const rows=store.rows.filter(row=>inRange(row,range));
  const total=rows.reduce((sum,row)=>sum+amount(row),0);
  const paidRows=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pendingRows=rows.filter(row=>status(row).toLowerCase()!=='paid');
  const paidTotal=paidRows.reduce((sum,row)=>sum+amount(row),0);
  const pendingTotal=pendingRows.reduce((sum,row)=>sum+amount(row),0);
  const suppliers=unique(rows.map(vendor));
  const products=unique(rows.flatMap(row=>itemsOf(row).map(item=>productName(item,row))));
  const average=rows.length?total/rows.length:0;
  const paidRate=total?paidTotal/total*100:0;
  const recent=[...rows].sort((a,b)=>String(billDate(b)).localeCompare(String(billDate(a)))||String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,6);
  const highestPending=[...pendingRows].sort((a,b)=>amount(b)-amount(a)).slice(0,5);
  const trend=groupSpend(rows,range),trendRows=trend.list.slice(-8),maxTrend=Math.max(1,...trendRows.map(([,value])=>value));
  const categories=new Map();
  rows.forEach(row=>{const items=itemsOf(row);if(!items.length){categories.set('Other',(categories.get('Other')||0)+amount(row));return}const billTotal=amount(row),known=items.reduce((sum,item)=>sum+(Number(item.row_total)||Number(item.line_total)||Number(item.qty||item.quantity||0)*Number(item.pack_rate||item.rate||0)),0);items.forEach(item=>{const line=Number(item.row_total)||Number(item.line_total)||Number(item.qty||item.quantity||0)*Number(item.pack_rate||item.rate||0),share=known?billTotal*line/known:billTotal/items.length,key=itemCategory(item,row);categories.set(key,(categories.get(key)||0)+share)})});
  const topCategories=[...categories.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),maxCategory=Math.max(1,...topCategories.map(([,value])=>value));

  content().innerHTML=`
    <header class="page-head dashboard-head">
      <div><h1>Procurement Dashboard</h1><p>What needs attention and how purchasing is performing for ${escapeHtml(range.label)}.</p></div>
      <div class="actions"><button class="btn dashboard-add" data-route="new" type="button"><i class="fa-solid fa-plus"></i> Add Bill</button></div>
    </header>

    <section class="dashboard-commandbar">
      <label>Period<select id="dashPeriod"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="threeMonths">Last 3 Months</option><option value="year">This Year</option><option value="custom">Custom Range</option><option value="all">All Time</option></select></label>
      <label class="custom-date">From<input id="dashFrom" type="date" value="${escapeHtml(state.from)}"></label>
      <label class="custom-date">To<input id="dashTo" type="date" value="${escapeHtml(state.to)}"></label>
      <div class="dashboard-period-summary"><span>${rows.length.toLocaleString()} bills</span><strong>${escapeHtml(range.from||'First record')} → ${escapeHtml(range.to||'Latest record')}</strong></div>
    </section>

    <section class="dashboard-metrics">
      ${metric('fa-wallet','Spend',money(total),`${rows.length} bills`,'bills')}
      ${metric('fa-file-invoice','Bills',rows.length.toLocaleString(),`${money(average)} average`,'bills')}
      ${metric('fa-clock','Pending',money(pendingTotal),`${pendingRows.length} bills`,'bills','Pending')}
      ${metric('fa-building','Suppliers',suppliers.length.toLocaleString(),`${products.length} products`,'vendors')}
      ${metric('fa-circle-check','Paid share',`${paidRate.toFixed(1)}%`,money(paidTotal),'bills','Paid')}
    </section>

    <section class="dashboard-primary-grid">
      <article class="card dashboard-panel dashboard-recent">
        <header class="card-head"><div><h2>Recent bills</h2><small>Latest purchases in this period</small></div><button class="btn secondary small" data-route="bills" type="button">View all</button></header>
        <div class="dashboard-record-list">${recent.map(row=>`<button class="dashboard-record" data-route="bills" type="button"><span class="dashboard-record-main"><strong>${escapeHtml(vendor(row))}</strong><small>${escapeHtml(billDate(row)||'No date')} · ${itemsOf(row).length||1} item${itemsOf(row).length===1?'':'s'}</small></span><span class="dashboard-record-side"><strong>${money(amount(row))}</strong><small class="dashboard-status ${status(row).toLowerCase()==='paid'?'paid':'pending'}">${escapeHtml(status(row))}</small></span></button>`).join('')||'<div class="empty">No bills in this period.</div>'}</div>
      </article>

      <article class="card dashboard-panel dashboard-attention">
        <header class="card-head"><div><h2>Needs attention</h2><small>Largest pending payments</small></div></header>
        <div class="dashboard-record-list">${highestPending.map(row=>`<button class="dashboard-record" data-route="bills" data-filter="Pending" type="button"><span class="dashboard-record-main"><strong>${escapeHtml(vendor(row))}</strong><small>${escapeHtml(billDate(row)||'No date')}</small></span><span class="dashboard-record-side"><strong>${money(amount(row))}</strong><small class="dashboard-status pending">Pending</small></span></button>`).join('')||'<div class="dashboard-clear"><i class="fa-solid fa-circle-check"></i><strong>No pending bills</strong><small>Everything in this period is marked paid.</small></div>'}</div>
      </article>
    </section>

    <section class="dashboard-secondary-grid">
      <article class="card dashboard-panel">
        <header class="card-head"><div><h2>Spend trend</h2><small>${trend.mode==='day'?'Daily':trend.mode==='month'?'Monthly':'Yearly'} purchasing movement</small></div></header>
        <div class="card-body dashboard-trend">${trendRows.map(([label,value])=>`<div class="dashboard-trend-row"><span>${escapeHtml(formatLabel(label,trend.mode))}</span><div class="dashboard-trend-track"><i style="width:${Math.max(3,value/maxTrend*100)}%"></i></div><strong>${money(value)}</strong></div>`).join('')||'<div class="empty">No spending recorded.</div>'}</div>
      </article>

      <article class="card dashboard-panel">
        <header class="card-head"><div><h2>Spend by category</h2><small>Where procurement value is concentrated</small></div></header>
        <div class="card-body dashboard-categories">${topCategories.map(([label,value])=>`<div class="dashboard-category"><div><strong>${escapeHtml(label)}</strong><span>${total?(value/total*100).toFixed(1):'0.0'}%</span></div><div class="dashboard-category-track"><i style="width:${Math.max(3,value/maxCategory*100)}%"></i></div><small>${money(value)}</small></div>`).join('')||'<div class="empty">No category data.</div>'}</div>
      </article>
    </section>`;

  $('#dashPeriod').value=state.period;
  const custom=()=>document.querySelectorAll('.custom-date').forEach(element=>element.hidden=$('#dashPeriod').value!=='custom');
  custom();
  $('#dashPeriod').onchange=event=>{state.period=event.target.value;dashboardPage()};
  $('#dashFrom').onchange=event=>{state.from=event.target.value;if(state.period==='custom')dashboardPage()};
  $('#dashTo').onchange=event=>{state.to=event.target.value;if(state.period==='custom')dashboardPage()};
  content().querySelectorAll('[data-route]').forEach(element=>{element.onclick=()=>{if(element.dataset.filter){store.filters.bills||={};store.filters.bills.status=element.dataset.filter}location.hash=`#${element.dataset.route}`}});
}
