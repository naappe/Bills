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
    ['Lacnor Full Cream Milk','Grow Shop','1 ltr',[32,34,35]],
    ['Dutch Lady Full Cream Milk','Happy Market','1 ltr',[33,34]],
    ['Devondale Full Cream Milk','Jamna Fish','1 ltr',[35,37]],
    ['Rainbow Evaporated Milk','S&O Corner','410 ml',[17,18]],
    ['Anchor Full Cream Milk','Cyprea FNB','1 ltr',[36,38.5]],
    ['Almarai Full Cream Milk','Neo','1 ltr',[37,39]],
    ['Lacnor Low Fat Milk','Grow Shop','1 ltr',[34,36.5]],
    ['Devondale Full Cream Milk','Happy Market','500 ml',[19,20]],
    ['Anchor Full Cream Milk','A.K. Traders','500 ml',[18.5,19.5]],
    ['Dutch Lady Chocolate Milk','Maruhaba','250 ml',[9.5,10.5]]
  ];
  return samples.map(([name,supplier,packing,costs],index)=>{
    const pack=packInfo({pack_format:packing});
    const history=costs.map((cost,point)=>({date:`2026-0${5+point}-${String(8+index).padStart(2,'0')}`,cost,rate:cost,gstRate:0,pack,packing,vendor:supplier,billId:'',itemIndex:0}));
    const latest=history.at(-1),previous=history.at(-2),highest=history.reduce((best,point)=>point.cost>best.cost?point:best,history[0]),change=previous?latest.cost-previous.cost:0;
    return{key:`demo-${index}`,name,image:'',pack,history,latest,previous,highest,change,changePercent:previous?.cost?change/previous.cost*100:0,prices:unitPrices(latest.cost,pack),search:`${name} milk ${packing} ${supplier}`.toLowerCase(),demo:true};
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
  target.innerHTML=`<header class="page-head"><div><h1>Cost</h1><p>Find the cheapest product using the same weight, volume or piece cost.</p></div><button class="btn ${demoMode?'':'secondary'}" data-demo-toggle type="button"><i class="fa-solid ${demoMode?'fa-database':'fa-flask'}"></i> ${demoMode?'Back to live data':'View 10-product example'}</button></header>${demoMode?'<div class="cost-demo-note"><i class="fa-solid fa-circle-info"></i><div><strong>Example mode</strong><span>These 10 milk products are temporary examples only. Nothing was added to Supabase.</span></div></div>':''}<section class="cost-overview"><div class="cost-search"><i class="fa-solid fa-magnifying-glass"></i><input id="costSearch" value="${escapeHtml(query)}" placeholder="Search milk, tuna, rice or vendor" aria-label="Search product category or vendor"><strong>${filtered.length} results</strong></div>${filtered.length?`<div class="cost-bubbles" aria-label="Product cost summary">${filtered.slice(0,18).map(bubble).join('')}</div>`:'<div class="empty"><h2>No matching products</h2><p>Try another product category or vendor.</p></div>'}</section>${comparison(filtered,selected?.key)}${selected?detail(selected):'<section class="panel"><div class="empty"><h2>No cost data yet</h2><p>Enter a bill with product packing and price to begin.</p></div></section>'}`;
  target.querySelector('[data-demo-toggle]')?.addEventListener('click',()=>{demoMode=!demoMode;render(demoMode?demoProducts():liveProducts,'',demoMode?'milk':'')});
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
