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

const R={
  session:null,role:'viewer',
  orders:[],orderItems:[],receipts:[],receiptItems:[],suppliers:[],products:[],
  draft:[]
};

const canReceive=()=>['admin','manager','staff'].includes(R.role);
const canAcceptOver=()=>['admin','manager'].includes(R.role);

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
  const {data:{session}}=await sb.auth.getSession();
  if(!session)throw new Error('Please sign in first.');
  R.session=session;
  const r=await sb.from('user_roles').select('role,is_active').eq('user_id',session.user.id).eq('is_active',true).maybeSingle();
  if(r.error)throw r.error;
  R.role=String(r.data?.role||'viewer').toLowerCase();
  return true;
}

async function loadReceiving(){
  await ensureIdentity();
  const [orders,orderItems,receipts,receiptItems,suppliers,products]=await Promise.all([
    readAll('purchase_orders','order_date'),
    readAll('purchase_order_items','id'),
    readAll('goods_receipts','receipt_date'),
    readAll('goods_receipt_items','id'),
    readAll('vendors','name'),
    readAll('supply','Name')
  ]);
  R.orders=orders;
  R.orderItems=orderItems;
  R.receipts=receipts;
  R.receiptItems=receiptItems;
  R.suppliers=suppliers.filter(x=>x.is_active!==false&&!x.deleted_at);
  R.products=products.filter(x=>x.is_active!==false);
}

function supplier(id){return R.suppliers.find(x=>String(x.id)===String(id))}
function product(id){return R.products.find(x=>String(x.id)===String(id))}
function order(id){return R.orders.find(x=>String(x.id)===String(id))}
function itemsForOrder(id){return R.orderItems.filter(x=>String(x.purchase_order_id)===String(id)).sort((a,b)=>num(a.sort_order)-num(b.sort_order))}
function itemsForReceipt(id){return R.receiptItems.filter(x=>String(x.goods_receipt_id)===String(id))}
function receipt(id){return R.receipts.find(x=>String(x.id)===String(id))}
function openOrders(){return R.orders.filter(o=>['sent','part_received'].includes(String(o.status)))}
function totalReceived(r){return itemsForReceipt(r.id).reduce((a,x)=>a+num(x.received_quantity),0)}
function totalRejected(r){return itemsForReceipt(r.id).reduce((a,x)=>a+num(x.rejected_quantity),0)}

function badge(s){
  const t=String(s||'—').toLowerCase();
  const k=['received','posted'].includes(t)?'good':['cancelled','voided'].includes(t)?'danger':'warn';
  return `<span class="badge ${k}">${esc(t.replaceAll('_',' '))}</span>`;
}

function pageHead(){
  return `<header class="bos-page-head">
    <div><div class="eyebrow">BusinessOS · Procurement</div><h1>Goods Receipts</h1><p>Receive supplier deliveries against purchase orders, record shortages or rejected quantities, and update stock from one controlled GRN.</p></div>
    <div class="page-actions">${canReceive()?'<button class="btn primary" id="bosNewGRN">Receive Purchase Order</button>':''}<button class="btn" data-bos-procurement="orders">Purchase Orders</button></div>
  </header>`;
}
function kpis(items){return `<section class="kpis">${items.map(([l,v,n=''])=>`<article class="kpi"><span>${esc(l)}</span><strong>${v}</strong>${n?`<small>${esc(n)}</small>`:''}</article>`).join('')}</section>`}
function panel(title,body){return `<section class="panel"><header><h2>${esc(title)}</h2><div></div></header>${body}</section>`}
function table(head,body,empty='No records found.'){
  return `<div class="table-scroll"><table><thead><tr>${head.map(([x,c=''])=>`<th class="${c}">${esc(x)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${head.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`;
}
function toast(text,kind='good'){
  const box=$('#toasts');if(!box)return;
  const t=document.createElement('div');t.className=`toast ${kind}`;t.textContent=text;box.append(t);setTimeout(()=>t.remove(),4500);
}
function openModal(title,body){
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=body;
  $('#modal').classList.remove('hidden');
}
function closeModal(){$('#modal').classList.add('hidden')}
function bindClose(){$$('[data-bos-close]').forEach(x=>x.onclick=closeModal)}
function fail(e){toast(e?.message||String(e),'danger')}

function activate(){
  history.replaceState(null,'',`${location.pathname}${location.search}#goods-receipts`);
  $$('.sidebar button').forEach(b=>b.classList.remove('active'));
  $('[data-bos-receiving="receipts"]')?.classList.add('active');
  document.title='Goods Receipts · BusinessOS';
  $('#pageTitle').textContent='Goods Receipts';
}

async function showReceipts(){
  activate();
  $('#workspace').innerHTML=pageHead()+'<div class="bos-loading">Loading goods receipts…</div>';
  try{await loadReceiving();renderReceipts()}catch(e){renderError(e)}
}

function renderReceipts(q=''){
  const month=today().slice(0,7);
  const list=R.receipts.filter(r=>!q||`${r.grn_no} ${order(r.purchase_order_id)?.po_no||''} ${r.supplier_delivery_no||''}`.toLowerCase().includes(q.toLowerCase()));
  const open=openOrders();
  const partial=R.orders.filter(o=>o.status==='part_received').length;
  const monthReceipts=R.receipts.filter(r=>String(r.receipt_date).startsWith(month));
  const monthQty=monthReceipts.reduce((a,r)=>a+totalReceived(r),0);

  $('#workspace').innerHTML=pageHead()
    +kpis([
      ['Open purchase orders',open.length,'Ready for receiving'],
      ['Partial deliveries',partial,'Awaiting remaining items'],
      ['GRNs this month',monthReceipts.length,'Posted receipts'],
      ['Units received',num(monthQty).toLocaleString('en-US',{maximumFractionDigits:2}),'This month']
    ])
    +`<section class="filters bos-receipt-filters">
      <label><span>Search</span><input id="bosGRNSearch" type="search" placeholder="GRN, PO or supplier delivery number" value="${esc(q)}"></label>
      <label><span>PO status</span><select id="bosOpenPOFilter"><option value="">All receipts</option><option value="open">Show open POs only</option></select></label>
    </section>`
    +panel('Goods receipt register',table(
      [['Date'],['GRN'],['Purchase order'],['Supplier'],['Delivery reference'],['Accepted','num'],['Rejected','num'],['Status']],
      receiptRows(list),
      'No goods receipts have been posted yet.'
    ));
  bindReceiptPage();
}

function receiptRows(rows){
  return rows.map(r=>{
    const o=order(r.purchase_order_id),v=supplier(o?.vendor_id);
    return `<tr class="bos-click-row" data-bos-open-grn="${r.id}">
      <td>${day(r.receipt_date)}</td>
      <td><strong>${esc(r.grn_no)}</strong></td>
      <td>${esc(o?.po_no||'Unknown PO')}</td>
      <td>${esc(v?.name||'Unknown supplier')}</td>
      <td>${esc(r.supplier_delivery_no||'—')}</td>
      <td class="num">${num(totalReceived(r))}</td>
      <td class="num">${num(totalRejected(r))}</td>
      <td>${badge(r.status)}</td>
    </tr>`;
  }).join('');
}

function bindReceiptPage(){
  $('#bosNewGRN')?.addEventListener('click',choosePO);
  $('#bosGRNSearch')?.addEventListener('input',e=>{
    const body=$('#workspace tbody');
    const q=e.target.value.toLowerCase();
    const list=R.receipts.filter(r=>`${r.grn_no} ${order(r.purchase_order_id)?.po_no||''} ${r.supplier_delivery_no||''}`.toLowerCase().includes(q));
    if(body)body.innerHTML=receiptRows(list)||'<tr><td colspan="8" class="empty">No matching goods receipts.</td></tr>';
    bindReceiptRows();
  });
  $('#bosOpenPOFilter')?.addEventListener('change',e=>{if(e.target.value==='open')choosePO()});
  bindReceiptRows();
}
function bindReceiptRows(){$$('[data-bos-open-grn]').forEach(x=>x.onclick=()=>openReceipt(x.dataset.bosOpenGrn))}

function choosePO(){
  const rows=openOrders();
  if(!rows.length){toast('There are no sent or partially received purchase orders.','danger');return}
  openModal('Receive Purchase Order',`<div class="bos-po-pick bos-grn-po-list">
    ${rows.map(o=>{
      const its=itemsForOrder(o.id),remaining=its.reduce((a,i)=>a+Math.max(num(i.quantity)-num(i.received_quantity),0),0);
      return `<button type="button" class="bos-grn-po-choice" data-bos-choose-po="${o.id}">
        <span><strong>${esc(o.po_no)}</strong><small>${esc(supplier(o.vendor_id)?.name||'Unknown supplier')} · ${day(o.expected_date)}</small></span>
        <b>${num(remaining)} remaining</b>${badge(o.status)}
      </button>`;
    }).join('')}
  </div><div class="form-actions"><button class="btn" data-bos-close>Close</button></div>`);
  $$('[data-bos-choose-po]').forEach(b=>b.onclick=()=>openReceiveForm(b.dataset.bosChoosePo));
  bindClose();
}

function openReceiveForm(poId){
  const o=order(poId),its=itemsForOrder(poId);
  if(!o)return;
  R.draft=its.map(i=>({
    purchase_order_item_id:i.id,
    received_quantity:Math.max(num(i.quantity)-num(i.received_quantity),0),
    rejected_quantity:0,
    notes:''
  }));
  drawReceiveForm(o);
}

function drawReceiveForm(o){
  const its=itemsForOrder(o.id);
  openModal(`Receive ${o.po_no}`,`<form id="bosGRNForm">
    <div class="bos-detail-grid">
      <div><span>Purchase order</span><strong>${esc(o.po_no)}</strong></div>
      <div><span>Supplier</span><strong>${esc(supplier(o.vendor_id)?.name||'Unknown supplier')}</strong></div>
      <div><span>PO status</span><strong>${badge(o.status)}</strong></div>
    </div>
    <div class="form-grid bos-grn-head">
      <label><span>Receipt date</span><input id="bosGRNDate" type="date" required value="${today()}"></label>
      <label><span>Supplier delivery no.</span><input id="bosGRNDelivery" type="text" placeholder="Delivery note / DO number"></label>
      <label><span>Receiving location</span><input id="bosGRNLocation" type="text" placeholder="Store / branch / warehouse"></label>
      <label class="span-2"><span>Receipt notes</span><textarea id="bosGRNNotes" placeholder="Delivery condition, shortages or comments"></textarea></label>
    </div>
    <div class="section-line"><h3>Received items</h3><span>Enter accepted and rejected quantities from this delivery.</span></div>
    <div class="table-scroll bos-grn-lines"><table>
      <thead><tr><th>Product</th><th class="num">Ordered</th><th class="num">Previously</th><th class="num">Remaining</th><th class="num">Receive now</th><th class="num">Reject</th><th>Line note</th></tr></thead>
      <tbody>${its.map((i,n)=>receiveLine(i,n)).join('')}</tbody>
    </table></div>
    ${canAcceptOver()?`<label class="bos-over-accept"><input id="bosAllowOver" type="checkbox"> <span>Manager/admin: accept intentional over-delivery when entered above remaining quantity.</span></label>`:''}
    <div class="bos-receive-summary" id="bosReceiveSummary"></div>
    <div class="form-actions">
      <button type="button" class="btn" data-bos-close>Cancel</button>
      <button class="btn primary" id="bosPostGRN">Post Goods Receipt</button>
    </div>
  </form>`);
  $$('[data-grn-field]').forEach(el=>el.oninput=()=>{
    const i=+el.dataset.grnLine,f=el.dataset.grnField;
    R.draft[i][f]=el.value;
    updateReceiveSummary();
  });
  $('#bosGRNForm').onsubmit=e=>postReceipt(e,o.id);
  bindClose();
  updateReceiveSummary();
}

function receiveLine(i,n){
  const remain=Math.max(num(i.quantity)-num(i.received_quantity),0);
  const p=product(i.supply_id);
  const tracked=p?.stock_tracking_active!==false && !!p?.stock_tracking_active;
  return `<tr class="${tracked?'':'bos-stock-warning'}">
    <td><strong>${esc(i.description)}</strong><small>${tracked?esc(i.unit):'Stock count required before accepted receipt'}</small></td>
    <td class="num">${num(i.quantity)}</td>
    <td class="num">${num(i.received_quantity)}</td>
    <td class="num">${num(remain)}</td>
    <td class="num"><input data-grn-line="${n}" data-grn-field="received_quantity" type="number" min="0" step=".0001" value="${remain}" ${tracked?'':'data-stock-uninitialized="1"'}></td>
    <td class="num"><input data-grn-line="${n}" data-grn-field="rejected_quantity" type="number" min="0" step=".0001" value="0"></td>
    <td><input data-grn-line="${n}" data-grn-field="notes" type="text" placeholder="Optional note"></td>
  </tr>`;
}

function updateReceiveSummary(){
  let accepted=0,rejected=0,over=0;
  R.draft.forEach(d=>{
    const item=R.orderItems.find(i=>String(i.id)===String(d.purchase_order_item_id));
    const remain=Math.max(num(item?.quantity)-num(item?.received_quantity),0);
    accepted+=num(d.received_quantity);rejected+=num(d.rejected_quantity);over+=Math.max(num(d.received_quantity)-remain,0);
  });
  const box=$('#bosReceiveSummary');if(!box)return;
  box.innerHTML=`<span>Accepted <strong>${accepted}</strong></span><span>Rejected <strong>${rejected}</strong></span><span>Over-delivery <strong>${over}</strong></span>`;
}

async function postReceipt(e,poId){
  e.preventDefault();
  const lines=R.draft.map(x=>({
    purchase_order_item_id:Number(x.purchase_order_item_id),
    received_quantity:num(x.received_quantity),
    rejected_quantity:num(x.rejected_quantity),
    notes:String(x.notes||'').trim()||null
  })).filter(x=>x.received_quantity>0||x.rejected_quantity>0);

  if(!lines.length){toast('Enter a received or rejected quantity on at least one line.','danger');return}

  for(const line of lines){
    if(line.received_quantity<=0)continue;
    const oi=R.orderItems.find(i=>String(i.id)===String(line.purchase_order_item_id));
    const p=product(oi?.supply_id);
    if(!p?.stock_tracking_active){toast(`Initialize stock count before receiving ${oi?.description||'this product'}.`,'danger');return}
    const remaining=Math.max(num(oi.quantity)-num(oi.received_quantity),0);
    if(line.received_quantity>remaining&&!canAcceptOver()){toast('Staff cannot accept an over-delivery.','danger');return}
    if(line.received_quantity>remaining&&canAcceptOver()&&!$('#bosAllowOver')?.checked){toast('Tick the over-delivery acceptance box before posting.','danger');return}
  }

  const btn=$('#bosPostGRN');if(btn)btn.disabled=true;
  const payload={
    receipt_date:$('#bosGRNDate').value,
    supplier_delivery_no:$('#bosGRNDelivery').value.trim(),
    location:$('#bosGRNLocation').value.trim(),
    notes:$('#bosGRNNotes').value.trim()
  };
  const r=await sb.rpc('post_goods_receipt',{
    p_order_id:Number(poId),
    p_receipt:payload,
    p_items:lines,
    p_allow_over_delivery:!!$('#bosAllowOver')?.checked
  });
  if(btn)btn.disabled=false;
  if(r.error){fail(r.error);return}
  closeModal();toast('Goods receipt posted and inventory updated');
  await loadReceiving();renderReceipts();openReceipt(r.data);
}

function openReceipt(id){
  const r=receipt(id);if(!r)return;
  const o=order(r.purchase_order_id),v=supplier(o?.vendor_id),its=itemsForReceipt(id);
  openModal(`Goods Receipt ${r.grn_no}`,`
    <div class="bos-detail-grid">
      <div><span>Status</span><strong>${badge(r.status)}</strong></div>
      <div><span>Purchase order</span><strong>${esc(o?.po_no||'Unknown PO')}</strong></div>
      <div><span>Supplier</span><strong>${esc(v?.name||'Unknown supplier')}</strong></div>
      <div><span>Receipt date</span><strong>${day(r.receipt_date)}</strong></div>
      <div><span>Delivery reference</span><strong>${esc(r.supplier_delivery_no||'—')}</strong></div>
      <div><span>Location</span><strong>${esc(r.location||'—')}</strong></div>
    </div>
    ${r.notes?`<div class="bos-note"><span>Receipt notes</span><p>${esc(r.notes)}</p></div>`:''}
    ${table(
      [['Product'],['Ordered','num'],['Previously','num'],['Accepted','num'],['Rejected','num'],['Over','num'],['Remaining','num'],['Unit']],
      its.map(i=>`<tr>
        <td><strong>${esc(i.description)}</strong>${i.notes?`<small>${esc(i.notes)}</small>`:''}</td>
        <td class="num">${num(i.ordered_quantity)}</td>
        <td class="num">${num(i.previously_received)}</td>
        <td class="num">${num(i.received_quantity)}</td>
        <td class="num">${num(i.rejected_quantity)}</td>
        <td class="num">${num(i.over_delivery_quantity)}</td>
        <td class="num">${num(i.remaining_after)}</td>
        <td>${esc(i.unit)}</td>
      </tr>`).join('')
    )}
    <div class="bos-receive-summary">
      <span>Accepted <strong>${totalReceived(r)}</strong></span>
      <span>Rejected <strong>${totalRejected(r)}</strong></span>
      <span>PO status <strong>${esc(o?.status||'—')}</strong></span>
    </div>
    <div class="form-actions"><button class="btn" id="bosPrintGRN">Print GRN</button><button class="btn" data-bos-close>Close</button></div>
  `);
  $('#bosPrintGRN')?.addEventListener('click',()=>window.print());
  bindClose();
}

function renderError(error){
  $('#workspace').innerHTML=pageHead()+`<div class="alert danger"><strong>Unable to load Goods Receipts</strong><span>${esc(error?.message||String(error))}</span><button class="btn" id="bosRetryGRN">Retry</button></div>`;
  $('#bosRetryGRN')?.addEventListener('click',showReceipts);
}

function upgradeDashboard(){
  if((location.hash||'#dashboard')!=='#dashboard')return;
  const hero=$('.bos-hero-copy');
  if(hero){
    const kicker=hero.querySelector('.bos-kicker');
    if(kicker&&kicker.textContent!=='BusinessOS · Procurement v0.3')kicker.textContent='BusinessOS · Procurement v0.3';
    const p=hero.querySelector('p');
    if(p)p.textContent='Purchasing now flows from demand and purchase orders through controlled goods receipt before supplier invoicing, inventory and cost analysis.';
    const live=hero.querySelector('.bos-chip.live');
    if(live)live.textContent='Requests, POs & Goods Receipts · Live';
  }
  const flow=$('.bos-flow-grid');
  if(flow&&!flow.dataset.v03){
    flow.dataset.v02='1';flow.dataset.v03='1';
    flow.innerHTML=`
      <button type="button" data-bos-procurement="requests">Purchase Request<span>Demand & approval</span></button>
      <button type="button" data-bos-procurement="orders">Purchase Order<span>Supplier commitment</span></button>
      <button type="button" data-bos-receiving="receipts">Goods Receipt<span>Delivery & stock receipt</span></button>
      <button type="button" data-bos-route="bills">Purchase Invoice<span>Supplier billing</span></button>
      <button type="button" data-bos-route="prices">Price Intelligence<span>Cost history</span></button>
      <button type="button" data-bos-route="reports">Reporting<span>Management output</span></button>`;
  }
  const roadmap=$('#bosRoadmap');
  if(roadmap&&!roadmap.dataset.v03){
    roadmap.dataset.v02='1';roadmap.dataset.v03='1';
    roadmap.innerHTML=`<strong>Procurement roadmap</strong>
      <span class="bos-chip live">Product Master · Live</span>
      <span class="bos-chip live">Suppliers · Live</span>
      <span class="bos-chip live">Purchase Requests · Live</span>
      <span class="bos-chip live">Purchase Orders · Live</span>
      <span class="bos-chip live">Goods Receipts · Live</span>
      <span class="bos-chip live">Purchase Invoices · Live</span>
      <span class="bos-chip live">Inventory Ledger · Live</span>
      <span class="bos-chip live">Approvals · Live</span>
      <span class="bos-chip live">Price History · Live</span>
      <span class="bos-chip next">3-Way Matching · Next</span>
      <span class="bos-chip next">Payments · Next</span>`;
  }
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-bos-receiving]');
  if(b){
    e.preventDefault();e.stopPropagation();
    showReceipts();
    return;
  }
  if(e.target.closest('[data-route]'))$('[data-bos-receiving="receipts"]')?.classList.remove('active');
},true);

const start=()=>{
  const ws=$('#workspace');
  if(!ws){setTimeout(start,120);return}
  upgradeDashboard();
  new MutationObserver(()=>requestAnimationFrame(upgradeDashboard)).observe(ws,{childList:true,subtree:false});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
