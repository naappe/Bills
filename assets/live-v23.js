(()=>{
'use strict';
const VIEW_KEY='ws-current-view';
const views=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const D=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const createdVal=r=>r.created_at||r.updated_at||dateVal(r);
const dateTime=v=>{const d=D(v);return d?d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-'};
const isAdmin=()=>String(state.role||'').toLowerCase()==='admin'||ADMIN_IDS.includes(state.user?.id);
const activeRows=()=>state.rows.filter(r=>!r.deleted_at&&!r.archived_at);

function remember(view){if(!views.has(view))return;localStorage.setItem(VIEW_KEY,view);history.replaceState(null,'',`#${view}`)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-view],[data-go]');const v=t?.dataset.view||t?.dataset.go;if(v)remember(v)},true);

async function restoreView(){const hash=location.hash.replace('#',''),saved=views.has(hash)?hash:localStorage.getItem(VIEW_KEY);if(!views.has(saved))return;for(let i=0;i<12;i++){if(state.user&&typeof show==='function'){if(state.view!==saved)show(saved);return}await new Promise(r=>setTimeout(r,150))}}
db.auth.onAuthStateChange((event,session)=>{if(session)setTimeout(restoreView,40)});window.addEventListener('load',()=>setTimeout(restoreView,250));

let heartbeatTimer=null;
async function heartbeat(online=true){if(!state.user)return;const payload={user_id:state.user.id,email:state.user.email||'',display_name:state.user.user_metadata?.full_name||state.user.email?.split('@')[0]||'User',role:state.role||'staff',current_view:state.view||localStorage.getItem(VIEW_KEY)||'dashboard',is_online:online,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};try{await db.from('user_presence').upsert(payload,{onConflict:'user_id'})}catch(err){console.warn('Presence update failed',err)}}
function startPresence(){clearInterval(heartbeatTimer);heartbeat(true);heartbeatTimer=setInterval(()=>heartbeat(true),30000)}
db.auth.onAuthStateChange((event,session)=>{if(session)startPresence();else clearInterval(heartbeatTimer)});
document.addEventListener('visibilitychange',()=>{if(state.user)heartbeat(!document.hidden)});
window.addEventListener('pagehide',()=>{if(state.user)heartbeat(false)});

async function presenceRows(){if(!isAdmin())return[];const {data}=await db.from('user_presence').select('*').order('last_seen_at',{ascending:false}).limit(30);return data||[]}
function presenceHtml(rows){const now=Date.now(),online=rows.filter(x=>now-new Date(x.last_seen_at).getTime()<90000&&x.is_online!==false).length;return `<article class="v23-card"><div class="v23-card-head"><h3>User activity</h3><span class="v23-online-count">● ${online} live</span></div><div class="v23-presence">${rows.length?rows.map(u=>{const live=now-new Date(u.last_seen_at).getTime()<90000&&u.is_online!==false;return `<div class="v23-user ${live?'online':''}"><div class="v23-user-main"><span class="v23-user-dot"></span><div><b>${esc(u.display_name||u.email||'User')}</b><small>${esc(u.email||'')} · ${esc(u.role||'staff')}</small></div></div><div class="v23-user-status"><b>${live?'Live':'Offline'}</b><small>${live?esc(u.current_view||'active'):dateTime(u.last_seen_at)}</small></div></div>`}).join(''):'<div class="empty">No user activity recorded yet.</div>'}</div></article>`}

window.renderDashboard=async function(){
  try{await loadBills(true)}catch{}
  const rows=activeRows(),now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),yearStart=new Date(now.getFullYear(),0,1),nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1),nextYear=new Date(now.getFullYear()+1,0,1);
  const month=rows.filter(r=>{const d=D(dateVal(r));return d&&d>=monthStart&&d<nextMonth});
  const year=rows.filter(r=>{const d=D(dateVal(r));return d&&d>=yearStart&&d<nextYear});
  const sum=a=>a.reduce((s,r)=>s+amountVal(r),0),pending=rows.filter(r=>statusVal(r).toLowerCase()==='pending'),latest=[...rows].sort((a,b)=>(D(createdVal(b))?.getTime()||0)-(D(createdVal(a))?.getTime()||0)).slice(0,20),users=await presenceRows();
  $('#content').innerHTML=pageHead('Purchasing overview','Year, month and recent bill activity with live user status.','<button class="btn secondary" id="v23Refresh">↻ Refresh</button><button class="btn" data-go="new">＋ New Bill</button>')+`<section class="v23-metrics"><article class="v23-card v23-kpi"><small>This month total</small><strong>${money(sum(month))}</strong><span>${month.length} bills</span></article><article class="v23-card v23-kpi"><small>This year total</small><strong>${money(sum(year))}</strong><span>${year.length} bills</span></article><article class="v23-card v23-kpi"><small>All active bills</small><strong>${rows.length}</strong><span>${money(sum(rows))} total value</span></article><article class="v23-card v23-kpi"><small>Pending total</small><strong>${money(sum(pending))}</strong><span>${pending.length} pending bills</span></article><article class="v23-card v23-kpi"><small>Last entered</small><strong>${latest[0]?money(amountVal(latest[0])):'MVR 0.00'}</strong><span>${latest[0]?dateTime(createdVal(latest[0])):'No bills yet'}</span></article></section><section class="v23-grid"><article class="v23-card"><div class="v23-card-head"><h3>Last entered 20 bills</h3><button class="btn secondary small" data-go="bills">View bills</button></div><div class="table-wrap"><table class="v23-activity"><thead><tr><th>Entered</th><th>Bill date</th><th>Vendor</th><th>Bill no.</th><th>Status</th><th>Amount</th></tr></thead><tbody>${latest.map(r=>`<tr><td><div class="v23-created"><strong>${dateTime(createdVal(r))}</strong><small>${r.created_by?esc(r.created_by):'System user'}</small></div></td><td>${fmt(dateVal(r))}</td><td><strong>${esc(vendorVal(r)||'-')}</strong></td><td>${esc(get(r,'bill_no','Bill No')||'-')}</td><td><span class="pill ${statusVal(r).toLowerCase()}">${esc(statusVal(r))}</span></td><td><strong>${money(amountVal(r))}</strong></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">No bills yet.</div></td></tr>'}</tbody></table></div></article>${isAdmin()?presenceHtml(users):'<article class="v23-card"><div class="v23-card-head"><h3>Automatic updates</h3></div><div class="card-body"><p>Bill items automatically update Products and Price Book.</p><div class="v23-sync-note">Linked products update their current rate. New custom item names are automatically added as products and recorded in price history.</div></div></article>'}</section>`;
  bindGo();remember('dashboard');$('#v23Refresh').onclick=()=>renderDashboard();
};

const originalNew=window.renderNewBill;
if(typeof originalNew==='function')window.renderNewBill=async function(){await originalNew();remember('new');const form=document.querySelector('#phaseBillForm');if(form&&!form.querySelector('.v23-sync-note')){const note=document.createElement('div');note.className='v23-sync-note';note.textContent='Saving this bill will automatically update Products and Price Book from its item names, linked products and calculated base-unit rates.';form.prepend(note)}};

const originalShow=typeof show==='function'?show:null;
if(originalShow){window.show=function(view){remember(view);heartbeat(true);return originalShow(view)}}
})();