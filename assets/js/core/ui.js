(()=>{
'use strict';
const VERSION=19;
const byId=id=>document.getElementById(id);
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const normalized=v=>String(v??'').trim();
const fieldKey=(...candidates)=>{const sample=rows()[0]||{};return candidates.find(key=>Object.prototype.hasOwnProperty.call(sample,key))||candidates[0]};
const canAdd=()=>state.role!=='readonly';
const canDelete=()=>state.role==='admin';
const canEdit=row=>{
  if(['admin','manager'].includes(state.role))return true;
  if(state.role!=='staff')return false;
  const created=value(row,'created_at','createdAt');
  if(!created)return false;
  const age=Date.now()-new Date(created).getTime();
  return Number.isFinite(age)&&age>=0&&age<=24*60*60*1000;
};
window.get=value;
window.vendorVal=row=>value(row,'vendor','Vendor','vendor_name','supplier','Supplier');
window.amountVal=row=>num(value(row,'amount','Amount','total','Total','grand_total','Grand Total'));
window.dateVal=row=>value(row,'bill_date','Bill Date','date','Date','created_at');
window.statusVal=row=>String(value(row,'payment_status','Payment Status','status','Status')||'Pending');
window.today=()=>new Date().toISOString().slice(0,10);
window.toDateInput=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
window.pageHead=(title,subtitle='',actions='')=>`<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle?`<div class="muted">${esc(subtitle)}</div>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
window.bindGo=()=>{};
window.loadBills=()=>typeof window.reloadBillsNow==='function'?window.reloadBillsNow():Promise.resolve(rows());
const notice=(id,message,isError=false)=>{const el=byId(id);if(!el)return;el.textContent=message;el.classList.toggle('error',isError)};

window.renderBillRows=function(){
 const body=byId('billRows'),pager=byId('pager');if(!body)return;
 const list=Array.isArray(state.filtered)?state.filtered:[],size=Math.max(1,Number(state.pageSize||20)),pages=Math.max(1,Math.ceil(list.length/size));
 state.page=Math.min(Math.max(1,Number(state.page||1)),pages);const start=(state.page-1)*size,pageRows=list.slice(start,start+size);
 body.innerHTML=pageRows.map(row=>{const status=statusVal(row),cls=status.toLowerCase().replace(/[^a-z0-9]+/g,'-'),billNo=value(row,'bill_no','Bill No','number')||'-',payment=value(row,'payment_method','Payment Method','method')||'-',due=value(row,'due_date','Due Date')||'-';return `<tr><td><span class="pill ${esc(cls)}">${esc(status)}</span></td><td>${esc(toDateInput(dateVal(row))||dateVal(row)||'-')}</td><td>${esc(billNo)}</td><td>${esc(vendorVal(row)||'-')}</td><td>${esc(due)}</td><td><strong>${money(amountVal(row))}</strong></td><td>${esc(payment)}</td><td><div class="actions">${canEdit(row)?`<button class="btn secondary small" data-edit-bill="${esc(row.id)}" type="button">Edit</button>`:''}${canDelete()?`<button class="btn danger small" data-delete-bill="${esc(row.id)}" type="button">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="8"><div class="empty">No bills found.</div></td></tr>';
 body.querySelectorAll('[data-edit-bill]').forEach(btn=>btn.onclick=()=>{const row=rows().find(r=>String(r.id)===String(btn.dataset.editBill));if(!row||!canEdit(row))return;state.editing=row;show('new')});
 body.querySelectorAll('[data-delete-bill]').forEach(btn=>btn.onclick=async()=>{if(!canDelete())return;const row=rows().find(r=>String(r.id)===String(btn.dataset.deleteBill));if(!row||!confirm(`Delete bill ${value(row,'bill_no','number')||row.id}? This cannot be undone.`))return;btn.disabled=true;const {error}=await db.from(TABLE).delete().eq('id',row.id);if(error){alert(error.message||'Delete failed');btn.disabled=false;return}await reloadBillsNow()});
 if(pager){pager.innerHTML=`<span>${list.length?start+1:0}-${Math.min(start+size,list.length)} of ${list.length}</span><div class="actions"><button class="btn secondary small" id="prevPage" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="nextPage" ${state.page>=pages?'disabled':''}>Next</button></div>`;byId('prevPage')?.addEventListener('click',()=>{state.page--;renderBillRows()});byId('nextPage')?.addEventListener('click',()=>{state.page++;renderBillRows()})}
};

window.renderDashboard=function(){
 const list=rows(),total=list.reduce((sum,row)=>sum+amountVal(row),0),vendors=new Set(list.map(vendorVal).filter(Boolean)),pending=list.filter(row=>statusVal(row).toLowerCase()==='pending').length,recent=[...list].sort((a,b)=>String(dateVal(b)).localeCompare(String(dateVal(a)))).slice(0,5);
 byId('content').innerHTML=pageHead('Dashboard','Procurement overview',canAdd()?'<button class="btn" data-go="new" type="button">New Bill</button>':'')+`<section class="metrics"><article class="metric"><small>Total bills</small><strong>${list.length.toLocaleString()}</strong></article><article class="metric"><small>Total value</small><strong>${money(total)}</strong></article><article class="metric"><small>Vendors</small><strong>${vendors.size.toLocaleString()}</strong></article><article class="metric"><small>Pending</small><strong>${pending.toLocaleString()}</strong></article></section><section class="card"><div class="page-head"><div><h2>Recent bills</h2><div class="muted">Latest five records</div></div><button class="btn secondary" data-go="bills" type="button">View all</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Status</th><th>Amount</th></tr></thead><tbody>${recent.map(row=>`<tr><td>${esc(toDateInput(dateVal(row))||'-')}</td><td>${esc(value(row,'bill_no','Bill No','number')||'-')}</td><td>${esc(vendorVal(row)||'-')}</td><td><span class="pill">${esc(statusVal(row))}</span></td><td><strong>${money(amountVal(row))}</strong></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No bills available.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderBills=function(){
 const list=rows();state.filtered=[...list];
 byId('content').innerHTML=pageHead('Bills',`${list.length.toLocaleString()} records loaded`,`<button class="btn secondary" id="exportBills" type="button">Export CSV</button>${canAdd()?'<button class="btn" data-go="new" type="button">New Bill</button>':''}`)+`<section class="card"><div class="actions" style="margin-bottom:16px"><input class="field" id="billSearch" placeholder="Search vendor or bill number" style="max-width:360px"><select class="field" id="billStatus" style="max-width:180px"><option value="">All statuses</option>${[...new Set(list.map(statusVal).filter(Boolean))].sort().map(v=>`<option>${esc(v)}</option>`).join('')}</select><select class="field" id="billPageSize" style="max-width:120px"><option value="20">20 rows</option><option value="50">50 rows</option><option value="100">100 rows</option></select></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Bill no.</th><th>Vendor</th><th>Due date</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div id="pager" class="pager"></div></section>`;
 const apply=()=>{const q=normalized(byId('billSearch')?.value).toLowerCase(),s=normalized(byId('billStatus')?.value).toLowerCase();state.filtered=list.filter(row=>(!q||`${vendorVal(row)} ${value(row,'bill_no','Bill No','number')}`.toLowerCase().includes(q))&&(!s||statusVal(row).toLowerCase()===s));state.page=1;renderBillRows()};
 byId('billPageSize').value=String(state.pageSize||20);byId('billPageSize').onchange=e=>{state.pageSize=Number(e.target.value)||20;state.page=1;renderBillRows()};byId('billSearch').oninput=apply;byId('billStatus').onchange=apply;byId('exportBills').onclick=exportCsv;renderBillRows();
};

window.renderNewBill=function(){
 if(!canAdd()){byId('content').innerHTML=pageHead('New Bill','Your role is read-only.')+'<section class="card"><div class="empty">You do not have permission to create bills.</div></section>';return}
 const editing=state.editing||null;if(editing&&!canEdit(editing)){state.editing=null;show('bills');return}
 byId('content').innerHTML=pageHead(editing?'Edit Bill':'New Bill',editing?'Update the selected procurement record.':'Enter the bill details and save.',`<button class="btn secondary" data-go="bills" type="button">Back to Bills</button>`)+`<form class="card stack" id="billEntryForm"><div class="form-grid"><label>Bill date<input class="field" name="bill_date" type="date" required value="${esc(toDateInput(dateVal(editing))||today())}"></label><label>Bill number<input class="field" name="bill_no" value="${esc(value(editing,'bill_no','Bill No','number'))}" placeholder="Optional"></label><label>Vendor<input class="field" name="vendor" required value="${esc(vendorVal(editing))}" placeholder="Vendor name"></label><label>Amount (MVR)<input class="field" name="amount" type="number" min="0" step="0.01" required value="${esc(amountVal(editing)||'')}"></label><label>Payment status<select class="field" name="payment_status"><option>Pending</option><option>Paid</option><option>Partially Paid</option></select></label><label>Payment method<select class="field" name="payment_method"><option value="">Not specified</option><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit</option></select></label></div><div class="notice" id="billFormNotice"></div><div class="actions"><button class="btn" id="saveBillBtn" type="submit">${editing?'Update Bill':'Save Bill'}</button><button class="btn secondary" data-go="bills" type="button">Cancel</button></div></form>`;
 const form=byId('billEntryForm');form.elements.payment_status.value=statusVal(editing);form.elements.payment_method.value=value(editing,'payment_method','Payment Method','method')||'';
 form.onsubmit=async e=>{e.preventDefault();const button=byId('saveBillBtn'),data=new FormData(form),payload={};payload[fieldKey('bill_date','date')]=data.get('bill_date');payload[fieldKey('bill_no','number')]=normalized(data.get('bill_no'));payload[fieldKey('vendor','vendor_name','supplier')]=normalized(data.get('vendor'));payload[fieldKey('amount','total','grand_total')]=num(data.get('amount'));payload[fieldKey('payment_status','status')]=data.get('payment_status');payload[fieldKey('payment_method','method')]=data.get('payment_method')||null;button.disabled=true;notice('billFormNotice',editing?'Updating bill…':'Saving bill…');let result;if(editing)result=await db.from(TABLE).update(payload).eq('id',editing.id).select();else result=await db.from(TABLE).insert(payload).select();button.disabled=false;if(result.error){notice('billFormNotice',result.error.message||'Save failed',true);return}state.editing=null;await reloadBillsNow();show('bills')};
};

window.renderVendors=function(){
 const map=new Map();rows().forEach(row=>{const name=normalized(vendorVal(row));if(!name)return;const item=map.get(name)||{name,count:0,total:0,tin:value(row,'tin','TIN','vendor_tin')};item.count++;item.total+=amountVal(row);if(!item.tin)item.tin=value(row,'tin','TIN','vendor_tin');map.set(name,item)});const list=[...map.values()].sort((a,b)=>b.total-a.total);
 byId('content').innerHTML=pageHead('Vendors',`${list.length} vendors derived from bill records`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Bills</th><th>Total value</th></tr></thead><tbody>${list.map(v=>`<tr><td><strong>${esc(v.name)}</strong></td><td>${esc(v.tin||'-')}</td><td>${v.count.toLocaleString()}</td><td>${money(v.total)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty">No vendor data available.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderProducts=function(){
 const map=new Map();rows().forEach(row=>(Array.isArray(row.items)?row.items:[]).forEach(item=>{const name=normalized(value(item,'product','description','name','item'));if(!name)return;const current=map.get(name)||{name,unit:value(item,'unit','purchase_unit'),qty:0,total:0};current.qty+=num(value(item,'qty','quantity'));current.total+=num(value(item,'line_total','total','amount'));map.set(name,current)}));const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
 byId('content').innerHTML=pageHead('Products',`${list.length} products found in saved bill items`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Unit</th><th>Purchased quantity</th><th>Total value</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.unit||'-')}</td><td>${p.qty.toLocaleString()}</td><td>${money(p.total)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty">No item-level product data exists in the loaded bills.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderPrices=function(){
 const prices=[];rows().forEach(row=>(Array.isArray(row.items)?row.items:[]).forEach(item=>{const name=normalized(value(item,'product','description','name','item'));if(!name)return;prices.push({name,unit:value(item,'unit','purchase_unit'),rate:num(value(item,'rate','unit_rate','pack_rate')),vendor:vendorVal(row),date:dateVal(row)})}));prices.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 byId('content').innerHTML=pageHead('Price Book',`${prices.length} saved item rates`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Unit</th><th>Rate</th><th>Vendor</th><th>Date</th></tr></thead><tbody>${prices.slice(0,500).map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.unit||'-')}</td><td>${money(p.rate)}</td><td>${esc(p.vendor||'-')}</td><td>${esc(toDateInput(p.date)||'-')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No item-level rates exist in the loaded bills.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderReports=function(){
 const list=rows(),byStatus={};list.forEach(row=>{const key=statusVal(row)||'Unknown';byStatus[key]=(byStatus[key]||0)+amountVal(row)});const monthly={};list.forEach(row=>{const d=toDateInput(dateVal(row));if(!d)return;const key=d.slice(0,7);monthly[key]=(monthly[key]||0)+amountVal(row)});const months=Object.entries(monthly).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12);
 byId('content').innerHTML=pageHead('Reports','Purchasing summaries from the loaded bill data','<button class="btn secondary" id="exportReport" type="button">Export Bills CSV</button>')+`<section class="card"><h2>Value by status</h2><div class="table-wrap"><table><thead><tr><th>Status</th><th>Total value</th></tr></thead><tbody>${Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).map(([s,t])=>`<tr><td>${esc(s)}</td><td>${money(t)}</td></tr>`).join('')}</tbody></table></div></section><section class="card"><h2>Recent monthly purchasing</h2><div class="table-wrap"><table><thead><tr><th>Month</th><th>Total value</th></tr></thead><tbody>${months.map(([m,t])=>`<tr><td>${esc(m)}</td><td>${money(t)}</td></tr>`).join('')||'<tr><td colspan="2"><div class="empty">No dated bills available.</div></td></tr>'}</tbody></table></div></section>`;byId('exportReport').onclick=exportCsv;
};

window.renderSettings=function(){
 const versions={ui:VERSION,auth:window.__WS_AUTH__?.version||'-',controller:window.__WS_APP_CONTROLLER__?.version||'-',health:window.__WS_RUNTIME_HEALTH__?.version||'-'};
 byId('content').innerHTML=pageHead('Settings','Application and session information')+`<section class="card"><div class="form-grid"><label>Signed-in user<input class="field" readonly value="${esc(state.user?.email||'Not signed in')}"></label><label>Role<input class="field" readonly value="${esc(String(state.role||'staff').toUpperCase())}"></label><label>Loaded bills<input class="field" readonly value="${rows().length.toLocaleString()}"></label><label>Database status<input class="field" readonly value="${esc(window.__WS_DB_STATUS__?.status||'Unknown')}"></label></div></section><section class="card"><h2>Runtime versions</h2><div class="table-wrap"><table><tbody>${Object.entries(versions).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div></section>`;
};

window.__WS_RENDERERS__={dashboard:renderDashboard,bills:renderBills,new:renderNewBill,products:renderProducts,vendors:renderVendors,prices:renderPrices,reports:renderReports,settings:renderSettings};
window.exportCsv=function(){const list=Array.isArray(state.filtered)?state.filtered:rows(),csv=[['Date','Bill No','Vendor','Amount','Status','Payment Method'],...list.map(r=>[dateVal(r),value(r,'bill_no','Bill No','number'),vendorVal(r),amountVal(r),statusVal(r),value(r,'payment_method','Payment Method','method')])].map(cols=>cols.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`bills-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0)};
window.show=function(view){const valid=new Set(Object.keys(window.__WS_RENDERERS__));view=valid.has(view)?view:'dashboard';state.view=view;if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));const title={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings'}[view];if(byId('topTitle'))byId('topTitle').textContent=title;try{window.__WS_RENDERERS__[view]()}catch(error){console.error(`Failed to render ${view}`,error);byId('content').innerHTML=pageHead(title,'The page could not be rendered.')+`<section class="card"><div class="empty">${esc(error.message||String(error))}</div></section>`}};
window.boot=function(session){window.__WS_AUTH__?.setAuthView?.(session);return Promise.resolve(session)};
byId('menuBtn')?.addEventListener('click',()=>byId('sidebar')?.classList.toggle('open'));
window.__WS_CORE__={version:VERSION};
})();