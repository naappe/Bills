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
  style.textContent=`#loginView.hidden,#appView.hidden{display:none!important}#loginView:not(.hidden){position:fixed!important;inset:0!important;z-index:10000!important;width:100%!important;height:100dvh!important;min-height:100vh!important;overflow:auto!important}body:not(.ws-authenticated){overflow:hidden!important}body.ws-authenticated{overflow:auto!important}`;
  document.head.appendChild(style);
}
function setAuthView(session){
  const authenticated=Boolean(session?.user);
  document.body.classList.toggle('ws-authenticated',authenticated);
  loginView?.classList.toggle('hidden',authenticated);
  appView?.classList.toggle('hidden',!authenticated);
  loginView?.setAttribute('aria-hidden',authenticated?'true':'false');
  appView?.setAttribute('aria-hidden',authenticated?'false':'true');
  if(authenticated){
    const role=resolveRole(session.user);
    state.user=session.user;
    state.role=role;
    const roleLabel=document.querySelector('#roleLabel');
    const emailLabel=document.querySelector('#emailLabel');
    const avatar=document.querySelector('#avatar');
    if(roleLabel)roleLabel.textContent=role.toUpperCase();
    if(emailLabel)emailLabel.textContent=session.user.email||'Signed in';
    if(avatar)avatar.textContent=(session.user.email||'A').charAt(0).toUpperCase();
  }else{
    state.user=null;
  }
}
installAuthViewStyles();
setAuthView(null);

const form=document.querySelector('#loginForm');
if(form){
  form.onsubmit=async event=>{
    event.preventDefault();
    const notice=document.querySelector('#loginNotice');
    const submit=form.querySelector('button[type="submit"],button:not([type])');
    const raw=String(document.querySelector('#loginName')?.value||'').trim().toLowerCase();
    const password=String(document.querySelector('#loginPassword')?.value||'');
    const legacy=(typeof LOGIN!=='undefined'&&LOGIN[raw])||null;
    const email=raw.includes('@')?raw:(legacy||`${raw}@users.whitesaffron.mv`);
    if(notice)notice.textContent='Signing in…';
    if(submit)submit.disabled=true;
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(submit)submit.disabled=false;
    if(error){if(notice)notice.textContent=error.message||'Invalid username or password';return;}
    setAuthView(data.session);
    if(notice)notice.textContent='';
  };
}

const logout=document.querySelector('#logoutBtn');
if(logout){
  logout.onclick=async()=>{
    logout.disabled=true;
    const {error}=await db.auth.signOut();
    logout.disabled=false;
    if(error){console.error('[auth] sign out failed',error);return;}
    setAuthView(null);
  };
}

db.auth.getSession().then(({data,error})=>{
  if(error){console.error('[auth] session restore failed',error);setAuthView(null);return;}
  setAuthView(data.session);
});

db.auth.onAuthStateChange((_event,session)=>{
  setAuthView(session);
});

window.__WS_AUTH__={version:39,resolveRole,setAuthView};
})();