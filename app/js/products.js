import {store,money,escapeHtml,text,number,billDate,itemOf,get,vendor} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
let cache={revision:-1,products:[]};

function buildProducts(){
  if(cache.revision===store.dataRevision)return cache.products;
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row),supplier=vendor(row),bill=text(get(row,'bill_no','billNo'));
    for(const item of itemsOf(row)){
      const name=cleanName(get(item,'description','product','name')||get(row,'product','description'));
      const key=keyOf(name);if(!key)continue;
      const qty=firstNumber(item,'qty','quantity')||1;
      const line=firstNumber(item,'row_total','line_total','total','net_amount');
      const wholesale=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')||(line&&qty?line/qty:0);
      if(!wholesale)continue;
      const point={
        date,wholesale,vendor:supplier,bill,qty,
        pack:text(get(item,'pack_format','packing')),
        unit:text(get(item,'unit')).toUpperCase()||'PCS',
        retail:firstNumber(item,'retail_price','selling_price','sale_price'),
        stock:firstNumber(item,'stock','stock_qty','quantity_on_hand'),
        reorder:firstNumber(item,'reorder_level','low_stock_level','minimum_stock'),
        image:text(get(item,'image_url','photo_url','image')),
        description:text(get(item,'product_description','notes','category'))
      };
      if(!map.has(key))map.set(key,{key,name,history:[],vendors:new Set()});
      const product=map.get(key);product.history.push(point);if(supplier)product.vendors.add(supplier);
    }
  }
  const products=[...map.values()].map(product=>{
    product.history=product.history.filter(point=>point.date).sort((a,b)=>a.date.localeCompare(b.date));
    const last=product.history.at(-1)||{},prices=product.history.map(point=>point.wholesale);
    const vendorStats=new Map();
    for(const point of product.history){const name=point.vendor||'Unknown vendor';if(!vendorStats.has(name))vendorStats.set(name,[]);vendorStats.get(name).push(point.wholesale)}
    const vendors=[...vendorStats.entries()].map(([name,values])=>({name,latest:values.at(-1),low:Math.min(...values),average:values.reduce((s,v)=>s+v,0)/values.length,count:values.length})).sort((a,b)=>a.average-b.average);
    return {...product,latest:last.wholesale||0,retail:last.retail||0,lastDate:last.date||'',lastVendor:last.vendor||'',pack:last.pack||last.unit||'PCS',stock:last.stock||0,reorder:last.reorder||0,image:last.image||'',description:last.description||'',low:prices.length?Math.min(...prices):0,high:prices.length?Math.max(...prices):0,vendorRows:vendors,search:`${product.name} ${[...product.vendors].join(' ')} ${last.description||''}`.toLowerCase()};
  }).sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||a.name.localeCompare(b.name));
  cache={revision:store.dataRevision,products};return products;
}

function stockState(product){
  if(!product.stock)return{label:'Not tracked',className:'unknown'};
  if(product.reorder&&product.stock<=product.reorder)return{label:'Low stock',className:'low'};
  return{label:'In stock',className:'good'};
}

function imageMarkup(product){
  if(product.image)return`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`;
  return`<span>${escapeHtml(product.name.slice(0,2).toUpperCase())}</span>`;
}

function productCard(product){
  const stock=stockState(product);
  return `<button class="simple-product-card" data-product="${escapeHtml(product.key)}" type="button">
    <div class="simple-product-image">${imageMarkup(product)}</div>
    <div class="simple-product-main">
      <div class="simple-product-title"><strong>${escapeHtml(product.name)}</strong><span class="stock-chip ${stock.className}">${stock.label}</span></div>
      <p>${escapeHtml(product.description||`${product.lastVendor||'Unknown vendor'} · ${product.pack}`)}</p>
      <div class="simple-product-meta"><span><b>Vendor</b>${escapeHtml(product.lastVendor||'Unknown')}</span><span><b>Pack</b>${escapeHtml(product.pack)}</span></div>
    </div>
    <div class="simple-product-prices">
      <span>Wholesale</span><strong>${money(product.latest)}</strong>
      <small>Retail: ${product.retail?money(product.retail):'Not set'}</small>
    </div>
  </button>`;
}

function graph(history){
  if(history.length<2)return`<div class="simple-empty"><i class="fa-solid fa-chart-line"></i><strong>One saved price only</strong><span>The next purchase will create a price trend.</span></div>`;
  const points=history.slice(-20),width=820,height=220,pad=34,min=Math.min(...points.map(p=>p.wholesale)),max=Math.max(...points.map(p=>p.wholesale)),range=max-min||1;
  const coords=points.map((point,index)=>({x:pad+index*(width-pad*2)/Math.max(1,points.length-1),y:height-pad-(point.wholesale-min)*(height-pad*2)/range,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return `<div class="simple-product-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Wholesale price history"><path d="${path}"/>${coords.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="5"><title>${escapeHtml(point.date)} · ${escapeHtml(point.vendor)} · ${money(point.wholesale)}</title></circle>`).join('')}<text x="${pad}" y="22">High ${escapeHtml(money(max))}</text><text x="${pad}" y="${height-8}">Low ${escapeHtml(money(min))}</text></svg></div>`;
}

function detail(product){
  const latest=product.history.at(-1),cheapest=product.vendorRows[0],stock=stockState(product);
  content().innerHTML=`<header class="page-head"><div><button class="text-back" id="backProducts" type="button"><i class="fa-solid fa-arrow-left"></i> Products</button><h1>${escapeHtml(product.name)}</h1><p>${escapeHtml(product.description||'Purchase-price history and supplier comparison.')}</p></div></header>
  <section class="product-focus-card">
    <div class="simple-product-image large">${imageMarkup(product)}</div>
    <div><span class="eyebrow">Latest supplier</span><h2>${escapeHtml(product.lastVendor||'Unknown vendor')}</h2><p>${escapeHtml(product.pack)} · Last purchased ${escapeHtml(product.lastDate||'No date')}</p></div>
    <div class="focus-wholesale"><span>Wholesale price</span><strong>${money(product.latest)}</strong><small>Retail: ${product.retail?money(product.retail):'Not set'}</small></div>
    <span class="stock-chip ${stock.className}">${stock.label}</span>
  </section>
  <section class="product-summary-grid">
    <article><span>Latest</span><strong>${money(product.latest)}</strong><small>${escapeHtml(product.lastVendor||'Unknown vendor')}</small></article>
    <article><span>Cheapest</span><strong>${money(cheapest?.low||product.low)}</strong><small>${escapeHtml(cheapest?.name||'Unknown vendor')}</small></article>
    <article><span>Highest</span><strong>${money(product.high)}</strong><small>Recorded wholesale</small></article>
    <article><span>Purchases</span><strong>${product.history.length}</strong><small>${product.vendors.size} vendor${product.vendors.size===1?'':'s'}</small></article>
  </section>
  <section class="simple-product-layout">
    <article class="card"><header class="card-head"><div><h2>Wholesale price history</h2><small>Date, vendor and recorded purchase price</small></div></header><div class="card-body">${graph(product.history)}</div></article>
    <article class="card"><header class="card-head"><div><h2>Supplier prices</h2><small>Cheapest average first</small></div></header><div class="simple-vendor-list">${product.vendorRows.map((item,index)=>`<div><span>${index===0&&product.vendorRows.length>1?'<b>Cheapest</b>':''}<strong>${escapeHtml(item.name)}</strong><small>${item.count} purchase${item.count===1?'':'s'}</small></span><em>${money(item.latest)}</em></div>`).join('')}</div></article>
  </section>
  <section class="card"><header class="card-head"><div><h2>Purchase history</h2><small>Latest purchases first</small></div></header><div class="simple-history">${product.history.slice().reverse().map(point=>`<div><time>${escapeHtml(point.date)}</time><span><strong>${escapeHtml(point.vendor||'Unknown vendor')}</strong><small>${escapeHtml([point.pack||point.unit,`Qty ${point.qty}`,point.bill?`Bill ${point.bill}`:''].filter(Boolean).join(' · '))}</small></span><b>${money(point.wholesale)}</b></div>`).join('')}</div></section>`;
  $('#backProducts').onclick=()=>renderList();
}

function renderList(query=''){
  const products=buildProducts(),needle=query.trim().toLowerCase(),filtered=needle?products.filter(product=>product.search.includes(needle)):products;
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Latest supplier, packing, wholesale price and retail price.</p></div></header>
  <section class="product-simple-toolbar"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" value="${escapeHtml(query)}" placeholder="Search product or vendor, for example tomato"></div><span id="productCount">${filtered.length} products</span></section>
  <section class="simple-product-list" id="productList">${filtered.map(productCard).join('')||'<div class="simple-empty card"><i class="fa-solid fa-box-open"></i><strong>No matching product</strong><span>Try another product or vendor name.</span></div>'}</section>`;
  const search=$('#productSearch');search.focus();search.setSelectionRange(search.value.length,search.value.length);
  let timer;search.oninput=event=>{clearTimeout(timer);timer=setTimeout(()=>renderList(event.target.value),100)};
  content().querySelectorAll('[data-product]').forEach(button=>button.onclick=()=>{const product=products.find(item=>item.key===button.dataset.product);if(product)detail(product)});
  if(needle&&filtered.length===1)detail(filtered[0]);
}

export function productsPage(){renderList('')}
