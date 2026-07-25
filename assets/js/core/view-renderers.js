(()=>{
'use strict';
const VERSION=22;
const byId=id=>document.getElementById(id);
const val=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const all=()=>Array.isArray(state.rows)?state.rows:[];
const text=v=>String(v??'').trim();
const dateVal=row=>val(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const vendorVal=row=>val(row,'vendor','Vendor','vendor_name','supplier','Supplier');
const amountVal=row=>num(val(row,'amount','Amount','total','Total','grand_total','Grand Total'));
const statusVal=row=>String(val(row,'payment_status','Payment Status','status','Status')||'Pending');
const today=()=>new Date().toISOString().slice(0,10);
const iso=v=>{if(!v)return'';const s=String(v).slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
const canAdd=()=>state.role!=='readonly';
const canDelete=()=>state.role==='admin';
const canEdit=row=>{if(['admin','manager'].includes(state.role))return true;if(state.role!=='staff')return false;const d=new Date(val(row,'created_at'));return Number.isFinite(d.getTime())&&Date.now()-d.getTime()<=86400000};
const head=(title,sub='',actions='')=>`<div class="page-head"><div><h1>${esc(title)}</h1>${sub?`<div class="muted">${esc(sub)}</div>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
window.pageHead=head;window.get=val;window.vendorVal=vendorVal;window.amountVal=amountVal;window.dateVal=dateVal;window.statusVal=statusVal;window.today=today;window.toDateInput=iso;window.bindGo=()=>{};

const parsePack=input=>{
 const s=text(input).toLowerCase().replace(/\s+/g,'');
 let m=s.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(m){const count=num(m[1]),size=num(m[2]),unit=m[3].toLowerCase();return{count,size,unit:unit==='pc'?'pcs':unit,base:count*size}}
 m=s.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(m){const size=num(m[1]),unit=m[2].toLowerCase();return{count:1,size,unit:unit==='pc'?'pcs':unit,base:size}}
 return{count:0,size:0,unit:'',base:0};
};
const baseInfo=item=>{
 const pack=parsePack(item.pack_format),qty=num(item.qty),rate=num(item.rate),gstPct=num(item.gst),subtotal=qty*rate,gst=subtotal*gstPct/100,total=subtotal+gst;
 let basePerPurchase=0,label='Total pieces',small='pcs';
 if(pack.base){if(pack.unit==='kg'){basePerPurchase=pack.base*1000;label='Total weight';small='g'}else if(pack.unit==='g'){basePerPurchase=pack.base;label='Total weight';small='g'}else if(pack.unit==='l'){basePerPurchase=pack.base*1000;label='Total volume';small='ml'}else if(pack.unit==='ml'){basePerPurchase=pack.base;label='Total volume';small='ml'}else basePerPurchase=pack.base}
 else if(item.unit==='KG'){basePerPurchase=1000;label='Total weight';small='g'}else if(item.unit==='G'){basePerPurchase=1;label='Total weight';small='g'}else if(item.unit==='L'){basePerPurchase=1000;label='Total volume';small='ml'}else if(item.unit==='ML'){basePerPurchase=1;label='Total volume';small='ml'}else if(item.unit==='DOZ')basePerPurchase=12;else basePerPurchase=1;
 return{...item,qty,rate,gst_pct:gstPct,subtotal,gst_amount:gst,line_total:total,base_per_purchase:basePerPurchase,total_base:qty*basePerPurchase,small_unit:small,small_rate:basePerPurchase?rate/basePerPurchase:0,label};
};
const emptyItem=()=>({product:'',pack_format:'',unit:'CSE',qty:1,rate:0,gst:0});
const itemFromSaved=item=>({product:text(val(item,'product','description','name','item')),pack_format:text(val(item,'pack_format','packing','pack')),unit:text(val(item,'unit','purchase_unit')||'CSE').toUpperCase(),qty:num(val(item,'qty','quantity')||1),rate:num(val(item,'rate','pack_rate','unit_rate')),gst:num(val(item,'gst','gst_pct'))});
const units=['CSE','CTN','BOX','PKT','PCS','DOZ','BTL','KG','G','L','ML','BAG','TIN','CAN','SET','PAIR','ROLL'];

const filterDates=(list,preset,from,to)=>{
 const now=new Date(),day=today();let start='',end='';
 if(preset==='today')start=end=day;
 if(preset==='week'){const d=new Date(now);d.setDate(d.getDate()-((d.getDay()+6)%7));start=d.toISOString().slice(0,10);end=day}
 if(preset==='month'){start=`${day.slice(0,7)}-01`;end=day}
 if(preset==='lastmonth'){const first=new Date(now.getFullYear(),now.getMonth()-1,1),last=new Date(now.getFullYear(),now.getMonth(),0);start=first.toISOString().slice(0,10);end=last.toISOString().slice(0,10)}
 if(preset==='custom'){start=from;end=to}
 return list.filter(row=>{const d=iso(dateVal(row));return(!start||d>=start)&&(!end||d<=end)});
};

window.renderBillRows=()=>{
 const body=byId('billRows'),pager=byId('pager');if(!body)return;const list=state.filtered||[],size=Number(state.pageSize||20),pages=Math.max(1,Math.ceil(list.length/size));state.page=Math.min(Math.max(1,state.page||1),pages);const start=(state.page-1)*size;
 body.innerHTML=list.slice(start,start+size).map(row=>`<tr><td><span class="pill">${esc(statusVal(row))}</span></td><td>${esc(iso(dateVal(row))||'-')}</td><td>${esc(val(row,'bill_no','Bill No')||'-')}</td><td>${esc(vendorVal(row)||'-')}</td><td>${money(amountVal(row))}</td><td><div class="actions">${canEdit(row)?`<button class="btn secondary small" data-edit="${row.id}">Edit</button>`:''}${canDelete()?`<button class="btn danger small" data-delete="${row.id}">Delete</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">No bills found.</div></td></tr>';
 body.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>{state.editing=all().find(row=>String(row.id)===button.dataset.edit)||null;show('new')});
 body.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{const row=all().find(item=>String(item.id)===button.dataset.delete);if(!row||!confirm('Delete this bill permanently?'))return;button.disabled=true;const{error}=await db.from(TABLE).delete().eq('id',row.id);if(error){alert(error.message);button.disabled=false;return}await reloadBillsNow()});
 if(pager){pager.innerHTML=`<span>${list.length?start+1:0}-${Math.min(start+size,list.length)} of ${list.length}</span><div class="actions"><button class="btn secondary small" id="prev" ${state.page<=1?'disabled':''}>Previous</button><span>Page ${state.page} of ${pages}</span><button class="btn secondary small" id="next" ${state.page>=pages?'disabled':''}>Next</button></div>`;byId('prev').onclick=()=>{state.page--;renderBillRows()};byId('next').onclick=()=>{state.page++;renderBillRows()}}
};

window.renderDashboard=()=>{const list=all(),total=list.reduce((sum,row)=>sum+amountVal(row),0),month=filterDates(list,'month'),recent=[...list].sort((a,b)=>String(dateVal(b)).localeCompare(String(dateVal(a)))).slice(0,20);byId('content').innerHTML=head('Dashboard','',canAdd()?'<button class="btn" data-go="new">New Bill</button>':'')+`<section class="metrics"><article class="metric"><small>Total bills</small><strong>${list.length.toLocaleString()}</strong></article><article class="metric"><small>Total value</small><strong>${money(total)}</strong></article><article class="metric"><small>This month</small><strong>${money(month.reduce((sum,row)=>sum+amountVal(row),0))}</strong></article><article class="metric"><small>Vendors</small><strong>${new Set(list.map(vendorVal).filter(Boolean)).size}</strong></article></section><section class="card"><div class="page-head"><div><h2>Latest 20 bills</h2></div><button class="btn secondary" data-go="bills">View all</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Status</th><th>Amount</th></tr></thead><tbody>${recent.map(row=>`<tr><td>${esc(iso(dateVal(row))||'-')}</td><td>${esc(val(row,'bill_no','Bill No')||'-')}</td><td>${esc(vendorVal(row)||'-')}</td><td>${esc(statusVal(row))}</td><td>${money(amountVal(row))}</td></tr>`).join('')}</tbody></table></div></section>`};

window.renderBills=()=>{const list=all();state.filtered=[...list];byId('content').innerHTML=head('Bills',`${list.length.toLocaleString()} records`,`<button class="btn secondary" id="exportBills">Export CSV</button>${canAdd()?'<button class="btn" data-go="new">New Bill</button>':''}`)+`<section class="card"><div class="actions" style="margin-bottom:14px;flex-wrap:wrap"><input class="field" id="billSearch" placeholder="Search vendor or bill no." style="max-width:280px"><select class="field" id="datePreset" style="max-width:170px"><option value="all">All dates</option><option value="today">Today</option><option value="week">This week</option><option value="month" selected>This month</option><option value="lastmonth">Last month</option><option value="custom">Date range</option></select><input class="field hidden" id="dateFrom" type="date"><input class="field hidden" id="dateTo" type="date"><select class="field" id="statusFilter" style="max-width:170px"><option value="">All statuses</option>${[...new Set(list.map(statusVal))].sort().map(status=>`<option>${esc(status)}</option>`).join('')}</select><select class="field" id="pageSize" style="max-width:120px"><option>20</option><option>50</option><option>100</option></select></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
 const apply=()=>{const query=text(byId('billSearch').value).toLowerCase(),preset=byId('datePreset').value,status=text(byId('statusFilter').value).toLowerCase();const filtered=filterDates(list,preset,byId('dateFrom').value,byId('dateTo').value);state.filtered=filtered.filter(row=>(!query||`${vendorVal(row)} ${val(row,'bill_no','Bill No')}`.toLowerCase().includes(query))&&(!status||statusVal(row).toLowerCase()===status));state.page=1;renderBillRows()};
 byId('datePreset').onchange=()=>{const custom=byId('datePreset').value==='custom';byId('dateFrom').classList.toggle('hidden',!custom);byId('dateTo').classList.toggle('hidden',!custom);apply()};['billSearch','dateFrom','dateTo'].forEach(id=>byId(id).oninput=apply);byId('statusFilter').onchange=apply;byId('pageSize').value=String(state.pageSize||20);byId('pageSize').onchange=event=>{state.pageSize=num(event.target.value)||20;renderBillRows()};byId('exportBills').onclick=exportCsv;apply()};

const loadVendors=async()=>{const{data,error}=await db.from('vendors').select('id,name,phone,email,tin,address,default_payment_method').eq('is_active',true).is('deleted_at',null).order('name');if(error){console.error('[vendors]',error);return[]}return Array.isArray(data)?data:[]};
const findVendor=(vendors,name)=>vendors.find(vendor=>text(vendor.name).toLowerCase()===text(name).toLowerCase())||null;
const saveVendor=async(form,vendors)=>{
 const name=text(form.elements.vendor.value);if(!name)return null;
 const existing=findVendor(vendors,name);
 const details={name,tin:text(form.elements.tin.value)||null,phone:text(form.elements.vendor_phone.value)||null,email:text(form.elements.vendor_email.value)||null,address:text(form.elements.vendor_address.value)||null,default_payment_method:form.elements.payment_method.value||null,updated_at:new Date().toISOString(),updated_by:state.user?.id||null};
 if(existing){const changed=['tin','phone','email','address','default_payment_method'].some(key=>text(existing[key])!==text(details[key]));if(changed){const{data,error}=await db.from('vendors').update(details).eq('id',existing.id).select().single();if(error)throw error;return data}return existing}
 const{data,error}=await db.from('vendors').insert({...details,created_by:state.user?.id||null}).select().single();if(error)throw error;vendors.push(data);return data;
};

window.renderNewBill=async()=>{
 if(!canAdd()){byId('content').innerHTML=head('New Bill');return}
 const editing=state.editing||null,vendors=await loadVendors();state.items=Array.isArray(editing?.items)&&editing.items.length?editing.items.map(itemFromSaved):[emptyItem(),emptyItem(),emptyItem()];
 byId('content').innerHTML=head(editing?'Edit Bill':'New Bill','','<button class="btn secondary" data-go="bills">Back</button>')+`<form id="billForm" class="stack"><section class="card"><div class="form-grid"><label>Bill date<input class="field" name="bill_date" type="date" required value="${esc(iso(dateVal(editing))||today())}"></label><label>Bill no.<input class="field" name="bill_no" value="${esc(val(editing,'bill_no','Bill No'))}"></label><label>Vendor<input class="field" name="vendor" list="vendorList" required autocomplete="off" value="${esc(vendorVal(editing))}"><datalist id="vendorList">${vendors.map(vendor=>`<option value="${esc(vendor.name)}"></option>`).join('')}</datalist></label><label>TIN<input class="field" name="tin" value="${esc(val(editing,'tin','TIN'))}"></label><label>Phone<input class="field" name="vendor_phone"></label><label>Email<input class="field" name="vendor_email" type="email"></label><label>Address<input class="field" name="vendor_address"></label><label>Payment<select class="field" name="payment_status"><option>Pending</option><option>Paid</option><option>Partially Paid</option></select></label><label>Method<select class="field" name="payment_method"><option value="">Not specified</option><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit</option></select></label></div></section><section class="card"><div class="page-head"><div><h2>Bill items</h2></div><button class="btn secondary" id="addRow" type="button">Add row</button></div><div id="itemRows" class="stack"></div></section><section class="card"><div class="metrics"><article class="metric"><small>Subtotal</small><strong id="subTotal">MVR 0.00</strong></article><article class="metric"><small>GST</small><strong id="gstTotal">MVR 0.00</strong></article><article class="metric"><small>Bill total</small><strong id="grandTotal">MVR 0.00</strong></article></div><label>Notes<textarea class="field" name="notes" rows="3">${esc(val(editing,'notes'))}</textarea></label><div class="notice" id="saveNotice"></div><div class="actions"><button class="btn" id="saveBill" type="submit">${editing?'Update Bill':'Save Bill'}</button><button class="btn secondary" data-go="bills" type="button">Cancel</button></div></section></form>`;
 const form=byId('billForm');form.elements.payment_status.value=statusVal(editing);form.elements.payment_method.value=val(editing,'payment_method')||'';
 const fillVendor=()=>{const vendor=findVendor(vendors,form.elements.vendor.value);if(!vendor){form.dataset.vendorId='';return}form.dataset.vendorId=vendor.id;form.elements.tin.value=vendor.tin||'';form.elements.vendor_phone.value=vendor.phone||'';form.elements.vendor_email.value=vendor.email||'';form.elements.vendor_address.value=vendor.address||'';if(vendor.default_payment_method)form.elements.payment_method.value=vendor.default_payment_method};
 form.elements.vendor.addEventListener('input',fillVendor);form.elements.vendor.addEventListener('change',fillVendor);if(vendorVal(editing))fillVendor();

 const updateTotals=()=>{
  const calculated=state.items.map(baseInfo);
  byId('subTotal').textContent=money(calculated.reduce((sum,item)=>sum+item.subtotal,0));
  byId('gstTotal').textContent=money(calculated.reduce((sum,item)=>sum+item.gst_amount,0));
  byId('grandTotal').textContent=money(calculated.reduce((sum,item)=>sum+item.line_total,0));
 };
 const updateRowMetrics=(row,index)=>{
  const calc=baseInfo(state.items[index]);
  const unitRate=row.querySelector('[data-m="rate"]');
  const baseLabel=row.querySelector('[data-m="base-label"]');
  const baseTotal=row.querySelector('[data-m="base-total"]');
  const smallLabel=row.querySelector('[data-m="small-label"]');
  const smallRate=row.querySelector('[data-m="small-rate"]');
  const amount=row.querySelector('[data-m="amount"]');
  if(unitRate)unitRate.textContent=money(calc.rate);
  if(baseLabel)baseLabel.textContent=calc.label;
  if(baseTotal)baseTotal.textContent=`${calc.total_base.toLocaleString()} ${calc.small_unit}`;
  if(smallLabel)smallLabel.textContent=`Per ${calc.small_unit}`;
  if(smallRate)smallRate.textContent=money(calc.small_rate);
  if(amount)amount.textContent=money(calc.line_total);
  updateTotals();
 };
 const bindRows=()=>{
  byId('itemRows').querySelectorAll('[data-row]').forEach(row=>{
   const index=Number(row.dataset.row);
   row.querySelectorAll('[data-f]').forEach(input=>{
    const sync=()=>{
     const field=input.dataset.f;
     state.items[index][field]=['product','pack_format','unit'].includes(field)?input.value:num(input.value);
     updateRowMetrics(row,index);
    };
    input.addEventListener('input',sync);
    input.addEventListener('change',sync);
   });
  });
  byId('itemRows').querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{state.items.splice(Number(button.dataset.remove),1);if(!state.items.length)state.items.push(emptyItem());draw()});
 };
 const draw=()=>{
  byId('itemRows').innerHTML=state.items.map((item,index)=>{const calc=baseInfo(item);return `<article class="card" data-row="${index}" style="box-shadow:none"><div class="form-grid"><label>Item<input class="field" data-f="product" value="${esc(item.product)}" required></label><label>Packing<input class="field" data-f="pack_format" value="${esc(item.pack_format)}" placeholder="10x500g"></label><label>Unit<select class="field" data-f="unit">${units.map(unit=>`<option ${unit===item.unit?'selected':''}>${unit}</option>`).join('')}</select></label><label>QTY<input class="field" data-f="qty" type="number" min="0" step="0.01" value="${item.qty}"></label><label>Rate<input class="field" data-f="rate" type="number" min="0" step="0.01" value="${item.rate}"></label><label>GST %<input class="field" data-f="gst" type="number" min="0" step="0.01" value="${item.gst}"></label></div><div class="metrics" style="margin-top:12px"><article class="metric"><small>Unit rate</small><strong data-m="rate">${money(calc.rate)}</strong></article><article class="metric"><small data-m="base-label">${calc.label}</small><strong data-m="base-total">${calc.total_base.toLocaleString()} ${calc.small_unit}</strong></article><article class="metric"><small data-m="small-label">Per ${calc.small_unit}</small><strong data-m="small-rate">${money(calc.small_rate)}</strong></article><article class="metric"><small>Amount</small><strong data-m="amount">${money(calc.line_total)}</strong></article></div><div class="actions"><button class="btn danger small" data-remove="${index}" type="button">Delete row</button></div></article>`}).join('');
  bindRows();
  updateTotals();
 };
 byId('addRow').onclick=()=>{state.items.push(emptyItem());draw()};draw();
 form.onsubmit=async event=>{event.preventDefault();const items=state.items.map(baseInfo).filter(item=>text(item.product));if(!items.length){byId('saveNotice').textContent='Add at least one item.';return}const button=byId('saveBill');button.disabled=true;byId('saveNotice').textContent=editing?'Updating…':'Saving…';try{const vendor=await saveVendor(form,vendors),subtotal=items.reduce((sum,item)=>sum+item.subtotal,0),gst=items.reduce((sum,item)=>sum+item.gst_amount,0),total=subtotal+gst,fd=new FormData(form),payload={bill_date:fd.get('bill_date'),bill_day:fd.get('bill_date'),bill_no:text(fd.get('bill_no')),vendor:text(fd.get('vendor')),vendor_id:vendor?.id||null,tin:text(fd.get('tin')),amount:String(total.toFixed(2)),subtotal,net_amount:subtotal,gst_total:gst,payment_status:fd.get('payment_status'),payment_method:fd.get('payment_method')||null,notes:text(fd.get('notes')),items,user_id:state.user?.id||null,updated_at:new Date().toISOString(),updated_by:state.user?.id||null};const result=editing?await db.from(TABLE).update(payload).eq('id',editing.id).select():await db.from(TABLE).insert(payload).select();if(result.error)throw result.error;state.editing=null;await reloadBillsNow();show('bills')}catch(error){byId('saveNotice').textContent=error.message||'Save failed'}finally{button.disabled=false}};
};

window.renderVendors=async()=>{const vendors=await loadVendors();const totals=new Map();all().forEach(row=>{const name=text(vendorVal(row)).toLowerCase();if(!name)return;const current=totals.get(name)||{count:0,total:0};current.count++;current.total+=amountVal(row);totals.set(name,current)});byId('content').innerHTML=head('Vendors',`${vendors.length} vendors`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Phone</th><th>Email</th><th>Bills</th><th>Total</th></tr></thead><tbody>${vendors.map(vendor=>{const total=totals.get(text(vendor.name).toLowerCase())||{count:0,total:0};return`<tr><td>${esc(vendor.name)}</td><td>${esc(vendor.tin||'-')}</td><td>${esc(vendor.phone||'-')}</td><td>${esc(vendor.email||'-')}</td><td>${total.count}</td><td>${money(total.total)}</td></tr>`}).join('')}</tbody></table></div></section>`};
window.renderProducts=()=>{const map=new Map();all().forEach(row=>(row.items||[]).forEach(item=>{const name=text(val(item,'product','description'));if(!name)return;const current=map.get(name)||{name,unit:val(item,'unit'),qty:0,total:0};current.qty+=num(val(item,'qty'));current.total+=num(val(item,'line_total'));map.set(name,current)}));const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));byId('content').innerHTML=head('Products',`${list.length} products`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Unit</th><th>Quantity</th><th>Total</th></tr></thead><tbody>${list.map(product=>`<tr><td>${esc(product.name)}</td><td>${esc(product.unit||'-')}</td><td>${product.qty.toLocaleString()}</td><td>${money(product.total)}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderPrices=()=>{const list=[];all().forEach(row=>(row.items||[]).forEach(item=>list.push({...item,vendor:vendorVal(row),date:dateVal(row)})));byId('content').innerHTML=head('Price Book',`${list.length} rates`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Packing</th><th>Unit</th><th>Rate</th><th>Per G/ML/PCS</th><th>Vendor</th><th>Date</th></tr></thead><tbody>${list.slice(0,500).map(item=>`<tr><td>${esc(item.product||'-')}</td><td>${esc(item.pack_format||'-')}</td><td>${esc(item.unit||'-')}</td><td>${money(item.rate)}</td><td>${money(item.small_rate)}</td><td>${esc(item.vendor||'-')}</td><td>${esc(iso(item.date)||'-')}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderReports=()=>{const list=all(),year=today().slice(0,4),month=today().slice(0,7),yearRows=list.filter(row=>iso(dateVal(row)).startsWith(year)),monthRows=list.filter(row=>iso(dateVal(row)).startsWith(month));byId('content').innerHTML=head('Reports')+`<section class="metrics"><article class="metric"><small>This year</small><strong>${money(yearRows.reduce((sum,row)=>sum+amountVal(row),0))}</strong></article><article class="metric"><small>This month</small><strong>${money(monthRows.reduce((sum,row)=>sum+amountVal(row),0))}</strong></article><article class="metric"><small>Year bills</small><strong>${yearRows.length}</strong></article><article class="metric"><small>Month bills</small><strong>${monthRows.length}</strong></article></section>`};
window.renderSettings=()=>{byId('content').innerHTML=head('Settings')+`<section class="card"><div class="form-grid"><div><small>Role</small><strong>${esc(state.role)}</strong></div><div><small>User</small><strong>${esc(state.user?.email||'-')}</strong></div><div><small>Database</small><strong>${esc(window.__WS_DB_STATUS__?.status||'Unknown')}</strong></div><div><small>Records</small><strong>${all().length}</strong></div></div></section>`};
window.__WS_RENDERERS__={dashboard:renderDashboard,bills:renderBills,new:renderNewBill,products:renderProducts,vendors:renderVendors,prices:renderPrices,reports:renderReports,settings:renderSettings};
window.exportCsv=()=>{const list=state.filtered||all(),csv=[['Date','Bill No','Vendor','Amount','Status'],...list.map(row=>[iso(dateVal(row)),val(row,'bill_no','Bill No'),vendorVal(row),amountVal(row),statusVal(row)])].map(values=>values.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\n'),link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download=`bills-${today()}.csv`;link.click();URL.revokeObjectURL(link.href)};
window.show=view=>{const valid=['dashboard','bills','new','products','vendors','prices','reports','settings'];view=valid.includes(view)?view:'dashboard';state.view=view;document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));if(byId('topTitle'))byId('topTitle').textContent={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings'}[view];const renderer=window.__WS_RENDERERS__[view];Promise.resolve().then(()=>renderer()).catch(error=>{console.error(error);byId('content').innerHTML=head('Error',error.message)})};
byId('menuBtn')?.addEventListener('click',()=>byId('sidebar')?.classList.toggle('open'));
window.__WS_CORE__={version:VERSION};
})();