import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb=createClient(
  'https://tmupbruwmwlrmewhoodn.supabase.co',
  'sb_publishable_LAn1liS2zqMqlB33IQJxIw_NbgWKix1',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'white-saffron-erp-auth'}}
);

const LEGACY_LOGIN_ALIASES={
  white:'whitesaffron2025@gmail.com',
  staff:'whitesaffron2025@gmail.com',
  supply:'whitesaffron20255@gmail.com',
  admin:'naappe@gmail.com',
  naappe:'naappe@gmail.com'
};

function resolveLogin(raw){
  const name=String(raw||'').trim().toLowerCase();
  if(!name)return'';
  if(name.includes('@'))return name;
  return LEGACY_LOGIN_ALIASES[name]||`${name}@users.whitesaffron.mv`;
}

function installUsernameLogin(){
  const form=document.querySelector('#loginForm');
  const login=document.querySelector('#email');
  const password=document.querySelector('#password');
  const button=document.querySelector('#loginButton');
  const errorBox=document.querySelector('#loginError');
  if(!form||!login||!password||!button||!errorBox)return;

  form.onsubmit=async event=>{
    event.preventDefault();
    errorBox.classList.add('hidden');
    button.disabled=true;
    const email=resolveLogin(login.value);
    const{error}=await sb.auth.signInWithPassword({email,password:password.value});
    button.disabled=false;
    if(error){
      errorBox.textContent='Invalid username or password';
      errorBox.classList.remove('hidden');
      return;
    }
    location.reload();
  };
}

if(document.readyState==='complete')installUsernameLogin();
else window.addEventListener('load',installUsernameLogin,{once:true});
