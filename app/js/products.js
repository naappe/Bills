import {store,money,escapeHtml,text,number,billDate,vendor,amount,productOf,itemOf,get} from './store.js';

const $=s=>document.querySelector(s);
const content=()=>$('#content');
const META_KEY='bills.productMetadata.v1';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const keyOf=name=>text(name).toLowerCase().replace(/\s+/g,' ');
const imageOf=(row,item,override)=>text(override||get(item,'photo_url','image_url','image','photo')||get(row,'photo_url','image_url','image','photo'));
const categoryOf=(row,item,override)=>text(override||get(item,'category')||get(row,'category'))||'Uncategorized';
const unitOf=item=>text(get(item,'base_unit','baseUnit','unit')).toUpperCase()||'—';
const unitRateOf=item=>number(get(item,'large_unit_rate','unit_rate'));
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'';

function buildProducts(){
  const meta=readMeta(),map=new Map();
  [...store.rows].sort((a,b)=>billDate(a).localeCompare(billDate(b))).forEach(row=>{
    const raw=productOf(row),key=keyOf(raw),item=itemOf(row),override=meta[key]||{};
    if(!map.has(key))map.set(key,{key,name:text(override.name)||raw,category:categoryOf(row,item,override.category),photo:imageOf(row,item,override.photo),active:override.active!==false,aliases:new Set(),vendors:new Set(),history:[],pack:'',unit:'—',latestPrice:0,unitRate:0,lastVendor:'',lastDate:'',records:0});
    const product=map.get(key),date=safeDate(billDate(row)),price=amount(row),supplier=vendor(row),pack=text(get(item,'pack_format','packing'));
    product.aliases.add(raw);product.vendors.add(supplier);product.records++;
    product.history.push({date,price,supplier,pack,unit:unitOf(item),unitRate:unitRateOf(item)});
    if(!product.lastDate||date>=product.lastDate){product.lastDate=date;product.latestPrice=price;product.lastVendor=supplier;product.pack=pack;product.unit=unitOf(item);product.unitRate=unitRateOf(item);product.photo=imageOf(row,item,override.photo);product.category=categoryOf(row,item,override.category)}
  });
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

const imageMarkup=product=>product.photo?`<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="product-fallback" hidden>${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`:`<span class="product-fallback">${escapeHtml(product.name.slice(0,1).toUpperCase())}</span>`;

export function productsPage(){
  const products=buildProducts(),categories=[...new Set(products.map(p=>p.category))].sort();
  content().innerHTML=`<header class="page-head"><div><h1>Products</h1><p>Catalogue, supplier coverage, current rates and purchase history generated from bill records.</p></div><div class="actions"><button class="btn secondary" id="productView">List view</button></div></header>
  <section class="toolbar product-filters"><input id="productSearch" placeholder="Search product, vendor or alias"><select id="productCategory"><option value="">All categories</option>${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select><select id="productStatus"><option value="active">Active</option><option value="all">All products</option><option value="inactive">Inactive</option></select><span id="productCount">${products.filter(p=>p.active).length} products</span></section>
  <section class="product-catalog" id="productCatalog"></section>`;
  let listView=false;
  const draw=()=>{const q=text($('#productSearch').value).toLowerCase(),category=$('#productCategory').value,status=$('#productStatus').value;const filtered=products.filter(p=>(!q||`${p.name} ${[...p.aliases].join(' ')} ${[...p.vendors].join(' ')}`.toLowerCase().includes(q))&&(!category||p.category===category)&&(status==='all'||(status==='active'?p.active:!p.active)));$('#productCount').textContent=`${filtered.length} products`;$('#productCatalog').className=listView?'product-catalog list':'product-catalog';$('#productCatalog').innerHTML=filtered.map(p=>`<article class="product-record" data-product="${escapeHtml(p.key)}"><div class="product-photo">${imageMarkup(p)}</div><div class="product-info"><div class="product-title-row"><div><h3>${escapeHtml(p.name)}</h3><span class="badge ${p.active?'paid':'pending'}">${p.active?'Active':'Inactive'}</span></div>${store.role==='admin'?`<button class="btn secondary small" data-product-edit="${escapeHtml(p.key)}">Edit</button>`:''}</div><p>${escapeHtml(p.category)} · ${p.records} purchase records</p><dl><div><dt>Latest price</dt><dd>${money(p.latestPrice)}</dd></div><div><dt>Base-unit rate</dt><dd>${p.unitRate?`${money(p.unitRate)} / ${escapeHtml(p.unit)}`:'Not recorded'}</dd></div><div><dt>Latest pack</dt><dd>${escapeHtml(p.pack||'Not recorded')}</dd></div><div><dt>Latest vendor</dt><dd>${escapeHtml(p.lastVendor||'Unknown')}</dd></div><div><dt>Vendors</dt><dd>${p.vendors.size}</dd></div><div><dt>Last purchase</dt><dd>${escapeHtml(p.lastDate||'No date')}</dd></div></dl><button class="product-history-link" data-product-history="${escapeHtml(p.key)}">View price history</button></div></article>`).join('')||'<div class="empty">No products match these filters.</div>';
    document.querySelectorAll('[data-product-history]').forEach(button=>button.onclick=()=>showHistory(products.find(p=>p.key===button.dataset.productHistory)));
    document.querySelectorAll('[data-product-edit]').forEach(button=>button.onclick=()=>showEdit(products.find(p=>p.key===button.dataset.productEdit)));
  };
  $('#productSearch').oninput=draw;$('#productCategory').onchange=draw;$('#productStatus').onchange=draw;$('#productView').onclick=()=>{listView=!listView;$('#productView').textContent=listView?'Card view':'List view';draw()};draw();

  function showHistory(product){const history=[...product.history].sort((a,b)=>b.date.localeCompare(a.date)),modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<section class="modal-card"><header class="card-head"><div><h2>${escapeHtml(product.name)}</h2><small>Price and supplier history</small></div><button class="btn secondary small" data-close>Close</button></header><div class="card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Vendor</th><th>Pack</th><th>Unit</th><th class="num">Base rate</th><th class="num">Recorded amount</th></tr></thead><tbody>${history.map(h=>`<tr><td>${escapeHtml(h.date||'No date')}</td><td>${escapeHtml(h.supplier)}</td><td>${escapeHtml(h.pack||'—')}</td><td>${escapeHtml(h.unit)}</td><td class="num">${h.unitRate?money(h.unitRate):'—'}</td><td class="num"><strong>${money(h.price)}</strong></td></tr>`).join('')}</tbody></table></div></div></section>`;document.body.appendChild(modal);modal.querySelector('[data-close]').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()}}
  function showEdit(product){if(store.role!=='admin')return;const modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<section class="modal-card product-editor"><header class="card-head"><div><h2>Edit product metadata</h2><small>Saved in this browser until the Supabase products table is introduced.</small></div><button class="btn secondary small" data-close>Close</button></header><form class="card-body form-grid" id="productEditForm"><label>Display name<input id="editProductName" value="${escapeHtml(product.name)}" required></label><label>Category<input id="editProductCategory" value="${escapeHtml(product.category)}"></label><label>Photo URL<input id="editProductPhoto" type="url" value="${escapeHtml(product.photo)}" placeholder="https://..."></label><label>Status<select id="editProductStatus"><option value="active" ${product.active?'selected':''}>Active</option><option value="inactive" ${!product.active?'selected':''}>Inactive</option></select></label><div class="actions product-editor-actions"><button class="btn" type="submit">Save metadata</button><button class="btn secondary" type="button" data-close>Cancel</button></div></form></section>`;document.body.appendChild(modal);modal.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>modal.remove());modal.querySelector('#productEditForm').onsubmit=e=>{e.preventDefault();const meta=readMeta();meta[product.key]={name:text(modal.querySelector('#editProductName').value),category:text(modal.querySelector('#editProductCategory').value),photo:text(modal.querySelector('#editProductPhoto').value),active:modal.querySelector('#editProductStatus').value==='active'};writeMeta(meta);modal.remove();productsPage()}}
}
