import {store,money,escapeHtml,text,number,billDate,itemOf,get,vendor} from './store.js';
import {db} from './data.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const isAdmin=()=>store.role==='admin';
let cache={revision:-1,products:[]};
let masterProducts=new Map();

async function loadProductImages(){
  const {data,error}=await db.from('products').select('id,name,image_url,is_active');
  if(error){console.warn('[products] product image lookup failed',error);return}
  masterProducts=new Map((data||[]).map(product=>[keyOf(product.name),product]));
}

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
        date,wholesale,vendor:supplier,billId:text(get(row,'id')),
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
    const last=product.history.at(-1)||{},master=masterProducts.get(product.key)||{};
    return {...product,productId:master.id||'',sourceBillId:last.billId||'',latest:last.wholesale||0,retail:last.retail||0,lastDate:last.date||'',lastVendor:last.vendor||'',pack:last.pack||last.unit||'PCS',stock:last.stock||0,reorder:last.reorder||0,image:text(master.image_url)||last.image||'',description:last.description||'',search:`${product.name} ${[...product.vendors].join(' ')} ${last.description||''}`.toLowerCase()};
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
  if(isAdmin())return`<button class="product-image-empty" type="button" data-image-action="upload" data-product-key="${escapeHtml(product.key)}"><i class="fa-solid fa-camera"></i><span>Upload image</span></button>`;
  return`<span class="product-image-missing">No image</span>`;
}

function productCard(product){
  const stock=stockState(product);
  return `<article class="simple-product-card" aria-label="${escapeHtml(product.name)}" data-product-key="${escapeHtml(product.key)}" ${isAdmin()?'role="button" tabindex="0" title="Open original bill to edit"':''}>
    <div class="simple-product-image">${imageMarkup(product)}</div>
    <div class="simple-product-main">
      <div class="simple-product-title"><strong>${escapeHtml(product.name)}</strong><span class="stock-chip ${stock.className}">${stock.label}</span></div>
      <p>${escapeHtml(product.description||`${product.lastVendor||'Unknown vendor'} · ${product.pack}`)}</p>
      <div class="simple-product-meta"><span><b>Vendor</b>${escapeHtml(product.lastVendor||'Unknown')}</span><span><b>Pack</b>${escapeHtml(product.pack)}</span></div>
      ${isAdmin()?`<div class="product-image-actions"><button type="button" data-image-action="upload" data-product-key="${escapeHtml(product.key)}">${product.image?'Change image':'Upload image'}</button><button type="button" data-image-action="url" data-product-key="${escapeHtml(product.key)}">Paste URL</button>${product.image?`<button type="button" data-image-action="remove" data-product-key="${escapeHtml(product.key)}">Remove</button>`:''}</div>`:''}
    </div>
    <div class="simple-product-prices">
      <span>Wholesale</span><strong>${money(product.latest)}</strong>
      <small>Retail: ${product.retail?money(product.retail):'Not set'}</small>
    </div>
  </article>`;
}

function findProduct(key){return buildProducts().find(product=>product.key===key)}

function openProductBill(product){
  if(!isAdmin()||!product?.sourceBillId)return;
  const bill=store.rows.find(row=>String(get(row,'id'))===String(product.sourceBillId));
  if(!bill){alert('The original bill could not be found.');return}
  store.editing=bill;
  location.hash='#new';
}

async function ensureMasterProduct(product){
  if(product.productId)return product.productId;
  const {data,error}=await db.from('products').insert({name:product.name,image_url:null}).select('id,name,image_url,is_active').single();
  if(error)throw error;
  masterProducts.set(product.key,data);
  cache.revision=-1;
  return data.id;
}

async function saveImageUrl(product,url){
  const productId=await ensureMasterProduct(product);
  const {error}=await db.from('products').update({image_url:url||null}).eq('id',productId);
  if(error)throw error;
  masterProducts.set(product.key,{...(masterProducts.get(product.key)||{}),id:productId,name:product.name,image_url:url||null});
  cache.revision=-1;
}

async function uploadImage(product,file){
  const productId=await ensureMasterProduct(product);
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`products/${productId}/${Date.now()}.${ext}`;
  const {error}=await db.storage.from('stock-photos').upload(path,file,{upsert:true,contentType:file.type||undefined});
  if(error)throw error;
  await saveImageUrl(product,path);
}

function bindImageActions(query){
  document.querySelectorAll('[data-image-action]').forEach(button=>button.onclick=async event=>{
    event.preventDefault();event.stopPropagation();
    const product=findProduct(button.dataset.productKey);if(!product)return;
    try{
      if(button.dataset.imageAction==='url'){
        const url=prompt('Paste product image URL',product.image||'');
        if(url===null)return;
        await saveImageUrl(product,url.trim());
      }else if(button.dataset.imageAction==='remove'){
        if(!confirm(`Remove image for ${product.name}?`))return;
        await saveImageUrl(product,'');
      }else{
        const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/heic,image/heif';
        input.onchange=async()=>{const file=input.files?.[0];if(!file)return;await uploadImage(product,file);renderList(query)};
        input.click();return;
      }
      renderList(query);
    }catch(error){console.error('[products] image update failed',error);alert(error.message||'Image update failed.');}
  });
}

function bindProductCards(){
  if(!isAdmin())return;
  document.querySelectorAll('.simple-product-card[data-product-key]').forEach(card=>{
    const open=()=>openProductBill(findProduct(card.dataset.productKey));
    card.addEventListener('click',open);
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});
  });
}

function renderList(query=''){
  const products=buildProducts(),needle=query.trim().toLowerCase(),filtered=needle?products.filter(product=>product.search.includes(needle)):products;
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Latest supplier, packing, wholesale price and retail price.</p></div></header>
  <section class="product-simple-toolbar"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" value="${escapeHtml(query)}" placeholder="Search product or vendor, for example tomato"></div><span id="productCount">${filtered.length} products</span></section>
  <section class="simple-product-list" id="productList">${filtered.map(productCard).join('')||'<div class="simple-empty card"><i class="fa-solid fa-box-open"></i><strong>No matching product</strong><span>Try another product or vendor name.</span></div>'}</section>`;
  bindImageActions(query);
  bindProductCards();
  const search=$('#productSearch');search.focus();search.setSelectionRange(search.value.length,search.value.length);
  let timer;search.oninput=event=>{clearTimeout(timer);timer=setTimeout(()=>renderList(event.target.value),100)};
}

export async function productsPage(){
  if(!masterProducts.size)await loadProductImages();
  cache.revision=-1;
  renderList('');
}
