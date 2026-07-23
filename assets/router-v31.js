(()=>{
'use strict';
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const route=()=>{const v=location.hash.slice(1).trim();return VALID.has(v)?v:'dashboard'};

function installAccessibilityShell(){
  const main=document.querySelector('.main');
  const content=document.querySelector('#content');
  if(content&&!content.id)content.id='main-content';
  if(content)content.setAttribute('tabindex','-1');
  if(!document.querySelector('.skip-link')){
    const skip=document.createElement('a');
    skip.className='skip-link';
    skip.href='#main-content';
    skip.textContent='Skip to main content';
    skip.addEventListener('click',()=>setTimeout(()=>content?.focus(),0));
    document.body.prepend(skip);
  }
  if(main&&!main.querySelector('.app-footer')){
    const footer=document.createElement('footer');
    footer.className='app-footer';
    footer.innerHTML='<span>White Saffron Procurement ERP</span><span>Secure purchasing and supplier records</span>';
    main.appendChild(footer);
  }
  updateCurrentRoute();
}

function updateCurrentRoute(){
  const current=route();
  document.querySelectorAll('.nav [data-view]').forEach(link=>{
    const active=link.dataset.view===current;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}

window.addEventListener('hashchange',()=>{
  const view=route();
  updateCurrentRoute();
  if(typeof show==='function'&&typeof state!=='undefined'&&state.user&&state.view!==view)show(view);
});

document.addEventListener('click',event=>{
  if(event.target.closest('.nav [data-view]'))setTimeout(updateCurrentRoute,0);
});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(event.ctrlKey&&key==='n'){
    event.preventDefault();
    if(typeof show==='function')show('new');
  }else if(event.ctrlKey&&key==='k'){
    event.preventDefault();
    const search=document.querySelector('input[type="search"],#billSearch,#uxProductSearch,#uxPriceSearch');
    search?.focus();search?.select?.();
  }else if(event.ctrlKey&&key==='t'){
    event.preventDefault();
    document.querySelector('.theme-toggle,[data-theme-toggle],#themeToggle')?.click();
  }else if(event.key==='Escape'){
    const active=document.activeElement;
    if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)){
      if('value' in active)active.value='';
      active.dispatchEvent(new Event('input',{bubbles:true}));
      active.blur();
    }
  }
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAccessibilityShell,{once:true});
else installAccessibilityShell();
window.addEventListener('load',installAccessibilityShell,{once:true});

window.__WS_ROUTER__={version:34,route,updateCurrentRoute};
})();