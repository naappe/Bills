(()=>{
'use strict';
const allowedRoles=new Set(['admin','manager','staff','readonly']);
const resolveRole=user=>{
  if(!user)return'staff';
  if(typeof ADMIN_IDS!=='undefined'&&ADMIN_IDS.includes(user.id))return'admin';
  const candidate=String(user.app_metadata?.role||user.user_metadata?.role||'staff').toLowerCase();
  return allowedRoles.has(candidate)?candidate:'staff';
};

const loginView=document.querySelector('#loginView');
const appView=document.querySelector('#appView');

function installAuthViewStyles(){
  if(document.querySelector('#authViewGuardStyles'))return;
  const style=document.createElement('style');
  style.id='authViewGuardStyles';
  style.textContent=`
    #loginView.hidden,#appView.hidden{display:none!important}
    #loginView:not(.hidden){position:fixed!important;inset:0!important;z-index:10000!important;width:100%!important;height:100dvh!important;min-height:100vh!important;overflow:auto!important}
    body:not(.ws-authenticated){overflow:hidden!important}
    body.ws-authenticated{overflow:auto!important}
  `;
  document.head.appendChild(style);
}

function setAuthView(session){
  const authenticated=Boolean(session&&session.user);
  document.body.classList.toggle('ws-authenticated',authenticated);
  if(loginView)loginView.classList.toggle('hidden',authenticated);
  if(appView)appView.classList.toggle('hidden',!authenticated);
  if(loginView)loginView.setAttribute('aria-hidden',authenticated?'true':'false');
  if(appView)appView.setAttribute('aria-hidden',authenticated?'false':'true');
}

installAuthViewStyles();
setAuthView(null);

const originalBoot=typeof window.boot==='function'?window.boot:null;
if(originalBoot){
  window.boot=async function(session){
    setAuthView(session);
    if(!session)return originalBoot(session);
    const role=resolveRole(session.user);
    await originalBoot(session);
    state.role=role;
    const roleLabel=document.querySelector('#roleLabel');
    if(roleLabel)roleLabel.textContent=role.toUpperCase();
    if(state.view==='settings'&&typeof renderSettings==='function')renderSettings();
    setAuthView(session);
  };
}

const form=document.querySelector('#loginForm');
if(form){
  form.onsubmit=async e=>{
    e.preventDefault();
    const notice=document.querySelector('#loginNotice');
    const raw=String(document.querySelector('#loginName')?.value||'').trim().toLowerCase();
    const password=String(document.querySelector('#loginPassword')?.value||'');
    const legacy=(typeof LOGIN!=='undefined'&&LOGIN[raw])||null;
    const email=raw.includes('@')?raw:(legacy||`${raw}@users.whitesaffron.mv`);
    if(notice)notice.textContent='Signing in…';
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error){if(notice)notice.textContent='Invalid username or password';setAuthView(null);return}
    if(notice)notice.textContent='';
    setAuthView(data.session);
    if(typeof window.boot==='function')await window.boot(data.session);
  };
}

if(db?.auth?.onAuthStateChange){
  db.auth.onAuthStateChange((_event,session)=>setAuthView(session));
}
if(db?.auth?.getSession){
  db.auth.getSession().then(({data})=>setAuthView(data?.session||null)).catch(()=>setAuthView(null));
}

window.__WS_AUTH__={version:37,resolveRole,setAuthView};
})();