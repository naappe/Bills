import {db} from './data.js';
import {escapeHtml,money,number,text} from './store.js';

const content=()=>document.querySelector('#content');
const norm=value=>text(value).trim().toLowerCase();
let rows=[];

async function load(){
  const {data,error}=await db.from('supply').select('*').eq('is_active',true).order('Name');
  if(error)throw error;
  rows=data||[];
}

function statusOf(row){
  const stock=number(row.stock),minimum=number(row.minimum_stock);
  if(stock<=0)return['Out of stock','danger'];
  if(minimum>0&&stock<=minimum)return['Low stock','warning'];
  return['In stock','success'];
}

function styles(){
  if(document.querySelector('#supplyStyles'))return;
  const style=document.createElement('style');
  style.id='supplyStyles';
  style.textContent=`
  .page-shell{width:100%;min-width:0;display:grid;gap:16px}
  .page-header{width:100%;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0}
  .page-header__copy{min-width:0;flex:1 1 auto}
  .page-header__copy h1{margin:0;color:var(--text-strong);font-size:24px;line-height:1.2;letter-spacing:-.02em}
  .page-header__copy p{margin:4px 0 0;color:var(--text-muted);font-size:13px;line-height:1.45}
  .page-header__actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:0 0 auto}
  .page-toolbar{width:100%;min-width:0;display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}
  .page-toolbar label{min-width:min(340px,100%);flex:1 1 340px}
  .page-content{width:100%;min-width:0}
  .supply-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
  .supply-card{padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface);display:grid;gap:12px}
  .supply-card h3{margin:0;color:var(--text-strong);font-size:16px}
  .supply-card p{margin:0;color:var(--text-muted);font-size:12px}
  .supply-stock{display:flex;align-items:end;justify-content:space-between;gap:12px}
  .supply-stock strong{font-size:25px}
  .supply-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .supply-meta div{padding:9px;border-radius:10px;background:var(--surface-muted)}
  .supply-meta span{display:block;color:var(--text-muted);font-size:10px;text-transform:uppercase}
  .supply-meta strong{display:block;margin-top:3px;font-size:12px}
  .stock-badge{display:inline-flex;width:max-content;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:700}
  .stock-badge.success{background:#e8f7ef;color:#16734a}
  .stock-badge.warning{background:#fff4d8;color:#9a6700}
  .stock-badge.danger{background:#feeceb;color:#b42318}
  .supply-empty{padding:38px;text-align:center;color:var(--text-muted)}
  @media(max-width:820px){
    .page-header{align-items:stretch;flex-direction:column}
    .page-header__actions{width:100%;justify-content:flex-start}
    .page-header__actions .btn{width:100%}
    .page-toolbar{align-items:stretch;flex-direction:column}
    .page-toolbar label{width:100%;min-width:0}
  }
  `;
  document.head.appendChild(style);
}

function filterRows(query){
  const q=norm(query);
  return rows.filter(row=>!q||[row.Name,row.Vendor,row.Catogories,row.Unit].some(value=>norm(value).includes(q)));
}

function card(row,inventory=false){
  const [label,tone]=statusOf(row),stock=number(row.stock),minimum=number(row.minimum_stock);
  return `<article class="supply-card" data-supply-id="${row.id}"><div><h3>${escapeHtml(row.Name||'Unnamed item')}</h3><p>${escapeHtml(row.Catogories||'Uncategorised')} · ${escapeHtml(row.Vendor||'No vendor')}</p></div><div class="supply-stock"><div><span class="stock-badge ${tone}">${label}</span><strong>${stock} ${escapeHtml(row.Unit||'PCS')}</strong></div>${inventory?`<button class="btn secondary small" data-adjust type="button">Adjust</button>`:''}</div><div class="supply-meta"><div><span>Latest rate</span><strong>${money(number(row.Rate))}</strong></div><div><span>Minimum</span><strong>${minimum} ${escapeHtml(row.Unit||'PCS')}</strong></div><div><span>Last purchase</span><strong>${escapeHtml(row.last_purchase_date||'—')}</strong></div><div><span>Updated</span><strong>${escapeHtml((row.updated_at||'').slice(0,10)||'—')}</strong></div></div></article>`;
}

async function render(inventory=false){
  styles();
  const title=inventory?'Inventory':'Supply';
  const description=inventory?'Current stock, minimum levels and stock adjustments':'Products, vendors, prices and stock in one master list';
  content().innerHTML='<section class="panel"><div class="supply-empty">Loading supply…</div></section>';
  await load();
  content().innerHTML=`<section class="page-shell">
    <header class="page-header">
      <div class="page-header__copy"><h1>${title}</h1><p>${description}</p></div>
      <div class="page-header__actions"><button class="btn" id="addSupply" type="button">Add supply item</button></div>
    </header>
    <section class="page-toolbar" aria-label="${title} filters">
      <label>Search<input id="supplySearch" placeholder="Search item, vendor or category"></label>
    </section>
    <section class="page-content"><div class="supply-grid" id="supplyGrid"></div></section>
  </section>`;
  const grid=document.querySelector('#supplyGrid'),search=document.querySelector('#supplySearch');
  const draw=()=>{const list=filterRows(search.value);grid.innerHTML=list.length?list.map(row=>card(row,inventory)).join(''):'<div class="supply-empty">No matching supply items.</div>'};
  search.addEventListener('input',draw);draw();
  document.querySelector('#addSupply').onclick=()=>editItem();
  grid.addEventListener('click',event=>{const article=event.target.closest('[data-supply-id]');if(!article)return;const row=rows.find(item=>String(item.id)===article.dataset.supplyId);if(event.target.closest('[data-adjust]'))adjustStock(row);else if(!inventory)editItem(row)});
}

async function editItem(row={}){
  const name=prompt('Supply item name',row.Name||'');if(!name)return;
  const unit=prompt('Unit',row.Unit||'PCS')||'PCS';
  const vendor=prompt('Vendor',row.Vendor||'')||null;
  const rate=Number(prompt('Latest rate',row.Rate||0)||0);
  const category=prompt('Category',row.Catogories||'')||null;
  const minimum=Number(prompt('Minimum stock',row.minimum_stock||0)||0);
  const payload={Name:name.trim(),Unit:unit.trim().toUpperCase(),Vendor:vendor,Rate:rate,Catogories:category,minimum_stock:minimum,updated_at:new Date().toISOString()};
  const query=row.id?db.from('supply').update(payload).eq('id',row.id):db.from('supply').insert(payload);
  const {error}=await query;if(error){alert(error.message);return}await render(false);
}

async function adjustStock(row){
  const delta=Number(prompt(`Adjust ${row.Name} stock. Use negative to reduce.\nCurrent: ${number(row.stock)} ${row.Unit||'PCS'}`,'0'));
  if(!Number.isFinite(delta)||delta===0)return;
  const next=Math.max(0,number(row.stock)+delta);
  const {error}=await db.from('supply').update({stock:next,updated_at:new Date().toISOString()}).eq('id',row.id);
  if(error){alert(error.message);return}await render(true);
}

export const supplyPage=()=>render(false);
export const inventoryPage=()=>render(true);
