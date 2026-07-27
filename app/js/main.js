import {store,escapeHtml} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter,navigate} from './router.js?v=5.1.3';

const $=selector=>document.querySelector(selector);
const navGroups=[
  ['Overview',[['dashboard','Dashboard','fa-table-cells-large']]],
  ['Procurement',[
    ['bills','Bills','fa-file-invoice'],
    ['rates','Price Intelligence','fa-chart-line','admin'],
    ['products','Products','fa-box'],
    ['vendors','Vendors','fa-building']
  ]],
  ['Analytics',[['reports','Reports','fa-chart-pie']]],
  ['Administration',[
    ['settings','Settings','fa-gear'],
    ['admin','Admin & users','fa-users-gear','admin']
  ]]
];

const health={version:'5.1.3',booted:false,authenticated:false,dataLoaded:false,error:null,runtimeErrors:[],startedAt:new Date().toISOString()};
window.app={store,health};

function recordRuntimeError(error,source='runtime'){
  const message=error?.message||String(error||'Unknown error');
  health.error=message;
  health.runtimeErrors.push({source,message,route:store.route||'unknown',stack:error?.stack||'',time:new Date().toISOString()});
  if(health.runtimeErrors.length>20)health.runtimeErrors.shift();
  console.error(`[${source}]`,error);
}
window.addEventListener('error',event=>recordRuntimeError(event.error||event.message,'window.error'));
window.addEventListener('unhandledrejection',event=>recordRuntimeError(event.reason,'unhandledrejection'));

function removeGeneratedPlaceholders(){
  try{
    const key='bills.productMetadata.v3';
    const meta=JSON.parse(localStorage.getItem(key)||'{}');
    let changed=false;
    for(const value of Object.values(meta)){
      if(value?.imageSource==='generated'||String(value?.photo||'').includes('Generated%20catalogue%20illustration')){
        delete value.photo;
        delete value.imageSource;
        changed=true;
      }
    }
    if(changed)localStorage.setItem(key,JSON.stringify(meta));
  }catch(error){recordRuntimeError(error,'catalog-cleanup')}
}

function buildNav(){
  const nav=$('#nav');
  if(!nav)return;
  nav.innerHTML=navGroups.map(([group,items])=>{
    const visible=items.filter(([, , ,role])=>!role||store.role===role);
    if(!visible.length)return'';
    return `<div class="nav-group"><div class="nav-label">${group}</div>${visible.map(([route,label,icon])=>`<a href="#${route}" data-route="${route}" title="${label}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('')}</div>`;
  }).join('');
}

function setSidebar(open){
  const sidebar=$('#sidebar'),backdrop=$('#sidebarBackdrop'),button=$('#menuBtn');
  sidebar?.classList.toggle('open',open);
  backdrop?.classList.toggle('visible',open);
  backdrop?.classList.toggle('hidden',!open);
  document.body.classList.toggle('nav-open',open);
  button?.setAttribute('aria-expanded',String(open));
}
const closeSidebar=()=>setSidebar(false);
const toggleSidebar=()=>setSidebar(!$('#sidebar')?.classList.contains('open'));

function setCollapsed(collapsed){
  $('#appView')?.classList.toggle('sidebar-collapsed',collapsed);
  $('#collapseSidebar')?.setAttribute('aria-pressed',String(collapsed));
  $('#collapseSidebar i')?.classList.toggle('fa-angles-right',collapsed);
  $('#collapseSidebar i')?.classList.toggle('fa-angles-left',!collapsed);
  try{localStorage.setItem('bills.sidebarCollapsed',collapsed?'1':'0')}catch(error){recordRuntimeError(error,'sidebar-preference')}
}

function hideAuthLoader(){$('#authLoader')?.classList.add('hidden');document.body.classList.remove('auth-pending')}
function showAuthLoader(message='Checking your secure session…'){
  const loader=$('#authLoader');
  if(loader){loader.classList.remove('hidden');const copy=loader.querySelector('[data-auth-message]');if(copy)copy.textContent=message}
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.add('hidden');
  document.body.classList.add('auth-pending');
}

function showApp(){
  buildNav();
  hideAuthLoader();
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');
  const email=store.user?.email||'Signed in';
  const role=String(store.role||'staff').toUpperCase();
  const initial=email.charAt(0).toUpperCase();
  const values=[['#roleLabel',role],['#emailLabel',email],['#avatar',initial],['#sideEmail',email],['#sideRole',role],['#sideAvatar',initial]];
  values.forEach(([selector,value])=>{const node=$(selector);if(node)node.textContent=value});
  health.authenticated=true;
}

function showLogin(message=''){
  closeSidebar();
  hideAuthLoader();
  $('#appView')?.classList.add('hidden');
  $('#loginView')?.classList.remove('hidden');
  const notice=$('#loginNotice');if(notice)notice.textContent=message;
  health.authenticated=false;
}

function showWorkspaceError(error){
  const message=error?.message||String(error||'Unknown error');
  recordRuntimeError(error,'workspace');
  const content=$('#content');
  if(!content)return;
  content.innerHTML=`<section class="panel"><div class="empty"><h2>Workspace could not finish loading</h2><p>${escapeHtml(message)}</p><button class="btn" id="retryWorkspace" type="button">Retry</button></div></section>`;
  $('#retryWorkspace')?.addEventListener('click',()=>loadAndStart());
}

async function loadAndStart(){
  const content=$('#content');
  if(!content)throw new Error('Application content container was not found.');
  content.replaceChildren();
  content.setAttribute('aria-busy','true');
  try{
    await loadBills();
    health.dataLoaded=true;
    health.error=null;
    health.lastLoaded=new Date().toISOString();
    startRouter();
  }catch(error){
    health.dataLoaded=false;
    showWorkspaceError(error);
    throw error;
  }finally{content.removeAttribute('aria-busy')}
}

function bindNavigation(){
  $('#menuBtn')?.addEventListener('click',toggleSidebar);
  $('#sidebarClose')?.addEventListener('click',closeSidebar);
  $('#sidebarBackdrop')?.addEventListener('click',closeSidebar);
  $('#collapseSidebar')?.addEventListener('click',()=>setCollapsed(!$('#appView')?.classList.contains('sidebar-collapsed')));
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('a[data-route],button[data-route]');
    if(!trigger)return;
    event.preventDefault();
    closeSidebar();
    if(trigger.dataset.route)navigate(trigger.dataset.route);
  });
  window.addEventListener('hashchange',closeSidebar);
  window.addEventListener('resize',()=>{if(window.innerWidth>820)closeSidebar()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSidebar()});
}

function bindLogout(){
  const button=$('#logoutBtn');
  if(!button)return;
  button.onclick=async()=>{
    button.disabled=true;
    showAuthLoader('Signing out securely…');
    try{await signOut();health.dataLoaded=false;showLogin()}
    catch(error){recordRuntimeError(error,'sign-out');showLogin(error?.message||'Sign out failed.')}
    finally{button.disabled=false}
  };
}

function bindLoginForm(){
  const form=$('#loginForm');
  if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();
    const submit=event.submitter,name=$('#loginName'),password=$('#loginPassword'),notice=$('#loginNotice');
    if(!name||!password){showLogin('Login fields could not be found.');return}
    if(notice)notice.textContent='Signing in…';
    if(submit)submit.disabled=true;
    try{
      await signIn(name.value,password.value);
      showApp();
      if(notice)notice.textContent='';
      await loadAndStart().catch(()=>{});
    }catch(error){recordRuntimeError(error,'sign-in');showLogin(error?.message||'Sign in failed.')}
    finally{if(submit)submit.disabled=false}
  };
}

async function boot(){
  removeGeneratedPlaceholders();
  showAuthLoader();
  buildNav();
  let collapsed=false;
  try{collapsed=localStorage.getItem('bills.sidebarCollapsed')==='1'}catch(error){recordRuntimeError(error,'sidebar-preference-read')}
  setCollapsed(collapsed);
  bindNavigation();
  bindLogout();
  bindLoginForm();
  const footerYear=$('#footerYear');if(footerYear)footerYear.textContent=new Date().getFullYear();
  try{
    const user=await restoreSession();
    if(!user){showLogin();return}
    showApp();
    await loadAndStart().catch(()=>{});
  }catch(error){recordRuntimeError(error,'session-restore');showLogin('Your saved session expired. Please sign in again.')}
  finally{health.booted=true}
}

boot();
