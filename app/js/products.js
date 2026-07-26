import {store,money,escapeHtml,text,number,billDate,itemOf,get} from './store.js';

const $=s=>document.querySelector(s);
const content=()=>$('#content');
const META_KEY='bills.productMetadata.v3';
const IMAGE_KEY='bills.productImages.v1';
const readJson=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'';
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const productName=(item,row)=>cleanName(get(item,'description','product','name')||get(row,'product','description'));
const imageOf=(row,item,override,uploaded)=>text(override||uploaded||get(item,'photo_url','image_url','image','photo')||get(row,'photo_url','image_url','image','photo'));

function parsePack(pack,unit,qty=1){
  const normalized=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  const fallback=text(unit).toUpperCase()||'PCS';
  let count=1,size=1,kind=fallback;
  const multi=normalized.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);
  const single=normalized.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);
  if(multi){count=number(multi[1]);size=number(multi[2]);kind=multi[3].toUpperCase()}
  else if(single){size=number(single[1]);kind=single[2].toUpperCase()}
  const packageQty=Math.max(number(qty)||1,1);
  const pieces=count*packageQty;
  let base=count*size*packageQty;
  if(kind==='KG')base*=1000;
  if(kind==='L')base*=1000;
  const baseUnit=['KG','G'].includes(kind)?'G':['L','ML'].includes(kind)?'ML':'PCS';
  return{count,size,kind,packageQty,pieces,base,baseUnit};
}

function formatMeasurement(parsed){
  if(parsed.baseUnit==='G'){
    const kg=parsed.base/1000;
    return `${parsed.base.toLocaleString('en-US')} G · ${kg.toLocaleString('en-US',{maximumFractionDigits:3})} KG`;
  }
  if(parsed.baseUnit==='ML'){
    const liters=parsed.base/1000;
    return `${parsed.base.toLocaleString('en-US')} ML · ${liters.toLocaleString('en-US',{maximumFractionDigits:3})} L`;
  }
  return `${parsed.pieces.toLocaleString('en-US')} PCS`;
}

function retailRate(item,row,wholesale,parsed){
  const saved=firstNumber(item,'retail_rate','each_rate','unit_price','price_each');
  if(saved)return saved;
  if(parsed.pieces>0&&wholesale>0)return wholesale/parsed.pieces;
  return firstNumber(item,'unit_rate','large_unit_rate','pack_rate','bill_rate','rate','purchase_rate','price')
    || firstNumber(row,'unit_rate','large_unit_rate','pack_rate','bill_rate','rate','purchase_rate','price');
}

function wholesaleTotal(item,row){
  const saved=firstNumber(item,'row_total','line_total','total','amount','net_amount');
  if(saved)return saved;
  const qty=firstNumber(item,'qty','quantity')||1;
  const packRate=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price');
  if(packRate)return packRate*qty;
  return 0;
}

function buildProducts(){
  const meta=readJson(META_KEY),images=readJson(IMAGE_KEY),map=new Map();
  [...store.rows].sort((a,b)=>billDate(a).localeCompare(billDate(b))).forEach(row=>{
    itemsOf(row).forEach(item=>{
      const raw=productName(item,row),key=keyOf(raw);
      if(!key)return;
      const override=meta[key]||{},uploaded=images[key]?.data||'',date=safeDate(billDate(row));
      const pack=text(get(item,'pack_format','packing'));
      const unit=text(get(item,'unit')).toUpperCase()||'PCS';
      const qty=firstNumber(item,'qty','quantity')||1;
      const parsed=parsePack(pack,unit,qty);
      const wholesale=wholesaleTotal(item,row);
      const retail=retailRate(item,row,wholesale,parsed);
      if(!map.has(key))map.set(key,{key,name:cleanName(override.name||raw),photo:imageOf(row,item,override.photo,uploaded),imageFit:override.imageFit==='cover'?'cover':'contain',description:text(get(item,'description'))||raw,pack,unit,qty,parsed,retail,wholesale,lastDate:date,records:0});
      const product=map.get(key);product.records++;
      if(!product.lastDate||date>=product.lastDate){
        product.name=cleanName(override.name||raw);
        product.photo=imageOf(row,item,override.photo,uploaded);
        product.imageFit=override.imageFit==='cover'?'cover':'contain';
        product.description=text(get(item,'description'))||raw;
        product.pack=pack;
        product.unit=unit;
        product.qty=qty;
        product.parsed=parsed;
        product.retail=retail;
        product.wholesale=wholesale;
        product.lastDate=date;
      }
    });
  });
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

const imageMarkup=product=>product.photo
  ?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`
  :`<span class="product-fallback">${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`;

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Latest product, packing, quantity, weight and prices from saved bill entries.</p></div></header>
  <section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name or description"><span id="productCount">${products.length} products</span></section>
  <section class="product-catalog" id="productCatalog"></section>`;

  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase();
    const filtered=products.filter(product=>!q||`${product.name} ${product.description}`.toLowerCase().includes(q));
    $('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>`<article class="product-record simple-product-card">
      <div class="product-photo">${imageMarkup(product)}</div>
      <div class="product-info">
        <div class="product-title-row"><div><h3>${escapeHtml(product.name)}</h3><p class="product-description">${escapeHtml(product.description)}</p></div>${store.role==='admin'?`<button class="btn secondary small" data-product-edit="${escapeHtml(product.key)}">Edit</button>`:''}</div>
        <div class="product-pack-summary"><div><span>Unit / packing</span><strong>${escapeHtml(product.pack||product.unit)}</strong></div><div><span>Quantity</span><strong>${product.qty.toLocaleString('en-US')}</strong></div><div><span>Total weight / volume</span><strong>${escapeHtml(formatMeasurement(product.parsed))}</strong></div></div>
        <div class="product-price-grid">
          <div class="product-price retail"><span>Retail</span><strong>${product.retail?money(product.retail):'Not recorded'}</strong><small>${product.parsed.baseUnit==='PCS'?'Price per each':'Price per pack item'}</small></div>
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
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Name and image only. Unit, packing, quantity and prices come from bills.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo.startsWith('data:')?'':product.photo)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{
      event.preventDefault();
      const meta=readJson(META_KEY);
      meta[product.key]={name:cleanName(modal.querySelector('#editProductName').value),photo:text(modal.querySelector('#editProductPhoto').value),imageFit:modal.querySelector('#editProductFit').value};
      writeMeta(meta);
      modal.remove();
      productsPage();
    };
  }
}
