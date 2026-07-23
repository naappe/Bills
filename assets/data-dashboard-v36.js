(()=>{
'use strict';
const STORE='ws-bills-v36';
const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}};
const write=v=>localStorage.setItem(STORE,JSON.stringify(v));
const isAdmin=()=>state?.role==='admin'||ADMIN_IDS.includes(state?.user?.id);

function billDate(value){
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return value;
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='number'&&value>20000&&value<80000){const d=new Date(Date.UTC(1899,11,30));d.setUTCDate(d.getUTCDate()+value);return d}
 const s=String(value).trim();
 let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+.*)?$/);
 if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));return Number.isNaN(d.getTime())?null:d}
 m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[T\s].*)?$/);
 if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return Number.isNaN(d.getTime())?null:d}
 const d=new Date(s);return Number.isNaN(d.getTime())?null:d;
}
function dateTime(value){
 if(!value)return null;
 const d=value instanceof Date?value:new Date(value);
 return Number.isNaN(d.getTime())?null:d;
}
const billStamp=r=>billDate(dateVal(r))?.getTime()||0;
const addedStamp=r=>dateTime(get(r,'created_at','createdAt','added_at','inserted_at'))?.getTime()||Number(r.id||0)||0;
const formatDate=v=>{const d=billDate(v);return d?d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):(v||'-')};
const formatDateTime=v=>{const d=dateTime(v);return d?d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-'};
const active=r=>!r.archived_at&&!r.deleted_at;
const sortByBillDate=rows=>[...rows].sort((a,b)=>billStamp(b)-billStamp(a)||addedStamp(b)-addedStamp(a)||Number(b.id||0)-Number(a.id||0));
const sortByAdded=rows=>[...rows].sort((a,b)=>addedStamp(b)-addedStamp(a)||Number(b.id||0)-Number(a.id||0));
const periodRange=period=>{const n=new Date(),end=new Date(n.getFullYear(),n.getMonth(),n.getDate(),23,59,59,999);if(period==='month')return[new Date(n.getFullYear(),n.getMonth(),1),end];if(period==='3months')return[new Date(n.getFullYear(),n.getMonth()-2,1),end];if(period==='year')return[new Date(n.getFullYear(),0,1),end];return[null,null]};
const periodRows=(rows,period)=>{if(period==='all')return rows;const [a,b]=periodRange(period);return rows.filter(r=>{const t=billStamp(r);return t&&t>=a.getTime()&&t<=b.getTime()})};
const total=rows=>rows.reduce((s,r)=>s+amountVal(r),0);
const isFuture=r=>{const d=billDate(dateVal(r));if(!d)return false;const today=new Date();today.setHours(23,59,59,999);return d.getTime()>today.getTime()};
function addedBy(row){
 const name=get(row,'created_by_name','created_by_username','created_by_email','added_by_name','added_by','created_by');
 if(!name)return '-';
 const s=String(name);
 return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s)?`User ${s.slice(0,8)}`:s;
}

window.loadBills=async function(){
 const all=[];const size=1000;let from=0;
 for(;;){
  let {data,error}=await db.from(TABLE).select('*').order('id',{ascending:false}).range(from,from+size-1);
  if(error&&from===0)({data,error}=await db.from(TABLE).select('*').range(from,from+size-1));
  if(error)throw error;
  const batch=data||[];all.push(...batch);
  if(batch.length<size)break;
  from+=size;
 }
 state.rows=all;state.filtered=[...all];state.allBillsLoaded=true;
 return all;
};

window.renderBills=function(){
 const saved=read(),actions='<button class="btn secondary" id="billCsv">Export CSV</button><button class="btn" data-go="new">＋ New Bill</button>';
 state.page=1;state.pageSize=Number(saved.size||20);
 $('#content').innerHTML=pageHead('Bills','All bills with separate bill dates and added timestamps.',actions)+`
 <section class="metrics bills-period-totals">
  <article class="metric brand"><small>Selected total</small><strong id="selectedBillTotal">MVR 0.00</strong></article>
  <article class="metric"><small>Selected bills</small><strong id="selectedBillCount">0</strong></article>
  <article class="metric"><small>This year total</small><strong id="billYearTotal">MVR 0.00</strong></article>
  <article class="metric"><small>Total loaded</small><strong>${state.rows.length.toLocaleString()}</strong></article>
 </section>
 <section class="card bills-card"><div class="toolbar"><input class="field" id="billSearch" placeholder="Search vendor, bill number, notes, user or amount"><select class="field" id="billPeriod"><option value="latest">Latest added</option><option value="month">This month</option><option value="3months">Last 3 months</option><option value="year">This year</option><option value="future">Future bill dates</option><option value="all">All records</option><option value="archived">Archived</option></select><select class="field" id="billStatus"><option value="all">All status</option><option>Paid</option><option>Pending</option><option>Cancelled</option></select><select class="field" id="billSize"><option value="20">20 per page</option><option value="50">50 per page</option><option value="100">100 per page</option></select></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Added at</th><th>Added by</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRowsV36"></tbody></table></div><div class="pager" id="billPagerV36"></div></section>`;
 bindGo();
 $('#billSearch').value=saved.q||'';$('#billPeriod').value=saved.period||'latest';$('#billStatus').value=saved.status||'all';$('#billSize').value=String(saved.size||20);
 let timer;$('#billSearch').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.page=1;draw()},120)});['billPeriod','billStatus','billSize'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.page=1;draw()}));$('#billCsv').onclick=exportCsv;draw();
 function draw(){
  const q=$('#billSearch').value.trim().toLowerCase(),period=$('#billPeriod').value,status=$('#billStatus').value;state.pageSize=Number($('#billSize').value||20);write({...read(),q,period,status,size:state.pageSize});
  const archived=period==='archived';let rows=state.rows.filter(r=>archived?!active(r):active(r));
  if(period==='latest')rows=sortByAdded(rows);
  else if(period==='future')rows=sortByBillDate(rows.filter(isFuture));
  else if(!['all','archived'].includes(period))rows=sortByBillDate(periodRows(rows,period));
  else rows=sortByBillDate(rows);
  rows=rows.filter(r=>(status==='all'||statusVal(r)===status)&&(!q||[vendorVal(r),get(r,'bill_no','Bill No'),get(r,'notes','Notes'),addedBy(r),amountVal(r)].join(' ').toLowerCase().includes(q)));
  state.filtered=rows;const year=periodRows(state.rows.filter(active),'year');$('#selectedBillTotal').textContent=money(total(rows));$('#selectedBillCount').textContent=rows.length.toLocaleString();$('#billYearTotal').textContent=money(total(year));
  const pages=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,shown=rows.slice(start,start+state.pageSize);
  $('#billRowsV36').innerHTML=shown.map(r=>`<tr class="${isFuture(r)?'future-bill-row':''}"><td><span class="pill ${statusVal(r).toLowerCase()}">${esc(statusVal(r))}</span></td><td>${formatDate(dateVal(r))}${isFuture(r)?'<span class="pill pending" style="margin-left:6px">Future</span>':''}</td><td>${formatDateTime(get(r,'created_at','createdAt','added_at','inserted_at'))}</td><td>${esc(addedBy(r))}</td><td>${esc(get(r,'bill_no','Bill No')||'-')}</td><td><strong>${esc(vendorVal(r)||'-')}</strong></td><td><strong>${money(amountVal(r))}</strong></td><td>${esc(get(r,'payment_method','Payment Method')||'-')}</td><td><div class="actions">${archived?`<button class="btn secondary small" data-restore36="${r.id}">Restore</button>`:`<button class="btn secondary small" data-edit36="${r.id}">Edit</button><button class="btn secondary small" data-archive36="${r.id}">Archive</button>${isAdmin()?`<button class="btn danger small" data-delete36="${r.id}">Delete</button>`:''}`}</div></td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">No bills found for this filter.</div></td></tr>';
  $('#billPagerV36').innerHTML=`<span class="muted">${rows.length.toLocaleString()} records · Page ${state.page} of ${pages}</span><div class="actions"><button class="btn secondary small" id="prev36" ${state.page<=1?'disabled':''}>Previous</button><button class="btn secondary small" id="next36" ${state.page>=pages?'disabled':''}>Next</button></div>`;
  $('#prev36').onclick=()=>{if(state.page>1){state.page--;draw()}};$('#next36').onclick=()=>{if(state.page<pages){state.page++;draw()}};
  $$('[data-edit36]').forEach(b=>b.onclick=()=>editBill(b.dataset.edit36));
  $$('[data-archive36]').forEach(b=>b.onclick=async()=>{if(!confirm('Archive this bill?'))return;const{error}=await db.from(TABLE).update({archived_at:new Date().toISOString()}).eq('id',b.dataset.archive36);if(error)return alert(error.message);await loadBills();draw()});
  $$('[data-restore36]').forEach(b=>b.onclick=async()=>{const{error}=await db.from(TABLE).update({archived_at:null,deleted_at:null}).eq('id',b.dataset.restore36);if(error)return alert(error.message);await loadBills();draw()});
  $$('[data-delete36]').forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this bill? This cannot be undone.'))return;const{error}=await db.from(TABLE).delete().eq('id',b.dataset.delete36);if(error)return alert(error.message);await loadBills();draw()});
 }
};

window.renderDashboard=function(){
 const saved=read(),defaultPeriod=['month','3months','year','all'].includes(saved.dashboardPeriod)?saved.dashboardPeriod:'year';
 $('#content').innerHTML=pageHead('Purchasing overview','Year totals stay visible while you review any dashboard period.','<button class="btn" data-go="new">＋ New Bill</button>')+`<div class="dashboard-filter-row"><label>Dashboard period<select class="field" id="dashboardPeriod"><option value="month">This month</option><option value="3months">Last 3 months</option><option value="year">This year</option><option value="all">All records</option></select></label></div><section class="metrics"><article class="metric brand"><small id="dashPeriodLabel">Selected spend</small><strong id="dashPeriodTotal">MVR 0.00</strong></article><article class="metric"><small>This year total</small><strong id="dashYearTotal">MVR 0.00</strong></article><article class="metric"><small>Selected bills</small><strong id="dashPeriodCount">0</strong></article><article class="metric"><small>All active bills</small><strong id="dashAllCount">0</strong></article></section><div class="grid-2"><section class="card"><div class="card-head"><h2>Top vendors</h2></div><div class="card-body rank" id="dashVendors"></div></section><section class="card"><div class="card-head"><h2>Recent bills</h2></div><div class="card-body rank" id="dashRecent"></div></section></div>`;
 bindGo();$('#dashboardPeriod').value=defaultPeriod;$('#dashboardPeriod').onchange=draw;draw();
 function draw(){const period=$('#dashboardPeriod').value,all=state.rows.filter(active),rows=periodRows(all,period),year=periodRows(all,'year'),labels={month:'This month spend','3months':'Last 3 months spend',year:'This year spend',all:'All-time spend'};write({...read(),dashboardPeriod:period});$('#dashPeriodLabel').textContent=labels[period];$('#dashPeriodTotal').textContent=money(total(rows));$('#dashYearTotal').textContent=money(total(year));$('#dashPeriodCount').textContent=rows.length.toLocaleString();$('#dashAllCount').textContent=all.length.toLocaleString();const vendors=aggregateVendors(rows).slice(0,8),recent=sortByAdded(rows).slice(0,10);$('#dashVendors').innerHTML=vendors.map(v=>`<div class="rank-row"><div><b>${esc(v.name)}</b><br><span>${v.count} bills</span></div><strong>${money(v.total)}</strong></div>`).join('')||'<div class="empty">No bills in this period.</div>';$('#dashRecent').innerHTML=recent.map(r=>`<div class="rank-row"><div><b>${esc(vendorVal(r)||'Unknown vendor')}</b><br><span>${formatDate(dateVal(r))} · Added ${formatDateTime(get(r,'created_at','createdAt','added_at','inserted_at'))}</span></div><strong>${money(amountVal(r))}</strong></div>`).join('')||'<div class="empty">No recent bills.</div>'}
};
window.__WS_DATA_FIX__={version:37,billDate};
})();