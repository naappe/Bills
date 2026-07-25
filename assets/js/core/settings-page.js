(()=>{
'use strict';
const el=id=>document.getElementById(id);
const escSafe=value=>typeof esc==='function'?esc(value):String(value??'');
const fmtDate=value=>{if(!value)return'Not available';const d=new Date(value);return Number.isNaN(d.getTime())?'Not available':d.toLocaleString('en-US',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
const injectStyles=()=>{if(document.getElementById('settingsPageStyles'))return;const style=document.createElement('style');style.id='settingsPageStyles';style.textContent=`
.settings-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}.settings-stat{display:grid;gap:8px;padding:20px;border:1px solid var(--sf-line,#e6eaf2);border-radius:14px;background:#fff;box-shadow:var(--sf-shadow,0 8px 24px rgba(17,24,39,.055))}.settings-stat span{font-size:12px;font-weight:600;color:var(--sf-muted,#697386)}.settings-stat strong{font-size:19px;line-height:1.25;color:var(--sf-text,#172033);overflow-wrap:anywhere}.settings-sections{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:20px}.settings-panel{padding:0;overflow:hidden}.settings-panel-head{padding:20px 22px 16px;border-bottom:1px solid var(--sf-line,#e6eaf2)}.settings-panel-head h2{margin:0;font-size:18px;letter-spacing:-.025em}.settings-panel-head p{margin:6px 0 0;color:var(--sf-muted,#697386);font-size:13px}.settings-list{display:grid}.settings-row{display:grid;grid-template-columns:minmax(150px,.7fr) minmax(0,1.3fr);gap:24px;align-items:center;padding:18px 22px;border-bottom:1px solid #edf0f5}.settings-row:last-child{border-bottom:0}.settings-row span{font-size:12px;font-weight:650;color:var(--sf-muted,#697386)}.settings-row strong{font-size:14px;color:var(--sf-text,#172033);overflow-wrap:anywhere}.settings-status{display:inline-flex;align-items:center;gap:8px}.settings-status:before{content:'';width:8px;height:8px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.12)}.settings-actions{display:grid;gap:12px;padding:20px 22px}.settings-action{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 16px;border:1px solid var(--sf-line,#e6eaf2);border-radius:12px;background:#fafbfe}.settings-action div{display:grid;gap:3px}.settings-action strong{font-size:14px}.settings-action span{font-size:12px;color:var(--sf-muted,#697386)}@media(max-width:1050px){.settings-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.settings-sections{grid-template-columns:1fr}}@media(max-width:620px){.settings-grid{grid-template-columns:1fr}.settings-row{grid-template-columns:1fr;gap:6px;padding:16px}.settings-action{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(style)};
window.renderSettings=()=>{
 injectStyles();
 const content=el('content');if(!content)return;
 const status=window.__WS_DB_STATUS__?.status||'Unknown';
 const connected=status==='Connected';
 const user=state.user||{};
 const role=String(state.role||'staff');
 const records=Array.isArray(state.rows)?state.rows.length:0;
 const lastSync=window.__WS_DB_STATUS__?.updatedAt;
 content.innerHTML=(typeof pageHead==='function'?pageHead('Settings','Workspace, account, and system information'):'<div class="page-head"><div><h1>Settings</h1><div class="muted">Workspace, account, and system information</div></div></div>')+
 `<section class="settings-grid">
   <article class="settings-stat"><span>Access role</span><strong>${escSafe(role.charAt(0).toUpperCase()+role.slice(1))}</strong></article>
   <article class="settings-stat"><span>Signed-in user</span><strong>${escSafe(user.email||'Not available')}</strong></article>
   <article class="settings-stat"><span>Database</span><strong>${escSafe(status)}</strong></article>
   <article class="settings-stat"><span>Active records</span><strong>${records.toLocaleString('en-US')}</strong></article>
 </section>
 <section class="settings-sections">
   <article class="card settings-panel">
    <header class="settings-panel-head"><h2>Workspace details</h2><p>Current procurement workspace and connection information.</p></header>
    <div class="settings-list">
      <div class="settings-row"><span>Workspace</span><strong>White Saffron Procurement ERP</strong></div>
      <div class="settings-row"><span>Account email</span><strong>${escSafe(user.email||'Not available')}</strong></div>
      <div class="settings-row"><span>User ID</span><strong>${escSafe(user.id||'Not available')}</strong></div>
      <div class="settings-row"><span>Connection status</span><strong class="${connected?'settings-status':''}">${escSafe(status)}</strong></div>
      <div class="settings-row"><span>Last data sync</span><strong>${escSafe(fmtDate(lastSync))}</strong></div>
    </div>
   </article>
   <article class="card settings-panel">
    <header class="settings-panel-head"><h2>System actions</h2><p>Refresh data or manage workspace access.</p></header>
    <div class="settings-actions">
      <div class="settings-action"><div><strong>Refresh procurement data</strong><span>Reload bills and recalculate dashboard values.</span></div><button class="btn secondary" id="settingsRefresh" type="button">Refresh</button></div>
      <div class="settings-action"><div><strong>User roles</strong><span>Manage roles, access status, and recent activity.</span></div><button class="btn secondary" data-go="admin" type="button">Open users</button></div>
      <div class="settings-action"><div><strong>Vendor directory</strong><span>Add, modify, and merge supplier records.</span></div><button class="btn secondary" data-go="vendors" type="button">Open vendors</button></div>
    </div>
   </article>
 </section>`;
 const refresh=el('settingsRefresh');if(refresh)refresh.onclick=async()=>{refresh.disabled=true;refresh.textContent='Refreshing…';try{await window.reloadBillsNow?.()}finally{refresh.disabled=false;refresh.textContent='Refresh'}};
};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.settings=window.renderSettings;
window.__WS_SETTINGS_PAGE__={version:1};
})();