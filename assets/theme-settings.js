(()=>{
'use strict';
const STORAGE_KEY='ws-color-mode';
const MODES=new Set(['light','dark']);
const DEFAULT_THEME={primary:'#0B6CFF',primaryDark:'#0A4EA3',background:'#F4F8FF',surface:'#FFFFFF',surfaceAlt:'#EEF5FF',text:'#10233F',muted:'#60708A',border:'#CFE0F5',danger:'#D64A55',radius:'12px',font:'Inter, system-ui, sans-serif'};
const MAP={primary:'--ws-primary',primaryDark:'--ws-primary-dark',background:'--ws-bg',surface:'--ws-surface',surfaceAlt:'--ws-surface-alt',text:'--ws-text',muted:'--ws-muted',border:'--ws-border',danger:'--ws-danger',radius:'--ws-radius',font:'--ws-font'};

function savedMode(){
  const saved=localStorage.getItem(STORAGE_KEY)||localStorage.getItem('theme');
  if(MODES.has(saved))return saved;
  return matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
}

function syncToggle(mode){
  const button=document.getElementById('themeToggle');
  if(!button)return;
  button.setAttribute('aria-pressed',String(mode==='dark'));
  button.setAttribute('aria-label',mode==='dark'?'Switch to light mode':'Switch to dark mode');
  button.title=mode==='dark'?'Switch to light mode':'Switch to dark mode';
  button.innerHTML=`<span aria-hidden="true">${mode==='dark'?'☀':'☾'}</span><span class="theme-toggle-label">${mode==='dark'?'Light':'Dark'}</span>`;
}

function setMode(mode,{persist=true}={}){
  const next=MODES.has(mode)?mode:'light';
  const root=document.documentElement;
  if(root.dataset.theme!==next)root.dataset.theme=next;
  root.style.colorScheme=next;
  if(persist){localStorage.setItem(STORAGE_KEY,next);localStorage.setItem('theme',next)}
  syncToggle(next);
  return next;
}

function ensureToggle(){
  const user=document.querySelector('.topbar .user');
  if(!user)return null;
  let button=document.getElementById('themeToggle');
  if(!button){
    button=document.createElement('button');
    button.id='themeToggle';
    button.type='button';
    button.className='btn secondary small theme-toggle';
    button.addEventListener('click',()=>setMode(document.documentElement.dataset.theme==='dark'?'light':'dark'));
    user.prepend(button);
  }
  syncToggle(document.documentElement.dataset.theme||savedMode());
  return button;
}

function applyTheme(theme={}){
  const merged={...DEFAULT_THEME,...theme};
  for(const [key,variable] of Object.entries(MAP)){
    const value=merged[key];
    const clean=value==null?'':String(value).trim();
    if(clean&&document.documentElement.style.getPropertyValue(variable)!==clean)document.documentElement.style.setProperty(variable,clean);
  }
  return merged;
}

async function loadTheme(){
  setMode(savedMode(),{persist:false});
  applyTheme(DEFAULT_THEME);
  ensureToggle();
  if(typeof db==='undefined')return DEFAULT_THEME;
  try{
    const {data,error}=await db.from('app_settings').select('setting_value').eq('setting_key','theme').maybeSingle();
    if(error)throw error;
    return applyTheme(data?.setting_value||DEFAULT_THEME);
  }catch(error){
    console.warn('Theme settings unavailable; using defaults.',error?.message||error);
    return DEFAULT_THEME;
  }
}

window.toggleTheme=()=>setMode(document.documentElement.dataset.theme==='dark'?'light':'dark');
window.WhiteSaffronTheme={load:loadTheme,apply:applyTheme,setMode,toggle:window.toggleTheme,defaults:DEFAULT_THEME};
document.addEventListener('DOMContentLoaded',ensureToggle,{once:true});
window.addEventListener('load',ensureToggle,{once:true});
loadTheme();
})();