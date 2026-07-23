(()=>{
'use strict';
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const route=()=>{const v=location.hash.slice(1).trim();return VALID.has(v)?v:'dashboard'};

window.addEventListener('hashchange',()=>{
  const view=route();
  if(typeof show==='function'&&typeof state!=='undefined'&&state.user&&state.view!==view) show(view);
});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(event.ctrlKey&&key==='n'){
    event.preventDefault();
    if(typeof show==='function') show('new');
  }else if(event.ctrlKey&&key==='k'){
    event.preventDefault();
    const search=document.querySelector('input[type="search"],#billSearch,#uxProductSearch,#uxPriceSearch');
    search?.focus();search?.select?.();
  }else if(event.key==='Escape'){
    const active=document.activeElement;
    if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)){
      if('value' in active)active.value='';
      active.dispatchEvent(new Event('input',{bubbles:true}));
      active.blur();
    }
  }
});

window.__WS_ROUTER__={version:32,route};
})();