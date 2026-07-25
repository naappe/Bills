(()=>{
'use strict';
const VERSION=3;

function fieldLabel(form,name){
  const field=form?.elements?.[name];
  return field?.closest('label')||null;
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

function addColumnHeader(itemsCard){
  if(!itemsCard||itemsCard.querySelector('.invoice-column-head'))return;
  const rows=itemsCard.querySelector('#itemRows');
  if(!rows)return;
  const header=document.createElement('div');
  header.className='invoice-column-head';
  header.innerHTML='<span>Item</span><span>Packing</span><span>Unit</span><span>Qty</span><span>Row total</span><span>GST</span>';
  rows.before(header);
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
    const primary=headerCard.querySelector('.bill-primary-grid,.form-grid');
    primary?.classList.add('invoice-header-grid');
    fieldLabel(form,'vendor')?.classList.add('invoice-vendor-field');
    fieldLabel(form,'bill_date')?.classList.add('invoice-date-field');
    fieldLabel(form,'bill_no')?.classList.add('invoice-number-field');
    if(!headerCard.querySelector('.invoice-section-kicker')){
      headerCard.insertAdjacentHTML('afterbegin','<div class="invoice-section-kicker"><span>Purchase record</span><strong>Bill information</strong></div>');
    }
  }

  if(itemsCard){
    itemsCard.classList.add('invoice-items-card');
    itemsCard.querySelector('.page-head')?.classList.add('invoice-items-head');
    itemsCard.querySelector('#itemRows')?.classList.add('invoice-line-items');
    addColumnHeader(itemsCard);
  }

  if(saveCard){
    saveCard.classList.add('invoice-footer-card');
    saveCard.querySelector('.bill-total-summary')?.classList.add('invoice-total-due');
  }

  decorateRows();

  if(form.dataset.invoiceEvents!=='1'){
    form.dataset.invoiceEvents='1';
    form.addEventListener('click',event=>{
      if(event.target.closest('#addRow,[data-remove]')){
        requestAnimationFrame(decorateRows);
      }
    });
  }
}

const original=window.renderNewBill;
if(typeof original==='function'){
  window.renderNewBill=async function(...args){
    const result=await original.apply(this,args);
    enhance();
    requestAnimationFrame(enhance);
    return result;
  };
  if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
}

window.__WS_INVOICE_ENTRY_LAYOUT__={version:VERSION,enhance,decorateRows};
console.info('[invoice-entry-layout] v3 ready — bounded enhancement');
})();