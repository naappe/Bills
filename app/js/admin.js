import {store,money,escapeHtml,billDate,vendor,status,get,amount} from './store.js';
import {CONFIG} from './config.js';
import {db,loadBills} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const dateTime=value=>String(value||'').slice(0,16).replace('T',' ')||'Not recorded';

const kpi=(label,value,meta='')=>`
  <article class="kpi">
    <span>${escapeHtml(label)}</span>
    <strong>${value}</strong>
    ${meta?`<small>${escapeHtml(meta)}</small>`:''}
  </article>`;

function configuredAccounts(){
  const aliases=new Map();
  for(const [alias,email] of Object.entries(CONFIG.loginAliases||{})){
    const key=String(email||'').trim().toLowerCase();
    if(!key)continue;
    if(!aliases.has(key))aliases.set(key,{email:String(email),aliases:[]});
    aliases.get(key).aliases.push(alias);
  }
  return [...aliases.values()]
    .map(account=>({...account,role:account.aliases.some(alias=>['admin','naappe'].includes(String(alias).toLowerCase()))?'admin':'staff'}))
    .sort((a,b)=>a.role.localeCompare(b.role)||a.email.localeCompare(b.email));
}

function accountRows(accounts){
  if(!accounts.length)return '<tr><td colspan="3" class="empty">No configured aliases.</td></tr>';
  return accounts.map(account=>`
    <tr>
      <td><strong>${escapeHtml(account.email)}</strong></td>
      <td><div class="admin-aliases">${account.aliases.map(alias=>`<span class="admin-alias">${escapeHtml(alias)}</span>`).join('')}</div></td>
      <td><span class="admin-role ${account.role}">${account.role.toUpperCase()}</span></td>
    </tr>`).join('');
}

function userAccessRows(users){
  if(!users.length)return '<tr><td colspan="6" class="empty">No authenticated users were returned.</td></tr>';
  return users.map(user=>{
    const id=String(user.user_id||''),email=String(user.email||'No email'),role=String(user.role||'staff').toLowerCase(),active=user.is_active!==false;
    const primary=CONFIG.adminIds.includes(id),current=id===String(store.user?.id||''),locked=primary||current;
    const lastSeen=user.is_online?'Online now':dateTime(user.last_seen_at||user.last_sign_in_at);
    return `<tr>
      <td><div class="admin-user"><span>${escapeHtml((user.display_name||email).charAt(0).toUpperCase())}</span><div><strong>${escapeHtml(user.display_name||email.split('@')[0])}</strong><small>${escapeHtml(email)}${current?' · Current session':''}</small></div></div></td>
      <td><select class="admin-role-select" data-user-role="${escapeHtml(id)}" ${locked?'disabled':''} aria-label="Role for ${escapeHtml(email)}"><option value="staff" ${role==='staff'?'selected':''}>Staff</option><option value="admin" ${role==='admin'?'selected':''}>Admin</option></select></td>
      <td><span class="admin-status ${active?'active':'inactive'}"><i class="fa-solid ${active?'fa-circle-check':'fa-circle-minus'}"></i>${active?'Active':'Inactive'}</span></td>
      <td><span class="${user.is_online?'admin-online':''}">${escapeHtml(lastSeen)}</span></td>
      <td>${escapeHtml(dateTime(user.created_at))}</td>
      <td><div class="admin-user-actions">${locked?`<span class="admin-protected">${primary?'Primary admin':'Current user'}</span>`:`<button class="btn secondary small" data-save-user="${escapeHtml(id)}" type="button">Save role</button><button class="btn small ${active?'danger':''}" data-toggle-user="${escapeHtml(id)}" type="button">${active?'Deactivate':'Activate'}</button>`}</div></td>
    </tr>`;
  }).join('');
}

function activityRows(rows){
  if(!rows.length)return '<tr><td colspan="5" class="empty">No activity records.</td></tr>';
  return rows.map(row=>{
    const payment=status(row);
    return `<tr><td>${escapeHtml(dateTime(get(row,'updated_at','created_at')))}</td><td>${escapeHtml(billDate(row)||'No date')}</td><td><strong>${escapeHtml(vendor(row))}</strong></td><td><span class="badge ${payment.toLowerCase()==='paid'?'paid':'pending'}">${escapeHtml(payment)}</span></td><td class="num"><strong>${money(amount(row))}</strong></td></tr>`;
  }).join('');
}

function requestRows(requests){
  if(!requests.length)return '<tr><td colspan="5" class="empty">No pending deletion requests.</td></tr>';
  return requests.map(request=>`
    <tr>
      <td>${escapeHtml(dateTime(request.requested_at))}</td>
      <td><strong>${escapeHtml(request.entity_label||`Bill ${request.entity_id}`)}</strong><small>Record ${escapeHtml(request.entity_id)}</small></td>
      <td>${escapeHtml(request.reason||'No reason entered')}</td>
      <td><span class="badge pending">Pending</span></td>
      <td><div class="actions"><button class="btn small" data-approve="${request.id}" type="button">Approve</button><button class="btn secondary small" data-reject="${request.id}" type="button">Reject</button></div></td>
    </tr>`).join('');
}

function trashRows(items){
  if(!items.length)return '<tr><td colspan="5" class="empty">Trash is empty.</td></tr>';
  return items.map(item=>{
    const snapshot=item.snapshot||{};
    const expires=new Date(new Date(item.deleted_at).getTime()+30*86400000);
    const days=Math.max(0,Math.ceil((expires-Date.now())/86400000));
    return `<tr><td>${escapeHtml(dateTime(item.deleted_at))}</td><td><strong>${escapeHtml(vendor(snapshot))}</strong><small>Record ${escapeHtml(item.entity_id)}</small></td><td>${escapeHtml(billDate(snapshot)||'No date')}</td><td><span class="badge pending">${days} day${days===1?'':'s'} left</span></td><td><button class="btn small" data-restore="${item.id}" type="button">Restore</button></td></tr>`;
  }).join('');
}

async function loadRequests(){
  const {data,error}=await db.from('deletion_requests').select('*').eq('entity_type','bill').eq('status','pending').order('requested_at',{ascending:false});
  if(error)throw error;
  return data||[];
}

async function loadTrash(){
  const {data,error}=await db.from('restore_bin').select('*').eq('entity_type','bill').is('restored_at',null).order('deleted_at',{ascending:false});
  if(error)throw error;
  return data||[];
}

async function loadAdminUsers(){
  const {data,error}=await db.rpc('admin_user_overview');
  if(error)throw error;
  return data||[];
}

async function updateAdminUser(user,{role=user.role,active=user.is_active}={}){
  const {error}=await db.rpc('admin_update_user_role',{
    target_user:user.user_id,
    new_role:role,
    new_active:active,
    new_display_name:user.display_name||null
  });
  if(error)throw error;
}

async function restoreBill(item){
  const {error}=await db.rpc('restore_bill_from_trash',{p_restore_id:item.id});
  if(error)throw error;
  await loadBills({force:true});
}

async function reviewRequest(request,decision){
  const {error}=await db.rpc('review_bill_deletion_request',{
    p_request_id:request.id,
    p_decision:decision
  });
  if(error)throw error;
  if(decision==='approved'){
    store.set({rows:store.rows.filter(row=>String(row.id)!==String(request.entity_id))});
  }
}

export async function adminPage(){
  const target=content();
  if(!target)throw new Error('Admin page container is missing.');
  if(store.role!=='admin'){
    target.innerHTML='<header class="page-head"><div><h1>Admin & users</h1><p>Restricted workspace.</p></div></header><section class="card"><div class="empty">You do not have permission to open administration.</div></section>';
    return;
  }

  target.innerHTML='<section class="card"><div class="empty">Loading administration…</div></section>';
  let requests=[],trash=[],users=[],usersError='';
  const results=await Promise.allSettled([loadRequests(),loadTrash(),loadAdminUsers()]);
  if(results[0].status==='fulfilled')requests=results[0].value;else console.error('[admin] deletion requests failed',results[0].reason);
  if(results[1].status==='fulfilled')trash=results[1].value;else console.error('[admin] trash failed',results[1].reason);
  if(results[2].status==='fulfilled')users=results[2].value;else{usersError=results[2].reason?.message||'User access could not be loaded.';console.error('[admin] user access failed',results[2].reason)}

  const accounts=configuredAccounts();
  const rows=Array.isArray(store.rows)?store.rows:[];
  const paid=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pending=rows.length-paid.length;
  const latest=[...rows].sort((a,b)=>String(get(b,'updated_at','created_at')).localeCompare(String(get(a,'updated_at','created_at')))).slice(0,10);
  const total=rows.reduce((sum,row)=>sum+amount(row),0);
  const suppliers=new Set(rows.map(vendor).filter(name=>name&&name!=='Unknown supplier'));
  const activeUsers=users.filter(user=>user.is_active!==false).length;
  const sessionEmail=store.user?.email||'Unknown';
  const deployment=window.__BILLS_DEPLOYMENT__?.version||window.app?.health?.version||'unknown';

  target.innerHTML=`
    <section class="admin-page">
      <header class="page-head"><div><h1>Admin & users</h1><p>Review staff bill deletion requests and account access.</p></div></header>
      <div class="admin-summary-grid">
        ${kpi('Pending delete requests',requests.length.toLocaleString(),'Admin approval required')}
        ${kpi('Trash',trash.length.toLocaleString(),'Restorable for 30 days')}
        ${kpi('Active users',activeUsers.toLocaleString(),`${users.length-activeUsers} inactive`)}
        ${kpi('Current session','ADMIN',sessionEmail)}
      </div>
      <article class="card admin-card admin-users-card">
        <header class="card-head"><div><h2>User access management</h2><small>Activate accounts and assign Admin or Staff access</small></div><span class="admin-user-count">${users.length} user${users.length===1?'':'s'}</span></header>
        ${usersError?`<div class="admin-access-error"><strong>User management is unavailable</strong><span>${escapeHtml(usersError)}</span></div>`:`<div class="table-wrap"><table class="table admin-users-table"><thead><tr><th>User</th><th>Access level</th><th>Status</th><th>Last active</th><th>Created</th><th>Action</th></tr></thead><tbody>${userAccessRows(users)}</tbody></table></div>`}
      </article>
      <article class="card admin-card">
        <header class="card-head"><div><h2>Pending bill deletion requests</h2><small>Approving moves the bill to recoverable Trash</small></div></header>
        <div class="table-wrap"><table class="table"><thead><tr><th>Requested</th><th>Bill</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>${requestRows(requests)}</tbody></table></div>
      </article>
      <article class="card admin-card">
        <header class="card-head"><div><h2>Bill Trash</h2><small>Deleted bills can be restored for 30 days</small></div></header>
        <div class="table-wrap"><table class="table"><thead><tr><th>Deleted</th><th>Bill</th><th>Bill date</th><th>Recovery</th><th>Action</th></tr></thead><tbody>${trashRows(trash)}</tbody></table></div>
      </article>
      <div class="admin-detail-grid">
        <article class="card admin-card"><header class="card-head"><div><h2>Configured login aliases</h2><small>Application configuration</small></div></header><div class="admin-table-wrap"><table class="table admin-table"><thead><tr><th>Email</th><th>Aliases</th><th>Role</th></tr></thead><tbody>${accountRows(accounts)}</tbody></table></div></article>
        <article class="card admin-card"><header class="card-head"><div><h2>Client system information</h2><small>Current browser session</small></div></header><div class="card-body admin-detail-list"><div><span>Email</span><strong>${escapeHtml(sessionEmail)}</strong></div><div><span>Deployment</span><strong>v${escapeHtml(deployment)}</strong></div><div><span>Authentication</span><strong class="admin-good">Session active</strong></div><div><span>Database snapshot</span><strong>${rows.length.toLocaleString()} bills loaded</strong></div></div></article>
      </div>
      <article class="card admin-card admin-activity-card"><header class="card-head"><div><h2>Recent bill modifications</h2><small>Latest records loaded from Bills</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Modified</th><th>Bill date</th><th>Vendor</th><th>Payment</th><th class="num">Amount</th></tr></thead><tbody>${activityRows(latest)}</tbody></table></div></article>
    </section>`;

  target.querySelectorAll('[data-restore]').forEach(button=>button.onclick=async()=>{
    const item=trash.find(entry=>String(entry.id)===String(button.dataset.restore));
    if(!item||!confirm('Restore this bill to the Bills page?'))return;
    button.disabled=true;
    try{await restoreBill(item);await adminPage()}catch(error){console.error('[admin] restore failed',error);alert(error.message||'Bill could not be restored.');button.disabled=false}
  });

  target.querySelectorAll('[data-approve],[data-reject]').forEach(button=>button.onclick=async()=>{
    const request=requests.find(item=>String(item.id)===String(button.dataset.approve||button.dataset.reject));
    if(!request)return;
    const decision=button.dataset.approve?'approved':'rejected';
    if(decision==='approved'&&!confirm(`Approve deletion of ${request.entity_label||`bill ${request.entity_id}`}?`))return;
    button.disabled=true;
    try{await reviewRequest(request,decision);await adminPage()}catch(error){console.error('[admin] request review failed',error);alert(error.message||'Request could not be reviewed.');button.disabled=false}
  });

  target.querySelectorAll('[data-save-user]').forEach(button=>button.onclick=async()=>{
    const user=users.find(item=>String(item.user_id)===String(button.dataset.saveUser));
    const select=target.querySelector(`[data-user-role="${CSS.escape(String(button.dataset.saveUser))}"]`);
    if(!user||!select||select.value===user.role)return;
    if(!confirm(`Change ${user.email} access from ${String(user.role).toUpperCase()} to ${select.value.toUpperCase()}?`))return;
    button.disabled=true;
    try{await updateAdminUser(user,{role:select.value});await adminPage()}catch(error){console.error('[admin] role update failed',error);alert(error.message||'User role could not be updated.');button.disabled=false}
  });

  target.querySelectorAll('[data-toggle-user]').forEach(button=>button.onclick=async()=>{
    const user=users.find(item=>String(item.user_id)===String(button.dataset.toggleUser));
    if(!user)return;
    const activate=user.is_active===false;
    if(!confirm(`${activate?'Activate':'Deactivate'} ${user.email}?${activate?'':' They will no longer be able to use procurement data.'}`))return;
    button.disabled=true;
    try{await updateAdminUser(user,{active:activate});await adminPage()}catch(error){console.error('[admin] active status update failed',error);alert(error.message||'User status could not be updated.');button.disabled=false}
  });
}
