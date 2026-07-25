(()=>{
'use strict';
const VERSION=2;

function fieldLabel(form,name){
  const field=form?.elements?.[name];
  return field?.closest('label')||null;
}

function number(value){
  return Number(String(value??0).replace(/,/g,''))||0;
}

function formatMoney(value){
  return typeof money==='function'
    ? money(value)
    : `MVR ${number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function calculatedTotals(){
  const items=Array.isArray(window.state?.items)?window.state.items:[];
  let subtotal=0;
  let gst=0;
  items.forEach(item=>{
    const qty=number(item.qty)||1;
    const entered=number(item.rate);
    const rowSubtotal=item.rate_mode==='line_total'?entered:qty*entered;
    const rowGst=rowSubtotal*number(item.gst)/100;
    subtotal+=rowSubtotal;
    gst+=rowGst;
  });
  return{subtotal,gst,total:subtotal+gst};
}

function updateSummary(){
  const box=document.querySelector('#billForm .invoice-summary-box');
  if(!box)return;
  const totals=calculatedTotals();
  const subtotal=box.querySelector('[data-invoice-subtotal]');
  const gst=box.querySelector('[data-invoice-gst]');
  const total=box.querySelector('[data-invoice-total]');
  if(subtotal)subtotal.textContent=formatMoney(totals.subtotal);
  if(gst)gst.textContent=formatMoney(totals.gst);
  if(total)total.textContent=formatMoney(totals.total);
}

function decorateRows(){
  const rows=document.getElementById('itemRows');
  if(!rows)return;
  [...rows.querySelectorAll('[data-row]')].forEach((row,index)=>{
    row.classList.add('invoice-line-row');
    row.dataset.lineNumber=String(index+1).padStart(2,'0');
    row.querySelector('.form-grid')?.classList.add('invoice-line-grid');
    row.querySelector('.metrics')?.classList.add('invoice-line-metrics');
    row.querySelector('.actions')?.classList.add('invoice-line-actions');
  });
  updateSummary();
}

function enhance(){
  const form=document.getElementById('billForm');
  if(!form)return;
  form.classList.add('invoice-entry-form');

  const directCards=[...form.children].filter(el=>el.classList?.contains('card'));
  const headerCard=directCards.find(card=>card.querySelector('[name="bill_date"]'));
  const itemsCard=directCards.find(card=>card.querySelector('#itemRows'));
  const saveCard=directCards.find(card=>card.classList.contains('bill-save-panel'));

  if(headerCard){
    headerCard.classList.add('invoice-header-card');
    const grid=headerCard.querySelector('.form-grid');
    if(grid){
      grid.classList.add('invoice-header-grid');
      fieldLabel(form,'vendor')?.classList.add('invoice-vendor-field');
      fieldLabel(form,'bill_date')?.classList.add('invoice-date-field');
      fieldLabel(form,'bill_no')?.classList.add('invoice-number-field');
    }
    if(!headerCard.querySelector('.invoice-section-kicker')){
      headerCard.insertAdjacentHTML('afterbegin','<div class="invoice-section-kicker"><span>Purchase record</span><strong>Bill information</strong></div>');
    }
  }

  if(itemsCard){
    itemsCard.classList.add('invoice-items-card');
    const pageHead=itemsCard.querySelector('.page-head');
    pageHead?.classList.add('invoice-items-head');
    const rows=document.getElementById('itemRows');
    rows?.classList.add('invoice-line-items');
    if(rows&&!itemsCard.querySelector('.invoice-column-head')){
      rows.insertAdjacentHTML('beforebegin','<div class="invoice-column-head" aria-hidden="true"><span>Item</span><span>Packing</span><span>Unit</span><span>Qty</span><span>Row total</span><span>GST</span><span></span></div>');
    }
  }

  if(saveCard){
    saveCard.classList.add('invoice-footer-card');
    saveCard.querySelector('.bill-total-summary')?.classList.add('invoice-total-due');
    if(!saveCard.querySelector('.invoice-summary-box')){
      const notice=saveCard.querySelector('.notice');
      const summary=document.createElement('section');
      summary.className='invoice-summary-box';
      summary.setAttribute('aria-label','Bill summary');
      summary.innerHTML='<div class="invoice-summary-row"><span>Subtotal</span><strong data-invoice-subtotal>MVR 0.00</strong></div><div class="invoice-summary-row"><span>GST</span><strong data-invoice-gst>MVR 0.00</strong></div><div class="invoice-summary-row total"><span>Total due</span><strong data-invoice-total>MVR 0.00</strong></div>';
      saveCard.insertBefore(summary,notice||saveCard.querySelector('.actions'));
    }
  }

  form.dataset.invoiceLayout='2';
  decorateRows();
  updateSummary();
}

const observer=new MutationObserver(()=>{
  enhance();
  decorateRows();
});

function start(){
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('input',event=>{
    if(event.target.closest?.('#billForm'))requestAnimationFrame(updateSummary);
  });
  document.addEventListener('change',event=>{
    if(event.target.closest?.('#billForm'))requestAnimationFrame(updateSummary);
  });
  enhance();
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.__WS_INVOICE_ENTRY_LAYOUT__={version:VERSION,enhance,updateSummary};
})();