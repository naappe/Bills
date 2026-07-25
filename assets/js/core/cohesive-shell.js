(()=>{
'use strict';
const VERSION=2;

function ensureFooter(){
  const main=document.querySelector('.main');
  if(!main||main.querySelector('.ws-app-footer'))return;
  const footer=document.createElement('footer');
  footer.className='ws-app-footer';
  footer.innerHTML=`<div class="ws-app-footer-inner"><div class="ws-app-footer-brand"><span class="ws-app-footer-mark">WS</span><span>White Saffron Procurement ERP</span></div><div class="ws-app-footer-meta"><span>Procurement records in MVR</span><span>Secure workspace</span><span id="wsFooterYear"></span></div></div>`;
  main.appendChild(footer);
  const year=footer.querySelector('#wsFooterYear');
  if(year)year.textContent=`© ${new Date().getFullYear()}`;
}

function normalizeNavigation(){
  const nav=document.querySelector('.nav');
  if(!nav)return;
  nav.setAttribute('aria-label','Primary navigation');
  nav.querySelectorAll('a[data-view]').forEach(link=>{
    const label=link.querySelector('span')?.textContent?.trim()||link.textContent.trim();
    link.setAttribute('aria-label',label);
    link.setAttribute('title',label);
  });
}

function syncShell(){
  ensureFooter();
  normalizeNavigation();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncShell,{once:true});
else syncShell();

const previousAfterRender=window.UI?.afterRender;
if(window.UI&&typeof previousAfterRender==='function'&&!window.UI.__cohesiveShellWrapped){
  window.UI.afterRender=function(view){
    const result=previousAfterRender.call(this,view);
    syncShell();
    return result;
  };
  window.UI.__cohesiveShellWrapped=true;
}

window.__WS_COHESIVE_SHELL__={version:VERSION,sync:syncShell};
console.info('[cohesive-shell] v2 ready');
})();