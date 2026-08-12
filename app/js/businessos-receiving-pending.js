import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sbPending=createClient(
  'https://tmupbruwmwlrmewhoodn.supabase.co',
  'sb_publishable_LAn1liS2zqMqlB33IQJxIw_NbgWKix1',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'white-saffron-erp-auth'}}
);

const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};

async function identity(){
  const{data:{session}}=await sbPending.auth.getSession();
  if(!session)throw new Error('Please sign in first.');
  const r=await sbPending.from('user_roles').select('role,is_active').eq('user_id',session.user.id).eq('is_active',true).maybeSingle();
  if(r.error)throw r.error;
  return String(r.data?.role||'viewer').toLowerCase();
}

function toast(text,kind='good'){
  const box=q('#toasts');if(!box)return;
  const t=document.createElement('div');t.className=`toast ${kind}`;t.textContent=text;box.append(t);setTimeout(()=>t.remove(),4500);
}

async function postForm(e){
  const form=e.target;
  if(!(form instanceof HTMLFormElement)||form.id!=='bosGRNForm')return;
  e.preventDefault();e.stopImmediatePropagation();

  const button=q('#bosPostGRN');if(button)button.disabled=true;
  try{
    const role=await identity();
    const poNo=q('#modalBody .bos-detail-grid>div:first-child strong')?.textContent?.trim();
    if(!poNo)throw new Error('Purchase order number could not be resolved.');
    const poRes=await sbPending.from('purchase_orders').select('*').eq('po_no',poNo).maybeSingle();
    if(poRes.error)throw poRes.error;
    if(!poRes.data)throw new Error('Purchase order not found.');

    const itemRes=await sbPending.from('purchase_order_items').select('*').eq('purchase_order_id',poRes.data.id).order('sort_order').order('id');
    if(itemRes.error)throw itemRes.error;
    const poItems=itemRes.data||[];
    const rows=qa('#modalBody .bos-grn-lines tbody tr');
    const lines=[];

    rows.forEach((row,i)=>{
      const item=poItems[i];if(!item)return;
      const accepted=n(row.querySelector('[data-grn-field="received_quantity"]')?.value);
      const rejected=n(row.querySelector('[data-grn-field="rejected_quantity"]')?.value);
      const notes=row.querySelector('[data-grn-field="notes"]')?.value?.trim()||null;
      if(accepted>0||rejected>0)lines.push({purchase_order_item_id:item.id,received_quantity:accepted,rejected_quantity:rejected,notes});
    });
    if(!lines.length)throw new Error('Enter a received or rejected quantity on at least one line.');

    const acceptOver=!!q('#bosAllowOver')?.checked;
    for(const line of lines){
      const item=poItems.find(x=>String(x.id)===String(line.purchase_order_item_id));
      const remaining=Math.max(n(item.quantity)-n(item.received_quantity),0);
      if(line.received_quantity>remaining){
        if(role==='staff')throw new Error('Staff cannot accept an over-delivery.');
        if(!acceptOver)throw new Error('Tick the over-delivery acceptance box before posting.');
      }
    }

    const payload={
      receipt_date:q('#bosGRNDate')?.value||new Date().toISOString().slice(0,10),
      supplier_delivery_no:q('#bosGRNDelivery')?.value?.trim()||'',
      location:q('#bosGRNLocation')?.value?.trim()||'',
      notes:q('#bosGRNNotes')?.value?.trim()||''
    };
    const result=await sbPending.rpc('post_goods_receipt',{
      p_order_id:poRes.data.id,
      p_receipt:payload,
      p_items:lines,
      p_allow_over_delivery:acceptOver
    });
    if(result.error)throw result.error;

    q('#modal')?.classList.add('hidden');
    toast('Goods receipt posted. Uninitialized products are safely marked inventory pending.');
    const nav=q('[data-bos-receiving="receipts"]');
    if(nav)setTimeout(()=>nav.click(),80);
  }catch(err){
    toast(err?.message||String(err),'danger');
  }finally{
    if(button)button.disabled=false;
  }
}

async function pendingSummary(){
  if((location.hash||'')!=='#goods-receipts')return;
  const ws=q('#workspace');if(!ws||q('#bosPendingInventoryAlert'))return;
  const r=await sbPending.from('goods_receipt_items').select('id,supply_id,received_quantity,inventory_posted').eq('inventory_posted',false).gt('received_quantity',0);
  if(r.error||!r.data?.length)return;

  const alert=document.createElement('div');
  alert.id='bosPendingInventoryAlert';alert.className='alert warn';
  alert.innerHTML=`<strong>Inventory posting pending</strong><span>${r.data.length} accepted GRN line${r.data.length===1?' is':'s are'} waiting for an opening stock count. The receipt and PO quantities are recorded; stock has not been increased for those lines.</span><button class="btn" id="bosPostEligibleInventory">Post eligible inventory</button>`;
  const head=ws.querySelector('.bos-page-head');
  if(head)head.insertAdjacentElement('afterend',alert);else ws.prepend(alert);

  q('#bosPostEligibleInventory')?.addEventListener('click',async()=>{
    const products=await sbPending.from('supply').select('id,stock_tracking_active').in('id',r.data.map(x=>x.supply_id));
    if(products.error){toast(products.error.message,'danger');return}
    const tracked=new Set((products.data||[]).filter(x=>x.stock_tracking_active).map(x=>String(x.id)));
    const eligible=r.data.filter(x=>tracked.has(String(x.supply_id)));
    if(!eligible.length){toast('Initialize an opening stock count first.','danger');return}
    let posted=0;
    for(const item of eligible){
      const p=await sbPending.rpc('post_pending_goods_receipt_inventory',{p_receipt_item_id:item.id});
      if(!p.error)posted++;
    }
    toast(`${posted} pending inventory line${posted===1?'':'s'} posted`);
    alert.remove();
    pendingSummary();
  });
}

function adaptForm(){
  qa('#modalBody .bos-stock-warning small').forEach(s=>{
    if(s.textContent!=='GRN will post; inventory stays pending until opening count'){
      s.textContent='GRN will post; inventory stays pending until opening count';
    }
  });
}

document.addEventListener('submit',postForm,true);

const start=()=>{
  const body=q('body');if(!body){setTimeout(start,100);return}
  let scheduled=false;
  const run=()=>{scheduled=false;adaptForm();pendingSummary()};
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(run)};
  new MutationObserver(schedule).observe(body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
