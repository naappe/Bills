import {store} from './store.js';
import {watchSharedUI} from './ui.js?v=5.9.3';
import {dashboardPage} from './dashboard.js?v=5.9.3';
import {settingsPage} from './settings.js?v=5.9.3';
import {newBillPage} from './bill-entry.js?v=5.9.3';
import {billsPage} from './bills.js?v=5.9.3';
import {normalizeBillsLayout} from './bills-layout-fix.js?v=5.9.6';
import {supplyPage,inventoryPage} from './supply.js?v=5.9.3';
import {costPage} from './cost.js?v=5.9.5';
import {priceIntelligencePage} from './price-intelligence.js?v=5.9.5';
import {reportsPage} from './reports.js?v=5.9.3';
import {adminPage} from './admin.js?v=5.9.3';

function billsRoutePage(){
  const rendered=billsPage();
  normalizeBillsLayout(document.querySelector('#content'));
  return rendered;
}

const routes={dashboard:dashboardPage,bills:billsRoutePage,new:newBillPage,products:supplyPage,vendors:inventoryPage,cost:costPage,'price-intelligence':priceIntelligencePage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:'Dashboard',bills:'Bills',new:'Bill entry',products:'Supply',vendors:'Inventory',cost:'Cost','price-intelligence':'Cost intelligence',reports:'Reports',settings:'Settings',admin:'Admin & users'};
const staffRoutes=new Set(['bills','new','products','vendors']);
let started=false;

function installCenteredShell(){
  document.querySelector('#topSubtitle')?.remove();
  if(document.querySelector('#centeredShellStyles'))return;
  const style=document.createElement('style');
  style.id='centeredShellStyles';
  style.textContent=`
    :root{--workspace-max:1600px}
    .app,.main{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important}
    .main{min-width:0!important}
    .content{
      width:100%!important;
      max-width:var(--workspace-max)!important;
      margin-left:auto!important;
      margin-right:auto!important;
      padding-left:24px!important;
      padding-right:24px!important;
      box-sizing:border-box!important;
    }
    .topbar{width:100%!important;box-sizing:border-box!important}
    .topbar>.top-left{
      width:100%!important;
      max-width:var(--workspace-max)!important;
      margin-left:auto!important;
      margin-right:auto!important;
    }
    .app-footer>div{
      width:100%!important;
      max-width:var(--workspace-max)!important;
      margin-left:auto!important;
      margin-right:auto!important;
      box-sizing:border-box!important;
    }
    @media(max-width:820px){
      .content{max-width:none!important;margin:0!important;padding-left:16px!important;padding-right:16px!important}
      .topbar>.top-left{max-width:none!important;margin:0!important}
    }
    @media(max-width:520px){.content{padding-left:12px!important;padding-right:12px!important}}
  `;
  document.head.appendChild(style);
}

function allowedRoute(route){return store.role==='admin'||staffRoutes.has(route)}
function relabelNavigation(){
  const supply=document.querySelector('.nav a[data-route="products"] span');
  const inventory=document.querySelector('.nav a[data-route="vendors"] span');
  if(supply)supply.textContent='Supply';
  if(inventory)inventory.textContent='Inventory';
  document.querySelector('.nav a[data-route="products"]')?.setAttribute('title','Supply');
  document.querySelector('.nav a[data-route="vendors"]')?.setAttribute('title','Inventory');
}
function applyRoleNavigation(){relabelNavigation();document.querySelectorAll('.nav a[data-route]').forEach(link=>{const allowed=allowedRoute(link.dataset.route);link.hidden=!allowed;link.setAttribute('aria-hidden',String(!allowed));link.tabIndex=allowed?0:-1});document.querySelectorAll('.nav-group').forEach(group=>{group.hidden=![...group.querySelectorAll('a[data-route]')].some(link=>!link.hidden)})}
export function navigate(route){const normalized=String(route||'').replace(/^#/,'').toLowerCase(),requested=routes[normalized]?normalized:(store.role==='admin'?'dashboard':'bills'),target=allowedRoute(requested)?requested:'bills';if(location.hash===`#${target}`)renderRoute();else location.hash=`#${target}`}
export function renderRoute(){installCenteredShell();let route=(location.hash||'').slice(1).toLowerCase();if(!route)route=store.role==='admin'?'dashboard':'bills';if(!routes[route]||!allowedRoute(route)){route='bills';if(location.hash!=='#bills'){history.replaceState(null,'','#bills')}}applyRoleNavigation();const page=routes[route]||billsRoutePage;store.route=route;const activeRoute=route==='price-intelligence'?'cost':route;document.querySelectorAll('.nav a[data-route]').forEach(link=>{const active=link.dataset.route===activeRoute;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});const title=meta[store.route]||meta.bills;const titleNode=document.querySelector('#topTitle'),sidebar=document.querySelector('#sidebar'),content=document.querySelector('#content');if(titleNode)titleNode.textContent=title;sidebar?.classList.remove('open');if(!content)throw new Error('Application content container is missing.');content.dataset.currentRoute=store.route;content.replaceChildren();try{const rendered=page();watchSharedUI(content);Promise.resolve(rendered).then(()=>watchSharedUI(content)).catch(error=>{console.error(`[route:${store.route}]`,error);const message=String(error?.message||error||'Unknown error').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));content.innerHTML=`<section class="card"><div class="empty"><h2>This page could not open</h2><p>${message}</p><button class="btn" id="retryRoute" type="button">Retry page</button></div></section>`;content.querySelector('#retryRoute')?.addEventListener('click',renderRoute)})}catch(error){console.error(`[route:${store.route}]`,error);const message=String(error?.message||error||'Unknown error').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));content.innerHTML=`<section class="card"><div class="empty"><h2>This page could not open</h2><p>${message}</p><button class="btn" id="retryRoute" type="button">Retry page</button></div></section>`;content.querySelector('#retryRoute')?.addEventListener('click',renderRoute)}}
export function startRouter(){installCenteredShell();if(!started){window.addEventListener('hashchange',renderRoute);started=true}renderRoute()}
window.show=navigate;window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};
