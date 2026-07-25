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
 const pack=parsePack(item.pack_format),qty=num(item.qty),enteredAmount=num(item.rate),gstPct=num(item.gst),rateMode=item.rate_mode==='line_total'?'line_total':'per_unit';
 const subtotal=rateMode==='line_total'?enteredAmount:qty*enteredAmount,gst=subtotal*gstPct/100,total=subtotal+gst,purchaseRate=qty?subtotal/qty:0;
 let basePerPurchase=0,label='Total pieces',small='pcs';
 if(pack.base){if(pack.unit==='kg'){basePerPurchase=pack.base*1000;label='Total weight';small='g'}else if(pack.unit==='g'){basePerPurchase=pack.base;label='Total weight';small='g'}else if(pack.unit==='l'){basePerPurchase=pack.base*1000;label='Total volume';small='ml'}else if(pack.unit==='ml'){basePerPurchase=pack.base;label='Total volume';small='ml'}else basePerPurchase=pack.base}
 else if(item.unit==='KG'){basePerPurchase=1000;label='Total weight';small='g'}else if(item.unit==='G'){basePerPurchase=1;label='Total weight';small='g'}else if(item.unit==='L'){basePerPurchase=1000;label='Total volume';small='ml'}else if(item.unit==='ML'){basePerPurchase=1;label='Total volume';small='ml'}else if(item.unit==='DOZ')basePerPurchase=12;else basePerPurchase=1;
 const totalBase=qty*basePerPurchase;
 return{...item,qty,rate:enteredAmount,rate_mode:rateMode,gst_pct:gstPct,subtotal,gst_amount:gst,line_total:total,purchase_rate:purchaseRate,base_per_purchase:basePerPurchase,total_base:totalBase,small_unit:small,small_rate:totalBase?subtotal/totalBase:0,label};
};
const emptyItem=()=>({product:'',pack_format:'',unit:'CSE',qty:1,rate:0,rate_mode:'line_total',gst:0});
const itemFromSaved=item=>({product:text(val(item,'product','description','name','item')),pack_format:text(val(item,'pack_format','packing','pack')),unit:text(val(item,'unit','purchase_unit')||'CSE').toUpperCase(),qty:num(val(item,'qty','quantity')||1),rate:num(val(item,'rate','pack_rate','unit_rate','line_total')),rate_mode:item.rate_mode==='line_total'?'line_total':'per_unit',gst:num(val(item,'gst','gst_pct'))});
const units=['CSE','CTN','BOX','PKT','PCS','DOZ','BTL','KG','G','L','ML','BAG','TIN','CAN','SET','PAIR','ROLL'];
const purchaseUnitName=unit=>({CSE:'Case',PCS:'PCS',PKT:'PKT',TIN:'TIN'}[String(unit||'').toUpperCase()]||String(unit||'Unit').toUpperCase());
const purchaseRateLabel=unit=>`${purchaseUnitName(unit)} rate`;
const preciseRateMoney=value=>`MVR ${num(value).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5})}`;

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

window.renderDashboard=()=>{
 const list=all(),total=list.reduce((sum,row)=>sum+amountVal(row),0),monthRows=filterDates(list,'month'),monthTotal=monthRows.reduce((sum,row)=>sum+amountVal(row),0);
 const paid=list.filter(row=>statusVal(row).toLowerCase()==='paid').reduce((sum,row)=>sum+amountVal(row),0),pending=Math.max(0,total-paid);
 const supplierTotals=new Map();list.forEach(row=>{const supplier=vendorVal(row)||'Unknown supplier';supplierTotals.set(supplier,(supplierTotals.get(supplier)||0)+amountVal(row))});
 const suppliers=[...supplierTotals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),supplierCount=supplierTotals.size;
 const todayDate=new Date(),months=[];for(let offset=5;offset>=0;offset--){const date=new Date(todayDate.getFullYear(),todayDate.getMonth()-offset,1);months.push({key:date.toISOString().slice(0,7),label:date.toLocaleDateString('en-US',{month:'short'})})}
 const trend=months.map(month=>list.filter(row=>iso(dateVal(row)).startsWith(month.key)).reduce((sum,row)=>sum+amountVal(row),0));
 const productRates=new Set();list.forEach(bill=>(bill.items||[]).forEach(item=>{const name=text(val(item,'product','description'));if(name)productRates.add(name.toLowerCase())}));
 const paidPercent=total?Math.round((paid/total)*100):0;
 byId('content').innerHTML=head('Command centre','Procurement intelligence for your operation',canAdd()?'<button class="btn" data-go="bills">Add bill</button>':'')+
 '<section class="command-hero"><div class="command-hero-copy"><span class="command-eyebrow">Procurement overview</span><h2>'+money(monthTotal)+'</h2><p>Recorded purchase value for '+todayDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})+'.</p><div class="command-hero-actions"><button class="command-link" data-go="bills">Bills <b>→</b></button><button class="command-link" data-go="rates">Rate intelligence <b>→</b></button></div></div><div class="command-hero-stats"><div><span>Month bills</span><strong>'+monthRows.length+'</strong></div><div><span>Suppliers</span><strong>'+supplierCount+'</strong></div><div><span>Tracked products</span><strong>'+productRates.size+'</strong></div></div></section>'+
 '<section class="command-kpis"><article><span class="command-kpi-mark mark-blue">01</span><div><small>Total procurement</small><strong>'+money(total)+'</strong><p>'+list.length.toLocaleString()+' bills in the system</p></div></article><article><span class="command-kpi-mark mark-amber">02</span><div><small>Pending payment</small><strong>'+money(pending)+'</strong><p>'+list.filter(row=>statusVal(row).toLowerCase()!=='paid').length+' bills awaiting payment</p></div></article><article><span class="command-kpi-mark mark-green">03</span><div><small>Paid ratio</small><strong>'+paidPercent+'%</strong><p>'+money(paid)+' marked as paid</p></div></article></section>'+
 '<section class="command-grid"><article class="command-card command-trend"><div class="command-card-head"><div><span class="command-eyebrow blue">Spending pattern</span><h2>Six-month trend</h2></div><span class="command-period">MVR</span></div><div class="command-chart"><canvas id="spendTrendChart"></canvas></div></article><article class="command-card command-payment"><div class="command-card-head"><div><span class="command-eyebrow amber">Payment health</span><h2>Paid vs pending</h2></div></div><div class="payment-number"><strong>'+paidPercent+'%</strong><span>of recorded value paid</span></div><div class="command-progress"><i style="width:'+paidPercent+'%"></i></div><div class="payment-breakdown"><div><span>Paid</span><strong>'+money(paid)+'</strong></div><div><span>Pending</span><strong>'+money(pending)+'</strong></div></div></article><article class="command-card command-suppliers"><div class="command-card-head"><div><span class="command-eyebrow green">Supplier spend</span><h2>Top suppliers</h2></div><button class="command-text-button" data-go="bills">All bills</button></div><div class="command-supplier-list">'+(suppliers.length?suppliers.map((entry,index)=>'<div><b>'+String(index+1).padStart(2,'0')+'</b><span>'+esc(entry[0])+'</span><strong>'+money(entry[1])+'</strong></div>').join(''):'<div class="empty">No supplier data yet.</div>')+'</div></article><article class="command-card command-rates"><div><span class="command-eyebrow blue">Buying intelligence</span><h2>Rate coverage</h2><strong>'+productRates.size+'</strong><p>Products are ready for supplier comparison and price-change checks.</p></div><button class="command-primary-action" data-go="rates">Open rates <b>→</b></button></article></section>';
 if(window.Chart&&byId('spendTrendChart')){try{window.__WS_DASHBOARD_CHART__?.destroy();window.__WS_DASHBOARD_CHART__=new Chart(byId('spendTrendChart'),{type:'bar',data:{labels:months.map(month=>month.label),datasets:[{data:trend,backgroundColor:'#2e7cf6',borderRadius:7,borderSkipped:false,maxBarThickness:44}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,backgroundColor:'#061d36',padding:12,callbacks:{label:context=>money(context.raw)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#70839a',font:{weight:700}}},y:{grid:{color:'#e8eff7'},border:{display:false},ticks:{color:'#70839a',callback:value=>'MVR '+Number(value).toLocaleString()}}}}})}catch(error){console.warn('Dashboard chart unavailable',error)}}
};

window.renderBills=()=>{const list=all();state.filtered=[...list];byId('content').innerHTML=head('Bills',`${list.length.toLocaleString()} records`,`<button class="btn secondary" id="exportBills">Export CSV</button>${canAdd()?'<button class="btn" id="openBillEntry">Add bill</button>':''}`)+`<section class="card hidden" id="billEntryMount"></section><section class="card"><div class="actions" style="margin-bottom:14px;flex-wrap:wrap"><input class="field" id="billSearch" placeholder="Search vendor or bill no." style="max-width:280px"><select class="field" id="datePreset" style="max-width:170px"><option value="all">All dates</option><option value="today">Today</option><option value="week">This week</option><option value="month" selected>This month</option><option value="lastmonth">Last month</option><option value="custom">Date range</option></select><input class="field hidden" id="dateFrom" type="date"><input class="field hidden" id="dateTo" type="date"><select class="field" id="statusFilter" style="max-width:170px"><option value="">All statuses</option>${[...new Set(list.map(statusVal))].sort().map(status=>`<option>${esc(status)}</option>`).join('')}</select><select class="field" id="pageSize" style="max-width:120px"><option>20</option><option>50</option><option>100</option></select></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Bill date</th><th>Bill no.</th><th>Vendor</th><th>Amount</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
window.openBillEntry=()=>{state.editing=null;const mount=byId('billEntryMount');if(!mount)return;mount.classList.remove('hidden');mount.scrollIntoView({behavior:'smooth',block:'start'});window.renderNewBill()};
 byId('openBillEntry')?.addEventListener('click',window.openBillEntry);
 const apply=()=>{const query=text(byId('billSearch').value).toLowerCase(),preset=byId('datePreset').value,status=text(byId('statusFilter').value).toLowerCase();const filtered=filterDates(list,preset,byId('dateFrom').value,byId('dateTo').value);state.filtered=filtered.filter(row=>(!query||`${vendorVal(row)} ${val(row,'bill_no','Bill No')}`.toLowerCase().includes(query))&&(!status||statusVal(row).toLowerCase()===status));state.page=1;renderBillRows()};
 byId('datePreset').onchange=()=>{const custom=byId('datePreset').value==='custom';byId('dateFrom').classList.toggle('hidden',!custom);byId('dateTo').classList.toggle('hidden',!custom);apply()};['billSearch','dateFrom','dateTo'].forEach(id=>byId(id).oninput=apply);byId('statusFilter').onchange=apply;byId('pageSize').value=String(state.pageSize||20);byId('pageSize').onchange=event=>{state.pageSize=num(event.target.value)||20;renderBillRows()};byId('exportBills').onclick=exportCsv;apply()};

let vendorCache=null,vendorCacheAt=0,vendorLoadPromise=null;
const invalidateVendorCache=()=>{vendorCache=null;vendorCacheAt=0};
const loadVendors=async({force=false}={})=>{
 const fresh=vendorCache&&Date.now()-vendorCacheAt<300000;
 if(!force&&fresh)return vendorCache;
 if(vendorLoadPromise)return vendorLoadPromise;
 vendorLoadPromise=(async()=>{const{data,error}=await db.from('vendors').select('id,name,phone,email,tin,address,default_payment_method').eq('is_active',true).is('deleted_at',null).order('name');if(error){console.error('[vendors]',error);return[]}vendorCache=Array.isArray(data)?data:[];vendorCacheAt=Date.now();return vendorCache})().finally(()=>{vendorLoadPromise=null});
 return vendorLoadPromise;
};
const findVendor=(vendors,name)=>vendors.find(vendor=>text(vendor.name).toLowerCase()===text(name).toLowerCase())||null;
const saveVendor=async(form,vendors)=>{
 const name=text(form.elements.vendor.value);if(!name)return null;
 const existing=findVendor(vendors,name);
 const details={name,tin:text(form.elements.tin.value)||null,phone:text(form.elements.vendor_phone.value)||null,email:text(form.elements.vendor_email.value)||null,address:text(form.elements.vendor_address.value)||null,default_payment_method:form.elements.payment_method.value||null,updated_at:new Date().toISOString(),updated_by:state.user?.id||null};
 if(existing){const changed=['tin','phone','email','address','default_payment_method'].some(key=>text(existing[key])!==text(details[key]));if(changed){const{data,error}=await db.from('vendors').update(details).eq('id',existing.id).select().single();if(error)throw error;invalidateVendorCache();return data}return existing}
 const{data,error}=await db.from('vendors').insert({...details,created_by:state.user?.id||null}).select().single();if(error)throw error;invalidateVendorCache();vendors.push(data);return data;
};

window.renderNewBill=async()=>{
 if(!canAdd()){byId('content').innerHTML=head('New Bill');return}
 const editing=state.editing||null,vendors=await loadVendors(),mount=byId('billEntryMount')||byId('content');state.items=Array.isArray(editing?.items)&&editing.items.length?editing.items.map(itemFromSaved):[emptyItem()];
 mount.classList.remove('hidden');mount.innerHTML=head(editing?'Edit Bill':'Add bill','','<button class="btn secondary" data-go="bills">Close</button>')+`<form id="billForm" class="stack"><section class="card"><div class="form-grid"><label>Bill date<input class="field" name="bill_date" type="date" required value="${esc(iso(dateVal(editing))||today())}"></label><label>Bill no.<input class="field" name="bill_no" value="${esc(val(editing,'bill_no','Bill No'))}"></label><label class="vendor-field">Vendor<div class="vendor-picker" id="vendorPicker"><input class="field" name="vendor" required autocomplete="off" value="${esc(vendorVal(editing))}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="vendorMenu"><button class="vendor-toggle" id="vendorToggle" type="button" aria-label="Show vendors">⌄</button><div class="vendor-menu hidden" id="vendorMenu" role="listbox"></div></div></label><label>TIN<input class="field" name="tin" value="${esc(val(editing,'tin','TIN'))}"></label><label>Phone<input class="field" name="vendor_phone"></label><label>Email<input class="field" name="vendor_email" type="email"></label><label>Address<input class="field" name="vendor_address"></label><label>Payment<select class="field" name="payment_status"><option>Pending</option><option>Paid</option><option>Partially Paid</option></select></label><label>Method<select class="field" name="payment_method"><option value="">Not specified</option><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Credit</option></select></label></div></section><section class="card"><div class="page-head"><div><h2>Bill items</h2></div><button class="btn secondary" id="addRow" type="button">Add row</button></div><div id="itemRows" class="stack"></div></section><section class="card bill-save-panel"><div class="bill-total-summary"><small>Bill total</small><strong id="grandTotal">MVR 0.00</strong></div><label>Notes<textarea class="field" name="notes" rows="3">${esc(val(editing,'notes'))}</textarea></label><div class="notice" id="saveNotice"></div><div class="actions"><button class="btn" id="saveBill" type="submit">${editing?'Update Bill':'Save Bill'}</button><button class="btn secondary" data-go="bills" type="button">Cancel</button></div></section></form>`;
 const form=byId('billForm');form.addEventListener('submit',event=>event.preventDefault(),true);form.elements.payment_status.value=statusVal(editing);form.elements.payment_method.value=val(editing,'payment_method')||'';
 const fillVendor=()=>{const vendor=findVendor(vendors,form.elements.vendor.value);if(!vendor){form.dataset.vendorId='';return}form.dataset.vendorId=vendor.id;if(vendor.tin)form.elements.tin.value=vendor.tin;if(vendor.phone)form.elements.vendor_phone.value=vendor.phone;if(vendor.email)form.elements.vendor_email.value=vendor.email;if(vendor.address)form.elements.vendor_address.value=vendor.address;if(vendor.default_payment_method)form.elements.payment_method.value=vendor.default_payment_method};
 const vendorInput=form.elements.vendor,vendorPicker=byId('vendorPicker'),vendorMenu=byId('vendorMenu'),vendorToggle=byId('vendorToggle');
 const renderVendorMenu=queryText=>{const query=text(queryText).toLowerCase(),matches=vendors.filter(vendor=>text(vendor.name).toLowerCase().includes(query)).slice(0,8);vendorMenu.innerHTML=matches.length?matches.map(vendor=>`<button type="button" class="vendor-option" role="option" data-vendor-id="${esc(vendor.id)}"><strong>${esc(vendor.name)}</strong><span>${esc([vendor.tin&&`TIN ${vendor.tin}`,vendor.phone].filter(Boolean).join(' · ')||'Add contact details')}</span></button>`).join(''):`<div class="vendor-empty">No saved vendor found. Continue typing to add a new vendor.</div>`;vendorMenu.querySelectorAll('[data-vendor-id]').forEach(button=>button.onclick=()=>{const vendor=vendors.find(item=>String(item.id)===button.dataset.vendorId);if(!vendor)return;vendorInput.value=vendor.name;fillVendor();vendorMenu.classList.add('hidden');vendorInput.setAttribute('aria-expanded','false')})};
 const openVendorMenu=(queryText='')=>{renderVendorMenu(queryText);vendorMenu.classList.remove('hidden');vendorInput.setAttribute('aria-expanded','true')};
 vendorInput.addEventListener('input',()=>{fillVendor();openVendorMenu(vendorInput.value)});vendorInput.addEventListener('focus',()=>openVendorMenu(vendorInput.value));vendorInput.addEventListener('change',fillVendor);
 vendorToggle.onclick=()=>vendorMenu.classList.contains('hidden')?openVendorMenu(''):(vendorMenu.classList.add('hidden'),vendorInput.setAttribute('aria-expanded','false'));
 vendorPicker.addEventListener('focusout',()=>setTimeout(()=>{if(!vendorPicker.contains(document.activeElement)){vendorMenu.classList.add('hidden');vendorInput.setAttribute('aria-expanded','false')}},0));
 if(vendorVal(editing))fillVendor();

 const updateTotals=()=>{
   const calculated=state.items.map(baseInfo);
   byId('grandTotal').textContent=money(calculated.reduce((sum,item)=>sum+item.line_total,0));
  };
 const updateRowMetrics=(row,index)=>{
  const calc=baseInfo(state.items[index]);
  const unitRate=row.querySelector('[data-m="rate"]');
  const rateLabel=row.querySelector('[data-m="rate-label"]');
  const baseLabel=row.querySelector('[data-m="base-label"]');
  const baseTotal=row.querySelector('[data-m="base-total"]');
  const smallLabel=row.querySelector('[data-m="small-label"]');
  const smallRate=row.querySelector('[data-m="small-rate"]');
  if(unitRate)unitRate.textContent=money(calc.purchase_rate);
   if(rateLabel)rateLabel.textContent=purchaseRateLabel(state.items[index].unit);
  if(baseLabel)baseLabel.textContent=calc.label;
  if(baseTotal)baseTotal.textContent=`${calc.total_base.toLocaleString()} ${calc.small_unit}`;
  if(smallLabel)smallLabel.textContent=`Per ${calc.small_unit}`;
  if(smallRate)smallRate.textContent=preciseRateMoney(calc.small_rate);
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
  byId('itemRows').innerHTML=state.items.map((item,index)=>{const calc=baseInfo(item);return `<article class="card" data-row="${index}" style="box-shadow:none"><div class="form-grid"><label>Item<input class="field" data-f="product" value="${esc(item.product)}" required></label><label>Packing<input class="field" data-f="pack_format" value="${esc(item.pack_format)}" placeholder="10x500g"></label><label>Unit<select class="field" data-f="unit">${units.map(unit=>`<option ${unit===item.unit?'selected':''}>${unit}</option>`).join('')}</select></label><label>QTY<input class="field" data-f="qty" type="number" min="0" step="0.01" value="${item.qty}"></label><label>Row total<input class="field" data-f="rate" type="number" min="0" step="0.01" value="${item.rate}"></label><label>GST %<input class="field" data-f="gst" type="number" min="0" step="0.01" value="${item.gst}"></label></div><div class="metrics" style="margin-top:12px"><article class="metric"><small data-m="rate-label">${purchaseRateLabel(item.unit)}</small><strong data-m="rate">${money(calc.purchase_rate)}</strong></article><article class="metric"><small data-m="base-label">${calc.label}</small><strong data-m="base-total">${calc.total_base.toLocaleString()} ${calc.small_unit}</strong></article><article class="metric"><small data-m="small-label">Per ${calc.small_unit}</small><strong data-m="small-rate">${preciseRateMoney(calc.small_rate)}</strong></article></div><div class="actions"><button class="btn danger small" data-remove="${index}" type="button">Delete row</button></div></article>`}).join('');
  bindRows();
  updateTotals();
 };
 byId('addRow').onclick=()=>{state.items.push(emptyItem());draw()};draw();
 form.onsubmit=async event=>{event.preventDefault();const items=state.items.map(baseInfo).filter(item=>text(item.product));if(!items.length){byId('saveNotice').textContent='Add at least one item.';return}const button=byId('saveBill');button.disabled=true;byId('saveNotice').textContent=editing?'Updating…':'Saving…';try{const vendor=await saveVendor(form,vendors),subtotal=items.reduce((sum,item)=>sum+item.subtotal,0),gst=items.reduce((sum,item)=>sum+item.gst_amount,0),total=subtotal+gst,fd=new FormData(form),payload={bill_date:fd.get('bill_date'),bill_day:fd.get('bill_date'),bill_no:text(fd.get('bill_no')),vendor:text(fd.get('vendor')),vendor_id:vendor?.id||null,tin:text(fd.get('tin')),amount:String(total.toFixed(2)),subtotal,net_amount:subtotal,gst_total:gst,payment_status:fd.get('payment_status'),payment_method:fd.get('payment_method')||null,notes:text(fd.get('notes')),items,user_id:state.user?.id||null,updated_at:new Date().toISOString(),updated_by:state.user?.id||null};const result=editing?await db.from(TABLE).update(payload).eq('id',editing.id).select():await db.from(TABLE).insert(payload).select();if(result.error)throw result.error;state.editing=null;await reloadBillsNow();window.__WS_LAST_SAVED_BILL__=result.data?.[0]||null;show('bills')}catch(error){byId('saveNotice').textContent=error.message||'Save failed'}finally{button.disabled=false}};
};

window.renderVendors=async()=>{const vendors=await loadVendors();const totals=new Map();all().forEach(row=>{const name=text(vendorVal(row)).toLowerCase();if(!name)return;const current=totals.get(name)||{count:0,total:0};current.count++;current.total+=amountVal(row);totals.set(name,current)});byId('content').innerHTML=head('Vendors',`${vendors.length} vendors`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>TIN</th><th>Phone</th><th>Email</th><th>Bills</th><th>Total</th></tr></thead><tbody>${vendors.map(vendor=>{const total=totals.get(text(vendor.name).toLowerCase())||{count:0,total:0};return`<tr><td>${esc(vendor.name)}</td><td>${esc(vendor.tin||'-')}</td><td>${esc(vendor.phone||'-')}</td><td>${esc(vendor.email||'-')}</td><td>${total.count}</td><td>${money(total.total)}</td></tr>`}).join('')}</tbody></table></div></section>`};
window.renderMobileDemo=()=>{
 const sampleRows=all().slice(0,4);
 const top=title=>'<header class="preview-topbar"><button type="button" aria-label="Menu">☰</button><strong>'+esc(title)+'</strong><span>Admin</span></header>';
 const newBill=()=>top('Add bill')+'<main class="preview-body"><section class="preview-card"><div class="preview-grid"><label>Bill date<input value="'+esc(today())+'" readonly></label><label>Vendor<input placeholder="Select or enter vendor" readonly></label><label>TIN<input placeholder="Auto-filled when available" readonly></label><label>Mobile<input placeholder="Auto-filled when available" readonly></label></div></section><section class="preview-card"><div class="preview-section-title"><strong>Bill item</strong><button type="button">Add row</button></div><div class="preview-grid"><label>Item<input placeholder="Product name" readonly></label><label>Packing<input placeholder="24 × 500 g" readonly></label><label>Unit<select disabled><option>Case</option></select></label><label>Quantity<input value="1" readonly></label><label>Row total<input placeholder="0.00" readonly></label></div><div class="preview-rate-row"><span>Case rate</span><strong>MVR 0.000</strong><span>Rate per g</span><strong>MVR 0.00000</strong></div></section><section class="preview-total"><span>Bill total</span><strong>MVR 0.00</strong><button type="button">Save bill</button></section></main>';
 const bills=()=>top('Bills')+'<main class="preview-body"><div class="preview-filter">Search bills or vendors</div><section class="preview-card preview-list">'+(sampleRows.length?sampleRows.map(row=>'<article><strong>'+esc(vendorVal(row)||'Vendor')+'</strong><span>'+esc(iso(dateVal(row))||'-')+'</span><b>'+money(amountVal(row))+'</b></article>').join(''):'<div class="preview-empty">Your saved bills appear here.</div>')+'</section></main>';
 const rates=()=>top('Rates')+'<main class="preview-body"><section class="preview-card preview-list">'+(sampleRows.length?sampleRows.map(row=>'<article><strong>'+esc(vendorVal(row)||'Rate item')+'</strong><span>Current saved rate</span><b>'+money(amountVal(row))+'</b></article>').join(''):'<div class="preview-empty">Save bill items to compare vendor rates.</div>')+'</section></main>';
 const renderPreview=view=>{const stage=byId('mobilePreviewStage');stage.innerHTML=view==='bills'?bills():view==='rates'?rates():newBill()};
 byId('content').innerHTML=head('Responsive layout demo','Stable Phone and Tablet layout preview')+'<section class="mobile-demo"><div class="mobile-demo-controls"><button class="btn secondary small active" type="button" data-preview-view="new">New Bill</button><button class="btn secondary small" type="button" data-preview-view="bills">Bills</button><button class="btn secondary small" type="button" data-preview-view="rates">Rates</button></div><div class="mobile-demo-controls"><button class="btn secondary small active" type="button" data-preview-device="phone">Phone · 390px</button><button class="btn secondary small" type="button" data-preview-device="tablet">Tablet · 768px</button></div><div class="device-frame preview-device phone-frame" id="mobileDeviceFrame"><div class="phone-speaker"></div><div id="mobilePreviewStage"></div></div></section>';
 renderPreview('new');
 document.querySelectorAll('[data-preview-view]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-preview-view]').forEach(item=>item.classList.toggle('active',item===button));renderPreview(button.dataset.previewView)});
 document.querySelectorAll('[data-preview-device]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-preview-device]').forEach(item=>item.classList.toggle('active',item===button));const device=byId('mobileDeviceFrame');device.classList.toggle('tablet-frame',button.dataset.previewDevice==='tablet');device.classList.toggle('phone-frame',button.dataset.previewDevice!=='tablet')});
};

window.renderRates=()=>{
 const rateMoney=value=>'MVR '+num(value).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5});
 const displayProduct=value=>text(value).toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());
 const records=[];
 all().forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(raw=>{
  const item=baseInfo(itemFromSaved(raw)),product=text(item.product),supplier=text(vendorVal(bill))||'Unknown supplier',billDate=iso(dateVal(bill));
  if(product&&item.total_base>0)records.push({product,supplier,billDate,savedAt:text(val(bill,'created_at','createdAt','updated_at')),unit:item.unit,purchaseRate:item.purchase_rate,baseUnit:item.small_unit,baseRate:item.small_rate,key:product.toLowerCase()+'|'+item.small_unit});
 }));
 const groups=new Map();records.forEach(record=>{const list=groups.get(record.key)||[];list.push(record);groups.set(record.key,list)});
 const products=[...groups.values()].map(list=>{
  list.sort((a,b)=>(String(b.billDate)+'|'+String(b.savedAt)).localeCompare(String(a.billDate)+'|'+String(a.savedAt)));
  const latest=list[0],previous=list[1]||null;
  const suppliers=new Map();list.forEach(record=>{if(!suppliers.has(record.supplier))suppliers.set(record.supplier,record)});
  const lowest=[...suppliers.values()].sort((a,b)=>a.baseRate-b.baseRate)[0]||latest;
  const change=previous&&previous.baseRate>0?(latest.baseRate-previous.baseRate)/previous.baseRate:0;
  return{latest,previous,lowest,change,purchases:list.slice(0,4),purchaseCount:list.length,supplierCount:suppliers.size};
 }).sort((a,b)=>b.change-a.change||a.latest.product.localeCompare(b.latest.product));
 const increased=products.filter(product=>product.change>0),best=products.slice().sort((a,b)=>a.lowest.baseRate-b.lowest.baseRate)[0];
 const purchaseCard=(purchase,index)=>'<article class="rate-offer '+(index===0?'rate-offer-latest':'')+'"><span class="rate-offer-label">'+(index===0?'Latest purchase':'Earlier purchase')+'</span><h4>'+esc(purchase.supplier)+'</h4><div class="rate-offer-meta"><span>Bill date</span><strong>'+esc(purchase.billDate||'Not recorded')+'</strong></div><div class="rate-offer-values"><div><span>Purchase value</span><strong>'+money(purchase.purchaseRate)+'</strong><small>'+esc(purchaseRateLabel(purchase.unit))+'</small></div><div><span>Normalized rate</span><strong>'+rateMoney(purchase.baseRate)+'</strong><small>Per '+esc(purchase.baseUnit)+'</small></div></div></article>';
 const cards=products.map(product=>{
  const latest=product.latest,lowest=product.lowest,up=product.change>0;
  const status=product.previous?(up?'<span class="rate-status rate-status-up">▲ '+Math.abs(product.change*100).toFixed(1)+'% higher than previous</span>':'<span class="rate-status rate-status-down">✓ No increase</span>'):'<span class="rate-status">First saved purchase</span>';
  const saving=Math.max(0,latest.baseRate-lowest.baseRate);
  return '<section class="rate-product-card '+(up?'rate-product-alert':'')+'"><header class="rate-product-head"><div><h3>'+esc(displayProduct(latest.product))+'</h3><p>'+product.purchaseCount+' purchase'+(product.purchaseCount===1?'':'s')+' · '+product.supplierCount+' supplier'+(product.supplierCount===1?'':'s')+' · Compared per '+esc(latest.baseUnit)+'</p></div>'+status+'</header><div class="rate-offer-grid">'+product.purchases.map(purchaseCard).join('')+'</div></section>';
 }).join('');
 const overview='<section class="rate-overview"><article class="rate-overview-card"><span>Products tracked</span><strong>'+products.length+'</strong><small>With saved purchase rates</small></article><article class="rate-overview-card '+(increased.length?'rate-overview-alert':'')+'"><span>Prices increased</span><strong>'+increased.length+'</strong><small>Compared with previous purchase</small></article><article class="rate-overview-card rate-overview-best"><span>Lowest recorded rate</span><strong>'+(best?rateMoney(best.lowest.baseRate):'—')+'</strong><small>'+(best?esc(best.lowest.supplier):'Save a bill to compare')+'</small></article></section>';
 byId('content').innerHTML=head('Rates','Supplier purchase comparison and lowest recorded prices')+overview+(cards?'<section class="rate-product-grid">'+cards+'</section>':'<section class="card"><div class="empty">Save bill items to build supplier rate comparisons.</div></section>');
};

window.renderProducts=()=>{const map=new Map();all().forEach(row=>(row.items||[]).forEach(item=>{const name=text(val(item,'product','description'));if(!name)return;const current=map.get(name)||{name,unit:val(item,'unit'),qty:0,total:0};current.qty+=num(val(item,'qty'));current.total+=num(val(item,'line_total'));map.set(name,current)}));const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));byId('content').innerHTML=head('Products',`${list.length} products`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Unit</th><th>Quantity</th><th>Total</th></tr></thead><tbody>${list.map(product=>`<tr><td>${esc(product.name)}</td><td>${esc(product.unit||'-')}</td><td>${product.qty.toLocaleString()}</td><td>${money(product.total)}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderPrices=()=>{const list=[];all().forEach(row=>(row.items||[]).forEach(item=>list.push({...item,vendor:vendorVal(row),date:dateVal(row)})));byId('content').innerHTML=head('Price Book',`${list.length} rates`)+`<section class="card"><div class="table-wrap"><table><thead><tr><th>Product</th><th>Packing</th><th>Unit</th><th>Rate</th><th>Per G/ML/PCS</th><th>Vendor</th><th>Date</th></tr></thead><tbody>${list.slice(0,500).map(item=>`<tr><td>${esc(item.product||'-')}</td><td>${esc(item.pack_format||'-')}</td><td>${esc(item.unit||'-')}</td><td>${money(item.rate)}</td><td>${money(item.small_rate)}</td><td>${esc(item.vendor||'-')}</td><td>${esc(iso(item.date)||'-')}</td></tr>`).join('')}</tbody></table></div></section>`};
window.renderReports=()=>{const list=all(),year=today().slice(0,4),month=today().slice(0,7),yearRows=list.filter(row=>iso(dateVal(row)).startsWith(year)),monthRows=list.filter(row=>iso(dateVal(row)).startsWith(month));byId('content').innerHTML=head('Reports')+`<section class="metrics"><article class="metric"><small>This year</small><strong>${money(yearRows.reduce((sum,row)=>sum+amountVal(row),0))}</strong></article><article class="metric"><small>This month</small><strong>${money(monthRows.reduce((sum,row)=>sum+amountVal(row),0))}</strong></article><article class="metric"><small>Year bills</small><strong>${yearRows.length}</strong></article><article class="metric"><small>Month bills</small><strong>${monthRows.length}</strong></article></section>`};
window.renderSettings=()=>{byId('content').innerHTML=head('Settings')+`<section class="card"><div class="form-grid"><div><small>Role</small><strong>${esc(state.role)}</strong></div><div><small>User</small><strong>${esc(state.user?.email||'-')}</strong></div><div><small>Database</small><strong>${esc(window.__WS_DB_STATUS__?.status||'Unknown')}</strong></div><div><small>Records</small><strong>${all().length}</strong></div></div></section>`};
window.renderAdmin=async()=>{
 if(state.role!=='admin'){byId('content').innerHTML=head('Admin & users','Access restricted')+'<section class="card"><div class="empty">Administrator access is required.</div></section>';return}
 byId('content').innerHTML=head('Admin & users','Access, roles, and workspace activity')+'<section class="card"><div class="empty">Loading workspace members…</div></section>';
 try{
  const result=await db.rpc('admin_user_overview');if(result.error)throw result.error;
  const users=Array.isArray(result.data)?result.data:[],now=Date.now(),online=users.filter(user=>user.is_online&&user.last_seen_at&&(now-new Date(user.last_seen_at).getTime())<600000).length;
  const member=user=>'<article class="member-card" data-user="'+esc(user.user_id||'')+'"><div class="member-card-top"><div class="member-avatar">'+esc((user.display_name||user.email||'?').slice(0,1).toUpperCase())+'</div><div class="member-identify"><strong>'+esc(user.display_name||user.email||'Unnamed user')+'</strong><span>'+esc(user.email||'No email address')+'</span></div><span class="member-live '+(user.is_online?'is-online':'')+'">'+(user.is_online?'Online':'Offline')+'</span></div><div class="member-controls"><label>Access role<select class="field" data-role>'+['admin','manager','staff','readonly'].map(role=>'<option value="'+role+'" '+(role===text(user.role).toLowerCase()?'selected':'')+'>'+role+'</option>').join('')+'</select></label><label>Account status<select class="field" data-active><option value="true" '+(user.is_active!==false?'selected':'')+'>Active</option><option value="false" '+(user.is_active===false?'selected':'')+'>Disabled</option></select></label></div><footer><span>Last page: '+esc(user.current_view||'None')+'</span><span>'+esc(user.last_seen_at?new Date(user.last_seen_at).toLocaleString():'No recent activity')+'</span><button class="btn secondary small" data-save-user>Save</button></footer></article>';
  byId('content').innerHTML=head('Admin & users','Access, roles, and workspace activity')+'<section class="admin-hero"><div><span class="command-eyebrow">Workspace access</span><h2>Manage your procurement team</h2><p>Set roles, disable access, and check who is currently active.</p></div><div class="admin-hero-stats"><div><strong>'+users.length+'</strong><span>Members</span></div><div><strong>'+online+'</strong><span>Online now</span></div><div><strong>'+users.filter(user=>text(user.role).toLowerCase()==='admin').length+'</strong><span>Administrators</span></div></div></section><section class="member-grid">'+(users.length?users.map(member).join(''):'<div class="empty card">No user records returned.</div>')+'</section>';
  byId('content').querySelectorAll('[data-save-user]').forEach(button=>button.onclick=async()=>{const card=button.closest('[data-user]');if(!card)return;button.disabled=true;button.textContent='Saving…';const update=await db.rpc('admin_update_user_role',{target_user:card.dataset.user,new_role:card.querySelector('[data-role]').value,new_active:card.querySelector('[data-active]').value==='true',new_display_name:null});button.disabled=false;if(update.error){button.textContent='Retry';alert('User update failed: '+update.error.message);return}button.textContent='Saved';setTimeout(()=>button.textContent='Save',1200)});
 }catch(error){byId('content').innerHTML=head('Admin & users','User management is unavailable')+'<section class="card"><div class="empty">The user-management service did not respond: '+esc(error.message||String(error))+'</div></section>'}
};

window.__WS_RENDERERS__={dashboard:renderDashboard,bills:renderBills,new:renderNewBill,rates:renderRates,mobile:renderMobileDemo,products:renderProducts,vendors:renderVendors,prices:renderPrices,reports:renderReports,settings:renderSettings,admin:renderAdmin};
window.exportCsv=()=>{const list=state.filtered||all(),csv=[['Date','Bill No','Vendor','Amount','Status'],...list.map(row=>[iso(dateVal(row)),val(row,'bill_no','Bill No'),vendorVal(row),amountVal(row),statusVal(row)])].map(values=>values.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\n'),link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download=`bills-${today()}.csv`;link.click();URL.revokeObjectURL(link.href)};
window.show=view=>{const valid=['dashboard','bills','new','products','vendors','prices','reports','settings'];view=valid.includes(view)?view:'dashboard';state.view=view;document.querySelectorAll('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));if(byId('topTitle'))byId('topTitle').textContent={dashboard:'Dashboard',bills:'Bills',new:'New Bill',products:'Products',vendors:'Vendors',prices:'Price Book',reports:'Reports',settings:'Settings'}[view];const renderer=window.__WS_RENDERERS__[view];Promise.resolve().then(()=>renderer()).catch(error=>{console.error(error);byId('content').innerHTML=head('Error',error.message)})};
byId('menuBtn')?.addEventListener('click',()=>byId('sidebar')?.classList.toggle('open'));
window.__WS_CORE__={version:VERSION};
})();