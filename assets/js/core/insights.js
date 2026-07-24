(()=>{
'use strict';
const VERSION=1;
const byId=id=>document.getElementById(id);
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const text=v=>String(v??'').trim();
const amount=row=>Number(window.amountVal?.(row)||0);
const vendor=row=>text(window.vendorVal?.(row));
const status=row=>text(window.statusVal?.(row)||'Pending');
const billNo=row=>text(value(row,'bill_no','Bill No'))||'-';
const billDate=row=>{
 const raw=value(row,'bill_day','bill_date','Bill Date','date','Date');
 if(!raw)return'';
 const s=String(raw).slice(0,10);
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const d=new Date(raw);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const addedAt=row=>value(row,'created_at');
const updatedAt=row=>value(row,'updated_at','created_at');
const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const formatDate=raw=>{if(!raw)return'-';const d=new Date(raw);return Number.isNaN(d.getTime())?String(raw).slice(0,10):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})};
const formatDateTime=raw=>{if(!raw)return'-';const d=new Date(raw);return Number.isNaN(d.getTime())?'-':d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})};
const startOfWeek=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return localDay(d)};
const rangeFor=preset=>{
 const now=new Date(),day=localDay(now);let start='',end='';
 if(preset==='today')start=end=day;
 if(preset==='week'){start=startOfWeek();end=day}
 if(preset==='month'){start=`${day.slice(0,7)}-01`;end=day}
 if(preset==='lastmonth'){const first=new Date(now.getFullYear(),now.getMonth()-1,1),last=new Date(now.getFullYear(),now.getMonth(),0);start=localDay(first);end=localDay(last)}
 if(preset==='year'){start=`${day.slice(0,4)}-01-01`;end=day}
 return{start,end};
};
const filterByBillDate=(list,preset,from,to)=>{let{start,end}=rangeFor(preset);if(preset==='custom'){start=from;end=to}return list.filter(row=>{const date=billDate(row);return(!start||date>=start)&&(!end||date<=end)})};
const userLabel=(row,userMap)=>{
 const id=value(row,'user_id','updated_by');
 if(id&&userMap.has(String(id)))return userMap.get(String(id));
 return text(value(row,'created_by'))||'-';
};
const getUsers=async()=>{const map=new Map();const{data}=await db.from('user_presence').select('user_id,email,display_name');(data||[]).forEach(user=>map.set(String(user.user_id),user.display_name||user.email||String(user.user_id).slice(0,8)));return map};
const metric=(label,value)=>`<article class="metric"><small>${esc(label)}</small><strong>${value}</strong></article>`;

window.renderDashboard=async()=>{
 const list=rows(),latest=[...list].sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||'')),todayRows=filterByBillDate(list,'today'),monthRows=filterByBillDate(list,'month');
 const outstanding=list.filter(row=>status(row).toLowerCase()!=='paid').reduce((sum,row)=>sum+amount(row),0);
 const vendors=new Map();list.forEach(row=>vendors.set(vendor(row)||'Unknown',(vendors.get(vendor(row)||'Unknown')||0)+amount(row)));
 const top=[...vendors].sort((a,b)=>b[1]-a[1]).slice(0,5);
 byId('content').innerHTML=pageHead('Dashboard','',state.role!=='readonly'?'<button class="btn" data-go="new">New Bill</button>':'')+
 `<section class="metrics">${metric('Today bills',todayRows.length.toLocaleString())}${metric('This month',money(monthRows.reduce((s,r)=>s+amount(r),0)))}${metric('Outstanding',money(outstanding))}${metric('Last added',esc(formatDateTime(addedAt(latest[0]))))}</section>`+
 `<section class="grid-2"><article class="card"><div class="card-head"><strong>Latest added bills</strong><button class="btn secondary small" data-go="bills">View all</button></div><div class="table-wrap"><table><thead><tr><th>Added at</th><th>Bill date</th><th>Vendor</th><th>Bill no.</th><th>Amount</th></tr></thead><tbody>${latest.slice(0,20).map(row=>`<tr><td>${esc(formatDateTime(addedAt(row)))}</td><td>${esc(formatDate(billDate(row)))}</td><td>${esc(vendor(row)||'-')}</td><td>${esc(billNo(row))}</td><td>${money(amount(row))}</td></tr>`).join('')}</tbody></table></div></article><article class="card"><div class="card-head"><strong>Top vendors</strong></div><div class="card-body rank">${top.map(([name,total],i)=>`<div class="rank-row"><div><b>${i+1}. ${esc(name)}</b></div><strong>${money(total)}</strong></div>`).join('')||'<div class="empty">No data</div>'}</div></article></section>`;
};

window.renderBills=async()=>{
 const list=rows(),userMap=await getUsers();state.filtered=[...list];state.page=1;
 byId('content').innerHTML=pageHead('Bills',`${list.length.toLocaleString()} total records`,`<button class="btn secondary" id="exportBills">Export CSV</button>${state.role!=='readonly'?'<button class="btn" data-go="new">New Bill</button>':''}`)+
 `<section class="metrics" id="billMetrics"></section><section class="card"><div class="toolbar" style="grid-template-columns:minmax(220px,1fr) 170px 160px 120px"><input class="field" id="billSearch" placeholder="Search vendor or bill no."><select class="field" id="datePreset"><option value="all" selected>All dates</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="year">This year</option><option value="custom">Date range</option></select><select class="field" id="statusFilter"><option value="">All statuses</option>${[...new Set(list.map(status))].sort().map(s=>`<option>${esc(s)}</option>`).join('')}</select><select class="field" id="pageSize"><option>20</option><option>50</option><option>100</option></select><input class="field hidden" id="dateFrom" type="date"><input class="field hidden" id="dateTo" type="date"></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Added at</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Added by</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
 const render=()=>{
  const visible=state.filtered||[],size=Number(state.pageSize||20),pages=Math.max(1,Math.ceil(visible.length/size));state.page=Math.min(Math.max(1,state.page||1),pages);const start=(state.page-1)*size,latest=[...visible].sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||''))[0];
  byId('billMetrics').innerHTML=metric('Visible bills',visible.length.toLocaleString())+metric('Visible value',money(visible.reduce((s,r)=>s+amount(r),0)))+metric('Latest bill date',esc(formatDate(billDate(latest))))+metric('Latest added',esc(formatDateTime(addedAt(latest))));
  byId('billRows').innerHTML=visible.slice(start,start+size).map(row=>`<tr><td><span class="pill ${status(row).toLowerCase().replace(/\s+/g,'-')}">${esc(status(row))}</span></td><td>${esc(formatDate(billDate(row)))}</td><td>${esc(formatDateTime(addedAt(row)))}</td><td>${esc(billNo(row))}</td><td>${esc(vendor(row)||'-')}</td><td>${money(amount(row))}</td><td>${esc(userLabel(row,userMap))}</td><td><div class="actions">${window.__WS_APP_CONTROLLER__&&(['admin','manager'].includes(state.role)||state.role==='staff')?`<button class="btn secondary small" data-edit="${row.id}">Edit</button>`:''}${state.role==='admin'?`<button class="btn danger small" data-delete="${row.id}">Delete</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">No bills found.</div></td></tr>';
  byId('billRows').querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{state.editing=list.find(row=>String(row.id)===button.dataset.edit)||null;show('new')});
  byId('billRows').querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{if(!confirm('Delete this bill permanently?'))return;button.disabled=true;const{error}=await db.from(TABLE).delete().eq('id',button.dataset.delete);if(error){alert(error.message);button.disabled=false;return}await reloadBillsNow()});
  byId('pager').innerHTML=`<span>${visible.length?start+1:0}-${Math.min(start+size,visible.length)} of ${visible.length}</span><div class="actions"><button class="btn secondary small" id="prev" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="next" ${state.page>=pages?'disabled':''}>Next</button></div>`;
  byId('prev').onclick=()=>{state.page--;render()};byId('next').onclick=()=>{state.page++;render()};
 };
 const apply=()=>{const q=text(byId('billSearch').value).toLowerCase(),preset=byId('datePreset').value,s=text(byId('statusFilter').value).toLowerCase();state.filtered=filterByBillDate(list,preset,byId('dateFrom').value,byId('dateTo').value).filter(row=>(!q||`${vendor(row)} ${billNo(row)}`.toLowerCase().includes(q))&&(!s||status(row).toLowerCase()===s)).sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||'')));state.page=1;render()};
 byId('datePreset').onchange=()=>{const custom=byId('datePreset').value==='custom';byId('dateFrom').classList.toggle('hidden',!custom);byId('dateTo').classList.toggle('hidden',!custom);apply()};
 ['billSearch','dateFrom','dateTo'].forEach(id=>byId(id).oninput=apply);byId('statusFilter').onchange=apply;byId('pageSize').value=String(state.pageSize||20);byId('pageSize').onchange=e=>{state.pageSize=Number(e.target.value)||20;render()};byId('exportBills').onclick=window.exportCsv;apply();
};

const originalProducts=window.renderProducts;
window.renderProducts=()=>{originalProducts?.();const content=byId('content'),table=content?.querySelector('table');if(table&&!table.querySelector('th[data-added]')){table.querySelector('thead tr')?.insertAdjacentHTML('beforeend','<th data-added>Source</th>');table.querySelectorAll('tbody tr').forEach(row=>row.insertAdjacentHTML('beforeend','<td>Bill items</td>'))}};

const originalReports=window.renderReports;
window.renderReports=()=>{originalReports?.();const latest=[...rows()].sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||''))).slice(0,10);byId('content')?.insertAdjacentHTML('beforeend',`<section class="card polished-card"><div class="card-head"><strong>Latest additions</strong></div><div class="table-wrap"><table><thead><tr><th>Added at</th><th>Bill date</th><th>Vendor</th><th>Bill no.</th><th>Amount</th></tr></thead><tbody>${latest.map(row=>`<tr><td>${esc(formatDateTime(addedAt(row)))}</td><td>${esc(formatDate(billDate(row)))}</td><td>${esc(vendor(row)||'-')}</td><td>${esc(billNo(row))}</td><td>${money(amount(row))}</td></tr>`).join('')}</tbody></table></div></section>`)};

window.__WS_RENDERERS__.dashboard=window.renderDashboard;
window.__WS_RENDERERS__.bills=window.renderBills;
window.__WS_RENDERERS__.products=window.renderProducts;
window.__WS_RENDERERS__.reports=window.renderReports;
window.__WS_INSIGHTS__={version:VERSION,localDay,formatDate,formatDateTime};
})();