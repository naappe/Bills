import {store,money,escapeHtml,text,number,billDate,get} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const META_KEY='bills.productDisplay.v1';

function readMeta(){
  try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}
}
function writeMeta(value){localStorage.setItem(META_KEY,JSON.stringify(value))}
function keyOf(value){return text(value).toLowerCase().replace(/\s+/g,' ').trim()}
function cleanName(value){
  const source=text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
  return source||'Unspecified product';
}
function firstNumber(source,...fields){
  for(const field of fields){
    const value=number(get(source,field));
    if(value>0)return value;
  }
  return 0;
}
function parseItems(row){
  if(Array.isArray(row?.items)&&row.items.length)return row.items;
  if(typeof row?.items==='string'){
    try{
      const parsed=JSON.parse(row.items);
      if(Array.isArray(parsed)&&parsed.length)return parsed;
    }catch{}
  }
  return [row];
}
function productName(row,item){
  return cleanName(get(item,'product_name','product','name','description','item_name')||get(row,'product_name','product','description','item_name'));
}
function imageOf(row,item,override){
  return text(override||get(item,'photo_url','image_url','product_image','image','photo')||get(row,'photo_url','image_url','product_image','image','photo'));
}
function retailRate(item,row){
  return firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','unit_price','price','retail_rate','retail_price')
    || firstNumber(row,'pack_rate','bill_rate','rate','purchase_rate','unit_price','price','retail_rate','retail_price');
}
function quantityOf(item){return firstNumber(item,'qty','quantity','pack_qty','count')||1}
function wholesaleTotal(item,row,itemCount,retail){
  const savedItemTotal=firstNumber(item,'line_total','lineTotal','item_total','total_amount','subtotal','total','amount','net_amount');
  if(savedItemTotal)return savedItemTotal;
  if(retail)return retail*quantityOf(item);
  return itemCount===1?firstNumber(row,'line_total','total','amount','net_amount','bill_total','grand_total'):0;
}
function dateOf(row){return billDate(row)||String(get(row,'created_at')||'').slice(0,10)}

function buildProducts(){
  const meta=readMeta(),map=new Map();
  for(const row of store.rows||[]){
    const items=parseItems(row),date=dateOf(row);
    for(const item of items){
      const rawName=productName(row,item),key=keyOf(rawName);
      if(!key)continue;
      const override=meta[key]||{},retail=retailRate(item,row),wholesale=wholesaleTotal(item,row,items.length,retail);
      if(!map.has(key))map.set(key,{key,name:cleanName(override.name||rawName),image:'',imageFit:override.imageFit==='cover'?'cover':'contain',retail:0,wholesale:0,lastDate:'',records:0});
      const product=map.get(key);
      product.records+=1;
      if(!product.lastDate||date>=product.lastDate){
        product.lastDate=date;
        product.name=cleanName(override.name||rawName);
        product.image=imageOf(row,item,override.image);
        product.imageFit=override.imageFit==='cover'?'cover':'contain';
        product.retail=retail;
        product.wholesale=wholesale;
      }
    }
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

function imageMarkup(product){
  if(product.image){
    return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.charAt(0)||'P')}</span>`;
  }
  return `<span class="product-fallback">${escapeHtml(product.name.charAt(0)||'P')}</span>`;
}

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Product values are read automatically from saved bill items.</p></div></header>
  <section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name"><span id="productCount">${products.length} products</span></section>
  <section class="product-catalog" id="productCatalog"></section>`;

  const draw=()=>{
    const query=text($('#productSearch').value).toLowerCase();
    const filtered=products.filter(product=>!query||product.name.toLowerCase().includes(query));
    $('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>`<article class="product-record simple-product-card">
      <div class="product-photo">${imageMarkup(product)}</div>
      <div class="product-info">
        <div class="product-title-row"><h3>${escapeHtml(product.name)}</h3>${store.role==='admin'?`<button class="btn secondary small" data-product-edit="${escapeHtml(product.key)}">Edit</button>`:''}</div>
        <div class="product-price-grid">
          <div class="product-price retail"><span>Retail</span><strong>${product.retail?money(product.retail):'Not recorded'}</strong><small>Rate saved in bill entry</small></div>
          <div class="product-price wholesale"><span>Wholesale</span><strong>${product.wholesale?money(product.wholesale):'Not recorded'}</strong><small>Saved line total or rate × quantity</small></div>
        </div>
      </div>
    </article>`).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };

  $('#productSearch').oninput=draw;
  draw();

  function showEdit(product){
    if(store.role!=='admin'||!product)return;
    const modal=document.createElement('div');
    modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product display</h2><small>Prices remain linked to saved bill data.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Photo URL<input id="editProductImage" type="url" value="${escapeHtml(product.image)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{
      event.preventDefault();
      const meta=readMeta();
      meta[product.key]={name:cleanName(modal.querySelector('#editProductName').value),image:text(modal.querySelector('#editProductImage').value),imageFit:modal.querySelector('#editProductFit').value};
      writeMeta(meta);
      modal.remove();
      productsPage();
    };
  }
}
