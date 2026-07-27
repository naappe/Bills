import {store} from './store.js';
import {watchSharedUI} from './ui.js?v=5.1.5-ui1';
import {dashboardPage} from './dashboard.js?v=5.1.5-dashboard2';
import {settingsPage} from './settings.js?v=5.1.5';
import {newBillPage} from './bill-entry.js?v=5.1.5';
import {billsPage} from './bills.js?v=5.1.5';
import {productsPage} from './products.js?v=5.1.5';
import {vendorsPage} from './vendors.js?v=5.1.5';
import {ratesPage} from './rates.js?v=5.1.5';
import {reportsPage} from './reports.js?v=5.1.5';
import {adminPage} from './admin.js?v=5.1.5';
const routes={dashboard:dashboardPage,bills:billsPage,new:newBillPage,products:productsPage,rates:ratesPage,prices:ratesPage,vendors:vendorsPage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:['Dashboard','Procurement performance overview'],bills:['Bills','Search, review and manage supplier purchases'],new:['Bill entry','Record or edit every item in one supplier bill'],products:['Products','Recently purchased catalogue and product analytics'],rates:['Price Intelligence','Compare normalized product and supplier rates'],prices:['Price Intelligence','Compare normalized product and supplier rates'],vendors:['Vendors','Supplier directory and spend intelligence'],reports:['Reports','Procurement analytics'],settings:['Settings','Workspace preferences and account security'],admin:['Admin & users','Configured access and system information']};
let started=false;
export function navigate(route){const normalized=String(route||'dashboard').replace(/^#/,'').toLowerCase(),target=routes[normalized]?normalized:'dashboard';if(location.hash===`#${target}`)renderRoute();else location.hash=`#${target}`}
export function renderRoute(){let route=(location.hash||'#dashboard').slice(1).toLowerCase();if(route==='admin'&&store.role!=='admin')route='dashboard';const page=routes[route]||dashboardPage;store.route=routes[route]?route:'dashboard';document.querySelectorAll('.nav a[data-route]').forEach(link=>{const active=link.dataset.route===store.route||(link.dataset.route==='rates'&&store.route==='prices');link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});const [title,subtitle]=meta[store.route]||meta.dashboard;const titleNode=document.querySelector('#topTitle'),subtitleNode=document.querySelector('#topSubtitle'),sidebar=document.querySelector('#sidebar'),content=document.querySelector('#content');if(titleNode)titleNode.textContent=title;if(subtitleNode)subtitleNode.textContent=subtitle;sidebar?.classList.remove('open');if(!content)throw new Error('Application content container is missing.');content.dataset.currentRoute=store.route;content.replaceChildren();try{page();watchSharedUI(content)}catch(error){console.error(`[route:${store.route}]`,error);const message=String(error?.message||error||'Unknown error').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));content.innerHTML=`<section class="card"><div class="empty"><h2>This page could not open</h2><p>${message}</p><button class="btn" id="retryRoute" type="button">Retry page</button></div></section>`;content.querySelector('#retryRoute')?.addEventListener('click',renderRoute)}}
export function startRouter(){if(!started){window.addEventListener('hashchange',renderRoute);started=true}renderRoute()}
window.show=navigate;window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};
