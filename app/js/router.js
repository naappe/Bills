import {store} from './store.js';
import {watchSharedUI} from './ui.js?v=5.9.3';
import {dashboardPage} from './dashboard.js?v=5.9.3';
import {settingsPage} from './settings.js?v=5.9.3';
import {newBillPage} from './bill-entry.js?v=5.9.3';
import {billsPage} from './bills.js?v=5.9.3';
import {supplyPage,inventoryPage} from './supply.js?v=5.9.3';
import {priceIntelligencePage} from './price-intelligence.js?v=6.0.0';
import {reportsPage} from './reports.js?v=5.9.3';
import {adminPage} from './admin.js?v=5.9.3';

const routes={
  dashboard:dashboardPage,
  bills:billsPage,
  new:newBillPage,
  products:supplyPage,
  vendors:inventoryPage,
  cost:priceIntelligencePage,
  'price-intelligence':priceIntelligencePage,
  reports:reportsPage,
  settings:settingsPage,
  admin:adminPage
};

const meta={
  dashboard:['Dashboard','Procurement performance overview'],
  bills:['Bills','Search, review and manage supplier purchases'],
  new:['Bill entry','Record purchases and automatically increase stock'],
  products:['Supply','Products, vendors, prices and stock in one master list'],
  vendors:['Inventory','Current stock, minimum levels and stock adjustments'],
  cost:['Price Intelligence','Normalized product costs, price history and vendor comparisons'],
  'price-intelligence':['Price Intelligence','Normalized product costs, price history and vendor comparisons'],
  reports:['Reports','Procurement analytics'],
  settings:['Settings','Workspace preferences and account security'],
  admin:['Admin & users','Configured access and system information']
};

const staffRoutes=new Set(['bills','new','products','vendors']);
let started=false;

function allowedRoute(route){return store.role==='admin'||staffRoutes.has(route)}

function relabelNavigation(){
  const supply=document.querySelector('.nav a[data-route="products"] span');
  const inventory=document.querySelector('.nav a[data-route="vendors"] span');
  const priceIntelligence=document.querySelector('.nav a[data-route="cost"] span');
  if(supply)supply.textContent='Supply';
  if(inventory)inventory.textContent='Inventory';
  if(priceIntelligence)priceIntelligence.textContent='Price Intelligence';
  document.querySelector('.nav a[data-route="products"]')?.setAttribute('title','Supply');
  document.querySelector('.nav a[data-route="vendors"]')?.setAttribute('title','Inventory');
  document.querySelector('.nav a[data-route="cost"]')?.setAttribute('title','Price Intelligence');
}

function applyRoleNavigation(){
  relabelNavigation();
  document.querySelectorAll('.nav a[data-route]').forEach(link=>{
    const allowed=allowedRoute(link.dataset.route);
    link.hidden=!allowed;
    link.setAttribute('aria-hidden',String(!allowed));
    link.tabIndex=allowed?0:-1;
  });
  document.querySelectorAll('.nav-group').forEach(group=>{
    group.hidden=![...group.querySelectorAll('a[data-route]')].some(link=>!link.hidden);
  });
}

export function navigate(route){
  const normalized=String(route||'').replace(/^#/,'').toLowerCase();
  const requested=routes[normalized]?normalized:(store.role==='admin'?'dashboard':'bills');
  const target=allowedRoute(requested)?requested:'bills';
  if(location.hash===`#${target}`)renderRoute();
  else location.hash=`#${target}`;
}

export function renderRoute(){
  let route=(location.hash||'').slice(1).toLowerCase();
  if(!route)route=store.role==='admin'?'dashboard':'bills';
  if(!routes[route]||!allowedRoute(route)){
    route='bills';
    if(location.hash!=='#bills')history.replaceState(null,'','#bills');
  }
  applyRoleNavigation();
  const page=routes[route]||billsPage;
  store.route=route;
  document.querySelectorAll('.nav a[data-route]').forEach(link=>{
    const active=link.dataset.route===store.route||(store.route==='price-intelligence'&&link.dataset.route==='cost');
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const [title,subtitle]=meta[store.route]||meta.bills;
  const titleNode=document.querySelector('#topTitle');
  const subtitleNode=document.querySelector('#topSubtitle');
  const sidebar=document.querySelector('#sidebar');
  const content=document.querySelector('#content');
  if(titleNode)titleNode.textContent=title;
  if(subtitleNode)subtitleNode.textContent=subtitle;
  sidebar?.classList.remove('open');
  if(!content)throw new Error('Application content container is missing.');
  content.dataset.currentRoute=store.route;
  content.replaceChildren();
  try{
    const rendered=page();
    watchSharedUI(content);
    Promise.resolve(rendered).then(()=>watchSharedUI(content)).catch(error=>{
      console.error(`[route:${store.route}]`,error);
      const message=String(error?.message||error||'Unknown error').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      content.innerHTML=`<section class="card"><div class="empty"><h2>This page could not open</h2><p>${message}</p><button class="btn" id="retryRoute" type="button">Retry page</button></div></section>`;
      content.querySelector('#retryRoute')?.addEventListener('click',renderRoute);
    });
  }catch(error){
    console.error(`[route:${store.route}]`,error);
    const message=String(error?.message||error||'Unknown error').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    content.innerHTML=`<section class="card"><div class="empty"><h2>This page could not open</h2><p>${message}</p><button class="btn" id="retryRoute" type="button">Retry page</button></div></section>`;
    content.querySelector('#retryRoute')?.addEventListener('click',renderRoute);
  }
}

export function startRouter(){
  if(!started){
    window.addEventListener('hashchange',renderRoute);
    started=true;
  }
  renderRoute();
}

window.show=navigate;
window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};
