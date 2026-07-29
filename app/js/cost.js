import {store,escapeHtml,text,number,money,get,itemsOf,productName,itemCategory,billDate,vendor,lineTotal} from './store.js';
import {db} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const preciseMoney=value=>`MVR ${number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})}`;
const genericCategories=new Set(['','other','auto','general','uncategorized','uncategorised']);
const categoryRules=[
  ['Milk',/\b(milk|cream|evaporated|lactose)\b/i],
  ['Water',/\b(water|aquafina|aqua|sparkling)\b/i],
  ['Tuna / Fish',/\b(tuna|fish|roamus|valhom|fillet|skipjack|yellowfin)\b/i],
  ['Rice',/\b(rice|basmati|sella|ponni|calrose|jasmine)\b/i],
  ['Cooking Oil',/\b(oil|olein|canola|sunflower|soybean)\b/i]
];
let liveProducts=[],demoMode=false;
let view={query:'',category:'All',vendor:'All',range:'all',selected:''};

function categoryOf(item,row,name){
  const saved=text(itemCategory(item,row));
  if(!genericCategories.has(saved.toLowerCase()))return saved;
  return categoryRules.find(([,pattern])=>pattern.test(name))?.[0]||'Other';
}

function packInfo(item){
  const packing=text(get(item,'pack_format','packing')),pack=packing.toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  const match=pack.match(/(?:(\d+(?:\.\d+)?)x)?(\d+(?:\.\d+)?)(kg|kgs?|g|gms?|grams?|l|ltr|litres?|liters?|ml|pcs?|pkt|packets?|btl|bottles?|tin|ctn|cartons?|doz|dozen)\b/);
  if(match){
    const count=number(match[1])||1,size=number(match[2]),unit=match[3],weight=/^(kg|kgs?|g|gms?|grams?)$/.test(unit),volume=/^(l|ltr|litres?|liters?|ml)$/.test(unit);
    const factor=/^(kg|kgs?)$/.test(unit)||/^(l|ltr|litres?|liters?)$/.test(unit)?1000:1,amount=count*size*factor,baseUnit=weight?'G':volume?'ML':'PCS';
    return{packing,count,size,amount,baseUnit,signature:`${baseUnit}:${amount}`};
  }
  const saved=number(get(item,'base_quantity','total_quantity')),savedUnit=text(get(item,'base_unit','small_unit')).toUpperCase(),qty=number(get(item,'qty','quantity'))||1;
  if(saved&&['G','KG','ML','L','PCS'].includes(savedUnit)){
    const factor=['KG','L'].includes(savedUnit)?1000:1,baseUnit=['KG','G'].includes(savedUnit)?'G':['L','ML'].includes(savedUnit)?'ML':'PCS',amount=saved*factor/qty;
    return{packing,count:1,size:amount,amount,baseUnit,signature:`${baseUnit}:${amount}`};
  }
  return{packing,count:1,size:0,amount:0,baseUnit:'PACK',signature:`PACK:${keyOf(packing)}`};
}

function quantityLabel(pack){
  if(!pack.amount)return pack.packing||'Pack not parsed';
  if(pack.baseUnit==='G')return pack.amount>=1000?`${number(pack.amount/1000).toLocaleString()} kg total`:`${number(pack.amount).toLocaleString()} g total`;
  if(pack.baseUnit==='ML')return pack.amount>=1000?`${number(pack.amount/1000).toLocaleString()} L total`:`${number(pack.amount).toLocaleString()} ml total`;
  return `${number(pack.amount).toLocaleString()} piece${pack.amount===1?'':'s'} total`;
}

function unitPrices(packPrice,pack){
  if(!pack.amount)return{largeLabel:'Pack price',large:packPrice,smallLabel:'Pack price',small:packPrice};
  if(pack.baseUnit==='G')return{largeLabel:'MVR per kg',large:packPrice*1000/pack.amount,smallLabel:'MVR per gram',small:packPrice/pack.amount};
  if(pack.baseUnit==='ML')return{largeLabel:'MVR per litre',large:packPrice*1000/pack.amount,smallLabel:'MVR per ml',small:packPrice/pack.amount};
  if(pack.baseUnit==='PCS')return{largeLabel:'MVR per piece',large:packPrice/pack.amount,smallLabel:'MVR per piece',small:packPrice/pack.amount};
  return{largeLabel:'Pack price',large:packPrice,smallLabel:'Pack price',small:packPrice};
}

function finishProduct(product){
  product.history.sort((a,b)=>a.date.localeCompare(b.date));
  const latest=product.history.at(-1),previous=product.history.at(-2),highest=product.history.reduce((best,point)=>point.packPrice>best.packPrice?point:best,product.history[0]);
  const change=previous?latest.packPrice-previous.packPrice:0,changePercent=previous?.packPrice?change/previous.packPrice*100:0;
  return{...product,latest,previous,highest,change,changePercent,prices:unitPrices(latest.packPrice,latest.pack),search:`${product.category} ${product.name} ${product.pack.packing} ${product.history.map(point=>point.vendor).join(' ')}`.toLowerCase()};
}

function buildProducts(images){
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row);
    for(const [itemIndex,item] of itemsOf(row).entries()){
      const packing=text(get(item,'pack_format','packing'));
      if(!packing)continue;
      const name=productName(item,row),nameKey=keyOf(name),category=categoryOf(item,row,name),pack=packInfo(item),key=`${keyOf(category)}|${nameKey}|${pack.signature}`;
      if(!nameKey||name==='Unspecified item')continue;
      const qty=number(get(item,'qty','quantity'))||1,rate=number(get(item,'pack_rate','rate','price'))||(lineTotal(item)/qty),gstRate=number(get(item,'gst','gst_rate')),packPrice=rate+(rate*gstRate/100);
      if(!packPrice)continue;
      if(!map.has(key))map.set(key,{key,name,category,image:images.get(nameKey)||'',pack,history:[]});
      map.get(key).history.push({date,packPrice,rate,gstRate,pack,packing,vendor:vendor(row),billId:text(get(row,'id')),itemIndex});
    }
  }
  return [...map.values()].map(finishProduct).sort((a,b)=>b.latest.date.localeCompare(a.latest.date)||a.name.localeCompare(b.name));
}

function demoProducts(){
  const vendors=['Grow Shop','Happy Market','Jamna Fish','A.K. Traders','Cyprea FNB'];
  const groups={
    Milk:{names:['Lacnor Full Cream Milk','Dutch Lady Full Cream Milk','Devondale Full Cream Milk','Rainbow Evaporated Milk','Anchor Full Cream Milk','Almarai Full Cream Milk','Lacnor Low Fat Milk','Devondale Milk 500ml','Anchor Milk 500ml','Dutch Lady Chocolate Milk'],packs:['1 ltr','1 ltr','1 ltr','410 ml','1 ltr','1 ltr','1 ltr','500 ml','500 ml','250 ml'],start:32},
    'Tuna / Fish':{names:['Valhomus Smoked Tuna','Roamus Tuna Loin','Yellowfin Tuna Cubes','Skipjack Tuna Steak','Smoked Fish Fillet','Reef Fish Fillet','Tuna Mince','Frozen Tuna Loin','Tuna Chunks','Smoked Tuna Slices'],packs:['500 g','1 kg','1 kg','1 kg','250 g','1 kg','500 g','2 kg','750 g','300 g'],start:38},
    Rice:{names:['India Gate Basmati Rice','Tilda Basmati Rice','Sunwhite Calrose Rice','Daawat Basmati Rice','Royal Umbrella Jasmine Rice','White Sella Rice','Thai Hom Mali Rice','Brown Rice','Jeera Samba Rice','Ponni Rice'],packs:['5 kg','5 kg','5 kg','5 kg','5 kg','10 kg','5 kg','1 kg','5 kg','10 kg'],start:120},
    'Cooking Oil':{names:['Sunflower Cooking Oil','Canola Cooking Oil','Corn Cooking Oil','Vegetable Cooking Oil','Olive Pomace Oil','Extra Virgin Olive Oil','Coconut Cooking Oil','Soybean Cooking Oil','Palm Olein Cooking Oil','Rice Bran Cooking Oil'],packs:['5 ltr','5 ltr','5 ltr','5 ltr','1 ltr','1 ltr','1 ltr','5 ltr','5 ltr','2 ltr'],start:78},
    Water:{names:['Life Mineral Water','Taza Mineral Water','Aquafina Drinking Water','Bon Aqua Drinking Water','Life Water 5L','Taza Water 5L','Sparkling Mineral Water','Still Glass Water','Life Water Small','Taza Water Small'],packs:['24x500 ml','24x500 ml','12x1.5 ltr','12x1.5 ltr','6x5 ltr','6x5 ltr','12x330 ml','12x750 ml','24x330 ml','24x330 ml'],start:42}
  };
  let index=0;
  return Object.entries(groups).flatMap(([category,group])=>group.names.map((name,position)=>{
    const pack=packInfo({pack_format:group.packs[position]}),base=group.start+position*4;
    const history=[base*.94,base*.98,base].map((packPrice,point)=>({date:`2026-0${5+point}-${String(1+(index%27)).padStart(2,'0')}`,packPrice,rate:packPrice,gstRate:0,pack,packing:pack.packing,vendor:vendors[(index+point)%vendors.length],billId:'',itemIndex:0}));
    return finishProduct({key:`demo-${index++}`,category,name,image:'',pack,history,demo:true});
  }));
}

function graph(product){
  const points=product.history.slice(-12),width=720,height=220,pad=30;
  if(points.length===1){
    const point=points[0];
    return `<div class="cost-chart-scroll"><svg class="cost-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(product.name)} latest pack price"><line class="cost-chart-guide" x1="${pad}" y1="110" x2="${width-pad}" y2="110"/><circle cx="${width/2}" cy="110" r="7"/><text class="cost-chart-value" x="${width/2}" y="84" text-anchor="middle">${escapeHtml(money(point.packPrice))}</text><text x="${width/2}" y="${height-15}" text-anchor="middle">${escapeHtml(formatDate(point.date))}</text></svg></div>`;
  }
  const values=points.map(point=>point.packPrice),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const coords=points.map((point,index)=>({x:pad+index*(width-pad*2)/(points.length-1),y:height-pad-(point.packPrice-min)*(height-pad*2)/span,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `<div class="cost-chart-scroll"><svg class="cost-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(product.name)} pack-price history"><defs><linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5a623" stop-opacity=".28"/><stop offset="1" stop-color="#f5a623" stop-opacity=".02"/></linearGradient></defs><path class="cost-chart-area" d="${path} L ${coords.at(-1).x} ${height-pad} L ${coords[0].x} ${height-pad} Z"/><path class="cost-chart-line" d="${path}"/>${coords.map(point=>`<g><circle cx="${point.x}" cy="${point.y}" r="5"/><title>${formatDate(point.date)} · ${money(point.packPrice)}</title></g>`).join('')}<text x="${pad}" y="${height-5}">${escapeHtml(formatDate(points[0].date))}</text><text x="${width-pad}" y="${height-5}" text-anchor="end">${escapeHtml(formatDate(points.at(-1).date))}</text></svg></div>`;
}

function availableCategories(products){
  const counts=new Map();
  for(const product of products)counts.set(product.category,(counts.get(product.category)||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}

function filteredProducts(products){
  const needle=keyOf(view.query),cutoff=view.range==='all'?0:Date.now()-number(view.range)*86400000;
  return products.filter(product=>(view.category==='All'||product.category===view.category)&&(view.vendor==='All'||product.latest.vendor===view.vendor)&&(!needle||product.search.includes(needle))&&(!cutoff||new Date(`${product.latest.date}T00:00:00`).getTime()>=cutoff));
}

function categoryNavigation(products){
  const categories=availableCategories(products);
  return `<div class="cost-categories" aria-label="Product categories"><button class="${view.category==='All'?'active':''}" data-category="All" type="button"><span>All products</span><strong>${products.length}</strong></button>${categories.map(([category,count])=>`<button class="${view.category===category?'active':''}" data-category="${escapeHtml(category)}" type="button"><span>${escapeHtml(category)}</span><strong>${count}</strong></button>`).join('')}</div>`;
}

function analytics(products){
  const vendorsCount=new Set(products.map(product=>product.latest.vendor)).size,latest=products.reduce((best,product)=>product.latest.date>best?product.latest.date:best,'');
  const groups=new Map();
  for(const product of products){const key=`${keyOf(product.category)}|${product.pack.baseUnit}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(product)}
  const comparable=[...groups.values()].sort((a,b)=>b.length-a.length)[0]||[],ordered=[...comparable].sort((a,b)=>a.prices.large-b.prices.large),cheapest=ordered[0],highest=ordered.at(-1),saving=cheapest&&highest?highest.prices.large-cheapest.prices.large:0;
  const selectedCategory=view.category!=='All';
  return `<section class="cost-kpis"><article><span>Products found</span><strong>${products.length}</strong><small>${selectedCategory?escapeHtml(view.category):'Across all categories'}</small></article><article><span>Vendors compared</span><strong>${vendorsCount}</strong><small>Using latest purchases</small></article><article><span>${selectedCategory?'Best normalized cost':'Category comparison'}</span><strong>${selectedCategory&&cheapest?money(cheapest.prices.large):'Select category'}</strong><small>${selectedCategory&&cheapest?escapeHtml(cheapest.prices.largeLabel):'Prevents unrelated comparisons'}</small></article><article><span>${selectedCategory?'Potential saving':'Latest update'}</span><strong>${selectedCategory&&saving?money(saving):formatDate(latest)}</strong><small>${selectedCategory&&saving?'Per comparable base unit':'Most recent purchase'}</small></article></section>`;
}

function productDetail(product){
  const trend=product.change>0?'up':product.change<0?'down':'same',trendText=product.previous?`${product.change>0?'+':''}${money(product.change)} · ${Math.abs(product.changePercent).toFixed(1)}%`:'No previous price';
  return `<section class="cost-focus"><header><div class="cost-product-title">${product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`:'<span><i class="fa-solid fa-box-open"></i></span>'}<div><small>${escapeHtml(product.category)}</small><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.latest.vendor)} · Last purchased ${escapeHtml(formatDate(product.latest.date))}</p></div></div>${!product.demo&&product.latest.billId?'<button class="btn secondary" data-edit-source type="button"><i class="fa-solid fa-pen"></i> Modify original bill</button>':''}</header><div class="cost-focus-grid"><div class="cost-focus-summary"><article><span>Pack price incl. GST</span><strong>${money(product.latest.packPrice)}</strong><small>${escapeHtml(product.latest.packing)}</small></article><article><span>Pack contents</span><strong>${escapeHtml(quantityLabel(product.pack))}</strong><small>Entered packing: ${escapeHtml(product.pack.packing)}</small></article><article><span>${escapeHtml(product.prices.largeLabel)}</span><strong>${money(product.prices.large)}</strong><small>Normalized comparison cost</small></article><article><span>${escapeHtml(product.prices.smallLabel)}</span><strong>${preciseMoney(product.prices.small)}</strong><small>Normalized comparison cost</small></article><article class="${trend}"><span>Latest change</span><strong>${escapeHtml(trendText)}</strong><small>${product.previous?`Previous pack price ${money(product.previous.packPrice)}`:'Waiting for another purchase'}</small></article></div><article class="cost-chart-card"><header><div><span>Pack-price history</span><h3>${escapeHtml(product.name)}</h3></div><small>Including GST</small></header>${graph(product)}</article></div></section>`;
}

function comparison(products,selectedKey){
  if(!products.length)return'<section class="cost-empty"><i class="fa-solid fa-magnifying-glass"></i><h2>No matching cost records</h2><p>Try another category, vendor, date range, or search.</p></section>';
  const cheapest=new Map();
  for(const product of products){const group=`${keyOf(product.category)}|${product.pack.baseUnit}`,current=cheapest.get(group);if(!current||product.prices.large<current.prices.large)cheapest.set(group,product)}
  const rows=[...products].sort((a,b)=>a.category.localeCompare(b.category)||a.prices.large-b.prices.large||a.name.localeCompare(b.name));
  return `<section class="cost-compare"><header><div><span>Product cost comparison</span><h2>${view.category==='All'?'Latest costs by category':`${escapeHtml(view.category)} cost ranking`}</h2></div><small>Cheapest is calculated only within the same category and base unit</small></header><div class="table-wrap"><table class="cost-compare-table"><thead><tr><th>Product & vendor</th><th>Category</th><th>Last purchase</th><th>Entered packing</th><th>Pack price</th><th>Normalized cost</th><th>Change</th></tr></thead><tbody>${rows.map(product=>{const group=`${keyOf(product.category)}|${product.pack.baseUnit}`,winner=cheapest.get(group)?.key===product.key,trend=product.change>0?'up':product.change<0?'down':'same';return `<tr class="${product.key===selectedKey?'selected':''}" data-product="${escapeHtml(product.key)}" tabindex="0"><td><div class="cost-table-product">${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:'<span><i class="fa-solid fa-box-open"></i></span>'}<div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.latest.vendor)}</small>${winner?'<em>Cheapest comparable</em>':''}</div></div></td><td><span class="cost-category-tag">${escapeHtml(product.category)}</span></td><td><strong>${escapeHtml(formatDate(product.latest.date))}</strong></td><td><strong>${escapeHtml(product.latest.packing)}</strong><small>${escapeHtml(quantityLabel(product.pack))}</small></td><td><strong>${money(product.latest.packPrice)}</strong><small>Including GST</small></td><td><strong>${money(product.prices.large)}</strong><small>${escapeHtml(product.prices.largeLabel)}</small><small>${preciseMoney(product.prices.small)} ${escapeHtml(product.prices.smallLabel.replace('MVR ',''))}</small></td><td><span class="cost-change ${trend}"><i class="fa-solid ${trend==='up'?'fa-arrow-up':trend==='down'?'fa-arrow-down':'fa-minus'}"></i>${product.previous?`${Math.abs(product.changePercent).toFixed(1)}%`:'New'}</span></td></tr>`}).join('')}</tbody></table></div></section>`;
}

function render(products){
  const target=content(),categories=availableCategories(products).map(([category])=>category);
  if(view.category!=='All'&&!categories.includes(view.category))view.category='All';
  const vendors=[...new Set(products.filter(product=>view.category==='All'||product.category===view.category).map(product=>product.latest.vendor))].sort();
  if(view.vendor!=='All'&&!vendors.includes(view.vendor))view.vendor='All';
  const filtered=filteredProducts(products),selected=filtered.find(product=>product.key===view.selected)||filtered[0];
  view.selected=selected?.key||'';
  target.innerHTML=`<header class="page-head"><div><h1>Cost</h1><p>Category-safe purchase cost intelligence.</p></div><div class="actions"><button class="btn ${demoMode?'secondary':''}" data-demo-toggle type="button"><i class="fa-solid ${demoMode?'fa-database':'fa-flask'}"></i>${demoMode?'Back to live data':'View professional example'}</button></div></header><section class="cost-workspace"><header class="cost-workspace-head"><div><strong>${demoMode?'Professional example catalogue':'Purchase cost intelligence'}</strong><span>${demoMode?'50 temporary products · 5 categories':'Compare entered packing, vendors and normalized unit costs'}</span></div></header>${demoMode?'<div class="cost-demo-note"><i class="fa-solid fa-circle-info"></i><div><strong>Example mode</strong><span>Temporary examples only. Nothing was added to Supabase.</span></div></div>':''}<div class="cost-toolbar"><label class="cost-search"><i class="fa-solid fa-magnifying-glass"></i><input id="costSearch" value="${escapeHtml(view.query)}" placeholder="Search product or vendor" aria-label="Search product or vendor"></label><label><span>Category</span><select id="costCategory"><option>All</option>${categories.map(category=>`<option ${view.category===category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select></label><label><span>Vendor</span><select id="costVendor"><option>All</option>${vendors.map(name=>`<option ${view.vendor===name?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></label><label><span>Last purchased</span><select id="costRange"><option value="all" ${view.range==='all'?'selected':''}>All time</option><option value="30" ${view.range==='30'?'selected':''}>Last 30 days</option><option value="90" ${view.range==='90'?'selected':''}>Last 90 days</option><option value="365" ${view.range==='365'?'selected':''}>Last year</option></select></label><button class="btn secondary" data-reset-cost type="button"><i class="fa-solid fa-rotate-left"></i>Reset</button></div>${categoryNavigation(products)}</section>${analytics(filtered)}${selected?productDetail(selected):''}${comparison(filtered,selected?.key)}`;
  target.querySelector('[data-demo-toggle]')?.addEventListener('click',()=>{demoMode=!demoMode;view={query:'',category:'All',vendor:'All',range:'all',selected:''};render(demoMode?demoProducts():liveProducts)});
  target.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{view.category=button.dataset.category;view.vendor='All';view.selected='';render(products)}));
  $('#costCategory')?.addEventListener('change',event=>{view.category=event.target.value;view.vendor='All';view.selected='';render(products)});
  $('#costVendor')?.addEventListener('change',event=>{view.vendor=event.target.value;view.selected='';render(products)});
  $('#costRange')?.addEventListener('change',event=>{view.range=event.target.value;view.selected='';render(products)});
  $('#costSearch')?.addEventListener('input',event=>{view.query=event.target.value;view.selected='';render(products);const input=$('#costSearch');input?.focus();input?.setSelectionRange(view.query.length,view.query.length)});
  target.querySelector('[data-reset-cost]')?.addEventListener('click',()=>{view={query:'',category:'All',vendor:'All',range:'all',selected:''};render(products)});
  target.querySelectorAll('[data-product]').forEach(row=>{const choose=()=>{view.selected=row.dataset.product;render(products);target.querySelector('.cost-focus')?.scrollIntoView({behavior:'smooth',block:'start'})};row.addEventListener('click',choose);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose()}})});
  target.querySelector('[data-edit-source]')?.addEventListener('click',()=>{const row=store.rows.find(item=>String(get(item,'id'))===String(selected?.latest.billId));if(!row)return;store.editing=row;location.hash='#new'});
}

export async function costPage(){
  const target=content();
  target.innerHTML='<header class="page-head"><div><h1>Cost</h1><p>Preparing product costs…</p></div></header><section class="panel"><div class="empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div></section>';
  const images=new Map();
  try{const {data,error}=await db.from('products').select('name,image_url').eq('is_active',true).is('deleted_at',null);if(error)throw error;for(const product of data||[])if(product.image_url)images.set(keyOf(product.name),product.image_url)}
  catch(error){console.warn('[cost] product images unavailable',error)}
  if(store.route!=='cost')return;
  liveProducts=buildProducts(images);demoMode=false;view={query:'',category:'All',vendor:'All',range:'all',selected:''};render(liveProducts);
}
