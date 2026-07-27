import {store,money,escapeHtml,billDate,vendor,status,get,amount} from './store.js';
import {CONFIG} from './config.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');

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
    .map(account=>({
      ...account,
      role:account.aliases.some(alias=>['admin','naappe'].includes(String(alias).toLowerCase()))?'admin':'staff'
    }))
    .sort((a,b)=>a.role.localeCompare(b.role)||a.email.localeCompare(b.email));
}

function accountRows(accounts){
  if(!accounts.length)return '<tr><td colspan="3" class="empty">No configured aliases.</td></tr>';
  return accounts.map(account=>`
    <tr>
      <td><strong>${escapeHtml(account.email)}</strong></td>
      <td>
        <div class="admin-aliases">
          ${account.aliases.map(alias=>`<span class="admin-alias">${escapeHtml(alias)}</span>`).join('')}
        </div>
      </td>
      <td><span class="admin-role ${account.role}">${account.role.toUpperCase()}</span></td>
    </tr>`).join('');
}

function activityRows(rows){
  if(!rows.length)return '<tr><td colspan="5" class="empty">No activity records.</td></tr>';
  return rows.map(row=>{
    const payment=status(row);
    const modified=String(get(row,'updated_at','created_at')||'').slice(0,16).replace('T',' ')||'Not recorded';
    return `
      <tr>
        <td>${escapeHtml(modified)}</td>
        <td>${escapeHtml(billDate(row)||'No date')}</td>
        <td><strong>${escapeHtml(vendor(row))}</strong></td>
        <td><span class="badge ${payment.toLowerCase()==='paid'?'paid':'pending'}">${escapeHtml(payment)}</span></td>
        <td class="num"><strong>${money(amount(row))}</strong></td>
      </tr>`;
  }).join('');
}

export function adminPage(){
  const target=content();
  if(!target)throw new Error('Admin page container is missing.');

  if(store.role!=='admin'){
    target.innerHTML=`
      <header class="page-head">
        <div><h1>Admin & users</h1><p>Restricted workspace.</p></div>
      </header>
      <section class="card"><div class="empty">You do not have permission to open administration.</div></section>`;
    return;
  }

  const accounts=configuredAccounts();
  const rows=Array.isArray(store.rows)?store.rows:[];
  const paid=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pending=rows.length-paid.length;
  const latest=[...rows]
    .sort((a,b)=>String(get(b,'updated_at','created_at')).localeCompare(String(get(a,'updated_at','created_at'))))
    .slice(0,10);
  const total=rows.reduce((sum,row)=>sum+amount(row),0);
  const suppliers=new Set(rows.map(vendor).filter(name=>name&&name!=='Unknown supplier'));
  const sessionEmail=store.user?.email||'Unknown';
  const deployment=window.__BILLS_DEPLOYMENT__?.version||window.app?.health?.version||'unknown';

  target.innerHTML=`
    <header class="page-head">
      <div>
        <h1>Admin & users</h1>
        <p>Configured login aliases, client access policy and recent bill modifications.</p>
      </div>
    </header>

    <section class="admin-page">
      <div class="admin-summary-grid">
        ${kpi('Configured aliases',accounts.length.toLocaleString(),'Not a live Supabase Auth directory')}
        ${kpi('Loaded bills',rows.length.toLocaleString(),`${paid.length} paid · ${pending} pending`)}
        ${kpi('Supplier coverage',suppliers.size.toLocaleString(),money(total))}
        ${kpi('Current session','ADMIN',sessionEmail)}
      </div>

      <div class="admin-detail-grid">
        <article class="card admin-card">
          <header class="card-head">
            <div><h2>Configured login aliases</h2><small>Identities represented by application configuration</small></div>
          </header>
          <div class="admin-table-wrap">
            <table class="table admin-table">
              <thead><tr><th>Email</th><th>Aliases</th><th>Role</th></tr></thead>
              <tbody>${accountRows(accounts)}</tbody>
            </table>
          </div>
          <div class="admin-note">
            <strong>Important boundary</strong>
            <p>This list is not the complete Supabase Auth user directory. Creating, disabling, listing or changing secure user roles requires a protected server-side function or Supabase dashboard access.</p>
          </div>
        </article>

        <article class="card admin-card">
          <header class="card-head"><div><h2>Client system information</h2><small>Current browser session</small></div></header>
          <div class="card-body admin-detail-list">
            <div><span>Email</span><strong>${escapeHtml(sessionEmail)}</strong></div>
            <div><span>Deployment</span><strong>v${escapeHtml(deployment)}</strong></div>
            <div><span>Authentication</span><strong class="admin-good">Session active</strong></div>
            <div><span>Database snapshot</span><strong>${rows.length.toLocaleString()} bills loaded</strong></div>
            <div><span>User administration</span><strong>Server function not configured</strong></div>
          </div>
        </article>
      </div>

      <article class="card admin-card admin-activity-card">
        <header class="card-head"><div><h2>Recent bill modifications</h2><small>This is record history, not a user audit log</small></div></header>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Modified</th><th>Bill date</th><th>Vendor</th><th>Payment</th><th class="num">Amount</th></tr></thead>
            <tbody>${activityRows(latest)}</tbody>
          </table>
        </div>
      </article>
    </section>`;
}
