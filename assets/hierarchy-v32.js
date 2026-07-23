(()=>{
'use strict';
const THEME_KEY='ws-color-mode';
let queued=false;
function upgradeHeadings(root=document){
 root.querySelectorAll('.card-head > strong').forEach(strong=>{if(strong.closest('h1,h2,h3,h4,h5,h6'))return;const h=document.createElement('h2');h.className='section-heading';h.innerHTML=strong.innerHTML;strong.replaceWith(h)});
 root.querySelectorAll('.section-title').forEach(title=>{if(/^H[1-6]$/.test(title.tagName))return;const h=document.createElement('h2');h.className=title.className;h.innerHTML=title.innerHTML;[...title.attributes].forEach(a=>{if(a.name!=='class')h.setAttribute(a.name,a.value)});title.replaceWith(h)});
}
function setTheme(mode){
 const next=mode==='dark'?'dark':'light';
 if(document.documentElement.dataset.theme!==next)document.documentElement.dataset.theme=next;
 if(document.body&&document.body.dataset.theme!==next)document.body.dataset.theme=next;
 localStorage.setItem(THEME_KEY,next);localStorage.setItem('theme',next);
 const b=document.getElementById('themeToggle');if(b){b.setAttribute('aria-pressed',String(next==='dark'));b.textContent=next==='dark'?'☀':'◐';b.title=next==='dark'?'Switch to light mode':'Switch to dark mode'}
}
function ensureThemeToggle(){
 const user=document.querySelector('.topbar .user');if(!user)return;
 let b=document.getElementById('themeToggle');
 if(!b){b=document.createElement('button');b.id='themeToggle';b.type='button';b.className='btn secondary small theme-toggle';b.setAttribute('aria-label','Toggle dark theme');b.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));user.prepend(b)}
 setTheme(localStorage.getItem(THEME_KEY)||localStorage.getItem('theme')||'light');
}
function ensureSkipLink(){
 if(document.querySelector('.skip-link'))return;
 const a=document.createElement('a');a.className='skip-link';a.href='#content';a.textContent='Skip to main content';document.body.prepend(a);
 const content=document.getElementById('content');if(content&&!content.hasAttribute('tabindex'))content.tabIndex=-1;
}
function ensureFooter(){
 const main=document.querySelector('main.main');if(!main||main.querySelector('footer'))return;
 const f=document.createElement('footer');f.className='app-footer';f.innerHTML='White Saffron Procurement ERP';main.appendChild(f);
}
function syncAriaCurrent(){
 const current=(location.hash||'#dashboard').slice(1);
 document.querySelectorAll('.nav [data-view]').forEach(a=>{const active=a.dataset.view===current;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
}
function addShortcutHelp(){const user=document.querySelector('.topbar .user');if(!user||document.querySelector('.shortcut-help'))return;const help=document.createElement('div');help.className='shortcut-help';help.setAttribute('aria-label','Keyboard shortcuts');help.innerHTML='<span class="kbd">Ctrl K</span><span class="kbd">Ctrl N</span><span class="kbd">Ctrl T</span>';user.prepend(help)}
function classifyDashboard(){document.querySelectorAll('.metric:not(.stat-card)').forEach(x=>x.classList.add('stat-card'))}
function applyHierarchy(){const content=document.querySelector('#content');if(content){upgradeHeadings(content);classifyDashboard()}ensureSkipLink();ensureFooter();ensureThemeToggle();syncAriaCurrent();addShortcutHelp()}
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyHierarchy()})}
window.addEventListener('load',queue);window.addEventListener('hashchange',queue);document.addEventListener('click',()=>setTimeout(queue,0),true);queue();
window.__WS_HIERARCHY__={version:34,apply:queue,setTheme};
})();
