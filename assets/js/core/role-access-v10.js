(()=>{
'use strict';
function applyRoleNavigation(){
 const admin=state?.role==='admin';
 document.querySelectorAll('.nav [data-view="rates"],.nav [data-view="prices"],.nav [data-view="admin"]').forEach(link=>{link.hidden=!admin;link.setAttribute('aria-hidden',admin?'false':'true')});
 document.querySelectorAll('.ui-nav-group').forEach(group=>{const visible=[...group.querySelectorAll('[data-view]')].some(link=>!link.hidden);if(!visible)group.hidden=true;else group.hidden=false});
}
if(window.UI){const oldAfter=window.UI.afterRender;window.UI.afterRender=view=>{oldAfter?.(view);applyRoleNavigation()};const oldRebuild=window.UI.rebuildNavigation;window.UI.rebuildNavigation=()=>{const result=oldRebuild?.();applyRoleNavigation();return result}}
document.addEventListener('DOMContentLoaded',()=>setTimeout(applyRoleNavigation,0),{once:true});
window.addEventListener('hashchange',()=>setTimeout(applyRoleNavigation,0));
window.__WS_ROLE_ACCESS_V10__={version:10,apply:applyRoleNavigation};
})();