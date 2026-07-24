(()=>{
'use strict';
const VERSION=1;
const byId=id=>document.getElementById(id);
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const text=v=>String(v??'').trim();
const amount=row=>Number(window.amountVal?.(row)||0);
const vendor=row=>text(window.vendorVal?.(row));
const billDate=row=>String(window.dateVal?.(row)||'').slice(0,10);
const addedAt=row=>value(row,'created_at');
const fmtDate=raw=>window.__WS_INSIGHTS__?.formatDate?.(raw)||String(raw||'-').slice(0,10);
const fmtDateTime=raw=>window.__WS_INSIGHTS__?.formatDateTime?.(raw)||String(raw||'-');
const metric=(label,val)=>`<article class="metric"><small>${esc(label)}</small><strong>${val}</strong></article>`;
const itemList=()=>{const out=[];rows().forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>out.push({bill,item})));return out};
const itemName=item=>text(value(item,'product','item_name','description','name','item'));
const itemRate=item=>Number(value(item,'rate','unit_rate','pack_rate')||0);
const itemQty=item=>Number(value(item,'qty','quantity')||0);

const originalNew=window.renderNewBill;
window.renderNewBill=async()=>{
 await originalNew?.();
 const content=byId('content'),head=content?.querySelector('.page-head');if(!content||!head)return;
 const form=byId('billForm');if(!form)return;
 const panel=document.createElement('section');panel.className='metrics';panel.id='newBillMetrics';head.insertAdjacentElement('afterend',panel);
 const update=()=>{
  const items=Array.isArray(state.items)?state.items:[];
  const subtotal=items.reduce((sum,item)=>sum+(Number(item.qty||0)*Number(item.rate||0)),0);
  const gst=items.reduce((sum,item)=>sum+(Number(item.qty||0)*Number(item.rate||0)*Number(item.gst||0)/100),0);
  panel.innerHTML=metric('Item rows',items.length.toLocaleString())+metric('Subtotal',money(subtotal))+metric('GST',money(gst))+metric('Draft total',money(subtotal+gst));
 };
 update();
 form.addEventListener('input',()=>requestAnimationFrame(update));
 byId('addRow')?.addEventListener('click',()=>requestAnimationFrame(update));
 byId('itemRows')?.addEventListener('click',event=>{if(event.target.closest('[data-remove]'))requestAnimationFrame(update)});
};

window.renderProducts=()=>{
 const map=new Map();
 itemList().forEach(({bill,item})=>{const name=itemName(item);if(!name)return;const key=name.toLowerCase(),date=billDate(bill),added=addedAt(bill),current=map.get(key)||{name,packing:'',unit:'',qty:0,total:0,rate:0,vendor:'',bill:'-',date:'',added:''};current.qty+=itemQty(item);current.total+=Number(value(item,'line_total','amount')||itemQty(item)*itemRate(item));if(!current.added||String(added)>String(current.added)){current.packing=text(value(item,'pack_format','packing'));current.unit=text(value(item,'unit','purchase_unit'));current.rate=itemRate(item);current.vendor=vendor(bill);current.bill=text(value(bill,'bill_no','Bill No'))||'-';current.date=date;current.added=added}map.set(key,current)});
 const list=[...map.values()].sort((a,b)=>String(b.added).localeCompare(String(a.added))),withRate=list.filter(p=>p.rate>0),totalValue=list.reduce((s,p)=>s+p.total,0);
 byId('content').innerHTML=pageHead('Products',`${list.length.toLocaleString()} products from bill items`)+`<section class="metrics">${metric('Products',list.length.toLocaleString())}${metric('With rates',withRate.length.toLocaleString())}${metric('Purchase value',money(totalValue))}${metric('Latest added',esc(fmtDateTime(list[0]?.added)))}</section><section class="card"><div class="card-head"><strong>Product purchasing activity</strong></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Packing</th><th>Unit</th><th>Total quantity</th><th>Latest rate</th><th>Vendor</th><th>Bill</th><th>Bill date</th><th>Added at</th></tr></thead><tbody>${list.slice(0,300).map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.packing||'-')}</td><td>${esc(p.unit||'-')}</td><td>${p.qty.toLocaleString()}</td><td>${money(p.rate)}</td><td>${esc(p.vendor||'-')}</td><td>${esc(p.bill)}</td><td>${esc(fmtDate(p.date))}</td><td>${esc(fmtDateTime(p.added))}</td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">No product activity found.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderVendors=async()=>{
 const {data:profiles=[],error}=await db.from('vendors').select('id,name,tin,phone,email,address,is_active,created_at,updated_at').is('deleted_at',null).order('created_at',{ascending:false});
 const totals=new Map();rows().forEach(bill=>{const name=vendor(bill);if(!name)return;const key=name.toLowerCase(),current=totals.get(key)||{bills:0,total:0,latestAdded:'',latestDate:'',latestBill:'-'};current.bills++;current.total+=amount(bill);if(!current.latestAdded||String(addedAt(bill))>String(current.latestAdded)){current.latestAdded=addedAt(bill);current.latestDate=billDate(bill);current.latestBill=text(value(bill,'bill_no','Bill No'))||'-'}totals.set(key,current)});
 const list=(error?[]:profiles).map(profile=>({...profile,summary:totals.get(text(profile.name).toLowerCase())||{bills:0,total:0,latestAdded:'',latestDate:'',latestBill:'-'}}));
 const active=list.filter(v=>v.is_active!==false),complete=list.filter(v=>v.tin&&v.phone),purchaseTotal=list.reduce((s,v)=>s+v.summary.total,0);
 byId('content').innerHTML=pageHead('Vendors',`${list.length.toLocaleString()} vendor profiles`)+`<section class="metrics">${metric('Active vendors',active.length.toLocaleString())}${metric('Complete profiles',complete.length.toLocaleString())}${metric('Purchase value',money(purchaseTotal))}${metric('Latest vendor added',esc(fmtDateTime(list[0]?.created_at)))}</section><section class="card"><div class="card-head"><strong>Vendor purchasing activity</strong></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Phone</th><th>Bills</th><th>Total value</th><th>Latest bill</th><th>Bill date</th><th>Added at</th></tr></thead><tbody>${list.map(v=>`<tr><td><strong>${esc(v.name)}</strong><div class="muted">${esc(v.email||v.address||'')}</div></td><td>${esc(v.tin||'-')}</td><td>${esc(v.phone||'-')}</td><td>${v.summary.bills}</td><td>${money(v.summary.total)}</td><td>${esc(v.summary.latestBill)}</td><td>${esc(fmtDate(v.summary.latestDate))}</td><td>${esc(fmtDateTime(v.summary.latestAdded))}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">No vendors found.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderPrices=()=>{
 const entries=itemList().map(({bill,item})=>({name:itemName(item)||'-',packing:text(value(item,'pack_format','packing')),unit:text(value(item,'unit','purchase_unit')),rate:itemRate(item),smallRate:Number(value(item,'small_rate','base_unit_rate')||0),vendor:vendor(bill),bill:text(value(bill,'bill_no','Bill No'))||'-',date:billDate(bill),added:addedAt(bill)})).sort((a,b)=>String(b.added).localeCompare(String(a.added)));
 const productCount=new Set(entries.map(e=>e.name.toLowerCase())).size,vendorCount=new Set(entries.map(e=>e.vendor.toLowerCase()).filter(Boolean)).size,avg=entries.length?entries.reduce((s,e)=>s+e.rate,0)/entries.length:0;
 byId('content').innerHTML=pageHead('Price Book',`${entries.length.toLocaleString()} bill-item rates`)+`<section class="metrics">${metric('Price records',entries.length.toLocaleString())}${metric('Products',productCount.toLocaleString())}${metric('Vendors',vendorCount.toLocaleString())}${metric('Average pack rate',money(avg))}</section><section class="card"><div class="card-head"><strong>Latest recorded prices</strong></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Packing</th><th>Unit</th><th>Pack rate</th><th>Base rate</th><th>Vendor</th><th>Bill</th><th>Bill date</th><th>Added at</th></tr></thead><tbody>${entries.slice(0,500).map(e=>`<tr><td><strong>${esc(e.name)}</strong></td><td>${esc(e.packing||'-')}</td><td>${esc(e.unit||'-')}</td><td>${money(e.rate)}</td><td>${money(e.smallRate)}</td><td>${esc(e.vendor||'-')}</td><td>${esc(e.bill)}</td><td>${esc(fmtDate(e.date))}</td><td>${esc(fmtDateTime(e.added))}</td></tr>`).join('')||'<tr><td colspan="9"><div class="empty">No rates found.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderReports=()=>{
 const list=rows(),now=new Date(),year=String(now.getFullYear()),month=`${year}-${String(now.getMonth()+1).padStart(2,'0')}`,yearRows=list.filter(r=>billDate(r).startsWith(year)),monthRows=list.filter(r=>billDate(r).startsWith(month)),latest=[...list].sort((a,b)=>String(addedAt(b)).localeCompare(String(addedAt(a)))).slice(0,20);
 const paid=list.filter(r=>text(window.statusVal?.(r)).toLowerCase()==='paid').reduce((s,r)=>s+amount(r),0),outstanding=list.reduce((s,r)=>s+amount(r),0)-paid;
 byId('content').innerHTML=pageHead('Reports','Procurement performance and recent activity')+`<section class="metrics">${metric('This year',money(yearRows.reduce((s,r)=>s+amount(r),0)))}${metric('This month',money(monthRows.reduce((s,r)=>s+amount(r),0)))}${metric('Paid value',money(paid))}${metric('Outstanding',money(outstanding))}</section><section class="card"><div class="card-head"><strong>Latest additions</strong></div><div class="table-wrap"><table><thead><tr><th>Added at</th><th>Bill date</th><th>Vendor</th><th>Bill no.</th><th>Status</th><th>Amount</th></tr></thead><tbody>${latest.map(r=>`<tr><td>${esc(fmtDateTime(addedAt(r)))}</td><td>${esc(fmtDate(billDate(r)))}</td><td>${esc(vendor(r)||'-')}</td><td>${esc(text(value(r,'bill_no','Bill No'))||'-')}</td><td>${esc(text(window.statusVal?.(r)||'Pending'))}</td><td>${money(amount(r))}</td></tr>`).join('')}</tbody></table></div></section>`;
};

window.renderSettings=()=>{
 const latest=[...rows()].sort((a,b)=>String(addedAt(b)).localeCompare(String(addedAt(a)))[0],status=window.__WS_DB_STATUS__?.status||'Unknown';
 byId('content').innerHTML=pageHead('Settings','Application and account status')+`<section class="metrics">${metric('Role',esc(state.role))}${metric('Active records',rows().length.toLocaleString())}${metric('Database',esc(status))}${metric('Last data added',esc(fmtDateTime(addedAt(latest))))}</section><section class="card"><div class="card-head"><strong>Account and system</strong></div><div class="card-body settings-grid"><div class="kpi"><small>Signed-in user</small><strong>${esc(state.user?.email||'-')}</strong></div><div class="kpi"><small>Current page</small><strong>${esc(state.view||'-')}</strong></div><div class="kpi"><small>UI version</small><strong>${esc(window.__WS_CORE__?.version||'-')}</strong></div><div class="kpi"><small>Controller version</small><strong>${esc(window.__WS_APP_CONTROLLER__?.version||'-')}</strong></div></div></section>`;
};

window.__WS_RENDERERS__.new=window.renderNewBill;
window.__WS_RENDERERS__.products=window.renderProducts;
window.__WS_RENDERERS__.vendors=window.renderVendors;
window.__WS_RENDERERS__.prices=window.renderPrices;
window.__WS_RENDERERS__.reports=window.renderReports;
window.__WS_RENDERERS__.settings=window.renderSettings;
window.__WS_PAGE_SECTIONS__={version:VERSION};
})();