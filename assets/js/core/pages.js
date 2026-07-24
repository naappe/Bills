(()=>{
'use strict';
const VERSION=2;
const byId=id=>document.getElementById(id);
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const val=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const text=v=>String(v??'').trim();
const amount=row=>Number(window.amountVal?.(row)||0);
const vendor=row=>text(window.vendorVal?.(row));
const status=row=>text(window.statusVal?.(row)||'Pending');
const billNo=row=>text(val(row,'bill_no','Bill No'))||'-';
const addedAt=row=>val(row,'created_at');
const billDay=row=>{
  const raw=val(row,'bill_day','bill_date','Bill Date','date','Date');
  if(!raw)return'';
  const s=String(raw).slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const d=new Date(raw);
  return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const longDate=raw=>{
  if(!raw)return'-';
  const s=String(raw).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d=m?new Date(+m[1],+m[2]-1,+m[3]):new Date(raw);
  return Number.isNaN(d.getTime())?String(raw):d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
};
const dateTime=raw=>{
  if(!raw)return'-';
  const d=new Date(raw);
  return Number.isNaN(d.getTime())?'-':d.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
};
const localDay=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const range=preset=>{
  const now=new Date(),today=localDay(now);let start='',end='';
  if(preset==='today')start=end=today;
  if(preset==='week'){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));start=localDay(d);end=today}
  if(preset==='month'){start=`${today.slice(0,7)}-01`;end=today}
  if(preset==='lastmonth'){start=localDay(new Date(now.getFullYear(),now.getMonth()-1,1));end=localDay(new Date(now.getFullYear(),now.getMonth(),0))}
  if(preset==='year'){start=`${today.slice(0,4)}-01-01`;end=today}
  return{start,end};
};
const filterDate=(list,preset,from='',to='')=>{
  let{start,end}=range(preset);
  if(preset==='custom'){start=from;end=to}
  return list.filter(row=>{const day=billDay(row);return(!start||day>=start)&&(!end||day<=end)});
};
const kpi=(label,value,sub='',tone='blue')=>`<article class="kpi-card tone-${tone}"><div class="kpi-top"><div><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div></div>${sub?`<span class="kpi-badge">${esc(sub)}</span>`:''}</div></article>`;
const itemList=()=>{const out=[];rows().forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>out.push({bill,item})));return out};
const itemName=item=>text(val(item,'product','item_name','description','name','item'));
const itemRate=item=>Number(val(item,'rate','unit_rate','pack_rate')||0);
const itemQty=item=>Number(val(item,'qty','quantity')||0);
const getUsers=async()=>{
  const map=new Map();
  const{data}=await db.from('user_presence').select('user_id,email,display_name');
  (data||[]).forEach(u=>map.set(String(u.user_id),u.display_name||u.email||String(u.user_id).slice(0,8)));
  return map;
};
window.renderDashboard=()=>{
  const list=rows(),latest=[...list].sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||'')));
  const todayRows=filterDate(list,'today'),monthRows=filterDate(list,'month');
  const outstanding=list.filter(r=>status(r).toLowerCase()!=='paid').reduce((s,r)=>s+amount(r),0);
  const totals=new Map();list.forEach(r=>totals.set(vendor(r)||'Unknown',(totals.get(vendor(r)||'Unknown')||0)+amount(r)));
  const ranked=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,8),max=ranked[0]?.[1]||1;
  byId('content').innerHTML=pageHead('Dashboard','Live procurement performance',state.role!=='readonly'?'<button class="btn" data-go="new">New Bill</button>':'')+
  `<section class="kpi-grid">${kpi('Today bills',todayRows.length.toLocaleString(),'Today','blue')}${kpi('This month',money(monthRows.reduce((s,r)=>s+amount(r),0)),'Month','purple')}${kpi('Outstanding',money(outstanding),'Unpaid','orange')}${kpi('Last added',dateTime(addedAt(latest[0])),'Latest','green')}</section>`+
  `<section class="dashboard-layout"><article class="card"><div class="card-head"><strong>Latest added bills</strong><button class="btn secondary small" data-go="bills">View all</button></div><div class="table-wrap"><table><thead><tr><th>Added at</th><th>Bill date</th><th>Vendor</th><th>Bill no.</th><th>Amount</th></tr></thead><tbody>${latest.slice(0,20).map(r=>`<tr><td>${esc(dateTime(addedAt(r)))}</td><td>${esc(longDate(billDay(r)))}</td><td>${esc(vendor(r)||'-')}</td><td>${esc(billNo(r))}</td><td>${money(amount(r))}</td></tr>`).join('')}</tbody></table></div></article><article class="card kpi-rank"><div class="card-head"><strong>Top vendors</strong></div><div class="rank-list">${ranked.map(([name,total],i)=>`<div class="rank-item"><span class="rank-no">#${i+1}</span><span class="rank-name">${esc(name)}</span><div class="bar-track"><span class="bar-fill" style="width:${Math.max(4,total/max*100)}%"></span></div><strong>${money(total)}</strong></div>`).join('')||'<div class="empty">No vendor data</div>'}</div></article></section>`;
};
window.renderBills=async()=>{
  const list=rows(),users=await getUsers();state.filtered=[...list];state.page=1;
  byId('content').innerHTML=pageHead('Bills',`${list.length.toLocaleString()} active records`,`<button class="btn secondary" id="exportBills">Export CSV</button>${state.role!=='readonly'?'<button class="btn" data-go="new">New Bill</button>':''}`)+
  `<section class="kpi-grid" id="billMetrics"></section><section class="card"><div class="toolbar bills-toolbar"><input class="field" id="billSearch" placeholder="Search vendor or bill no."><select class="field" id="datePreset"><option value="all" selected>All dates</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="year">This year</option><option value="custom">Date range</option></select><select class="field" id="statusFilter"><option value="">All statuses</option>${[...new Set(list.map(status))].sort().map(s=>`<option>${esc(s)}</option>`).join('')}</select><select class="field" id="pageSize"><option>20</option><option>50</option><option>100</option></select><input class="field hidden" id="dateFrom" type="date"><input class="field hidden" id="dateTo" type="date"></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Added at</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Added by</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
  const render=()=>{
    const visible=state.filtered||[],size=Number(state.pageSize||20),pages=Math.max(1,Math.ceil(visible.length/size));
    state.page=Math.min(Math.max(1,state.page||1),pages);const start=(state.page-1)*size;
    const latest=[...visible].sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||'')))[0];
    const paid=visible.filter(r=>status(r).toLowerCase()==='paid').reduce((s,r)=>s+amount(r),0);
    byId('billMetrics').innerHTML=kpi('Visible bills',visible.length.toLocaleString(),'Filtered','blue')+kpi('Visible value',money(visible.reduce((s,r)=>s+amount(r),0)),'Total','purple')+kpi('Paid value',money(paid),'Paid','green')+kpi('Latest added',dateTime(addedAt(latest)),'Newest','orange');
    byId('billRows').innerHTML=visible.slice(start,start+size).map(r=>{const uid=String(val(r,'user_id','updated_by')||''),who=users.get(uid)||text(val(r,'created_by'))||'-';return`<tr><td><span class="pill">${esc(status(r))}</span></td><td>${esc(longDate(billDay(r)))}</td><td>${esc(dateTime(addedAt(r)))}</td><td>${esc(billNo(r))}</td><td>${esc(vendor(r)||'-')}</td><td>${money(amount(r))}</td><td>${esc(who)}</td><td><div class="actions">${state.role!=='readonly'?`<button class="btn secondary small" data-edit="${r.id}">Edit</button>`:''}${state.role==='admin'?`<button class="btn danger small" data-delete="${r.id}">Delete</button>`:''}</div></td></tr>`}).join('')||'<tr><td colspan="8"><div class="empty">No bills found.</div></td></tr>';
    byId('billRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{state.editing=list.find(r=>String(r.id)===b.dataset.edit)||null;show('new')});
    byId('billRows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this bill?'))return;b.disabled=true;const{error}=await db.from(TABLE).delete().eq('id',b.dataset.delete);if(error){alert(error.message);b.disabled=false;return}await reloadBillsNow()});
    byId('pager').innerHTML=`<span>${visible.length?start+1:0}-${Math.min(start+size,visible.length)} of ${visible.length}</span><div class="actions"><button class="btn secondary small" id="prev" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="next" ${state.page>=pages?'disabled':''}>Next</button></div>`;
    byId('prev').onclick=()=>{state.page--;render()};byId('next').onclick=()=>{state.page++;render()};
  };
  const apply=()=>{const q=text(byId('billSearch').value).toLowerCase(),preset=byId('datePreset').value,s=text(byId('statusFilter').value).toLowerCase();state.filtered=filterDate(list,preset,byId('dateFrom').value,byId('dateTo').value).filter(r=>(!q||`${vendor(r)} ${billNo(r)}`.toLowerCase().includes(q))&&(!s||status(r).toLowerCase()===s)).sort((a,b)=>String(addedAt(b)||'').localeCompare(String(addedAt(a)||'')));state.page=1;render()};
  byId('datePreset').onchange=()=>{const custom=byId('datePreset').value==='custom';byId('dateFrom').classList.toggle('hidden',!custom);byId('dateTo').classList.toggle('hidden',!custom);apply()};
  ['billSearch','dateFrom','dateTo'].forEach(id=>byId(id).oninput=apply);byId('statusFilter').onchange=apply;byId('pageSize').value=String(state.pageSize||20);byId('pageSize').onchange=e=>{state.pageSize=Number(e.target.value)||20;render()};byId('exportBills').onclick=window.exportCsv;apply();
};
const originalNew=window.renderNewBill;
window.renderNewBill=async()=>{await originalNew?.();if(!state.editing&&Array.isArray(state.items)&&state.items.length>1){const buttons=[...document.querySelectorAll('#itemRows [data-remove]')];for(let i=buttons.length-1;i>0;i--)buttons[i]?.click()}};
window.renderProducts=()=>{const map=new Map();itemList().forEach(({bill,item})=>{const name=itemName(item);if(!name)return;const key=name.toLowerCase(),p=map.get(key)||{name,qty:0,total:0,rate:0,vendor:'',date:'',added:''};p.qty+=itemQty(item);p.total+=Number(val(item,'line_total','amount')||itemQty(item)*itemRate(item));if(!p.added||String(addedAt(bill))>String(p.added)){p.rate=itemRate(item);p.vendor=vendor(bill);p.date=billDay(bill);p.added=addedAt(bill)}map.set(key,p)});const list=[...map.values()].sort((a,b)=>String(b.added).localeCompare(String(a.added)));byId('content').innerHTML=pageHead('Products',`${list.length.toLocaleString()} products from bill items`)+`<section class="kpi-grid">${kpi('Products',list.length.toLocaleString(),'Tracked','blue')}${kpi('With rates',list.filter(p=>p.rate>0).length.toLocaleString(),'Priced','green')}${kpi('Purchase value',money(list.reduce((s,p)=>s+p.total,0)),'All time','purple')}${kpi('Latest added',dateTime(list[0]?.added),'Newest','orange')}</section><section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Latest rate</th><th>Vendor</th><th>Bill date</th><th>Added at</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${p.qty.toLocaleString()}</td><td>${money(p.rate)}</td><td>${esc(p.vendor||'-')}</td><td>${esc(longDate(p.date))}</td><td>${esc(dateTime(p.added))}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderVendors=async()=>{const{data=[]}=await db.from('vendors').select('id,name,tin,phone,email,address,is_active,created_at').is('deleted_at',null).order('created_at',{ascending:false});byId('content').innerHTML=pageHead('Vendors',`${data.length.toLocaleString()} vendor profiles`)+`<section class="kpi-grid">${kpi('Active vendors',data.filter(v=>v.is_active!==false).length.toLocaleString(),'Active','blue')}${kpi('Complete profiles',data.filter(v=>v.tin&&v.phone).length.toLocaleString(),'TIN + phone','green')}${kpi('Profiles',data.length.toLocaleString(),'Total','purple')}${kpi('Latest vendor',dateTime(data[0]?.created_at),'Added','orange')}</section><section class="card"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Phone</th><th>Email</th><th>Added</th></tr></thead><tbody>${data.map(v=>`<tr><td><strong>${esc(v.name)}</strong></td><td>${esc(v.tin||'-')}</td><td>${esc(v.phone||'-')}</td><td>${esc(v.email||'-')}</td><td>${esc(dateTime(v.created_at))}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderPrices=()=>{const list=itemList().map(({bill,item})=>({name:itemName(item)||'-',rate:itemRate(item),vendor:vendor(bill),date:billDay(bill),added:addedAt(bill)})).sort((a,b)=>String(b.added).localeCompare(String(a.added)));byId('content').innerHTML=pageHead('Price Book',`${list.length.toLocaleString()} rates`)+`<section class="kpi-grid">${kpi('Price records',list.length.toLocaleString(),'Tracked','blue')}${kpi('Products',new Set(list.map(x=>x.name.toLowerCase())).size.toLocaleString(),'Unique','green')}${kpi('Vendors',new Set(list.map(x=>x.vendor.toLowerCase()).filter(Boolean)).size.toLocaleString(),'Sources','purple')}${kpi('Average rate',money(list.length?list.reduce((s,x)=>s+x.rate,0)/list.length:0),'Pack rate','orange')}</section><section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Rate</th><th>Vendor</th><th>Bill date</th><th>Added at</th></tr></thead><tbody>${list.slice(0,500).map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${money(x.rate)}</td><td>${esc(x.vendor||'-')}</td><td>${esc(longDate(x.date))}</td><td>${esc(dateTime(x.added))}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderReports=()=>{const list=rows(),now=new Date(),year=String(now.getFullYear()),month=`${year}-${String(now.getMonth()+1).padStart(2,'0')}`,yearRows=list.filter(r=>billDay(r).startsWith(year)),monthRows=list.filter(r=>billDay(r).startsWith(month)),paid=list.filter(r=>status(r).toLowerCase()==='paid').reduce((s,r)=>s+amount(r),0);byId('content').innerHTML=pageHead('Reports','Procurement performance')+`<section class="kpi-grid">${kpi('This year',money(yearRows.reduce((s,r)=>s+amount(r),0)),'Year','blue')}${kpi('This month',money(monthRows.reduce((s,r)=>s+amount(r),0)),'Month','purple')}${kpi('Paid value',money(paid),'Paid','green')}${kpi('Outstanding',money(list.reduce((s,r)=>s+amount(r),0)-paid),'Due','orange')}</section>`};
window.renderSettings=()=>{const latest=[...rows()].sort((a,b)=>String(addedAt(b)).localeCompare(String(addedAt(a)))[0];byId('content').innerHTML=pageHead('Settings','Application and account status')+`<section class="kpi-grid">${kpi('Role',esc(state.role),'Access','blue')}${kpi('Active records',rows().length.toLocaleString(),'Bills','green')}${kpi('Database',esc(window.__WS_DB_STATUS__?.status||'Unknown'),'Connection','purple')}${kpi('Last data added',dateTime(addedAt(latest)),'Latest','orange')}</section>`};
Object.assign(window.__WS_RENDERERS__,{dashboard:window.renderDashboard,bills:window.renderBills,new:window.renderNewBill,products:window.renderProducts,vendors:window.renderVendors,prices:window.renderPrices,reports:window.renderReports,settings:window.renderSettings});
window.__WS_PAGES__={version:VERSION};
})();