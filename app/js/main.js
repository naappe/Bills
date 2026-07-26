import {store} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter} from './router.js';

const $=s=>document.querySelector(s);
const navGroups=[
  ['Overview',[['dashboard','Dashboard','fa-table-cells-large']]],
  ['Procurement',[['bills','Bills','fa-file-invoice'],['rates','Price Intelligence','fa-chart-line','admin'],['products','Products','fa-box'],['vendors','Vendors','fa-building']]],
  ['Analytics',[['reports','Reports','fa-chart-pie']]],
  ['Administration',[['settings','Settings','fa-gear'],['admin','Admin & users','fa-users-gear','admin']]]
];
const health={version:'2.2.0',booted:false,authenticated:false,dataLoaded:false,error:null,startedAt:new Date().toISOString()};
window.app={store,health};

function buildNav(){
  $('#nav').innerHTML=navGroups.map(([group,items])=>{
    const visible=items.filter(([, , ,requiredRole])=>!requiredRole||store.role===requiredRole);
    if(!visible.length)return'';
    return `<div><div class="nav-label">${group}</div>${visible.map(([route,label,icon])=>`<a href="#${route}" data-route="${route}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</div>`;
  }).join('');
}
function showApp(){
  buildNav();
  document.body.classList.remove('auth-pending');
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  const email=store.user?.email||'Signed in';
  $('#roleLabel').textContent=store.role.toUpperCase();
  $('#emailLabel').textContent=email;
  $('#avatar').textContent=email.charAt(0).toUpperCase();
  health.authenticated=true;
}
function showLogin(){document.body.classList.remove('auth-pending');$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden');health.authenticated=false}
async function loadAndStart(){await loadBills();health.dataLoaded=true;startRouter()}
async function boot(){
  try{
    buildNav();
    $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
    $('#logoutBtn').onclick=async()=>{await signOut();health.dataLoaded=false;showLogin()};
    $('#footerYear').textContent=new Date().getFullYear();
    $('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginNotice').textContent='Signing in…';try{await signIn($('#loginName').value,$('#loginPassword').value);showApp();await loadAndStart();$('#loginNotice').textContent=''}catch(error){health.error=error.message;$('#loginNotice').textContent=error.message}};
    const user=await restoreSession();
    if(!user){showLogin();health.booted=true;return}
    showApp();
    await loadAndStart();
    health.booted=true;
  }catch(error){
    health.error=error?.message||String(error);
    console.error('[Bills V2 boot]',error);
    showLogin();
    $('#loginNotice').textContent='Could not restore the session.';
  }
}

boot();