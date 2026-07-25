(()=>{
'use strict';
const VERSION=56;
const VIEWS=new Set(['dashboard','bills','new','rates','mobile','products','vendors','prices','reports','settings','admin']);
const PAGE_SIZE=1000;
let loadingPromise=null;
let retryTimer=null;
let currentSession=null;
let loadedUserId=null;
let hasLoadedBills=false;
const $=selector=>document.querySelector(selector);

const clearRetry=()=>{
  if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
};

const resolveRole=user=>{
  if(window.__WS_AUTH__?.resolveRole)return window.__WS_AUTH__.resolveRole(user);
  if(!user)return 'staff';
  if(typeof ADMIN_IDS!=='undefined'&&ADMIN_IDS.includes(user.id))return 'admin';
  const candidate=String(user.app_metadata?.role||user.user_metadata?.role||'staff').toLowerCase();
  return ['admin','manager','staff','readonly'].includes(candidate)?candidate:'staff';
};

const applySession=session=>{
  currentSession=session||null;
  window.__WS_AUTH__?.setAuthView?.(currentSession);
  const user=currentSession?.user||null;
  state.user=user;
  state.role=user?resolveRole(user):'staff';
};

const setHealth=(status,count,message='')=>{
  document.querySelectorAll('[data-db-status] strong').forEach(element=>element.textContent=status);
  document.querySelectorAll('[data-db-count] strong').forEach(element=>element.textContent=Number(count||0).toLocaleString());
  window.__WS_DB_STATUS__={connected:status==='Connected',status,count:Number(count||0),message,updatedAt:new Date().toISOString()};
};

const currentView=()=>{
  const hash=location.hash.slice(1);
  let remembered='';try{remembered=localStorage.getItem('ws-current-view')||''}catch(_error){}
  return VIEWS.has(hash)?hash:(VIEWS.has(remembered)?remembered:(VIEWS.has(state.view)?state.view:'dashboard'));
};

const renderCurrent=()=>{
  const view=currentView();state.view=view;try{localStorage.setItem('ws-current-view',view)}catch(_error){}
  const rendered=typeof window.show==='function'?window.show(view):null;
  return Promise.resolve(rendered).finally(()=>document.body.classList.remove('ws-view-pending'));
};

const queryAllBills=async()=>{
  const result=[];
  for(let from=0;;from+=PAGE_SIZE){
    const {data,error}=await db.from(TABLE).select('*').is('deleted_at',null).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+PAGE_SIZE-1);
    if(error)throw error;
    const batch=Array.isArray(data)?data:[];
    result.push(...batch);
    if(batch.length<PAGE_SIZE)break;
  }
  return result;
};

const loadBillsOnce=({render=true,retry=true,force=false}={})=>{
  if(loadingPromise)return loadingPromise;
  clearRetry();
  loadingPromise=(async()=>{
    try{
      let session=currentSession;
      if(!session){
        const result=await db.auth.getSession();
        if(result.error)throw result.error;
        session=result.data.session;
      }
      applySession(session);
      if(!session?.user){
        loadedUserId=null;hasLoadedBills=false;
        state.rows=[];state.filtered=[];
        setHealth('Signed out',0,'No authenticated session');
        return [];
      }
      if(!force&&hasLoadedBills&&loadedUserId===session.user.id){
        if(render)renderCurrent();
        return state.rows;
      }
      setHealth('Connecting…',state.rows?.length||0);
      const loaded=await queryAllBills();
      state.rows=loaded;
      state.filtered=[...loaded];
      loadedUserId=session.user.id;hasLoadedBills=true;
      setHealth('Connected',loaded.length);
      if(render)renderCurrent();
      console.info(`[app-controller] v${VERSION}: ${loaded.length} bills loaded as ${state.role}`);
      return loaded;
    }catch(error){
      console.error('[app-controller] bill query failed',error);
      setHealth('Error',state.rows?.length||0,error?.message||String(error));
      window.__WS_LAST_LOAD_ERROR__=error;
      if(retry)retryTimer=setTimeout(()=>loadBillsOnce({render:true,retry:false}),3000);
      return state.rows||[];
    }finally{
      loadingPromise=null;
    }
  })();
  return loadingPromise;
};

const navigate=view=>{
  view=VIEWS.has(view)?view:'dashboard';
  $('#sidebar')?.classList.remove('open');
  if(location.hash!==`#${view}`)history.pushState(null,'',location.pathname+`#${view}`);
  state.view=view;
  renderCurrent();
};

document.addEventListener('click',event=>{
  const link=event.target.closest('.nav [data-view]');
  if(link){event.preventDefault();navigate(link.dataset.view);return;}
  const go=event.target.closest('[data-go]');
  if(go){event.preventDefault();navigate(go.dataset.go);return;}
  if($('#sidebar')?.classList.contains('open')&&!event.target.closest('#sidebar')&&!event.target.closest('#menuBtn'))$('#sidebar').classList.remove('open');
},true);

const initialView=currentView();
if(location.hash!==`#${initialView}`)history.replaceState(null,'',location.pathname+`#${initialView}`);
state.view=initialView;
document.body.classList.add('ws-view-pending');
window.addEventListener('hashchange',renderCurrent);
window.addEventListener('beforeunload',clearRetry);
window.reloadBillsNow=()=>loadBillsOnce({render:true,retry:false,force:true});
window.refreshBillData=({silent=false}={})=>loadBillsOnce({render:!silent,retry:false,force:true});
window.syncBillsAfterLoad=()=>loadBillsOnce({render:true,retry:true});

db.auth.getSession().then(({data,error})=>{
  if(error){applySession(null);setHealth('Error',0,error.message);return;}
  applySession(data.session);
  if(data.session?.user)loadBillsOnce({render:true,retry:true});
  else setHealth('Signed out',0,'No authenticated session');
});

db.auth.onAuthStateChange((_event,session)=>{
  applySession(session);
  if(session?.user)setTimeout(()=>loadBillsOnce({render:true,retry:true}),0);
  else{
    clearRetry();
    loadedUserId=null;hasLoadedBills=false;
    state.rows=[];state.filtered=[];state.editing=null;
    setHealth('Signed out',0,'Signed out');
  }
});

window.__WS_APP_CONTROLLER__={version:VERSION,navigate,reload:window.reloadBillsNow,resolveRole,render:renderCurrent,clearRetry};
})();