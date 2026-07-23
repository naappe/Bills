(()=>{
'use strict';
const isAdmin=()=>state?.role==='admin'||ADMIN_IDS.includes(state?.user?.id);
const esc24=v=>esc(v??'');
const fmt24=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-';

async function callUsers(payload){
  const {data,error}=await db.functions.invoke('admin-users',{body:payload});
  if(data?.error)throw new Error(data.error);
  if(error){
    let message=error.message||'User management request failed';
    try{
      const body=await error.context?.json?.();
      if(body?.error)message=body.error;
    }catch{}
    throw new Error(message);
  }
  return data||{};
}

function userModal(user){
  const modal=document.createElement('div');
  modal.className='ux-modal-backdrop';
  modal.innerHTML=`<div class="ux-modal admin-user-modal"><div class="ux-modal-head"><h2>${user?'Edit user':'Create user'}</h2><button class="btn secondary small" data-close>×</button></div><form id="adminUserForm" autocomplete="off"><div class="ux-modal-body ux-form-grid"><label class="full">Display name<input class="field" name="display_name" value="${esc24(user?.display_name)}" required autocomplete="off"></label><label class="full">Email<input class="field" type="email" name="email" value="${esc24(user?.email)}" required autocomplete="off"></label><label>${user?'New password (optional)':'Password'}<input class="field" type="password" name="password" ${user?'':'required minlength="6"'} autocomplete="new-password" value=""></label><label>Role<select class="field" name="role">${['admin','manager','staff','readonly'].map(r=>`<option value="${r}" ${user?.role===r?'selected':''}>${r[0].toUpperCase()+r.slice(1)}</option>`).join('')}</select></label></div><div class="ux-modal-foot"><button class="btn secondary" type="button" data-close>Cancel</button><button class="btn" type="submit">${user?'Save changes':'Create user'}</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal.remove());
  modal.querySelector('form').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget),button=e.currentTarget.querySelector('[type="submit"]');
    const password=String(f.get('password')||'').trim();
    button.disabled=true;button.textContent='Saving…';
    try{
      const payload={action:user?'update':'create',user_id:user?.id,display_name:f.get('display_name'),email:f.get('email'),role:f.get('role'),is_active:user?.is_active!==false};
      if(password)payload.password=password;
      await callUsers(payload);
      modal.remove();await renderAdminUsers();
    }catch(err){alert(err.message||String(err));button.disabled=false;button.textContent=user?'Save changes':'Create user'}
  };
}

async function renderAdminUsers(){
  const host=document.querySelector('#adminUserManagement');
  if(!host)return;
  host.innerHTML='<div class="admin-users-loading">Loading users…</div>';
  try{
    const result=await callUsers({action:'list'}),users=result.users||[],now=Date.now();
    host.innerHTML=`<div class="admin-users-head"><div><h2>User management</h2><p>Create, edit, disable, enable or delete system users.</p></div><button class="btn" id="createAdminUser">＋ Create user</button></div><div class="table-wrap"><table class="admin-users-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Last sign in</th><th>Last active</th><th>Actions</th></tr></thead><tbody>${users.map(u=>{const live=u.last_active_at&&(now-new Date(u.last_active_at).getTime())<90000;return`<tr><td><strong>${esc24(u.display_name||u.email||'User')}</strong><small>${esc24(u.email||'')}</small></td><td><span class="ux-chip">${esc24(u.role)}</span></td><td><span class="admin-status ${u.is_active?'enabled':'disabled'}">${u.is_active?'Enabled':'Disabled'}</span>${live?'<span class="admin-live">Live</span>':''}</td><td>${fmt24(u.created_at)}</td><td>${fmt24(u.last_sign_in_at)}</td><td>${fmt24(u.last_active_at)}</td><td><div class="actions"><button class="btn secondary small" data-user-edit="${u.id}">Edit</button><button class="btn ${u.is_active?'secondary':'primary'} small" data-user-toggle="${u.id}" data-active="${u.is_active}">${u.is_active?'Disable':'Enable'}</button><button class="btn danger small" data-user-delete="${u.id}">Delete</button></div></td></tr>`}).join('')||'<tr><td colspan="7"><div class="empty">No users found.</div></td></tr>'}</tbody></table></div>`;
    host.querySelector('#createAdminUser').onclick=()=>userModal();
    host.querySelectorAll('[data-user-edit]').forEach(b=>b.onclick=()=>userModal(users.find(u=>u.id===b.dataset.userEdit)));
    host.querySelectorAll('[data-user-toggle]').forEach(b=>b.onclick=async()=>{const active=b.dataset.active==='true';if(!confirm(`${active?'Disable':'Enable'} this user?`))return;try{await callUsers({action:active?'disable':'enable',user_id:b.dataset.userToggle});await renderAdminUsers()}catch(err){alert(err.message)}});
    host.querySelectorAll('[data-user-delete]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.userDelete);if(!confirm(`Delete ${u?.email||'this user'}? This removes login access.`))return;try{await callUsers({action:'delete',user_id:b.dataset.userDelete});await renderAdminUsers()}catch(err){alert(err.message)}});
  }catch(err){host.innerHTML=`<div class="ux-empty"><h2>User management unavailable</h2><p>${esc24(err.message||String(err))}</p></div>`}
}

const originalSettings=window.renderSettings;
window.renderSettings=async function(){
  if(!isAdmin()){
    if(originalSettings)await originalSettings.apply(this,arguments);
    return;
  }
  const content=document.querySelector('#content');
  if(!content)return;
  content.innerHTML=pageHead('Settings','Administrator controls, account information and user access.')+
    `<section class="settings-grid"><article class="card"><div class="card-head"><h2>Administrator account</h2></div><div class="card-body stack"><label>Email<input class="field" value="${esc24(state.user?.email||'')}" disabled></label><label>Role<input class="field" value="Administrator" disabled></label></div></article><article class="card"><div class="card-head"><h2>Application</h2></div><div class="card-body stack"><label>Currency<input class="field" value="MVR" disabled></label><label>Default GST<input class="field" value="8%" disabled></label></div></article></section><section class="ux-card admin-users-section" id="adminUserManagement"></section>`;
  await renderAdminUsers();
};
})();