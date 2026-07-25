import {store} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter} from './router.js';

const $=s=>document.querySelector(s);
const navGroups=[['Overview',[['dashboard','Dashboard','fa-table-cells-large']]],['Procurement',[['bills','Bills','fa-file-invoice'],['rates','Price Intelligence','fa-chart-line'],['products','Products','fa-box'],['vendors','Vendors','fa-building']]],['Analytics',[['reports','Reports','fa-chart-pie']]],['Administration',[['settings','Settings','fa-gear'],['admin','Admin & users','fa-users-gear']]]];
function buildNav(){$('#nav').innerHTML=navGroups.map(([group,items])=>`<div><div class="nav-label">${group}</div>${items.map(([route,label,icon])=>`<a href="#${route}" data-route="${route}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</div>`).join('')}
function showApp(){document.body.classList.remove('auth-pending');$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');const email=store.user?.email||'Signed in';$('#roleLabel').textContent=store.role.toUpperCase();$('#emailLabel').textContent=email;$('#avatar').textContent=email.charAt(0).toUpperCase()}
function showLogin(){document.body.classList.remove('auth-pending');$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden')}
async function boot(){buildNav();$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#logoutBtn').onclick=async()=>{await signOut();showLogin()};$('#footerYear').textContent=new Date().getFullYear();
  $('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginNotice').textContent='Signing in…';try{await signIn($('#loginName').value,$('#loginPassword').value);showApp();await loadBills();startRouter()}catch(error){$('#loginNotice').textContent=error.message}};
  try{const user=await restoreSession();if(!user){showLogin();return}showApp();await loadBills();startRouter()}catch(error){console.error(error);showLogin();$('#loginNotice').textContent='Could not restore the session.'}
}
boot();
