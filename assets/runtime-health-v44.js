(()=>{
'use strict';
const VERSION=45;
const REFRESH_MS=60000;
let refreshing=false;
let lastCount=0;
let lastConnected=false;

const loadPackSummaryFix=()=>{
  if(window.__WS_PACK_SUMMARY_FIX__||document.querySelector('script[data-pack-summary-fix]'))return;
  const script=document.createElement('script');
  script.src='assets/pack-summary-fix-v49.js?v=49';
  script.dataset.packSummaryFix='';
  script.onload=()=>{if(state?.view==='new'&&typeof window.renderItemRows==='function')window.renderItemRows()};
  script.onerror=()=>console.error('[pack-summary] failed to load v49');
  document.head.appendChild(script);
};

const logStatus=(extra={})=>{
  const status={
    module:`data-dashboard v${window.__WS_DATA_FIX__?.version||'unknown'}`,
    runtime:`health v${VERSION}`,
    connected:lastConnected,
    records:lastCount,
    filter:document.querySelector('#billPeriod')?.value||null,
    recovery:typeof window.syncBillsAfterLoad==='function',
    autoRefresh:true,
    packSummary:window.__WS_PACK_SUMMARY_FIX__?.version||'loading'
  };
  console.info(`[data-dashboard] v${window.__WS_DATA_FIX__?.version||'unknown'} loaded`);
  console.table({...status,...extra});
  return status;
};

const addHealthCards=()=>{
  const metrics=document.querySelector('#content .metrics');
  if(!metrics||metrics.querySelector('[data-db-status]'))return;
  const connected=document.createElement('article');
  connected.className='metric';
  connected.dataset.dbStatus='';
  connected.innerHTML=`<small>Database status</small><strong>${lastConnected?'Connected':'Disconnected'}</strong>`;
  const count=document.createElement('article');
  count.className='metric';
  count.dataset.dbCount='';
  count.innerHTML=`<small>Loaded records</small><strong>${Number(lastCount||0).toLocaleString()}</strong>`;
  metrics.append(connected,count);
};

const originalShow=window.show;
if(typeof originalShow==='function'){
  window.show=function(view){
    const result=originalShow(view);
    requestAnimationFrame(addHealthCards);
    if(view==='new')loadPackSummaryFix();
    return result;
  };
}

window.checkAppVersions=()=>logStatus({
  core:window.__WS_CORE__?.version||null,
  data:window.__WS_DATA_FIX__?.version||null,
  pricing:window.__WS_PACK_UNIT_PRICING__?.version||window.__WS_PROCUREMENT_V38__?.version||null,
  packSummary:window.__WS_PACK_SUMMARY_FIX__?.version||null
});

window.refreshBillData=async({silent=false}={})=>{
  if(refreshing||!state?.user||document.hidden)return state?.rows||[];
  refreshing=true;
  try{
    const rows=await window.loadBills(true);
    lastCount=Array.isArray(rows)?rows.length:0;
    lastConnected=true;
    if(!silent&&['bills','dashboard'].includes(state.view))window.show(state.view);
    else requestAnimationFrame(addHealthCards);
    logStatus();
    return rows;
  }catch(error){
    lastConnected=false;
    console.error('[database] refresh failed',error);
    if(!silent&&typeof window.syncBillsAfterLoad==='function')return window.syncBillsAfterLoad();
    return [];
  }finally{refreshing=false}
};

loadPackSummaryFix();
window.addEventListener('load',()=>setTimeout(()=>window.refreshBillData(),50),{once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.refreshBillData({silent:true})});
setInterval(()=>window.refreshBillData({silent:true}),REFRESH_MS);

window.__WS_RUNTIME_HEALTH__={version:VERSION,refreshMs:REFRESH_MS,check:window.checkAppVersions};
})();