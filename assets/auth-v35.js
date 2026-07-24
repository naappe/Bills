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
  const authenticated=Boolean(session?.user);
  document.body.classList.toggle('ws-authenticated',authenticated);
  loginView?.classList.toggle('hidden',authenticated);
  appView?.classList.toggle('hidden',!authenticated);
  loginView?.setAttribute('aria-hidden',authenticated?'true':'false');
  appView?.setAttribute('aria-hidden',authenticated?'false':'true');
}

installAuthViewStyles();

// Core owns session restoration and the single auth-state subscription.
// This wrapper adds role resolution without starting another session listener.
const originalBoot=typeof window.boot==='function'?window.boot:null;
if(originalBoot){
  window.boot=async function(session){
    const result=await originalBoot(session);
    setAuthView(session);
    if(session?.user){
      const role=resolveRole(session.user);
      state.role=role;
      const roleLabel=document.querySelector('#roleLabel');
      if(roleLabel)roleLabel.textContent=role.toUpperCase();
      if(state.view==='settings'&&typeof renderSettings==='function')renderSettings();
    }
    return result;
  };
}

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
    const {error}=await db.auth.signInWithPassword({email,password});
    if(submit)submit.disabled=false;
    if(error){
      if(notice)notice.textContent='Invalid username or password';
      return;
    }
    if(notice)notice.textContent='';
    // Do not call boot here. The single core auth listener receives SIGNED_IN.
  };
}

window.__WS_AUTH__={version:38,resolveRole,setAuthView};
})();