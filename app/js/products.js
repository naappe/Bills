import {store,money,escapeHtml,text,number,billDate,itemOf,get,vendor} from './store.js';

const $=selector=>document.querySelector(selector),content=()=>$('#content');
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ').trim();
const cleanName=value=>text(value).replace(/\b(active|inactive)\b/ig,'').replace(/\s+/g,' ').trim();
const firstNumber=(source,...fields)=>{for(const field of fields){const value=number(get(source,field));if(value>0)return value}return 0};
const itemsOf=row=>Array.isArray(row?.items)&&row.items.length?row.items:[itemOf(row)].filter(Boolean);
const productName=(item,row)=>cleanName(get(item,'description','product','name')||get(row,'product','description'));
let cache={revision:-1,products:[]};

function buildProducts(){
  if(cache.revision===store.dataRevision)return cache.products;
  const map=new Map();
  for(const row of store.rows){
    const date=billDate(row),supplier=vendor(row);
    for(const item of itemsOf(row)){
      const name=productName(item,row),key=keyOf(name);if(!key)continue;
      const qty=firstNumber(item,'qty','quantity')||1,line=firstNumber(item,'row_total','line_total','total','net_amount');
      const rate=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')||(line&&qty?line/qty:0);if(!rate)continue;
      const point={date,rate,vendor:supplier,pack:text(get(item,'pack_format','packing')),unit:text(get(item,'unit')).toUpperCase()||'PCS'};
      if(!map.has(key))map.set(key,{key,name,history:[],vendors:new Set()});
      const product=map.get(key);product.history.push(point);if(supplier)product.vendors.add(supplier);
    }
  }
  const products=[...map.values()].map(product=>{
    product.history=product.history.filter(point=>point.date).sort((a,b)=>a.date.localeCompare(b.date));
    product.records=product.history.length;product.vendorCount=product.vendors.size;product.latest=product.history.at(-1)?.rate||0;
    product.low=product.history.length?Math.min(...product.history.map(point=>point.rate)):0;
    product.high=product.history.length?Math.max(...product.history.map(point=>point.rate)):0;
    const first=product.history[0]?.rate||0;product.change=first?((product.latest-first)/first)*100:0;
    product.search=`${product.name} ${[...product.vendors].join(' ')}`.toLowerCase();return product;
  }).sort((a,b)=>a.name.localeCompare(b.name));
  cache={revision:store.dataRevision,products};return products;
}

function lineGraph(history){
  const points=history.slice(-30);
  if(points.length<2)return'<div class="empty">This product has only one saved price. Add another bill to create a trend line.</div>';
  const width=900,height=320,padX=58,padY=38,min=Math.min(...points.map(point=>point.rate)),max=Math.max(...points.map(point=>point.rate)),range=max-min||1;
  const coords=points.map((point,index)=>({x:padX+index*(width-padX*2)/Math.max(1,points.length-1),y:height-padY-(point.rate-min)*(height-padY*2)/range,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const dots=coords.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="6"><title>${escapeHtml(point.date)} · ${escapeHtml(point.vendor)} · ${money(point.rate)}</title></circle>`).join('');
  return `<div class="analysis-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Selected product price trend"><line class="axis" x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"/><line class="axis" x1="${padX}" y1="${padY}" x2="${padX}" y2="${height-padY}"/><path d="${path}"/>${dots}<text x="${padX}" y="22">${escapeHtml(money(max))}</text><text x="${padX}" y="${height-10}">${escapeHtml(money(min))}</text></svg></div>`;
}

function bars(products,metric,label,format){
  const rows=products.filter(product=>Number.isFinite(product[metric])).sort((a,b)=>Math.abs(b[metric])-Math.abs(a[metric])).slice(0,15);
  const maximum=Math.max(1,...rows.map(product=>Math.abs(product[metric])));
  return `<div class="analysis-bars">${rows.map(product=>{const value=product[metric],width=Math.max(2,Math.abs(value)/maximum*100);return `<div class="analysis-bar-row"><div class="analysis-bar-label"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(format(value))}</span></div><div class="analysis-bar-track"><span style="width:${width.toFixed(1)}%"></span></div></div>`}).join('')||'<div class="empty">No product data available.</div>'}</div><small class="analysis-note">${escapeHtml(label)}</small>`;
}

function allProductsMarkup(products){
  if(!products.length)return'<section class="card"><div class="empty">No saved product prices are available yet.</div></section>';
  const records=products.reduce((sum,product)=>sum+product.records,0),vendors=new Set(products.flatMap(product=>[...product.vendors])).size;
  return `<section class="grid-4 analysis-kpis"><div class="kpi"><span>Products</span><strong>${products.length}</strong><small>With saved price data</small></div><div class="kpi"><span>Purchase records</span><strong>${records}</strong><small>Across all products</small></div><div class="kpi"><span>Vendors</span><strong>${vendors}</strong><small>Linked suppliers</small></div><div class="kpi"><span>Price changes</span><strong>${products.filter(product=>product.history.length>1).length}</strong><small>Products with trends</small></div></section><section class="analysis-grid"><section class="card"><header class="card-head"><div><h2>Latest product prices</h2><small>Top 15 latest pack rates</small></div></header><div class="card-body">${bars(products,'latest','Latest recorded pack rate',value=>money(value))}</div></section><section class="card"><header class="card-head"><div><h2>Largest price movement</h2><small>First recorded price compared with latest</small></div></header><div class="card-body">${bars(products.filter(product=>product.history.length>1),'change','Absolute percentage movement',value=>`${value>=0?'+':''}${value.toFixed(1)}%`)}</div></section></section>`;
}

function selectedProductMarkup(product){
  if(!product)return'';
  const history=product.history,last=history.at(-1);
  return `<section class="analysis-hero"><div><span>Selected product</span><h2>${escapeHtml(product.name)}</h2><p>${product.records} purchase record${product.records===1?'':'s'} · ${product.vendorCount} vendor${product.vendorCount===1?'':'s'}</p></div><strong>${last?money(last.rate):'—'}</strong></section><section class="grid-4 analysis-kpis"><div class="kpi"><span>Latest rate</span><strong>${money(product.latest)}</strong><small>${escapeHtml(last?.date||'No date')}</small></div><div class="kpi"><span>Lowest rate</span><strong>${money(product.low)}</strong><small>Best recorded purchase</small></div><div class="kpi"><span>Highest rate</span><strong>${money(product.high)}</strong><small>Highest recorded purchase</small></div><div class="kpi"><span>Movement</span><strong>${product.change>=0?'+':''}${product.change.toFixed(1)}%</strong><small>First to latest price</small></div></section><section class="card"><header class="card-head"><div><h2>Price trend</h2><small>Last ${Math.min(30,history.length)} recorded purchases</small></div></header><div class="card-body">${lineGraph(history)}</div></section><section class="card"><header class="card-head"><div><h2>Vendor price history</h2><small>Purchase details for this product</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Vendor</th><th>Pack</th><th class="num">Rate</th></tr></thead><tbody>${history.slice().reverse().slice(0,30).map(point=>`<tr><td>${escapeHtml(point.date)}</td><td>${escapeHtml(point.vendor)}</td><td>${escapeHtml(point.pack||point.unit)}</td><td class="num"><strong>${money(point.rate)}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
}

export function productsPage(){
  const products=buildProducts();
  if(!$('#productAnalysisStyles')){const style=document.createElement('style');style.id='productAnalysisStyles';style.textContent=`.product-analysis-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:14px;padding:16px}.analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.analysis-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:22px 24px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);box-shadow:var(--shadow-sm)}.analysis-hero span{color:var(--text-muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.analysis-hero h2{margin-top:5px;color:var(--brand-navy);font-size:26px}.analysis-hero p{margin-top:5px;color:var(--text-muted)}.analysis-hero>strong{font-size:26px;color:var(--brand-navy);white-space:nowrap}.analysis-chart{width:100%;overflow:hidden}.analysis-chart svg{display:block;width:100%;height:auto;min-height:260px}.analysis-chart .axis{stroke:var(--border);stroke-width:1}.analysis-chart path{fill:none;stroke:var(--brand-navy);stroke-width:5;stroke-linecap:round;stroke-linejoin:round}.analysis-chart circle{fill:var(--brand-gold);stroke:var(--surface);stroke-width:3}.analysis-chart text{fill:var(--text-muted);font-size:13px}.analysis-bars{display:grid;gap:13px}.analysis-bar-label{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:13px}.analysis-bar-label strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.analysis-bar-label span{flex:none;font-weight:800;color:var(--brand-navy)}.analysis-bar-track{height:12px;border-radius:999px;background:var(--surface-soft,#eef3f7);overflow:hidden}.analysis-bar-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--brand-navy),var(--brand-gold))}.analysis-note{display:block;margin-top:14px;color:var(--text-muted)}.analysis-kpis .kpi{min-height:115px}@media(max-width:700px){.product-analysis-toolbar,.analysis-grid{grid-template-columns:1fr}.product-analysis-toolbar{padding:14px}.analysis-hero{align-items:flex-start;flex-direction:column;padding:18px}.analysis-hero h2,.analysis-hero>strong{font-size:22px}.analysis-kpis{grid-template-columns:1fr 1fr!important}.analysis-chart svg{min-height:220px}.analysis-kpis .kpi{min-height:102px;padding:14px}}`;document.head.appendChild(style)}
  content().innerHTML=`<section class="card product-analysis-toolbar"><label>Search product<input id="productAnalysisSearch" placeholder="Type product name or vendor"></label><label>Product<select id="productAnalysisSelect"><option value="">All products analysis</option>${products.map(product=>`<option value="${escapeHtml(product.key)}">${escapeHtml(product.name)}</option>`).join('')}</select></label></section><div id="productAnalysisView"></div>`;
  const search=$('#productAnalysisSearch'),select=$('#productAnalysisSelect'),view=$('#productAnalysisView');
  const render=()=>{const product=products.find(item=>item.key===select.value);view.innerHTML=product?selectedProductMarkup(product):allProductsMarkup(products)};
  search.oninput=()=>{const query=text(search.value).toLowerCase(),filtered=query?products.filter(product=>product.search.includes(query)):products,current=select.value;select.innerHTML=`<option value="">All products analysis</option>${filtered.map(product=>`<option value="${escapeHtml(product.key)}">${escapeHtml(product.name)}</option>`).join('')}`;if(filtered.some(product=>product.key===current))select.value=current;else if(filtered.length===1)select.value=filtered[0].key;else select.value='';render()};
  select.onchange=render;select.value='';render();
}