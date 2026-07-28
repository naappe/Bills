import {store,escapeHtml,text,number,money,get,itemsOf,productName,billDate,vendor,lineTotal} from './store.js';
import {db} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ');
const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';

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

function referenceCost(cost,pack){
  if(!pack.amount)return{label:'Cost per pack',value:cost};
  if(pack.baseUnit==='G')return{label:'Cost per 1 kg',value:cost*1000/pack.amount};
  if(pack.baseUnit==='ML')return{label:'Cost per 1 litre',value:cost*1000/pack.amount};
  if(pack.baseUnit==='PCS')return{label:'Cost per piece',value:cost/pack.amount};
  return{label:'Cost per pack',value:cost};
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
    return {...product,latest,highest,previous,change,changePercent,unitCost:referenceCost(latest.cost,latest.pack),search:`${product.name} ${product.pack.packing} ${product.history.map(point=>point.vendor).join(' ')}`.toLowerCase()};
  }).sort((a,b)=>b.latest.date.localeCompare(a.latest.date)||a.name.localeCompare(b.name));
}

function graph(product){
  const points=product.history.slice(-12),width=720,height=210,pad=26;
  if(points.length<2)return '<div class="cost-no-chart"><i class="fa-solid fa-chart-line"></i><p>Add another bill price to create a trend graph.</p></div>';
  const values=points.map(point=>point.cost),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const coords=points.map((point,index)=>({x:pad+index*(width-pad*2)/(points.length-1),y:height-pad-(point.cost-min)*(height-pad*2)/span,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `<div class="cost-chart-scroll"><svg class="cost-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(product.name)} cost history"><defs><linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5a623" stop-opacity=".28"/><stop offset="1" stop-color="#f5a623" stop-opacity=".02"/></linearGradient></defs><path class="cost-chart-area" d="${path} L ${coords.at(-1).x} ${height-pad} L ${coords[0].x} ${height-pad} Z"/><path class="cost-chart-line" d="${path}"/>${coords.map(point=>`<g><circle cx="${point.x}" cy="${point.y}" r="5"/><title>${formatDate(point.date)} · ${money(point.cost)}</title></g>`).join('')}<text x="${pad}" y="${height-5}">${escapeHtml(formatDate(points[0].date))}</text><text x="${width-pad}" y="${height-5}" text-anchor="end">${escapeHtml(formatDate(points.at(-1).date))}</text></svg></div>`;
}

function bubble(product){
  const trend=product.change>0?'up':product.change<0?'down':'same';
  return `<button class="cost-bubble ${trend}" type="button" data-product="${escapeHtml(product.key)}" aria-label="View ${escapeHtml(product.name)} ${escapeHtml(product.pack.packing)}"><span class="cost-bubble-image">${product.image?`<img src="${escapeHtml(product.image)}" alt="">`:'<i class="fa-solid fa-box-open"></i>'}</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.pack.packing)}</small><small>${money(product.latest.cost)}</small></button>`;
}

function detail(product){
  const sign=product.change>0?'+':'';
  return `<section class="cost-detail"><header class="cost-detail-head"><div class="cost-product-title">${product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`:'<span><i class="fa-solid fa-box-open"></i></span>'}<div><small>Selected product</small><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.pack.packing)} · ${product.history.length} purchase${product.history.length===1?'':'s'} · ${new Set(product.history.map(point=>point.vendor)).size} vendor${new Set(product.history.map(point=>point.vendor)).size===1?'':'s'}</p></div></div><button class="btn secondary" data-edit-bill="${escapeHtml(product.latest.billId)}" data-item-index="${product.latest.itemIndex}" type="button"><i class="fa-solid fa-pen"></i> Modify original bill</button></header>
    <div class="cost-metrics"><article><span>Latest pack cost incl. GST</span><strong>${money(product.latest.cost)}</strong><small>${formatDate(product.latest.date)}</small></article><article><span>Highest pack cost</span><strong>${money(product.highest.cost)}</strong><small>${formatDate(product.highest.date)}</small></article><article><span>Pack size</span><strong>${escapeHtml(product.latest.pack.label)}</strong><small>${escapeHtml(product.latest.packing)}</small></article><article><span>${escapeHtml(product.unitCost.label)}</span><strong>${money(product.unitCost.value)}</strong><small>Like-for-like comparison</small></article></div>
    <div class="cost-analysis-grid"><article class="cost-chart-card"><header><div><span>Cost movement</span><h3>Purchase price history</h3></div><small>Same pack · including GST</small></header>${graph(product)}</article><article class="cost-latest-card"><span>Latest purchase</span><h3>${escapeHtml(product.latest.vendor)}</h3><dl><div><dt>Pack entered</dt><dd>${escapeHtml(product.latest.packing)}</dd></div><div><dt>Normalized size</dt><dd>${escapeHtml(product.latest.pack.label)}</dd></div><div><dt>${escapeHtml(product.unitCost.label)}</dt><dd>${money(product.unitCost.value)}</dd></div><div><dt>Before GST</dt><dd>${money(product.latest.rate)}</dd></div><div><dt>GST</dt><dd>${product.latest.gstRate}%</dd></div><div><dt>Latest change</dt><dd>${product.previous?`${sign}${product.changePercent.toFixed(1)}%`:'No previous price'}</dd></div></dl></article></div></section>`;
}

function render(products,selectedKey='',query=''){
  const target=content(),needle=text(query).toLowerCase(),filtered=products.filter(product=>!needle||product.search.includes(needle));
  const selected=filtered.find(product=>product.key===selectedKey)||filtered[0]||products[0];
  target.innerHTML=`<header class="page-head"><div><h1>Cost</h1><p>Compare product packing, landed cost and price changes from saved bills.</p></div></header><section class="cost-overview"><div class="cost-search"><i class="fa-solid fa-magnifying-glass"></i><input id="costSearch" value="${escapeHtml(query)}" placeholder="Find a product, packing or vendor" aria-label="Find a product, packing or vendor"><strong>${filtered.length} pack prices</strong></div>${filtered.length?`<div class="cost-bubbles" aria-label="Product cost summary">${filtered.slice(0,18).map(bubble).join('')}</div>`:'<div class="empty"><h2>No matching products</h2><p>Try another product, packing or vendor.</p></div>'}</section>${selected?detail(selected):'<section class="panel"><div class="empty"><h2>No cost data yet</h2><p>Enter a bill with product packing and price to begin.</p></div></section>'}`;
  $('#costSearch')?.addEventListener('input',event=>{const value=event.target.value;render(products,selected?.key,value);const input=$('#costSearch');input.focus();input.setSelectionRange(value.length,value.length)});
  target.querySelectorAll('[data-product]').forEach(button=>button.addEventListener('click',()=>render(products,button.dataset.product,needle)));
  target.querySelector('[data-edit-bill]')?.addEventListener('click',event=>{const bill=store.rows.find(row=>String(row.id)===event.currentTarget.dataset.editBill);if(!bill)return;store.editing=bill;location.hash='#new'});
}

export async function costPage(){
  const target=content();
  target.innerHTML='<header class="page-head"><div><h1>Cost</h1><p>Preparing product costs…</p></div></header><section class="panel"><div class="empty"><i class="fa-solid fa-circle-notch fa-spin"></i></div></section>';
  const images=new Map();
  try{const {data,error}=await db.from('products').select('name,image_url').eq('is_active',true).is('deleted_at',null);if(error)throw error;for(const product of data||[])if(product.image_url)images.set(keyOf(product.name),product.image_url)}
  catch(error){console.warn('[cost] product images unavailable',error)}
  if(store.route!=='cost')return;
  render(buildProducts(images));
}
