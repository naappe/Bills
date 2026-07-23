(()=>{
'use strict';
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
  boot(data.session);
};
window.__WS_AUTH__={version:35};
})();