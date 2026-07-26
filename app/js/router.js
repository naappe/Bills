import {store} from './store.js';
import {dashboardPage} from './dashboard.js?v=4.9.51';
import {settingsPage} from './settings.js?v=4.9.51';
import {newBillPage} from './bill-entry.js?v=4.9.51';
import {billsPage} from './bills.js?v=4.9.51';
import {productsPage} from './products.js?v=4.9.52';
import {vendorsPage} from './vendors.js?v=4.9.51';
import {ratesPage} from './rates.js?v=4.9.51';
import {reportsPage} from './reports.js?v=4.9.51';
import {adminPage} from './admin.js?v=4.9.51';

const routes={dashboard:dashboardPage,bills:billsPage,new:newBillPage,products:productsPage,rates:ratesPage,prices:ratesPage,vendors:vendorsPage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:['Dashboard','Procurement performance overview'],bills:['Bills','Search, review and manage supplier purchases'],new:['Bill entry','Record or edit every item in one supplier bill'],products:['Products','Retail and wholesale product prices'],rates:['Price Intelligence','Compare normalized product and supplier rates'],prices:['Price Intelligence','Compare normalized product and supplier rates'],vendors:['Vendors','Supplier directory and spend intelligence'],reports:['Reports','Procurement analytics'],settings:['Settings','Workspace preferences and account security'],admin:['Admin & users','Account access, roles and system health']};
let started=false;

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
function ensurePageHeader(content,title,subtitle){
  if(content.querySelector(':scope > .page-head'))return;
  const header=document.createElement('header');
  header.className='page-head';
  header.innerHTML=`<div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>`;
  content.prepend(header);
}

export function navigate(route){const normalized=String(route||'dashboard').replace(/^#/,'').toLowerCase();location.hash=`#${routes[normalized]?normalized:'dashboard'}`}
export function renderRoute(){
  let route=(location.hash||'#dashboard').slice(1).toLowerCase();
  if(route==='admin'&&store.role!=='admin')route='dashboard';
  const page=routes[route]||dashboardPage;
  store.route=routes[route]?route:'dashboard';
  document.querySelectorAll('.nav a[data-route]').forEach(link=>link.classList.toggle('active',link.dataset.route===store.route||(link.dataset.route==='rates'&&store.route==='prices')));
  const [title,subtitle]=meta[store.route]||meta.dashboard;
  document.querySelector('#topTitle').textContent=title;
  document.querySelector('#topSubtitle').textContent=subtitle;
  document.querySelector('#sidebar').classList.remove('open');
  const content=document.querySelector('#content');
  content.dataset.route=store.route;
  content.replaceChildren();
  page();
  ensurePageHeader(content,title,subtitle);
  const heading=content.querySelector('.page-head h1');
  if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}
}
export function startRouter(){if(!started){window.addEventListener('hashchange',renderRoute);started=true}renderRoute()}
window.show=navigate;
window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};