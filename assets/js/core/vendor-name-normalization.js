(()=>{
'use strict';
const el=id=>document.getElementById(id);
const text=value=>String(value??'').trim();
const escapeHtml=value=>typeof esc==='function'?esc(value):text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const canManage=()=>['admin','manager'].includes(text(state?.role).toLowerCase());
const vendorOf=row=>text(row?.vendor??row?.Vendor??row?.vendor_name??row?.supplier??row?.Supplier);
const normalize=value=>text(value).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();
const compact=value=>normalize(value).replace(/\s+/g,'');
const levenshtein=(a,b)=>{a=compact(a);b=compact(b);const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j],cost=a[i-1]===b[j-1]?0:1;row[j]=Math.min(row[j]+1,row[j-1]+1,prev+cost);prev=old}}return row[b.length]};
const similarity=(a,b)=>{const x=compact(a),y=compact(b);if(!x||!y)return 0;if(x===y)return 1;if(x.includes(y)||y.includes(x))return .9;return 1-(levenshtein(x,y)/Math.max(x.length,y.length))};

async function openNormalization(){
 if(!canManage())return;
 const panel=el('vendorEditor');
 if(!panel)return;
 panel.classList.remove('hidden');
 panel.innerHTML='<div class="page-head"><div><h2>Correct vendor names</h2><div class="muted">Combine misspelled vendor names into one correct supplier record.</div></div></div><div class="vendor-normalize-loading">Loading vendors…</div>';
 panel.scrollIntoView({behavior:'smooth',block:'start'});
 const {data,error}=await db.from('vendors').select('id,name,phone,email,tin,address,default_payment_method').is('deleted_at',null).order('name');
 if(error){panel.innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;return;}
 const vendors=Array.isArray(data)?data:[];
 if(vendors.length<2){panel.innerHTML='<div class="empty">At least two vendor records are required.</div>';return;}
 const billCounts=new Map();
 (Array.isArray(state?.rows)?state.rows:[]).forEach(row=>{const key=vendorOf(row).toLowerCase();if(key)billCounts.set(key,(billCounts.get(key)||0)+1)});
 const countFor=v=>billCounts.get(text(v.name).toLowerCase())||0;
 const option=v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)} · ${countFor(v)} bills</option>`;
 panel.innerHTML=`<div class="page-head"><div><h2>Correct vendor names</h2><div class="muted">Choose the correct name, then select the misspelled versions that should become that name.</div></div></div>
 <form id="vendorNormalizeForm" class="vendor-normalize-form">
  <section class="vendor-step vendor-target-step">
   <div class="vendor-step-number">1</div>
   <div class="vendor-step-content"><label for="vendorOriginal">Correct vendor name to keep</label><select class="field" id="vendorOriginal" name="target">${vendors.map(option).join('')}</select><p>This record stays active and receives all selected bills.</p></div>
  </section>
  <section class="vendor-step vendor-variants-step">
   <div class="vendor-step-number">2</div>
   <div class="vendor-step-content">
    <div class="vendor-variant-toolbar"><div><label for="vendorVariantSearch">Select incorrect spellings</label><p id="vendorSuggestionText">Likely matches are shown first.</p></div><input class="field" id="vendorVariantSearch" placeholder="Search names, for example: astr"></div>
    <div class="vendor-selected-strip hidden" id="vendorSelectedStrip"></div>
    <div class="vendor-variant-list" id="vendorVariantList"></div>
    <button class="btn secondary small vendor-show-all" id="vendorShowAll" type="button">Show all vendors</button>
   </div>
  </section>
  <div class="vendor-merge-footer">
   <div><strong id="vendorMergeSummary">No variants selected</strong><span id="vendorMergeDetail">Choose one or more incorrect spellings.</span></div>
   <div class="actions"><button class="btn secondary" id="cancelVendorNormalize" type="button">Cancel</button><button class="btn" id="vendorMergeSubmit" type="submit" disabled>Merge selected names</button></div>
  </div>
  <div class="notice hidden" id="vendorNormalizeNotice"></div>
 </form>`;
 const form=el('vendorNormalizeForm'),target=form.elements.target,list=el('vendorVariantList'),search=el('vendorVariantSearch'),summary=el('vendorMergeSummary'),detail=el('vendorMergeDetail'),notice=el('vendorNormalizeNotice'),submit=el('vendorMergeSubmit'),selectedStrip=el('vendorSelectedStrip'),showAllButton=el('vendorShowAll');
 let showAll=false;
 const selectedIds=new Set();
 const selected=()=>[...selectedIds].map(id=>vendors.find(v=>String(v.id)===id)).filter(Boolean);
 const ranked=()=>{const original=vendors.find(v=>String(v.id)===target.value);return vendors.filter(v=>String(v.id)!==String(original?.id)).map(v=>({...v,score:similarity(original?.name||'',v.name)})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))};
 const renderList=()=>{
  const query=normalize(search.value),items=ranked().filter(v=>!query||normalize(v.name).includes(query));
  const visible=query||showAll?items:items.filter(v=>v.score>=.45).slice(0,12);
  el('vendorSuggestionText').textContent=query?`${visible.length} matching vendor${visible.length===1?'':'s'} found.`:showAll?'All vendors are shown.':'Likely spelling matches are shown first.';
  showAllButton.classList.toggle('hidden',Boolean(query)||showAll||items.length<=visible.length);
  list.innerHTML=visible.length?visible.map(v=>`<label class="vendor-variant-option ${selectedIds.has(String(v.id))?'is-selected':''}"><input type="checkbox" value="${escapeHtml(v.id)}" ${selectedIds.has(String(v.id))?'checked':''}><span class="vendor-option-main"><strong>${escapeHtml(v.name)}</strong><small>${countFor(v)} bill${countFor(v)===1?'':'s'}</small></span>${v.score>=.68?'<span class="vendor-match-badge">Likely match</span>':''}</label>`).join(''):'<div class="vendor-empty-result">No vendor names match this search.</div>';
  list.querySelectorAll('input[type="checkbox"]').forEach(input=>input.onchange=()=>{input.checked?selectedIds.add(input.value):selectedIds.delete(input.value);refreshSummary();renderList()});
 };
 const refreshSummary=()=>{
  const variants=selected(),billCount=variants.reduce((sum,v)=>sum+countFor(v),0);
  submit.disabled=!variants.length;
  summary.textContent=variants.length?`${variants.length} name${variants.length===1?'':'s'} selected`:'No variants selected';
  detail.textContent=variants.length?`${billCount} bill${billCount===1?'':'s'} will be reassigned to ${target.options[target.selectedIndex]?.text.split(' · ')[0]||'the correct vendor'}.`:'Choose one or more incorrect spellings.';
  selectedStrip.classList.toggle('hidden',!variants.length);
  selectedStrip.innerHTML=variants.map(v=>`<button type="button" data-remove="${escapeHtml(v.id)}">${escapeHtml(v.name)} <span>×</span></button>`).join('');
  selectedStrip.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{selectedIds.delete(button.dataset.remove);refreshSummary();renderList()});
 };
 target.onchange=()=>{selectedIds.delete(String(target.value));showAll=false;search.value='';renderList();refreshSummary()};
 search.oninput=renderList;
 showAllButton.onclick=()=>{showAll=true;renderList()};
 el('cancelVendorNormalize').onclick=()=>{panel.classList.add('hidden');panel.innerHTML=''};
 renderList();refreshSummary();
 form.onsubmit=async event=>{
  event.preventDefault();
  const original=vendors.find(v=>String(v.id)===target.value),variants=selected();
  if(!original||!variants.length)return;
  const names=variants.map(v=>v.name).join(', ');
  if(!confirm(`Keep “${original.name}” and replace these vendor names: ${names}?`))return;
  submit.disabled=true;submit.textContent='Merging…';notice.classList.add('hidden');
  const now=new Date().toISOString();
  const mergedDetails={tin:original.tin||variants.find(v=>v.tin)?.tin||null,phone:original.phone||variants.find(v=>v.phone)?.phone||null,email:original.email||variants.find(v=>v.email)?.email||null,address:original.address||variants.find(v=>v.address)?.address||null,default_payment_method:original.default_payment_method||variants.find(v=>v.default_payment_method)?.default_payment_method||null,updated_at:now,updated_by:state.user?.id||null};
  let response=await db.from('vendors').update(mergedDetails).eq('id',original.id);
  if(response.error){notice.textContent=response.error.message;notice.classList.remove('hidden');submit.disabled=false;submit.textContent='Merge selected names';return;}
  for(const variant of variants){
   response=await db.from(TABLE).update({vendor_id:original.id,vendor:original.name,updated_at:now,updated_by:state.user?.id||null}).eq('vendor_id',variant.id);
   if(!response.error)response=await db.from(TABLE).update({vendor_id:original.id,vendor:original.name,updated_at:now,updated_by:state.user?.id||null}).ilike('vendor',variant.name);
   if(!response.error)response=await db.from('vendors').update({is_active:false,deleted_at:now,updated_at:now,updated_by:state.user?.id||null}).eq('id',variant.id).select('id');
   if(response.error||!response.data?.length){notice.textContent=response.error?.message||`Could not archive ${variant.name}.`;notice.classList.remove('hidden');submit.disabled=false;submit.textContent='Merge selected names';return;}
  }
  await window.reloadBillsNow?.();
  window.renderVendors?.();
 };
}

document.addEventListener('click',event=>{const button=event.target.closest('#mergeVendors');if(!button)return;event.preventDefault();event.stopImmediatePropagation();openNormalization()},true);
const renameButton=()=>{const button=el('mergeVendors');if(button&&button.textContent!=='Correct vendor names')button.textContent='Correct vendor names'};
document.addEventListener('DOMContentLoaded',renameButton,{once:true});renameButton();
window.__WS_VENDOR_NAME_NORMALIZATION__={version:3,open:openNormalization};
})();