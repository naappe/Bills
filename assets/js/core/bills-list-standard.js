(()=>{
'use strict';
const VERSION=1;
const text=v=>String(v??'').trim();
const safe=v=>typeof esc==='function'?esc(v):text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(o,...keys)=>{for(const key of keys){if(o&&o[key]!=null&&text(o[key])!=='')return o[key]}return''};
const rows=()=>Array.isArray(state?.rows)?state.rows:[];
const rowById=id=>rows().find(row=>String(row.id)===String(id));
const firstItem=bill=>{let items=bill?.items;if(typeof items==='string'){try{items=JSON.parse(items)}catch{items=[]}}return Array.isArray(items)&&items.length?items[0]:null};
const itemName=item=>text(get(item,'product','description','name','item'))||'No description';
const packText=item=>{if(!item)return'';const pack=text(get(item,'pack_format','packing','pack'));const unit=text(get(item,'unit','purchase_unit'));const qty=Number(get(item,'qty','quantity')||0);return[pack,unit,qty?`Qty ${qty}`:''].filter(Boolean).join(' · ')};
const activity=bill=>{const raw=get(bill,'updated_at','modified_at','edited_at','last_edited_at','created_at');const date=new Date(raw||0);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})};
function installStyles(){
 if(document.getElementById('wsBillsListStandardStyles'))return;
 const style=document.createElement('style');
 style.id='wsBillsListStandardStyles';
 style.textContent=`
 .audit-bills{border-radius:16px!important;overflow:hidden!important}
 .audit-bills .audit-list-head,.audit-bills>article{grid-template-columns:minmax(110px,.85fr) minmax(150px,1fr) minmax(220px,1.55fr) minmax(170px,1.15fr) 110px 130px minmax(190px,auto)!important;column-gap:18px!important;align-items:center!important}
 .audit-bills .audit-list-head{padding:14px 20px!important;background:#f8faf9!important}
 .audit-bills .audit-list-head span{font-size:11px!important;line-height:1.3!important;font-weight:800!important;letter-spacing:.065em!important;color:#718096!important}
 .audit-bills>article{padding:15px 20px!important;min-height:76px!important}
 .audit-bills>article>span{min-width:0!important;font-size:13px!important;line-height:1.4!important;color:#53657a!important}
 .audit-bills>article>span>strong{font-size:13px!important;line-height:1.4!important;font-weight:700!important;color:#0f1e4c!important;overflow-wrap:anywhere!important}
 .audit-bill-date{display:grid!important;gap:3px!important}
 .audit-bill-date small,.audit-bill-description small{display:block!important;font-size:11px!important;line-height:1.35!important;color:#7b8796!important;font-weight:500!important}
 .audit-bill-description{display:grid!important;gap:4px!important;min-width:0!important}
 .audit-bill-description strong{font-size:14px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 .audit-row-actions{display:flex!important;gap:7px!important;justify-content:flex-end!important;flex-wrap:nowrap!important}
 .audit-row-actions .btn{min-height:36px!important;padding:7px 11px!important;font-size:12px!important;font-weight:700!important;border-radius:9px!important}
 .audit-status{font-size:10px!important;line-height:1!important;padding:8px 11px!important;letter-spacing:.04em!important}
 @media(max-width:1180px){.audit-bills .audit-list-head,.audit-bills>article{grid-template-columns:105px 140px minmax(190px,1.5fr) minmax(145px,1fr) 100px 120px}.audit-bills .audit-list-head span:last-child,.audit-bills>article>.audit-row-actions{grid-column:1/-1;justify-content:flex-start!important}.audit-bills>article{row-gap:10px}}
 @media(max-width:760px){.audit-bills .audit-list-head{display:none!important}.audit-bills>article{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;padding:16px!important}.audit-bill-description,.audit-row-actions{grid-column:1/-1!important}.audit-row-actions{justify-content:flex-start!important;flex-wrap:wrap!important}}
 `;
 document.head.appendChild(style);
}
function standardize(){
 const list=document.querySelector('#auditBillResults .audit-bills');
 if(!list)return;
 const head=list.querySelector('.audit-list-head');
 if(head&&!head.dataset.standardized){
  head.dataset.standardized='1';
  head.innerHTML='<span>Invoice</span><span>Bill date</span><span>Description</span><span>Vendor</span><span>Status</span><span>Amount</span><span>Actions</span>';
 }
 list.querySelectorAll(':scope > article').forEach(article=>{
  const action=article.querySelector('.audit-row-actions');
  const id=action?.querySelector('[data-open],[data-edit],[data-delete]')?.dataset.open||action?.querySelector('[data-edit]')?.dataset.edit||action?.querySelector('[data-delete]')?.dataset.delete;
  const bill=rowById(id);
  if(!bill||article.dataset.standardized==='1')return;
  const cells=[...article.children];
  if(cells.length<7)return;
  const invoice=cells[0]?.textContent?.trim()||'—';
  const billDate=cells[1]?.textContent?.trim()||'No bill date';
  const vendor=cells[3]?.textContent?.trim()||'Unknown supplier';
  const statusNode=cells[4]?.querySelector('.audit-status')?.cloneNode(true);
  const amount=cells[5]?.textContent?.trim()||'MVR 0.00';
  const item=firstItem(bill);
  article.innerHTML=`<span><strong>${safe(invoice)}</strong></span><span class="audit-bill-date"><strong>${safe(billDate)}</strong><small>Edited ${safe(activity(bill))}</small></span><span class="audit-bill-description"><strong>${safe(itemName(item))}</strong><small>${safe(packText(item)||'No packing details')}</small></span><span><strong>${safe(vendor)}</strong></span><span class="audit-status-slot"></span><span><strong>${safe(amount)}</strong></span>`;
  const statusSlot=article.querySelector('.audit-status-slot');
  if(statusNode)statusSlot.appendChild(statusNode);
  if(action)article.appendChild(action);
  article.dataset.standardized='1';
 });
}
function enhance(){
 installStyles();
 standardize();
 const results=document.getElementById('auditBillResults');
 if(!results||results.dataset.standardObserver==='1')return;
 results.dataset.standardObserver='1';
 const observer=new MutationObserver(()=>standardize());
 observer.observe(results,{childList:true,subtree:true});
}
const previous=window.renderBills;
if(typeof previous==='function'){
 window.renderBills=function(...args){const result=previous.apply(this,args);enhance();return result};
 if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.bills=window.renderBills;
}
installStyles();
console.info('[bills-list-standard] v1 ready');
})();