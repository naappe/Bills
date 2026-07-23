(()=>{
'use strict';
const FILTER_KEY='ws-bill-filters-v16';
const safeJson=(v,f={})=>{try{return JSON.parse(v)||f}catch{return f}};
const startOfDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const endOfDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);
const billTs=row=>{const d=new Date(dateVal(row));return Number.isNaN(d.getTime())?NaN:d.getTime()};
const totalOf=rows=>rows.reduce((sum,row)=>sum+amountVal(row),0);
const periodRange=period=>{
  const now=new Date(); let start=null,end=null;
  if(period==='today'){start=startOfDay(now);end=endOfDay(now)}
  else if(period==='week'){start=startOfDay(now);start.setDate(start.getDate()-6);end=endOfDay(now)}
  else if(period==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999)}
  else if(period==='last_month'){start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)}
  else if(period==='3months'){start=startOfDay(now);start.setMonth(start.getMonth()-3);end=endOfDay(now)}
  else if(period==='6months'){start=startOfDay(now);start.setMonth(start.getMonth()-6);end=endOfDay(now)}
  else if(period==='year'){start=new Date(now.getFullYear(),0,1);end=new Date(now.getFullYear(),11,31,23,59,59,999)}
  return {start,end};
};

window.renderBills=function(){
  state.page=1;
  const saved=safeJson(localStorage.getItem(FILTER_KEY),{});
  const period=saved.periodFilter||'latest';
  const actions='<button class="btn secondary" id="exportBtn" type="button">Export CSV</button><button class="btn" data-go="new" type="button">＋ New Bill</button>';
  $('#content').innerHTML=pageHead('Bills','Latest bills first, with live totals and advanced date filtering.',actions)+`
  <section class="bills-summary-strip">
    <article><small>Matching bills</small><strong id="billMatchCount">0</strong></article>
    <article><small>Total value</small><strong id="billMatchTotal">MVR 0.00</strong></article>
    <article><small>Paid value</small><strong id="billPaidTotal">MVR 0.00</strong></article>
    <article><small>Pending value</small><strong id="billPendingTotal">MVR 0.00</strong></article>
  </section>
  <section class="card bills-card">
    <div class="advanced-filter">
      <div class="filter-main-row">
        <input class="field filter-search" id="billSearch" placeholder="Search vendor, bill number, TIN, notes or amount">
        <select class="field" id="statusFilter"><option value="all">All status</option><option>Paid</option><option>Pending</option><option>Cancelled</option></select>
        <select class="field" id="sizeFilter"><option value="20">20 per page</option><option value="50">50 per page</option><option value="100">100 per page</option></select>
      </div>
      <div class="period-chips" id="periodChips">
        ${[['latest','Latest 20'],['today','Today'],['week','Last 7 days'],['month','This month'],['last_month','Last month'],['3months','3 months'],['6months','6 months'],['year','This year'],['custom','Custom'],['all','All records']].map(([v,l])=>`<button type="button" data-period="${v}" class="period-chip ${period===v?'active':''}">${l}</button>`).join('')}
      </div>
      <div class="custom-date-row ${period==='custom'?'show':''}" id="customDateRow">
        <label>From<input class="field" id="dateFrom" type="date"></label>
        <label>To<input class="field" id="dateTo" type="date"></label>
        <button class="btn secondary" id="clearDates" type="button">Clear dates</button>
      </div>
      <div class="filter-note" id="filterNote"></div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Status</th><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Due date</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div>
    <div class="pager" id="pager"></div>
  </section>`;
  bindGo();
  const map={billSearch:'',statusFilter:'all',sizeFilter:'20',dateFrom:'',dateTo:''};
  Object.entries(map).forEach(([id,def])=>{const el=$('#'+id);if(el)el.value=saved[id]??def});
  state.activeBillPeriod=period;
  const delayed=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>{state.page=1;applyBillFilters()},160)}})();
  $('#billSearch').addEventListener('input',delayed);
  ['statusFilter','sizeFilter','dateFrom','dateTo'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.page=1;applyBillFilters()}));
  $$('#periodChips [data-period]').forEach(btn=>btn.onclick=async()=>{
    state.activeBillPeriod=btn.dataset.period;
    $$('#periodChips .period-chip').forEach(x=>x.classList.toggle('active',x===btn));
    $('#customDateRow').classList.toggle('show',state.activeBillPeriod==='custom');
    if(state.activeBillPeriod==='all'&&state.allBillsLoaded!==true){
      $('#filterNote').textContent='Loading all historical bills…';
      try{await loadBills(true);state.allBillsLoaded=true}catch(e){console.error(e)}
    }
    state.page=1;applyBillFilters();
  });
  $('#clearDates').onclick=()=>{$('#dateFrom').value='';$('#dateTo').value='';state.page=1;applyBillFilters()};
  $('#exportBtn').onclick=exportCsv;
  applyBillFilters();
};

window.applyBillFilters=function(){
  if(!$('#billSearch'))return;
  const q=($('#billSearch').value||'').trim().toLowerCase();
  const status=$('#statusFilter').value||'all';
  const period=state.activeBillPeriod||'latest';
  const from=$('#dateFrom').value;
  const to=$('#dateTo').value;
  state.pageSize=Number($('#sizeFilter').value||20);
  let rows=[...state.rows].sort((a,b)=>{const tb=billTs(b),ta=billTs(a);if(tb!==ta)return (tb||0)-(ta||0);return Number(b.id||0)-Number(a.id||0)});
  if(period==='latest')rows=rows.slice(0,20);
  else if(period==='custom'){
    const min=from?new Date(from+'T00:00:00').getTime():-Infinity;
    const max=to?new Date(to+'T23:59:59.999').getTime():Infinity;
    rows=rows.filter(r=>{const ts=billTs(r);return !Number.isNaN(ts)&&ts>=min&&ts<=max});
  }else if(period!=='all'){
    const {start,end}=periodRange(period);const min=start?.getTime()??-Infinity,max=end?.getTime()??Infinity;
    rows=rows.filter(r=>{const ts=billTs(r);return !Number.isNaN(ts)&&ts>=min&&ts<=max});
  }
  rows=rows.filter(r=>{
    if(status!=='all'&&statusVal(r)!==status)return false;
    if(!q)return true;
    return [vendorVal(r),get(r,'bill_no','Bill No','number'),get(r,'tin','TIN'),get(r,'notes','Notes'),get(r,'payment_method','Payment Method'),amountVal(r)].join(' ').toLowerCase().includes(q);
  });
  state.filtered=rows;
  const paid=rows.filter(r=>statusVal(r).toLowerCase()==='paid');
  const pending=rows.filter(r=>statusVal(r).toLowerCase()==='pending');
  $('#billMatchCount').textContent=rows.length.toLocaleString();
  $('#billMatchTotal').textContent=money(totalOf(rows));
  $('#billPaidTotal').textContent=money(totalOf(paid));
  $('#billPendingTotal').textContent=money(totalOf(pending));
  $('#filterNote').textContent=period==='latest'?'Showing the 20 most recently added bills.':`${rows.length.toLocaleString()} matching bills · ${state.rows.length.toLocaleString()} loaded`;
  localStorage.setItem(FILTER_KEY,JSON.stringify({billSearch:q,statusFilter:status,sizeFilter:String(state.pageSize),dateFrom:from,dateTo:to,periodFilter:period}));
  renderBillRows();
};
})();
