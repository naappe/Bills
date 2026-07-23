(()=>{
'use strict';

function ensureAuditStyles(){
  let style=document.getElementById('ws-core-accessibility-theme');
  if(!style){
    style=document.createElement('style');
    style.id='ws-core-accessibility-theme';
    style.textContent=`
[data-theme="dark"],html[data-theme="dark"],body[data-theme="dark"]{
  --bg:#0b111b;--surface:#141d2a;--surface-2:#1a2534;--ink:#edf4ff;--muted:#9aaac0;
  --line:#2b3a4e;--brand:#5d9cff;--brand-2:#17375f;--brand-soft:rgba(93,156,255,.16);
  --red:#ff737d;--shadow:0 10px 28px rgba(0,0,0,.28);
  --bg-primary:#0b111b;--bg-secondary:#1a2534;--bg-card:#141d2a;--bg-card-hover:#1d2a3b;
  --text-primary:#edf4ff;--text-secondary:#c2cede;--text-muted:#9aaac0;--border:#2b3a4e;
}
html[data-theme="dark"] body,body[data-theme="dark"]{background:#0b111b;color:#edf4ff}
html[data-theme="dark"] .topbar,body[data-theme="dark"] .topbar,
html[data-theme="dark"] .toolbar,body[data-theme="dark"] .toolbar,
html[data-theme="dark"] th,body[data-theme="dark"] th{background:#1a2534;color:#edf4ff;border-color:#2b3a4e}
html[data-theme="dark"] .card,body[data-theme="dark"] .card,
html[data-theme="dark"] .section,body[data-theme="dark"] .section,
html[data-theme="dark"] .metric,body[data-theme="dark"] .metric,
html[data-theme="dark"] .ux-card,body[data-theme="dark"] .ux-card,
html[data-theme="dark"] .field,body[data-theme="dark"] .field,
html[data-theme="dark"] input,body[data-theme="dark"] input,
html[data-theme="dark"] select,body[data-theme="dark"] select,
html[data-theme="dark"] textarea,body[data-theme="dark"] textarea{background:#141d2a;color:#edf4ff;border-color:#2b3a4e}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{
  outline:3px solid var(--brand,#0b6cff)!important;outline-offset:3px!important;border-radius:6px;
}
a:focus:not(:focus-visible),button:focus:not(:focus-visible){outline:none}
`;
    const first=document.head.querySelector('style');
    document.head.insertBefore(style,first||document.head.firstChild);
  }
}

function syncThemeTargets(){
  const root=document.documentElement;
  const body=document.body;
  if(!body)return;
  const theme=root.dataset.theme||body.dataset.theme||localStorage.getItem('ws-color-mode')||localStorage.getItem('theme')||'light';
  root.dataset.theme=theme;
  body.dataset.theme=theme;
}

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
  ensureAuditStyles();
  syncThemeTargets();
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
  if(event.target.closest('[data-go],[data-view],#addItem,[data-remove],#themeToggle,.theme-toggle'))setTimeout(queueApply,0);
},true);
document.addEventListener('input',event=>{
  if(event.target.closest('#phaseBillForm'))queueApply();
},true);
new MutationObserver(()=>syncThemeTargets()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
setTimeout(queueApply,100);
setTimeout(queueApply,500);
window.__WS_STANDARD__={version:31,apply:queueApply};
})();