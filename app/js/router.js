import {store} from './store.js';
import {dashboardPage,billsPage,newBillPage,settingsPage,adminPage} from './pages.js';
import {productsPage} from './products.js';
import {vendorsPage} from './vendors.js';
import {ratesPage} from './rates.js';
import {reportsPage} from './reports.js';

const routes={dashboard:dashboardPage,bills:billsPage,new:newBillPage,products:productsPage,rates:ratesPage,prices:ratesPage,vendors:vendorsPage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:['Dashboard','Procurement performance overview'],bills:['Bills','Manage supplier purchases'],new:['New bill','Record a supplier purchase'],products:['Products','Product catalogue and purchase history'],rates:['Price Intelligence','Compare normalized product and supplier rates'],prices:['Price Intelligence','Compare normalized product and supplier rates'],vendors:['Vendors','Supplier directory and spend intelligence'],reports:['Reports','Spend, supplier, product and payment analytics'],settings:['Settings','Workspace defaults'],admin:['Admin & users','Access and system status']};
let started=false;

export function navigate(route){
  const normalized=String(route||'dashboard').replace(/^#/,'').toLowerCase();
  location.hash=`#${routes[normalized]?normalized:'dashboard'}`;
}

export function renderRoute(){
  const route=(location.hash||'#dashboard').slice(1).toLowerCase();
  const page=routes[route]||dashboardPage;
  store.route=routes[route]?route:'dashboard';
  document.querySelectorAll('.nav a[data-route]').forEach(link=>link.classList.toggle('active',link.dataset.route===store.route||(link.dataset.route==='rates'&&store.route==='prices')));
  const [title,subtitle]=meta[store.route]||meta.dashboard;
  document.querySelector('#topTitle').textContent=title;
  document.querySelector('#topSubtitle').textContent=subtitle;
  document.querySelector('#sidebar').classList.remove('open');
  document.querySelector('#content').replaceChildren();
  page();
}

export function startRouter(){
  if(!started){window.addEventListener('hashchange',renderRoute);started=true;}
  renderRoute();
}

window.show=navigate;
window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};
