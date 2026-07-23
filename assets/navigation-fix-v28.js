(()=>{
'use strict';
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const cleanHash=()=>{const v=location.hash.replace(/^#/,'').trim();return VALID.has(v)?v:null};
let restoring=false;

function removeNewBillNav(){
  document.querySelectorAll('.nav [data-view="new"]').forEach(el=>el.remove());
}

function setRoute(view){
  if(!VALID.has(view))return;
  history.replaceState(null,'',`${location.pathname}${location.search}#${view}`);
}

function currentRoute(){
  return cleanHash()||'dashboard';
}

async function restoreRoute(){
  if(restoring)return;
  restoring=true;
  const target=currentRoute();
  for(let i=0;i<40;i++){
    if(state?.user&&typeof show==='function'){
      if(state.view!==target) show(target);
      setRoute(target);
      removeNewBillNav();
      restoring=false;
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
  restoring=false;
}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-view],[data-go]');
  if(!el)return;
  const view=el.dataset.view||el.dataset.go;
  if(VALID.has(view))setRoute(view);
},true);

window.addEventListener('hashchange',()=>restoreRoute());
window.addEventListener('load',()=>{removeNewBillNav();restoreRoute()});
db.auth.onAuthStateChange((event,session)=>{if(session)setTimeout(restoreRoute,0)});

const observer=new MutationObserver(()=>removeNewBillNav());
observer.observe(document.documentElement,{childList:true,subtree:true});

const originalShow=window.show;
if(typeof originalShow==='function'){
  window.show=function(view){
    const valid=VALID.has(view)?view:'dashboard';
    setRoute(valid);
    const result=originalShow(valid);
    removeNewBillNav();
    return result;
  };
}

// Clear the old saved route that was forcing New Bill after refresh.
try{localStorage.removeItem('ws-current-view')}catch{}
})();