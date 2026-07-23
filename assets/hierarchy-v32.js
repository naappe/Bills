(()=>{
'use strict';

function upgradeHeadings(root=document){
  root.querySelectorAll('.card-head > strong').forEach(strong=>{
    if(strong.closest('h1,h2,h3,h4,h5,h6'))return;
    const h=document.createElement('h2');
    h.className='section-heading';
    h.innerHTML=strong.innerHTML;
    strong.replaceWith(h);
  });
  root.querySelectorAll('.section-title').forEach(title=>{
    if(/^H[1-6]$/.test(title.tagName))return;
    const h=document.createElement('h2');
    h.className=title.className;
    h.innerHTML=title.innerHTML;
    [...title.attributes].forEach(a=>{if(a.name!=='class')h.setAttribute(a.name,a.value)});
    title.replaceWith(h);
  });
}

function addShortcutHelp(){
  const user=document.querySelector('.topbar .user');
  if(!user||document.querySelector('.shortcut-help'))return;
  const help=document.createElement('div');
  help.className='shortcut-help';
  help.setAttribute('aria-label','Keyboard shortcuts');
  help.innerHTML='<span class="kbd">Ctrl K</span><span class="kbd">Ctrl N</span><span class="kbd">Ctrl T</span>';
  user.prepend(help);
}

function classifyDashboard(){
  document.querySelectorAll('.metric').forEach(x=>x.classList.add('stat-card'));
  document.querySelectorAll('.dash-card,.ux-card').forEach(x=>{
    const text=(x.querySelector('h2,h3,.card-head')?.textContent||'').toLowerCase();
    if(text.includes('trend')||text.includes('chart')||x.querySelector('canvas,svg'))x.classList.add('chart-card');
    if(text.includes('activity')||text.includes('latest'))x.classList.add('activity-card');
  });
}

function applyHierarchy(){
  const content=document.querySelector('#content');
  if(content){upgradeHeadings(content);classifyDashboard()}
  addShortcutHelp();
}

const target=document.querySelector('#content');
if(target)new MutationObserver(()=>requestAnimationFrame(applyHierarchy)).observe(target,{childList:true,subtree:true});
window.addEventListener('load',applyHierarchy);
applyHierarchy();
window.__WS_HIERARCHY__={version:32,apply:applyHierarchy};
})();
