(()=>{
'use strict';
const VERSION=1;
const byId=id=>document.getElementById(id);
const moneyValue=v=>money(Number(v||0));
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const dateOf=row=>String(window.dateVal?.(row)||'').slice(0,10);
const amountOf=row=>Number(window.amountVal?.(row)||0);
const vendorOf=row=>String(window.vendorVal?.(row)||'').trim();
const statusOf=row=>String(window.statusVal?.(row)||'Pending');
const adminId='5c0d47f8-68c1-4a60-a1b8-c80885c385da';

const isAdmin=()=>state.role==='admin'||state.user?.id===adminId;
const setAdminNav=()=>{
 const link=document.querySelector('.nav [data-view="admin"]');
 if(link)link.classList.toggle('hidden',!isAdmin());
};

const syncRole=async()=>{
 if(!state.user)return;
 if(state.user.id===adminId){state.role='admin';setAdminNav();return;}
 const {data}=await db.from('user_roles').select('role,is_active,display_name').eq('user_id',state.user.id).maybeSingle();
 if(data){state.role=data.is_active===false?'readonly':(data.role||'staff');const label=byId('roleLabel');if(label)label.textContent=state.role.toUpperCase();}
 setAdminNav();
};

const updatePresence=async(view=state.view)=>{
 if(!state.user)return;
 await db.from('user_presence').upsert({user_id:state.user.id,email:state.user.email,display_name:state.user.user_metadata?.display_name||state.user.email?.split('@')[0],role:state.role,current_view:view,is_online:true,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
 await db.from('user_roles').update({last_active_at:new Date().toISOString()}).eq('user_id',state.user.id);
};

const appendSection=html=>{const content=byId('content');if(content)content.insertAdjacentHTML('beforeend',html)};
const topVendors=()=>{
 const map=new Map();rows().forEach(r=>{const name=vendorOf(r)||'Unknown';map.set(name,(map.get(name)||0)+amountOf(r))});
 return [...map].sort((a,b)=>b[1]-a[1]).slice(0,5);
};
const latestBills=()=>[...rows()].sort((a,b)=>String(b.created_at||dateOf(b)).localeCompare(String(a.created_at||dateOf(a)))).slice(0,8);

const originalDashboard=window.renderDashboard;
window.renderDashboard=()=>{
 originalDashboard?.();
 const vendors=topVendors(),latest=latestBills(),paid=rows().filter(r=>statusOf(r).toLowerCase()==='paid').reduce((s,r)=>s+amountOf(r),0),pending=rows().filter(r=>statusOf(r).toLowerCase()!=='paid').reduce((s,r)=>s+amountOf(r),0);
 appendSection(`<section class="metrics"><article class="metric"><small>Paid value</small><strong>${moneyValue(paid)}</strong></article><article class="metric"><small>Outstanding value</small><strong>${moneyValue(pending)}</strong></article><article class="metric"><small>Latest entry</small><strong>${latest[0]?esc(dateOf(latest[0])):'-'}</strong></article><article class="metric"><small>Active page</small><strong>Dashboard</strong></article></section><section class="card"><div class="page-head"><div><h2>Top vendors</h2></div></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Purchase value</th></tr></thead><tbody>${vendors.map(v=>`<tr><td>${esc(v[0])}</td><td>${moneyValue(v[1])}</td></tr>`).join('')||'<tr><td colspan="2">No data</td></tr>'}</tbody></table></div></section>`);
};

const originalProducts=window.renderProducts;
window.renderProducts=async()=>{
 const {data=[]}=await db.from('products').select('id,name,sku,current_rate,is_active,created_at,updated_at').is('deleted_at',null).order('updated_at',{ascending:false});
 const active=data.filter(p=>p.is_active!==false),latest=data.slice(0,10),priced=data.filter(p=>Number(p.current_rate)>0);
 byId('content').innerHTML=pageHead('Products',`${data.length} products`)+`<section class="metrics"><article class="metric"><small>Active products</small><strong>${active.length}</strong></article><article class="metric"><small>With current rate</small><strong>${priced.length}</strong></article><article class="metric"><small>Missing rate</small><strong>${data.length-priced.length}</strong></article><article class="metric"><small>Latest update</small><strong>${latest[0]?.updated_at?.slice(0,10)||'-'}</strong></article></section><section class="card"><div class="page-head"><div><h2>Latest products</h2></div></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Current rate</th><th>Status</th><th>Updated</th></tr></thead><tbody>${latest.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.sku||'-')}</td><td>${moneyValue(p.current_rate)}</td><td>${p.is_active===false?'Inactive':'Active'}</td><td>${esc(String(p.updated_at||'').slice(0,10))}</td></tr>`).join('')||'<tr><td colspan="5">No products</td></tr>'}</tbody></table></div></section>`;
};

const originalVendors=window.renderVendors;
window.renderVendors=async()=>{
 await originalVendors?.();
 const {data=[]}=await db.from('vendors').select('id,name,tin,phone,email,is_active,created_at,updated_at').is('deleted_at',null).order('created_at',{ascending:false}).limit(10);
 const complete=data.filter(v=>v.tin&&v.phone).length;
 const content=byId('content');const first=content?.querySelector('.page-head');if(first)first.insertAdjacentHTML('afterend',`<section class="metrics"><article class="metric"><small>Latest added</small><strong>${data[0]?.created_at?.slice(0,10)||'-'}</strong></article><article class="metric"><small>Complete profiles</small><strong>${complete}</strong></article><article class="metric"><small>Need details</small><strong>${data.length-complete}</strong></article><article class="metric"><small>Active vendors</small><strong>${data.filter(v=>v.is_active!==false).length}</strong></article></section>`);
};

const originalPrices=window.renderPrices;
window.renderPrices=async()=>{
 await originalPrices?.();
 const {data=[]}=await db.from('price_history').select('price,effective_date,created_at').is('deleted_at',null).order('created_at',{ascending:false}).limit(100);
 const avg=data.length?data.reduce((s,p)=>s+Number(p.price||0),0)/data.length:0;
 const content=byId('content');const first=content?.querySelector('.page-head');if(first)first.insertAdjacentHTML('afterend',`<section class="metrics"><article class="metric"><small>Recorded prices</small><strong>${data.length}</strong></article><article class="metric"><small>Average rate</small><strong>${moneyValue(avg)}</strong></article><article class="metric"><small>Latest price date</small><strong>${data[0]?.effective_date||'-'}</strong></article><article class="metric"><small>Source</small><strong>Price history</strong></article></section>`);
};

const originalReports=window.renderReports;
window.renderReports=()=>{
 originalReports?.();
 const latest=latestBills();
 appendSection(`<section class="card"><div class="page-head"><div><h2>Latest activity</h2></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Vendor</th><th>Status</th><th>Amount</th></tr></thead><tbody>${latest.map(r=>`<tr><td>${esc(dateOf(r)||'-')}</td><td>${esc(vendorOf(r)||'-')}</td><td>${esc(statusOf(r))}</td><td>${moneyValue(amountOf(r))}</td></tr>`).join('')}</tbody></table></div></section>`);
};

window.renderAdmin=async()=>{
 if(!isAdmin()){byId('content').innerHTML=pageHead('Admin','Admin access required');return;}
 byId('content').innerHTML=pageHead('Admin','Users, roles and live activity')+'<section class="card"><div class="empty">Loading users…</div></section>';
 const {data,error}=await db.rpc('admin_user_overview');
 if(error){byId('content').innerHTML=pageHead('Admin','Unable to load users')+`<section class="card"><div class="empty">${esc(error.message)}</div></section>`;return;}
 const users=Array.isArray(data)?data:[],online=users.filter(u=>u.is_online&&u.last_seen_at&&Date.now()-new Date(u.last_seen_at).getTime()<10*60*1000).length;
 byId('content').innerHTML=pageHead('Admin','Users, roles and live activity')+`<section class="metrics"><article class="metric"><small>Total users</small><strong>${users.length}</strong></article><article class="metric"><small>Online now</small><strong>${online}</strong></article><article class="metric"><small>Admins</small><strong>${users.filter(u=>u.role==='admin').length}</strong></article><article class="metric"><small>Disabled</small><strong>${users.filter(u=>u.is_active===false).length}</strong></article></section><section class="card"><div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Current page</th><th>Last seen</th><th>Action</th></tr></thead><tbody>${users.map(u=>`<tr data-user="${u.user_id}"><td><strong>${esc(u.display_name||u.email)}</strong><div class="muted">${esc(u.email||'')}</div></td><td><select class="field" data-role>${['admin','manager','staff','readonly'].map(r=>`<option ${r===u.role?'selected':''}>${r}</option>`).join('')}</select></td><td><select class="field" data-active><option value="true" ${u.is_active!==false?'selected':''}>Active</option><option value="false" ${u.is_active===false?'selected':''}>Disabled</option></select></td><td>${esc(u.current_view||'-')}</td><td>${esc(u.last_seen_at?new Date(u.last_seen_at).toLocaleString('en-US'):'-')}</td><td><button class="btn small" data-save-user>Save</button></td></tr>`).join('')}</tbody></table></div></section>`;
 byId('content').querySelectorAll('[data-save-user]').forEach(btn=>btn.onclick=async()=>{const row=btn.closest('[data-user]');btn.disabled=true;const {error}=await db.rpc('admin_update_user_role',{target_user:row.dataset.user,new_role:row.querySelector('[data-role]').value,new_active:row.querySelector('[data-active]').value==='true',new_display_name:null});btn.disabled=false;if(error){alert(error.message);return}btn.textContent='Saved';setTimeout(()=>btn.textContent='Save',1200)});
};

window.__WS_RENDERERS__.admin=window.renderAdmin;
const originalShow=window.show;
window.show=view=>{const result=originalShow(view);setAdminNav();updatePresence(view);return result;};

setInterval(()=>updatePresence(state.view),60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updatePresence(state.view)});
setTimeout(async()=>{await syncRole();await updatePresence(state.view);if(location.hash==='#admin'&&isAdmin())window.show('admin')},800);
window.__WS_ADMIN__={version:VERSION,syncRole,updatePresence};
})();