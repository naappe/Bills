(()=>{
'use strict';

function removeParallax(root=document){
  root.querySelectorAll('.parallax-card').forEach(card=>{
    card.classList.remove('parallax-card');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
    card.style.transform='none';
  });
}

function findItemRows(root=document){
  return [...root.querySelectorAll('#phaseBillForm .phase-item-row, #phaseBillForm [data-item-row], #phaseBillForm .bill-item-row')];
}

function fixCustomItemRow(row){
  const selects=[...row.querySelectorAll('select')];
  const productSelect=selects.find(s=>/custom item/i.test(s.options?.[s.selectedIndex]?.text||'') || /product/i.test(s.name||s.id||''));
  if(!productSelect)return;

  const textInputs=[...row.querySelectorAll('input[type="text"]')];
  const nameInput=textInputs.find(i=>/description|item|product/i.test(i.name||i.id||i.placeholder||'')) || textInputs[0];
  if(!nameInput)return;

  const selectedText=(productSelect.options?.[productSelect.selectedIndex]?.text||'').trim();
  const isCustom=/custom item/i.test(selectedText) || !productSelect.value;
  const hasName=String(nameInput.value||'').trim().length>0;

  let wrap=productSelect.parentElement;
  if(!wrap)return;
  wrap.classList.toggle('v29-custom-active',isCustom);

  if(isCustom){
    productSelect.setAttribute('aria-hidden','true');
    productSelect.tabIndex=-1;
    productSelect.style.display='none';
    nameInput.style.display='block';
    nameInput.placeholder='Product name';
    nameInput.setAttribute('aria-label','Product name');
    nameInput.classList.add('v29-product-name');
  }else{
    productSelect.removeAttribute('aria-hidden');
    productSelect.tabIndex=0;
    productSelect.style.display='';
    if(!hasName) nameInput.style.display='none';
  }

  if(!wrap.querySelector('.v29-product-switch')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='v29-product-switch';
    btn.textContent=isCustom?'Choose saved product':'Use custom item';
    btn.onclick=()=>{
      const hidden=productSelect.style.display==='none';
      productSelect.style.display=hidden?'':'none';
      productSelect.removeAttribute('aria-hidden');
      productSelect.tabIndex=0;
      btn.textContent=hidden?'Use custom item':'Choose saved product';
      if(!hidden){
        nameInput.style.display='block';
        nameInput.focus();
      }
    };
    wrap.appendChild(btn);
  }else{
    wrap.querySelector('.v29-product-switch').textContent=isCustom?'Choose saved product':'Use custom item';
  }

  if(!productSelect.dataset.v29Bound){
    productSelect.dataset.v29Bound='1';
    productSelect.addEventListener('change',()=>setTimeout(()=>fixCustomItemRow(row),0));
  }
}

function fixBillEditor(root=document){
  const form=root.querySelector?.('#phaseBillForm') || document.querySelector('#phaseBillForm');
  if(!form)return;
  findItemRows(form).forEach(fixCustomItemRow);

  const heading=form.closest('.content')?.querySelector('.page-head h1');
  if(heading && /^edit bill$/i.test(heading.textContent.trim())){
    const top=document.querySelector('#topTitle');
    if(top)top.textContent='Edit Bill';
  }
}

function apply(root=document){
  removeParallax(root);
  fixBillEditor(root);
}

const observer=new MutationObserver(()=>requestAnimationFrame(()=>apply(document)));
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>apply(document));
document.addEventListener('DOMContentLoaded',()=>apply(document));
setTimeout(()=>apply(document),300);
setTimeout(()=>apply(document),1000);
})();
