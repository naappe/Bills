(()=>{
'use strict';
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const routeFromHash=()=>{const v=location.hash.replace(/^#/,'').trim();return VALID.has(v)?v:null};
const initialRoute=routeFromHash()||'dashboard';
let restoring=false;

function setHash(view){
  if(!VALID.has(view))return;
  if(location.hash!==`#${view}`)history.replaceState(null,'',`${location.pathname}${location.search}#${view}`);
}

function activateNav(view){
  document.querySelectorAll('.nav [data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
}

async function restoreRequestedRoute(){
  if(restoring)return;
  restoring=true;
  const target=routeFromHash()||initialRoute;
  for(let i=0;i<50;i++){
    if(window.state?.user&&typeof window.show==='function'){
      window.show(target);
      setHash(target);
      activateNav(target);
      restoring=false;
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
  restoring=false;
}

document.addEventListener('click',event=>{
  const el=event.target.closest('[data-view],[data-go]');
  const view=el?.dataset.view||el?.dataset.go;
  if(VALID.has(view))setHash(view);
},true);

window.addEventListener('hashchange',restoreRequestedRoute);
window.addEventListener('load',restoreRequestedRoute);
if(window.db?.auth?.onAuthStateChange){
  db.auth.onAuthStateChange((event,session)=>{if(session)setTimeout(restoreRequestedRoute,0)});
}

document.addEventListener('keydown',event=>{
  if(event.ctrlKey&&event.key.toLowerCase()==='n'){
    event.preventDefault();
    setHash('new');
    if(typeof window.show==='function')window.show('new');
  }
  if(event.ctrlKey&&event.key.toLowerCase()==='k'){
    event.preventDefault();
    const search=document.querySelector('input[type="search"],#billSearch,#uxProductSearch,#uxPriceSearch');
    search?.focus();
    search?.select?.();
  }
  if(event.key==='Escape'){
    const active=document.activeElement;
    if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)){
      if('value'in active)active.value='';
      active.blur();
      active.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
});

try{localStorage.removeItem('ws-current-view')}catch{}
})();
