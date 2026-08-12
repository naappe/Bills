import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb=createClient(
  'https://tmupbruwmwlrmewhoodn.supabase.co',
  'sb_publishable_LAn1liS2zqMqlB33IQJxIw_NbgWKix1',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'white-saffron-erp-auth'}}
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=v=>`MVR ${num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const day=v=>v?String(v).slice(0,10):'—';
const today=()=>new Date().toISOString().slice(0,10);
const roleCanWrite=r=>['admin','manager','staff'].includes(r);
const roleCanManage=r=>['admin','manager'].includes(r);

const P={
  session:null,role:'viewer',route:null,
  products:[],suppliers:[],requests:[],requestItems:[],orders:[],orderItems:[],
  requestDraft:[]
};

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
  if(P.session)return true;
  const{data:{session}}=await sb.auth.getSession();
  if(!session)return false;
  P.session=session;
  const r=await sb.from('user_roles').select('role,is_active').eq('user_id',session.user.id).eq('is_active',true).maybeSingle();
  P.role=String(r.data?.role||'viewer').toLowerCase();
  return true;
}

async function loadProcurement(){
  if(!await ensureIdentity())throw new Error('Please sign in first.');
  const [products,suppliers,requests,requestItems,orders,orderItems]=await Promise.all([
    readAll('supply','Name'),
    readAll('vendors','name'),
    readAll('purchase_requests','request_date'),
    readAll('purchase_request_items','id'),
    readAll('purchase_orders','order_date'),
    readAll('purchase_order_items','id')
  ]);
  P.products=products.filter(x=>x.is_active!==false);
  P.suppliers=suppliers.filter(x=>x.is_active!==false&&!x.deleted_at);
  P.requests=requests;P.requestItems=requestItems;P.orders=orders;P.orderItems=orderItems;
}

function statusKind(s){
  s=String(s||'').toLowerCase();
  if(['approved','ordered','sent','received','closed'].includes(s))return'good';
  if(['rejected','cancelled'].includes(s))return'danger';
  return'warn';
}
function badge(s){return`<span class="badge ${statusKind(s)}">${esc(String(s||'—').replaceAll('_',' '))}</span>`}
function priorityBadge(s){
  const k=String(s||'normal').toLowerCase();
  return`<span class="bos-priority ${k}">${esc(k)}</span>`;
}
function product(id){return P.products.find(x=>String(x.id)===String(id))}
function supplier(id){return P.suppliers.find(x=>String(x.id)===String(id))}
function request(id){return P.requests.find(x=>String(x.id)===String(id))}
function order(id){return P.orders.find(x=>String(x.id)===String(id))}
function requestItems(id){return P.requestItems.filter(x=>String(x.request_id)===String(id)).sort((a,b)=>num(a.sort_order)-num(b.sort_order))}
function orderItems(id){return P.orderItems.filter(x=>String(x.purchase_order_id)===String(id)).sort((a,b)=>num(a.sort_order)-num(b.sort_order))}
function requestNo(id){return request(id)?.request_no||`PR #${id}`}
function orderNo(id){return order(id)?.po_no||`PO #${id}`}
function requesterLabel(r){return String(r.requested_by)===String(P.session?.user?.id)?'You':'Team member'}

function openModal(title,body){
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=body;
  $('#modal').classList.remove('hidden');
}
function closeModal(){$('#modal').classList.add('hidden')}
function toast(text,kind='good'){
  const box=$('#toasts');if(!box)return;
  const t=document.createElement('div');t.className=`toast ${kind}`;t.textContent=text;box.append(t);setTimeout(()=>t.remove(),4200);
}
function fail(error){toast(error?.message||String(error),'danger')}

function activate(page){
  P.route=page;
  history.replaceState(null,'',`${location.pathname}${location.search}#${page==='requests'?'purchase-requests':'purchase-orders'}`);
  $$('.sidebar button').forEach(b=>b.classList.remove('active'));
  const nav=$(`.sidebar [data-bos-procurement="${page}"]`);if(nav)nav.classList.add('active');
  document.title=`${page==='requests'?'Purchase Requests':'Purchase Orders'} · BusinessOS`;
}

function pageHead(title,desc,actions=''){
  return`<header class="bos-page-head">
    <div><div class="eyebrow">BusinessOS · Procurement</div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>
    <div class="page-actions">${actions}</div>
  </header>`;
}
function kpis(items){return`<section class="kpis">${items.map(([l,v,n=''])=>`<article class="kpi"><span>${esc(l)}</span><strong>${v}</strong>${n?`<small>${esc(n)}</small>`:''}</article>`).join('')}</section>`}
function panel(title,body,actions=''){return`<section class="panel"><header><h2>${esc(title)}</h2><div>${actions}</div></header>${body}</section>`}
function table(head,body,empty='No records found.'){return`<div class="table-scroll"><table><thead><tr>${head.map(x=>`<th class="${x[1]||''}">${esc(x[0])}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`}

async function showRequests(){
  activate('requests');
  $('#workspace').innerHTML=pageHead('Purchase Requests','Capture business demand before committing to a supplier or purchase order.','<button class="btn" data-bos-procurement="orders">Purchase Orders</button>')+'<div class="bos-loading">Loading procurement data…</div>';
  try{await loadProcurement();renderRequests()}catch(e){renderError('Purchase Requests',e)}
}
function renderRequests(filter=''){
  const ws=$('#workspace'),all=P.requests;
  const drafts=all.filter(x=>x.status==='draft').length,submitted=all.filter(x=>x.status==='submitted').length,approved=all.filter(x=>x.status==='approved').length,ordered=all.filter(x=>x.status==='ordered').length;
  const actions=`${roleCanWrite(P.role)?'<button class="btn primary" id="bosNewRequest">New Purchase Request</button>':''}<button class="btn" data-bos-procurement="orders">Purchase Orders</button>`;
  const rows=all.filter(r=>!filter||`${r.request_no} ${r.status} ${r.priority}`.toLowerCase().includes(filter.toLowerCase()));
  ws.innerHTML=pageHead('Purchase Requests','Capture, review and approve purchasing demand before a supplier commitment is created.',actions)
    +kpis([['Drafts',drafts,'Work in progress'],['Awaiting approval',submitted,'Management review'],['Approved',approved,'Ready for purchasing'],['Ordered',ordered,'Converted to PO']])
    +`<section class="filters bos-proc-filters"><label><span>Search</span><input id="bosRequestSearch" type="search" placeholder="Request number, status or priority" value="${esc(filter)}"></label><label><span>Status</span><select id="bosRequestStatus"><option value="">All statuses</option>${['draft','submitted','approved','rejected','ordered','cancelled'].map(s=>`<option>${s}</option>`).join('')}</select></label><label><span>Priority</span><select id="bosRequestPriority"><option value="">All priorities</option>${['low','normal','high','urgent'].map(s=>`<option>${s}</option>`).join('')}</select></label></section>`
    +panel('Purchase request register',table([['Date'],['Request'],['Needed by'],['Priority'],['Items','num'],['Estimated','num'],['Status'],['Requested by']],
      requestRows(rows),'No purchase requests have been created yet.'));
  bindRequestPage();
}
function requestRows(rows){
  return rows.map(r=>`<tr class="bos-click-row" data-bos-open-request="${r.id}">
    <td>${day(r.request_date)}</td><td><strong>${esc(r.request_no)}</strong></td><td>${day(r.needed_by)}</td><td>${priorityBadge(r.priority)}</td>
    <td class="num">${requestItems(r.id).length}</td><td class="num">${money(r.estimated_total)}</td><td>${badge(r.status)}</td><td>${esc(requesterLabel(r))}</td>
  </tr>`).join('');
}
function bindRequestPage(){
  const search=$('#bosRequestSearch'),status=$('#bosRequestStatus'),priority=$('#bosRequestPriority');
  const apply=()=>{
    const q=search?.value.toLowerCase()||'',s=status?.value||'',p=priority?.value||'';
    const rows=P.requests.filter(r=>(!q||`${r.request_no} ${r.status} ${r.priority}`.toLowerCase().includes(q))&&(!s||r.status===s)&&(!p||r.priority===p));
    const body=$('#workspace tbody');if(body)body.innerHTML=requestRows(rows)||'<tr><td colspan="8" class="empty">No matching purchase requests.</td></tr>';
    bindOpenRows();
  };
  if(search)search.oninput=apply;if(status)status.onchange=apply;if(priority)priority.onchange=apply;
  if($('#bosNewRequest'))$('#bosNewRequest').onclick=newRequest;
  bindOpenRows();
}
function bindOpenRows(){$$('[data-bos-open-request]').forEach(x=>x.onclick=()=>openRequest(x.dataset.bosOpenRequest));}

function newRequest(){
  P.requestDraft=[{supply_id:'',quantity:1,unit:'PCS',estimated_unit_cost:0,preferred_vendor_id:'',notes:''}];
  openModal('New Purchase Request',`<form id="bosRequestForm">
    <div class="form-grid">
      <label><span>Request date</span><input id="bosReqDate" type="date" required value="${today()}"></label>
      <label><span>Needed by</span><input id="bosReqNeeded" type="date"></label>
      <label><span>Priority</span><select id="bosReqPriority"><option>normal</option><option>high</option><option>urgent</option><option>low</option></select></label>
      <label class="span-2"><span>Business reason / notes</span><textarea id="bosReqNotes" placeholder="Why is this purchase needed?"></textarea></label>
    </div>
    <div class="section-line"><h3>Requested items</h3><button class="btn" type="button" id="bosAddReqLine">Add Item</button></div>
    <div id="bosReqLines"></div>
    <div class="bos-request-total">Estimated request value <strong id="bosReqTotal">MVR 0.00</strong></div>
    <div class="form-actions"><button type="button" class="btn" data-bos-close>Cancel</button><button class="btn primary" id="bosSaveRequest">Save Draft</button></div>
  </form>`);
  drawRequestLines();
  $('#bosAddReqLine').onclick=()=>{P.requestDraft.push({supply_id:'',quantity:1,unit:'PCS',estimated_unit_cost:0,preferred_vendor_id:'',notes:''});drawRequestLines()};
  $('#bosRequestForm').onsubmit=saveRequest;
  bindModalClose();
}
function drawRequestLines(){
  const box=$('#bosReqLines');if(!box)return;
  box.innerHTML=P.requestDraft.map((x,i)=>`<div class="bos-req-line">
    <label class="bos-product-cell"><span>Product</span><select data-req-line="${i}" data-req-field="supply_id" required><option value="">Select product</option>${P.products.map(p=>`<option value="${p.id}" ${String(p.id)===String(x.supply_id)?'selected':''}>${esc(p.Name)}</option>`).join('')}</select></label>
    <label><span>Qty</span><input data-req-line="${i}" data-req-field="quantity" type="number" min=".0001" step=".0001" value="${num(x.quantity)||1}" required></label>
    <label><span>Unit</span><input value="${esc(x.unit||'PCS')}" disabled></label>
    <label><span>Est. unit cost</span><input data-req-line="${i}" data-req-field="estimated_unit_cost" type="number" min="0" step=".01" value="${num(x.estimated_unit_cost)}"></label>
    <label><span>Preferred supplier</span><select data-req-line="${i}" data-req-field="preferred_vendor_id"><option value="">No preference</option>${P.suppliers.map(v=>`<option value="${v.id}" ${String(v.id)===String(x.preferred_vendor_id)?'selected':''}>${esc(v.name)}</option>`).join('')}</select></label>
    <button type="button" class="icon-btn danger" data-bos-remove-req="${i}" ${P.requestDraft.length===1?'disabled':''}>Remove</button>
  </div>`).join('');
  $$('[data-req-field]').forEach(el=>{
    el.onchange=el.oninput=()=>{
      const i=+el.dataset.reqLine,f=el.dataset.reqField;
      P.requestDraft[i][f]=el.value;
      if(f==='supply_id'){
        const p=product(el.value);
        if(p){P.requestDraft[i].unit=p.Unit||'PCS';P.requestDraft[i].estimated_unit_cost=num(p.Rate);drawRequestLines();return}
      }
      requestDraftTotal();
    };
  });
  $$('[data-bos-remove-req]').forEach(b=>b.onclick=()=>{P.requestDraft.splice(+b.dataset.bosRemoveReq,1);drawRequestLines()});
  requestDraftTotal();
}
function requestDraftTotal(){
  const total=P.requestDraft.reduce((a,x)=>a+num(x.quantity)*num(x.estimated_unit_cost),0);
  if($('#bosReqTotal'))$('#bosReqTotal').textContent=money(total);
}
async function saveRequest(e){
  e.preventDefault();
  if(P.requestDraft.some(x=>!x.supply_id||num(x.quantity)<=0)){toast('Complete every request item.','danger');return}
  const btn=$('#bosSaveRequest');if(btn)btn.disabled=true;
  const payload={request_date:$('#bosReqDate').value,needed_by:$('#bosReqNeeded').value,priority:$('#bosReqPriority').value,notes:$('#bosReqNotes').value.trim()};
  const items=P.requestDraft.map(x=>({supply_id:Number(x.supply_id),quantity:num(x.quantity),unit:x.unit,estimated_unit_cost:num(x.estimated_unit_cost),preferred_vendor_id:x.preferred_vendor_id||null,notes:x.notes||null}));
  const r=await sb.rpc('create_purchase_request',{p_request:payload,p_items:items});
  if(btn)btn.disabled=false;
  if(r.error){fail(r.error);return}
  closeModal();toast('Purchase request saved as draft');
  await loadProcurement();renderRequests();openRequest(r.data);
}

function coveredRequestItemIds(){
  const activeOrders=new Set(P.orders.filter(o=>o.status!=='cancelled').map(o=>String(o.id)));
  return new Set(P.orderItems.filter(i=>activeOrders.has(String(i.purchase_order_id))&&i.source_request_item_id!=null).map(i=>String(i.source_request_item_id)));
}
function openRequest(id){
  const r=request(id);if(!r)return;
  const items=requestItems(id),linked=P.orders.filter(o=>String(o.request_id)===String(id)),covered=coveredRequestItemIds();
  const remaining=items.filter(i=>!covered.has(String(i.id)));
  const canSubmit=r.status==='draft'&&(String(r.requested_by)===String(P.session?.user?.id)||roleCanManage(P.role));
  const canReview=r.status==='submitted'&&roleCanManage(P.role);
  const canOrder=r.status==='approved'&&roleCanManage(P.role)&&remaining.length>0;
  openModal(`Purchase Request ${r.request_no}`,`
    <div class="bos-detail-grid">
      <div><span>Status</span><strong>${badge(r.status)}</strong></div><div><span>Priority</span><strong>${priorityBadge(r.priority)}</strong></div>
      <div><span>Request date</span><strong>${day(r.request_date)}</strong></div><div><span>Needed by</span><strong>${day(r.needed_by)}</strong></div>
      <div><span>Estimated total</span><strong>${money(r.estimated_total)}</strong></div><div><span>Requested by</span><strong>${esc(requesterLabel(r))}</strong></div>
    </div>
    ${r.notes?`<div class="bos-note"><span>Business reason</span><p>${esc(r.notes)}</p></div>`:''}
    ${r.decision_note?`<div class="bos-note"><span>Review note</span><p>${esc(r.decision_note)}</p></div>`:''}
    ${table([['Product'],['Qty','num'],['Unit'],['Est. rate','num'],['Preferred supplier'],['PO coverage']],
      items.map(i=>`<tr><td><strong>${esc(i.description)}</strong></td><td class="num">${num(i.quantity)}</td><td>${esc(i.unit)}</td><td class="num">${money(i.estimated_unit_cost)}</td><td>${esc(supplier(i.preferred_vendor_id)?.name||'—')}</td><td>${covered.has(String(i.id))?badge('ordered'):badge('not ordered')}</td></tr>`).join(''))}
    ${linked.length?`<div class="bos-linked"><strong>Linked purchase orders</strong>${linked.map(o=>`<button type="button" data-bos-open-order="${o.id}">${esc(o.po_no)} ${badge(o.status)} <span>${money(o.total)}</span></button>`).join('')}</div>`:''}
    <div class="form-actions">
      ${canSubmit?'<button class="btn primary" id="bosSubmitRequest">Submit for Approval</button>':''}
      ${canReview?'<button class="btn primary" id="bosApproveRequest">Approve</button><button class="btn danger" id="bosRejectRequest">Reject</button>':''}
      ${canOrder?'<button class="btn primary" id="bosCreatePO">Create Purchase Order</button>':''}
      <button class="btn" data-bos-close>Close</button>
    </div>`);
  if($('#bosSubmitRequest'))$('#bosSubmitRequest').onclick=()=>submitRequest(r.id);
  if($('#bosApproveRequest'))$('#bosApproveRequest').onclick=()=>reviewRequest(r.id,'approved');
  if($('#bosRejectRequest'))$('#bosRejectRequest').onclick=()=>{const reason=prompt('Reason for rejection:');if(reason)reviewRequest(r.id,'rejected',reason)};
  if($('#bosCreatePO'))$('#bosCreatePO').onclick=()=>createPOFromRequest(r.id);
  $$('[data-bos-open-order]').forEach(x=>x.onclick=()=>openOrder(x.dataset.bosOpenOrder));
  bindModalClose();
}
async function submitRequest(id){
  const r=await sb.rpc('submit_purchase_request',{p_request_id:Number(id)});
  if(r.error){fail(r.error);return}
  toast('Purchase request submitted for approval');await loadProcurement();renderRequests();openRequest(id);
}
async function reviewRequest(id,decision,note=''){
  const r=await sb.rpc('review_purchase_request',{p_request_id:Number(id),p_decision:decision,p_note:note||null});
  if(r.error){fail(r.error);return}
  toast(`Purchase request ${decision}`);await loadProcurement();renderRequests();openRequest(id);
}

function createPOFromRequest(requestId){
  const r=request(requestId),covered=coveredRequestItemIds(),items=requestItems(requestId).filter(i=>!covered.has(String(i.id)));
  if(!items.length){toast('All request items are already ordered.','danger');return}
  const preferred=[...new Set(items.map(i=>i.preferred_vendor_id).filter(Boolean))];
  const defaultVendor=preferred.length===1?preferred[0]:'';
  openModal(`Create Purchase Order · ${r.request_no}`,`<form id="bosPOForm">
    <div class="form-grid">
      <label><span>Supplier</span><select id="bosPOVendor" required><option value="">Select supplier</option>${P.suppliers.map(v=>`<option value="${v.id}" ${String(v.id)===String(defaultVendor)?'selected':''}>${esc(v.name)}</option>`).join('')}</select></label>
      <label><span>Expected delivery</span><input id="bosPOExpected" type="date"></label>
      <label class="span-2"><span>PO notes</span><textarea id="bosPONotes" placeholder="Delivery instructions, commercial notes or reference"></textarea></label>
    </div>
    <div class="section-line"><h3>Items to order</h3><span class="muted">Select the lines for this supplier</span></div>
    <div class="bos-po-pick">${items.map(i=>`<label class="bos-po-pick-row"><input type="checkbox" data-bos-po-item="${i.id}" checked><span><strong>${esc(i.description)}</strong><small>${num(i.quantity)} ${esc(i.unit)} · ${money(i.estimated_unit_cost)} estimated</small></span><b>${money(num(i.quantity)*num(i.estimated_unit_cost))}</b></label>`).join('')}</div>
    <div class="form-actions"><button type="button" class="btn" data-bos-close>Cancel</button><button class="btn primary" id="bosSavePO">Create Draft PO</button></div>
  </form>`);
  $('#bosPOForm').onsubmit=e=>savePO(e,r.id);
  bindModalClose();
}
async function savePO(e,requestId){
  e.preventDefault();
  const itemIds=$$('[data-bos-po-item]:checked').map(x=>Number(x.dataset.bosPoItem));
  if(!itemIds.length){toast('Select at least one request item.','danger');return}
  const vendor=$('#bosPOVendor').value;if(!vendor){toast('Select a supplier.','danger');return}
  const btn=$('#bosSavePO');if(btn)btn.disabled=true;
  const r=await sb.rpc('create_purchase_order_from_request',{
    p_request_id:Number(requestId),p_vendor_id:vendor,p_item_ids:itemIds,
    p_expected_date:$('#bosPOExpected').value||null,p_notes:$('#bosPONotes').value.trim()||null
  });
  if(btn)btn.disabled=false;
  if(r.error){fail(r.error);return}
  closeModal();toast('Draft purchase order created');await loadProcurement();renderOrders();openOrder(r.data);
}

async function showOrders(){
  activate('orders');
  $('#workspace').innerHTML=pageHead('Purchase Orders','Turn approved purchase demand into controlled supplier commitments.','<button class="btn" data-bos-procurement="requests">Purchase Requests</button>')+'<div class="bos-loading">Loading procurement data…</div>';
  try{await loadProcurement();renderOrders()}catch(e){renderError('Purchase Orders',e)}
}
function renderOrders(){
  const all=P.orders,drafts=all.filter(x=>x.status==='draft').length,approved=all.filter(x=>x.status==='approved').length,sent=all.filter(x=>x.status==='sent').length,open=all.filter(x=>!['cancelled','closed','received'].includes(x.status)).reduce((a,x)=>a+num(x.total),0);
  const actions='<button class="btn primary" id="bosPOFromRequest">Create from Approved Request</button><button class="btn" data-bos-procurement="requests">Purchase Requests</button>';
  $('#workspace').innerHTML=pageHead('Purchase Orders','Approve and issue vendor-specific commitments generated from approved purchase requests.',actions)
    +kpis([['Draft POs',drafts,'Awaiting approval'],['Approved',approved,'Ready to issue'],['Sent',sent,'Supplier committed'],['Open commitment',money(open),'Non-cancelled open POs']])
    +`<section class="filters bos-proc-filters"><label><span>Search</span><input id="bosPOSearch" type="search" placeholder="PO number, supplier or request"></label><label><span>Status</span><select id="bosPOStatus"><option value="">All statuses</option>${['draft','approved','sent','part_received','received','cancelled','closed'].map(s=>`<option>${s}</option>`).join('')}</select></label></section>`
    +panel('Purchase order register',table([['Date'],['Purchase order'],['Supplier'],['Request'],['Expected'],['Total','num'],['Status']],
      orderRows(all),'No purchase orders have been created yet.'));
  bindOrderPage();
}
function orderRows(rows){
  return rows.map(o=>`<tr class="bos-click-row" data-bos-open-order="${o.id}">
    <td>${day(o.order_date)}</td><td><strong>${esc(o.po_no)}</strong></td><td>${esc(supplier(o.vendor_id)?.name||'Unknown supplier')}</td>
    <td>${o.request_id?esc(requestNo(o.request_id)):'Direct'}</td><td>${day(o.expected_date)}</td><td class="num">${money(o.total)}</td><td>${badge(o.status)}</td>
  </tr>`).join('');
}
function bindOrderPage(){
  if($('#bosPOFromRequest'))$('#bosPOFromRequest').onclick=()=>{
    const candidate=P.requests.find(r=>r.status==='approved');
    if(candidate)openRequest(candidate.id);else{toast('There are no approved requests waiting for a purchase order.','danger');showRequests()}
  };
  const search=$('#bosPOSearch'),status=$('#bosPOStatus');
  const apply=()=>{
    const q=search?.value.toLowerCase()||'',s=status?.value||'';
    const rows=P.orders.filter(o=>(!q||`${o.po_no} ${supplier(o.vendor_id)?.name||''} ${o.request_id?requestNo(o.request_id):''}`.toLowerCase().includes(q))&&(!s||o.status===s));
    const body=$('#workspace tbody');if(body)body.innerHTML=orderRows(rows)||'<tr><td colspan="7" class="empty">No matching purchase orders.</td></tr>';
    bindOrderRows();
  };
  if(search)search.oninput=apply;if(status)status.onchange=apply;bindOrderRows();
}
function bindOrderRows(){$$('[data-bos-open-order]').forEach(x=>x.onclick=()=>openOrder(x.dataset.bosOpenOrder));}

function openOrder(id){
  const o=order(id);if(!o)return;
  const items=orderItems(id),v=supplier(o.vendor_id),manage=roleCanManage(P.role);
  openModal(`Purchase Order ${o.po_no}`,`
    <div class="bos-detail-grid">
      <div><span>Status</span><strong>${badge(o.status)}</strong></div><div><span>Supplier</span><strong>${esc(v?.name||'Unknown supplier')}</strong></div>
      <div><span>Order date</span><strong>${day(o.order_date)}</strong></div><div><span>Expected date</span><strong>${day(o.expected_date)}</strong></div>
      <div><span>Linked request</span><strong>${o.request_id?esc(requestNo(o.request_id)):'Direct order'}</strong></div><div><span>Total</span><strong>${money(o.total)}</strong></div>
    </div>
    ${o.notes?`<div class="bos-note"><span>PO notes</span><p>${esc(o.notes)}</p></div>`:''}
    ${table([['Product'],['Qty','num'],['Received','num'],['Unit'],['Rate','num'],['GST','num'],['Line total','num']],
      items.map(i=>`<tr><td><strong>${esc(i.description)}</strong></td><td class="num">${num(i.quantity)}</td><td class="num">${num(i.received_quantity)}</td><td>${esc(i.unit)}</td><td class="num">${money(i.unit_rate)}</td><td class="num">${num(i.gst_rate)}%</td><td class="num">${money(i.line_total)}</td></tr>`).join(''))}
    <div class="bos-po-totals"><span>Subtotal <strong>${money(o.subtotal)}</strong></span><span>GST <strong>${money(o.gst_total)}</strong></span><span>Total <strong>${money(o.total)}</strong></span></div>
    <div class="form-actions">
      ${manage&&o.status==='draft'?'<button class="btn primary" id="bosApprovePO">Approve PO</button><button class="btn danger" id="bosCancelPO">Cancel PO</button>':''}
      ${manage&&o.status==='approved'?'<button class="btn primary" id="bosSendPO">Mark as Sent</button><button class="btn danger" id="bosCancelPO">Cancel PO</button>':''}
      ${manage&&o.status==='sent'?'<button class="btn danger" id="bosCancelPO">Cancel PO</button>':''}
      <button class="btn" id="bosPrintPO">Print</button><button class="btn" data-bos-close>Close</button>
    </div>`);
  if($('#bosApprovePO'))$('#bosApprovePO').onclick=()=>setPOStatus(o.id,'approved');
  if($('#bosSendPO'))$('#bosSendPO').onclick=()=>setPOStatus(o.id,'sent');
  if($('#bosCancelPO'))$('#bosCancelPO').onclick=()=>{if(confirm(`Cancel purchase order ${o.po_no}?`))setPOStatus(o.id,'cancelled')};
  if($('#bosPrintPO'))$('#bosPrintPO').onclick=()=>window.print();
  bindModalClose();
}
async function setPOStatus(id,status){
  const r=await sb.rpc('set_purchase_order_status',{p_order_id:Number(id),p_status:status});
  if(r.error){fail(r.error);return}
  toast(`Purchase order ${status}`);await loadProcurement();renderOrders();openOrder(id);
}

function bindModalClose(){$$('[data-bos-close]').forEach(x=>x.onclick=closeModal)}

function renderError(title,error){
  $('#workspace').innerHTML=pageHead(title,'BusinessOS procurement workflow.')
    +`<div class="alert danger"><strong>Unable to load procurement workflow</strong><span>${esc(error?.message||String(error))}</span><button class="btn" id="bosRetry">Retry</button></div>`;
  if($('#bosRetry'))$('#bosRetry').onclick=()=>P.route==='orders'?showOrders():showRequests();
}

function syncDashboard(){
  const roadmap=$('#bosRoadmap');
  if(roadmap&&!roadmap.dataset.v02){
    roadmap.dataset.v02='1';
    roadmap.innerHTML=`<strong>Procurement roadmap</strong>
      <span class="bos-chip live">Product Master · Live</span>
      <span class="bos-chip live">Suppliers · Live</span>
      <span class="bos-chip live">Purchase Requests · Live</span>
      <span class="bos-chip live">Purchase Orders · Live</span>
      <span class="bos-chip live">Purchase Invoices · Live</span>
      <span class="bos-chip live">Inventory Ledger · Live</span>
      <span class="bos-chip live">Approvals · Live</span>
      <span class="bos-chip live">Price History · Live</span>
      <span class="bos-chip next">Goods Receipts · Next</span>
      <span class="bos-chip next">Payments · Next</span>`;
  }
  const flow=$('.bos-flow-grid');
  if(flow&&!flow.dataset.v02){
    flow.dataset.v02='1';
    flow.innerHTML=`
      <button type="button" data-bos-procurement="requests">Purchase Request<span>Demand & approval</span></button>
      <button type="button" data-bos-procurement="orders">Purchase Order<span>Supplier commitment</span></button>
      <button type="button" data-bos-route="bills">Purchase Invoice<span>Supplier billing</span></button>
      <button type="button" data-bos-route="stock">Inventory<span>Movement ledger</span></button>
      <button type="button" data-bos-route="prices">Price Intelligence<span>Cost history</span></button>
      <button type="button" data-bos-route="reports">Reporting<span>Management output</span></button>`;
  }
  const version=$('.bos-version');
  if(version)version.innerHTML='<strong>BusinessOS v0.2</strong><span>Purchase workflow</span>';
  const status=$('.bos-status');if(status)status.textContent='Requests & purchase orders live';
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-bos-procurement]');
  if(!b)return;
  const page=b.dataset.bosProcurement;
  if(!['requests','orders'].includes(page))return;
  e.preventDefault();e.stopPropagation();
  page==='requests'?showRequests():showOrders();
},true);

const start=()=>{
  const ws=$('#workspace');
  if(!ws){setTimeout(start,120);return}
  syncDashboard();
  new MutationObserver(()=>queueMicrotask(syncDashboard)).observe(ws,{childList:true,subtree:true});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
