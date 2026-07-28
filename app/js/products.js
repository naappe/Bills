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
let masterProducts=new Map(),selectedProductKey='';
const editDistance=(a,b)=>{a=keyOf(a);b=keyOf(b);const r=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const h=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=h}}return r[b.length]};
const productScore=(q,p)=>{q=keyOf(q);const n=keyOf(p.name);if(!q)return 100;if(n===q)return 120;if(n.includes(q)||p.search.includes(q))return 100;return Math.max(0,75-editDistance(q,n)*8)};

async function loadProductImages(){
  const {data,error}=await db.from('products').select('id,name,image_url,is_active,deleted_at,current_rate').eq('is_active',true).is('deleted_at',null);
  if(error){console.warn('[products] product image lookup failed',error);return}
  masterProducts=new Map((data||[]).map(product=>[keyOf(product.name),product]));
}

function buildProducts(){
  if(cache.revision===store.dataRevision)return cache.products;
  const map=new Map();
  for(const master of masterProducts.values()){const key=keyOf(master.name);if(key)map.set(key,{key,name:master.name,history:[],vendors:new Set()})}
  for(const row of store.rows){
    const date=billDate(row),supplier=vendor(row);
    for(const [itemIndex,item] of itemsOf(row).entries()){
      const name=cleanName(get(item,'description','product','name')||get(row,'product','description'));
      const key=keyOf(name);if(!key)continue;
      const qty=firstNumber(item,'qty','quantity')||1;
      const line=firstNumber(item,'row_total','line_total','total','net_amount');
      const wholesale=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')||(line&&qty?line/qty:0);
      if(!wholesale)continue;
      const point={
        date,wholesale,vendor:supplier,billId:text(get(row,'id')),itemIndex,
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
    return {...product,productId:master.id||'',sourceBillId:last.billId||'',sourceItemIndex:Number.isInteger(last.itemIndex)?last.itemIndex:0,latest:last.wholesale||number(master.current_rate)||0,retail:last.retail||0,lastDate:last.date||'',lastVendor:last.vendor||'',pack:last.pack||last.unit||'PCS',stock:last.stock||0,reorder:last.reorder||0,image:text(master.image_url)||last.image||'',description:last.description||'',search:`${product.name} ${[...product.vendors].join(' ')} ${last.description||''}`.toLowerCase()};
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
  store.editingProduct=product.productId?{productId:product.productId,oldName:product.name,newName:product.name,itemIndex:product.sourceItemIndex,saveRequested:false}:null;
  store.editing=bill;
  location.hash='#new';
}

async function syncEditedProductName(){
  const edit=store.editingProduct;
  store.editingProduct=null;
  if(!edit?.productId||!edit.saveRequested)return;
  const newName=cleanName(edit.newName);
  if(!newName||keyOf(newName)===keyOf(edit.oldName))return;
  const {error}=await db.from('products').update({name:newName}).eq('id',edit.productId);
  if(error){console.error('[products] product name sync failed',error);return}
  await loadProductImages();
  cache.revision=-1;
}

document.addEventListener('input',event=>{
  const edit=store.editingProduct,target=event.target;
  if(!edit||!target?.matches?.('[data-field="description"]'))return;
  const row=target.closest('.bill-row'),rows=[...document.querySelectorAll('#billItems .bill-row')];
  if(row&&rows.indexOf(row)===edit.itemIndex)edit.newName=target.value;
},true);

document.addEventListener('click',event=>{
  if(store.editingProduct&&event.target.closest?.('[data-confirm]'))store.editingProduct.saveRequested=true;
},true);

window.addEventListener('hashchange',()=>{
  if(location.hash==='#bills'&&store.editingProduct)syncEditedProductName().catch(error=>console.error('[products] product rename sync failed',error));
});

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

function productOverview(products){
 const selected=products.find(p=>p.key===selectedProductKey),vendors=new Set(products.flatMap(p=>[...p.vendors])),records=products.reduce((s,p)=>s+p.history.length,0);
 if(!selected){const top=products.filter(p=>p.latest>0).sort((a,b)=>b.latest-a.latest).slice(0,10),max=Math.max(...top.map(p=>p.latest),1);return `<section class="card" style="padding:18px"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px"><div><small>MASTER PRODUCTS</small><h2>${products.length}</h2></div><div><small>VENDORS</small><h2>${vendors.size}</h2></div><div><small>PURCHASE RECORDS</small><h2>${records}</h2></div></div><h2>All product price summary</h2><p>Click a bar or product to view its full pricing history.</p><div style="display:flex;align-items:end;gap:12px;height:190px;overflow-x:auto">${top.map(p=>`<button data-pick="${escapeHtml(p.key)}" title="${escapeHtml(p.name)} ${money(p.latest)}" style="border:0;background:var(--brand-gold);min-width:58px;height:${Math.max(24,p.latest/max*135)}px;border-radius:8px 8px 0 0;cursor:pointer"><span style="writing-mode:vertical-rl;font-size:9px">${escapeHtml(p.name.slice(0,16))}</span></button>`).join('')}</div></section>`;}
 const latest=new Map();[...selected.history].reverse().forEach(x=>{if(!latest.has(x.vendor))latest.set(x.vendor,x)});return `<section class="card" style="padding:18px"><div style="display:flex;justify-content:space-between;gap:12px"><div><h2>${escapeHtml(selected.name)}</h2><p>${selected.history.length} purchases · ${selected.vendors.size} vendors · same master product</p></div><button class="btn secondary" id="allProducts">All products</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><h3>Price history</h3>${[...selected.history].reverse().slice(0,12).map(x=>`<div style="display:grid;grid-template-columns:90px 1fr auto;gap:10px;padding:9px;border-bottom:1px solid var(--border)"><span>${escapeHtml(x.date)}</span><span>${escapeHtml(x.vendor)}</span><strong>${money(x.wholesale)}</strong></div>`).join('')||'<p>No history yet.</p>'}</div><div><h3>Latest vendor prices</h3>${[...latest.values()].sort((a,b)=>a.wholesale-b.wholesale).map((x,i)=>`<div style="display:flex;justify-content:space-between;padding:11px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px"><span>${i===0?'★ ':''}${escapeHtml(x.vendor)}</span><strong>${money(x.wholesale)}</strong></div>`).join('')||'<p>No vendor prices yet.</p>'}</div></div></section>`;
}
function openMergeProducts(){
 const ps=[...masterProducts.values()].sort((a,b)=>a.name.localeCompare(b.name)),opts=ps.map(p=>`<option value="${escapeHtml(p.name)}"></option>`).join(''),chosen=findProduct(selectedProductKey);
 const modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<section class="modal-card" style="width:min(900px,95vw)"><header class="card-head"><h2>Merge products</h2><button class="btn secondary small" data-close>Close</button></header><div class="card-body"><datalist id="masterNames">${opts}</datalist><div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:14px;align-items:center"><label><strong>Wrong product</strong><input id="wrongProduct" list="masterNames" value="${escapeHtml(chosen?.name||'')}" placeholder="Select wrong product"></label><div style="font-size:28px;text-align:center">→</div><label><strong>Correct product name</strong><input id="correctProduct" list="masterNames" placeholder="Search or write correct name"></label></div><p>Old bills, images and price history will use the correct master product. Vendors will not change.</p><button class="btn danger" id="doMerge">Merge products</button></div></section>`;document.body.appendChild(modal);modal.querySelector('[data-close]').onclick=()=>modal.remove();
 const exact=v=>ps.find(p=>keyOf(p.name)===keyOf(v));modal.querySelector('#doMerge').onclick=async e=>{const source=exact(modal.querySelector('#wrongProduct').value),name=text(modal.querySelector('#correctProduct').value);if(!source){alert('Select the wrong product.');return}if(!name||keyOf(name)===keyOf(source.name)){alert('Write or select a different correct product name.');return}if(!confirm(`Merge “${source.name}” into “${name}”?`))return;e.currentTarget.disabled=true;try{let target=exact(name);if(!target){const {data,error}=await db.rpc('create_master_product',{p_name:name});if(error)throw error;target=Array.isArray(data)?data[0]:data}const {error}=await db.rpc('merge_master_products',{p_source_id:source.id,p_target_id:target.id});if(error)throw error;location.reload()}catch(error){e.currentTarget.disabled=false;alert(error.message||'Merge failed.')}};
}

function bindProductCards(query){document.querySelectorAll('.simple-product-card[data-product-key]').forEach(card=>{card.style.cursor='pointer';const pick=()=>{selectedProductKey=card.dataset.productKey;renderList(query);window.scrollTo({top:0,behavior:'smooth'})};card.addEventListener('click',e=>{if(!e.target.closest('button'))pick()});card.addEventListener('keydown',e=>{if(e.key==='Enter'){pick()}})})}

function renderList(query=''){
 const products=buildProducts(),filtered=products.map(p=>({...p,score:productScore(query,p)})).filter(p=>p.score>20).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 content().innerHTML=`<header class="page-head"><div><h1>Master products</h1></div></header>${productOverview(products)}<section class="product-simple-toolbar"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" value="${escapeHtml(query)}" placeholder="Search product — spelling mistakes accepted"></div><span>${filtered.length} products</span>${isAdmin()?'<button class="btn" id="mergeProducts">Merge products</button>':''}</section><section class="simple-product-list">${filtered.map(productCard).join('')||'<div class="empty">No matching product.</div>'}</section>`;
 bindImageActions(query);bindProductCards(query);$('#mergeProducts')?.addEventListener('click',openMergeProducts);$('#allProducts')?.addEventListener('click',()=>{selectedProductKey='';renderList(query)});document.querySelectorAll('[data-pick]').forEach(x=>x.addEventListener('click',()=>{selectedProductKey=x.dataset.pick;renderList(query)}));let timer;$('#productSearch').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>renderList(e.target.value),100)};
}

export async function productsPage(){
  await loadProductImages();
  cache.revision=-1;
  renderList('');
}
