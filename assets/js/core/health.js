(()=>{
'use strict';
const VERSION=46;
const addHealthCards=()=>{
  const metrics=document.querySelector('#content .metrics');
  if(!metrics)return;
  const status=window.__WS_DB_STATUS__||{};
  let statusCard=metrics.querySelector('[data-db-status]');
  if(!statusCard){statusCard=document.createElement('article');statusCard.className='metric';statusCard.dataset.dbStatus='';metrics.appendChild(statusCard)}
  statusCard.innerHTML=`<small>Database status</small><strong>${status.status||'Connecting…'}</strong>`;
  let countCard=metrics.querySelector('[data-db-count]');
  if(!countCard){countCard=document.createElement('article');countCard.className='metric';countCard.dataset.dbCount='';metrics.appendChild(countCard)}
  countCard.innerHTML=`<small>Loaded records</small><strong>${Number(status.count||state?.rows?.length||0).toLocaleString()}</strong>`;
};
const originalShow=window.show;
if(typeof originalShow==='function'){
  window.show=function(view){const result=originalShow(view);requestAnimationFrame(addHealthCards);return result};
}
window.checkAppVersions=()=>{
  const status={core:window.__WS_CORE__?.version||null,auth:window.__WS_AUTH__?.version||null,controller:window.__WS_APP_CONTROLLER__?.version||null,runtime:VERSION,connected:Boolean(window.__WS_DB_STATUS__?.connected),records:Number(window.__WS_DB_STATUS__?.count||state?.rows?.length||0)};
  console.table(status);
  return status;
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(addHealthCards)});
requestAnimationFrame(addHealthCards);
window.__WS_RUNTIME_HEALTH__={version:VERSION,displayOnly:true,check:window.checkAppVersions};
})();