(()=>{
'use strict';
const VERSION=3;
const text=v=>String(v??'').trim();
const safe=v=>typeof esc==='function'?esc(v):text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=v=>typeof money==='function'?money(v):`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const dateOf=row=>value(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const vendorOf=row=>text(value(row,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown supplier';
const dateText=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?safe(v):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const dateNumber=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?0:d.getTime()};
const precise=v=>`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5})}`;
const PAGE_SIZE=3;
let products=[];
let sortMode='newest';
const expanded=new Set();

function installStyles(){
 if(document.getElementById('ratesCompactGridStyles'))return;
 const style=document.createElement('style');
 style.id='ratesCompactGridStyles';
 style.textContent=`
 .rates-product-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:20px!important;align-items:start}
 .rates-product-card{display:flex;flex-direction:column;min-width:0;height:100%;overflow:hidden}
 .rates-product-head{min-height:126px;padding:18px 20px!important;display:flex;flex-direction:column!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important}
 .rates-product-head>div{width:100%}.rates-product-head h2{font-size:18px!important;line-height:1.25!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
 .rates-product-head p{margin-top:5px!important;line-height:1.4!important}.rates-trend{align-self:flex-start!important}
 .rates-metrics{grid-template-columns:1fr!important;gap:0!important}
 .rates-metrics>div{padding:14px 18px!important;min-height:76px!important;border-bottom:1px solid var(--line)}
 .rates-metrics>div:last-child{border-bottom:0}.rates-metrics strong{font-size:15px!important}.rates-metrics small{margin-top:2px}
 .rates-history{border-top:1px solid var(--line)}.rates-history-head{display:none!important}
 .rates-history-body{max-height:none!important;overflow:visible!important}
 .rates-history-row{display:grid!important;grid-template-columns:1fr auto!important;gap:10px!important;min-width:0!important;min-height:0!important;padding:13px 18px!important}
 .rates-history-row>span{display:none!important}.rates-history-row>div:nth-of-type(2){text-align:right}.rates-history-row>div:nth-of-type(2) strong{white-space:nowrap}
 .rates-history-row>div:nth-of-type(2) small{white-space:nowrap}.rates-history-footer{padding:11px 18px!important}
 .rates-card-latest{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 18px;background:var(--surface-soft);border-top:1px solid var(--line)}
 .rates-card-latest div{display:grid;gap:2px;min-width:0}.rates-card-latest span{font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:800;letter-spacing:.04em}.rates-card-latest strong{font-size:12px;color:var(--header);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 @media(max-width:1350px){.rates-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
 @media(max-width:1050px){.rates-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
 @media(max-width:680px){.rates-product-grid{grid-template-columns:1fr!important}.rates-product-head{min-height:auto}.rates-toolbar{grid-template-columns:1fr!important}}
 `;
 document.head.appendChild(style);
}
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
 const groups=new Map(),rows=Array.isArray(state?.rows)?state.rows:[];
 rows.forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>{
  const name=text(value(item,'product','description','name','item'));if(!name)return;
  const n=normalized(item),key=name.toLowerCase();
  if(!groups.has(key))groups.set(key,{key,name,purchases:[]});
  groups.get(key).purchases.push({vendor:vendorOf(bill),date:dateOf(bill),billNo:text(value(bill,'bill_no','Bill No'))||'—',purchaseRate:n.subtotal,normalizedRate:n.smallRate,unit:n.smallUnit,pack:text(value(item,'pack_format','packing','pack'))||text(value(item,'unit','purchase_unit'))||'—'});
 }));
 return [...groups.values()].map(group=>{
  group.purchases.sort((a,b)=>dateNumber(b.date)-dateNumber(a.date));group.latest=group.purchases[0]||null;
  const rates=group.purchases.map(p=>p.normalizedRate).filter(Number.isFinite);
  group.lowest=rates.length?Math.min(...rates):0;group.highest=rates.length?Math.max(...rates):0;group.suppliers=new Set(group.purchases.map(p=>p.vendor)).size;return group;
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
function sortedPurchases(group){
 const list=[...group.purchases];
 if(sortMode==='lowest')return list.sort((a,b)=>a.normalizedRate-b.normalizedRate||dateNumber(b.date)-dateNumber(a.date));
 if(sortMode==='highest')return list.sort((a,b)=>b.normalizedRate-a.normalizedRate||dateNumber(b.date)-dateNumber(a.date));
 if(sortMode==='supplier')return list.sort((a,b)=>a.vendor.localeCompare(b.vendor)||dateNumber(b.date)-dateNumber(a.date));
 return list.sort((a,b)=>dateNumber(b.date)-dateNumber(a.date));
}
function compactRow(p,latest){
 const isLatest=p===latest;
 return `<div class="rates-history-row${isLatest?' is-latest':''}"><div><strong>${safe(p.vendor)}</strong><small>${safe(p.billNo)}${isLatest?' · Latest':''}</small></div><span>${dateText(p.date)}</span><div><strong>${precise(p.normalizedRate)}</strong><small>${safe(p.pack)}</small></div></div>`;
}
function renderCard(group){
 const list=sortedPurchases(group),isExpanded=expanded.has(group.key),visible=isExpanded?list:list.slice(0,PAGE_SIZE),remaining=Math.max(0,list.length-PAGE_SIZE),latest=group.latest;
 return `<article class="rates-product-card" data-rate-name="${safe(group.name.toLowerCase())}" data-rate-key="${safe(group.key)}">
  <header class="rates-product-head"><div><span class="rates-eyebrow">Product</span><h2>${safe(group.name)}</h2><p>${group.purchases.length} purchase${group.purchases.length===1?'':'s'} · ${group.suppliers} supplier${group.suppliers===1?'':'s'} · Per ${safe(latest?.unit||'unit')}</p></div><span class="rates-trend ${group.highest>group.lowest?'warning':'stable'}">${group.highest>group.lowest?'Price range':'First price'}</span></header>
  <div class="rates-metrics"><div><span>Lowest rate</span><strong>${precise(group.lowest)}</strong><small>Per ${safe(latest?.unit||'unit')}</small></div><div><span>Highest rate</span><strong>${precise(group.highest)}</strong><small>Per ${safe(latest?.unit||'unit')}</small></div><div><span>Latest supplier</span><strong>${safe(latest?.vendor||'—')}</strong><small>${dateText(latest?.date)}</small></div></div>
  <div class="rates-card-latest"><div><span>Latest purchase</span><strong>${cash(latest?.purchaseRate||0)}</strong></div><div><span>Pack</span><strong>${safe(latest?.pack||'—')}</strong></div></div>
  <div class="rates-history"><div class="rates-history-body">${visible.map(p=>compactRow(p,latest)).join('')}</div>${list.length>PAGE_SIZE?`<div class="rates-history-footer"><span>${isExpanded?list.length:Math.min(PAGE_SIZE,list.length)} of ${list.length}</span><button class="rates-more" type="button" data-rates-toggle="${safe(group.key)}">${isExpanded?'Show less':`Show ${remaining} more`}</button></div>`:''}</div>
 </article>`;
}
function drawCards(){const grid=document.getElementById('ratesGrid');if(!grid)return;grid.innerHTML=products.map(renderCard).join('')||'<div class="card"><div class="empty">No product rate data is available yet.</div></div>';applySearch()}
function applySearch(){const input=document.getElementById('ratesSearch'),count=document.getElementById('ratesCount'),q=text(input?.value).toLowerCase();let shown=0;document.querySelectorAll('.rates-product-card').forEach(card=>{const visible=!q||card.textContent.toLowerCase().includes(q);card.hidden=!visible;if(visible)shown++});if(count)count.textContent=`${shown} product${shown===1?'':'s'}`}
window.renderRates=()=>{
 installStyles();products=collect();expanded.clear();
 const increased=products.filter(p=>p.purchases.length>1&&p.purchases[0].normalizedRate>p.purchases[1].normalizedRate).length;
 const best=products.filter(p=>p.lowest>0).sort((a,b)=>a.lowest-b.lowest)[0],content=document.getElementById('content');if(!content)return;
 content.innerHTML=`<section class="rates-page"><header class="page-head"><div><h1>Price Intelligence</h1><div class="muted">Compare supplier purchase rates and identify the lowest recorded prices.</div></div></header><section class="rates-summary"><article><span>Products tracked</span><strong>${products.length}</strong><small>With saved purchase rates</small></article><article><span>Prices increased</span><strong>${increased}</strong><small>Compared with previous purchase</small></article><article><span>Lowest recorded rate</span><strong>${best?precise(best.lowest):'—'}</strong><small>${best?safe(best.name):'No rate data'}</small></article></section><section class="rates-toolbar"><label class="rates-search"><i class="fas fa-search"></i><input id="ratesSearch" type="search" placeholder="Search products or suppliers"></label><label class="rates-sort">Sort rates<select id="ratesSort"><option value="newest">Newest first</option><option value="lowest">Lowest rate</option><option value="highest">Highest rate</option><option value="supplier">Supplier name</option></select></label><span id="ratesCount">${products.length} products</span></section><section class="rates-product-grid" id="ratesGrid"></section></section>`;
 drawCards();
 document.getElementById('ratesSearch')?.addEventListener('input',applySearch);
 document.getElementById('ratesSort')?.addEventListener('change',event=>{sortMode=event.target.value;drawCards()});
 document.getElementById('ratesGrid')?.addEventListener('click',event=>{const button=event.target.closest('[data-rates-toggle]');if(!button)return;const key=button.dataset.ratesToggle;expanded.has(key)?expanded.delete(key):expanded.add(key);drawCards()});
};
window.__WS_RATES_PAGE__={version:VERSION};
})();