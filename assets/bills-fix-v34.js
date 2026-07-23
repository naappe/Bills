(()=>{'use strict';
const key='ws-bills-v34';
const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return{}}};
const write=v=>localStorage.setItem(key,JSON.stringify(v));
const stamp=r=>{const d=new Date(dateVal(r));return Number.isNaN(d.getTime())?0:d.getTime()};
const isAdmin=()=>state?.role==='admin'||ADMIN_IDS.includes(state?.user?.id);
const range=(period)=>{const n=new Date();if(period==='month')return[new Date(n.getFullYear(),n.getMonth(),1),n];if(period==='3months')return[new Date(n.getFullYear(),n.getMonth()-2,1),n];if(period==='year')return[new Date(n.getFullYear(),0,1),n];return[null,null]};
window.renderBills=function(){
 const saved=read(); state.page=1; state.pageSize=Number(saved.size||20);
 $('#content').innerHTML=pageHead('Bills','Latest bills first, with quick period filters and admin controls.','<button class="btn secondary" id="billCsv">Export CSV</button><button class="btn" data-go="new">＋ New Bill</button>')+`
 <section class="card bills-card"><div class="toolbar"><input class="field" id="billSearch" placeholder="Search vendor, bill number, notes or amount"><select class="field" id="billPeriod"><option value="latest">Latest added</option><option value="month">This month</option><option value="3months">Last 3 months</option><option value="year">This year</option><option value="all">All records</option><option value="archived">Archived</option></select><select class="field" id="billStatus"><option value="all">All status</option><option>Paid</option><option>Pending</option><option>Cancelled</option></select><select class="field" id="billSize"><option value="20">20 per page</option><option value="50">50 per page</option><option value="100">100 per page</option></select></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRowsV34"></tbody></table></div><div class="pager" id="billPagerV34"></div></section>`;
 bindGo();
 $('#billSearch').value=saved.q||'';$('#billPeriod').value=saved.period||'latest';$('#billStatus').value=saved.status||'all';$('#billSize').value=String(saved.size||20);
 let timer; const apply=()=>{clearTimeout(timer);timer=setTimeout(draw,80)};
 ['billSearch'].forEach(id=>$('#'+id).addEventListener('input',apply));['billPeriod','billStatus','billSize'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.page=1;draw()}));
 $('#billCsv').onclick=exportCsv; draw();
 function draw(){
  const q=$('#billSearch').value.trim().toLowerCase(),period=$('#billPeriod').value,status=$('#billStatus').value;state.pageSize=Number($('#billSize').value||20);write({q,period,status,size:state.pageSize});
  let rows=[...state.rows].sort((a,b)=>stamp(b)-stamp(a)||Number(b.id||0)-Number(a.id||0));
  const archived=period==='archived';rows=rows.filter(r=>archived?Boolean(r.archived_at||r.deleted_at):!r.archived_at&&!r.deleted_at);
  if(period==='latest')rows=rows.slice(0,100);else if(!['all','archived'].includes(period)){const [a,b]=range(period);rows=rows.filter(r=>{const t=stamp(r);return t>=a.getTime()&&t<=b.getTime()})}
  rows=rows.filter(r=>(status==='all'||statusVal(r)===status)&&(!q||[vendorVal(r),get(r,'bill_no','Bill No'),get(r,'notes','Notes'),amountVal(r)].join(' ').toLowerCase().includes(q)));
  state.filtered=rows;const pages=Math.max(1,Math.ceil(rows.length/state.pageSize));if(state.page>pages)state.page=pages;const start=(state.page-1)*state.pageSize,shown=rows.slice(start,start+state.pageSize);
  $('#billRowsV34').innerHTML=shown.map(r=>`<tr><td><span class="pill ${statusVal(r).toLowerCase()}">${esc(statusVal(r))}</span></td><td>${fmt(dateVal(r))}</td><td>${esc(get(r,'bill_no','Bill No')||'-')}</td><td><strong>${esc(vendorVal(r)||'-')}</strong></td><td><strong>${money(amountVal(r))}</strong></td><td>${esc(get(r,'payment_method','Payment Method')||'-')}</td><td><div class="actions">${archived?`<button class="btn secondary small" data-restore="${r.id}">Restore</button>`:`<button class="btn secondary small" data-edit34="${r.id}">Edit</button><button class="btn secondary small" data-archive="${r.id}">Archive</button>${isAdmin()?`<button class="btn danger small" data-delete34="${r.id}">Delete</button>`:''}`}</div></td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No bills found for this filter.</div></td></tr>';
  $('#billPagerV34').innerHTML=`<span class="muted">${rows.length} records · Page ${state.page} of ${pages}</span><div class="actions"><button class="btn secondary small" id="prev34" ${state.page<=1?'disabled':''}>Previous</button><button class="btn secondary small" id="next34" ${state.page>=pages?'disabled':''}>Next</button></div>`;
  $('#prev34').onclick=()=>{if(state.page>1){state.page--;draw()}};$('#next34').onclick=()=>{if(state.page<pages){state.page++;draw()}};
  $$('[data-edit34]').forEach(b=>b.onclick=()=>editBill(b.dataset.edit34));
  $$('[data-archive]').forEach(b=>b.onclick=async()=>{if(!confirm('Archive this bill?'))return;await db.from(TABLE).update({archived_at:new Date().toISOString()}).eq('id',b.dataset.archive);await loadBills(true);draw()});
  $$('[data-restore]').forEach(b=>b.onclick=async()=>{await db.from(TABLE).update({archived_at:null,deleted_at:null}).eq('id',b.dataset.restore);await loadBills(true);draw()});
  $$('[data-delete34]').forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this bill? This cannot be undone.'))return;const {error}=await db.from(TABLE).delete().eq('id',b.dataset.delete34);if(error)return alert(error.message);await loadBills(true);draw()});
 }
};
})();