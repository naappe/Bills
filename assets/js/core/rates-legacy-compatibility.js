(()=>{
'use strict';
const text=value=>String(value??'').trim();
const number=value=>Number(String(value??0).replace(/,/g,''))||0;
const get=(row,...keys)=>{for(const key of keys){if(row&&row[key]!==undefined&&row[key]!==null&&row[key]!=='')return row[key]}return''};
const dateOf=row=>get(row,'bill_day','bill_date','Bill Date','date','Date','created_at');
const vendorOf=row=>get(row,'vendor','Vendor','vendor_name','supplier','Supplier')||'Unknown supplier';
const iso=value=>{if(!value)return'';const raw=String(value).slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toISOString().slice(0,10)};
const money=value=>`MVR ${number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const precise=value=>`MVR ${number(value).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:5})}`;
const titleCase=value=>text(value).toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());
const parsePack=input=>{const source=text(input).toLowerCase().replace(/\s+/g,'');let match=source.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);if(match)return{count:number(match[1]),size:number(match[2]),unit:match[3].toLowerCase().replace('pc','pcs')};match=source.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs|pc)$/i);return match?{count:1,size:number(match[1]),unit:match[2].toLowerCase().replace('pc','pcs')}:{count:0,size:0,unit:''}};
const normalizeItem=(raw,bill)=>{
 const product=text(get(raw,'product','description','name','item','Product','Description')||get(bill,'product','description','item_name','Product','Description'));
 const pack=text(get(raw,'pack_format','packing','pack','Pack Format')||get(bill,'pack_format','packing','pack','Pack Format'));
 const unit=text(get(raw,'unit','purchase_unit','Unit')||get(bill,'unit','purchase_unit','Unit')||'PCS').toUpperCase();
 const qty=number(get(raw,'qty','quantity','Quantity')||get(bill,'qty','quantity','Quantity')||1);
 const explicitSmall=number(get(raw,'small_rate','gram_rate','ml_rate','unit_small_rate')||get(bill,'small_rate','gram_rate','ml_rate','unit_small_rate'));
 const explicitPurchase=number(get(raw,'purchase_rate','pack_rate','unit_rate','rate','Rate')||get(bill,'purchase_rate','pack_rate','unit_rate','rate','Rate'));
 const lineTotal=number(get(raw,'line_total','total','amount','Amount')||get(bill,'line_total','item_total'));
 const purchaseRate=explicitPurchase||(qty&&lineTotal?lineTotal/qty:0);
 const parsed=parsePack(pack);let basePerPurchase=1,baseUnit='pcs';
 if(parsed.count){const base=parsed.count*parsed.size;if(parsed.unit==='kg'){basePerPurchase=base*1000;baseUnit='g'}else if(parsed.unit==='g'){basePerPurchase=base;baseUnit='g'}else if(parsed.unit==='l'){basePerPurchase=base*1000;baseUnit='ml'}else if(parsed.unit==='ml'){basePerPurchase=base;baseUnit='ml'}else{basePerPurchase=base;baseUnit='pcs'}}
 else if(unit==='KG'){basePerPurchase=1000;baseUnit='g'}else if(unit==='G'){basePerPurchase=1;baseUnit='g'}else if(unit==='L'){basePerPurchase=1000;baseUnit='ml'}else if(unit==='ML'){basePerPurchase=1;baseUnit='ml'}else if(unit==='DOZ'){basePerPurchase=12;baseUnit='pcs'};
 const baseRate=explicitSmall||(basePerPurchase?purchaseRate/basePerPurchase:0);
 return{product,pack,unit,qty,purchaseRate,baseRate,baseUnit};
};
const billItems=bill=>{
 if(Array.isArray(bill.items)&&bill.items.length)return bill.items;
 if(Array.isArray(bill.bill_items)&&bill.bill_items.length)return bill.bill_items;
 const product=get(bill,'product','description','item_name','Product','Description');
 return product?[bill]:[];
};
window.renderRates=()=>{
 const rows=Array.isArray(state?.rows)?state.rows:[];
 const records=[];
 rows.forEach(bill=>billItems(bill).forEach(raw=>{const item=normalizeItem(raw,bill);if(!item.product||item.baseRate<=0)return;records.push({...item,supplier:text(vendorOf(bill)),billDate:iso(dateOf(bill)),savedAt:text(get(bill,'created_at','updated_at')),key:item.product.toLowerCase()+'|'+item.baseUnit})}));
 const grouped=new Map();records.forEach(record=>{const list=grouped.get(record.key)||[];list.push(record);grouped.set(record.key,list)});
 const products=[...grouped.values()].map(list=>{list.sort((a,b)=>(b.billDate+'|'+b.savedAt).localeCompare(a.billDate+'|'+a.savedAt));const latest=list[0],previous=list[1]||null;const suppliers=new Map();list.forEach(record=>{if(!suppliers.has(record.supplier))suppliers.set(record.supplier,record)});const lowest=[...suppliers.values()].sort((a,b)=>a.baseRate-b.baseRate)[0]||latest;const change=previous&&previous.baseRate>0?(latest.baseRate-previous.baseRate)/previous.baseRate:0;return{latest,previous,lowest,change,purchases:list.slice(0,4),purchaseCount:list.length,supplierCount:suppliers.size}}).sort((a,b)=>b.change-a.change||a.latest.product.localeCompare(b.latest.product));
 const increased=products.filter(product=>product.change>0),best=products.slice().sort((a,b)=>a.lowest.baseRate-b.lowest.baseRate)[0];
 const purchaseCard=(purchase,index)=>`<article class="rate-offer ${index===0?'rate-offer-latest':''}"><span class="rate-offer-label">${index===0?'Latest purchase':'Earlier purchase'}</span><h4>${esc(purchase.supplier)}</h4><div class="rate-offer-meta"><span>Bill date</span><strong>${esc(purchase.billDate||'Not recorded')}</strong></div><div class="rate-offer-values"><div><span>Purchase value</span><strong>${money(purchase.purchaseRate)}</strong><small>${esc(purchase.unit)} rate</small></div><div><span>Normalized rate</span><strong>${precise(purchase.baseRate)}</strong><small>Per ${esc(purchase.baseUnit)}</small></div></div></article>`;
 const cards=products.map(product=>{const latest=product.latest,up=product.change>0,status=product.previous?(up?`<span class="rate-status rate-status-up">▲ ${Math.abs(product.change*100).toFixed(1)}% higher than previous</span>`:'<span class="rate-status rate-status-down">✓ No increase</span>'):'<span class="rate-status">First saved purchase</span>';return`<section class="rate-product-card ${up?'rate-product-alert':''}"><header class="rate-product-head"><div><h3>${esc(titleCase(latest.product))}</h3><p>${product.purchaseCount} purchase${product.purchaseCount===1?'':'s'} · ${product.supplierCount} supplier${product.supplierCount===1?'':'s'} · Compared per ${esc(latest.baseUnit)}</p></div>${status}</header><div class="rate-offer-grid">${product.purchases.map(purchaseCard).join('')}</div></section>`}).join('');
 const overview=`<section class="rate-overview"><article class="rate-overview-card"><span>Products tracked</span><strong>${products.length}</strong><small>With saved purchase rates</small></article><article class="rate-overview-card ${increased.length?'rate-overview-alert':''}"><span>Prices increased</span><strong>${increased.length}</strong><small>Compared with previous purchase</small></article><article class="rate-overview-card rate-overview-best"><span>Lowest recorded rate</span><strong>${best?precise(best.lowest.baseRate):'—'}</strong><small>${best?esc(best.lowest.supplier):'No compatible rate data found'}</small></article></section>`;
 byId('content').innerHTML=pageHead('Rates','Supplier purchase comparison and lowest recorded prices')+overview+(cards?`<section class="rate-product-grid">${cards}</section>`:'<section class="card"><div class="empty">Bills are loaded, but no product and rate fields were found in the saved records.</div></section>');
};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.rates=window.renderRates;
window.__WS_RATES_COMPAT__={version:1};
})();