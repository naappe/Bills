(()=>{
'use strict';
const text=v=>String(v??'').trim();
const safe=v=>typeof esc==='function'?esc(v):text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=v=>typeof money==='function'?money(v):`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const dateOf=row=>value(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const vendorOf=row=>text(value(row,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown supplier';
const dateText=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?safe(v):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const precise=v=>`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5})}`;

function parsePack(raw){
 const s=text(raw).toLowerCase().replace(/\s+/g,'');
 let m=s.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(m)return{count:Number(m[1]),size:Number(m[2]),unit:m[3].toLowerCase()==='pc'?'pcs':m[3].toLowerCase()};
 m=s.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);
 if(m)return{count:1,size:Number(m[1]),unit:m[2].toLowerCase()==='pc'?'pcs':m[2].toLowerCase()};
 return null;
}
function normalized(item){
 const qty=Number(value(item,'qty','quantity')||1)||1;
 const rate=Number(value(item,'rate','pack_rate','unit_rate','line_total')||0)||0;
 const mode=value(item,'rate_mode')==='line_total'?'line_total':'per_unit';
 const subtotal=mode==='line_total'?rate:rate*qty;
 const pack=parsePack(value(item,'pack_format','packing','pack'));
 const unit=text(value(item,'unit','purchase_unit')).toLowerCase();
 let base=1,label=unit||'unit';
 if(pack){base=pack.count*pack.size;label=pack.unit}
 else if(unit==='kg'){base=1000;label='g'}else if(unit==='l'){base=1000;label='ml'}else if(unit==='doz'){base=12;label='pcs'}
 const totalBase=Math.max(1,qty*base);
 return{subtotal,smallRate:subtotal/totalBase,smallUnit:label};
}
function collect(){
 const groups=new Map();
 const rows=Array.isArray(state?.rows)?state.rows:[];
 rows.forEach(bill=>{
  const items=Array.isArray(bill.items)?bill.items:[];
  items.forEach(item=>{
   const name=text(value(item,'product','description','name','item'));
   if(!name)return;
   const n=normalized(item);
   const key=name.toLowerCase();
   if(!groups.has(key))groups.set(key,{name,purchases:[]});
   groups.get(key).purchases.push({vendor:vendorOf(bill),date:dateOf(bill),billNo:text(value(bill,'bill_no','Bill No'))||'—',purchaseRate:n.subtotal,normalizedRate:n.smallRate,unit:n.smallUnit,pack:text(value(item,'pack_format','packing','pack'))||text(value(item,'unit','purchase_unit'))||'—'});
  });
 });
 return [...groups.values()].map(group=>{
  group.purchases.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  const rates=group.purchases.map(p=>p.normalizedRate).filter(Number.isFinite);
  group.lowest=rates.length?Math.min(...rates):0;group.highest=rates.length?Math.max(...rates):0;
  group.suppliers=new Set(group.purchases.map(p=>p.vendor)).size;
  return group;
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
function renderCard(group){
 const latest=group.purchases[0];
 return `<article class="rates-product-card" data-rate-name="${safe(group.name.toLowerCase())}">
  <header class="rates-product-head"><div><span class="rates-eyebrow">Product</span><h2>${safe(group.name)}</h2><p>${group.purchases.length} purchase${group.purchases.length===1?'':'s'} · ${group.suppliers} supplier${group.suppliers===1?'':'s'} · Compared per ${safe(latest?.unit||'unit')}</p></div><span class="rates-trend ${group.highest>group.lowest?'warning':'stable'}">${group.highest>group.lowest?'Price range':'First saved price'}</span></header>
  <div class="rates-metrics"><div><span>Lowest rate</span><strong>${precise(group.lowest)}</strong><small>Per ${safe(latest?.unit||'unit')}</small></div><div><span>Highest rate</span><strong>${precise(group.highest)}</strong><small>Per ${safe(latest?.unit||'unit')}</small></div><div><span>Latest supplier</span><strong>${safe(latest?.vendor||'—')}</strong><small>${dateText(latest?.date)}</small></div></div>
  <div class="rates-history"><div class="rates-history-head"><span>Supplier</span><span>Bill date</span><span>Purchase value</span><span>Normalized rate</span></div>${group.purchases.slice(0,6).map(p=>`<div class="rates-history-row"><div><strong>${safe(p.vendor)}</strong><small>${safe(p.billNo)}</small></div><span>${dateText(p.date)}</span><div><strong>${cash(p.purchaseRate)}</strong><small>${safe(p.pack)}</small></div><div><strong>${precise(p.normalizedRate)}</strong><small>Per ${safe(p.unit)}</small></div></div>`).join('')}</div>
 </article>`;
}
window.renderRates=()=>{
 const products=collect();
 const increased=products.filter(p=>p.purchases.length>1&&p.purchases[0].normalizedRate>p.purchases[1].normalizedRate).length;
 const best=products.filter(p=>p.lowest>0).sort((a,b)=>a.lowest-b.lowest)[0];
 const content=document.getElementById('content');if(!content)return;
 content.innerHTML=`<section class="rates-page"><header class="page-head"><div><h1>Price Intelligence</h1><div class="muted">Compare supplier purchase rates and identify the lowest recorded prices.</div></div></header>
 <section class="rates-summary"><article><span>Products tracked</span><strong>${products.length}</strong><small>With saved purchase rates</small></article><article><span>Prices increased</span><strong>${increased}</strong><small>Compared with previous purchase</small></article><article><span>Lowest recorded rate</span><strong>${best?precise(best.lowest):'—'}</strong><small>${best?safe(best.name):'No rate data'}</small></article></section>
 <section class="rates-toolbar"><label class="rates-search"><i class="fas fa-search"></i><input id="ratesSearch" type="search" placeholder="Search products or suppliers"></label><span id="ratesCount">${products.length} products</span></section>
 <section class="rates-product-grid" id="ratesGrid">${products.map(renderCard).join('')||'<div class="card"><div class="empty">No product rate data is available yet.</div></div>'}</section></section>`;
 const input=document.getElementById('ratesSearch'),count=document.getElementById('ratesCount');
 if(input)input.oninput=()=>{const q=input.value.trim().toLowerCase();let shown=0;document.querySelectorAll('.rates-product-card').forEach(card=>{const visible=!q||card.textContent.toLowerCase().includes(q);card.hidden=!visible;if(visible)shown++});count.textContent=`${shown} product${shown===1?'':'s'}`};
};
window.__WS_RATES_PAGE__={version:1};
})();