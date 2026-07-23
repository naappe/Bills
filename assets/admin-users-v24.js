(()=>{
'use strict';
const esc24=v=>esc(v??'');
const fmt24=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-';
const validRoles=new Set(['admin','manager','staff','readonly']);
const normalizeRole=v=>validRoles.has(String(v||'').toLowerCase())?String(v).toLowerCase():'staff';
const roleLabel=r=>r==='readonly'?'Read Only':r[0].toUpperCase()+r.slice(1);
const PERMISSIONS=[['dashboard','Dashboard'],['bills','Bills'],['products','Products'],['vendors','Vendors'],['reports','Reports'],['users','Manage users'],['change_role','Change roles'],['delete_user','Delete users'],['settings','Settings'],['create','Create records'],['edit','Edit records'],['export','Export'],['archive','Archive'],['restore','Restore']];
let access={role:normalizeRole(state?.role),permissions:{}};

async function callUsers(payload){
  const {data,error}=await db.functions.invoke('admin-users',{body:payload});
  if(data?.error)throw new Error(data.error);
  if(error){let message=error.message||'User management request failed';try{const body=await error.context?.json?.();if(body?.error)message=body.error}catch{}throw new Error(message)}
  return data||{};
}
const can=key=>access.role==='admin'||access.permissions?.[key]===true;

function userModal(user){
  const modal=document.createElement('div');modal.className='ux-modal-backdrop';
  const currentRole=normalizeRole(user?.role),canChange=can('change_role');
  modal.innerHTML=`<div class="ux-modal admin-user-modal"><div class="ux-modal-head"><h2>${user?'Edit user':'Create user'}</h2><button class="btn secondary small" data-close>×</button></div><form id="adminUserForm" autocomplete="off"><div class="ux-modal-body ux-form-grid"><label class="full">Display name<input class="field" name="display_name" value="${esc24(user?.display_name||'')}" required autocomplete="off"></label><label class="full">Username<input class="field" name="username" value="${esc24(user?.username||'')}" required autocomplete="off" pattern="[A-Za-z0-9._-]{3,32}"></label><label>${user?'New password (optional)':'Password'}<input class="field" type="password" name="password" ${user?'':'required minlength="6"'} autocomplete="new-password"></label><label>Role<select class="field" name="role" ${canChange?'':'disabled'}>${['admin','manager','staff','readonly'].map(r=>`<option value="${r}" ${currentRole===r?'selected':''}>${roleLabel(r)}</option>`).join('')}</select>${canChange?'':'<small class="muted">Only an administrator can change roles.</small>'}</label></div><div class="ux-modal-foot"><button class="btn secondary" type="button" data-close>Cancel</button><button class="btn" type="submit">${user?'Save changes':'Create user'}</button></div></form></div>`;
  document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal.remove());
  modal.querySelector('form').onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),button=e.currentTarget.querySelector('[type="submit"]');
    const password=String(f.get('password')||'').trim(),username=String(f.get('username')||'').trim().toLowerCase(),displayName=String(f.get('display_name')||'').trim();
    const role=canChange?normalizeRole(f.get('role')):(user?currentRole:'staff');
    button.disabled=true;button.textContent='Saving…';
    try{const payload={action:user?'update':'create',user_id:user?.id,display_name:displayName,username,role,is_active:user?.is_active!==false};if(password)payload.password=password;await callUsers(payload);modal.remove();await renderAdminUsers()}catch(err){alert(err.message||String(err));button.disabled=false;button.textContent=user?'Save changes':'Create user'}
  };
}

async function renderRolePermissions(){
  const host=document.querySelector('#rolePermissionManagement');if(!host)return;
  host.innerHTML='<div class="admin-users-loading">Loading roles…</div>';
  try{
    const result=await callUsers({action:'list_permissions'});access={role:normalizeRole(result.caller_role||state.role),permissions:result.caller_permissions||{}};
    const order={admin:1,manager:2,staff:3,readonly:4},roles=(result.roles||[]).sort((a,b)=>(order[a.role]||9)-(order[b.role]||9));
    host.innerHTML=`<div class="admin-users-head"><div><h2>Roles & permissions</h2><p>Permissions are stored in Supabase and applied by the secure server function.</p></div></div><div class="table-wrap"><table class="admin-users-table role-permission-table"><thead><tr><th>Role</th>${PERMISSIONS.map(([,label])=>`<th>${esc24(label)}</th>`).join('')}<th>Action</th></tr></thead><tbody>${roles.map(row=>{const p=row.permissions||{},editable=access.role==='admin',locked=row.role==='admin';return`<tr data-role-row="${row.role}"><td><strong>${roleLabel(row.role)}</strong></td>${PERMISSIONS.map(([key])=>`<td><input type="checkbox" data-permission="${key}" ${p[key]?'checked':''} ${(editable&&!locked)?'':'disabled'} aria-label="${roleLabel(row.role)} ${key}"></td>`).join('')}<td>${editable&&!locked?`<button class="btn secondary small" data-save-role="${row.role}">Save</button>`:'<span class="muted">Protected</span>'}</td></tr>`}).join('')}</tbody></table></div><p class="muted" style="padding:12px 16px;margin:0">Admin is protected. Managers can manage users but cannot change roles or delete users unless an administrator explicitly changes those permissions.</p>`;
    host.querySelectorAll('[data-save-role]').forEach(button=>button.onclick=async()=>{const row=button.closest('[data-role-row]'),permissions={};row.querySelectorAll('[data-permission]').forEach(input=>permissions[input.dataset.permission]=input.checked);button.disabled=true;button.textContent='Saving…';try{await callUsers({action:'update_permissions',role:button.dataset.saveRole,permissions});button.textContent='Saved';setTimeout(()=>button.textContent='Save',900)}catch(err){alert(err.message);button.textContent='Save'}finally{button.disabled=false}});
  }catch(err){host.innerHTML=`<div class="ux-empty"><h2>Roles unavailable</h2><p>${esc24(err.message||String(err))}</p></div>`}
}

async function renderAdminUsers(){
  const host=document.querySelector('#adminUserManagement');if(!host)return;host.innerHTML='<div class="admin-users-loading">Loading users…</div>';
  try{
    const result=await callUsers({action:'list'});access={role:normalizeRole(result.caller_role||state.role),permissions:result.caller_permissions||access.permissions||{}};
    const users=(result.users||[]).map(u=>({...u,role:normalizeRole(u.role)})),now=Date.now();
    host.innerHTML=`<div class="admin-users-head"><div><h2>User management</h2><p>Create accounts, reset passwords and control access.</p></div>${can('users')?'<button class="btn" id="createAdminUser">＋ Create user</button>':''}</div><div class="table-wrap"><table class="admin-users-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Last sign in</th><th>Last active</th><th>Actions</th></tr></thead><tbody>${users.map(u=>{const live=u.last_active_at&&(now-new Date(u.last_active_at).getTime())<90000;return`<tr><td><strong>${esc24(u.display_name||u.username||'User')}</strong><small>@${esc24(u.username||'user')}</small></td><td><span class="ux-chip">${esc24(roleLabel(u.role))}</span></td><td><span class="admin-status ${u.is_active?'enabled':'disabled'}">${u.is_active?'Enabled':'Disabled'}</span>${live?'<span class="admin-live">Live</span>':''}</td><td>${fmt24(u.created_at)}</td><td>${fmt24(u.last_sign_in_at)}</td><td>${fmt24(u.last_active_at)}</td><td><div class="actions"><button class="btn secondary small" data-user-edit="${u.id}">Edit</button><button class="btn secondary small" data-user-toggle="${u.id}" data-active="${u.is_active}">${u.is_active?'Disable':'Enable'}</button>${can('delete_user')?`<button class="btn danger small" data-user-delete="${u.id}">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="7"><div class="empty">No users found.</div></td></tr>'}</tbody></table></div>`;
    host.querySelector('#createAdminUser')?.addEventListener('click',()=>userModal());
    host.querySelectorAll('[data-user-edit]').forEach(b=>b.onclick=()=>userModal(users.find(u=>u.id===b.dataset.userEdit)));
    host.querySelectorAll('[data-user-toggle]').forEach(b=>b.onclick=async()=>{const active=b.dataset.active==='true';if(!confirm(`${active?'Disable':'Enable'} this user?`))return;try{await callUsers({action:active?'disable':'enable',user_id:b.dataset.userToggle});await renderAdminUsers()}catch(err){alert(err.message)}});
    host.querySelectorAll('[data-user-delete]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.userDelete);if(!confirm(`Delete @${u?.username||'this user'}? This removes login access.`))return;try{await callUsers({action:'delete',user_id:b.dataset.userDelete});await renderAdminUsers()}catch(err){alert(err.message)}});
  }catch(err){host.innerHTML=`<div class="ux-empty"><h2>User management unavailable</h2><p>${esc24(err.message||String(err))}</p></div>`}
}

const originalSettings=window.renderSettings;
window.renderSettings=async function(){
  try{const result=await callUsers({action:'list_permissions'});access={role:normalizeRole(result.caller_role||state.role),permissions:result.caller_permissions||{}}}catch{if(originalSettings)return originalSettings.apply(this,arguments)}
  if(!can('settings')&&!can('users')){if(originalSettings)return originalSettings.apply(this,arguments);return}
  const content=document.querySelector('#content');if(!content)return;
  content.innerHTML=pageHead('Settings','Account, users, roles and permission controls.')+`<section class="settings-grid"><article class="card"><div class="card-head"><h2>Account</h2></div><div class="card-body stack"><label>Email<input class="field" value="${esc24(state.user?.email||'')}" disabled></label><label>Role<input class="field" value="${esc24(roleLabel(access.role))}" disabled></label></div></article><article class="card"><div class="card-head"><h2>Application</h2></div><div class="card-body stack"><label>Currency<input class="field" value="MVR" disabled></label><label>Default GST<input class="field" value="8%" disabled></label></div></article></section><section class="ux-card admin-users-section" id="rolePermissionManagement"></section><section class="ux-card admin-users-section" id="adminUserManagement"></section>`;
  await renderRolePermissions();if(can('users'))await renderAdminUsers();else document.querySelector('#adminUserManagement')?.remove();
};
})();