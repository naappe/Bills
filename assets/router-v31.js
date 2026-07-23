(()=>{
'use strict';

const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const route=()=>{const value=location.hash.slice(1).trim();return VALID.has(value)?value:'dashboard'};
let requestedRoute=route();
let authenticated=false;
let applying=false;

const originalShow=typeof window.show==='function'?window.show:null;

function writeHash(view){
  if(!VALID.has(view)||location.hash===`#${view}`)return;
  history.replaceState(null,'',`${location.pathname}${location.search}#${view}`);
}

function markNavigation(view){
  document.querySelectorAll('.nav [data-view]').forEach(button=>{
    button.classList.toggle('active',button.dataset.view===view);
  });
}

function display(view,{write=true}={}){
  if(!VALID.has(view)||typeof originalShow!=='function')return false;
  applying=true;
  originalShow(view);
  applying=false;
  requestedRoute=view;
  if(write)writeHash(view);
  markNavigation(view);
  return true;
}

/*
 * The core app renders Dashboard after restoring the Supabase session.
 * During bootstrap, preserve the page already requested in the URL instead
 * of allowing that default Dashboard render to overwrite it.
 */
if(originalShow){
  window.show=function(view){
    let target=VALID.has(view)?view:'dashboard';
    if(!authenticated&&target==='dashboard'&&requestedRoute!=='dashboard')target=requestedRoute;
    return display(target);
  };
}

async function restore(){
  requestedRoute=route();
  try{
    const {data}=await db.auth.getSession();
    authenticated=Boolean(data?.session);
  }catch(error){
    console.warn('Router session check failed:',error?.message||error);
  }
  if(!authenticated)return;
  for(let attempt=0;attempt<60;attempt++){
    const app=document.querySelector('#appView');
    if(app&&!app.classList.contains('hidden')&&typeof originalShow==='function'){
      display(requestedRoute,{write:false});
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  console.warn('Router could not restore page:',requestedRoute);
}

document.addEventListener('click',event=>{
  const target=event.target.closest('[data-view],[data-go]');
  const view=target?.dataset.view||target?.dataset.go;
  if(!VALID.has(view))return;
  requestedRoute=view;
  writeHash(view);
},true);

window.addEventListener('hashchange',()=>{
  requestedRoute=route();
  if(authenticated&&!applying)display(requestedRoute,{write:false});
});

window.addEventListener('pageshow',restore);
window.addEventListener('load',restore);
db.auth.onAuthStateChange((event,session)=>{
  authenticated=Boolean(session);
  if(session)setTimeout(restore,0);
});

document.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(event.ctrlKey&&key==='n'){
    event.preventDefault();
    display('new');
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

try{localStorage.removeItem('ws-current-view')}catch{}
window.__WS_ROUTER__={version:31,route:()=>requestedRoute,restore};
})();