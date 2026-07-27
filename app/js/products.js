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
    const date=billDate(row),supplier=vendor(row);
    for(const item of itemsOf(row)){
      const name=cleanName(get(item,'description','product','name')||get(row,'product','description'));
      const key=keyOf(name);if(!key)continue;
      const qty=firstNumber(item,'qty','quantity')||1;
      const line=firstNumber(item,'row_total','line_total','total','net_amount');
      const wholesale=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')||(line&&qty?line/qty:0);
      if(!wholesale)continue;
      const point={
        date,wholesale,vendor:supplier,
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
    const last=product.history.at(-1)||{};
    return {...product,latest:last.wholesale||0,retail:last.retail||0,lastDate:last.date||'',lastVendor:last.vendor||'',pack:last.pack||last.unit||'PCS',stock:last.stock||0,reorder:last.reorder||0,image:last.image||'',description:last.description||'',search:`${product.name} ${[...product.vendors].join(' ')} ${last.description||''}`.toLowerCase()};
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
  return `<article class="simple-product-card" aria-label="${escapeHtml(product.name)}">
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
  </article>`;
}

function renderList(query=''){
  const products=buildProducts(),needle=query.trim().toLowerCase(),filtered=needle?products.filter(product=>product.search.includes(needle)):products;
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Latest supplier, packing, wholesale price and retail price.</p></div></header>
  <section class="product-simple-toolbar"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" value="${escapeHtml(query)}" placeholder="Search product or vendor, for example tomato"></div><span id="productCount">${filtered.length} products</span></section>
  <section class="simple-product-list" id="productList">${filtered.map(productCard).join('')||'<div class="simple-empty card"><i class="fa-solid fa-box-open"></i><strong>No matching product</strong><span>Try another product or vendor name.</span></div>'}</section>`;
  const search=$('#productSearch');search.focus();search.setSelectionRange(search.value.length,search.value.length);
  let timer;search.oninput=event=>{clearTimeout(timer);timer=setTimeout(()=>renderList(event.target.value),100)};
}

export function productsPage(){renderList('')}
