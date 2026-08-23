import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb=createClient(
  'https://tmupbruwmwlrmewhoodn.supabase.co',
  'sb_publishable_LAn1liS2zqMqlB33IQJxIw_NbgWKix1',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'white-saffron-erp-auth'}}
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
const money=v=>`MVR ${num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const day=v=>v?String(v).slice(0,10):'—';
const today=()=>new Date().toISOString().slice(0,10);

const Q={session:null,role:'viewer',quotes:[],suppliers:[],requests:[],links:[],bills:[]};
const canWrite=()=>['admin','manager','staff'].includes(Q.role);
const canManage=()=>['admin','manager'].includes(Q.role);
const isAdmin=()=>Q.role==='admin';

async function readAll(table,orderCol){
  const rows=[],limit=1000;
  for(let from=0;;from+=limit){
    let q=sb.from(table).select('*').range(from,from+limit-1);
    if(orderCol)q=q.order(orderCol,{ascending:false});
    const r=await q;
    if(r.error)throw r.error;
    rows.push(...(r.data||[]));
    if(!r.data||r.data.length<limit)break;
  }
  return rows;
}

async function ensureIdentity(){
  const{data:{session}}=await sb.auth.getSession();
  if(!session)return false;
  Q.session=session;
  const r=await sb.from('user_roles').select('role,is_active').eq('user_id',session.user.id).eq('is_active',true).maybeSingle();
  if(r.error)throw r.error;
  Q.role=String(r.data?.role||'viewer').toLowerCase();
  return true;
}

async function load(){
  if(!await ensureIdentity())throw new Error('Please sign in first.');
  const [quotes,suppliers,requests]=await Promise.all([
    readAll('supplier_quotations','quote_date'),
    readAll('vendors','name'),
    readAll('purchase_requests','request_date')
  ]);
  Q.quotes=quotes;
  Q.suppliers=suppliers.filter(x=>x.is_active!==false&&!x.deleted_at);
  Q.requests=requests;
  Q.links=[];Q.bills=[];
  if(isAdmin()){
    const [links,bills]=await Promise.all([
      readAll('quotation_bill_links','linked_at'),
      readAll('bills','bill_day')
    ]);
    Q.links=links;
    Q.bills=bills.filter(x=>!x.deleted_at);
  }
}

function supplier(id){return Q.suppliers.find(x=>String(x.id)===String(id))}
function request(id){return Q.requests.find(x=>String(x.id)===String(id))}
function quote(id){return Q.quotes.find(x=>String(x.id)===String(id))}
function quoteLinks(id){return Q.links.filter(x=>String(x.quotation_id)===String(id))}
function bill(id){return Q.bills.find(x=>String(x.id)===String(id))}
function requestNo(id){return request(id)?.request_no||`PR #${id}`}
function billNo(b){return b?.bill_no||b?.['Bill No']||`#${b?.id??''}`}
function billAmount(b){return num(b?.net_amount??b?.amount??b?.Amount)}
function billVendor(b){return b?.vendor||b?.Vendor||supplier(b?.vendor_id)?.name||'Unknown supplier'}
function statusKind(s){s=String(s||'').toLowerCase();if(['final','purchased'].includes(s))return'good';if(['cancelled'].includes(s))return'danger';return'warn'}
function badge(s){return`<span class="badge ${statusKind(s)}">${esc(String(s||'—').replaceAll('_',' '))}</span>`}

function openModal(title,body){
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=body;
  $('#modal').classList.remove('hidden');
}
function closeModal(){$('#modal').classList.add('hidden')}
function bindClose(){$$('[data-quo-close]').forEach(x=>x.onclick=closeModal)}
function toast(text,kind='good'){
  const box=$('#toasts');if(!box)return;
  const t=document.createElement('div');t.className=`toast ${kind}`;t.textContent=text;box.append(t);setTimeout(()=>t.remove(),4200);
}
function fail(e){toast(e?.message||String(e),'danger')}
function table(head,body,empty='No records found.'){return`<div class="table-scroll"><table><thead><tr>${head.map(x=>`<th class="${x[1]||''}">${esc(x[0])}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`}
function panel(title,body,actions=''){return`<section class="panel"><header><h2>${esc(title)}</h2><div>${actions}</div></header>${body}</section>`}
function kpis(items){return`<section class="kpis">${items.map(([l,v,n=''])=>`<article class="kpi"><span>${esc(l)}</span><strong>${v}</strong>${n?`<small>${esc(n)}</small>`:''}</article>`).join('')}</section>`}

function activate(){
  history.replaceState(null,'',`${location.pathname}${location.search}#supplier-quotations`);
  $$('.sidebar button').forEach(b=>b.classList.remove('active'));
  const nav=$('.sidebar [data-bos-quotation]');if(nav)nav.classList.add('active');
  document.title='Supplier Quotations · BusinessOS';
  if($('#pageTitle'))$('#pageTitle').textContent='Supplier Quotations';
}

async function showQuotations(){
  activate();
  $('#workspace').innerHTML=`<header class="bos-page-head"><div><div class="eyebrow">BusinessOS · Procurement</div><h1>Supplier Quotations</h1><p>Record supplier offers, finalize the selected quotation and track whether it resulted in an actual purchase.</p></div></header><div class="bos-loading">Loading quotation register…</div>`;
  try{await load();render()}catch(e){renderError(e)}
}

function render(search='',status=''){
  const all=Q.quotes;
  const drafts=all.filter(x=>x.status==='draft').length;
  const finals=all.filter(x=>x.status==='final').length;
  const purchased=all.filter(x=>x.purchase_status==='purchased').length;
  const total=all.filter(x=>x.status==='final').reduce((a,x)=>a+num(x.total),0);
  const actions=`${canWrite()?'<button class="btn primary" id="quoNew">New Supplier Quotation</button>':''}<button class="btn" data-bos-procurement="requests">Purchase Requests</button><button class="btn" data-bos-procurement="orders">Purchase Orders</button>`;
  const rows=all.filter(q=>(!search||`${q.quotation_no} ${q.supplier_reference||''} ${supplier(q.vendor_id)?.name||''} ${q.request_id?requestNo(q.request_id):''}`.toLowerCase().includes(search.toLowerCase()))&&(!status||q.status===status));
  const purchaseHead=isAdmin()?[['Purchase result']]:[];
  $('#workspace').innerHTML=`<header class="bos-page-head"><div><div class="eyebrow">BusinessOS · Procurement</div><h1>Supplier Quotations</h1><p>Finalize the supplier offer you intend to buy, then Admin can link the real purchase invoice and compare quoted versus actual cost.</p></div><div class="page-actions">${actions}</div></header>`
    +kpis([['Draft quotations',drafts,'Under evaluation'],['Final quotations',finals,'Selected offers'],['Purchased',purchased,'Linked to actual buying'],['Final quoted value',money(total),'Selected quotation value']])
    +`<section class="filters bos-proc-filters"><label><span>Search</span><input id="quoSearch" type="search" placeholder="Quotation, supplier, request or reference" value="${esc(search)}"></label><label><span>Status</span><select id="quoStatus"><option value="">All statuses</option>${['draft','final','cancelled'].map(s=>`<option value="${s}" ${status===s?'selected':''}>${s}</option>`).join('')}</select></label><label><span>Purchase</span><select id="quoPurchase"><option value="">All</option><option value="not_purchased">Not purchased</option><option value="purchased">Purchased</option></select></label></section>`
    +panel('Quotation register',table([['Date'],['Quotation'],['Supplier'],['Supplier ref'],['Request'],['Quoted total','num'],['Status'],['Purchase status'],...purchaseHead],quoteRows(rows),'No supplier quotations have been recorded yet.'));
  bindPage();
}

function quoteRows(rows){
  return rows.map(q=>{
    let adminResult='';
    if(isAdmin()){
      const links=quoteLinks(q.id),actual=links.reduce((a,l)=>a+billAmount(bill(l.bill_id)),0);
      adminResult=`<td>${links.length?`<strong>${money(actual)}</strong><small>${links.length} linked invoice${links.length===1?'':'s'}</small>`:'—'}</td>`;
    }
    return`<tr class="bos-click-row" data-quo-open="${q.id}"><td>${day(q.quote_date)}</td><td><strong>${esc(q.quotation_no)}</strong></td><td>${esc(supplier(q.vendor_id)?.name||'Unknown supplier')}</td><td>${esc(q.supplier_reference||'—')}</td><td>${q.request_id?esc(requestNo(q.request_id)):'—'}</td><td class="num">${money(q.total)}</td><td>${badge(q.status)}</td><td>${badge(q.purchase_status)}</td>${adminResult}</tr>`;
  }).join('');
}

function bindPage(){
  if($('#quoNew'))$('#quoNew').onclick=newQuotation;
  const search=$('#quoSearch'),status=$('#quoStatus'),purchase=$('#quoPurchase');
  const apply=()=>{
    const q=search?.value||'',s=status?.value||'',p=purchase?.value||'';
    const rows=Q.quotes.filter(x=>(!q||`${x.quotation_no} ${x.supplier_reference||''} ${supplier(x.vendor_id)?.name||''} ${x.request_id?requestNo(x.request_id):''}`.toLowerCase().includes(q.toLowerCase()))&&(!s||x.status===s)&&(!p||x.purchase_status===p));
    const body=$('#workspace tbody');
    if(body)body.innerHTML=quoteRows(rows)||`<tr><td colspan="${isAdmin()?9:8}" class="empty">No matching supplier quotations.</td></tr>`;
    bindRows();
  };
  if(search)search.oninput=apply;if(status)status.onchange=apply;if(purchase)purchase.onchange=apply;
  bindRows();
}
function bindRows(){$$('[data-quo-open]').forEach(x=>x.onclick=()=>openQuotation(x.dataset.quoOpen))}

function newQuotation(){
  const requestOptions=Q.requests.filter(r=>!['cancelled','rejected'].includes(r.status)).map(r=>`<option value="${r.id}">${esc(r.request_no)} · ${esc(r.status)}</option>`).join('');
  openModal('New Supplier Quotation',`<form id="quoForm"><div class="form-grid">
    <label><span>Purchase request</span><select id="quoRequest"><option value="">Not linked</option>${requestOptions}</select></label>
    <label><span>Supplier</span><select id="quoVendor" required><option value="">Select supplier</option>${Q.suppliers.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></label>
    <label><span>Quotation date</span><input id="quoDate" type="date" value="${today()}" required></label>
    <label><span>Valid until</span><input id="quoValid" type="date"></label>
    <label><span>Supplier quotation / reference</span><input id="quoReference" placeholder="Supplier quote no."></label>
    <label><span>Quoted total (MVR)</span><input id="quoTotal" type="number" min="0" step="0.01" required></label>
    <label class="span-2"><span>Notes</span><textarea id="quoNotes" placeholder="Commercial terms, delivery, validity or decision notes"></textarea></label>
  </div><div class="form-actions"><button type="button" class="btn" data-quo-close>Cancel</button><button class="btn primary" id="quoSave">Save Draft</button></div></form>`);
  $('#quoForm').onsubmit=saveQuotation;bindClose();
}

async function saveQuotation(e){
  e.preventDefault();
  const btn=$('#quoSave');if(btn)btn.disabled=true;
  const payload={request_id:$('#quoRequest').value||null,vendor_id:$('#quoVendor').value,quote_date:$('#quoDate').value,valid_until:$('#quoValid').value||null,supplier_reference:$('#quoReference').value.trim()||null,currency:'MVR',total:num($('#quoTotal').value),notes:$('#quoNotes').value.trim()||null};
  const r=await sb.rpc('create_supplier_quotation',{p_quote:payload});
  if(btn)btn.disabled=false;
  if(r.error){fail(r.error);return}
  closeModal();toast('Supplier quotation saved as draft');await load();render();openQuotation(r.data);
}

function openQuotation(id){
  const q=quote(id);if(!q)return;
  const v=supplier(q.vendor_id),links=isAdmin()?quoteLinks(q.id):[],actual=links.reduce((a,l)=>a+billAmount(bill(l.bill_id)),0),variance=actual-num(q.total);
  const adminPurchase=isAdmin()?`<section class="quo-purchase-card"><header><div><span>Admin only</span><h3>Purchase Result</h3></div>${q.status==='final'?'<button class="btn primary" id="quoLinkBill">Link Purchase Invoice</button>':''}</header><div class="quo-cost-grid"><div><span>Quoted</span><strong>${money(q.total)}</strong></div><div><span>Actual</span><strong>${links.length?money(actual):'—'}</strong></div><div><span>Variance</span><strong class="${variance>0?'quo-over':variance<0?'quo-under':''}">${links.length?`${variance>=0?'+':''}${money(variance)}`:'—'}</strong></div><div><span>Invoices</span><strong>${links.length}</strong></div></div>${links.length?`<div class="quo-linked-list">${links.map(l=>{const b=bill(l.bill_id);return`<div><button type="button" class="link" data-quo-bill="${b?.id}">${esc(billNo(b))}</button><span>${day(b?.bill_day||b?.bill_date)} · ${esc(billVendor(b))}</span><strong>${money(billAmount(b))}</strong><button class="icon-btn danger" type="button" data-quo-unlink="${b?.id}">Unlink</button></div>`}).join('')}</div>`:'<p class="empty compact">No purchase invoice linked yet.</p>'}</section>`:'';
  openModal(`Supplier Quotation ${q.quotation_no}`,`<div class="bos-detail-grid"><div><span>Status</span><strong>${badge(q.status)}</strong></div><div><span>Purchase status</span><strong>${badge(q.purchase_status)}</strong></div><div><span>Supplier</span><strong>${esc(v?.name||'Unknown supplier')}</strong></div><div><span>Quotation date</span><strong>${day(q.quote_date)}</strong></div><div><span>Valid until</span><strong>${day(q.valid_until)}</strong></div><div><span>Quoted total</span><strong>${money(q.total)}</strong></div><div><span>Supplier reference</span><strong>${esc(q.supplier_reference||'—')}</strong></div><div><span>Purchase request</span><strong>${q.request_id?esc(requestNo(q.request_id)):'Not linked'}</strong></div></div>${q.notes?`<div class="bos-note"><span>Notes</span><p>${esc(q.notes)}</p></div>`:''}${adminPurchase}<div class="form-actions">${canManage()&&q.status==='draft'?'<button class="btn primary" id="quoFinalize">Mark Final</button><button class="btn danger" id="quoCancel">Cancel Quotation</button>':''}<button class="btn" data-quo-close>Close</button></div>`);
  if($('#quoFinalize'))$('#quoFinalize').onclick=()=>setStatus(q.id,'final');
  if($('#quoCancel'))$('#quoCancel').onclick=()=>{if(confirm(`Cancel quotation ${q.quotation_no}?`))setStatus(q.id,'cancelled')};
  if($('#quoLinkBill'))$('#quoLinkBill').onclick=()=>openBillLink(q.id);
  $$('[data-quo-unlink]').forEach(b=>b.onclick=()=>unlinkBill(q.id,b.dataset.quoUnlink));
  $$('[data-quo-bill]').forEach(b=>b.onclick=()=>openBillSummary(b.dataset.quoBill,q.id));
  bindClose();
}

async function setStatus(id,status){
  const r=await sb.rpc('set_supplier_quotation_status',{p_quotation_id:Number(id),p_status:status});
  if(r.error){fail(r.error);return}
  toast(status==='final'?'Quotation marked final':'Quotation cancelled');await load();render();openQuotation(id);
}

function openBillLink(quotationId){
  if(!isAdmin())return;
  const q=quote(quotationId);if(!q)return;
  const linked=new Set(quoteLinks(q.id).map(x=>String(x.bill_id)));
  const v=supplier(q.vendor_id);
  const candidates=Q.bills.filter(b=>!linked.has(String(b.id))&&(String(b.vendor_id||'')===String(q.vendor_id)||(!b.vendor_id&&billVendor(b).toLowerCase()===String(v?.name||'').toLowerCase())));
  openModal(`Link Purchase Invoice · ${q.quotation_no}`,`<form id="quoBillForm"><div class="quo-admin-note"><strong>Admin-only link</strong><span>This records which actual purchase invoice came from the final quotation. It does not duplicate the invoice.</span></div><div class="form-grid"><label class="span-2"><span>Purchase invoice</span><select id="quoBillSelect" required><option value="">Select invoice</option>${candidates.map(b=>`<option value="${b.id}">${esc(billNo(b))} · ${day(b.bill_day||b.bill_date)} · ${money(billAmount(b))}</option>`).join('')}</select></label></div>${candidates.length?'':`<div class="alert warn"><strong>No matching invoices</strong><span>No unlinked purchase invoice was found for ${esc(v?.name||'this supplier')}.</span></div>`}<div class="form-actions"><button type="button" class="btn" data-quo-close>Cancel</button><button class="btn primary" id="quoBillSave" ${candidates.length?'':'disabled'}>Link Invoice</button></div></form>`);
  $('#quoBillForm').onsubmit=e=>linkBill(e,q.id);bindClose();
}

async function linkBill(e,quotationId){
  e.preventDefault();
  const billId=$('#quoBillSelect').value;if(!billId)return;
  const btn=$('#quoBillSave');if(btn)btn.disabled=true;
  const r=await sb.rpc('link_quotation_bill',{p_quotation_id:Number(quotationId),p_bill_id:Number(billId)});
  if(btn)btn.disabled=false;
  if(r.error){fail(r.error);return}
  toast('Purchase invoice linked to final quotation');await load();render();openQuotation(quotationId);
}

async function unlinkBill(quotationId,billId){
  if(!isAdmin())return;
  if(!confirm('Remove this purchase invoice from the quotation purchase result?'))return;
  const r=await sb.rpc('unlink_quotation_bill',{p_quotation_id:Number(quotationId),p_bill_id:Number(billId)});
  if(r.error){fail(r.error);return}
  toast('Purchase invoice unlinked');await load();render();openQuotation(quotationId);
}

function openBillSummary(billId,quotationId){
  const b=bill(billId);if(!b||!isAdmin())return;
  openModal(`Purchase Invoice ${billNo(b)}`,`<div class="bos-detail-grid"><div><span>Invoice</span><strong>${esc(billNo(b))}</strong></div><div><span>Supplier</span><strong>${esc(billVendor(b))}</strong></div><div><span>Date</span><strong>${day(b.bill_day||b.bill_date)}</strong></div><div><span>Amount</span><strong>${money(billAmount(b))}</strong></div><div><span>Payment</span><strong>${esc(b.payment_status||'Pending')}</strong></div><div><span>Approval</span><strong>${esc(b.approval_status||'Recorded')}</strong></div></div><div class="form-actions"><button class="btn" id="quoBack">Back to Quotation</button><button class="btn" data-quo-close>Close</button></div>`);
  $('#quoBack').onclick=()=>openQuotation(quotationId);bindClose();
}

function renderError(e){
  $('#workspace').innerHTML=`<header class="bos-page-head"><div><div class="eyebrow">BusinessOS · Procurement</div><h1>Supplier Quotations</h1><p>Quotation workflow.</p></div></header><div class="alert danger"><strong>Unable to load Supplier Quotations</strong><span>${esc(e?.message||String(e))}</span><button class="btn" id="quoRetry">Retry</button></div>`;
  if($('#quoRetry'))$('#quoRetry').onclick=showQuotations;
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-bos-quotation]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();showQuotations();
},true);

document.addEventListener('click',e=>{
  if(e.target.closest('[data-route],[data-bos-procurement],[data-bos-receiving]')){
    const q=$('.sidebar [data-bos-quotation]');if(q)q.classList.remove('active');
  }
});

window.addEventListener('hashchange',()=>{
  if(location.hash==='#supplier-quotations')showQuotations();
});

const start=()=>{
  if(!$('#workspace')){setTimeout(start,120);return}
  if(location.hash==='#supplier-quotations')showQuotations();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
