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

function productUiStyles(){
 if($('#productUiPolish'))return;document.head.insertAdjacentHTML('beforeend',`<style id="productUiPolish">
 .product-simple-toolbar{grid-template-columns:minmax(260px,1fr) auto auto!important;align-items:center;gap:12px}.product-simple-toolbar>.btn{width:auto!important;min-width:150px;padding-inline:20px}.px-card{padding:22px;border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm)}.px-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.px-head h2{margin:0;color:var(--brand-navy);font-size:20px}.px-head p{margin:5px 0 0;color:var(--text-muted)}.px-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}.px-kpi{padding:15px;border:1px solid var(--border);border-radius:13px;background:var(--surface-muted)}.px-kpi span{display:block;color:var(--text-muted);font-size:10px;font-weight:800;text-transform:uppercase}.px-kpi strong{display:block;margin-top:6px;font-size:23px;color:var(--brand-navy)}.px-chart{width:100%;height:250px;border:1px solid var(--border);border-radius:14px;background:linear-gradient(180deg,#fbfdff,#f4f8fb)}.px-chart .axis{stroke:#b9c5d2;stroke-width:1}.px-chart .grid{stroke:#e5ebf1;stroke-width:1}.px-chart .trend{fill:none;stroke:#173b6c;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.px-chart .area{fill:url(#pxFill)}.px-chart .point{fill:#ffb323;stroke:#fff;stroke-width:3}.px-chart text{fill:#68758a;font-size:11px}.px-chart .value{fill:#173b6c;font-weight:800}.px-rank{display:grid;gap:9px}.px-rank button{display:grid;grid-template-columns:minmax(160px,1fr) 3fr auto;align-items:center;gap:14px;width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:11px;background:#fff;text-align:left;cursor:pointer}.px-rank button:hover{border-color:var(--brand-gold);background:var(--brand-gold-100)}.px-bar{height:9px;border-radius:99px;background:#e9eef4;overflow:hidden}.px-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#173b6c,#ffb323)}.px-detail{display:grid;grid-template-columns:1.25fr .75fr;gap:18px;margin-top:18px}.px-rows{display:grid;gap:7px}.px-row{display:grid;grid-template-columns:95px minmax(130px,1fr) auto;gap:12px;padding:10px;border-bottom:1px solid var(--border)}.px-vendor{display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:11px;margin-bottom:8px}
 .merge-modal{width:min(1050px,96vw)!important}.merge-columns{display:grid;grid-template-columns:1fr 56px 1fr;gap:16px;align-items:stretch}.merge-column{min-height:430px;padding:16px;border:1px solid var(--border);border-radius:15px;background:#f8fafc}.merge-column.selected{border-color:var(--brand-gold)}.merge-column h3{margin:0 0 5px}.merge-search{margin:12px 0}.merge-list{display:grid;gap:7px;max-height:300px;overflow:auto}.merge-option{display:grid;grid-template-columns:46px 1fr;align-items:center;gap:10px;width:100%;padding:9px;border:1px solid var(--border);border-radius:10px;background:#fff;text-align:left;cursor:pointer}.merge-option:hover,.merge-option.is-selected{border-color:var(--brand-gold);background:var(--brand-gold-100)}.merge-option img,.merge-thumb{width:46px;height:46px;border-radius:8px;object-fit:cover;background:#e8edf3}.merge-arrow{display:grid;place-items:center;font-size:28px;color:var(--brand-navy)}.merge-confirm{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
 @media(max-width:850px){.px-detail,.merge-columns{grid-template-columns:1fr}.merge-arrow{transform:rotate(90deg)}.px-kpis{grid-template-columns:1fr 1fr 1fr}}@media(max-width:600px){.product-simple-toolbar{grid-template-columns:1fr!important}.product-simple-toolbar>.btn{width:100%!important}.px-kpis{grid-template-columns:1fr}.px-card{padding:15px}}
 </style>`);
}
function priceChart(product){
 const h=product.history.slice(-14);if(!h.length)return'<div class="empty">No price history available.</div>';const vals=h.map(x=>x.wholesale),min=Math.min(...vals),max=Math.max(...vals),range=max-min||Math.max(max*.1,1),pts=h.map((x,i)=>({x:62+(i/Math.max(h.length-1,1))*790,y:190-((x.wholesale-min)/range)*125,d:x}));if(h.length===1)pts[0].x=455;
 const line=pts.map(p=>p.x+','+p.y).join(' '),area='62,205 '+line+' 852,205';return `<svg class="px-chart" viewBox="0 0 900 250" role="img" aria-label="${escapeHtml(product.name)} price history"><defs><linearGradient id="pxFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb323" stop-opacity=".26"/><stop offset="1" stop-color="#ffb323" stop-opacity=".02"/></linearGradient></defs>${[65,105,145,185].map(y=>`<line class="grid" x1="62" y1="${y}" x2="852" y2="${y}"/>`).join('')}<line class="axis" x1="62" y1="205" x2="852" y2="205"/>${h.length>1?`<polygon class="area" points="${area}"/><polyline class="trend" points="${line}"/>`:''}${pts.map(p=>`<g><circle class="point" cx="${p.x}" cy="${p.y}" r="6"><title>${escapeHtml(p.d.date)} · ${escapeHtml(p.d.vendor)} · ${money(p.d.wholesale)}</title></circle><text class="value" x="${p.x}" y="${p.y-14}" text-anchor="middle">${money(p.d.wholesale)}</text></g>`).join('')}<text x="62" y="230">${escapeHtml(h[0].date)}</text><text x="852" y="230" text-anchor="end">${escapeHtml(h.at(-1).date)}</text></svg>`;
}
function productOverview(products){
 const selected=products.find(p=>p.key===selectedProductKey),vendors=new Set(products.flatMap(p=>[...p.vendors])),records=products.reduce((s,p)=>s+p.history.length,0),kpis=`<div class="px-kpis"><div class="px-kpi"><span>Master products</span><strong>${products.length}</strong></div><div class="px-kpi"><span>Vendors</span><strong>${vendors.size}</strong></div><div class="px-kpi"><span>Purchase records</span><strong>${records}</strong></div></div>`;
 if(!selected){const top=products.filter(p=>p.latest>0).sort((a,b)=>b.latest-a.latest).slice(0,10),max=Math.max(...top.map(p=>p.latest),1);return `<section class="px-card">${kpis}<div class="px-head"><div><h2>Latest product prices</h2><p>Products are ranked by latest wholesale price. Select one for full history.</p></div></div><div class="px-rank">${top.map(p=>`<button data-pick="${escapeHtml(p.key)}"><strong>${escapeHtml(p.name)}</strong><span class="px-bar"><i style="width:${Math.max(4,p.latest/max*100)}%"></i></span><b>${money(p.latest)}</b></button>`).join('')}</div></section>`;}
 const latest=new Map();[...selected.history].reverse().forEach(x=>{if(!latest.has(x.vendor))latest.set(x.vendor,x)});return `<section class="px-card"><div class="px-head"><div><h2>${escapeHtml(selected.name)}</h2><p>${selected.history.length} purchase records · ${selected.vendors.size} vendors · one master product</p></div><button class="btn secondary" id="allProducts">All products</button></div>${priceChart(selected)}<div class="px-detail"><div><h3>Purchase history</h3><div class="px-rows">${[...selected.history].reverse().slice(0,12).map(x=>`<div class="px-row"><span>${escapeHtml(x.date)}</span><span>${escapeHtml(x.vendor)}</span><strong>${money(x.wholesale)}</strong></div>`).join('')||'<p>No history.</p>'}</div></div><div><h3>Latest vendor prices</h3>${[...latest.values()].sort((a,b)=>a.wholesale-b.wholesale).map((x,i)=>`<div class="px-vendor"><span>${i===0?'★ ':''}${escapeHtml(x.vendor)}</span><strong>${money(x.wholesale)}</strong></div>`).join('')||'<p>No vendor prices.</p>'}</div></div></section>`;
}
function openMergeProducts(){
 const ps=[...masterProducts.values()].sort((a,b)=>a.name.localeCompare(b.name));let source=findProduct(selectedProductKey)?.productId?ps.find(p=>p.id===findProduct(selectedProductKey).productId):null,target=null;
 const modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<section class="modal-card merge-modal"><header class="card-head"><div><h2>Merge products</h2><small>Select the wrong product on the left and correct product on the right.</small></div><button class="btn secondary small" data-close>Close</button></header><div class="card-body"><div class="merge-columns"><section class="merge-column" id="sourceColumn"><h3>1. Wrong product</h3><small>This name will be removed</small><input class="merge-search" id="sourceSearch" placeholder="Search wrong product"><div class="merge-list" id="sourceList"></div></section><div class="merge-arrow">→</div><section class="merge-column" id="targetColumn"><h3>2. Correct master product</h3><small>All bills and prices will move here</small><input class="merge-search" id="targetSearch" placeholder="Search or write correct name"><div class="merge-list" id="targetList"></div></section></div><div class="merge-confirm"><p id="mergeMessage">Select both products to continue.</p><button class="btn danger" id="doMerge" disabled>Merge selected products</button></div></div></section>`;document.body.appendChild(modal);
 const option=(p,side,chosen)=>`<button class="merge-option ${chosen?.id===p.id?'is-selected':''}" data-merge-side="${side}" data-id="${p.id}">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="">`:'<span class="merge-thumb"></span>'}<span><strong>${escapeHtml(p.name)}</strong><small style="display:block">Master product</small></span></button>`;
 const draw=()=>{const sq=keyOf($('#sourceSearch').value),tq=keyOf($('#targetSearch').value);$('#sourceList').innerHTML=ps.filter(p=>!sq||keyOf(p.name).includes(sq)).map(p=>option(p,'source',source)).join('');$('#targetList').innerHTML=ps.filter(p=>p.id!==source?.id&&(!tq||keyOf(p.name).includes(tq))).map(p=>option(p,'target',target)).join('')+(tq&&!ps.some(p=>keyOf(p.name)===tq)?`<button class="merge-option" data-create-target><span class="merge-thumb"></span><span><strong>Create “${escapeHtml($('#targetSearch').value)}”</strong><small style="display:block">New master product</small></span></button>`:'');$('#sourceColumn').classList.toggle('selected',!!source);$('#targetColumn').classList.toggle('selected',!!target);$('#doMerge').disabled=!(source&&target);$('#mergeMessage').textContent=source&&target?`${source.name} → ${target.name}`:'Select both products to continue.'};
 modal.addEventListener('click',async e=>{const pick=e.target.closest('[data-merge-side]');if(pick){const p=ps.find(x=>x.id===pick.dataset.id);if(pick.dataset.mergeSide==='source'){source=p;if(target?.id===p.id)target=null}else target=p;draw();return}if(e.target.closest('[data-create-target]')){const name=text($('#targetSearch').value),{data,error}=await db.rpc('create_master_product',{p_name:name});if(error){alert(error.message);return}target=Array.isArray(data)?data[0]:data;ps.push(target);draw()}});
 $('#sourceSearch').oninput=draw;$('#targetSearch').oninput=()=>{target=null;draw()};modal.querySelector('[data-close]').onclick=()=>modal.remove();draw();
 $('#doMerge').onclick=async e=>{if(!source||!target)return;if(!confirm(`Merge “${source.name}” into “${target.name}”?`))return;e.currentTarget.disabled=true;const {error}=await db.rpc('merge_master_products',{p_source_id:source.id,p_target_id:target.id});if(error){e.currentTarget.disabled=false;alert(error.message||'Merge failed.');return}location.reload()};
}

function bindProductCards(query){document.querySelectorAll('.simple-product-card[data-product-key]').forEach(card=>{card.style.cursor='pointer';const pick=()=>{selectedProductKey=card.dataset.productKey;renderList(query);window.scrollTo({top:0,behavior:'smooth'})};card.addEventListener('click',e=>{if(!e.target.closest('button'))pick()});card.addEventListener('keydown',e=>{if(e.key==='Enter'){pick()}})})}

function renderList(query=''){
 const products=buildProducts(),filtered=products.map(p=>({...p,score:productScore(query,p)})).filter(p=>p.score>20).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 content().innerHTML=`<header class="page-head"><div><h1>Master products</h1></div></header>${productOverview(products)}<section class="product-simple-toolbar"><div class="product-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="productSearch" value="${escapeHtml(query)}" placeholder="Search product — spelling mistakes accepted"></div><span>${filtered.length} products</span>${isAdmin()?'<button class="btn" id="mergeProducts">Merge products</button>':''}</section><section class="simple-product-list">${filtered.map(productCard).join('')||'<div class="empty">No matching product.</div>'}</section>`;
 bindImageActions(query);bindProductCards(query);$('#mergeProducts')?.addEventListener('click',()=>location.hash='#product-merge');$('#allProducts')?.addEventListener('click',()=>{selectedProductKey='';renderList(query)});document.querySelectorAll('[data-pick]').forEach(x=>x.addEventListener('click',()=>{selectedProductKey=x.dataset.pick;renderList(query)}));let timer;$('#productSearch').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>renderList(e.target.value),100)};
}

export async function productsPage(){
  productUiStyles();
  await loadProductImages();
  cache.revision=-1;
  renderList('');
}
