import {store} from './store.js';
import {dashboardPage} from './dashboard.js?v=4.9.63';
import {settingsPage} from './settings.js?v=4.9.63';
import {newBillPage} from './bill-entry.js?v=4.9.63';
import {billsPage} from './bills.js?v=4.9.63';
import {productsPage} from './products.js?v=5.0.0';
import {vendorsPage} from './vendors.js?v=4.9.63';
import {ratesPage} from './rates.js?v=4.9.63';
import {reportsPage} from './reports.js?v=4.9.63';
import {adminPage} from './admin.js?v=4.9.63';

const routes={dashboard:dashboardPage,bills:billsPage,new:newBillPage,products:productsPage,rates:ratesPage,prices:ratesPage,vendors:vendorsPage,reports:reportsPage,settings:settingsPage,admin:adminPage};
const meta={dashboard:['Dashboard','Procurement performance overview'],bills:['Bills','Search, review and manage supplier purchases'],new:['Bill entry','Record or edit every item in one supplier bill'],products:['Products','Product price analysis'],rates:['Price Intelligence','Compare normalized product and supplier rates'],prices:['Price Intelligence','Compare normalized product and supplier rates'],vendors:['Vendors','Supplier directory and spend intelligence'],reports:['Reports','Procurement analytics'],settings:['Settings','Workspace preferences and account security'],admin:['Admin & users','Account access, roles and system health']};
let started=false;
export function navigate(route){const normalized=String(route||'dashboard').replace(/^#/,'').toLowerCase();location.hash=`#${routes[normalized]?normalized:'dashboard'}`}
export function renderRoute(){let route=(location.hash||'#dashboard').slice(1).toLowerCase();if(route==='admin'&&store.role!=='admin')route='dashboard';const page=routes[route]||dashboardPage;store.route=routes[route]?route:'dashboard';document.querySelectorAll('.nav a[data-route]').forEach(link=>link.classList.toggle('active',link.dataset.route===store.route||(link.dataset.route==='rates'&&store.route==='prices')));const [title,subtitle]=meta[store.route]||meta.dashboard;document.querySelector('#topTitle').textContent=title;document.querySelector('#topSubtitle').textContent=subtitle;document.querySelector('#sidebar').classList.remove('open');const content=document.querySelector('#content');content.dataset.route=store.route;content.replaceChildren();page();content.querySelectorAll(':scope > .page-head').forEach(header=>header.remove());const focusTarget=content.querySelector('button,input,select,a,[tabindex]');focusTarget?.focus?.({preventScroll:true})}
export function startRouter(){if(!started){window.addEventListener('hashchange',renderRoute);started=true}renderRoute()}
window.show=navigate;window.router={navigate,renderRoute,startRouter,get route(){return store.route},get started(){return started}};