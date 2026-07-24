(()=>{
'use strict';
const VERSION=50;
const byText=(card,text)=>[...card.querySelectorAll('.item-field')].find(label=>label.querySelector(':scope > span')?.textContent.trim()===text);
const cleanHelp=label=>label?.querySelectorAll('.item-help').forEach(el=>{if(!el.matches('[data-pack-analysis]'))el.remove()});
const simplifyCard=card=>{
  const index=Number(card.dataset.index||0);
  const item=state.items?.[index];
  if(!item)return;

  const product=byText(card,'Product');
  const qty=byText(card,'Qty');
  const unit=byText(card,'Unit bought');
  const pack=byText(card,'What is inside?');
  const inner=byText(card,'Inner item');
  const basis=byText(card,'Invoice rate is');
  const rate=byText(card,'Rate');
  const net=byText(card,'Net amount');
  const gst=byText(card,'GST %');

  product?.querySelector('input')?.setAttribute('placeholder','e.g. Tomato tin');
  cleanHelp(qty);cleanHelp(unit);cleanHelp(rate);cleanHelp(net);

  if(pack){
    const title=pack.querySelector(':scope > span');
    if(title)title.textContent='Pack format';
    pack.querySelector('input')?.setAttribute('placeholder','e.g. 24x500g');
  }

  item.rate_basis='purchase';
  if(basis){
    const select=basis.querySelector('select');
    if(select)select.value='purchase';
    basis.hidden=true;
  }

  const purchase=String(item.unit||'PCS').toUpperCase();
  if(rate){
    const title=rate.querySelector(':scope > span');
    if(title)title.textContent=`Rate per ${purchase}`;
  }

  let priceNote=card.querySelector('.price-entry-note');
  if(!priceNote&&rate&&net){
    priceNote=document.createElement('div');
    priceNote.className='price-entry-note';
    priceNote.textContent='Enter Rate or Net amount. Net amount takes priority when both are entered.';
    net.after(priceNote);
  }

  let details=card.querySelector('.item-optional-details');
  if(!details&&(inner||gst)){
    details=document.createElement('details');
    details.className='item-optional-details';
    details.innerHTML='<summary>Optional details</summary><div class="optional-fields"></div>';
    const target=details.querySelector('.optional-fields');
    if(inner){
      const title=inner.querySelector(':scope > span');
      if(title)title.textContent='Inside item type';
      target.appendChild(inner);
    }
    if(gst)target.appendChild(gst);
    const fields=card.querySelector('.bill-item-fields');
    fields?.after(details);
  }

  const cards=[...card.querySelectorAll('.bill-item-calcs .calc-card')];
  const seen=new Set();
  cards.forEach(calc=>{
    const label=(calc.querySelector('small')?.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
    if(!label)return;
    const normalized=label.replace('piece','pcs');
    if(seen.has(normalized))calc.remove();
    else seen.add(normalized);
  });
};

const simplifyAll=()=>document.querySelectorAll('.bill-item-card').forEach(simplifyCard);
const original=window.renderItemRows;
if(typeof original==='function'){
  window.renderItemRows=function(){
    const result=original.apply(this,arguments);
    simplifyAll();
    return result;
  };
}

const style=document.createElement('style');
style.id='mobileBillEntryV50Style';
style.textContent=`
.price-entry-note{grid-column:1/-1;color:#607086;font-size:12px;font-weight:600;margin-top:-2px}
.item-optional-details{margin:0 14px 14px;border:1px solid #dbe5f0;border-radius:12px;background:#f8fbff;overflow:hidden}
.item-optional-details summary{cursor:pointer;padding:12px 14px;font-weight:750;color:#33465c;list-style:none}
.item-optional-details summary::-webkit-details-marker{display:none}
.item-optional-details summary::after{content:'+';float:right;font-size:18px;line-height:1}
.item-optional-details[open] summary::after{content:'−'}
.optional-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 14px 14px}
.bill-item-calcs{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))!important}
@media(max-width:760px){
 .bill-item-card{border-radius:16px!important}
 .bill-item-fields{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px 12px!important;padding:16px!important}
 .bill-item-fields .item-field:first-child,.bill-item-fields .item-field:nth-child(4),.price-entry-note{grid-column:1/-1!important}
 .bill-item-fields .item-field{gap:7px!important}
 .bill-item-fields .field{min-height:52px!important;font-size:16px!important;border-radius:12px!important}
 .bill-item-fields .item-field>span:first-child{font-size:13px!important}
 .pack-analysis{font-size:12px!important;line-height:1.4!important}
 .item-optional-details{margin:0 16px 16px}
 .optional-fields{grid-template-columns:1fr 1fr}
 .bill-item-calcs{grid-template-columns:1fr 1fr!important;padding:14px!important;gap:10px!important}
 .bill-item-calcs .calc-card{min-height:88px!important;padding:13px!important}
 .bill-item-calcs .calc-card.line{grid-column:1/-1!important}
 .price-entry-note{margin-top:-5px}
}
@media(max-width:390px){
 .bill-item-fields{grid-template-columns:1fr!important}
 .bill-item-fields .item-field,.price-entry-note{grid-column:1!important}
 .optional-fields{grid-template-columns:1fr}
}
`;
document.head.appendChild(style);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',simplifyAll,{once:true});
else simplifyAll();
window.__WS_MOBILE_BILL_ENTRY__={version:VERSION,simplify:simplifyAll};
})();
