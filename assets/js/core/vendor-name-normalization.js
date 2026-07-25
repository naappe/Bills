(()=>{
'use strict';
const el=id=>document.getElementById(id);
const text=value=>String(value??'').trim();
const escapeHtml=value=>typeof esc==='function'?esc(value):text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const canManage=()=>['admin','manager'].includes(text(state?.role).toLowerCase());
const vendorOf=row=>text(row?.vendor??row?.Vendor??row?.vendor_name??row?.supplier??row?.Supplier);

async function openNormalization(){
 if(!canManage())return;
 const panel=el('vendorEditor');if(!panel)return;
 panel.classList.remove('hidden');
 panel.innerHTML='<div class="page-head"><div><h2>Correct vendor names</h2><div class="muted">Select the duplicate vendor records, type the correct name, and choose the record to keep.</div></div></div><div class="vendor-normalize-loading">Loading vendors…</div>';
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 const {data,error}=await db.from('vendors').select('id,name,phone,email,tin,address,default_payment_method').is('deleted_at',null).order('name');
 if(error){panel.innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;return}
 const vendors=Array.isArray(data)?data:[];
 if(vendors.length<2){panel.innerHTML='<div class="empty">At least two vendor records are required.</div>';return}
 const counts=new Map();
 (Array.isArray(state?.rows)?state.rows:[]).forEach(row=>{const key=vendorOf(row).toLowerCase();if(key)counts.set(key,(counts.get(key)||0)+1)});
 const countFor=v=>counts.get(text(v.name).toLowerCase())||0;
 const row=v=>`<label class="vendor-pick-row" data-vendor-pick><input type="checkbox" value="${escapeHtml(v.id)}"><span><strong>${escapeHtml(v.name)}</strong><small>${countFor(v)} bill${countFor(v)===1?'':'s'}</small></span></label>`;
 panel.innerHTML=`<div class="page-head"><div><h2>Correct vendor names</h2><div class="muted">Example: select “Asters”, “Astr”, and “Aster”; type “Aster”; then mark which record should remain.</div></div></div>
 <form id="vendorNormalizeForm" class="vendor-normalize-form simple-vendor-merge">
  <section class="vendor-correction-block">
   <div class="vendor-block-head"><div><span class="step-chip">1</span><h3>Select vendor records</h3><p>Open the list and mark every spelling that belongs to the same supplier.</p></div><button class="btn secondary" id="vendorPickerToggle" type="button">Choose vendors <span id="vendorSelectedCount">0</span></button></div>
   <div class="vendor-picker-panel hidden" id="vendorPickerPanel"><input class="field" id="vendorPickerSearch" placeholder="Search vendor names"><div class="vendor-picker-list" id="vendorPickerList">${vendors.map(row).join('')}</div></div>
   <div class="vendor-selection-chips" id="vendorSelectionChips"><span class="muted">No vendors selected.</span></div>
  </section>
  <section class="vendor-correction-block">
   <div class="vendor-block-head"><div><span class="step-chip">2</span><h3>Enter the correct vendor name</h3><p>This name will be written on all selected bills.</p></div></div>
   <input class="field vendor-correct-name" id="vendorCorrectName" name="correct_name" placeholder="Correct vendor name" autocomplete="off">
  </section>
  <section class="vendor-correction-block">
   <div class="vendor-block-head"><div><span class="step-chip">3</span><h3>Choose the vendor record to keep</h3><p>The selected master record keeps its contact details. The other selected records will be archived.</p></div></div>
   <div class="vendor-master-list" id="vendorMasterList"><div class="empty compact">Select vendors first.</div></div>
  </section>
  <div class="vendor-merge-footer"><div><strong id="vendorMergeSummary">Nothing selected</strong><span id="vendorMergeDetail">Choose at least two vendor records.</span></div><div class="actions"><button class="btn secondary" id="cancelVendorNormalize" type="button">Cancel</button><button class="btn" id="vendorMergeSubmit" type="submit" disabled>Apply correct name</button></div></div>
  <div class="notice hidden" id="vendorNormalizeNotice"></div>
 </form>`;
 const form=el('vendorNormalizeForm'),picker=el('vendorPickerPanel'),list=el('vendorPickerList'),search=el('vendorPickerSearch'),chips=el('vendorSelectionChips'),masterList=el('vendorMasterList'),correctName=el('vendorCorrectName'),submit=el('vendorMergeSubmit'),summary=el('vendorMergeSummary'),detail=el('vendorMergeDetail'),notice=el('vendorNormalizeNotice'),countLabel=el('vendorSelectedCount');
 const selectedIds=new Set();
 const selected=()=>[...selectedIds].map(id=>vendors.find(v=>String(v.id)===id)).filter(Boolean);
 const refresh=()=>{
  const items=selected();countLabel.textContent=String(items.length);
  chips.innerHTML=items.length?items.map(v=>`<button type="button" data-remove="${escapeHtml(v.id)}">${escapeHtml(v.name)} <span>×</span></button>`).join(''):'<span class="muted">No vendors selected.</span>';
  chips.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{selectedIds.delete(button.dataset.remove);const input=list.querySelector(`input[value="${CSS.escape(button.dataset.remove)}"]`);if(input)input.checked=false;refresh()});
  masterList.innerHTML=items.length?items.map((v,index)=>`<label class="vendor-master-option"><input type="radio" name="master_vendor" value="${escapeHtml(v.id)}" ${index===0?'checked':''}><span><strong>${escapeHtml(v.name)}</strong><small>${countFor(v)} bill${countFor(v)===1?'':'s'}</small></span><em>Keep this record</em></label>`).join(''):'<div class="empty compact">Select vendors first.</div>';
  const bills=items.reduce((sum,v)=>sum+countFor(v),0),ready=items.length>=2&&Boolean(text(correctName.value))&&Boolean(form.elements.master_vendor?.value);
  submit.disabled=!ready;
  summary.textContent=items.length?`${items.length} vendor records selected`:'Nothing selected';
  detail.textContent=items.length?`${bills} bill${bills===1?'':'s'} will use “${text(correctName.value)||'the correct name'}”.`:'Choose at least two vendor records.';
 };
 el('vendorPickerToggle').onclick=()=>picker.classList.toggle('hidden');
 list.querySelectorAll('input[type="checkbox"]').forEach(input=>input.onchange=()=>{input.checked?selectedIds.add(input.value):selectedIds.delete(input.value);refresh()});
 search.oninput=()=>{const query=text(search.value).toLowerCase();list.querySelectorAll('[data-vendor-pick]').forEach(item=>item.hidden=!text(item.textContent).toLowerCase().includes(query))};
 correctName.oninput=refresh;
 masterList.addEventListener('change',refresh);
 el('cancelVendorNormalize').onclick=()=>{panel.classList.add('hidden');panel.innerHTML=''};
 refresh();
 form.onsubmit=async event=>{
  event.preventDefault();const items=selected(),masterId=form.elements.master_vendor?.value,master=vendors.find(v=>String(v.id)===String(masterId)),newName=text(correctName.value);
  if(items.length<2||!master||!newName)return;
  const duplicateNames=items.filter(v=>String(v.id)!==String(master.id)).map(v=>v.name).join(', ');
  if(!confirm(`Keep “${master.name}” as the master record, rename it to “${newName}”, and merge: ${duplicateNames}?`))return;
  submit.disabled=true;submit.textContent='Applying…';notice.classList.add('hidden');const now=new Date().toISOString();
  const mergedDetails={name:newName,tin:master.tin||items.find(v=>v.tin)?.tin||null,phone:master.phone||items.find(v=>v.phone)?.phone||null,email:master.email||items.find(v=>v.email)?.email||null,address:master.address||items.find(v=>v.address)?.address||null,default_payment_method:master.default_payment_method||items.find(v=>v.default_payment_method)?.default_payment_method||null,updated_at:now,updated_by:state.user?.id||null};
  let response=await db.from('vendors').update(mergedDetails).eq('id',master.id).select('id');
  if(response.error||!response.data?.length){notice.textContent=response.error?.message||'Master vendor could not be updated.';notice.classList.remove('hidden');submit.disabled=false;submit.textContent='Apply correct name';return}
  for(const vendor of items){
   response=await db.from(TABLE).update({vendor_id:master.id,vendor:newName,updated_at:now,updated_by:state.user?.id||null}).eq('vendor_id',vendor.id);
   if(!response.error)response=await db.from(TABLE).update({vendor_id:master.id,vendor:newName,updated_at:now,updated_by:state.user?.id||null}).ilike('vendor',vendor.name);
   if(response.error){notice.textContent=`Could not update bills for ${vendor.name}: ${response.error.message}`;notice.classList.remove('hidden');submit.disabled=false;submit.textContent='Apply correct name';return}
   if(String(vendor.id)!==String(master.id)){
    response=await db.from('vendors').update({is_active:false,deleted_at:now,updated_at:now,updated_by:state.user?.id||null}).eq('id',vendor.id).select('id');
    if(response.error||!response.data?.length){notice.textContent=response.error?.message||`Could not archive ${vendor.name}.`;notice.classList.remove('hidden');submit.disabled=false;submit.textContent='Apply correct name';return}
   }
  }
  await window.reloadBillsNow?.();window.renderVendors?.();
 };
}

document.addEventListener('click',event=>{const button=event.target.closest('#mergeVendors');if(!button)return;event.preventDefault();event.stopImmediatePropagation();openNormalization()},true);
const renameButton=()=>{const button=el('mergeVendors');if(button&&button.textContent!=='Correct vendor names')button.textContent='Correct vendor names'};
document.addEventListener('DOMContentLoaded',renameButton,{once:true});renameButton();
window.__WS_VENDOR_NAME_NORMALIZATION__={version:4,open:openNormalization};
})();