(()=>{
'use strict';
const original=window.renderNewBill;
if(typeof original!=='function')return;

const css=`
.bill-header-card{overflow:visible}
.bill-primary-grid{display:grid;grid-template-columns:minmax(170px,.72fr) minmax(280px,1.45fr) minmax(190px,.85fr);gap:18px;padding:24px 25px}
.bill-primary-grid>label,.bill-detail-grid>label{display:grid;gap:8px;margin:0;min-width:0}
.bill-disclosures{display:grid;gap:12px;padding:0 25px 25px}
.bill-disclosure{border:1px solid var(--line);border-radius:14px;background:var(--surface-soft);overflow:visible;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
.bill-disclosure[open]{border-color:#cadbd1;background:#fff;box-shadow:0 10px 24px rgba(15,30,76,.06)}
.bill-disclosure summary{list-style:none;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:13px;min-height:64px;padding:12px 16px;cursor:pointer;user-select:none}
.bill-disclosure summary::-webkit-details-marker{display:none}
.bill-disclosure summary>span:nth-child(2){display:grid;gap:3px;min-width:0}
.bill-disclosure summary strong{font-size:14px;line-height:1.35;color:var(--header)}
.bill-disclosure summary small{font-size:12px;line-height:1.45;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bill-disclosure-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:var(--blue-soft);color:var(--blue-dark)}
.bill-disclosure-icon.payment{background:var(--gold-soft);color:var(--warning)}
.bill-disclosure-chevron{font-size:12px;color:var(--muted);transition:transform .2s ease}
.bill-disclosure[open] .bill-disclosure-chevron{transform:rotate(180deg)}
.bill-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:4px 16px 18px;border-top:1px solid var(--line)}
.bill-detail-grid>label{padding-top:16px}
.bill-payment-grid{grid-template-columns:repeat(2,minmax(180px,1fr));max-width:640px}
.bill-disclosure summary:focus-visible{outline:3px solid rgba(13,98,243,.18);outline-offset:-3px;border-radius:13px}
@media(max-width:1000px){.bill-primary-grid{grid-template-columns:1fr 1fr}.bill-primary-grid .vendor-field{grid-column:span 2}.bill-detail-grid{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.bill-primary-grid{grid-template-columns:1fr;padding:18px}.bill-primary-grid .vendor-field{grid-column:auto}.bill-disclosures{padding:0 18px 18px}.bill-detail-grid,.bill-payment-grid{grid-template-columns:1fr}.bill-disclosure summary{min-height:60px;padding:11px 13px}}
`;

function ensureStyles(){
 if(document.getElementById('wsBillDisclosureStyles'))return;
 const style=document.createElement('style');
 style.id='wsBillDisclosureStyles';
 style.textContent=css;
 document.head.appendChild(style);
}

function labelFor(form,name){return form.elements[name]?.closest('label')||null}
function detailsBlock({id,title,summary,icon,labels,className=''}){
 const details=document.createElement('details');
 details.className=`bill-disclosure ${className}`.trim();
 details.id=id;
 details.innerHTML=`<summary><span class="bill-disclosure-icon ${className==='payment'?'payment':''}"><i class="fas ${icon}"></i></span><span><strong>${title}</strong><small data-summary>${summary}</small></span><i class="fas fa-chevron-down bill-disclosure-chevron"></i></summary><div class="bill-detail-grid ${className==='payment'?'bill-payment-grid':''}"></div>`;
 const grid=details.querySelector('.bill-detail-grid');
 labels.filter(Boolean).forEach(label=>grid.appendChild(label));
 return details;
}

function enhance(){
 const form=document.getElementById('billForm');
 if(!form||form.dataset.disclosuresReady==='1')return;
 const firstCard=form.querySelector(':scope > section.card');
 const oldGrid=firstCard?.querySelector(':scope > .form-grid');
 if(!firstCard||!oldGrid)return;

 const billDate=labelFor(form,'bill_date');
 const vendor=labelFor(form,'vendor');
 const billNo=labelFor(form,'bill_no');
 const tin=labelFor(form,'tin');
 const phone=labelFor(form,'vendor_phone');
 const email=labelFor(form,'vendor_email');
 const address=labelFor(form,'vendor_address');
 const payment=labelFor(form,'payment_status');
 const method=labelFor(form,'payment_method');
 if(!billDate||!vendor||!billNo)return;

 const primary=document.createElement('div');
 primary.className='bill-primary-grid';
 primary.append(billDate,vendor,billNo);

 const vendorDetails=detailsBlock({id:'vendorDetails',title:'Vendor details',summary:'TIN, phone, email and address',icon:'fa-building',labels:[tin,phone,email,address]});
 const paymentDetails=detailsBlock({id:'paymentDetails',title:'Payment details',summary:'Pending · Method not specified',icon:'fa-credit-card',labels:[payment,method],className:'payment'});
 const disclosures=document.createElement('div');
 disclosures.className='bill-disclosures';
 disclosures.append(vendorDetails,paymentDetails);

 oldGrid.remove();
 firstCard.classList.add('bill-header-card');
 firstCard.append(primary,disclosures);
 form.dataset.disclosuresReady='1';

 const refresh=()=>{
  const contact=[form.elements.tin?.value&&`TIN ${form.elements.tin.value}`,form.elements.vendor_phone?.value,form.elements.vendor_email?.value].filter(Boolean);
  vendorDetails.querySelector('[data-summary]').textContent=contact.length?contact.slice(0,2).join(' · '):'TIN, phone, email and address';
  paymentDetails.querySelector('[data-summary]').textContent=`${form.elements.payment_status?.value||'Pending'} · ${form.elements.payment_method?.value||'Method not specified'}`;
 };
 ['tin','vendor_phone','vendor_email','vendor_address','payment_status','payment_method'].forEach(name=>{
  const field=form.elements[name];
  field?.addEventListener('input',refresh);
  field?.addEventListener('change',refresh);
 });
 const hasVendorData=[tin,phone,email,address].some(label=>label?.querySelector('input')?.value?.trim());
 vendorDetails.open=hasVendorData;
 paymentDetails.open=(form.elements.payment_status?.value||'Pending')!=='Pending'||Boolean(form.elements.payment_method?.value);
 refresh();
}

ensureStyles();
window.renderNewBill=async(...args)=>{const result=await original(...args);enhance();return result};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
console.info('[add-bill-disclosures] ready');
})();