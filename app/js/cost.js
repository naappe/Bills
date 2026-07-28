import {store,escapeHtml,text,number,money,get,itemsOf,productName,billDate,vendor,lineTotal} from './store.js';
import {db} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ');
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const preciseMoney=value=>`MVR ${number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6})}`;
let liveProducts=[],demoMode=false;

function packInfo(item){
  const packing=text(get(item,'pack_format','packing')),pack=packing.toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  const match=pack.match(/(?:(\d+(?:\.\d+)?)x)?(\d+(?:\.\d+)?)(kg|kgs?|g|gms?|grams?|l|ltr|litres?|liters?|ml|pcs?|pkt|packets?|btl|bottles?|tin|ctn|cartons?|doz|dozen)\b/);
  if(match){
    const count=number(match[1])||1,size=number(match[2]),unit=match[3],weight=/^(kg|kgs?|g|gms?|grams?)$/.test(unit),volume=/^(l|ltr|litres?|liters?|ml)$/.test(unit);
    const factor=/^(kg|kgs?)$/.test(unit)||/^(l|ltr|litres?|liters?)$/.test(unit)?1000:1,amount=count*size*factor,baseUnit=weight?'G':volume?'ML':'PCS';
    return{packing,amount,baseUnit,signature:`${baseUnit}:${amount}`,label:`${Math.round(amount).toLocaleString('en-US')} ${baseUnit.toLowerCase()}`};
  }
  const saved=number(get(item,'base_quantity','total_quantity')),savedUnit=text(get(item,'base_unit','small_unit')).toUpperCase(),qty=number(get(item,'qty','quantity'))||1;
  if(saved&&['G','KG','ML','L','PCS'].includes(savedUnit)){
    const factor=['KG','L'].includes(savedUnit)?1000:1,baseUnit=['KG','G'].includes(savedUnit)?'G':['L','ML'].includes(savedUnit)?'ML':'PCS',amount=saved*factor/qty;
    return{packing,amount,baseUnit,signature:`${baseUnit}:${amount}`,label:`${Math.round(amount).toLocaleString('en-US')} ${baseUnit.toLowerCase()}`};
  }
  return{packing,amount:0,baseUnit:'PACK',signature:`PACK:${keyOf(packing)}`,label:packing};
}

function unitPrices(cost,pack){
  if(!pack.amount)return{largeLabel:'Pack price',large:cost,smallLabel:'Pack price',small:cost};
  if(pack.baseUnit==='G')return{largeLabel:'MVR per 1 kg',large:cost*1000/pack.amount,smallLabel:'MVR per 1 g',small:cost/pack.amount};
  if(pack.baseUnit==='ML')return{largeLabel:'MVR per 1 litre',large:cost*1000/pack.amount,smallLabel:'MVR per 1 ml',small:cost/pack.amount};
  if(pack.baseUnit==='PCS')return{largeLabel:'MVR per piece',large:cost/pack.amount,smallLabel:'MVR per piece',small:cost/pack.amount};
  return{largeLabel:'Pack price',large:cost,smallLabel:'Pack price',small:cost};
}

function buildProducts(images){
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row);
    for(const [itemIndex,item] of itemsOf(row).entries()){
      const packing=text(get(item,'pack_format','packing'));
      if(!packing)continue;
      const name=productName(item,row),nameKey=keyOf(name),pack=packInfo(item),key=`${nameKey}|${pack.signature}`;
      if(!nameKey||name==='Unspecified item')continue;
      const qty=number(get(item,'qty','quantity'))||1,rate=number(get(item,'pack_rate','rate','price'))||(lineTotal(item)/qty);
      const gstRate=number(get(item,'gst','gst_rate')),cost=rate+(rate*gstRate/100);
      if(!cost)continue;
      if(!map.has(key))map.set(key,{key,name,image:images.get(nameKey)||'',pack,history:[]});
      map.get(key).history.push({date,cost,rate,gstRate,pack,packing,vendor:vendor(row),billId:text(get(row,'id')),itemIndex});
    }
  }
  return [...map.values()].map(product=>{
    product.history.sort((a,b)=>a.date.localeCompare(b.date));
    const latest=product.history.at(-1),previous=product.history.at(-2),highest=product.history.reduce((best,point)=>point.cost>best.cost?point:best,product.history[0]);
    const change=previous?latest.cost-previous.cost:0,changePercent=previous?.cost?change/previous.cost*100:0;
    return {...product,latest,highest,previous,change,changePercent,prices:unitPrices(latest.cost,latest.pack),search:`${product.name} ${product.pack.packing} ${product.history.map(point=>point.vendor).join(' ')}`.toLowerCase()};
  }).sort((a,b)=>b.latest.date.localeCompare(a.latest.date)||a.name.localeCompare(b.name));
}

function demoProducts(){
  const samples=[
    ['Milk','Lacnor Full Cream Milk','Grow Shop','1 ltr',[32,34,35]],
    ['Milk','Dutch Lady Full Cream Milk','Happy Market','1 ltr',[33,34]],
    ['Milk','Devondale Full Cream Milk','Jamna Fish','1 ltr',[35,37]],
    ['Milk','Rainbow Evaporated Milk','S&O Corner','410 ml',[17,18]],
    ['Milk','Anchor Full Cream Milk','Cyprea FNB','1 ltr',[36,38.5]],
    ['Milk','Almarai Full Cream Milk','Neo','1 ltr',[37,39]],
    ['Milk','Lacnor Low Fat Milk','Grow Shop','1 ltr',[34,36.5]],
    ['Milk','Devondale Full Cream Milk Small','Happy Market','500 ml',[19,20]],
    ['Milk','Anchor Full Cream Milk Small','A.K. Traders','500 ml',[18.5,19.5]],
    ['Milk','Dutch Lady Chocolate Milk','Maruhaba','250 ml',[9.5,10.5]],
    ['Tuna / Fish','Valhomus Smoked Tuna','Jamna Fish','500 g',[39,41.67]],
    ['Tuna / Fish','Roamus Tuna Loin','Jamna Fish','1 kg',[78,82]],
    ['Tuna / Fish','Yellowfin Tuna Cubes','Manik Fish','1 kg',[92,96]],
    ['Tuna / Fish','Skipjack Tuna Steak','Ocean Trade','1 kg',[68,72]],
    ['Tuna / Fish','Smoked Fish Fillet','Jamna Fish','250 g',[27,29]],
    ['Tuna / Fish','Reef Fish Fillet','Fresh Catch','1 kg',[84,88]],
    ['Tuna / Fish','Tuna Mince','Manik Fish','500 g',[34,36]],
    ['Tuna / Fish','Frozen Tuna Loin','Ocean Trade','2 kg',[146,152]],
    ['Tuna / Fish','Tuna Chunks','Fresh Catch','750 g',[54,57]],
    ['Tuna / Fish','Smoked Tuna Slices','Jamna Fish','300 g',[31,33]],
    ['Rice','India Gate Basmati Rice','A.K. Traders','5 kg',[148,155]],
    ['Rice','Tilda Basmati Rice','Happy Market','5 kg',[165,172]],
    ['Rice','Sunwhite Calrose Rice','Grow Shop','5 kg',[122,128]],
    ['Rice','Daawat Basmati Rice','Cyprea FNB','5 kg',[158,163]],
    ['Rice','Royal Umbrella Jasmine Rice','Neo','5 kg',[135,141]],
    ['Rice','White Sella Rice','A.K. Traders','10 kg',[238,245]],
    ['Rice','Thai Hom Mali Rice','Maruhaba','5 kg',[132,138]],
    ['Rice','Brown Rice','Grow Shop','1 kg',[39,42]],
    ['Rice','Jeera Samba Rice','Happy Market','5 kg',[118,124]],
    ['Rice','Ponni Rice','S&O Corner','10 kg',[215,224]],
    ['Cooking Oil','Sunflower Cooking Oil','Grow Shop','5 ltr',[188,195]],
    ['Cooking Oil','Canola Cooking Oil','Happy Market','5 ltr',[202,208]],
    ['Cooking Oil','Corn Cooking Oil','A.K. Traders','5 ltr',[210,218]],
    ['Cooking Oil','Vegetable Cooking Oil','S&O Corner','5 ltr',[170,178]],
    ['Cooking Oil','Olive Pomace Oil','Cyprea FNB','1 ltr',[92,98]],
    ['Cooking Oil','Extra Virgin Olive Oil','Neo','1 ltr',[138,145]],
    ['Cooking Oil','Coconut Cooking Oil','Maruhaba','1 ltr',[75,79]],
    ['Cooking Oil','Soybean Cooking Oil','Happy Market','5 ltr',[182,189]],
    ['Cooking Oil','Palm Olein Cooking Oil','Grow Shop','5 ltr',[164,171]],
    ['Cooking Oil','Rice Bran Cooking Oil','A.K. Traders','2 ltr',[92,97]],
    ['Water','Life Mineral Water','Happy Market','24x500 ml',[48,50]],
    ['Water','Taza Mineral Water','Grow Shop','24x500 ml',[46,49]],
    ['Water','Aquafina Drinking Water','Cyprea FNB','12x1.5 ltr',[82,86]],
    ['Water','Bon Aqua Drinking Water','Neo','12x1.5 ltr',[84,88]],
    ['Water','Life Water Large','Happy Market','6x5 ltr',[72,76]],
    ['Water','Taza Water Large','Grow Shop','6x5 ltr',[69,73]],
    ['Water','Sparkling Mineral Water','Maruhaba','12x330 ml',[96,102]],
    ['Water','Still Glass Water','Cyprea FNB','12x750 ml',[108,114]],
    ['Water','Life Water Small','Happy Market','24x330 ml',[42,45]],
    ['Water','Taza Water Small','Grow Shop','24x330 ml',[40,43]]
  ];
  return samples.map(([category,name,supplier,packing,costs],index)=>{
    const pack=packInfo({pack_format:packing});
    const history=costs.map((cost,point)=>({date:`2026-0${6+point}-${String(1+(index%27)).padStart(2,'0')}`,cost,rate:cost,gstRate:0,pack,packing,vendor:supplier,billId:'',itemIndex:0}));
    const latest=history.at(-1),previous=history.at(-2),highest=history.reduce((best,point)=>point.cost>best.cost?point:best,history[0]),change=previous?latest.cost-previous.cost:0;
    return{key:`demo-${index}`,category,name,image:'',pack,history,latest,previous,highest,change,changePercent:previous?.cost?change/previous.cost*100:0,prices:unitPrices(latest.cost,pack),search:`${category} ${name} ${packing} ${supplier}`.toLowerCase(),demo:true};
  });
}

function graph(product){
  const points=product.history.slice(-12),width=720,height=210,pad=26;
  if(points.length===1){
    const point=points[0];
    return `<div class="cost-chart-scroll"><svg class="cost-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(product.name)} latest price"><line class="cost-chart-guide" x1="${pad}" y1="105" x2="${width-pad}" y2="105"/><circle cx="${width/2}" cy="105" r="7"/><text class="cost-chart-value" x="${width/2}" y="82" text-anchor="middle">${escapeHtml(money(point.cost))}</text><text x="${width/2}" y="${height-18}" text-anchor="middle">${escapeHtml(formatDate(point.date))}</text></svg></div>`;
  }
  const values=points.map(point=>point.cost),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const coords=points.map((point,index)=>({x:pad+index*(width-pad*2)/(points.length-1),y:height-pad-(point.cost-min)*(height-pad*2)/span,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `<div class="cost-chart-scroll"><svg class="cost-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(product.name)} cost history"><defs><linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5a623" stop-opacity=".28"/><stop offset="1" stop-color="#f5a623" stop-opacity=".02"/></linearGradient></defs><path class="cost-chart-area" d="${path} L ${coords.at(-1).x} ${height-pad} L ${coords[0].x} ${height-pad} Z"/><path class="cost-chart-line" d="${path}"/>${coords.map(point=>`<g><circle cx="${point.x}" cy="${point.y}" r="5"/><title>${formatDate(point.date)} · ${money(point.cost)}</title></g>`).join('')}<text x="${pad}" y="${height-5}">${escapeHtml(formatDate(points[0].date))}</text><text x="${width-pad}" y="${height-5}" text-anchor="end">${escapeHtml(formatDate(points.at(-1).date))}</text></svg></div>`;
}

function bubble(product){
  const trend=product.change>0?'up':product.change<0?'down':'same';
  return `<button class="cost-bubble ${trend}" type="button" data-product="${escapeHtml(product.key)}" aria-label="View ${escapeHtml(product.name)} ${escapeHtml(product.pack.packing)}"><span class="cost-bubble-image">${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:'<i class="fa-solid fa-box-open"></i>'}</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.latest.vendor)}</small><small>${money(product.latest.cost)}</small></button>`;
}

function detail(product){
  return `<section class="cost-detail"><header class="cost-detail-head"><div class="cost-product-title">${product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`:'<span><i class="fa-solid fa-box-open"></i></span>'}<div><small>Selected product</small><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.latest.vendor)} · ${escapeHtml(product.pack.packing)} · Last entry ${escapeHtml(formatDate(product.latest.date))}</p></div></div></header>
    <div class="cost-metrics cost-metrics-simple"><article><span>Last price incl. GST</span><strong>${money(product.latest.cost)}</strong><small>${formatDate(product.latest.date)}</small></article><article><span>${escapeHtml(product.prices.largeLabel)}</span><strong>${money(product.prices.large)}</strong><small>${escapeHtml(product.pack.label)}</small></article><article><span>${escapeHtml(product.prices.smallLabel)}</span><strong>${preciseMoney(product.prices.small)}</strong><small>${escapeHtml(product.latest.vendor)}</small></article></div>
    <article class="cost-chart-card"><header><div><span>Last price graph</span><h3>${escapeHtml(product.name)}</h3></div><small>${escapeHtml(product.pack.packing)} · including GST</small></header>${graph(product)}</article></section>`;
}

function comparison(products,selectedKey){
  if(!products.length)return'';
  const cheapest=new Map();
  for(const product of products){const group=product.pack.baseUnit,current=cheapest.get(group);if(!current||product.prices.large<current.prices.large)cheapest.set(group,product)}
  const rows=[...products].sort((a,b)=>a.pack.baseUnit.localeCompare(b.pack.baseUnit)||a.prices.large-b.prices.large||a.name.localeCompare(b.name));
  return `<section class="cost-compare"><header><div><span>Search comparison</span><h2>Which product is cheapest?</h2></div><small>Compared using the same base unit</small></header><div class="table-wrap"><table class="cost-compare-table"><thead><tr><th>Product</th><th>Vendor</th><th>Last entry</th><th>Last price</th><th>Pack</th><th>Large unit</th><th>Small unit</th></tr></thead><tbody>${rows.map(product=>`<tr class="${product.key===selectedKey?'selected':''}" data-product="${escapeHtml(product.key)}" tabindex="0"><td><div class="cost-table-product">${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:''}<div><strong>${escapeHtml(product.name)}</strong>${cheapest.get(product.pack.baseUnit)?.key===product.key?'<span class="cost-cheapest">Cheapest</span>':''}</div></div></td><td>${escapeHtml(product.latest.vendor)}</td><td>${escapeHtml(formatDate(product.latest.date))}</td><td><strong>${money(product.latest.cost)}</strong></td><td>${escapeHtml(product.latest.packing)}</td><td><span>${escapeHtml(product.prices.largeLabel)}</span><strong>${money(product.prices.large)}</strong></td><td><span>${escapeHtml(product.prices.smallLabel)}</span><strong>${preciseMoney(product.prices.small)}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
}

function render(products,selectedKey='',query=''){
  const target=content(),needle=text(query).toLowerCase(),filtered=products.filter(product=>!needle||product.search.includes(needle));
  const selected=filtered.find(product=>product.key===selectedKey)||filtered[0]||(!needle?products[0]:null);
  const categoryFilters=demoMode?`<div class="cost-demo-categories" aria-label="Example categories"><button type="button" data-demo-category="">All 50</button>${['Milk','Tuna / Fish','Rice','Cooking Oil','Water'].map(category=>`<button type="button" data-demo-category="${escapeHtml(category.toLowerCase())}">${escapeHtml(category)} · 10</button>`).join('')}</div>`:'';
  target.innerHTML=`<header class="page-head"><div><h1>Cost</h1><p>Find the cheapest product using the same weight, volume or piece cost.</p></div></header><section class="cost-overview"><div class="cost-overview-head"><div><strong>${demoMode?'50-product example':'Live cost data'}</strong><span>${demoMode?'5 categories with 10 products each':'Compare products entered in your bills'}</span></div><button class="btn ${demoMode?'secondary':''}" data-demo-toggle type="button"><i class="fa-solid ${demoMode?'fa-database':'fa-flask'}"></i> ${demoMode?'Back to live data':'View 5-category example'}</button></div>${demoMode?'<div class="cost-demo-note"><i class="fa-solid fa-circle-info"></i><div><strong>Example mode</strong><span>These 50 products are temporary examples only. Nothing was added to Supabase.</span></div></div>':''}${categoryFilters}<div class="cost-search"><i class="fa-solid fa-magnifying-glass"></i><input id="costSearch" value="${escapeHtml(query)}" placeholder="Search milk, tuna, rice, oil, water or vendor" aria-label="Search product category or vendor"><strong>${filtered.length} results</strong></div>${filtered.length?`<div class="cost-bubbles" aria-label="Product cost summary">${filtered.slice(0,demoMode?50:18).map(bubble).join('')}</div>`:'<div class="empty"><h2>No matching products</h2><p>Try another product category or vendor.</p></div>'}</section>${comparison(filtered,selected?.key)}${selected?detail(selected):'<section class="panel"><div class="empty"><h2>No cost data yet</h2><p>Enter a bill with product packing and price to begin.</p></div></section>'}`;
  target.querySelector('[data-demo-toggle]')?.addEventListener('click',()=>{demoMode=!demoMode;render(demoMode?demoProducts():liveProducts)});
  target.querySelectorAll('[data-demo-category]').forEach(button=>button.addEventListener('click',()=>render(products,'',button.dataset.demoCategory)));
  $('#costSearch')?.addEventListener('input',event=>{const value=event.target.value;render(products,selected?.key,value);const input=$('#costSearch');input.focus();input.setSelectionRange(value.length,value.length)});
  target.querySelectorAll('[data-product]').forEach(control=>{const choose=()=>render(products,control.dataset.product,needle);control.addEventListener('click',choose);control.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose()}})});
}

export async function costPage(){
  const target=content();
  target.innerHTML='<header class="page-head"><div><h1>Cost</h1><p>Preparing product costs…</p></div></header><section class="panel"><div class="empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div></section>';
  const images=new Map();
  try{const {data,error}=await db.from('products').select('name,image_url').eq('is_active',true).is('deleted_at',null);if(error)throw error;for(const product of data||[])if(product.image_url)images.set(keyOf(product.name),product.image_url)}
  catch(error){console.warn('[cost] product images unavailable',error)}
  if(store.route!=='cost')return;
  liveProducts=buildProducts(images);demoMode=false;render(liveProducts);
}
