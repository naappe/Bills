(()=>{
'use strict';
const VERSION=5;
const text=v=>String(v??'').trim();
const safe=v=>typeof esc==='function'?esc(v):text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null)return row[key]}return''};
const dateOf=row=>value(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const vendorOf=row=>text(value(row,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown shop';
const dateNumber=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?0:d.getTime()};
const dateText=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?safe(v):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const money2=v=>`MVR ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const moneyRate=v=>Number.isFinite(Number(v))?`MVR ${Number(v).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5})}`:'—';
let products=[];
let sortMode='newest';
const expanded=new Set();

function installStyles(){
 if(document.getElementById('ratesProfileCardStyles'))document.getElementById('ratesProfileCardStyles').remove();
 const style=document.createElement('style');
 style.id='ratesProfileCardStyles';
 style.textContent=`
 .rates-product-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-auto-rows:1fr;gap:16px!important;align-items:stretch}
 .rates-product-card{position:relative;display:flex;flex-direction:column;min-width:0;height:100%;min-height:214px;background:#fff;border:1px solid var(--line);border-top:3px solid var(--gold);border-radius:14px;box-shadow:0 2px 8px rgba(15,30,76,.045);overflow:hidden;transition:transform .16s ease,box-shadow .16s ease}
 .rates-product-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,30,76,.08)}
 .price-card-head{display:grid;grid-template-columns:44px minmax(0,1fr);gap:11px;align-items:center;min-height:76px;padding:14px 15px}
 .price-card-avatar{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#f4f6f8;border:1px solid var(--line);color:var(--header);font-size:15px;font-weight:900;text-transform:uppercase}
 .price-card-copy{min-width:0}.price-card-copy h2{margin:0;min-height:38px;font-size:15px;line-height:1.25;color:var(--header);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
 .price-card-shop{display:block;margin-top:3px;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price-card-shop strong{color:var(--text);font-size:11px;font-weight:700}
 .price-card-prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:72px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff}
 .price-card-price{display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0;padding:11px 10px;background:#fff}.price-card-price+.price-card-price{border-left:1px solid var(--line)}
 .price-card-price span{color:var(--muted);font-size:9px;font-weight:700}.price-card-price strong{color:var(--header);font-size:12px;line-height:1.22;overflow-wrap:anywhere}
 .price-card-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:56px;margin-top:auto;padding:11px 15px;background:#f8faf9}
 .price-card-meta div{display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0}.price-card-meta span{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:800}.price-card-meta strong{font-size:10px;color:var(--header);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .price-card-expand{width:100%;min-height:34px;border:0;border-top:1px solid var(--line);background:#fff;color:var(--blue);font:750 11px var(--font-primary);cursor:pointer}.price-card-expand:hover{background:#f8fafc}
 .price-card-rates{display:grid;border-top:1px solid var(--line);background:#fff}.price-card-rate{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px 15px;border-bottom:1px solid var(--line)}.price-card-rate:last-child{border-bottom:0}
 .price-card-rate div{min-width:0}.price-card-rate strong{display:block;color:var(--header);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price-card-rate small{display:block;margin-top:1px;color:var(--muted);font-size:9px}.price-card-rate>span{color:var(--header);font-size:11px;font-weight:800;white-space:nowrap}
 @media(max-width:1350px){.rates-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
 @media(max-width:1050px){.rates-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
 @media(max-width:680px){.rates-product-grid{grid-template-columns:1fr!important}.rates-toolbar{grid-template-columns:1fr!important}.rates-product-card{min-height:0}}
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
function calculate(item){
 const qty=Number(value(item,'qty','quantity')||1)||1;
 const rate=Number(value(item,'rate','pack_rate','unit_rate','line_total')||0)||0;
 const mode=value(item,'rate_mode')==='line_total'?'line_total':'per_unit';
 const total=mode==='line_total'?rate:rate*qty;
 const packText=text(value(item,'pack_format','packing','pack'));
 const pack=parsePack(packText);
 const unit=text(value(item,'unit','purchase_unit')).toLowerCase();
 let pieces=qty,grams=0;
 if(pack){
  pieces=qty*Math.max(1,pack.count);
  if(pack.unit==='kg')grams=qty*pack.count*pack.size*1000;
  if(pack.unit==='g')grams=qty*pack.count*pack.size;
 }else{
  if(unit==='kg')grams=qty*1000;
  if(unit==='g')grams=qty;
  if(unit==='doz')pieces=qty*12;
 }
 return{total,perPiece:pieces>0?total/pieces:null,perGram:grams>0?total/grams:null,pack:packText||text(value(item,'unit','purchase_unit'))||'—'};
}
function collect(){
 const groups=new Map(),rows=Array.isArray(state?.rows)?state.rows:[];
 rows.forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>{
  const name=text(value(item,'product','description','name','item'));if(!name)return;
  const calc=calculate(item),key=name.toLowerCase();
  if(!groups.has(key))groups.set(key,{key,name,purchases:[]});
  groups.get(key).purchases.push({vendor:vendorOf(bill),date:dateOf(bill),billNo:text(value(bill,'bill_no','Bill No'))||'—',...calc});
 }));
 return[...groups.values()].map(group=>{group.purchases.sort((a,b)=>dateNumber(b.date)-dateNumber(a.date));group.latest=group.purchases[0]||null;return group}).sort((a,b)=>a.name.localeCompare(b.name));
}
function productInitials(name){return text(name).split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase()||'P'}
function sortedProducts(list){
 const result=[...list];
 if(sortMode==='lowest')return result.sort((a,b)=>(a.latest?.perGram??Infinity)-(b.latest?.perGram??Infinity));
 if(sortMode==='highest')return result.sort((a,b)=>(b.latest?.perGram??-Infinity)-(a.latest?.perGram??-Infinity));
 if(sortMode==='supplier')return result.sort((a,b)=>(a.latest?.vendor||'').localeCompare(b.latest?.vendor||''));
 return result.sort((a,b)=>dateNumber(b.latest?.date)-dateNumber(a.latest?.date));
}
function rateRows(group){return group.purchases.slice(0,8).map(p=>`<div class="price-card-rate"><div><strong>${safe(p.vendor)}</strong><small>${dateText(p.date)} · ${safe(p.pack)}</small></div><span>${moneyRate(p.perGram)}</span></div>`).join('')}
function renderCard(group){
 const latest=group.latest||{},isOpen=expanded.has(group.key);
 return `<article class="rates-product-card" data-rate-name="${safe(`${group.name} ${group.purchases.map(p=>p.vendor).join(' ')}`.toLowerCase())}" data-rate-key="${safe(group.key)}">
  <div class="price-card-head"><div class="price-card-avatar">${safe(productInitials(group.name))}</div><div class="price-card-copy"><h2>${safe(group.name)}</h2><span class="price-card-shop"><strong>${safe(latest.vendor||'Unknown shop')}</strong></span></div></div>
  <div class="price-card-prices"><div class="price-card-price"><span>Price</span><strong>${money2(latest.total||0)}</strong></div><div class="price-card-price"><span>Price / pcs</span><strong>${moneyRate(latest.perPiece)}</strong></div><div class="price-card-price"><span>Price / g</span><strong>${moneyRate(latest.perGram)}</strong></div></div>
  <div class="price-card-meta"><div><span>Pack</span><strong>${safe(latest.pack||'—')}</strong></div><div><span>Updated</span><strong>${dateText(latest.date)}</strong></div></div>
  ${group.purchases.length>1?`<button class="price-card-expand" type="button" data-rates-toggle="${safe(group.key)}">${isOpen?'Hide prices':`View ${group.purchases.length} prices`}</button>${isOpen?`<div class="price-card-rates">${rateRows(group)}</div>`:''}`:''}
 </article>`;
}
function drawCards(){const grid=document.getElementById('ratesGrid');if(!grid)return;grid.innerHTML=sortedProducts(products).map(renderCard).join('')||'<div class="card"><div class="empty">No product rate data is available yet.</div></div>';applySearch()}
function applySearch(){const input=document.getElementById('ratesSearch'),count=document.getElementById('ratesCount'),q=text(input?.value).toLowerCase();let shown=0;document.querySelectorAll('.rates-product-card').forEach(card=>{const visible=!q||card.dataset.rateName.includes(q);card.hidden=!visible;if(visible)shown++});if(count)count.textContent=`${shown} product${shown===1?'':'s'}`}
window.renderRates=()=>{
 installStyles();products=collect();expanded.clear();
 const content=document.getElementById('content');if(!content)return;
 content.innerHTML=`<section class="rates-page"><header class="page-head"><div><h1>Price Intelligence</h1><div class="muted">Current product prices by shop and unit.</div></div></header><section class="rates-toolbar"><label class="rates-search"><i class="fas fa-search"></i><input id="ratesSearch" type="search" placeholder="Search item or shop"></label><label class="rates-sort">Sort<select id="ratesSort"><option value="newest">Newest</option><option value="lowest">Lowest price / g</option><option value="highest">Highest price / g</option><option value="supplier">Shop name</option></select></label><span id="ratesCount">${products.length} products</span></section><section class="rates-product-grid" id="ratesGrid"></section></section>`;
 drawCards();
 document.getElementById('ratesSearch')?.addEventListener('input',applySearch);
 document.getElementById('ratesSort')?.addEventListener('change',event=>{sortMode=event.target.value;drawCards()});
 document.getElementById('ratesGrid')?.addEventListener('click',event=>{const button=event.target.closest('[data-rates-toggle]');if(!button)return;const key=button.dataset.ratesToggle;expanded.has(key)?expanded.delete(key):expanded.add(key);drawCards()});
};
window.__WS_RATES_PAGE__={version:VERSION};
})();