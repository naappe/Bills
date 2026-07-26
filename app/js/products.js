import {store,money,escapeHtml,text,number,billDate,itemOf,get} from './store.js';

const $=s=>document.querySelector(s),content=()=>$('#content');
const META_KEY='bills.productMetadata.v3';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const productName=(item,row)=>cleanName(get(item,'description','product','name')||get(row,'product','description'));
const imageOf=(row,item,override)=>text(override||get(item,'photo_url','image_url','image','photo')||get(row,'photo_url','image_url','image','photo'));
let cache={revision:-1,meta:'',products:[]};

function packPieces(pack,qty){
  const normalized=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  const multi=normalized.match(/^(\d+(?:\.\d+)?)x\d+(?:\.\d+)?(?:kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);
  return (multi?number(multi[1]):1)*(number(qty)||1);
}
function gstRate(item,row){return firstNumber(item,'gst','gst_percent','gst_rate','tax_rate')||firstNumber(row,'gst','gst_percent','gst_rate','tax_rate')}
function withGst(net,gst){const gstAmount=net>0&&gst>0?net*gst/100:0;return{net,gstAmount,total:net+gstAmount}}
function priceNote(gst,defaultText){return gst>0?'GST included':defaultText}

function buildProducts(){
  const meta=readMeta(),metaSignature=JSON.stringify(meta);
  if(cache.revision===store.dataRevision&&cache.meta===metaSignature)return cache.products;
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row);
    for(const item of itemsOf(row)){
      const raw=productName(item,row),key=keyOf(raw);if(!key)continue;
      const override=meta[key]||{},pack=text(get(item,'pack_format','packing')),unit=text(get(item,'unit')).toUpperCase()||'PCS',qty=firstNumber(item,'qty','quantity')||1;
      const netWholesale=firstNumber(item,'row_total','line_total','total','net_amount')||(firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')*qty);
      const gst=gstRate(item,row),wholesale=withGst(netWholesale,gst);
      const savedRetail=firstNumber(item,'retail_rate','each_rate','unit_price','price_each');
      const pieces=packPieces(pack,qty);
      const retailNet=savedRetail||(pieces>0&&netWholesale>0?netWholesale/pieces:firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price'));
      const retail=withGst(retailNet,gst);
      const candidate={key,name:cleanName(override.name||raw),photo:imageOf(row,item,override.photo),imageFit:override.imageFit==='cover'?'cover':'contain',description:text(get(item,'description'))||raw,pack,unit,qty,retail,wholesale,gst,lastDate:date,records:1};
      const current=map.get(key);
      if(!current)map.set(key,candidate);else{current.records++;if(!current.lastDate||date>=current.lastDate)Object.assign(current,candidate,{records:current.records})}
    }
  }
  cache={revision:store.dataRevision,meta:metaSignature,products:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name))};
  return cache.products;
}

const imageMarkup=product=>product.photo
  ?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`
  :`<span class="product-fallback">${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`;

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Visual product catalogue with the latest GST-inclusive purchase rates.</p></div></header><section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name or description"><span id="productCount">${products.length} products</span></section><section class="product-catalog" id="productCatalog"></section>`;

  products.forEach(product=>product.search=`${product.name} ${product.description} ${product.pack} ${product.unit}`.toLowerCase());

  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase();
    const filtered=q?products.filter(product=>product.search.includes(q)):products;
    $('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>`<article class="product-record portrait-product-card">
      <div class="product-visual">
        <div class="product-photo">${imageMarkup(product)}</div>
        ${store.role==='admin'?`<button class="product-edit-button" type="button" data-product-edit="${escapeHtml(product.key)}" aria-label="Edit ${escapeHtml(product.name)}"><i class="fa-solid fa-pen"></i></button>`:''}
      </div>
      <div class="product-info">
        <div class="product-heading"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p></div>
        <div class="product-meta-line"><span><i class="fa-solid fa-box"></i>${escapeHtml(product.pack||product.unit)}</span><span><i class="fa-solid fa-layer-group"></i>Qty ${product.qty.toLocaleString('en-US')}</span></div>
        <div class="product-wholesale"><span>Wholesale total</span><strong>${product.wholesale.total?money(product.wholesale.total):'Not recorded'}</strong><small>${escapeHtml(priceNote(product.gst,'Pack × quantity'))}</small></div>
        <div class="product-retail-line"><span>Retail per item</span><strong>${product.retail.total?money(product.retail.total):'Not recorded'}</strong><small>${escapeHtml(priceNote(product.gst,'Per pack item'))}</small></div>
      </div>
    </article>`).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };

  let timer;
  $('#productSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(draw,100)};
  draw();

  function showEdit(product){
    if(store.role!=='admin')return;
    const modal=document.createElement('div');
    modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Name and image only. Pricing comes from bills.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo.startsWith('data:')?'':product.photo)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{
      event.preventDefault();
      const meta=readMeta();
      meta[product.key]={name:cleanName($('#editProductName').value),photo:text($('#editProductPhoto').value),imageFit:$('#editProductFit').value};
      writeMeta(meta);cache.revision=-1;modal.remove();productsPage();
    };
  }
}
