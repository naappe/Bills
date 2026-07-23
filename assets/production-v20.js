(()=>{
'use strict';
const debounce=(fn,wait=220)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}};

function networkNotice(){
  let banner=document.getElementById('networkBanner');
  if(!banner){banner=document.createElement('div');banner.id='networkBanner';banner.className='network-banner';banner.hidden=true;document.body.appendChild(banner)}
  const update=()=>{
    const online=navigator.onLine;
    banner.textContent=online?'Connection restored':'You are offline. Unsaved changes may not be stored.';
    banner.classList.toggle('online',online);
    banner.hidden=online;
    if(online){banner.hidden=false;setTimeout(()=>{banner.hidden=true},1800)}
  };
  addEventListener('online',update);addEventListener('offline',update);update();
}

function labelResponsiveTables(root=document){
  root.querySelectorAll('.table-wrap table').forEach(table=>{
    table.classList.add('responsive-table');
    const heads=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.dataset.label=heads[i]||''));
  });
}

function validateForm(form){
  let valid=true;
  form.querySelectorAll('[required]').forEach(field=>{
    const bad=!String(field.value??'').trim();
    field.classList.toggle('invalid',bad);
    let error=field.parentElement?.querySelector(':scope > .form-error');
    if(bad&&!error){error=document.createElement('span');error.className='form-error';error.textContent='This field is required.';field.parentElement?.appendChild(error)}
    if(!bad&&error)error.remove();
    if(bad)valid=false;
  });
  return valid;
}

function protectSubmits(root=document){
  root.querySelectorAll('form').forEach(form=>{
    if(form.dataset.productionBound==='1')return;
    form.dataset.productionBound='1';
    form.addEventListener('submit',event=>{
      if(!validateForm(form)){event.preventDefault();form.querySelector('.invalid')?.focus();return}
      const button=form.querySelector('button[type="submit"]');
      if(button&&!button.disabled){button.dataset.originalText=button.textContent;button.disabled=true;button.textContent='Saving…';setTimeout(()=>{if(document.body.contains(button)){button.disabled=false;button.textContent=button.dataset.originalText||'Save'}},12000)}
    },true);
    form.addEventListener('input',debounce(()=>validateForm(form),120));
  });
}

function protectRapidActions(root=document){
  root.querySelectorAll('[data-delete],[data-approve],[data-reject],[data-restore]').forEach(button=>{
    if(button.dataset.rapidGuard==='1')return;
    button.dataset.rapidGuard='1';
    button.addEventListener('click',()=>{button.disabled=true;setTimeout(()=>button.disabled=false,1500)},true);
  });
}

function enhance(root=document){labelResponsiveTables(root);protectSubmits(root);protectRapidActions(root)}

document.addEventListener('DOMContentLoaded',()=>{networkNotice();enhance()});
const content=document.getElementById('content');
if(content)new MutationObserver(()=>requestAnimationFrame(()=>enhance(content))).observe(content,{childList:true,subtree:true});
window.addEventListener('unhandledrejection',event=>console.error('Unhandled application request:',event.reason));
})();
