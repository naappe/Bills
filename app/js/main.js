import {store} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter} from './router.js?v=4.9.37';
import './vendor-picker.js?v=4.9.37';
import './bill-entry-cleanup.js?v=4.9.37';

const $=s=>document.querySelector(s);
const navGroups=[
  ['Overview',[['dashboard','Dashboard','fa-table-cells-large']]],
  ['Procurement',[['bills','Bills','fa-file-invoice'],['rates','Price Intelligence','fa-chart-line','admin'],['products','Products','fa-box'],['vendors','Vendors','fa-building']]],
  ['Analytics',[['reports','Reports','fa-chart-pie']]],
  ['Administration',[['settings','Settings','fa-gear'],['admin','Admin & users','fa-users-gear','admin']]]
];
const health={version:'4.9.37',booted:false,authenticated:false,dataLoaded:false,error:null,startedAt:new Date().toISOString()};
window.app={store,health};
function buildNav(){$('#nav').innerHTML=navGroups.map(([group,items])=>{const visible=items.filter(([, , ,requiredRole])=>!requiredRole||store.role===requiredRole);if(!visible.length)return'';return `<div><div class="nav-label">${group}</div>${visible.map(([route,label,icon])=>`<a href="#${route}" data-route="${route}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</div>`}).join('')}
function showApp(){buildNav();document.body.classList.remove('auth-pending');$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');const email=store.user?.email||'Signed in';$('#roleLabel').textContent=store.role.toUpperCase();$('#emailLabel').textContent=email;$('#avatar').textContent=email.charAt(0).toUpperCase();health.authenticated=true}
function showLogin(message=''){document.body.classList.remove('auth-pending');$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden');$('#loginNotice').textContent=message;health.authenticated=false}
function showWorkspaceError(error){const message=error?.message||String(error||'Unknown error');health.error=message;console.error('[Procurement workspace]',error);$('#content').innerHTML=`<section class="panel"><div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><h2>Workspace could not finish loading</h2><p>${message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p><button class="btn" id="retryWorkspace" type="button">Retry</button></div></section>`;$('#retryWorkspace')?.addEventListener('click',()=>loadAndStart())}
async function loadAndStart(){$('#content').innerHTML='<section class="panel"><div class="empty"><i class="fa-solid fa-circle-notch fa-spin"></i><h2>Loading procurement workspace</h2><p>Retrieving bills and preparing the dashboard…</p></div></section>';try{await loadBills();health.dataLoaded=true;startRouter()}catch(error){health.dataLoaded=false;showWorkspaceError(error);throw error}}
async function boot(){buildNav();$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#logoutBtn').onclick=async()=>{await signOut();health.dataLoaded=false;showLogin()};$('#footerYear').textContent=new Date().getFullYear();$('#loginForm').onsubmit=async e=>{e.preventDefault();const notice=$('#loginNotice'),submit=e.submitter||$('#loginForm button[type="submit"]');notice.textContent='Signing in…';if(submit)submit.disabled=true;try{await signIn($('#loginName').value,$('#loginPassword').value);showApp();notice.textContent='';await loadAndStart().catch(()=>{})}catch(error){health.error=error?.message||String(error);showLogin(health.error)}finally{if(submit)submit.disabled=false}};try{const user=await restoreSession();if(!user){showLogin();health.booted=true;return}showApp();await loadAndStart().catch(()=>{})}catch(error){health.error=error?.message||String(error);console.error('[Authentication restore]',error);showLogin('Your saved session expired. Please sign in again.')}finally{health.booted=true}}
boot();