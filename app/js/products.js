import {store,money,escapeHtml,text,number,billDate,itemOf,get} from './store.js';
import {db} from './data.js';

const $=s=>document.querySelector(s),content=()=>$('#content');
const META_KEY='bills.productMetadata.v4',LEGACY_KEY='bills.productMetadata.v3',IMAGE_BUCKET='product-images';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||localStorage.getItem(LEGACY_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const productName=(item,row)=>cleanName(get(item,'description','product','name')||get(row,'product','description'));
let cache={revision:-1,meta:'',products:[]};

function packCaseQty(pack){const normalized=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');const multi=normalized.match(/^(\d+(?:\.\d+)?)x\d+(?:\.\d+)?(?:kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);return multi?number(multi[1]):0}
function purchasedPieces(pack,qty){return(packCaseQty(pack)||1)*(number(qty)||1)}
function gstRate(item,row){return firstNumber(item,'gst','gst_percent','gst_rate','tax_rate')||firstNumber(row,'gst','gst_percent','gst_rate','tax_rate')}
function withGst(net,gst){const gstAmount=net>0&&gst>0?net*gst/100:0;return{net,gstAmount,total:net+gstAmount}}
function priceNote(gst,defaultText){return gst>0?`${defaultText} · GST included`:defaultText}
function displayUnit(value){const unit=text(value).toUpperCase();return unit==='PCS'?'piece':unit||'unit'}
function initials(name){return cleanName(name).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'P'}
function safeImage(url){return /^https?:\/\//i.test(text(url))?text(url):''}

function buildProducts(){
  const meta=readMeta(),metaSignature=JSON.stringify(meta);
  if(cache.revision===store.dataRevision&&cache.meta===metaSignature)return cache.products;
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row);
    for(const item of itemsOf(row)){
      const raw=productName(item,row),key=keyOf(raw);if(!key)continue;
      const override=meta[key]||{},pack=text(get(item,'pack_format','packing')),unit=text(get(item,'unit')).toUpperCase()||'PCS',baseUnit=text(get(item,'base_unit')).toUpperCase()||unit,qty=firstNumber(item,'qty','quantity')||1;
      const lineNet=firstNumber(item,'row_total','line_total','total','net_amount')||(firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')*qty);
      const gst=gstRate(item,row),savedRetail=firstNumber(item,'retail_rate','each_rate','unit_price','price_each'),pieces=purchasedPieces(pack,qty);
      const retailNet=savedRetail||(pieces>0&&lineNet>0?lineNet/pieces:firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price'));
      const caseQty=number(override.caseQty)||packCaseQty(pack),savedWholesale=firstNumber(item,'wholesale_rate','case_rate','carton_rate');
      const wholesaleNet=savedWholesale||(caseQty>0&&retailNet>0?retailNet*caseQty:0),retail=withGst(retailNet,gst),wholesale=withGst(wholesaleNet,gst);
      const candidate={key,name:cleanName(override.name||raw),description:text(get(item,'description'))||raw,pack,unit,baseUnit,qty,caseQty,retail,wholesale,gst,lastDate:date,records:1,image:safeImage(override.image)};
      const current=map.get(key);if(!current)map.set(key,candidate);else{current.records++;if(!current.lastDate||date>=current.lastDate)Object.assign(current,candidate,{records:current.records})}
    }
  }
  cache={revision:store.dataRevision,meta:metaSignature,products:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name))};return cache.products;
}

function imageMarkup(product){return product.image?`<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-image-fallback" hidden>${escapeHtml(initials(product.name))}</span>`:`<span class="product-image-fallback">${escapeHtml(initials(product.name))}</span>`}

async function resizeSquare(file){
  if(!file?.type?.startsWith('image/'))throw new Error('Choose a valid image file.');
  if(file.size>8*1024*1024)throw new Error('Image must be smaller than 8 MB.');
  const bitmap=await createImageBitmap(file),size=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-size)/2,sy=(bitmap.height-size)/2,canvas=document.createElement('canvas');
  canvas.width=300;canvas.height=300;canvas.getContext('2d').drawImage(bitmap,sx,sy,size,size,0,0,300,300);bitmap.close?.();
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare the image.')),'image/webp',.88));
}

async function uploadProductImage(file,key){
  const blob=await resizeSquare(file),slug=key.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'product',path=`${store.user?.id||'shared'}/${slug}-${Date.now()}.webp`;
  const {error}=await db.storage.from(IMAGE_BUCKET).upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'});
  if(error)throw new Error(`${error.message}. Ensure the public Supabase Storage bucket “${IMAGE_BUCKET}” exists and authenticated users can upload.`);
  const {data}=db.storage.from(IMAGE_BUCKET).getPublicUrl(path);return data.publicUrl;
}

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Compact retail and wholesale pricing with product images.</p></div></header><section class="toolbar product-filters"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" placeholder="Search products, units or case sizes"></div><span id="productCount">${products.length} products</span></section><section class="product-catalog" id="productCatalog"></section>`;
  products.forEach(product=>product.search=`${product.name} ${product.description} ${product.pack} ${product.unit} ${product.baseUnit} ${product.qty} ${product.caseQty}`.toLowerCase());
  const priceData=(product,mode)=>mode==='wholesale'?{label:'Wholesale',value:product.wholesale.total,note:product.caseQty?priceNote(product.gst,`${product.caseQty.toLocaleString('en-US')} pieces per case`):'Case quantity not set'}:{label:'Retail',value:product.retail.total,note:priceNote(product.gst,`Per ${displayUnit(product.unit)}`)};
  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase(),filtered=q?products.filter(product=>product.search.includes(q)):products;$('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>{const selected=product.selectedPrice||'retail',shown=priceData(product,selected);return `<article class="product-profile-card" data-product-card="${escapeHtml(product.key)}"><div class="product-visual"><div class="product-photo">${imageMarkup(product)}</div>${store.role==='admin'?`<button class="product-edit-button" type="button" data-product-edit="${escapeHtml(product.key)}" aria-label="Edit ${escapeHtml(product.name)}"><i class="fa-solid fa-plus"></i></button>`:''}</div><div class="product-profile-body"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.pack||product.unit)}${product.caseQty?` · ${product.caseQty.toLocaleString('en-US')} per case`:''}</p><div class="product-stats"><div><strong>${product.records}</strong><span>Records</span></div><div><strong>${escapeHtml(product.unit)}</strong><span>Unit</span></div><div><strong>${product.caseQty||'—'}</strong><span>Case</span></div></div><div class="product-price-switch" role="group" aria-label="Choose price type"><button type="button" class="${selected==='retail'?'active':''}" data-price-mode="retail" data-product-key="${escapeHtml(product.key)}">Retail</button><button type="button" class="${selected==='wholesale'?'active':''}" data-price-mode="wholesale" data-product-key="${escapeHtml(product.key)}">Wholesale</button></div><div class="product-selected-price"><div><span>${escapeHtml(shown.label)}</span><small>${escapeHtml(shown.note)}</small></div><strong>${shown.value?money(shown.value):'Not set'}</strong></div></div></article>`}).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-price-mode]').forEach(button=>button.onclick=()=>{const product=products.find(item=>item.key===button.dataset.productKey);if(!product)return;product.selectedPrice=button.dataset.priceMode;draw()});
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };
  let timer;$('#productSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(draw,100)};draw();

  function showEdit(product){
    if(store.role!=='admin')return;const modal=document.createElement('div');modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Use a direct image URL or upload a file. Uploads are cropped to 300 × 300 px.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body product-edit-grid" id="productEditForm"><div class="product-edit-preview" id="productEditPreview">${imageMarkup(product)}</div><div class="product-edit-fields"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Case quantity<input id="editProductCaseQty" type="number" min="1" step="1" value="${product.caseQty||''}" placeholder="Example: 12"></label><label>Image URL<input id="editProductImage" type="url" value="${escapeHtml(product.image||'')}" placeholder="https://example.com/product.jpg"></label><label>Browse image<input id="editProductFile" type="file" accept="image/*"><small>Automatically cropped and resized to 300 × 300 px, then uploaded to Supabase.</small></label><div class="product-upload-status" id="productUploadStatus"></div></div><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    const urlInput=modal.querySelector('#editProductImage'),fileInput=modal.querySelector('#editProductFile'),preview=modal.querySelector('#productEditPreview');
    urlInput.oninput=()=>{const url=safeImage(urlInput.value);preview.innerHTML=url?`<img src="${escapeHtml(url)}" alt="Preview"><span class="product-image-fallback" hidden>${escapeHtml(initials(product.name))}</span>`:`<span class="product-image-fallback">${escapeHtml(initials(product.name))}</span>`};
    fileInput.onchange=()=>{const file=fileInput.files?.[0];if(file)preview.innerHTML=`<img src="${URL.createObjectURL(file)}" alt="Preview">`};
    modal.querySelector('#productEditForm').onsubmit=async event=>{event.preventDefault();const submit=event.submitter,status=modal.querySelector('#productUploadStatus');submit.disabled=true;status.textContent='Saving…';try{let image=safeImage(urlInput.value),file=fileInput.files?.[0];if(file){status.textContent='Preparing and uploading 300 × 300 image…';image=await uploadProductImage(file,product.key)}const meta=readMeta(),previous=meta[product.key]||{};meta[product.key]={...previous,name:cleanName(modal.querySelector('#editProductName').value),caseQty:Math.max(0,Math.round(number(modal.querySelector('#editProductCaseQty').value))),image};writeMeta(meta);cache.revision=-1;modal.remove();productsPage()}catch(error){status.textContent=error.message;submit.disabled=false}};
  }
}
