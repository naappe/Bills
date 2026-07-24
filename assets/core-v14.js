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

window.bindGo=function(){document.querySelectorAll('[data-go]').forEach(el=>{el.onclick=e=>{e.preventDefault();show(el.dataset.go)}})};

window.loadBills=async function(all=false){
  let query=db.from(TABLE).select('*').order('bill_date',{ascending:false}).order('id',{ascending:false});
  if(!all)query=query.limit(500);
  const {data,error}=await query;
  if(error)throw error;
  state.rows=Array.isArray(data)?data:[];
  state.filtered=[...state.rows];
  return state.rows;
};

window.renderBillRows=function(){
  const body=byId('billRows'),pager=byId('pager');
  if(!body)return;
  const rows=Array.isArray(state.filtered)?state.filtered:[];
  const size=Math.max(1,Number(state.pageSize||20));
  const pages=Math.max(1,Math.ceil(rows.length/size));
  state.page=Math.min(Math.max(1,Number(state.page||1)),pages);
  const start=(state.page-1)*size;
  const pageRows=rows.slice(start,start+size);
  body.innerHTML=pageRows.map(row=>{
    const status=statusVal(row),cls=status.toLowerCase();
    const billNo=value(row,'bill_no','Bill No','number')||'-';
    const payment=value(row,'payment_method','Payment Method')||'-';
    const due=value(row,'due_date','Due Date')||'-';
    return `<tr><td><span class="pill ${esc(cls)}">${esc(status)}</span></td><td>${esc(toDateInput(dateVal(row))||dateVal(row)||'-')}</td><td>${esc(billNo)}</td><td>${esc(vendorVal(row)||'-')}</td><td>${esc(due)}</td><td><strong>${money(amountVal(row))}</strong></td><td>${esc(payment)}</td><td><div class="actions"><button class="btn secondary small" data-edit-bill="${esc(row.id)}" type="button">Edit</button>${state.role==='admin'?`<button class="btn danger small" data-delete-bill="${esc(row.id)}" type="button">Delete</button>`:''}</div></td></tr>`;
  }).join('')||'<tr><td colspan="8"><div class="empty">No bills found.</div></td></tr>';
  document.querySelectorAll('[data-edit-bill]').forEach(btn=>btn.onclick=()=>{const row=state.rows.find(r=>String(r.id)===String(btn.dataset.editBill));state.editing=row||null;state.items=Array.isArray(row?.items)?row.items:[];show('new')});
  document.querySelectorAll('[data-delete-bill]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Delete this bill?'))return;const {error}=await db.from(TABLE).delete().eq('id',btn.dataset.deleteBill);if(error){alert(error.message);return}await loadBills();if(typeof applyBillFilters==='function')applyBillFilters()});
  if(pager){
    pager.innerHTML=`<span>${rows.length?start+1:0}-${Math.min(start+size,rows.length)} of ${rows.length}</span><div class="actions"><button class="btn secondary small" id="prevPage" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="nextPage" ${state.page>=pages?'disabled':''}>Next</button></div>`;
    byId('prevPage')?.addEventListener('click',()=>{state.page--;renderBillRows()});
    byId('nextPage')?.addEventListener('click',()=>{state.page++;renderBillRows()});
  }
};

window.exportCsv=function(){
  const rows=Array.isArray(state.filtered)?state.filtered:state.rows;
  const csv=[['Date','Bill No','Vendor','Amount','Status','Payment Method'],...rows.map(r=>[dateVal(r),value(r,'bill_no','Bill No'),vendorVal(r),amountVal(r),statusVal(r),value(r,'payment_method','Payment Method')])].map(cols=>cols.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`bills-${today()}.csv`;a.click();URL.revokeObjectURL(a.href);
};

window.show=function(view){
  const valid=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
  view=valid.has(view)?view:'dashboard';state.view=view;
  if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);
  document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
  const title={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings'}[view];
  if(byId('topTitle'))byId('topTitle').textContent=title;
  try{
    if(view==='dashboard'&&typeof renderDashboard==='function')renderDashboard();
    else if(view==='bills'&&typeof renderBills==='function')renderBills();
    else if(view==='new'&&typeof renderNewBill==='function')renderNewBill();
    else if(view==='products'&&typeof renderProducts==='function')renderProducts();
    else if(view==='vendors'&&typeof renderVendors==='function')renderVendors();
    else if(view==='prices'&&typeof renderPrices==='function')renderPrices();
    else if(view==='reports'&&typeof renderReports==='function')renderReports();
    else if(view==='settings'&&typeof renderSettings==='function')renderSettings();
    else byId('content').innerHTML=pageHead(title,'This section is loading.')+'<section class="card"><div class="empty">Renderer unavailable.</div></section>';
  }catch(error){console.error(`Failed to render ${view}`,error);byId('content').innerHTML=pageHead(title,'The page could not be rendered.')+`<section class="card"><div class="empty">${esc(error.message||String(error))}</div></section>`}
};

window.boot=async function(session){
  const login=byId('loginView'),app=byId('appView');
  if(!session?.user){state.user=null;document.body.classList.remove('logged-in');login?.classList.remove('hidden');app?.classList.add('hidden');return}
  state.user=session.user;document.body.classList.add('logged-in');login?.classList.add('hidden');app?.classList.remove('hidden');
  if(byId('emailLabel'))byId('emailLabel').textContent=session.user.email||'Signed in';
  if(byId('avatar'))byId('avatar').textContent=(session.user.email||'A').charAt(0).toUpperCase();
  try{await loadBills()}catch(error){console.error('Failed to load bills',error);state.rows=[]}
  show(location.hash.slice(1)||'dashboard');
};

document.querySelectorAll('.nav [data-view]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();show(link.dataset.view)}));
byId('logoutBtn')?.addEventListener('click',async()=>{await db.auth.signOut();boot(null)});
byId('menuBtn')?.addEventListener('click',()=>byId('sidebar')?.classList.toggle('open'));

db.auth.getSession().then(({data})=>boot(data.session));
db.auth.onAuthStateChange((_event,session)=>boot(session));
window.__WS_CORE__={version:15};
})();