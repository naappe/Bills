import {store,escapeHtml,text} from './store.js';
import {db} from './data.js';

const $=selector=>document.querySelector(selector);
const key=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
let products=[],sources=new Set(),target=null;

function styles(){
 if($('#productMergeStyles'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="productMergeStyles">
 .pm-shell{display:grid;gap:16px}.pm-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}.pm-top h2{margin:0;color:var(--brand-navy)}.pm-top p{margin:5px 0 0;color:var(--text-muted)}
 .pm-columns{display:grid;grid-template-columns:1fr 68px 1fr;gap:16px;align-items:stretch}.pm-column{min-height:430px;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-sm)}.pm-column.chosen{border-color:var(--brand-gold);box-shadow:0 0 0 2px var(--brand-gold-100)}.pm-title{display:flex;align-items:center;gap:12px}.pm-step{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--brand-navy);color:#fff;font-weight:800}.pm-title h3{margin:0}.pm-title small{display:block;margin-top:3px;color:var(--text-muted)}.pm-search{margin:16px 0 12px}.pm-list{display:grid;gap:8px;max-height:270px;overflow:auto;padding-right:4px}.pm-product{display:grid;grid-template-columns:54px minmax(0,1fr);gap:12px;align-items:center;width:100%;padding:10px;border:1px solid var(--border);border-radius:12px;background:#fff;text-align:left;cursor:pointer}.pm-product:hover,.pm-product.selected{border-color:var(--brand-gold);background:var(--brand-gold-100)}.pm-product img,.pm-placeholder{width:54px;height:54px;border-radius:10px;object-fit:cover;background:#e9eef4}.pm-product strong,.pm-product small{display:block}.pm-product small{margin-top:4px;color:var(--text-muted)}.pm-arrow{display:grid;place-items:center;color:var(--text-muted);font-size:11px;font-weight:800;text-transform:uppercase}.pm-arrow span{display:grid;gap:4px;place-items:center}.pm-arrow span::before{content:'Move to';white-space:nowrap}.pm-arrow span::after{content:'→';font-size:28px;color:var(--brand-gold)}.pm-footer{position:sticky;bottom:12px;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 12px 34px rgba(14,42,75,.18)}.pm-footer strong,.pm-footer small{display:block}.pm-footer small{margin-top:4px;color:var(--text-muted)}
 @media(max-width:850px){.pm-columns{grid-template-columns:1fr}.pm-arrow span::after{transform:rotate(90deg)}.pm-column{min-height:420px}.pm-list{max-height:300px}}@media(max-width:600px){.pm-top,.pm-footer{align-items:stretch;flex-direction:column}.pm-footer .btn{width:100%}}
 </style>`);
}
function option(product,side,selected){
 return `<button class="pm-product ${selected?'selected':''}" data-side="${side}" data-id="${product.id}">${product.image_url?`<img src="${escapeHtml(product.image_url)}" alt="">`:'<span class="pm-placeholder"></span>'}<span><strong>${escapeHtml(product.name)}</strong><small>${product.image_url?'Image available':'No product image'}</small></span></button>`;
}
function draw(){
 const sourceQuery=key($('#pmSourceSearch').value),targetQuery=key($('#pmTargetSearch').value);
 $('#pmSourceList').innerHTML=products.filter(product=>!sourceQuery||key(product.name).includes(sourceQuery)).map(product=>option(product,'source',sources.has(product.id))).join('')||'<div class="empty">No matching products.</div>';
 const targetMatches=products.filter(product=>!sources.has(product.id)&&(!targetQuery||key(product.name).includes(targetQuery)));
 $('#pmTargetList').innerHTML=targetMatches.map(product=>option(product,'target',target?.id===product.id)).join('')+(targetQuery&&!products.some(product=>key(product.name)===targetQuery)?`<button class="pm-product" id="pmCreateTarget"><span class="pm-placeholder"></span><span><strong>Create “${escapeHtml($('#pmTargetSearch').value)}”</strong><small>New correct master product</small></span></button>`:'')||'<div class="empty">Search or write the correct product name.</div>';
 $('#pmSourceColumn').classList.toggle('chosen',sources.size>0);$('#pmTargetColumn').classList.toggle('chosen',!!target);$('#pmMerge').disabled=!(sources.size&&target);$('#pmMerge').textContent=sources.size&&target?`Merge ${sources.size} product${sources.size>1?'s':''} into ${target.name}`:'Select products';
 $('#pmSummary').innerHTML=sources.size&&target?`<strong>${sources.size} selected → ${escapeHtml(target.name)}</strong><small>All selected duplicates, historical bills and prices will move to this master product. Vendors will not change.</small>`:`<strong>${sources.size?`${sources.size} duplicate product${sources.size>1?'s':''} selected`:'Select duplicate products'}</strong><small>Choose one or several wrong products, then select the correct master product.</small>`;
 $('#pmCreateTarget')?.addEventListener('click',createTarget);
}
async function createTarget(){
 const name=text($('#pmTargetSearch').value);if(!name)return;
 const {data,error}=await db.rpc('create_master_product',{p_name:name});if(error){alert(error.message||'Product could not be created.');return}
 target=Array.isArray(data)?data[0]:data;if(!products.some(product=>product.id===target.id))products.push(target);draw();
}
export async function productMergePage(){
 if(store.role!=='admin'){location.hash='#products';return}
 styles();
 const {data,error}=await db.from('products').select('id,name,image_url,current_rate').eq('is_active',true).is('deleted_at',null).order('name');
 if(error){alert(error.message||'Products could not be loaded.');location.hash='#products';return}
 products=data||[];
 $('#content').innerHTML=`<section class="pm-shell"><header class="pm-top"><div><h2>Merge master products</h2><p>Select the duplicate product and move everything to the correct master product.</p></div><button class="btn secondary" id="pmBack">Back to Products</button></header><div class="pm-columns"><section class="pm-column" id="pmSourceColumn"><div class="pm-title"><span class="pm-step">1</span><div><h3>Wrong product</h3><small>Select all duplicate names to remove</small></div></div><input class="pm-search" id="pmSourceSearch" placeholder="Search wrong product"><div class="pm-list" id="pmSourceList"></div></section><div class="pm-arrow"><span aria-hidden="true"></span></div><section class="pm-column" id="pmTargetColumn"><div class="pm-title"><span class="pm-step">2</span><div><h3>Correct master product</h3><small>All bills, prices and image will use this product</small></div></div><input class="pm-search" id="pmTargetSearch" placeholder="Search or write correct product name"><div class="pm-list" id="pmTargetList"></div></section></div><footer class="pm-footer"><div id="pmSummary"></div><button class="btn danger" id="pmMerge" disabled>Merge selected products</button></footer></section>`;
 $('#pmBack').onclick=()=>location.hash='#products';$('#pmSourceSearch').oninput=draw;$('#pmTargetSearch').oninput=()=>{target=null;draw()};
 $('#content').addEventListener('click',event=>{const item=event.target.closest('[data-side]');if(!item)return;const product=products.find(row=>row.id===item.dataset.id);if(item.dataset.side==='source'){if(sources.has(product.id))sources.delete(product.id);else sources.add(product.id);if(target&&sources.has(target.id))target=null}else{target=product;$('#pmMerge').focus()}draw()});
 $('#pmMerge').onclick=async event=>{if(!sources.size||!target)return;const selected=products.filter(product=>sources.has(product.id));if(!confirm(`Merge ${selected.length} product${selected.length>1?'s':''} into “${target.name}”?`))return;event.currentTarget.disabled=true;const {error}=await db.rpc('merge_master_products_bulk',{p_source_ids:selected.map(product=>product.id),p_target_id:target.id});if(error){event.currentTarget.disabled=false;alert(error.message||'Merge failed.');return}alert(`${sources.size} products merged successfully.`);location.hash='#products'};
 draw();
}
