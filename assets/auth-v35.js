(()=>{
'use strict';
const allowedRoles=new Set(['admin','manager','staff','readonly']);
const resolveRole=user=>{
  if(!user)return'staff';
  if(typeof ADMIN_IDS!=='undefined'&&ADMIN_IDS.includes(user.id))return'admin';
  const candidate=String(user.app_metadata?.role||user.user_metadata?.role||'staff').toLowerCase();
  return allowedRoles.has(candidate)?candidate:'staff';
};

const originalBoot=typeof window.boot==='function'?window.boot:null;
if(originalBoot){
  window.boot=async function(session){
    if(!session)return originalBoot(session);
    const role=resolveRole(session.user);
    await originalBoot(session);
    state.role=role;
    const roleLabel=document.querySelector('#roleLabel');
    if(roleLabel)roleLabel.textContent=role.toUpperCase();
    if(state.view==='settings'&&typeof renderSettings==='function')renderSettings();
  };
}

const form=document.querySelector('#loginForm');
if(!form)return;
form.onsubmit=async e=>{
  e.preventDefault();
  const notice=document.querySelector('#loginNotice');
  const raw=String(document.querySelector('#loginName')?.value||'').trim().toLowerCase();
  const password=String(document.querySelector('#loginPassword')?.value||'');
  const legacy=(typeof LOGIN!=='undefined'&&LOGIN[raw])||null;
  const email=raw.includes('@')?raw:(legacy||`${raw}@users.whitesaffron.mv`);
  notice.textContent='Signing in…';
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error){notice.textContent='Invalid username or password';return;}
  notice.textContent='';
  window.boot(data.session);
};
window.__WS_AUTH__={version:36,resolveRole};
})();