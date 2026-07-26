import {store} from './store.js';
import {dashboardPage,settingsPage} from './pages.js';
import {newBillPage} from './bill-entry.js?v=4.9.38';
import {billsPage} from './bills.js?v=4.9.38';
import {productsPage} from './products.js?v=4.9.38';
import {vendorsPage} from './vendors.js?v=4.9.38';
import {ratesPage} from './rates.js?v=4.9.38';
import {reportsPage} from './reports.js?v=4.9.38';
import {adminPage} from './admin.js?v=4.9.38';

const routes={dashboard:dashboardPage,bills:billsPage,new:newBillPage,products:productsPage,rates:ratesPage,prices:ratesPage,vendors:vendorsPage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:['Dashboard','Procurement performance overview'],bills:['Bills','Manage supplier purchases'],new:['Bill entry','Record or edit every item in one supplier bill'],products:['Products','Retail and wholesale product prices'],rates:['Price Intelligence','Compare normalized product and supplier rates'],prices:['Price Intelligence','Compare normalized product and supplier rates'],vendors:['Vendors','Supplier directory and spend intelligence'],reports:['Reports','Procurement analytics'],settings:['Settings','Workspace defaults'],admin:['Admin & users','Account access, roles and system health']};
let started=false;

export function navigate(route){const normalized=String(route||'dashboard').replace(/^#/,'').toLowerCase();location.hash=`#${routes[normalized]?normalized:'dashboard'}`}
export function renderRoute(){let route=(location.hash||'#dashboard').slice(1).toLowerCase();if(route==='admin'&&store.role!=='admin')route='dashboard';const page=routes[route]||dashboardPage;store.route=routes[route]?route:'dashboard';document.querySelectorAll('.nav a[data-route]').forEach(link=>link.classList.toggle('active',link.dataset.route===store.route||(link.dataset.route==='rates'&&store.route==='prices')));const [title,subtitle]=meta[store.route]||meta.dashboard;document.querySelector('#topTitle').textContent=title;document.querySelector('#topSubtitle').textContent=subtitle;document.querySelector('#sidebar').classList.remove('open');document.querySelector('#content').replaceChildren();page()}
export function startRouter(){if(!started){window.addEventListener('hashchange',renderRoute);started=true}renderRoute()}
window.show=navigate;
window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};