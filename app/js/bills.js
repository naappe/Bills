import {store,money,escapeHtml,text,number,billDate,vendor,amount,billNo,productOf,itemOf,get} from './store.js';
import {deleteBill} from './data.js';

const $=s=>document.querySelector(s);
const unique=a=>[...new Set(a.filter(Boolean))];
const dateOnly=d=>new Date(`${d}T00:00:00`);
const today=()=>new Date().toISOString().slice(0,10);
const iso=d=>d.toISOString().slice(0,10);
const filterState=store.filters||(store.filters={});
filterState.bills ||= {period:'month',query:'',vendor:'',from:'',to:'',pageSize:20};

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
function inRange(row,range){const d=billDate(row);return !!d&&(!range.from||d>=range.from)&&(!range.to||d<=range.to)}
function canEdit(row){if(store.role==='admin')return true;const t=new Date(get(row,'created_at','updated_at')).getTime();return Number.isFinite(t)&&Date.now()-t<=86400000}
function formatDateTime(value){const raw=String(value||'');return raw?raw.slice(0,16).replace('T',' '):'Not recorded'}
function recordNumber(row){
  const id=String(row.id??'').trim();
  if(/^\d+$/.test(id))return Number(id).toLocaleString('en-US');
  let hash=0;for(const ch of id)hash=(hash*31+ch.charCodeAt(0))>>>0;
  return hash?String(hash).padStart(8,'0').slice(-8):'—';
}

export function billsPage(){
  const state=filterState.bills;
  const all=[...store.rows].sort((a,b)=>String(get(b,'created_at')||billDate(b)).localeCompare(String(get(a,'created_at')||billDate(a))));
  store.pageSize=number(state.pageSize)||20;
  $('#content').innerHTML=`<header class="page-head"><div><h1>Bills</h1><p>Search, review and manage supplier purchases.</p></div><div class="actions"><button class="btn" data-route="new">+ New Bill</button></div></header>
  <section class="bills-toolbar"><input id="billSearch" placeholder="Search #, bill number, description, product or vendor" value="${escapeHtml(state.query||'')}"><select id="billPeriod"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="threeMonths">Last 3 Months</option><option value="year">This Year</option><option value="custom">Custom Range</option><option value="all">All Time</option></select><select id="billVendor"><option value="">All vendors</option>${unique(all.map(vendor)).sort().map(v=>`<option ${state.vendor===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select><label class="bill-custom">From<input id="billFrom" type="date" value="${escapeHtml(state.from||'')}"></label><label class="bill-custom">To<input id="billTo" type="date" value="${escapeHtml(state.to||'')}"></label><select id="billPageSize"><option value="20">20 rows</option><option value="50">50 rows</option></select></section>
  <section class="card"><div class="table-wrap"><table class="table bills-table"><thead><tr><th>#</th><th>Bill Date</th><th>Description</th><th>Product / Pack</th><th>Vendor</th><th class="num">Amount</th><th>Created</th><th class="action-col">Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><footer class="pager"><span id="pageMeta"></span><div class="actions"><button class="btn secondary small" id="prevPage">Previous</button><button class="btn secondary small" id="nextPage">Next</button></div></footer></section>`;

  $('#billPeriod').value=state.period||'month';$('#billPageSize').value=String(state.pageSize||20);
  const custom=()=>document.querySelectorAll('.bill-custom').forEach(x=>x.hidden=$('#billPeriod').value!=='custom');custom();
  const draw=()=>{
    const range=rangeFor(state.period,state.from,state.to),q=String(state.query||'').trim().toLowerCase();
    const filtered=all.filter(r=>{const i=itemOf(r),description=text(get(r,'notes','description'))||text(get(i,'description')),pack=text(get(i,'pack_format','packing')),hay=[recordNumber(r),billNo(r),description,productOf(r),pack,vendor(r)].join(' ').toLowerCase();return inRange(r,range)&&(!q||hay.includes(q))&&(!state.vendor||vendor(r)===state.vendor)});
    const pages=Math.max(1,Math.ceil(filtered.length/store.pageSize));store.page=Math.min(Math.max(1,store.page||1),pages);const start=(store.page-1)*store.pageSize,slice=filtered.slice(start,start+store.pageSize);
    $('#billRows').innerHTML=slice.map(r=>{const i=itemOf(r),pack=text(get(i,'pack_format','packing')),unit=text(get(i,'unit')),qty=number(get(i,'qty','quantity')),description=text(get(r,'notes','description'))||text(get(i,'description'))||'No description',edited=formatDateTime(get(r,'updated_at')),created=formatDateTime(get(r,'created_at'));return `<tr><td><strong>${escapeHtml(recordNumber(r))}</strong><small class="cell-meta">${escapeHtml(billNo(r)==='—'?'No bill number':billNo(r))}</small></td><td><strong>${escapeHtml(billDate(r)||'No date')}</strong><small class="cell-meta">Last edit: ${escapeHtml(edited)}</small></td><td>${escapeHtml(description)}</td><td><strong>${escapeHtml(productOf(r))}</strong><small class="cell-meta">${escapeHtml([pack,unit,qty?`Qty ${qty}`:''].filter(Boolean).join(' · '))}</small></td><td><strong>${escapeHtml(vendor(r))}</strong></td><td class="num"><strong>${money(amount(r))}</strong></td><td>${escapeHtml(created)}</td><td class="action-col"><div class="actions">${canEdit(r)?`<button class="btn secondary small" data-edit="${r.id}">Edit</button>`:'<span class="locked">Locked</span>'}${store.role==='admin'?`<button class="btn danger small" data-delete="${r.id}">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="8" class="empty">No bills match these filters.</td></tr>';
    $('#pageMeta').textContent=`${filtered.length?start+1:0}–${Math.min(start+store.pageSize,filtered.length)} of ${filtered.length} · ${range.label}`;$('#prevPage').disabled=store.page<=1;$('#nextPage').disabled=store.page>=pages;
    document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{store.editing=all.find(r=>String(r.id)===String(x.dataset.edit));location.hash='#new'});
    document.querySelectorAll('[data-delete]').forEach(x=>x.onclick=async()=>{if(confirm('Delete this bill?')){await deleteBill(x.dataset.delete);billsPage()}});
  };
  const refresh=()=>{store.page=1;draw()};
  $('#billSearch').oninput=e=>{state.query=e.target.value;if(state.query.trim()){state.period='all';$('#billPeriod').value='all';custom()}refresh()};
  $('#billPeriod').onchange=e=>{state.period=e.target.value;custom();refresh()};$('#billVendor').onchange=e=>{state.vendor=e.target.value;refresh()};$('#billFrom').onchange=e=>{state.from=e.target.value;if(state.period==='custom')refresh()};$('#billTo').onchange=e=>{state.to=e.target.value;if(state.period==='custom')refresh()};$('#billPageSize').onchange=e=>{state.pageSize=number(e.target.value);store.pageSize=state.pageSize;refresh()};$('#prevPage').onclick=()=>{store.page--;draw()};$('#nextPage').onclick=()=>{store.page++;draw()};
  document.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>location.hash=`#${el.dataset.route}`);draw();
}