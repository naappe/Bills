(()=>{
'use strict';
const KEY='ws-product-catalogue-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
const keyOf=name=>String(name||'').trim().toLowerCase();
const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function overrideFor(name){return read()[keyOf(name)]||null}
function applyOverrides(){
  const data=read();
  document.querySelectorAll('.audit-product,.pr-price-card,.pr-product-card,.plan-card').forEach(card=>{
    const title=card.querySelector('h2');
    if(!title)return;
    const source=card.dataset.productSource||title.textContent.trim();
    card.dataset.productSource=source;
    const o=data[keyOf(source)]||{};
    if(o.name)title.textContent=o.name;
    const category=card.querySelector('.audit-product>div>span,.pr-product-visual small,.plan-label');
    if(category&&o.category)category.textContent=o.category;
    const img=card.querySelector('img');
    if(img&&o.imageUrl){img.src=o.imageUrl;img.alt=`${o.name||source} product image`;}
    if(!card.querySelector('[data-edit-product]')){
      const btn=document.createElement('button');
      btn.type='button';btn.className='btn secondary small product-edit-btn';btn.dataset.editProduct=source;btn.innerHTML='<i class="fas fa-pen"></i> Edit product';
      (card.querySelector('.plan-actions,.audit-product>div,.pr-product-body,footer')||card).appendChild(btn);
      btn.onclick=()=>openEditor(source);
    }
  });
}
function openEditor(source){
  const current=overrideFor(source)||{};
  const modal=document.createElement('div');modal.className='product-editor-modal';
  modal.innerHTML=`<form class="product-editor-card"><header><div><h2>Edit product</h2><p>Catalogue-only metadata. Historical bill lines are not rewritten.</p></div><button type="button" class="btn secondary small" data-close>Close</button></header><label>Product name<input class="field" name="name" value="${escHtml(current.name||source)}" required></label><label>Category<input class="field" name="category" value="${escHtml(current.category||'')}"></label><label>Image URL<input class="field" name="imageUrl" type="url" value="${escHtml(current.imageUrl||'')}" placeholder="https://..."></label><div class="product-editor-actions"><button type="button" class="btn secondary" data-reset>Reset</button><button class="btn" type="submit">Save product</button></div></form>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();modal.querySelector('[data-close]').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  modal.querySelector('[data-reset]').onclick=()=>{const data=read();delete data[keyOf(source)];write(data);close();refreshCurrent()};
  modal.querySelector('form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),data=read();data[keyOf(source)]={name:String(fd.get('name')||source).trim(),category:String(fd.get('category')||'').trim(),imageUrl:String(fd.get('imageUrl')||'').trim(),updatedAt:new Date().toISOString()};write(data);close();refreshCurrent()};
}
function refreshCurrent(){if(state?.view==='prices'||state?.view==='rates')window.renderRates?.();else window.renderProducts?.()}
const oldProducts=window.renderProducts,oldRates=window.renderRates;
window.renderProducts=()=>{oldProducts?.();applyOverrides()};
window.renderRates=()=>{oldRates?.();applyOverrides()};
if(window.__WS_RENDERERS__){window.__WS_RENDERERS__.products=window.renderProducts;window.__WS_RENDERERS__.prices=window.renderRates;window.__WS_RENDERERS__.rates=window.renderRates}
function assetAudit(){
  const rows=[];
  document.querySelectorAll('script[src]').forEach(x=>{const file=x.src.split('/').pop(),name=file.split('?')[0];rows.push({type:'script',file,layer:/product-pricing-v10|role-access-v10|site-audit-v7|product-editor-v8/.test(name)?'current override':/procurement-pages-v4|recovery-v5|vendors-settings-v6|admin-manage-v5|bills-period-filter-v5|admin-users-v9/.test(name)?'transition override':/view-renderers|rates-page|settings-page|vendor-/.test(name)?'legacy/base':'core or vendor'})});
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach(x=>{const file=x.href.split('/').pop(),name=file.split('?')[0];rows.push({type:'style',file,layer:/product-pricing-v10|site-audit-v7|product-editor-v8/.test(name)?'current override':/procurement-pages-v4|recovery-v5|vendors-settings-v6|admin-manage-v5|admin-users-v9/.test(name)?'transition override':/procurement-ui|ui-structure|alignment-system|procurement-rebuild-v3/.test(name)?'legacy/base':'vendor'})});
  console.groupCollapsed('[asset-audit] loaded application assets');console.table(rows);console.info('Renderer flags',{v3:!!window.__WS_PROCUREMENT_REBUILD__,v4:!!window.__WS_PROCUREMENT_PAGES_V4__,v5:!!window.__WS_RECOVERY_V5__,v6:!!window.__WS_VENDORS_SETTINGS_V6__,v7:!!window.__WS_SITE_AUDIT__,v8:true,v10:!!window.__WS_PRODUCT_PRICING_V10__});console.groupEnd();return rows;
}
window.WSAssetAudit=assetAudit;window.__WS_PRODUCT_EDITOR__={version:8.1,storage:KEY,apply:applyOverrides};
setTimeout(assetAudit,0);
})();