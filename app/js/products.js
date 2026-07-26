import {store,money,escapeHtml,text,number,billDate,productOf,itemOf,get} from './store.js';

const $=s=>document.querySelector(s);
const content=()=>$('#content');
const META_KEY='bills.productMetadata.v3';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const keyOf=name=>text(name).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'';
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const imageOf=(row,item,override)=>text(override||get(item,'photo_url','image_url','image','photo')||get(row,'photo_url','image_url','image','photo'));

function retailRate(item,row){
  return firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','unit_price','price')
    || firstNumber(row,'pack_rate','bill_rate','rate','purchase_rate','unit_price','price');
}

function wholesaleTotal(item,row,retail){
  const savedTotal=firstNumber(item,'line_total','total','amount','net_amount')
    || firstNumber(row,'line_total','total','amount','net_amount','bill_total');
  if(savedTotal)return savedTotal;
  const qty=firstNumber(item,'qty','quantity')||1;
  return retail*qty;
}

function buildProducts(){
  const meta=readMeta(),map=new Map();
  [...store.rows].sort((a,b)=>billDate(a).localeCompare(billDate(b))).forEach(row=>{
    const raw=productOf(row),key=keyOf(raw);
    if(!key)return;
    const item=itemOf(row),override=meta[key]||{},date=safeDate(billDate(row));
    if(!map.has(key))map.set(key,{key,name:cleanName(override.name||raw),photo:imageOf(row,item,override.photo),imageFit:override.imageFit==='cover'?'cover':'contain',retail:0,wholesale:0,lastDate:'',records:0});
    const product=map.get(key),retail=retailRate(item,row),wholesale=wholesaleTotal(item,row,retail);
    product.records++;
    if(!product.lastDate||date>=product.lastDate){
      product.lastDate=date;
      product.name=cleanName(override.name||raw);
      product.photo=imageOf(row,item,override.photo);
      product.imageFit=override.imageFit==='cover'?'cover':'contain';
      product.retail=retail;
      product.wholesale=wholesale;
    }
  });
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

const imageMarkup=product=>product.photo
  ?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`
  :`<span class="product-fallback">${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`;

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Product name, image, retail rate and wholesale total from the latest bill entry.</p></div></header>
  <section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name"><span id="productCount">${products.length} products</span></section>
  <section class="product-catalog" id="productCatalog"></section>`;

  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase();
    const filtered=products.filter(product=>!q||product.name.toLowerCase().includes(q));
    $('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>`<article class="product-record simple-product-card">
      <div class="product-photo">${imageMarkup(product)}</div>
      <div class="product-info">
        <div class="product-title-row"><h3>${escapeHtml(product.name)}</h3>${store.role==='admin'?`<button class="btn secondary small" data-product-edit="${escapeHtml(product.key)}">Edit</button>`:''}</div>
        <div class="product-price-grid">
          <div class="product-price retail"><span>Retail</span><strong>${product.retail?money(product.retail):'Not recorded'}</strong><small>Rate saved in bill entry</small></div>
          <div class="product-price wholesale"><span>Wholesale</span><strong>${product.wholesale?money(product.wholesale):'Not recorded'}</strong><small>Total pack × quantity</small></div>
        </div>
      </div>
    </article>`).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };

  $('#productSearch').oninput=draw;
  draw();

  function showEdit(product){
    if(store.role!=='admin')return;
    const modal=document.createElement('div');
    modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Only catalogue name and image are edited here. Prices come automatically from bills.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{
      event.preventDefault();
      const meta=readMeta();
      meta[product.key]={name:cleanName(modal.querySelector('#editProductName').value),photo:text(modal.querySelector('#editProductPhoto').value),imageFit:modal.querySelector('#editProductFit').value};
      writeMeta(meta);
      modal.remove();
      productsPage();
    };
  }
}
