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

const categories=[
  {pattern:/water|mineral|aqua/i,label:'Water',icon:'fa-droplet'},
  {pattern:/coke|cola|sprite|fanta|pepsi|soda|soft\s*drink|beverage/i,label:'Soft drink',icon:'fa-bottle-water'},
  {pattern:/juice|nectar/i,label:'Juice',icon:'fa-glass-water'},
  {pattern:/milk|cream|yogurt|cheese|dairy/i,label:'Dairy',icon:'fa-cow'},
  {pattern:/coffee/i,label:'Coffee',icon:'fa-mug-hot'},
  {pattern:/tea/i,label:'Tea',icon:'fa-mug-saucer'},
  {pattern:/oil/i,label:'Cooking oil',icon:'fa-bottle-droplet'},
  {pattern:/rice|flour|sugar|salt|grain|cereal/i,label:'Dry grocery',icon:'fa-wheat-awn'},
  {pattern:/bread|bun|cake|brownie|biscuit|cookie|bakery/i,label:'Bakery',icon:'fa-bread-slice'},
  {pattern:/chicken/i,label:'Chicken',icon:'fa-drumstick-bite'},
  {pattern:/fish|tuna|salmon|seafood/i,label:'Seafood',icon:'fa-fish'},
  {pattern:/beef|meat|sausage|mutton|lamb/i,label:'Meat',icon:'fa-bacon'},
  {pattern:/egg/i,label:'Eggs',icon:'fa-egg'},
  {pattern:/apple|orange|banana|mango|fruit/i,label:'Fruit',icon:'fa-apple-whole'},
  {pattern:/vegetable|tomato|onion|potato|carrot|cabbage|lettuce/i,label:'Vegetable',icon:'fa-carrot'},
  {pattern:/clean|soap|detergent|bleach|sanitizer|chemical/i,label:'Cleaning',icon:'fa-pump-soap'}
];

function categoryOf(product){const source=`${product.name} ${product.description} ${product.pack}`;return categories.find(category=>category.pattern.test(source))||{label:'Product',icon:'fa-box'}}
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
      const candidate={key,name:cleanName(override.name||raw),photo:imageOf(row,item,override.photo),imageFit:override.imageFit==='cover'?'cover':'contain',description:text(get(item,'description'))||raw,pack,unit,baseUnit,qty,caseQty,retail,wholesale,gst,lastDate:date,records:1};
      const current=map.get(key);if(!current)map.set(key,candidate);else{current.records++;if(!current.lastDate||date>=current.lastDate)Object.assign(current,candidate,{records:current.records})}
    }
  }
  cache={revision:store.dataRevision,meta:metaSignature,products:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name))};return cache.products;
}

function fallbackMarkup(product){const category=categoryOf(product);return `<span class="product-fallback" aria-label="${escapeHtml(category.label)}"><i class="fa-solid ${category.icon}"></i><small>${escapeHtml(category.label)}</small></span>`}
function imageMarkup(product){return product.photo?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" style="object-fit:${product.imageFit}" onerror="this.closest('.product-record').classList.add('no-photo');this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${fallbackMarkup(product)}</span>`:fallbackMarkup(product)}

export function productsPage(){
  const products=buildProducts();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Retail is the price per item. Wholesale is the price for one complete case.</p></div></header><section class="toolbar product-filters"><input id="productSearch" placeholder="Search product name, unit or case"><span id="productCount">${products.length} products</span></section><section class="product-catalog" id="productCatalog"></section>`;
  products.forEach(product=>product.search=`${product.name} ${product.description} ${product.pack} ${product.unit} ${product.baseUnit} ${product.qty} ${product.caseQty}`.toLowerCase());
  const priceData=(product,mode)=>mode==='wholesale'?{label:'Wholesale · Case',value:product.wholesale.total,note:product.caseQty?priceNote(product.gst,`One case · ${product.caseQty.toLocaleString('en-US')} pieces`):'Set the case quantity to calculate wholesale'}:{label:'Retail · Each',value:product.retail.total,note:priceNote(product.gst,`Per ${displayUnit(product.unit)}`)};
  const draw=()=>{
    const q=text($('#productSearch').value).toLowerCase(),filtered=q?products.filter(product=>product.search.includes(q)):products;$('#productCount').textContent=`${filtered.length} products`;
    $('#productCatalog').innerHTML=filtered.map(product=>{const selected=product.selectedPrice||'retail',shown=priceData(product,selected);return `<article class="product-record portrait-product-card ${product.photo?'has-photo':'no-photo'}" data-product-card="${escapeHtml(product.key)}"><div class="product-visual"><div class="product-photo">${imageMarkup(product)}</div>${store.role==='admin'?`<button class="product-edit-button" type="button" data-product-edit="${escapeHtml(product.key)}" aria-label="Edit ${escapeHtml(product.name)}"><i class="fa-solid fa-pen"></i></button>`:''}</div><div class="product-info"><div class="product-heading"><h3>${escapeHtml(product.name)}</h3></div><div class="product-meta-line"><span><i class="fa-solid fa-tag"></i>${escapeHtml(product.pack||product.unit)}</span><span><i class="fa-solid fa-boxes-stacked"></i>${product.caseQty?`Case ${product.caseQty.toLocaleString('en-US')} pcs`:'Case size not set'}</span></div><div class="product-price-switch" role="group" aria-label="Choose price type"><button type="button" class="${selected==='retail'?'active':''}" data-price-mode="retail" data-product-key="${escapeHtml(product.key)}">Retail</button><button type="button" class="${selected==='wholesale'?'active':''}" data-price-mode="wholesale" data-product-key="${escapeHtml(product.key)}">Wholesale</button></div><div class="product-selected-price"><span>${escapeHtml(shown.label)}</span><strong>${shown.value?money(shown.value):'Case size required'}</strong><small>${escapeHtml(shown.note)}</small></div></div></article>`}).join('')||'<div class="empty">No products match this search.</div>';
    document.querySelectorAll('[data-price-mode]').forEach(button=>button.onclick=()=>{const product=products.find(item=>item.key===button.dataset.productKey);if(!product)return;product.selectedPrice=button.dataset.priceMode;draw()});
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(product=>product.key===button.dataset.productEdit)));
  };
  let timer;$('#productSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(draw,100)};draw();

  function showEdit(product){
    if(store.role!=='admin')return;const modal=document.createElement('div');modal.className='modal';
    modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product</h2><small>Set the case quantity once so wholesale always means one full case.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Product name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Case quantity<input id="editProductCaseQty" type="number" min="1" step="1" value="${product.caseQty||''}" placeholder="Example: 12"></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo.startsWith('data:')?'':product.photo)}" placeholder="https://..."></label><label>Image display<select id="editProductFit"><option value="contain" ${product.imageFit==='contain'?'selected':''}>Fit full product</option><option value="cover" ${product.imageFit==='cover'?'selected':''}>Crop to fill</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save product</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;
    document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(element=>element.onclick=()=>modal.remove());
    modal.querySelector('#productEditForm').onsubmit=event=>{event.preventDefault();const meta=readMeta();meta[product.key]={name:cleanName($('#editProductName').value),caseQty:Math.max(0,Math.round(number($('#editProductCaseQty').value))),photo:text($('#editProductPhoto').value),imageFit:$('#editProductFit').value};writeMeta(meta);cache.revision=-1;modal.remove();productsPage()};
  }
}