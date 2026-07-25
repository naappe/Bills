(()=>{
'use strict';
const VERSION=1;

function fieldLabel(form,name){
  const field=form?.elements?.[name];
  return field?.closest('label')||null;
}

function enhance(){
  const form=document.getElementById('billForm');
  if(!form||form.dataset.invoiceLayout==='1')return;
  form.dataset.invoiceLayout='1';
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
      const vendor=fieldLabel(form,'vendor');
      const date=fieldLabel(form,'bill_date');
      const billNo=fieldLabel(form,'bill_no');
      vendor?.classList.add('invoice-vendor-field');
      date?.classList.add('invoice-date-field');
      billNo?.classList.add('invoice-number-field');
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
  }

  if(saveCard){
    saveCard.classList.add('invoice-footer-card');
    const total=saveCard.querySelector('.bill-total-summary');
    total?.classList.add('invoice-total-due');
  }

  decorateRows();
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
}

const observer=new MutationObserver(()=>{
  enhance();
  decorateRows();
});

function start(){
  observer.observe(document.documentElement,{subtree:true,childList:true});
  enhance();
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.__WS_INVOICE_ENTRY_LAYOUT__={version:VERSION,enhance};
})();