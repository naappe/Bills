import {store,money,escapeHtml,text,number,billDate,vendor,status,get} from './store.js';
import {CONFIG} from './config.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const header=(title,subtitle)=>`<header class="page-head"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></header>`;
const kpi=(label,value,meta='')=>`<article class="kpi"><span>${escapeHtml(label)}</span><strong>${value}</strong>${meta?`<small>${escapeHtml(meta)}</small>`:''}</article>`;

function configuredAccounts(){
  const aliases=new Map();
  Object.entries(CONFIG.loginAliases||{}).forEach(([alias,email])=>{
    const key=String(email||'').toLowerCase();
    if(!key)return;
    if(!aliases.has(key))aliases.set(key,{email,aliases:[]});
    aliases.get(key).aliases.push(alias);
  });
  return [...aliases.values()].map(account=>({
    ...account,
    role:account.aliases.some(alias=>alias==='admin'||alias==='naappe')?'admin':'staff'
  })).sort((a,b)=>a.role.localeCompare(b.role)||a.email.localeCompare(b.email));
}

function permissionRows(){
  return [
    ['Dashboard','View','View'],
    ['Bills','Add, view, edit within 24 hours','Full control'],
    ['Products','View','View and manage catalogue'],
    ['Vendors','View','View and manage suppliers'],
    ['Price Intelligence','No access','Full access'],
    ['Reports','View and export','View and export'],
    ['Settings','Workspace preferences','Workspace preferences'],
    ['Admin & users','No access','Full access'],
    ['Delete bills','No','Yes']
  ];
}

export function adminPage(){
  if(store.role!=='admin'){
    content().innerHTML=`${header('Admin & users','Restricted workspace for administrators.')}<section class="card"><div class="empty">Your account does not have permission to open administration.</div></section>`;
    return;
  }

  const accounts=configuredAccounts();
  const rows=store.rows;
  const paid=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pending=rows.filter(row=>status(row).toLowerCase()!=='paid');
  const latest=[...rows].sort((a,b)=>String(get(b,'updated_at','created_at')).localeCompare(String(get(a,'updated_at','created_at'))).slice(0,8);
  const total=rows.reduce((sum,row)=>sum+number(get(row,'amount','total','grand_total')),0);
  const suppliers=new Set(rows.map(vendor).filter(Boolean));
  const sessionEmail=store.user?.email||'Unknown';
  const createdAt=store.user?.created_at?String(store.user.created_at).slice(0,10):'Not available';
  const lastSignIn=store.user?.last_sign_in_at?String(store.user.last_sign_in_at).slice(0,16).replace('T',' '):'Not available';

  content().innerHTML=`${header('Admin & users','Account access, role permissions and system health for this workspace.')}
  <section class="grid-4">
    ${kpi('Configured accounts',accounts.length.toLocaleString(),'Unique login identities')}
    ${kpi('Loaded records',rows.length.toLocaleString(),`${paid.length} paid · ${pending.length} pending`)}
    ${kpi('Supplier coverage',suppliers.size.toLocaleString(),money(total))}
    ${kpi('Current role','ADMIN',sessionEmail)}
  </section>

  <section class="admin-grid">
    <article class="card admin-span-2">
      <header class="card-head"><div><h2>Configured access identities</h2><small>Accounts currently represented by the application configuration</small></div></header>
      <div class="table-wrap"><table class="table admin-users-table"><thead><tr><th>Email</th><th>Login aliases</th><th>Role</th><th>Status</th></tr></thead><tbody>
        ${accounts.map(account=>`<tr><td><strong>${escapeHtml(account.email)}</strong></td><td>${account.aliases.map(alias=>`<span class="admin-alias">${escapeHtml(alias)}</span>`).join(' ')}</td><td><span class="admin-role ${account.role}">${account.role.toUpperCase()}</span></td><td><span class="admin-status">Configured</span></td></tr>`).join('')||'<tr><td colspan="4" class="empty">No configured accounts.</td></tr>'}
      </tbody></table></div>
      <div class="admin-note"><strong>Role-management boundary</strong><p>This GitHub Pages application uses a public Supabase client. Creating users, listing all Auth users, changing passwords, or assigning secure database roles requires a protected server-side function or Supabase dashboard access. The browser must not receive a service-role key.</p></div>
    </article>

    <article class="card">
      <header class="card-head"><div><h2>Current session</h2><small>Authenticated account details</small></div></header>
      <div class="card-body admin-detail-list">
        <div><span>Email</span><strong>${escapeHtml(sessionEmail)}</strong></div>
        <div><span>User ID</span><strong class="admin-id">${escapeHtml(store.user?.id||'Unknown')}</strong></div>
        <div><span>Account created</span><strong>${escapeHtml(createdAt)}</strong></div>
        <div><span>Last sign-in</span><strong>${escapeHtml(lastSignIn)}</strong></div>
        <div><span>Session</span><strong class="admin-good">Active</strong></div>
      </div>
    </article>

    <article class="card admin-span-2">
      <header class="card-head"><div><h2>Role permission matrix</h2><small>Effective application-level behavior</small></div></header>
      <div class="table-wrap"><table class="table permission-table"><thead><tr><th>Capability</th><th>Staff</th><th>Admin</th></tr></thead><tbody>${permissionRows().map(([capability,staff,admin])=>`<tr><td><strong>${escapeHtml(capability)}</strong></td><td>${escapeHtml(staff)}</td><td>${escapeHtml(admin)}</td></tr>`).join('')}</tbody></table></div>
    </article>

    <article class="card">
      <header class="card-head"><div><h2>System health</h2><small>Client runtime and database state</small></div></header>
      <div class="card-body admin-health">
        <div><span class="health-dot ok"></span><p><strong>Authentication</strong><small>Supabase session active</small></p></div>
        <div><span class="health-dot ok"></span><p><strong>Database</strong><small>${rows.length.toLocaleString()} records loaded</small></p></div>
        <div><span class="health-dot ok"></span><p><strong>Deployment</strong><small>GitHub Pages v${escapeHtml(window.__BILLS_DEPLOYMENT__?.version||'unknown')}</small></p></div>
        <div><span class="health-dot warning"></span><p><strong>User directory</strong><small>Server-side administration not configured</small></p></div>
      </div>
    </article>

    <article class="card admin-span-3">
      <header class="card-head"><div><h2>Recent record activity</h2><small>Latest saved or edited procurement records</small></div></header>
      <div class="table-wrap"><table class="table"><thead><tr><th>Activity</th><th>Bill date</th><th>Vendor</th><th>Payment</th><th class="num">Amount</th></tr></thead><tbody>${latest.map(row=>{const activity=String(get(row,'updated_at','created_at')||'').slice(0,16).replace('T',' ');return `<tr><td>${escapeHtml(activity||'Not recorded')}</td><td>${escapeHtml(billDate(row)||'No date')}</td><td><strong>${escapeHtml(vendor(row))}</strong></td><td><span class="badge ${status(row).toLowerCase()==='paid'?'paid':'pending'}">${escapeHtml(status(row))}</span></td><td class="num"><strong>${money(number(get(row,'amount','total','grand_total')))}</strong></td></tr>`}).join('')||'<tr><td colspan="5" class="empty">No activity records.</td></tr>'}</tbody></table></div>
    </article>
  </section>`;
}
