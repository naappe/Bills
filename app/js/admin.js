import {store,money,escapeHtml,billDate,vendor,status,get,amount,text} from './store.js';
import {CONFIG} from './config.js';
import {loadDeletionRequests,loadAuditLog,reviewDeletionRequest} from './workflow.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const dateTime=value=>String(value||'').slice(0,16).replace('T',' ')||'Not recorded';

const kpi=(label,value,meta='')=>`<article class="kpi"><span>${escapeHtml(label)}</span><strong>${value}</strong>${meta?`<small>${escapeHtml(meta)}</small>`:''}</article>`;

function configuredAccounts(){
  const aliases=new Map();
  for(const [alias,email] of Object.entries(CONFIG.loginAliases||{})){
    const key=String(email||'').trim().toLowerCase();
    if(!key)continue;
    if(!aliases.has(key))aliases.set(key,{email:String(email),aliases:[]});
    aliases.get(key).aliases.push(alias);
  }
  return [...aliases.values()].map(account=>({...account,role:account.aliases.some(alias=>['admin','naappe'].includes(String(alias).toLowerCase()))?'admin':'staff'})).sort((a,b)=>a.role.localeCompare(b.role)||a.email.localeCompare(b.email));
}

function accountRows(accounts){
  if(!accounts.length)return '<tr><td colspan="3" class="empty">No configured aliases.</td></tr>';
  return accounts.map(account=>`<tr><td><strong>${escapeHtml(account.email)}</strong></td><td><div class="admin-aliases">${account.aliases.map(alias=>`<span class="admin-alias">${escapeHtml(alias)}</span>`).join('')}</div></td><td><span class="admin-role ${account.role}">${account.role.toUpperCase()}</span></td></tr>`).join('');
}

function activityRows(rows){
  if(!rows.length)return '<tr><td colspan="5" class="empty">No recent bill records.</td></tr>';
  return rows.map(row=>{const payment=status(row);return`<tr><td>${escapeHtml(dateTime(get(row,'updated_at','created_at')))}</td><td>${escapeHtml(billDate(row)||'No date')}</td><td><strong>${escapeHtml(vendor(row))}</strong></td><td><span class="badge ${payment.toLowerCase()==='paid'?'paid':'pending'}">${escapeHtml(payment)}</span></td><td class="num"><strong>${money(amount(row))}</strong></td></tr>`}).join('');
}

function requestRows(requests){
  if(!requests.length)return '<tr><td colspan="6" class="empty">No deletion requests.</td></tr>';
  return requests.map(request=>`<tr><td>${escapeHtml(dateTime(request.requested_at))}</td><td><strong>${escapeHtml(request.entity_label||request.entity_id)}</strong><small>${escapeHtml(request.entity_type)} · ${escapeHtml(request.entity_id)}</small></td><td>${escapeHtml(request.reason||'No reason entered')}</td><td><span class="badge ${request.status==='pending'?'pending':'paid'}">${escapeHtml(request.status)}</span></td><td>${escapeHtml(request.review_note||'—')}</td><td>${request.status==='pending'?`<div class="actions"><button class="btn small" data-review="approved" data-request="${request.id}" type="button">Approve</button><button class="btn secondary small" data-review="rejected" data-request="${request.id}" type="button">Reject</button></div>`:'Reviewed'}</td></tr>`).join('');
}

function auditRows(rows){
  if(!rows.length)return '<tr><td colspan="5" class="empty">No staff activity has been recorded.</td></tr>';
  return rows.map(row=>`<tr><td>${escapeHtml(dateTime(row.changed_at))}</td><td><strong>${escapeHtml(row.action)}</strong></td><td>${escapeHtml(row.table_name)}</td><td>${escapeHtml(row.record_id||'—')}</td><td>${escapeHtml(row.changed_by||'System')}</td></tr>`).join('');
}

export async function adminPage(){
  const target=content();
  if(!target)throw new Error('Admin page container is missing.');
  if(store.role!=='admin'){
    target.innerHTML='<header class="page-head"><div><h1>Admin & users</h1><p>Restricted workspace.</p></div></header><section class="card"><div class="empty">You do not have permission to open administration.</div></section>';
    return;
  }

  target.innerHTML='<section class="card"><div class="empty">Loading administration…</div></section>';
  const [requestResult,auditResult]=await Promise.allSettled([loadDeletionRequests(),loadAuditLog(100)]);
  const requests=requestResult.status==='fulfilled'?requestResult.value:[];
  const audit=auditResult.status==='fulfilled'?auditResult.value:[];
  if(requestResult.status==='rejected')console.error('[admin] deletion requests failed',requestResult.reason);
  if(auditResult.status==='rejected')console.error('[admin] audit log failed',auditResult.reason);

  const accounts=configuredAccounts();
  const rows=Array.isArray(store.rows)?store.rows:[];
  const paid=rows.filter(row=>status(row).toLowerCase()==='paid');
  const pending=rows.length-paid.length;
  const latest=[...rows].sort((a,b)=>String(get(b,'updated_at','created_at')).localeCompare(String(get(a,'updated_at','created_at')))).slice(0,10);
  const total=rows.reduce((sum,row)=>sum+amount(row),0);
  const suppliers=new Set(rows.map(vendor).filter(name=>name&&name!=='Unknown supplier'));
  const sessionEmail=store.user?.email||'Unknown';
  const deployment=window.__BILLS_DEPLOYMENT__?.version||window.app?.health?.version||'unknown';
  const pendingRequests=requests.filter(request=>request.status==='pending').length;

  target.innerHTML=`<header class="page-head"><div><h1>Admin & users</h1><p>Staff access, deletion approvals and recorded activity.</p></div></header>
    <section class="admin-page">
      <div class="admin-summary-grid">${kpi('Configured aliases',accounts.length.toLocaleString(),'Application login aliases')}${kpi('Loaded bills',rows.length.toLocaleString(),`${paid.length} paid · ${pending} pending`)}${kpi('Pending deletion requests',pendingRequests.toLocaleString(),'Admin review required')}${kpi('Current session','ADMIN',sessionEmail)}</div>
      <article class="card admin-card"><header class="card-head"><div><h2>Deletion requests</h2><small>Staff cannot delete until an admin approves the request</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Requested</th><th>Record</th><th>Reason</th><th>Status</th><th>Review note</th><th>Action</th></tr></thead><tbody>${requestRows(requests)}</tbody></table></div></article>
      <article class="card admin-card"><header class="card-head"><div><h2>Staff activity log</h2><small>Latest 100 recorded actions</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Action</th><th>Area</th><th>Record</th><th>User ID</th></tr></thead><tbody>${auditRows(audit)}</tbody></table></div></article>
      <div class="admin-detail-grid"><article class="card admin-card"><header class="card-head"><div><h2>Configured login aliases</h2><small>Identities represented by application configuration</small></div></header><div class="admin-table-wrap"><table class="table admin-table"><thead><tr><th>Email</th><th>Aliases</th><th>Role</th></tr></thead><tbody>${accountRows(accounts)}</tbody></table></div></article>
      <article class="card admin-card"><header class="card-head"><div><h2>Client system information</h2><small>Current browser session</small></div></header><div class="card-body admin-detail-list"><div><span>Email</span><strong>${escapeHtml(sessionEmail)}</strong></div><div><span>Deployment</span><strong>v${escapeHtml(deployment)}</strong></div><div><span>Authentication</span><strong class="admin-good">Session active</strong></div><div><span>Database snapshot</span><strong>${rows.length.toLocaleString()} bills loaded</strong></div><div><span>Supplier coverage</span><strong>${suppliers.size.toLocaleString()} · ${money(total)}</strong></div></div></article></div>
      <article class="card admin-card admin-activity-card"><header class="card-head"><div><h2>Recent bill modifications</h2><small>Latest records loaded from Bills</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Modified</th><th>Bill date</th><th>Vendor</th><th>Payment</th><th class="num">Amount</th></tr></thead><tbody>${activityRows(latest)}</tbody></table></div></article>
    </section>`;

  target.querySelectorAll('[data-review]').forEach(button=>button.onclick=async()=>{
    const request=requests.find(item=>String(item.id)===String(button.dataset.request));
    if(!request)return;
    const decision=button.dataset.review;
    const note=prompt(`${decision==='approved'?'Approve':'Reject'} deletion request. Add an optional note:`,'');
    if(note===null)return;
    button.disabled=true;
    try{
      await reviewDeletionRequest(request,decision,text(note));
      await adminPage();
    }catch(error){
      console.error('[admin] deletion review failed',error);
      alert(error.message||'The deletion request could not be reviewed.');
      button.disabled=false;
    }
  });
}
