(()=>{
'use strict';
const NEW_VALUE='__new_product__';
let queued=false;

function escAttr(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function ensureFormActions(){
  const form=document.getElementById('phaseBillForm');
  if(!form||form.querySelector('.bill-form-actions'))return;
  const bar=document.createElement('div');
  bar.className='bill-form-actions';
  bar.innerHTML='<div><strong>Ready to save?</strong><small>Review the bill details and item totals before saving.</small></div><div class="bill-form-action-buttons"><button class="btn secondary" type="button" data-go-bills>Cancel</button><button class="btn bill-save-primary" type="submit">Save Bill</button></div>';
  bar.querySelector('[data-go-bills]').addEventListener('click',()=>{location.hash='#bills'});
  form.appendChild(bar);
}

function enhanceProducts(){
  const body=document.getElementById('phaseItems');
  if(!body){ensureFormActions();return}
  body.querySelectorAll('select[data-k="product_id"]').forEach(select=>{
    const index=Number(select.dataset.x);
    const item=state?.items?.[index];
    if(!item)return;
    if(!select.querySelector(`option[value="${NEW_VALUE}"]`)){
      const option=document.createElement('option');
      option.value=NEW_VALUE;
      option.textContent='＋ Create new product';
      select.appendChild(option);
    }
    const cell=select.closest('td');
    if(!cell)return;
    if(item.product_id===NEW_VALUE){
      select.value=NEW_VALUE;
      if(cell.querySelector('.new-product-entry'))return;
      select.hidden=true;
      const wrap=document.createElement('div');
      wrap.className='new-product-entry';
      wrap.innerHTML=`<div class="new-product-head"><span class="new-product-badge">New product</span><button class="product-mode-link" type="button">Choose saved product</button></div><input class="field" type="text" value="${escAttr(item.description||'')}" placeholder="Product name, e.g. Carrot" aria-label="New product name" required><div class="new-product-hint">This product will be added to Products and Price Book when the bill is saved.</div>`;
      const input=wrap.querySelector('input');
      const back=wrap.querySelector('button');
      input.addEventListener('input',()=>{item.description=input.value.trimStart()});
      back.addEventListener('click',()=>{item.product_id='';item.description='';window.renderNewBill?.()});
      cell.prepend(wrap);
      requestAnimationFrame(()=>input.focus());
    }
  });
  ensureFormActions();
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
  const invalid=state?.items?.find(item=>item.product_id===NEW_VALUE&&!String(item.description||'').trim());
  if(invalid){event.preventDefault();alert('Enter a product name before saving.');return}
  state?.items?.forEach(item=>{if(item.product_id===NEW_VALUE)item.product_id=''});
},true);

const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.target?.id==='phaseItems'||m.target?.closest?.('#phaseItems')||m.target?.id==='phaseBillForm'))queueEnhance();
});
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('hashchange',queueEnhance);
queueEnhance();
})();