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
let cache={revision:-1,meta:'',products:[]};

function packCaseQty(pack){const normalized=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');const multi=normalized.match(/^(\d+(?:\.\d+)?)x\d+(?:\.\d+)?(?:kg|g|l|ml|pcs?|btl|pkt|can|tin|ctn|doz)$/);return multi?number(multi[1]):0}
function purchasedPieces(pack,qty){return(packCaseQty(pack)||1)*(number(qty)||1)}
function gstRate(item,row){return firstNumber(item,'gst','gst_percent','gst_rate','tax_rate')||firstNumber(row,'gst','gst_percent','gst_rate','tax_rate')}
function withGst(net,gst){const gstAmount=net>0&&gst>0?net*gst/100:0;return{net,gstAmount,total:net+gstAmount}}
function priceNote(gst,defaultText){return gst>0?`${defaultText} · GST included`:defaultText}
function displayUnit(value){const unit=text(value).toUpperCase();return unit==='PCS'?'piece':unit||'unit'}

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
      const candidate={key,name:cleanName(override.name||raw),description:text(get(item,'description'))||raw,pack,unit,baseUnit,qty,caseQty,retail,wholesale,gst,lastDate:date,records:1};
      const current=map.get(key);if(!current)map.set(key,candidate);else{current.records++;if(!current.lastDate||date>=current.lastDate)Object.assign(current,candidate,{records:current.records})}
    }
  }
  cache={revision:store.dataRevision,meta:metaSignature,products:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name))};return cache.products;
}

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Simple retail and wholesale pricing for every product.</p></div></header><section class="toolbar product-filters"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" placeholder="Search products, units or case sizes"></div><span id="productCount">${products.length} products</span></section><section class="product-catalog" id="productCatalog"></section>`;
  products.forEach(product=>product.search=`${product.name} ${product.description} ${product.pack} ${product.unit} ${product.baseUnit} ${product.qty} ${product.caseQty}`.toLowerCase());
  const priceData=(product,mode)=>mode==='wholesale'?{label:'Wholesale',value:product.wholesale.total,note:product.caseQty?priceNote(product.gst,`${product.caseQty.toLocaleString('en-US')} pieces per case`):'Set case quantity to calculate'}:{label:'Retail',value:product.retail.total,note:priceNote(product.gst,`Price per ${displayUnit(product.unit)}`)};
  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase(),filtered=q?products.filter(product=>product.search.includes(q)):products;$('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>{const selected=product.selectedPrice||'retail',shown=priceData(product,selected);return `<article class="product-record" data-product-card="${escapeHtml(product.key)}"><header class="product-card-head"><div><span class="product-label">Product</span><h3>${escapeHtml(product.name)}</h3></div>${store.role==='admin'?`<button class="product-edit-button" type="button" data-product-edit="${escapeHtml(product.key)}" aria-label="Edit ${escapeHtml(product.name)}"><i class="fa-solid fa-pen"></i></button>`:''}</header><div class="product-meta-line"><span>${escapeHtml(product.pack||product.unit)}</span><span>${product.caseQty?`${product.caseQty.toLocaleString('en-US')} per case`:'Case size not set'}</span></div><div class="product-price-switch" role="group" aria-label="Choose price type"><button type="button" class="${selected==='retail'?'active':''}" data-price-mode="retail" data-product-key="${escapeHtml(product.key)}">Retail</button><button type="button" class="${selected==='wholesale'?'active':''}" data-price-mode="wholesale" data-product-key="${escapeHtml(product.key)}">Wholesale</button></div><div class="product-selected-price"><div><span>${escapeHtml(shown.label)}</span><small>${escapeHtml(shown.note)}</small></div><strong>${shown.value?money(shown.value):'Not set'}</strong></div></article>`}).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-price-mode]').forEach(button=>button.onclick=()=>{const product=products.find(item=>item.key===button.dataset.productKey);if(!product)return;product.selectedPrice=button.dataset.priceMode;draw()});
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };
  let timer;$('#productSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(draw,100)};draw();

  function showEdit(product){
    if(store.role!=='admin')return;const modal=document.createElement('div');modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Update the product name and complete-case quantity.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Case quantity<input id="editProductCaseQty" type="number" min="1" step="1" value="${product.caseQty||''}" placeholder="Example: 12"></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{event.preventDefault();const meta=readMeta(),previous=meta[product.key]||{};meta[product.key]={...previous,name:cleanName($('#editProductName').value),caseQty:Math.max(0,Math.round(number($('#editProductCaseQty').value)))};writeMeta(meta);cache.revision=-1;modal.remove();productsPage()};
  }
}
