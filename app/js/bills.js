import {store,money,escapeHtml,text,number,billDate,vendor,amount,billNo,itemOf,get} from './store.js';
import {deleteBill} from './data.js';

const $=selector=>document.querySelector(selector);
const unique=values=>[...new Set(values.filter(Boolean))];
const localISO=(value=new Date())=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
const today=()=>localISO();
const dateOnly=value=>new Date(`${value}T00:00:00`);
const iso=value=>localISO(value);
const filterState=store.filters||(store.filters={});
filterState.bills||={period:'month',query:'',vendor:'',from:'',to:'',pageSize:20};
let indexCache={revision:-1,rows:[]};

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

function inRange(entry,range){return Boolean(entry.date)&&(!range.from||entry.date>=range.from)&&(!range.to||entry.date<=range.to)}
function canEdit(row){if(store.role==='admin')return true;const time=new Date(get(row,'created_at','updated_at')).getTime();return Number.isFinite(time)&&Date.now()-time<=86400000}
function formatDateTime(value){const raw=String(value||'');return raw?raw.slice(0,16).replace('T',' '):'Not recorded'}
function recordNumber(row){const id=String(row.id??'').trim();if(/^\d+$/.test(id))return Number(id).toLocaleString('en-US');let hash=0;for(const character of id)hash=(hash*31+character.charCodeAt(0))>>>0;return hash?String(hash).padStart(8,'0').slice(-8):'—'}
function itemsOf(row){return Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean)}
function itemName(item){return text(get(item,'description','product','name'))||'Unnamed item'}
function itemMeta(item){const pack=text(get(item,'pack_format','packing')),unit=text(get(item,'unit')),qty=number(get(item,'qty','quantity'));return[pack,unit,qty?`Qty ${qty}`:''].filter(Boolean).join(' · ')}
function lineTotal(item){const saved=number(get(item,'row_total','line_total','total'));return saved||number(get(item,'qty','quantity'))*number(get(item,'pack_rate','rate','price'))}

function indexedRows(){
  if(indexCache.revision===store.dataRevision)return indexCache.rows;
  const rows=store.rows.map(row=>{
    const items=itemsOf(row),numberLabel=recordNumber(row),vendorName=vendor(row),itemSearch=items.flatMap(item=>[itemName(item),itemMeta(item)]).join(' ');
    return{row,items,numberLabel,vendorName,date:billDate(row),search:[numberLabel,billNo(row),itemSearch,vendorName,get(row,'notes','category')].join(' ').toLowerCase()};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(get(b.row,'created_at')).localeCompare(String(get(a.row,'created_at'))));
  indexCache={revision:store.dataRevision,rows};
  return rows;
}

function showBill(entry){
  if(!entry)return;
  const {row,items,numberLabel,vendorName}=entry;
  const subtotal=items.reduce((sum,item)=>sum+lineTotal(item),0);
  const gst=items.reduce((sum,item)=>sum+lineTotal(item)*number(get(item,'gst','gst_rate'))/100,0);
  const total=amount(row)||subtotal+gst;
  const created=formatDateTime(get(row,'created_at'));
  const updated=formatDateTime(get(row,'updated_at'));
  const modal=document.createElement('div');
  modal.className='modal bill-view-modal';
  modal.innerHTML=`<section class="modal-card bill-view-card"><header class="bill-view-head"><div><span class="bill-view-kicker">Supplier bill</span><h2>${escapeHtml(vendorName)}</h2><p>${escapeHtml(entry.date||'No bill date')} · ${escapeHtml(billNo(row)==='—'?'No bill number':`Bill ${billNo(row)}`)}</p></div><button class="btn secondary small" data-close type="button"><i class="fa-solid fa-xmark"></i> Close</button></header><div class="bill-view-summary"><div><span>Record</span><strong>#${escapeHtml(numberLabel)}</strong></div><div><span>Items</span><strong>${items.length}</strong></div><div><span>Status</span><strong>${escapeHtml(text(get(row,'payment_status','status'))||'Not recorded')}</strong></div><div><span>Total</span><strong>${money(total)}</strong></div></div><div class="bill-view-body"><div class="bill-audit"><span>Created ${escapeHtml(created)}</span><span>Last edited ${escapeHtml(updated)}</span></div><div class="table-wrap"><table class="table bill-detail-table"><thead><tr><th>Item</th><th>Pack</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">GST</th><th class="num">Total</th></tr></thead><tbody>${items.map(item=>{const qty=number(get(item,'qty','quantity')),rate=number(get(item,'pack_rate','rate','price')),gstRate=number(get(item,'gst','gst_rate')),line=lineTotal(item);return`<tr><td><strong>${escapeHtml(itemName(item))}</strong></td><td>${escapeHtml(text(get(item,'pack_format','packing'))||text(get(item,'unit'))||'—')}</td><td class="num">${qty||'—'}</td><td class="num">${rate?money(rate):'—'}</td><td class="num">${gstRate?`${gstRate}%`:'—'}</td><td class="num"><strong>${money(line+line*gstRate/100)}</strong></td></tr>`}).join('')}</tbody></table></div><div class="bill-view-footer"><div class="bill-notes"><span>Notes</span><p>${escapeHtml(text(get(row,'notes'))||'No notes recorded.')}</p></div><div class="bill-totals"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>GST</span><strong>${money(gst)}</strong></div><div class="grand"><span>Total due</span><strong>${money(total)}</strong></div></div></div></div><footer class="bill-view-actions">${canEdit(row)?'<button class="btn secondary" data-edit-modal type="button"><i class="fa-solid fa-pen"></i> Edit bill</button>':''}<button class="btn" data-close type="button">Done</button></footer></section>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelectorAll('[data-close]').forEach(button=>button.onclick=close);
  modal.onclick=event=>{if(event.target===modal)close()};
  modal.querySelector('[data-edit-modal]')?.addEventListener('click',()=>{store.editing=row;close();location.hash='#new'});
}

function installBillStyles(){
  if($('#billViewStyles'))return;
  const style=document.createElement('style');
  style.id='billViewStyles';
  style.textContent=`.bill-row-click{cursor:pointer}.bill-row-click:hover{background:color-mix(in srgb,var(--brand-navy) 4%,var(--surface))}.bill-items-summary{display:flex;align-items:center;gap:10px}.bill-items-summary i{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--surface-muted);color:var(--brand-navy)}.bill-items-summary strong,.bill-items-summary small{display:block}.bills-toolbar-actions{display:flex;justify-content:flex-end;grid-column:1/-1}.bill-view-card{width:min(980px,96vw);max-height:92vh;overflow:auto}.bill-view-head{display:flex;justify-content:space-between;gap:20px;padding:24px 26px;border-bottom:1px solid var(--border)}.bill-view-head h2{margin:3px 0 4px;font-size:26px}.bill-view-head p{margin:0;color:var(--text-muted)}.bill-view-kicker{color:var(--brand-navy);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.bill-view-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 26px;background:var(--surface-muted)}.bill-view-summary div{padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.bill-view-summary span,.bill-notes span,.bill-totals span{display:block;color:var(--text-muted);font-size:11px;font-weight:800;text-transform:uppercase}.bill-view-summary strong{display:block;margin-top:5px;font-size:17px}.bill-view-body{padding:22px 26px}.bill-audit{display:flex;justify-content:flex-end;gap:16px;margin-bottom:12px;color:var(--text-muted);font-size:11px}.bill-detail-table td{vertical-align:middle}.bill-view-footer{display:grid;grid-template-columns:1fr minmax(260px,340px);gap:24px;margin-top:20px}.bill-notes,.bill-totals{padding:18px;border:1px solid var(--border);border-radius:16px}.bill-notes p{margin:8px 0 0;color:var(--text-muted)}.bill-totals div{display:flex;justify-content:space-between;gap:20px;padding:8px 0}.bill-totals .grand{margin-top:6px;padding-top:14px;border-top:1px solid var(--border)}.bill-totals .grand strong{font-size:20px;color:var(--brand-navy)}.bill-view-actions{display:flex;justify-content:flex-end;gap:10px;padding:18px 26px;border-top:1px solid var(--border)}@media(max-width:700px){.bill-view-summary{grid-template-columns:repeat(2,1fr)}.bill-view-footer{grid-template-columns:1fr}.bill-view-head{padding:18px}.bill-view-body{padding:16px}.bill-view-actions{padding:16px}.bill-audit{justify-content:flex-start;flex-direction:column;gap:3px}}`;
  document.head.appendChild(style);
}

export function billsPage(){
  installBillStyles();
  const state=filterState.bills,all=indexedRows();
  store.pageSize=number(state.pageSize)||20;
  $('#content').innerHTML=`<section class="bills-toolbar"><div class="bills-toolbar-actions"><button class="btn" data-route="new">+ New Bill</button></div><input id="billSearch" placeholder="Search #, bill number, product or vendor" value="${escapeHtml(state.query||'')}"><select id="billPeriod"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="lastMonth">Last Month</option><option value="threeMonths">Last 3 Months</option><option value="year">This Year</option><option value="custom">Custom Range</option><option value="all">All Time</option></select><select id="billVendor"><option value="">All vendors</option>${unique(all.map(entry=>entry.vendorName)).sort().map(value=>`<option ${state.vendor===value?'selected':''}>${escapeHtml(value)}</option>`).join('')}</select><label class="bill-custom">From<input id="billFrom" type="date" value="${escapeHtml(state.from||'')}"></label><label class="bill-custom">To<input id="billTo" type="date" value="${escapeHtml(state.to||'')}"></label><select id="billPageSize"><option value="20">20 bills</option><option value="50">50 bills</option></select></section><section class="card"><div class="table-wrap"><table class="table bills-table"><thead><tr><th>#</th><th>Bill Date</th><th>Items</th><th>Vendor</th><th class="num">Bill Total</th><th class="action-col">Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><footer class="pager"><span id="pageMeta"></span><div class="actions"><button class="btn secondary small" id="prevPage">Previous</button><button class="btn secondary small" id="nextPage">Next</button></div></footer></section>`;
  $('#billPeriod').value=state.period||'month';
  $('#billPageSize').value=String(state.pageSize||20);
  const custom=()=>document.querySelectorAll('.bill-custom').forEach(element=>element.hidden=$('#billPeriod').value!=='custom');
  custom();

  const draw=()=>{
    const range=rangeFor(state.period,state.from,state.to),query=String(state.query||'').trim().toLowerCase();
    const filtered=all.filter(entry=>inRange(entry,range)&&(!query||entry.search.includes(query))&&(!state.vendor||entry.vendorName===state.vendor));
    const pages=Math.max(1,Math.ceil(filtered.length/store.pageSize));
    store.page=Math.min(Math.max(1,store.page||1),pages);
    const start=(store.page-1)*store.pageSize,slice=filtered.slice(start,start+store.pageSize);
    $('#billRows').innerHTML=slice.map(entry=>{const {row,items,numberLabel,vendorName}=entry;return`<tr class="bill-row-click" data-view="${row.id}" tabindex="0"><td><strong>${escapeHtml(numberLabel)}</strong><small class="cell-meta">${escapeHtml(billNo(row)==='—'?'No bill number':billNo(row))}</small></td><td><strong>${escapeHtml(entry.date||'No date')}</strong></td><td><div class="bill-items-summary"><i class="fa-solid fa-receipt"></i><div><strong>${items.length} item${items.length===1?'':'s'}</strong><small class="cell-meta">Click row for details</small></div></div></td><td><strong>${escapeHtml(vendorName)}</strong></td><td class="num"><strong>${money(amount(row))}</strong></td><td class="action-col"><div class="actions">${canEdit(row)?`<button class="btn secondary small" data-edit="${row.id}">Edit</button>`:'<span class="locked">Locked</span>'}${store.role==='admin'?`<button class="btn danger small" data-delete="${row.id}">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No bills match these filters.</td></tr>';
    $('#pageMeta').textContent=`${filtered.length?start+1:0}–${Math.min(start+store.pageSize,filtered.length)} of ${filtered.length} bills · ${range.label}`;
    $('#prevPage').disabled=store.page<=1;
    $('#nextPage').disabled=store.page>=pages;
    const find=id=>all.find(entry=>String(entry.row.id)===String(id));
    document.querySelectorAll('[data-view]').forEach(row=>{row.onclick=event=>{if(event.target.closest('button'))return;showBill(find(row.dataset.view))};row.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();showBill(find(row.dataset.view))}}});
    document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=event=>{event.stopPropagation();store.editing=find(button.dataset.edit)?.row;location.hash='#new'});
    document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async event=>{event.stopPropagation();if(confirm('Delete this bill and all its items?')){await deleteBill(button.dataset.delete);billsPage()}});
  };

  const refresh=()=>{store.page=1;draw()};
  let searchTimer;
  $('#billSearch').oninput=event=>{state.query=event.target.value;if(state.query.trim()){state.period='all';$('#billPeriod').value='all';custom()}clearTimeout(searchTimer);searchTimer=setTimeout(refresh,120)};
  $('#billPeriod').onchange=event=>{state.period=event.target.value;custom();refresh()};
  $('#billVendor').onchange=event=>{state.vendor=event.target.value;refresh()};
  $('#billFrom').onchange=event=>{state.from=event.target.value;if(state.period==='custom')refresh()};
  $('#billTo').onchange=event=>{state.to=event.target.value;if(state.period==='custom')refresh()};
  $('#billPageSize').onchange=event=>{state.pageSize=number(event.target.value);store.pageSize=state.pageSize;refresh()};
  $('#prevPage').onclick=()=>{store.page--;draw()};
  $('#nextPage').onclick=()=>{store.page++;draw()};
  document.querySelectorAll('[data-route]').forEach(element=>element.onclick=()=>location.hash=`#${element.dataset.route}`);
  draw();
}
