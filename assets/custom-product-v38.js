(()=>{
'use strict';
const NEW_VALUE='__new_product__';
let queued=false;

function escAttr(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function enhanceProducts(){
  const body=document.getElementById('phaseItems');
  if(!body)return;
  body.querySelectorAll('select[data-k="product_id"]').forEach(select=>{
    const index=Number(select.dataset.x);
    const item=state?.items?.[index];
    if(!item)return;
    if(!select.querySelector(`option[value="${NEW_VALUE}"]`)){
      const option=document.createElement('option');
      option.value=NEW_VALUE;
      option.textContent='＋ Add new product';
      select.appendChild(option);
    }
    if(item.product_id===NEW_VALUE){
      select.value=NEW_VALUE;
      const cell=select.closest('td');
      if(!cell||cell.querySelector('.new-product-entry'))return;
      select.hidden=true;
      const wrap=document.createElement('div');
      wrap.className='new-product-entry';
      wrap.innerHTML=`<input class="field" type="text" value="${escAttr(item.description||'')}" placeholder="Enter new product name" aria-label="New product name"><button class="btn secondary small" type="button">Use saved product</button><small>Saving the bill will add this item to Products and Price Book.</small>`;
      const input=wrap.querySelector('input');
      const back=wrap.querySelector('button');
      input.addEventListener('input',()=>{item.description=input.value.trimStart()});
      back.addEventListener('click',()=>{item.product_id='';item.description='';queueEnhance();const original=window.renderNewBill;original?.()});
      cell.prepend(wrap);
      requestAnimationFrame(()=>input.focus());
    }
  });
}

function queueEnhance(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;enhanceProducts()});
}

const originalRender=window.renderNewBill;
if(typeof originalRender==='function'){
  window.renderNewBill=async function(...args){
    const result=await originalRender.apply(this,args);
    queueEnhance();
    return result;
  };
}

document.addEventListener('change',event=>{
  const select=event.target.closest?.('select[data-k="product_id"]');
  if(!select||select.value!==NEW_VALUE)return;
  const item=state?.items?.[Number(select.dataset.x)];
  if(item){item.product_id=NEW_VALUE;item.description=''}
  queueEnhance();
},true);

document.addEventListener('submit',event=>{
  if(event.target?.id!=='phaseBillForm')return;
  state?.items?.forEach(item=>{if(item.product_id===NEW_VALUE)item.product_id=''});
},true);

const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.target?.id==='phaseItems'||m.target?.closest?.('#phaseItems')))queueEnhance();
});
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('hashchange',queueEnhance);
queueEnhance();
})();
