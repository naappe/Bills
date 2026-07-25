(()=>{
'use strict';
const VERSION=1;
const text=value=>String(value??'').trim();
const number=value=>Number(String(value??0).replace(/,/g,''))||0;

function parsePack(input){
 const value=text(input).toLowerCase().replace(/\s+/g,'');
 let match=value.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(match){
  const count=number(match[1]);
  const size=number(match[2]);
  const unit=match[3].toLowerCase()==='pc'?'pcs':match[3].toLowerCase();
  return{count,size,unit,base:count*size};
 }
 match=value.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(match){
  const size=number(match[1]);
  const unit=match[2].toLowerCase()==='pc'?'pcs':match[2].toLowerCase();
  return{count:1,size,unit,base:size};
 }
 return{count:0,size:0,unit:'',base:0};
}

function calculate(raw){
 const item={...raw};
 const pack=parsePack(item.pack_format);
 const qty=number(item.qty);
 const entered=number(item.rate);
 const gstPct=number(item.gst);
 const rateMode=item.rate_mode==='per_unit'?'per_unit':'line_total';
 const subtotal=rateMode==='per_unit'?qty*entered:entered;
 const gstAmount=subtotal*gstPct/100;
 const lineTotal=subtotal+gstAmount;
 const purchaseRate=qty?subtotal/qty:0;
 let basePerPurchase=1;
 let smallUnit='pcs';
 let measurement='pieces';
 if(pack.base){
  if(pack.unit==='kg'){basePerPurchase=pack.base*1000;smallUnit='g';measurement='weight'}
  else if(pack.unit==='g'){basePerPurchase=pack.base;smallUnit='g';measurement='weight'}
  else if(pack.unit==='l'){basePerPurchase=pack.base*1000;smallUnit='ml';measurement='volume'}
  else if(pack.unit==='ml'){basePerPurchase=pack.base;smallUnit='ml';measurement='volume'}
  else{basePerPurchase=pack.base;smallUnit='pcs';measurement='pieces'}
 }else{
  const unit=text(item.unit).toUpperCase();
  if(unit==='KG'){basePerPurchase=1000;smallUnit='g';measurement='weight'}
  else if(unit==='G'){basePerPurchase=1;smallUnit='g';measurement='weight'}
  else if(unit==='L'){basePerPurchase=1000;smallUnit='ml';measurement='volume'}
  else if(unit==='ML'){basePerPurchase=1;smallUnit='ml';measurement='volume'}
  else if(unit==='DOZ'){basePerPurchase=12;smallUnit='pcs';measurement='pieces'}
 }
 const totalBase=qty*basePerPurchase;
 return{
  ...item,
  product:text(item.product),
  pack_format:text(item.pack_format),
  unit:text(item.unit).toUpperCase()||'CSE',
  qty,
  rate:entered,
  rate_mode:rateMode,
  gst:gstPct,
  gst_pct:gstPct,
  subtotal,
  gst_amount:gstAmount,
  line_total:lineTotal,
  purchase_rate:purchaseRate,
  base_per_purchase:basePerPurchase,
  total_base:totalBase,
  small_unit:smallUnit,
  small_rate:totalBase?subtotal/totalBase:0,
  measurement
 };
}

async function saveVendor(form){
 const name=text(form.elements.vendor?.value);
 if(!name)return null;
 const details={
  name,
  tin:text(form.elements.tin?.value)||null,
  phone:text(form.elements.vendor_phone?.value)||null,
  email:text(form.elements.vendor_email?.value)||null,
  address:text(form.elements.vendor_address?.value)||null,
  default_payment_method:form.elements.payment_method?.value||null,
  updated_at:new Date().toISOString(),
  updated_by:state.user?.id||null
 };
 const lookup=await db.from('vendors').select('id,name,tin,phone,email,address,default_payment_method').ilike('name',name).is('deleted_at',null).limit(1);
 if(lookup.error)throw lookup.error;
 const existing=lookup.data?.[0]||null;
 if(existing){
  const changed=['tin','phone','email','address','default_payment_method'].some(key=>text(existing[key])!==text(details[key]));
  if(!changed)return existing;
  const updated=await db.from('vendors').update(details).eq('id',existing.id).select().single();
  if(updated.error)throw updated.error;
  return updated.data;
 }
 const inserted=await db.from('vendors').insert({...details,created_by:state.user?.id||null}).select().single();
 if(inserted.error)throw inserted.error;
 return inserted.data;
}

function installStyles(){
 if(document.getElementById('wsLineItemSaveStyles'))return;
 const style=document.createElement('style');
 style.id='wsLineItemSaveStyles';
 style.textContent=`
 #billForm #itemRows [data-row]>.metrics,
 #billForm #itemRows [data-row]>.invoice-line-metrics{display:none!important}
 #billForm #itemRows [data-row]>.actions,
 #billForm #itemRows [data-row]>.invoice-line-actions{padding-top:0!important}
 #billForm .invoice-items-table-head{margin-bottom:0}
 #billForm .bill-row-save-note{display:flex;align-items:center;gap:8px;margin:0;color:var(--muted);font-size:12px;line-height:1.45}
 #billForm .bill-row-save-note i{color:var(--success)}
 `;
 document.head.appendChild(style);
}

function enhance(){
 const form=document.getElementById('billForm');
 if(!form||form.dataset.lineItemSave==='1')return;
 form.dataset.lineItemSave='1';
 installStyles();
 const savePanel=form.querySelector('.bill-save-panel,.invoice-footer-card');
 if(savePanel&&!savePanel.querySelector('.bill-row-save-note')){
  const note=document.createElement('p');
  note.className='bill-row-save-note';
  note.innerHTML='<i class="fas fa-circle-check"></i><span>Each completed item row will be saved as a separate bill record and used automatically in Products and Price Intelligence.</span>';
  savePanel.querySelector('.notice')?.before(note);
 }
 form.onsubmit=async event=>{
  event.preventDefault();
  const items=(Array.isArray(state.items)?state.items:[]).map(calculate).filter(item=>item.product);
  const notice=document.getElementById('saveNotice');
  const button=document.getElementById('saveBill');
  if(!items.length){if(notice)notice.textContent='Add at least one item.';return}
  if(button)button.disabled=true;
  if(notice)notice.textContent=state.editing?'Updating item records…':`Saving ${items.length} item record${items.length===1?'':'s'}…`;
  try{
   const vendor=await saveVendor(form);
   const data=new FormData(form);
   const shared={
    bill_date:data.get('bill_date'),
    bill_day:data.get('bill_date'),
    bill_no:text(data.get('bill_no')),
    vendor:text(data.get('vendor')),
    vendor_id:vendor?.id||null,
    tin:text(data.get('tin')),
    payment_status:data.get('payment_status')||'Pending',
    payment_method:data.get('payment_method')||null,
    notes:text(data.get('notes')),
    user_id:state.user?.id||null,
    updated_at:new Date().toISOString(),
    updated_by:state.user?.id||null
   };
   const records=items.map((item,index)=>({
    ...shared,
    bill_no:shared.bill_no,
    amount:String(item.line_total.toFixed(2)),
    subtotal:item.subtotal,
    net_amount:item.subtotal,
    gst_total:item.gst_amount,
    items:[item]
   }));
   let result;
   if(state.editing){
    const first=records[0];
    const updated=await db.from(TABLE).update(first).eq('id',state.editing.id).select();
    if(updated.error)throw updated.error;
    let inserted=[];
    if(records.length>1){
     const extra=await db.from(TABLE).insert(records.slice(1)).select();
     if(extra.error)throw extra.error;
     inserted=extra.data||[];
    }
    result=[...(updated.data||[]),...inserted];
   }else{
    const inserted=await db.from(TABLE).insert(records).select();
    if(inserted.error)throw inserted.error;
    result=inserted.data||[];
   }
   state.editing=null;
   window.__WS_LAST_SAVED_BILL__=result[0]||null;
   window.__WS_LAST_SAVED_BILL_ROWS__=result;
   await window.reloadBillsNow?.();
   window.show?.('bills');
  }catch(error){
   console.error('[line-item-bill-save]',error);
   if(notice)notice.textContent=error?.message||'Save failed';
  }finally{
   if(button)button.disabled=false;
  }
 };
}

const original=window.renderNewBill;
if(typeof original==='function'){
 window.renderNewBill=async function(...args){
  const result=await original.apply(this,args);
  enhance();
  return result;
 };
 if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
}
installStyles();
console.info('[line-item-bill-save] v1 ready');
})();