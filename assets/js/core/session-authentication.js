(()=>{
'use strict';
const VERSION=43;
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
  html,body{background:#f1f7f3!important}
  body.ws-auth-pending{overflow:hidden!important;background:#f1f7f3!important}
  body.ws-auth-pending #loginView,body.ws-auth-pending #appView{display:none!important}
  body.ws-auth-pending:before{content:"WS";position:fixed;z-index:10002;left:50%;top:calc(50% - 24px);width:62px;height:62px;display:grid;place-items:center;transform:translate(-50%,-50%);border-radius:18px;background:linear-gradient(135deg,#ffb300,#e24baf);color:#0f1e4c;font:900 18px Mona Sans,Arial,sans-serif;box-shadow:0 14px 38px rgba(15,30,76,.16);animation:wsBootPulse 1.1s ease-in-out infinite alternate}
  body.ws-auth-pending:after{content:"Loading procurement workspace";position:fixed;z-index:10002;left:50%;top:calc(50% + 34px);transform:translateX(-50%);color:#0f1e4c;font:750 12px Mona Sans,system-ui,sans-serif;white-space:nowrap}
  #loginView.hidden,#appView.hidden{display:none!important}
  #loginView:not(.hidden){position:fixed!important;inset:0!important;z-index:10000!important;width:100%!important;height:100dvh!important;min-height:100vh!important;overflow:auto!important}
  body:not(.ws-authenticated):not(.ws-auth-pending){overflow:hidden!important}
  body.ws-authenticated{overflow:auto!important}
  @keyframes wsBootPulse{from{transform:translate(-50%,-50%) scale(.96);opacity:.82}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @media(prefers-reduced-motion:reduce){body.ws-auth-pending:before{animation:none}}
  `;
  document.head.appendChild(style);
}
function setAuthView(session){
  const authenticated=Boolean(session?.user);
  document.body.classList.remove('ws-auth-pending');
  document.body.classList.toggle('ws-authenticated',authenticated);
  if(!authenticated)document.body.classList.remove('ws-view-pending');
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
    state.role='staff';
  }
}
installAuthViewStyles();

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
  };
}
window.__WS_AUTH__={version:VERSION,resolveRole,setAuthView};
})();