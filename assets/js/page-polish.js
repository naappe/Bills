(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const rows=()=>Array.isArray(state.rows)?state.rows:[];
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const text=value=>String(value??'').trim();
const billDate=row=>String(window.dateVal?.(row)||'').slice(0,10);
const vendor=row=>text(window.vendorVal?.(row));
const amount=row=>Number(window.amountVal?.(row)||0);
const billNo=row=>text(value(row,'bill_no','Bill No','number'))||'-';
const itemName=item=>text(value(item,'product','item_name','description','name','item'));
const itemQty=item=>Number(value(item,'qty','quantity')||0);
const itemRate=item=>Number(value(item,'rate','unit_rate','pack_rate')||0);

window.renderProducts=()=>{
 const map=new Map();
 rows().forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>{
  const name=itemName(item);if(!name)return;
  const key=name.toLowerCase(),date=billDate(bill),existing=map.get(key)||{name,unit:text(value(item,'unit','purchase_unit')),packing:text(value(item,'pack_format','packing')),quantity:0,total:0,latestDate:'',latestVendor:'',latestBill:'',latestRate:0};
  existing.quantity+=itemQty(item);existing.total+=Number(value(item,'line_total','amount')||itemQty(item)*itemRate(item));
  if(!existing.latestDate||date>=existing.latestDate){existing.latestDate=date;existing.latestVendor=vendor(bill);existing.latestBill=billNo(bill);existing.latestRate=itemRate(item);existing.unit=text(value(item,'unit','purchase_unit'))||existing.unit;existing.packing=text(value(item,'pack_format','packing'))||existing.packing}
  map.set(key,existing);
 }));
 const list=[...map.values()].sort((a,b)=>String(b.latestDate).localeCompare(String(a.latestDate)));
 const withRate=list.filter(product=>product.latestRate>0).length;
 byId('content').innerHTML=pageHead('Products',`${list.length} products connected to bills`)+`<section class="metrics"><article class="metric"><small>Products</small><strong>${list.length}</strong></article><article class="metric"><small>With rates</small><strong>${withRate}</strong></article><article class="metric"><small>Missing rates</small><strong>${list.length-withRate}</strong></article><article class="metric"><small>Latest update</small><strong>${esc(list[0]?.latestDate||'-')}</strong></article></section><section class="card polished-card"><div class="card-head"><strong>Latest purchased products</strong></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Packing</th><th>Unit</th><th>Quantity</th><th>Latest rate</th><th>Vendor</th><th>Bill</th><th>Date</th></tr></thead><tbody>${list.slice(0,250).map(product=>`<tr><td><strong>${esc(product.name)}</strong></td><td>${esc(product.packing||'-')}</td><td>${esc(product.unit||'-')}</td><td>${product.quantity.toLocaleString()}</td><td>${money(product.latestRate)}</td><td>${esc(product.latestVendor||'-')}</td><td>${esc(product.latestBill)}</td><td>${esc(product.latestDate||'-')}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">No bill-item products found.</div></td></tr>'}</tbody></table></div></section>`;
};

window.renderVendors=async()=>{
 const {data:vendors=[],error}=await db.from('vendors').select('id,name,tin,phone,email,address,is_active,created_at,updated_at').is('deleted_at',null).order('updated_at',{ascending:false});
 const totals=new Map();
 rows().forEach(bill=>{const name=vendor(bill);if(!name)return;const key=name.toLowerCase(),current=totals.get(key)||{count:0,total:0,latestDate:'',latestBill:'-'};current.count++;current.total+=amount(bill);const date=billDate(bill);if(!current.latestDate||date>=current.latestDate){current.latestDate=date;current.latestBill=billNo(bill)}totals.set(key,current)});
 const list=(error?[]:vendors).map(v=>({...v,summary:totals.get(text(v.name).toLowerCase())||{count:0,total:0,latestDate:'',latestBill:'-'}}));
 const complete=list.filter(v=>v.tin&&v.phone).length;
 byId('content').innerHTML=pageHead('Vendors',`${list.length} vendor profiles connected to bills`)+`<section class="metrics"><article class="metric"><small>Active vendors</small><strong>${list.filter(v=>v.is_active!==false).length}</strong></article><article class="metric"><small>Complete profiles</small><strong>${complete}</strong></article><article class="metric"><small>Need details</small><strong>${list.length-complete}</strong></article><article class="metric"><small>Latest added</small><strong>${esc(String(list[0]?.created_at||'').slice(0,10)||'-')}</strong></article></section><section class="card polished-card"><div class="card-head"><strong>Vendor purchasing activity</strong></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Phone</th><th>Bills</th><th>Total value</th><th>Latest bill</th><th>Latest date</th></tr></thead><tbody>${list.map(v=>`<tr><td><strong>${esc(v.name)}</strong><div class="muted">${esc(v.email||v.address||'')}</div></td><td>${esc(v.tin||'-')}</td><td>${esc(v.phone||'-')}</td><td>${v.summary.count}</td><td>${money(v.summary.total)}</td><td>${esc(v.summary.latestBill)}</td><td>${esc(v.summary.latestDate||'-')}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No vendors found.</div></td></tr>'}</tbody></table></div></section>`;
};

window.__WS_RENDERERS__.products=window.renderProducts;
window.__WS_RENDERERS__.vendors=window.renderVendors;
})();