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
#content .command-eyebrow,#content .command-period,#content .command-card small,#content .command-kpis small,#content .v4-dashboard-bottom small,#content .v4-dashboard-bottom header span,#content .payment-breakdown span,#content .command-supplier-list b,#content .command-supplier-list span{font-size:12px!important;line-height:1.45}
#content .command-kpis p,#content .command-card p,#content .command-hero p{font-size:13px!important;line-height:1.55}
#content .command-supplier-list strong,#content .v4-dashboard-bottom strong,#content .v4-dashboard-bottom b{min-width:0;overflow-wrap:anywhere}
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

function canonicalDate(raw){
 const value=String(raw??'').trim();
 if(!value)return'';
 const token=value.match(/\b\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}\b/)?.[0];
 if(!token)return value;
 const parts=token.split(/[-\/]/).map(Number);
 let year,month,day;
 if(parts[0]>999){
  year=parts[0];
  if(parts[1]>12&&parts[2]<=12){day=parts[1];month=parts[2]}
  else{month=parts[1];day=parts[2]}
 }else if(parts[2]>999){day=parts[0];month=parts[1];year=parts[2]}
 else return value;
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return value;
 const formatted=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 return value.replace(token,formatted);
}

function repairDashboardDates(){
 const root=document.getElementById('content');
 if(!root)return;
 root.querySelectorAll('small,time').forEach(element=>{
  const fixed=canonicalDate(element.textContent);
  if(fixed!==element.textContent)element.textContent=fixed;
 });
}

ensureStyles();
window.renderNewBill=async(...args)=>{const result=await original(...args);enhance();return result};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
const originalDashboard=window.renderDashboard;
if(typeof originalDashboard==='function'){
 window.renderDashboard=(...args)=>{const result=originalDashboard(...args);repairDashboardDates();requestAnimationFrame(repairDashboardDates);return result};
 if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.dashboard=window.renderDashboard;
}
console.info('[ui-enhancements] v2 ready');
})();