(()=>{
'use strict';
const VIEW_KEY='ws-current-view';
const VALID=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const isAdmin=()=>String(state.role||'').toLowerCase()==='admin'||ADMIN_IDS.includes(state.user?.id);
const currentTarget=()=>{const hash=location.hash.replace('#','');if(VALID.has(hash))return hash;const saved=localStorage.getItem(VIEW_KEY);return VALID.has(saved)?saved:'dashboard'};
function remember(view){if(!VALID.has(view))return;localStorage.setItem(VIEW_KEY,view);if(location.hash!==`#${view}`)history.replaceState(null,'',`${location.pathname}${location.search}#${view}`)}
function restore(force=false){const target=currentTarget();if(!state.user||typeof show!=='function')return false;if(force||state.view!==target){show(target)}remember(target);return true}

document.addEventListener('click',e=>{const t=e.target.closest('[data-view],[data-go]');const v=t?.dataset.view||t?.dataset.go;if(VALID.has(v))remember(v)},true);
window.addEventListener('beforeunload',()=>remember(state.view||currentTarget()));
window.addEventListener('hashchange',()=>restore(true));

const oldShow=typeof show==='function'?show:null;
if(oldShow){window.show=function(view){if(VALID.has(view))remember(view);return oldShow(view)}}

function scheduleRestore(){[80,250,600,1200,2200].forEach(ms=>setTimeout(()=>restore(true),ms))}
db.auth.onAuthStateChange((event,session)=>{if(session)scheduleRestore()});
window.addEventListener('load',scheduleRestore);

async function getPresence(){if(!isAdmin())return[];const {data,error}=await db.from('user_presence').select('*').order('last_seen_at',{ascending:false}).limit(100);if(error){console.warn('Presence load failed',error.message);return[]}return data||[]}
function dt(v){const d=new Date(v);return Number.isNaN(d.getTime())?'-':d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function presencePanel(rows){const now=Date.now(),live=u=>now-new Date(u.last_seen_at).getTime()<90000&&u.is_online!==false;const count=rows.filter(live).length;return `<section class="ux-card v27-admin-activity"><div class="ux-card-head"><div><h3>User activity</h3><span>Live users and last active status</span></div><span class="v23-online-count">● ${count} live</span></div><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Current page</th><th>Last active</th></tr></thead><tbody>${rows.map(u=>`<tr><td><strong>${esc(u.display_name||u.email||'User')}</strong><div class="muted">${esc(u.email||'')}</div></td><td>${esc(u.role||'staff')}</td><td><span class="pill ${live(u)?'paid':'cancelled'}">${live(u)?'Live':'Offline'}</span></td><td>${esc(u.current_view||'-')}</td><td>${dt(u.last_seen_at)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No user activity recorded yet.</div></td></tr>'}</tbody></table></div></section>`}

const oldDashboard=window.renderDashboard;
if(typeof oldDashboard==='function')window.renderDashboard=async function(){await oldDashboard();document.querySelectorAll('.v23-card').forEach(card=>{if(card.querySelector('h3')?.textContent.trim()==='User activity')card.remove()})};

const oldSettings=window.renderSettings;
if(typeof oldSettings==='function')window.renderSettings=async function(){await oldSettings();remember('settings');if(!isAdmin())return;const rows=await getPresence();const content=document.querySelector('#content');if(content&&!content.querySelector('.v27-admin-activity'))content.insertAdjacentHTML('beforeend',presencePanel(rows))};
})();