(()=>{
'use strict';
const DEFAULT_THEME={
  primary:'#0B6CFF',primaryDark:'#0A4EA3',background:'#F4F8FF',surface:'#FFFFFF',surfaceAlt:'#EEF5FF',text:'#10233F',muted:'#60708A',border:'#CFE0F5',danger:'#D64A55',radius:'12px',font:'Inter, system-ui, sans-serif'
};
const MAP={
  primary:'--ws-primary',primaryDark:'--ws-primary-dark',background:'--ws-bg',surface:'--ws-surface',surfaceAlt:'--ws-surface-alt',text:'--ws-text',muted:'--ws-muted',border:'--ws-border',danger:'--ws-danger',radius:'--ws-radius',font:'--ws-font'
};
function applyTheme(theme={}){
  const merged={...DEFAULT_THEME,...theme};
  for(const [key,variable] of Object.entries(MAP)){
    const value=merged[key];
    if(value!==undefined&&value!==null&&String(value).trim())document.documentElement.style.setProperty(variable,String(value).trim());
  }
  document.documentElement.dataset.themeReady='true';
  window.dispatchEvent(new CustomEvent('ws-theme-ready',{detail:merged}));
  return merged;
}
async function loadTheme(){
  applyTheme(DEFAULT_THEME);
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
window.WhiteSaffronTheme={load:loadTheme,apply:applyTheme,defaults:DEFAULT_THEME};
loadTheme();
})();