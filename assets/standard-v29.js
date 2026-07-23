(()=>{
'use strict';

function removeParallax(root=document){
  root.querySelectorAll('.parallax-card').forEach(card=>{
    card.classList.remove('parallax-card');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
    if(card.style.transform!=='none')card.style.transform='none';
  });
}

function findItemRows(root=document){
  return [...root.querySelectorAll('#phaseItems tr, #phaseBillForm .phase-item-row, #phaseBillForm [data-item-row], #phaseBillForm .bill-item-row')];
}

function ensureProductList(select,input,rowIndex){
  const id=`v29-product-list-${rowIndex}`;
  let list=document.getElementById(id);
  if(!list){
    list=document.createElement('datalist');
    list.id=id;
    document.body.appendChild(list);
  }
  const nextHtml=[...select.options]
    .filter(option=>option.value && !/custom item/i.test(option.textContent||''))
    .map(option=>`<option value="${String(option.textContent||'').replace(/"/g,'&quot;')}" data-id="${option.value}"></option>`)
    .join('');
  if(list.innerHTML!==nextHtml)list.innerHTML=nextHtml;
  if(input.getAttribute('list')!==id)input.setAttribute('list',id);
}

function fixCustomItemRow(row,rowIndex){
  const productSelect=row.querySelector('select.product-field, select[data-k="product_id"]');
  const nameInput=row.querySelector('input[data-k="description"]');
  if(!productSelect||!nameInput)return;

  ensureProductList(productSelect,nameInput,rowIndex);

  if(!productSelect.hidden)productSelect.hidden=true;
  if(productSelect.style.display!=='none')productSelect.style.display='none';
  if(productSelect.getAttribute('aria-hidden')!=='true')productSelect.setAttribute('aria-hidden','true');
  if(productSelect.tabIndex!==-1)productSelect.tabIndex=-1;

  if(nameInput.style.display!=='block')nameInput.style.display='block';
  if(nameInput.placeholder!=='Product name')nameInput.placeholder='Product name';
  if(nameInput.getAttribute('aria-label')!=='Product name')nameInput.setAttribute('aria-label','Product name');
  nameInput.classList.add('v29-product-name');

  row.querySelectorAll('.v29-product-switch').forEach(button=>button.remove());

  if(!nameInput.dataset.v29ProductBound){
    nameInput.dataset.v29ProductBound='1';
    const sync=()=>{
      const typed=String(nameInput.value||'').trim().toLowerCase();
      const match=[...productSelect.options].find(option=>
        option.value && String(option.textContent||'').trim().toLowerCase()===typed
      );
      const nextValue=match?.value||'';
      if(productSelect.value!==nextValue){
        productSelect.value=nextValue;
        productSelect.dispatchEvent(new Event('change',{bubbles:true}));
      }
    };
    nameInput.addEventListener('change',sync);
    nameInput.addEventListener('blur',sync);
  }
}

function fixBillEditor(root=document){
  const form=root.querySelector?.('#phaseBillForm') || document.querySelector('#phaseBillForm');
  if(!form)return;
  findItemRows(form).forEach((row,index)=>fixCustomItemRow(row,index));

  const heading=form.closest('.content')?.querySelector('.page-head h1');
  if(heading && /^edit bill$/i.test(heading.textContent.trim())){
    const top=document.querySelector('#topTitle');
    if(top&&top.textContent!=='Edit Bill')top.textContent='Edit Bill';
  }
}

function apply(root=document){
  removeParallax(root);
  fixBillEditor(root);
}

let queued=false;
function queueApply(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    apply(document);
  });
}

window.addEventListener('load',queueApply);
window.addEventListener('hashchange',queueApply);
document.addEventListener('click',event=>{
  if(event.target.closest('[data-go],[data-view],#addItem,[data-remove]'))setTimeout(queueApply,0);
},true);
document.addEventListener('input',event=>{
  if(event.target.closest('#phaseBillForm'))queueApply();
},true);
setTimeout(queueApply,100);
setTimeout(queueApply,500);
window.__WS_STANDARD__={version:30,apply:queueApply};
})();