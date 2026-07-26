import {store,money,escapeHtml,text,number,billDate,vendor,productOf,itemOf,get} from './store.js';

const $=s=>document.querySelector(s);
const content=()=>$('#content');
const header=(title,subtitle)=>`<header class="page-head"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></header>`;
const fmtPct=value=>`${value>0?'+':''}${value.toFixed(1)}%`;
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');

function unitLabel(item){
  const base=text(get(item,'base_unit')).toUpperCase();
  const unit=text(get(item,'unit')).toUpperCase();
  return base||(['KG','G'].includes(unit)?'G':['L','ML'].includes(unit)?'ML':unit||'PCS');
}

function normalizedRate(row){
  const item=itemOf(row);
  const direct=number(get(item,'unit_rate','small_unit_rate'));
  if(direct>0)return direct;
  const base=number(get(item,'base_quantity'));
  const line=number(get(item,'row_total','total'))||number(get(row,'amount'));
  if(base>0&&line>0)return line/base;
  const qty=number(get(item,'qty','quantity'))||1;
  const packRate=number(get(item,'pack_rate','rate'))||number(get(row,'amount'))/qty;
  return packRate>0?packRate:0;
}

function buildIntelligence(){
  const products=new Map();
  store.rows.forEach(row=>{
    const name=productOf(row);
    const date=billDate(row);
    if(!name||name==='Unspecified item'||!validDate(date))return;
    const item=itemOf(row),rate=normalizedRate(row);
    if(rate<=0)return;
    const entry={
      id:row.id,
      name,
      date,
      supplier:vendor(row),
      rate,
      amount:number(get(row,'amount')),
      pack:text(get(item,'pack_format','packing')),
      unit:text(get(item,'unit')).toUpperCase(),
      baseUnit:unitLabel(item),
      billNo:text(get(row,'bill_no','Bill No'))||'—'
    };
    if(!products.has(name))products.set(name,[]);
    products.get(name).push(entry);
  });

  return [...products.entries()].map(([name,history])=>{
    history.sort((a,b)=>b.date.localeCompare(a.date));
    const current=history[0];
    const previous=history.find(x=>x.date<current.date)||history[1]||null;
    const change=previous&&previous.rate?((current.rate-previous.rate)/previous.rate)*100:0;
    const supplierLatest=new Map();
    history.forEach(record=>{if(!supplierLatest.has(record.supplier))supplierLatest.set(record.supplier,record)});
    const offers=[...supplierLatest.values()].sort((a,b)=>a.rate-b.rate);
    const cheapest=offers[0]||current;
    const highest=offers[offers.length-1]||current;
    const saving=highest.rate>cheapest.rate?highest.rate-cheapest.rate:0;
    return {name,history,current,previous,change,offers,cheapest,highest,saving,suppliers:supplierLatest.size};
  }).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)||a.name.localeCompare(b.name));
}

function trendClass(change){return change>0.01?'up':change<-0.01?'down':'flat'}
function trendText(change){return change>0.01?'Price increased':change<-0.01?'Price decreased':'No change'}

export function ratesPage(){
  if(store.role!=='admin'){
    content().innerHTML=`${header('Price Intelligence','Administrator-only procurement analytics.')}<section class="card"><div class="empty">Your account does not have permission to view product pricing intelligence.</div></section>`;
    return;
  }

  const data=buildIntelligence();
  const increases=data.filter(x=>x.change>0.01).length;
  const decreases=data.filter(x=>x.change<-0.01).length;
  const comparable=data.filter(x=>x.suppliers>1);
  const opportunity=comparable.reduce((sum,x)=>sum+x.saving,0);

  content().innerHTML=`${header('Price Intelligence','Compare normalized product rates, supplier offers and recent price movement.')}
    <section class="grid-4 rates-kpis">
      <article class="kpi"><span>Tracked products</span><strong>${data.length.toLocaleString()}</strong><small>Products with dated price records</small></article>
      <article class="kpi"><span>Price increases</span><strong>${increases.toLocaleString()}</strong><small>Latest rate above previous rate</small></article>
      <article class="kpi"><span>Price decreases</span><strong>${decreases.toLocaleString()}</strong><small>Latest rate below previous rate</small></article>
      <article class="kpi"><span>Supplier opportunity</span><strong>${money(opportunity)}</strong><small>Sum of current per-unit rate gaps</small></article>
    </section>
    <section class="rates-toolbar">
      <label>Search<input id="rateSearch" placeholder="Product, supplier, pack or unit"></label>
      <label>Movement<select id="rateMovement"><option value="">All movements</option><option value="up">Price increased</option><option value="down">Price decreased</option><option value="flat">No change</option></select></label>
      <label>Supplier coverage<select id="rateCoverage"><option value="">All products</option><option value="compare">Multiple suppliers</option><option value="single">Single supplier</option></select></label>
      <label>Sort<select id="rateSort"><option value="movement">Largest movement</option><option value="name">Product name</option><option value="latest">Most recent purchase</option><option value="saving">Largest supplier gap</option></select></label>
    </section>
    <section class="card">
      <div class="table-wrap"><table class="table rates-table"><thead><tr><th>Product</th><th>Latest normalized rate</th><th>Movement</th><th>Best current supplier</th><th>Supplier range</th><th>Last purchase</th><th></th></tr></thead><tbody id="rateRows"></tbody></table></div>
      <footer class="pager"><span id="rateMeta"></span></footer>
    </section>
    <section id="rateDetail"></section>`;

  const draw=()=>{
    const query=text($('#rateSearch').value).toLowerCase();
    const movement=$('#rateMovement').value;
    const coverage=$('#rateCoverage').value;
    const sort=$('#rateSort').value;
    const rows=data.filter(product=>{
      const hay=[product.name,product.current.supplier,product.current.pack,product.current.unit,...product.offers.map(x=>x.supplier)].join(' ').toLowerCase();
      return (!query||hay.includes(query))&&(!movement||trendClass(product.change)===movement)&&(!coverage||(coverage==='compare'?product.suppliers>1:product.suppliers===1));
    });
    rows.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='latest'?b.current.date.localeCompare(a.current.date):sort==='saving'?b.saving-a.saving:Math.abs(b.change)-Math.abs(a.change));
    $('#rateRows').innerHTML=rows.map((product,index)=>{
      const low=product.cheapest.rate,high=product.highest.rate;
      return `<tr>
        <td><strong>${escapeHtml(product.name)}</strong><small class="cell-meta">${product.history.length} records · ${product.suppliers} supplier${product.suppliers===1?'':'s'}</small></td>
        <td><strong>${money(product.current.rate)} / ${escapeHtml(product.current.baseUnit)}</strong><small class="cell-meta">${escapeHtml(product.current.pack||product.current.unit||'Pack not recorded')}</small></td>
        <td><span class="rate-trend ${trendClass(product.change)}">${fmtPct(product.change)}</span><small class="cell-meta">${trendText(product.change)}</small></td>
        <td><strong>${escapeHtml(product.cheapest.supplier)}</strong><small class="cell-meta">${money(product.cheapest.rate)} / ${escapeHtml(product.cheapest.baseUnit)}</small></td>
        <td><strong>${low===high?'—':`${money(low)} – ${money(high)}`}</strong><small class="cell-meta">${product.saving?`${money(product.saving)} gap`:'No comparable gap'}</small></td>
        <td><strong>${escapeHtml(product.current.date)}</strong><small class="cell-meta">Bill ${escapeHtml(product.current.billNo)}</small></td>
        <td class="action-col"><button class="btn secondary small" data-rate-detail="${index}">Details</button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="7" class="empty">No products match these filters.</td></tr>';
    $('#rateMeta').textContent=`${rows.length.toLocaleString()} of ${data.length.toLocaleString()} tracked products`;
    document.querySelectorAll('[data-rate-detail]').forEach(button=>button.onclick=()=>showDetail(rows[number(button.dataset.rateDetail)]));
  };

  const showDetail=product=>{
    const detail=$('#rateDetail');
    if(!product){detail.innerHTML='';return}
    const max=Math.max(...product.history.map(x=>x.rate),1);
    detail.innerHTML=`<article class="card rate-detail-card">
      <header class="card-head"><div><h2>${escapeHtml(product.name)}</h2><small>Price history and current supplier comparison</small></div><button class="btn secondary small" id="closeRateDetail">Close</button></header>
      <div class="card-body rate-detail-grid">
        <section><h3>Recent price history</h3><div class="rate-history">${product.history.slice(0,12).map(record=>`<div class="rate-history-row"><span>${escapeHtml(record.date)}</span><div class="track"><span style="width:${Math.max(3,record.rate/max*100)}%"></span></div><strong>${money(record.rate)}</strong><small>${escapeHtml(record.supplier)}</small></div>`).join('')}</div></section>
        <section><h3>Current supplier offers</h3><div class="supplier-offers">${product.offers.map((offer,index)=>`<article class="supplier-offer ${index===0?'best':''}"><div><strong>${escapeHtml(offer.supplier)}</strong><small>${escapeHtml(offer.date)} · ${escapeHtml(offer.pack||offer.unit||'Pack not recorded')}</small></div><div><strong>${money(offer.rate)} / ${escapeHtml(offer.baseUnit)}</strong>${index===0&&product.offers.length>1?'<span>Best current rate</span>':''}</div></article>`).join('')}</div></section>
      </div>
    </article>`;
    $('#closeRateDetail').onclick=()=>detail.innerHTML='';
    detail.scrollIntoView({behavior:'smooth',block:'start'});
  };

  ['rateSearch','rateMovement','rateCoverage','rateSort'].forEach(id=>{$(`#${id}`).oninput=draw;$(`#${id}`).onchange=draw});
  draw();
}
