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
      const qty=firstNumber(item,'qty','quantity')||1;
      const line=firstNumber(item,'row_total','line_total','total','net_amount');
      const rate=firstNumber(item,'pack_rate','bill_rate','rate','purchase_rate','price')||(line&&qty?line/qty:0);
      if(!rate)continue;
      const point={date,rate,vendor:supplier,pack:text(get(item,'pack_format','packing')),unit:text(get(item,'unit')).toUpperCase()||'PCS'};
      if(!map.has(key))map.set(key,{key,name,history:[],vendors:new Set()});
      const product=map.get(key);product.history.push(point);if(supplier)product.vendors.add(supplier);
    }
  }
  const products=[...map.values()].map(product=>{
    product.history=product.history.filter(point=>point.date).sort((a,b)=>a.date.localeCompare(b.date));
    product.records=product.history.length;product.vendorCount=product.vendors.size;
    product.search=`${product.name} ${[...product.vendors].join(' ')}`.toLowerCase();
    return product;
  }).sort((a,b)=>a.name.localeCompare(b.name));
  cache={revision:store.dataRevision,products};return products;
}

function graphMarkup(history){
  const points=history.slice(-30);
  if(points.length<2)return'<div class="empty">At least two saved prices are needed to draw a price trend.</div>';
  const width=900,height=320,padX=52,padY=34,min=Math.min(...points.map(point=>point.rate)),max=Math.max(...points.map(point=>point.rate)),range=max-min||1;
  const coords=points.map((point,index)=>({x:padX+index*(width-padX*2)/Math.max(1,points.length-1),y:height-padY-(point.rate-min)*(height-padY*2)/range,...point}));
  const path=coords.map((point,index)=>`${index?'L':'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const dots=coords.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="5"><title>${escapeHtml(point.date)} · ${escapeHtml(point.vendor)} · ${money(point.rate)}</title></circle>`).join('');
  const first=coords[0],last=coords.at(-1);
  return `<div class="analysis-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Product price history"><line class="axis" x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"/><line class="axis" x1="${padX}" y1="${padY}" x2="${padX}" y2="${height-padY}"/><path d="${path}"/>${dots}<text x="${padX}" y="20">${escapeHtml(money(max))}</text><text x="${padX}" y="${height-8}">${escapeHtml(money(min))}</text><text x="${first.x}" y="${height-8}" text-anchor="start">${escapeHtml(first.date)}</text><text x="${last.x}" y="${height-8}" text-anchor="end">${escapeHtml(last.date)}</text></svg></div>`;
}

function analysisMarkup(product){
  if(!product)return'<section class="card"><div class="empty">Select a product to see its price analysis.</div></section>';
  const history=product.history,last=history.at(-1),first=history[0],low=Math.min(...history.map(point=>point.rate)),high=Math.max(...history.map(point=>point.rate));
  const change=first?.rate?((last.rate-first.rate)/first.rate)*100:0;
  return `<section class="analysis-hero"><div><span>Selected product</span><h2>${escapeHtml(product.name)}</h2><p>${product.records} purchase record${product.records===1?'':'s'} from ${product.vendorCount} vendor${product.vendorCount===1?'':'s'}</p></div><strong>${last?money(last.rate):'—'}</strong></section><section class="grid-4 analysis-kpis"><div class="kpi"><span>Latest rate</span><strong>${last?money(last.rate):'—'}</strong><small>${escapeHtml(last?.date||'No date')}</small></div><div class="kpi"><span>Lowest rate</span><strong>${money(low)}</strong><small>Best recorded purchase</small></div><div class="kpi"><span>Highest rate</span><strong>${money(high)}</strong><small>Highest recorded purchase</small></div><div class="kpi"><span>Movement</span><strong>${change>=0?'+':''}${change.toFixed(1)}%</strong><small>First to latest price</small></div></section><section class="card"><header class="card-head"><div><h2>Price analysis</h2><small>Last ${Math.min(30,history.length)} recorded purchases</small></div></header><div class="card-body">${graphMarkup(history)}</div></section><section class="card"><header class="card-head"><div><h2>Price history</h2><small>Vendor and pack details</small></div></header><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Vendor</th><th>Pack</th><th class="num">Rate</th></tr></thead><tbody>${history.slice().reverse().slice(0,30).map(point=>`<tr><td>${escapeHtml(point.date)}</td><td>${escapeHtml(point.vendor)}</td><td>${escapeHtml(point.pack||point.unit)}</td><td class="num"><strong>${money(point.rate)}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
}

export function productsPage(){
  const products=buildProducts();
  if(!$('#productAnalysisOnlyStyles')){const style=document.createElement('style');style.id='productAnalysisOnlyStyles';style.textContent=`.product-analysis-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) minmax(240px,1fr);gap:14px;padding:16px}.analysis-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:22px 24px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface);box-shadow:var(--shadow-sm)}.analysis-hero span{color:var(--text-muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.analysis-hero h2{margin-top:5px;color:var(--brand-navy);font-size:26px}.analysis-hero p{margin-top:5px;color:var(--text-muted)}.analysis-hero>strong{font-size:26px;color:var(--brand-navy);white-space:nowrap}.analysis-chart{width:100%;overflow:hidden}.analysis-chart svg{display:block;width:100%;height:auto;min-height:260px}.analysis-chart .axis{stroke:var(--border);stroke-width:1}.analysis-chart path{fill:none;stroke:var(--brand-navy);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.analysis-chart circle{fill:var(--brand-gold);stroke:var(--surface);stroke-width:2}.analysis-chart text{fill:var(--text-muted);font-size:12px}.analysis-kpis .kpi{min-height:120px}@media(max-width:700px){.product-analysis-toolbar{grid-template-columns:1fr;padding:14px}.analysis-hero{align-items:flex-start;flex-direction:column;padding:18px}.analysis-hero h2{font-size:22px}.analysis-hero>strong{font-size:22px}.analysis-kpis{grid-template-columns:1fr 1fr!important}.analysis-chart svg{min-height:220px}.analysis-kpis .kpi{min-height:105px;padding:14px}}`;document.head.appendChild(style)}
  content().innerHTML=`<header class="page-head"><div><h1>Product Analysis</h1><p>Select one product to view only its purchase-price graph and history.</p></div></header><section class="card product-analysis-toolbar"><label>Search product<input id="productAnalysisSearch" placeholder="Type product name or vendor"></label><label>Select product<select id="productAnalysisSelect"><option value="">Choose a product</option>${products.map(product=>`<option value="${escapeHtml(product.key)}">${escapeHtml(product.name)}</option>`).join('')}</select></label></section><div id="productAnalysisView"></div>`;
  const search=$('#productAnalysisSearch'),select=$('#productAnalysisSelect'),view=$('#productAnalysisView');
  const render=()=>{const product=products.find(item=>item.key===select.value);view.innerHTML=analysisMarkup(product)};
  search.oninput=()=>{const query=text(search.value).toLowerCase(),filtered=query?products.filter(product=>product.search.includes(query)):products,current=select.value;select.innerHTML=`<option value="">Choose a product</option>${filtered.map(product=>`<option value="${escapeHtml(product.key)}">${escapeHtml(product.name)}</option>`).join('')}`;if(filtered.some(product=>product.key===current))select.value=current;else if(filtered.length===1)select.value=filtered[0].key;render()};
  select.onchange=render;
  if(products.length){select.value=products[0].key;render()}else view.innerHTML='<section class="card"><div class="empty">No saved product prices are available yet.</div></section>';
}
