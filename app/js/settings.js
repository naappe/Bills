import {store,escapeHtml,number} from './store.js';
import {sendPasswordReset,updatePassword} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const header=(title,subtitle)=>`<header class="page-head"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></header>`;

function notice(message,type='success'){
  const element=$('#accountNotice');
  if(!element)return;
  element.className=`settings-notice ${type}`;
  element.textContent=message;
  element.hidden=false;
}

export function settingsPage(){
  const email=store.user?.email||'Not available';
  const role=String(store.role||'staff').toUpperCase();
  const created=store.user?.created_at?new Date(store.user.created_at).toLocaleDateString('en-GB'):'Not available';
  content().innerHTML=`${header('Settings','Workspace preferences and account security.')}
  <section class="settings-grid">
    <article class="card">
      <header class="card-head"><div><h2>Workspace</h2><small>Local display preferences</small></div></header>
      <div class="card-body form-grid settings-workspace">
        <label>Business name<input value="White Saffron" disabled></label>
        <label>Currency<input value="MVR" disabled></label>
        <label>Rows per page<select id="rowsPerPage"><option value="20">20</option><option value="50">50</option></select></label>
      </div>
    </article>

    <article class="card">
      <header class="card-head"><div><h2>Account</h2><small>Your authenticated Supabase identity</small></div></header>
      <div class="card-body account-summary">
        <div><span>Email</span><strong>${escapeHtml(email)}</strong></div>
        <div><span>Role</span><strong><span class="badge ${store.role==='admin'?'paid':'pending'}">${escapeHtml(role)}</span></strong></div>
        <div><span>Account created</span><strong>${escapeHtml(created)}</strong></div>
        <div><span>User ID</span><strong class="settings-user-id">${escapeHtml(store.user?.id||'Not available')}</strong></div>
      </div>
    </article>

    <article class="card settings-span-2">
      <header class="card-head"><div><h2>Password & security</h2><small>Manage your own account password securely</small></div></header>
      <div class="card-body security-grid">
        <section class="security-panel">
          <h3>Change password</h3>
          <p>Choose a password with at least 8 characters. This updates the currently signed-in account.</p>
          <form id="passwordForm" class="stack">
            <label>New password<input id="newPassword" type="password" minlength="8" autocomplete="new-password" required></label>
            <label>Confirm password<input id="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></label>
            <button class="btn" type="submit">Update password</button>
          </form>
        </section>
        <section class="security-panel">
          <h3>Password reset email</h3>
          <p>Send a secure recovery link to <strong>${escapeHtml(email)}</strong>. Use this when you cannot remember the current password.</p>
          <button class="btn secondary" id="sendReset" type="button">Send reset email</button>
        </section>
      </div>
      <div class="settings-notice" id="accountNotice" hidden></div>
    </article>

    <article class="card settings-span-2">
      <header class="card-head"><div><h2>Role management</h2><small>How access is currently assigned</small></div></header>
      <div class="card-body role-boundary">
        <div><strong>Current role: ${escapeHtml(role)}</strong><p>Admin access is currently assigned by the approved Supabase user IDs in the application configuration. Staff accounts cannot promote themselves.</p></div>
        <div><strong>Secure boundary</strong><p>Changing another user's role, disabling accounts, or creating users requires a protected Supabase Edge Function or server-side administrator service. A service-role key will not be exposed in this website.</p></div>
      </div>
    </article>
  </section>`;

  $('#rowsPerPage').value=String(store.pageSize||20);
  $('#rowsPerPage').onchange=event=>{
    store.pageSize=number(event.target.value)||20;
    store.filters||(store.filters={});
    store.filters.bills||(store.filters.bills={});
    store.filters.bills.pageSize=store.pageSize;
  };

  $('#passwordForm').onsubmit=async event=>{
    event.preventDefault();
    const password=$('#newPassword').value;
    const confirmation=$('#confirmPassword').value;
    if(password!==confirmation){notice('The password confirmation does not match.','error');return}
    const button=event.submitter;
    button.disabled=true;
    button.textContent='Updating…';
    try{
      await updatePassword(password);
      event.currentTarget.reset();
      notice('Password updated successfully. Use the new password next time you sign in.');
    }catch(error){notice(error?.message||'Password could not be updated.','error')}
    finally{button.disabled=false;button.textContent='Update password'}
  };

  $('#sendReset').onclick=async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='Sending…';
    try{
      await sendPasswordReset(email);
      notice(`Password reset email sent to ${email}.`);
    }catch(error){notice(error?.message||'Reset email could not be sent.','error')}
    finally{button.disabled=false;button.textContent='Send reset email'}
  };

  if(!$('#settingsStyles')){
    const style=document.createElement('style');
    style.id='settingsStyles';
    style.textContent=`.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}.settings-span-2{grid-column:1/-1}.account-summary{display:grid;gap:0}.account-summary>div{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid var(--border)}.account-summary>div:last-child{border-bottom:0}.account-summary span,.role-boundary p,.security-panel p{color:var(--text-muted)}.settings-user-id{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--fs-11)}.security-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}.security-panel{padding:20px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.security-panel h3{margin:0;color:var(--text-strong)}.security-panel p{margin:7px 0 18px}.settings-notice{margin:0 var(--sp-3) var(--sp-3);padding:12px 14px;border-radius:var(--radius-control);font-weight:var(--weight-semibold)}.settings-notice.success{background:var(--success-soft);color:var(--success)}.settings-notice.error{background:var(--danger-soft);color:var(--danger)}.role-boundary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}.role-boundary>div{padding:18px;border:1px solid var(--border);border-radius:var(--radius-card)}.role-boundary p{margin:6px 0 0}@media(max-width:820px){.settings-grid,.security-grid,.role-boundary{grid-template-columns:1fr}.settings-span-2{grid-column:auto}.settings-workspace{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }
}
