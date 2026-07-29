import {store,escapeHtml} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter,navigate} from './router.js?v=5.9.2';

const $=selector=>document.querySelector(selector);
const navGroups=[
  ['Overview',[['dashboard','Dashboard','fa-table-cells-large']]],
  ['Procurement',[
    ['bills','Bills','fa-file-invoice'],
    ['cost','Cost','fa-calculator','admin'],
    ['products','Supply','fa-box'],
    ['vendors','Inventory','fa-warehouse']
  ]],
  ['Analytics',[['reports','Reports','fa-chart-pie']]],
  ['Administration',[
    ['settings','Settings','fa-gear'],
    ['admin','Admin & users','fa-users-gear','admin']
  ]]
];

const health={version:'5.9.2',booted:false,authenticated:false,dataLoaded:false,error:null,runtimeErrors:[],startedAt:new Date().toISOString()};
window.app={store,health};

const SESSION_TIMEOUT_MS=15*60*1000;
const SESSION_WARNING_MS=60*1000;
let inactivityTimer=0;
let warningTimer=0;
let countdownTimer=0;
let sessionDeadline=0;
let lastActivityAt=0;
let sessionEnding=false;

function recordRuntimeError(error,source='runtime'){
  const message=error?.message||String(error||'Unknown error');
  health.error=message;
  health.runtimeErrors.push({source,message,route:store.route||'unknown',stack:error?.stack||'',time:new Date().toISOString()});
  if(health.runtimeErrors.length>20)health.runtimeErrors.shift();
  console.error(`[${source}]`,error);
}
window.addEventListener('error',event=>recordRuntimeError(event.error||event.message,'window.error'));
window.addEventListener('unhandledrejection',event=>recordRuntimeError(event.reason,'unhandledrejection'));

function installSearchableLists(){
  if(!$('#searchableListStyles')){
    const style=document.createElement('style');
    style.id='searchableListStyles';
    style.textContent=`
      .searchable-list-wrap{position:relative;display:block}
      .searchable-list-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;max-height:280px;overflow:auto;padding:6px;border:1px solid #d7e0e8;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(15,35,61,.18)}
      .searchable-list-menu.open{display:block}
      .searchable-list-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#162f52;text-align:left;font:600 13px/1.35 Inter,system-ui,sans-serif;cursor:pointer}
      .searchable-list-option:hover,.searchable-list-option.active{background:#eef4fb;color:#102b4e}
      .searchable-list-empty{padding:12px;color:#6f7f94;font-size:12px;text-align:center}
    `;
    document.head.appendChild(style);
  }

  document.querySelectorAll('input[list]:not([data-searchable-list])').forEach(input=>{
    const listId=input.getAttribute('list');
    const list=document.getElementById(listId);
    if(!list)return;
    const values=[...list.querySelectorAll('option')].map(option=>option.value||option.textContent||'').map(value=>value.trim()).filter(Boolean);
    if(!values.length)return;

    input.dataset.searchableList=listId;
    input.removeAttribute('list');
    input.setAttribute('autocomplete','off');

    const wrap=document.createElement('span');
    wrap.className='searchable-list-wrap';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);

    const menu=document.createElement('div');
    menu.className='searchable-list-menu';
    menu.setAttribute('role','listbox');
    wrap.appendChild(menu);
    let active=-1;
    let selecting=false;

    const close=()=>{menu.classList.remove('open');active=-1};
    const choose=value=>{
      selecting=true;
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      close();
      requestAnimationFrame(()=>{close();selecting=false});
    };
    const draw=(showAll=false)=>{
      if(selecting)return;
      const query=showAll?'':input.value.trim().toLowerCase();
      const matches=values.filter(value=>!query||value.toLowerCase().includes(query));
      active=-1;
      menu.innerHTML=matches.length?matches.map(value=>`<button class="searchable-list-option" type="button" role="option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(''):'<div class="searchable-list-empty">No matching options</div>';
      menu.classList.add('open');
      menu.querySelectorAll('.searchable-list-option').forEach(option=>option.addEventListener('mousedown',event=>{event.preventDefault();choose(option.dataset.value)}));
    };
    const setActive=index=>{
      const options=[...menu.querySelectorAll('.searchable-list-option')];
      if(!options.length)return;
      active=(index+options.length)%options.length;
      options.forEach((option,i)=>option.classList.toggle('active',i===active));
      options[active].scrollIntoView({block:'nearest'});
    };

    input.addEventListener('focus',()=>draw(true));
    input.addEventListener('click',()=>draw(true));
    input.addEventListener('input',()=>draw(false));
    input.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active+1)}
      else if(event.key==='ArrowUp'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active-1)}
      else if(event.key==='Enter'&&active>=0){event.preventDefault();menu.querySelectorAll('.searchable-list-option')[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))}
      else if(event.key==='Escape')close();
    });
    document.addEventListener('mousedown',event=>{if(!wrap.contains(event.target))close()});
  });
}

function watchSearchableLists(){
  installSearchableLists();
  const target=$('#content');
  if(!target||target.dataset.searchableListWatch)return;
  target.dataset.searchableListWatch='1';
  new MutationObserver(()=>installSearchableLists()).observe(target,{childList:true,subtree:true});
}

function renderNavigation(target,{grouped=false}={}){
  if(!target)return;
  target.innerHTML=navGroups.map(([group,items])=>{
    const visible=items.filter(([, , ,role])=>!role||store.role===role);
    if(!visible.length)return'';
    const links=visible.map(([route,label,icon])=>`<a href="#${route}" data-route="${route}" title="${label}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('');
    return grouped?`<div class="nav-group"><div class="nav-label">${group}</div>${links}</div>`:links;
  }).join('');
}

function buildNavigation(){
  renderNavigation($('#desktopNav'));
  renderNavigation($('#mobileNav'),{grouped:true});
}

function setMobileNavigation(open){
  $('#sidebar')?.classList.toggle('open',open);
  $('#sidebarBackdrop')?.classList.toggle('visible',open);
  $('#sidebarBackdrop')?.classList.toggle('hidden',!open);
  document.body.classList.toggle('nav-open',open);
  $('#menuBtn')?.setAttribute('aria-expanded',String(open));
}
const closeMobileNavigation=()=>setMobileNavigation(false);
const toggleMobileNavigation=()=>setMobileNavigation(!$('#sidebar')?.classList.contains('open'));

function hideAuthLoader(){$('#authLoader')?.classList.add('hidden');document.body.classList.remove('auth-pending')}
function showAuthLoader(message='Checking your secure session…'){
  const loader=$('#authLoader');
  if(loader){loader.classList.remove('hidden');const copy=loader.querySelector('[data-auth-message]');if(copy)copy.textContent=message}
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.add('hidden');
  document.body.classList.add('auth-pending');
}

function clearSessionTimers(){
  window.clearTimeout(inactivityTimer);window.clearTimeout(warningTimer);window.clearInterval(countdownTimer);
  inactivityTimer=0;warningTimer=0;countdownTimer=0;sessionDeadline=0;
  $('#sessionWarning')?.classList.add('hidden');
}

function appIsBusy(){
  return Boolean(document.querySelector('#content[aria-busy="true"],form[aria-busy="true"],button[type="submit"]:disabled,[data-session-busy="true"]'));
}

function updateSessionCountdown(){
  const remaining=Math.max(0,Math.ceil((sessionDeadline-Date.now())/1000));
  const node=$('#sessionCountdown');if(node)node.textContent=String(remaining);
  if(remaining<=0)finishInactiveSession();
}

function showSessionWarning(){
  if(!health.authenticated||sessionEnding)return;
  if(appIsBusy()){resetSessionTimer();return}
  $('#sessionWarning')?.classList.remove('hidden');
  sessionDeadline=Date.now()+SESSION_WARNING_MS;
  updateSessionCountdown();
  window.clearInterval(countdownTimer);
  countdownTimer=window.setInterval(updateSessionCountdown,1000);
}

function resetSessionTimer(){
  if(!health.authenticated||sessionEnding)return;
  clearSessionTimers();
  sessionDeadline=Date.now()+SESSION_TIMEOUT_MS;
  warningTimer=window.setTimeout(showSessionWarning,SESSION_TIMEOUT_MS-SESSION_WARNING_MS);
  inactivityTimer=window.setTimeout(finishInactiveSession,SESSION_TIMEOUT_MS);
}

function registerSessionActivity(){
  const now=Date.now();
  if(now-lastActivityAt<1000)return;
  lastActivityAt=now;
  resetSessionTimer();
}

async function finishInactiveSession(){
  if(sessionEnding||!health.authenticated)return;
  if(appIsBusy()){resetSessionTimer();return}
  sessionEnding=true;clearSessionTimers();showAuthLoader('Signing out securely…');
  try{await signOut();health.dataLoaded=false;showLogin('Your session expired after 15 minutes of inactivity. Please sign in again.')}
  catch(error){recordRuntimeError(error,'inactivity-sign-out');showLogin('Your session expired. Please sign in again.')}
  finally{sessionEnding=false}
}

function bindSessionSecurity(){
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>document.addEventListener(type,registerSessionActivity,{passive:true,capture:true}));
  $('#sessionStaySignedIn')?.addEventListener('click',()=>{lastActivityAt=Date.now();resetSessionTimer()});
  $('#sessionSignOut')?.addEventListener('click',finishInactiveSession);
}

function showApp(){
  buildNavigation();hideAuthLoader();
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');
  const email=store.user?.email||'Signed in',role=String(store.role||'staff').toUpperCase(),initial=email.charAt(0).toUpperCase();
  [['#roleLabel',role],['#emailLabel',email],['#avatar',initial],['#sideEmail',email],['#sideRole',role],['#sideAvatar',initial]].forEach(([selector,value])=>{const node=$(selector);if(node)node.textContent=value});
  health.authenticated=true;lastActivityAt=Date.now();resetSessionTimer();
}

function showLogin(message=''){
  clearSessionTimers();closeMobileNavigation();hideAuthLoader();
  $('#appView')?.classList.add('hidden');
  $('#loginView')?.classList.remove('hidden');
  const notice=$('#loginNotice');if(notice)notice.textContent=message;
  health.authenticated=false;
}

function showWorkspaceError(error){
  const message=error?.message||String(error||'Unknown error');
  recordRuntimeError(error,'workspace');
  const target=$('#content');if(!target)return;
  target.innerHTML=`<section class="panel"><div class="empty"><h2>Workspace could not finish loading</h2><p>${escapeHtml(message)}</p><button class="btn" id="retryWorkspace" type="button">Retry</button></div></section>`;
  $('#retryWorkspace')?.addEventListener('click',()=>loadAndStart());
}

async function loadAndStart(){
  const target=$('#content');
  if(!target)throw new Error('Application content container was not found.');
  target.replaceChildren();target.setAttribute('aria-busy','true');
  try{await loadBills();health.dataLoaded=true;health.error=null;health.lastLoaded=new Date().toISOString();startRouter();watchSearchableLists();registerSessionActivity()}
  catch(error){health.dataLoaded=false;showWorkspaceError(error);throw error}
  finally{target.removeAttribute('aria-busy')}
}

function bindNavigation(){
  $('#menuBtn')?.addEventListener('click',toggleMobileNavigation);
  $('#sidebarClose')?.addEventListener('click',closeMobileNavigation);
  $('#sidebarBackdrop')?.addEventListener('click',closeMobileNavigation);
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('a[data-route],button[data-route]');
    if(!trigger)return;
    event.preventDefault();closeMobileNavigation();registerSessionActivity();
    if(trigger.dataset.route)navigate(trigger.dataset.route);
  });
  window.addEventListener('hashchange',()=>{closeMobileNavigation();registerSessionActivity()});
  window.addEventListener('resize',()=>{if(window.innerWidth>820)closeMobileNavigation()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileNavigation()});
}

function bindLogout(){
  const buttons=['#logoutBtn','#desktopLogoutBtn'].map(selector=>$(selector)).filter(Boolean);
  buttons.forEach(button=>{
    button.onclick=async()=>{
      buttons.forEach(node=>{node.disabled=true});sessionEnding=true;clearSessionTimers();showAuthLoader('Signing out securely…');
      try{await signOut();health.dataLoaded=false;showLogin()}
      catch(error){recordRuntimeError(error,'sign-out');showLogin(error?.message||'Sign out failed.')}
      finally{buttons.forEach(node=>{node.disabled=false});sessionEnding=false}
    };
  });
}

function bindLoginForm(){
  const form=$('#loginForm');if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();
    const submit=event.submitter,name=$('#loginName'),password=$('#loginPassword'),notice=$('#loginNotice');
    if(!name||!password){showLogin('Login fields could not be found.');return}
    if(notice)notice.textContent='Signing in…';if(submit)submit.disabled=true;
    try{await signIn(name.value,password.value);showApp();if(notice)notice.textContent='';await loadAndStart().catch(()=>{})}
    catch(error){recordRuntimeError(error,'sign-in');showLogin(error?.message||'Sign in failed.')}
    finally{if(submit)submit.disabled=false}
  };
}

async function boot(){
  showAuthLoader();buildNavigation();bindNavigation();bindLogout();bindLoginForm();bindSessionSecurity();
  try{localStorage.removeItem('bills.sidebarCollapsed')}catch(error){recordRuntimeError(error,'legacy-sidebar-preference-remove')}
  const year=$('#footerYear');if(year)year.textContent=new Date().getFullYear();
  try{const user=await restoreSession();if(!user){showLogin();return}showApp();await loadAndStart().catch(()=>{})}
  catch(error){recordRuntimeError(error,'session-restore');showLogin('Your saved session expired. Please sign in again.')}
  finally{health.booted=true}
}

boot();
