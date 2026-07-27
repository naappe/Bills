import {store,escapeHtml} from './store.js';
import {signIn,signOut,restoreSession,loadBills} from './data.js';
import {startRouter,navigate} from './router.js?v=5.1.5';

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

const health={version:'5.1.5',booted:false,authenticated:false,dataLoaded:false,error:null,runtimeErrors:[],startedAt:new Date().toISOString()};
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

    const close=()=>{menu.classList.remove('open');active=-1};
    const choose=value=>{
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      close();
      input.focus();
    };
    const draw=(showAll=false)=>{
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
  $('#sidebar')?.classList.toggle('open',open);
  $('#sidebarBackdrop')?.classList.toggle('visible',open);
  $('#sidebarBackdrop')?.classList.toggle('hidden',!open);
  document.body.classList.toggle('nav-open',open);
  $('#menuBtn')?.setAttribute('aria-expanded',String(open));
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
  buildNav();hideAuthLoader();
  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');
  const email=store.user?.email||'Signed in',role=String(store.role||'staff').toUpperCase(),initial=email.charAt(0).toUpperCase();
  [['#roleLabel',role],['#emailLabel',email],['#avatar',initial],['#sideEmail',email],['#sideRole',role],['#sideAvatar',initial]].forEach(([selector,value])=>{const node=$(selector);if(node)node.textContent=value});
  health.authenticated=true;
}

function showLogin(message=''){
  closeSidebar();hideAuthLoader();
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
  try{await loadBills();health.dataLoaded=true;health.error=null;health.lastLoaded=new Date().toISOString();startRouter();watchSearchableLists()}
  catch(error){health.dataLoaded=false;showWorkspaceError(error);throw error}
  finally{target.removeAttribute('aria-busy')}
}

function bindNavigation(){
  $('#menuBtn')?.addEventListener('click',toggleSidebar);
  $('#sidebarClose')?.addEventListener('click',closeSidebar);
  $('#sidebarBackdrop')?.addEventListener('click',closeSidebar);
  $('#collapseSidebar')?.addEventListener('click',()=>setCollapsed(!$('#appView')?.classList.contains('sidebar-collapsed')));
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('a[data-route],button[data-route]');
    if(!trigger)return;
    event.preventDefault();closeSidebar();
    if(trigger.dataset.route)navigate(trigger.dataset.route);
  });
  window.addEventListener('hashchange',closeSidebar);
  window.addEventListener('resize',()=>{if(window.innerWidth>820)closeSidebar()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSidebar()});
}

function bindLogout(){
  const button=$('#logoutBtn');if(!button)return;
  button.onclick=async()=>{
    button.disabled=true;showAuthLoader('Signing out securely…');
    try{await signOut();health.dataLoaded=false;showLogin()}
    catch(error){recordRuntimeError(error,'sign-out');showLogin(error?.message||'Sign out failed.')}
    finally{button.disabled=false}
  };
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
  showAuthLoader();buildNav();
  let collapsed=false;
  try{collapsed=localStorage.getItem('bills.sidebarCollapsed')==='1'}catch(error){recordRuntimeError(error,'sidebar-preference-read')}
  setCollapsed(collapsed);bindNavigation();bindLogout();bindLoginForm();
  const year=$('#footerYear');if(year)year.textContent=new Date().getFullYear();
  try{const user=await restoreSession();if(!user){showLogin();return}showApp();await loadAndStart().catch(()=>{})}
  catch(error){recordRuntimeError(error,'session-restore');showLogin('Your saved session expired. Please sign in again.')}
  finally{health.booted=true}
}

boot();