(()=>{
'use strict';
const VERSION=6;
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

function installStyles(){
 const previous=document.getElementById('ratesProfileCardStyles');if(previous)previous.remove();
 const style=document.createElement('style');style.id='ratesProfileCardStyles';style.textContent=`
 .rates-page{display:grid;gap:20px}.rates-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 190px auto;gap:14px;align-items:end;padding:16px 20px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-sm)}
 .rates-search{position:relative}.rates-search i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--pink)}.rates-search input{padding-left:40px}.rates-sort{display:grid;gap:5px;font-size:11px;color:var(--muted)}.rates-toolbar>span{align-self:center;font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap}
 .rates-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.rates-kpi{padding:18px 20px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-sm)}.rates-kpi span{display:block;font-size:11px;color:var(--muted);font-weight:700}.rates-kpi strong{display:block;margin-top:5px;color:var(--header);font-size:22px;line-height:1.2}.rates-kpi small{display:block;margin-top:4px;color:var(--muted);font-size:10px}
 .rates-product-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-auto-rows:1fr;gap:18px!important;align-items:stretch}
 .rates-product-card{display:flex;flex-direction:column;min-width:0;height:100%;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.04);overflow:hidden;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.rates-product-card:hover{transform:translateY(-3px);box-shadow:0 8px 22px rgba(15,30,76,.08);border-color:#d8dee7}
 .price-card-image{position:relative;height:126px;display:grid;place-items:center;background:#f7f8fa;border-bottom:1px solid var(--line);overflow:hidden}.price-card-emoji{font-size:52px;line-height:1;filter:saturate(.9)}.price-card-tag{position:absolute;top:9px;right:9px;padding:3px 9px;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--header);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
 .price-card-info{display:flex;flex-direction:column;flex:1;padding:14px 16px}.price-card-title{min-height:40px;margin:0;color:var(--header);font-size:15px;line-height:1.25;font-weight:800;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.price-card-shop{margin-top:3px;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price-card-shop i{margin-right:5px;color:var(--gold-dark)}
 .price-card-main{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line)}.price-card-main span{display:block;color:var(--muted);font-size:10px;font-weight:700}.price-card-main strong{display:block;margin-top:2px;color:var(--header);font-size:19px;line-height:1.15}.price-card-main small{color:var(--muted);font-size:10px;white-space:nowrap}
 .price-card-units{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.price-card-unit{padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:#fbfcfd}.price-card-unit span{display:block;color:var(--muted);font-size:9px;font-weight:700}.price-card-unit strong{display:block;margin-top:2px;color:var(--header);font-size:12px;overflow-wrap:anywhere}
 .price-card-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto;padding-top:13px;color:var(--muted);font-size:10px}.price-card-footer span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.price-card-footer i{margin-right:4px;color:var(--gold-dark)}
 @media(max-width:1400px){.rates-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.rates-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:1000px){.rates-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.rates-toolbar{grid-template-columns:1fr 180px}.rates-toolbar>span{grid-column:1/-1}}
 @media(max-width:680px){.rates-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.rates-toolbar{grid-template-columns:1fr}.rates-kpis{grid-template-columns:1fr 1fr;gap:10px}.price-card-image{height:96px}.price-card-emoji{font-size:38px}.price-card-info{padding:11px}.price-card-main strong{font-size:16px}.price-card-units{grid-template-columns:1fr;gap:7px}}
 `;document.head.appendChild(style)
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
 if(pack){pieces=qty*Math.max(1,pack.count);if(pack.unit==='kg')grams=qty*pack.count*pack.size*1000;if(pack.unit==='g')grams=qty*pack.count*pack.size}
 else{if(unit==='kg')grams=qty*1000;if(unit==='g')grams=qty;if(unit==='doz')pieces=qty*12}
 return{total,perPiece:pieces>0?total/pieces:null,perGram:grams>0?total/grams:null,pack:packText||text(value(item,'unit','purchase_unit'))||'—'};
}
function collect(){
 const groups=new Map(),rows=Array.isArray(state?.rows)?state.rows:[];
 rows.forEach(bill=>(Array.isArray(bill.items)?bill.items:[]).forEach(item=>{
  const name=text(value(item,'product','description','name','item'));if(!name)return;
  const calc=calculate(item),key=name.toLowerCase();if(!groups.has(key))groups.set(key,{key,name,purchases:[]});
  groups.get(key).purchases.push({vendor:vendorOf(bill),date:dateOf(bill),billNo:text(value(bill,'bill_no','Bill No'))||'—',...calc});
 }));
 return[...groups.values()].map(group=>{group.purchases.sort((a,b)=>dateNumber(b.date)-dateNumber(a.date));group.latest=group.purchases[0]||null;return group}).sort((a,b)=>a.name.localeCompare(b.name));
}
function productEmoji(name){
 const n=text(name).toLowerCase();
 if(/chicken|breast|meat|beef|mutton/.test(n))return'🥩';
 if(/tomato/.test(n))return'🍅';if(/fish|tuna/.test(n))return'🐟';if(/rice/.test(n))return'🍚';if(/flour/.test(n))return'🌾';
 if(/milk/.test(n))return'🥛';if(/egg/.test(n))return'🥚';if(/oil/.test(n))return'🫗';if(/onion/.test(n))return'🧅';if(/potato/.test(n))return'🥔';
 if(/apple/.test(n))return'🍎';if(/banana/.test(n))return'🍌';if(/orange/.test(n))return'🍊';if(/water|drink|juice/.test(n))return'🥤';
 if(/soap|clean|detergent/.test(n))return'🧼';if(/paper|tissue/.test(n))return'🧻';return'📦';
}
function sortedProducts(list){
 const result=[...list];
 if(sortMode==='lowest')return result.sort((a,b)=>(a.latest?.perGram??Infinity)-(b.latest?.perGram??Infinity));
 if(sortMode==='highest')return result.sort((a,b)=>(b.latest?.perGram??-Infinity)-(a.latest?.perGram??-Infinity));
 if(sortMode==='supplier')return result.sort((a,b)=>(a.latest?.vendor||'').localeCompare(b.latest?.vendor||''));
 return result.sort((a,b)=>dateNumber(b.latest?.date)-dateNumber(a.latest?.date));
}
function renderCard(group){
 const latest=group.latest||{};
 return `<article class="rates-product-card" data-rate-name="${safe(`${group.name} ${group.purchases.map(p=>p.vendor).join(' ')}`.toLowerCase())}">
  <div class="price-card-image"><span class="price-card-emoji" aria-hidden="true">${productEmoji(group.name)}</span><span class="price-card-tag">${group.purchases.length>1?`${group.purchases.length} prices`:'Current'}</span></div>
  <div class="price-card-info"><h2 class="price-card-title">${safe(group.name)}</h2><div class="price-card-shop"><i class="fas fa-building" aria-hidden="true"></i>${safe(latest.vendor||'Unknown shop')}</div>
  <div class="price-card-main"><div><span>Price</span><strong>${money2(latest.total||0)}</strong></div><small>${safe(latest.pack||'—')}</small></div>
  <div class="price-card-units"><div class="price-card-unit"><span>Price / pcs</span><strong>${moneyRate(latest.perPiece)}</strong></div><div class="price-card-unit"><span>Price / g</span><strong>${moneyRate(latest.perGram)}</strong></div></div>
  <div class="price-card-footer"><span><i class="far fa-calendar"></i>${dateText(latest.date)}</span><span>${safe(latest.billNo||'')}</span></div></div>
 </article>`;
}
function drawCards(){const grid=document.getElementById('ratesGrid');if(!grid)return;grid.innerHTML=sortedProducts(products).map(renderCard).join('')||'<div class="card"><div class="empty">No product rate data is available yet.</div></div>';applySearch()}
function applySearch(){const input=document.getElementById('ratesSearch'),count=document.getElementById('ratesCount'),q=text(input?.value).toLowerCase();let shown=0;document.querySelectorAll('.rates-product-card').forEach(card=>{const visible=!q||card.dataset.rateName.includes(q);card.hidden=!visible;if(visible)shown++});if(count)count.textContent=`${shown} product${shown===1?'':'s'}`}
window.renderRates=()=>{
 installStyles();products=collect();
 const current=products.map(p=>p.latest).filter(Boolean);const avg=current.length?current.reduce((s,p)=>s+(p.perGram||0),0)/current.length:0;const shops=new Set(current.map(p=>p.vendor)).size;
 const content=document.getElementById('content');if(!content)return;
 content.innerHTML=`<section class="rates-page"><header class="page-head"><div><h1>Price Intelligence</h1><div class="muted">Track product rates and vendor pricing.</div></div></header>
 <section class="rates-kpis"><article class="rates-kpi"><span>Items tracked</span><strong>${products.length}</strong><small>Products with saved prices</small></article><article class="rates-kpi"><span>Shops</span><strong>${shops}</strong><small>Current suppliers</small></article><article class="rates-kpi"><span>Average price / g</span><strong>${moneyRate(avg)}</strong><small>Across comparable items</small></article><article class="rates-kpi"><span>Latest updates</span><strong>${current.length}</strong><small>Current price records</small></article></section>
 <section class="rates-toolbar"><label class="rates-search"><i class="fas fa-search"></i><input id="ratesSearch" type="search" placeholder="Search item or shop"></label><label class="rates-sort">Sort<select id="ratesSort"><option value="newest">Newest</option><option value="lowest">Lowest price / g</option><option value="highest">Highest price / g</option><option value="supplier">Shop name</option></select></label><span id="ratesCount">${products.length} products</span></section><section class="rates-product-grid" id="ratesGrid"></section></section>`;
 drawCards();document.getElementById('ratesSearch')?.addEventListener('input',applySearch);document.getElementById('ratesSort')?.addEventListener('change',event=>{sortMode=event.target.value;drawCards()});
};
window.__WS_RATES_PAGE__={version:VERSION};
})();