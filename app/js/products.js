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

function fallbackBase(pack,unit,qty){
  const normalized=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  const fallback=text(unit).toUpperCase()||'PCS';let count=1,size=1,kind=fallback;
  const multi=normalized.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);
  const single=normalized.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);
  if(multi){count=number(multi[1]);size=number(multi[2]);kind=multi[3].toUpperCase()}else if(single){size=number(single[1]);kind=single[2].toUpperCase()}
  let base=count*size*(number(qty)||1);if(kind==='KG'||kind==='L')base*=1000;
  return{base,baseUnit:['KG','G'].includes(kind)?'G':['L','ML'].includes(kind)?'ML':'PCS',pieces:count*(number(qty)||1)};
}

function gstRate(item,row){return firstNumber(item,'gst','gst_percent','gst_rate','tax_rate')||firstNumber(row,'gst','gst_percent','gst_rate','tax_rate')}
function withGst(net,gst){const gstAmount=net>0&&gst>0?net*gst/100:0;return{net,gstAmount,total:net+gstAmount}}
function priceNote(gst,defaultText){return gst>0?'GST included':defaultText}
function rateLabel(unit){return unit==='ML'?'Cost per ML':unit==='G'?'Cost per G':'Cost per each'}

function buildProducts(){
  const meta=readMeta(),metaSignature=JSON.stringify(meta);
  if(cache.revision===store.dataRevision&&cache.meta===metaSignature)return cache.products;
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row);
    for(const item of itemsOf(row)){
      const raw=productName(item,row),key=keyOf(raw);if(!key)continue;
      const override=meta[key]||{},pack=text(get(item,'pack_format','packing')),unit=text(get(item,'unit')).toUpperCase()||'PCS',qty=firstNumber(item,'qty','quantity')||1;
      const fallback=fallbackBase(pack,unit,qty),base=firstNumber(item,'base_quantity')||fallback.base,baseUnit=text(get(item,'base_unit')).toUpperCase()||fallback.baseUnit;
      const netWholesale=firstNumber(item,'row_total','line_total','total','net_amount')||(firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')*qty);
      const gst=gstRate(item,row),wholesale=withGst(netWholesale,gst);
      const savedRetail=firstNumber(item,'retail_rate','each_rate','unit_price','price_each');
      const retailNet=savedRetail||(fallback.pieces>0&&netWholesale>0?netWholesale/fallback.pieces:firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price'));
      const retail=withGst(retailNet,gst);
      const savedUnit=firstNumber(item,'unit_rate');
      const cost=base>0&&wholesale.total>0?wholesale.total/base:savedUnit;
      const candidate={key,name:cleanName(override.name||raw),photo:imageOf(row,item,override.photo),imageFit:override.imageFit==='cover'?'cover':'contain',description:text(get(item,'description'))||raw,pack,unit,qty,baseUnit,retail,wholesale,cost,gst,lastDate:date,records:1};
      const current=map.get(key);
      if(!current)map.set(key,candidate);else{current.records++;if(!current.lastDate||date>=current.lastDate)Object.assign(current,candidate,{records:current.records})}
    }
  }
  cache={revision:store.dataRevision,meta:metaSignature,products:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name))};
  return cache.products;
}

const imageMarkup=product=>product.photo?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`:`<span class="product-fallback">${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`;

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Latest saved bill rates. Calculations are reused from bill entry for faster loading.</p></div></header><section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name or description"><span id="productCount">${products.length} products</span></section><section class="product-catalog" id="productCatalog"></section>`;
  const draw=()=>{const q=text($('#productSearch').value).toLowerCase(),filtered=q?products.filter(p=>p.search.includes(q)):products;$('#productCount').textContent=`${filtered.length} products`;$('#productCatalog').innerHTML=filtered.map(product=>`<article class="product-record simple-product-card"><div class="product-photo">${imageMarkup(product)}</div><div class="product-info"><div class="product-title-row"><div><h3>${escapeHtml(product.name)}</h3><p class="product-description">${escapeHtml(product.description)}</p></div>${store.role==='admin'?`<button class="btn secondary small" data-product-edit="${escapeHtml(product.key)}">Edit</button>`:''}</div><div class="product-pack-summary"><div><span>Unit / packing</span><strong>${escapeHtml(product.pack||product.unit)}</strong></div><div><span>Quantity</span><strong>${product.qty.toLocaleString('en-US')}</strong></div><div><span>${rateLabel(product.baseUnit)}</span><strong>${product.cost?`${money(product.cost)} / ${escapeHtml(product.baseUnit)}`:'Not recorded'}</strong></div></div><div class="product-price-grid"><div class="product-price retail"><span>Retail</span><strong>${product.retail.total?money(product.retail.total):'Not recorded'}</strong><small>${escapeHtml(priceNote(product.gst,'Price per pack item'))}</small></div><div class="product-price wholesale"><span>Wholesale</span><strong>${product.wholesale.total?money(product.wholesale.total):'Not recorded'}</strong><small>${escapeHtml(priceNote(product.gst,'Total pack × quantity'))}</small></div></div></div></article>`).join('')||'<div class="empty">No products match this search.</div>';document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(p=>p.key===button.dataset.productEdit)))};
  products.forEach(p=>p.search=`${p.name} ${p.description}`.toLowerCase());
  let timer;$('#productSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(draw,100)};draw();
  function showEdit(product){if(store.role!=='admin')return;const modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Name and image only. Pricing comes from bills.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo.startsWith('data:')?'':product.photo)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>modal.remove());modal.querySelector('#productEditForm').onsubmit=e=>{e.preventDefault();const meta=readMeta();meta[product.key]={name:cleanName($('#editProductName').value),photo:text($('#editProductPhoto').value),imageFit:$('#editProductFit').value};writeMeta(meta);cache.revision=-1;modal.remove();productsPage()}}
}