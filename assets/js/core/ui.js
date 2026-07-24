(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
window.get=value;
window.vendorVal=row=>value(row,'vendor','Vendor','vendor_name','supplier','Supplier');
window.amountVal=row=>num(value(row,'amount','Amount','total','Total','grand_total','Grand Total'));
window.dateVal=row=>value(row,'bill_date','Bill Date','date','Date','created_at');
window.statusVal=row=>String(value(row,'payment_status','Payment Status','status','Status')||'Pending');
window.today=()=>new Date().toISOString().slice(0,10);
window.toDateInput=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
window.pageHead=(title,subtitle='',actions='')=>`<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle?`<div class="muted">${esc(subtitle)}</div>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
window.bindGo=function(){document.querySelectorAll('[data-go]').forEach(el=>{el.onclick=e=>{e.preventDefault();if(window.__WS_APP_CONTROLLER__?.navigate)window.__WS_APP_CONTROLLER__.navigate(el.dataset.go);else show(el.dataset.go)}})};
window.loadBills=function(){return typeof window.reloadBillsNow==='function'?window.reloadBillsNow():Promise.resolve(state.rows||[])};
window.renderBillRows=function(){
 const body=byId('billRows'),pager=byId('pager');if(!body)return;
 const rows=Array.isArray(state.filtered)?state.filtered:[],size=Math.max(1,Number(state.pageSize||20)),pages=Math.max(1,Math.ceil(rows.length/size));
 state.page=Math.min(Math.max(1,Number(state.page||1)),pages);const start=(state.page-1)*size,pageRows=rows.slice(start,start+size);
 body.innerHTML=pageRows.map(row=>{const status=statusVal(row),cls=status.toLowerCase(),billNo=value(row,'bill_no','Bill No','number')||'-',payment=value(row,'payment_method','Payment Method')||'-',due=value(row,'due_date','Due Date')||'-';return `<tr><td><span class="pill ${esc(cls)}">${esc(status)}</span></td><td>${esc(toDateInput(dateVal(row))||dateVal(row)||'-')}</td><td>${esc(billNo)}</td><td>${esc(vendorVal(row)||'-')}</td><td>${esc(due)}</td><td><strong>${money(amountVal(row))}</strong></td><td>${esc(payment)}</td><td><div class="actions"><button class="btn secondary small" data-edit-bill="${esc(row.id)}" type="button">Edit</button>${state.role==='admin'?`<button class="btn danger small" data-delete-bill="${esc(row.id)}" type="button">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="8"><div class="empty">No bills found.</div></td></tr>';
 document.querySelectorAll('[data-edit-bill]').forEach(btn=>btn.onclick=()=>{const row=state.rows.find(r=>String(r.id)===String(btn.dataset.editBill));state.editing=row||null;state.items=Array.isArray(row?.items)?row.items:[];show('new')});
 if(pager){pager.innerHTML=`<span>${rows.length?start+1:0}-${Math.min(start+size,rows.length)} of ${rows.length}</span><div class="actions"><button class="btn secondary small" id="prevPage" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="nextPage" ${state.page>=pages?'disabled':''}>Next</button></div>`;byId('prevPage')?.addEventListener('click',()=>{state.page--;renderBillRows()});byId('nextPage')?.addEventListener('click',()=>{state.page++;renderBillRows()})}
};

window.renderDashboard=function(){
 const rows=Array.isArray(state.rows)?state.rows:[];
 const total=rows.reduce((sum,row)=>sum+amountVal(row),0);
 const vendors=new Set(rows.map(vendorVal).filter(Boolean));
 const pending=rows.filter(row=>statusVal(row).toLowerCase()==='pending').length;
 const recent=[...rows].sort((a,b)=>String(dateVal(b)).localeCompare(String(dateVal(a)))).slice(0,5);
 byId('content').innerHTML=pageHead('Dashboard','Procurement overview',`<button class="btn" data-go="new" type="button">New Bill</button>`)+`
 <section class="metrics">
  <article class="metric"><small>Total bills</small><strong>${rows.length.toLocaleString()}</strong></article>
  <article class="metric"><small>Total value</small><strong>${money(total)}</strong></article>
  <article class="metric"><small>Vendors</small><strong>${vendors.size.toLocaleString()}</strong></article>
  <article class="metric"><small>Pending</small><strong>${pending.toLocaleString()}</strong></article>
 </section>
 <section class="card"><div class="page-head"><div><h2>Recent bills</h2><div class="muted">Latest five records</div></div><button class="btn secondary" data-go="bills" type="button">View all</button></div>
 <div class="table-wrap"><table><thead><tr><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Status</th><th>Amount</th></tr></thead><tbody>${recent.map(row=>`<tr><td>${esc(toDateInput(dateVal(row))||'-')}</td><td>${esc(value(row,'bill_no','Bill No','number')||'-')}</td><td>${esc(vendorVal(row)||'-')}</td><td><span class="pill ${esc(statusVal(row).toLowerCase())}">${esc(statusVal(row))}</span></td><td><strong>${money(amountVal(row))}</strong></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No bills available.</div></td></tr>'}</tbody></table></div></section>`;
 bindGo();
};

window.renderBills=function(){
 const rows=Array.isArray(state.rows)?state.rows:[];
 state.filtered=Array.isArray(state.filtered)&&state.filtered.length?state.filtered:[...rows];
 byId('content').innerHTML=pageHead('Bills',`${rows.length.toLocaleString()} records loaded`,`<button class="btn secondary" id="exportBills" type="button">Export CSV</button><button class="btn" data-go="new" type="button">New Bill</button>`)+`
 <section class="card"><div class="actions" style="margin-bottom:16px"><input class="field" id="billSearch" placeholder="Search vendor or bill number" style="max-width:360px"><select class="field" id="billPageSize" style="max-width:120px"><option value="20">20 rows</option><option value="50">50 rows</option><option value="100">100 rows</option></select></div>
 <div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Bill no.</th><th>Vendor</th><th>Due date</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div id="pager" class="pager"></div></section>`;
 byId('billPageSize').value=String(state.pageSize||20);
 byId('billPageSize').onchange=e=>{state.pageSize=Number(e.target.value)||20;state.page=1;renderBillRows()};
 byId('billSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();state.filtered=!q?[...rows]:rows.filter(row=>`${vendorVal(row)} ${value(row,'bill_no','Bill No','number')}`.toLowerCase().includes(q));state.page=1;renderBillRows()};
 byId('exportBills').onclick=exportCsv;
 bindGo();renderBillRows();
};

window.renderNewBill=function(){
 const editing=state.editing||null;
 byId('content').innerHTML=pageHead(editing?'Edit Bill':'New Bill',editing?'Update the selected procurement record.':'Enter the bill header and save the record.',`<button class="btn secondary" data-go="bills" type="button">Back to Bills</button>`)+`
 <form class="card stack" id="billEntryForm">
  <div class="form-grid">
   <label>Bill date<input class="field" name="bill_date" type="date" required value="${esc(toDateInput(dateVal(editing))||today())}"></label>
   <label>Bill number<input class="field" name="bill_no" value="${esc(value(editing,'bill_no','Bill No','number'))}" placeholder="Optional"></label>
   <label>Vendor<input class="field" name="vendor" required value="${esc(vendorVal(editing))}" placeholder="Vendor name"></label>
   <label>Amount (MVR)<input class="field" name="amount" type="number" min="0" step="0.01" required value="${esc(amountVal(editing)||'')}"></label>
   <label>Payment status<select class="field" name="payment_status"><option>Pending</option><option>Paid</option><option>Partially Paid</option></select></label>
   <label>Payment method<select class="field" name="payment_method"><option value="">Not specified</option><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit</option></select></label>
  </div>
  <div class="notice" id="billFormNotice">Bill saving will be connected in the next data-entry module.</div>
  <div class="actions"><button class="btn" type="submit">${editing?'Update Bill':'Save Bill'}</button><button class="btn secondary" data-go="bills" type="button">Cancel</button></div>
 </form>`;
 const status=byId('billEntryForm')?.elements?.payment_status;if(status&&editing)status.value=statusVal(editing);
 const method=byId('billEntryForm')?.elements?.payment_method;if(method&&editing)method.value=value(editing,'payment_method','Payment Method')||'';
 byId('billEntryForm').onsubmit=e=>{e.preventDefault();byId('billFormNotice').textContent='The form renderer is working. Database save logic is not yet connected.'};
 bindGo();
};

window.__WS_RENDERERS__={dashboard:window.renderDashboard,bills:window.renderBills,new:window.renderNewBill};
window.exportCsv=function(){const rows=Array.isArray(state.filtered)?state.filtered:state.rows,csv=[['Date','Bill No','Vendor','Amount','Status','Payment Method'],...rows.map(r=>[dateVal(r),value(r,'bill_no','Bill No'),vendorVal(r),amountVal(r),statusVal(r),value(r,'payment_method','Payment Method')])].map(cols=>cols.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`bills-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)};
window.show=function(view){const valid=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);view=valid.has(view)?view:'dashboard';state.view=view;if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));const title={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings'}[view];if(byId('topTitle'))byId('topTitle').textContent=title;try{const renderer=window.__WS_RENDERERS__?.[view]||window[`render${view.charAt(0).toUpperCase()}${view.slice(1)}`];if(typeof renderer==='function')renderer();else byId('content').innerHTML=pageHead(title,'This section is loading.')+'<section class="card"><div class="empty">Renderer unavailable.</div></section>'}catch(error){console.error(`Failed to render ${view}`,error);byId('content').innerHTML=pageHead(title,'The page could not be rendered.')+`<section class="card"><div class="empty">${esc(error.message||String(error))}</div></section>`}};
window.boot=function(session){const login=byId('loginView'),app=byId('appView'),authenticated=Boolean(session?.user);state.user=session?.user||null;document.body.classList.toggle('logged-in',authenticated);login?.classList.toggle('hidden',authenticated);app?.classList.toggle('hidden',!authenticated);if(authenticated){if(byId('emailLabel'))byId('emailLabel').textContent=session.user.email||'Signed in';if(byId('avatar'))byId('avatar').textContent=(session.user.email||'A').charAt(0).toUpperCase()}return Promise.resolve(session)};
document.querySelectorAll('.nav [data-view]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();if(window.__WS_APP_CONTROLLER__?.navigate)window.__WS_APP_CONTROLLER__.navigate(link.dataset.view);else show(link.dataset.view)}));
byId('logoutBtn')?.addEventListener('click',async()=>{await db.auth.signOut()});
byId('menuBtn')?.addEventListener('click',()=>byId('sidebar')?.classList.toggle('open'));
window.__WS_CORE__={version:18};
})();