(()=>{
'use strict';
const el=id=>document.getElementById(id);
const text=value=>String(value??'').trim();
const escapeHtml=value=>typeof esc==='function'?esc(value):text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const canManage=()=>['admin','manager'].includes(text(state?.role).toLowerCase());
const vendorOf=row=>text(row?.vendor??row?.Vendor??row?.vendor_name??row?.supplier??row?.Supplier);

async function openNormalization(){
 if(!canManage())return;
 const panel=el('vendorEditor');
 if(!panel)return;
 panel.classList.remove('hidden');
 panel.innerHTML='<div class="page-head"><div><h2>Merge spelling variants</h2><div class="muted">Keep one original vendor name and combine every selected spelling variation into it.</div></div></div><div class="vendor-normalize-loading">Loading vendors…</div>';
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 const {data,error}=await db.from('vendors').select('id,name,phone,email,tin,address,default_payment_method').is('deleted_at',null).order('name');
 if(error){panel.innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;return;}
 const vendors=Array.isArray(data)?data:[];
 if(vendors.length<2){panel.innerHTML='<div class="empty">At least two vendor records are required.</div>';return;}
 const billCounts=new Map();
 (Array.isArray(state?.rows)?state.rows:[]).forEach(row=>{const key=vendorOf(row).toLowerCase();if(key)billCounts.set(key,(billCounts.get(key)||0)+1)});
 const option=v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} · ${billCounts.get(text(v.name).toLowerCase())||0} bills</option>`;
 const variant=v=>`<label class="vendor-variant-option" data-variant-row><input type="checkbox" name="variants" value="${escapeHtml(v.id)}"><span><strong>${escapeHtml(v.name)}</strong><small>${billCounts.get(text(v.name).toLowerCase())||0} bills</small></span></label>`;
 panel.innerHTML=`<div class="page-head"><div><h2>Merge spelling variants</h2><div class="muted">Example: keep “Aster” and select “Asters”, “Astr”, and other incorrect spellings.</div></div></div>
 <form id="vendorNormalizeForm" class="stack vendor-normalize-form">
  <label class="vendor-original-field">Original vendor name to keep<select class="field" name="target">${vendors.map(option).join('')}</select></label>
  <div class="vendor-variant-head"><div><strong>Select spelling variants</strong><span>These records will be archived after their bills are reassigned.</span></div><input class="field" id="vendorVariantSearch" placeholder="Search vendor spellings"></div>
  <div class="vendor-variant-list" id="vendorVariantList">${vendors.map(variant).join('')}</div>
  <div class="notice" id="vendorMergeSummary">Select at least one spelling variant.</div>
  <div class="notice" id="vendorNormalizeNotice"></div>
  <div class="actions"><button class="btn danger" type="submit">Merge into original name</button><button class="btn secondary" id="cancelVendorNormalize" type="button">Cancel</button></div>
 </form>`;
 const form=el('vendorNormalizeForm'),target=form.elements.target,list=el('vendorVariantList'),summary=el('vendorMergeSummary'),notice=el('vendorNormalizeNotice');
 const selected=()=>[...form.querySelectorAll('input[name="variants"]:checked')].map(input=>vendors.find(v=>String(v.id)===input.value)).filter(Boolean);
 const refresh=()=>{
  const targetId=target.value;
  form.querySelectorAll('input[name="variants"]').forEach(input=>{const disabled=input.value===targetId;input.disabled=disabled;if(disabled)input.checked=false;input.closest('[data-variant-row]')?.classList.toggle('is-disabled',disabled)});
  const variants=selected(),count=variants.reduce((sum,v)=>sum+(billCounts.get(text(v.name).toLowerCase())||0),0);
  summary.textContent=variants.length?`${variants.length} spelling variant${variants.length===1?'':'s'} selected · ${count} bill${count===1?'':'s'} will use the original name.`:'Select at least one spelling variant.';
 };
 target.addEventListener('change',refresh);
 form.querySelectorAll('input[name="variants"]').forEach(input=>input.addEventListener('change',refresh));
 el('vendorVariantSearch').addEventListener('input',event=>{const query=text(event.target.value).toLowerCase();list.querySelectorAll('[data-variant-row]').forEach(row=>row.hidden=!text(row.textContent).toLowerCase().includes(query))});
 el('cancelVendorNormalize').onclick=()=>{panel.classList.add('hidden');panel.innerHTML=''};
 refresh();
 form.onsubmit=async event=>{
  event.preventDefault();
  const original=vendors.find(v=>String(v.id)===target.value),variants=selected();
  if(!original){notice.textContent='Choose the original vendor name.';return;}
  if(!variants.length){notice.textContent='Select at least one spelling variant.';return;}
  const names=variants.map(v=>v.name).join(', ');
  if(!confirm(`Keep “${original.name}” and merge these spelling variants into it: ${names}?`))return;
  notice.textContent='Normalizing vendor names…';
  const now=new Date().toISOString();
  const mergedDetails={
   tin:original.tin||variants.find(v=>v.tin)?.tin||null,
   phone:original.phone||variants.find(v=>v.phone)?.phone||null,
   email:original.email||variants.find(v=>v.email)?.email||null,
   address:original.address||variants.find(v=>v.address)?.address||null,
   default_payment_method:original.default_payment_method||variants.find(v=>v.default_payment_method)?.default_payment_method||null,
   updated_at:now,updated_by:state.user?.id||null
  };
  let response=await db.from('vendors').update(mergedDetails).eq('id',original.id);
  if(response.error){notice.textContent=response.error.message;return;}
  for(const variant of variants){
   response=await db.from(TABLE).update({vendor_id:original.id,vendor:original.name,updated_at:now,updated_by:state.user?.id||null}).eq('vendor_id',variant.id);
   if(response.error){notice.textContent=`Could not move bills from ${variant.name}: ${response.error.message}`;return;}
   response=await db.from(TABLE).update({vendor_id:original.id,vendor:original.name,updated_at:now,updated_by:state.user?.id||null}).ilike('vendor',variant.name);
   if(response.error){notice.textContent=`Could not rename bills from ${variant.name}: ${response.error.message}`;return;}
   response=await db.from('vendors').update({is_active:false,deleted_at:now,updated_at:now,updated_by:state.user?.id||null}).eq('id',variant.id).select('id');
   if(response.error||!response.data?.length){notice.textContent=response.error?.message||`Could not archive ${variant.name}.`;return;}
  }
  notice.textContent=`Merged ${variants.length} spelling variant${variants.length===1?'':'s'} into ${original.name}.`;
  await window.reloadBillsNow?.();
  window.renderVendors?.();
 };
}

document.addEventListener('click',event=>{
 const button=event.target.closest('#mergeVendors');
 if(!button)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 openNormalization();
},true);

const renameButton=()=>{const button=el('mergeVendors');if(button&&button.textContent!=='Merge spelling variants')button.textContent='Merge spelling variants'};
document.addEventListener('DOMContentLoaded',renameButton,{once:true});
renameButton();
window.__WS_VENDOR_NAME_NORMALIZATION__={version:2,open:openNormalization};
})();