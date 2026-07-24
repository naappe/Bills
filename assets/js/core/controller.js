(()=>{
'use strict';
const VERSION=54;
const VIEWS=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const PAGE_SIZE=1000;
let loadingPromise=null;
let retryTimer=null;
let currentSession=null;
const $=s=>document.querySelector(s);

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

const ensureHealthCards=()=>{
  const metrics=document.querySelector('#content .metrics');
  if(!metrics)return;
  if(!metrics.querySelector('[data-db-status]')){
    const status=document.createElement('article');
    status.className='metric';status.dataset.dbStatus='';
    status.innerHTML='<small>Database status</small><strong>Connecting…</strong>';
    metrics.appendChild(status);
  }
  if(!metrics.querySelector('[data-db-count]')){
    const count=document.createElement('article');
    count.className='metric';count.dataset.dbCount='';
    count.innerHTML='<small>Loaded records</small><strong>0</strong>';
    metrics.appendChild(count);
  }
};

const setHealth=(status,count,message='')=>{
  ensureHealthCards();
  document.querySelectorAll('[data-db-status] strong').forEach(el=>el.textContent=status);
  document.querySelectorAll('[data-db-count] strong').forEach(el=>el.textContent=Number(count||0).toLocaleString());
  window.__WS_DB_STATUS__={connected:status==='Connected',status,count:Number(count||0),message,updatedAt:new Date().toISOString()};
};

const currentView=()=>{
  const hash=location.hash.slice(1);
  return VIEWS.has(hash)?hash:(VIEWS.has(state.view)?state.view:'dashboard');
};

const renderCurrent=()=>{
  if(typeof window.show!=='function')return;
  window.show(currentView());
  requestAnimationFrame(ensureHealthCards);
};

const queryAllBills=async()=>{
  const result=[];
  for(let from=0;;from+=PAGE_SIZE){
    const {data,error}=await db.from(TABLE).select('*').order('id',{ascending:false}).range(from,from+PAGE_SIZE-1);
    if(error)throw error;
    const batch=Array.isArray(data)?data:[];
    result.push(...batch);
    if(batch.length<PAGE_SIZE)break;
  }
  return result;
};

const loadBillsOnce=({render=true,retry=true}={})=>{
  if(loadingPromise)return loadingPromise;
  clearTimeout(retryTimer);
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
        state.rows=[];state.filtered=[];
        setHealth('Signed out',0,'No authenticated session');
        return [];
      }
      setHealth('Connecting…',state.rows?.length||0);
      const loaded=await queryAllBills();
      state.rows=loaded;
      state.filtered=[...loaded];
      setHealth('Connected',loaded.length);
      if(render)renderCurrent();
      console.info(`[app-controller] v${VERSION}: ${loaded.length} bills loaded as ${state.role}`);
      return loaded;
    }catch(error){
      console.error('[app-controller] direct bill query failed',error);
      setHealth('Error',state.rows?.length||0,error?.message||String(error));
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
  if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);
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

window.addEventListener('hashchange',renderCurrent);
window.reloadBillsNow=()=>loadBillsOnce({render:true,retry:false});
window.refreshBillData=({silent=false}={})=>loadBillsOnce({render:!silent,retry:false});
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
    state.rows=[];state.filtered=[];state.editing=null;
    setHealth('Signed out',0,'Signed out');
  }
});

window.__WS_APP_CONTROLLER__={version:VERSION,navigate,reload:window.reloadBillsNow,resolveRole,render:renderCurrent};
})();