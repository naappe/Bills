(()=>{
'use strict';
const VERSION=51;
const VIEWS=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
let loading=false;
let retryTimer=null;
const $=s=>document.querySelector(s);
const setHealth=(connected,count,message='')=>{
  document.querySelectorAll('[data-db-status] strong').forEach(el=>el.textContent=connected?'Connected':'Disconnected');
  document.querySelectorAll('[data-db-count] strong').forEach(el=>el.textContent=Number(count||0).toLocaleString());
  window.__WS_DB_STATUS__={connected,count:Number(count||0),message,updatedAt:new Date().toISOString()};
};
const renderCurrent=()=>{
  const view=VIEWS.has(location.hash.slice(1))?location.hash.slice(1):(VIEWS.has(state.view)?state.view:'dashboard');
  if(typeof window.show==='function')window.show(view);
};
const loadAuthenticatedBills=async({render=true,retry=true}={})=>{
  if(loading)return state.rows||[];
  loading=true;
  clearTimeout(retryTimer);
  try{
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session?.user){setHealth(false,0,'No authenticated session');return []}
    state.user=session.user;
    const rows=await window.loadBills(true);
    state.rows=Array.isArray(rows)?rows:[];
    state.filtered=[...state.rows];
    setHealth(true,state.rows.length);
    if(render)renderCurrent();
    console.info(`[app-controller] v${VERSION}: ${state.rows.length} bills loaded`);
    return state.rows;
  }catch(error){
    console.error('[app-controller] bill loading failed',error);
    setHealth(false,state.rows?.length||0,error?.message||String(error));
    if(retry)retryTimer=setTimeout(()=>loadAuthenticatedBills({render:true,retry:false}),2500);
    return state.rows||[];
  }finally{loading=false}
};
const navigate=view=>{
  view=VIEWS.has(view)?view:'dashboard';
  $('#sidebar')?.classList.remove('open');
  if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);
  if(typeof window.show==='function')window.show(view);
};
document.addEventListener('click',event=>{
  const link=event.target.closest('.nav [data-view]');
  if(link){
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(link.dataset.view);
    return;
  }
  const go=event.target.closest('[data-go]');
  if(go){
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(go.dataset.go);
    return;
  }
  if($('#sidebar')?.classList.contains('open')&&!event.target.closest('#sidebar')&&!event.target.closest('#menuBtn'))$('#sidebar').classList.remove('open');
},true);
window.addEventListener('hashchange',()=>renderCurrent());
window.reloadBillsNow=()=>loadAuthenticatedBills({render:true,retry:false});
window.addEventListener('load',()=>setTimeout(()=>loadAuthenticatedBills({render:true,retry:true}),200),{once:true});
db.auth.onAuthStateChange((_event,session)=>{
  if(session?.user)setTimeout(()=>loadAuthenticatedBills({render:true,retry:true}),100);
  else setHealth(false,0,'Signed out');
});
window.__WS_APP_CONTROLLER__={version:VERSION,navigate,reload:window.reloadBillsNow};
})();