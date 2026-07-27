import {store,money,escapeHtml,text,number,billDate,vendor,itemsOf,productName,lineTotal,get,itemCategory} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');
const trendClass=value=>value>.01?'up':value<-.01?'down':'flat';
const signedMoney=value=>`${value>0?'+':value<0?'−':''}${money(Math.abs(value))}`;
const percent=value=>`${value>0?'+':''}${value.toFixed(1)}%`;
const daysSince=value=>Math.max(0,Math.floor((Date.now()-new Date(`${value}T00:00:00`).getTime())/86400000));

function normalized(item){
  const direct=number(get(item,'unit_rate','small_unit_rate'));
  if(direct>0)return{rate:direct,unit:text(get(item,'base_unit')).toUpperCase()||'BASE',comparable:true};
  const base=number(get(item,'base_quantity'));
  if(base>0&&lineTotal(item)>0){
    const sourceUnit=text(get(item,'unit')).toUpperCase();
    const fallback=['KG','G'].includes(sourceUnit)?'G':['L','ML'].includes(sourceUnit)?'ML':'PCS';
    return{rate:lineTotal(item)/base,unit:text(get(item,'base_unit')).toUpperCase()||fallback,comparable:true};
  }
  return{rate:number(get(item,'pack_rate','rate','price')),unit:text(get(item,'unit')).toUpperCase()||'PACK',comparable:false};
}

function build(){
  const map=new Map();
  store.rows.forEach(row=>{
    const date=billDate(row);
    if(!validDate(date))return;
    itemsOf(row).forEach(item=>{
      const name=productName(item,row);
      const norm=normalized(item);
      if(name==='Unspecified item'||norm.rate<=0)return;
      const record={
        name,
        date,
        supplier:vendor(row),
        category:itemCategory(item,row),
        rate:norm.rate,
        baseUnit:norm.unit,
        comparable:norm.comparable,
        pack:text(get(item,'pack_format','packing'))||text(get(item,'unit'))||'—',
        billNo:text(get(row,'bill_no','Bill No'))||'—'
      };
      const key=`${name.toLowerCase()}|${norm.unit}|${norm.comparable?'base':'pack'}`;
      if(!map.has(key))map.set(key,{key,name,unit:norm.unit,category:record.category,comparable:norm.comparable,history:[]});
      map.get(key).history.push(record);
    });
  });

  return[...map.values()].map(product=>{
    product.history.sort((a,b)=>b.date.localeCompare(a.date));
    const current=product.history[0];
    const previous=product.history.find(entry=>entry.date<current.date)||product.history[1]||null;
    const change=previous?.rate?((current.rate-previous.rate)/previous.rate)*100:0;
    const supplierLatest=new Map();
    product.history.forEach(record=>{if(!supplierLatest.has(record.supplier))supplierLatest.set(record.supplier,record)});
    const offers=[...supplierLatest.values()].sort((a,b)=>a.rate-b.rate);
    const cheapest=offers[0]||current;
    const highest=offers.at(-1)||current;
    const average=offers.reduce((sum,offer)=>sum+offer.rate,0)/Math.max(offers.length,1);
    const difference=current.rate-(previous?.rate||current.rate);
    const savings=Math.max(0,current.rate-cheapest.rate);
    const volatility=product.history.length>1?Math.sqrt(product.history.reduce((sum,record)=>sum+Math.pow(record.rate-(product.history.reduce((s,r)=>s+r.rate,0)/product.history.length),2),0)/product.history.length):0;
    return{
      ...product,current,previous,change,difference,offers,cheapest,highest,average,savings,volatility,
      gap:Math.max(0,highest.rate-cheapest.rate),suppliers:offers.length,days:daysSince(current.date)
    };
  }).sort((a,b)=>b.current.date.localeCompare(a.current.date)||a.name.localeCompare(b.name));
}

function sparkline(history){
  const values=history.slice(0,10).reverse().map(record=>record.rate);
  if(values.length<2)return'<span class="pi-no-chart">Not enough history</span>';
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((value,index)=>`${(index/(values.length-1))*116},${34-((value-min)/range)*28}`).join(' ');
  return`<svg class="pi-spark" viewBox="0 0 120 40" role="img" aria-label="Recent price trend"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function injectStyles(){
  if($('#priceIntelligenceStyles'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="priceIntelligenceStyles">
  #content[data-current-route="rates"],#content[data-current-route="prices"]{--pi-good:#16835b;--pi-bad:#c2414b;--pi-warn:#a86408;--pi-neutral:#667085}
  .pi-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.pi-head-actions{display:flex;gap:10px;flex-wrap:wrap}
  .pi-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pi-kpi{min-height:132px;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-sm)}.pi-kpi span,.pi-kpi small{display:block;color:var(--text-muted)}.pi-kpi strong{display:block;margin:10px 0 6px;color:var(--brand-navy);font-size:clamp(22px,2vw,31px);font-variant-numeric:tabular-nums}.pi-kpi small{font-size:11px;line-height:1.4}
  .pi-filters{display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(5,minmax(145px,.8fr)) auto;gap:12px;align-items:end;padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-sm)}.pi-filters label{display:grid;gap:6px;min-width:0}.pi-filters label>span{font-size:11px;font-weight:700;color:var(--text-muted)}.pi-filters input,.pi-filters select,.pi-filters button{min-height:44px}.pi-filter-actions{display:flex;gap:8px}
  .pi-card{overflow:hidden}.pi-table-wrap{max-height:68vh;overflow:auto}.pi-table{min-width:1420px;width:100%;border-collapse:separate;border-spacing:0}.pi-table thead th{position:sticky;top:0;z-index:3;background:var(--surface);box-shadow:0 1px 0 var(--border);white-space:nowrap}.pi-table tbody tr:nth-child(even){background:var(--surface-muted)}.pi-table tbody tr:hover{background:var(--brand-gold-100)}.pi-table th,.pi-table td{padding:13px 14px}.pi-table .num{text-align:right;font-variant-numeric:tabular-nums}.pi-product{min-width:220px}.pi-product strong,.pi-product small{display:block}.pi-product small,.pi-sub{margin-top:4px;color:var(--text-muted);font-size:11px}.pi-spark{width:120px;height:40px;color:var(--brand-navy)}.pi-no-chart{color:var(--text-muted);font-size:11px}
  .pi-trend{display:inline-flex;align-items:center;gap:5px;justify-content:center;min-width:88px;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:800}.pi-trend.up{background:var(--danger-soft);color:var(--pi-bad)}.pi-trend.down{background:var(--success-soft);color:var(--pi-good)}.pi-trend.flat{background:var(--surface-muted);color:var(--pi-neutral)}.pi-best{display:inline-flex;margin-top:5px;padding:3px 7px;border-radius:999px;background:var(--brand-gold-100);color:var(--brand-navy);font-size:10px;font-weight:800}.pi-mobile-list{display:none}.pi-mobile-card{padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-sm)}.pi-mobile-top{display:flex;justify-content:space-between;gap:14px}.pi-mobile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.pi-mobile-grid span{display:block;color:var(--text-muted);font-size:10px;font-weight:700;text-transform:uppercase}.pi-mobile-grid strong{display:block;margin-top:4px;font-size:13px}.pi-mobile-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .pi-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(8,25,47,.58)}.pi-modal-card{width:min(1060px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:var(--surface);box-shadow:0 24px 70px rgba(8,25,47,.3)}.pi-modal-head{position:sticky;top:0;z-index:4;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid var(--border);background:var(--surface)}.pi-modal-head h2{margin:0}.pi-modal-head p{margin:5px 0 0;color:var(--text-muted)}.pi-modal-body{display:grid;gap:18px;padding:22px}.pi-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pi-detail-stat,.pi-detail-section{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.pi-detail-stat span{display:block;color:var(--text-muted);font-size:10px;text-transform:uppercase;font-weight:700}.pi-detail-stat strong{display:block;margin-top:7px;font-size:16px}.pi-detail-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pi-detail-section h3{margin:0 0 12px}.pi-history{display:grid;gap:9px}.pi-history-row{display:grid;grid-template-columns:95px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}.pi-history-row:last-child{border-bottom:0}.pi-recommend{border-color:var(--brand-gold);background:var(--brand-gold-100)}
  @media(max-width:1250px){.pi-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.pi-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.pi-filter-actions{grid-column:span 3}.pi-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:768px){.pi-head{align-items:flex-start;flex-direction:column}.pi-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pi-filters{grid-template-columns:1fr;padding:14px}.pi-filter-actions{grid-column:auto;display:grid;grid-template-columns:1fr 1fr}.pi-table-wrap{display:none}.pi-mobile-list{display:grid;gap:10px;min-height:240px}.pi-card{border:0;background:transparent;box-shadow:none}.pi-detail-columns,.pi-detail-grid{grid-template-columns:1fr}.pi-modal{padding:0;place-items:stretch}.pi-modal-card{width:100%;max-height:100dvh;border-radius:0}.pi-modal-body{padding:16px}.pi-modal-head{padding:16px}.pi-history-row{grid-template-columns:82px minmax(0,1fr) auto}}
  @media(max-width:430px){.pi-kpis{grid-template-columns:1fr}.pi-mobile-grid{grid-template-columns:1fr 1fr}.pi-mobile-actions{grid-template-columns:1fr}}
  </style>`);
}

function detailModal(product){
  const icon=product.change>.01?'▲':product.change<-.01?'▼':'—';
  const offers=product.offers.map((offer,index)=>`<div class="pi-history-row"><span>${index===0?'Best value':'Supplier'}</span><strong>${escapeHtml(offer.supplier)}</strong><b>${money(offer.rate)}</b></div>`).join('');
  const history=product.history.slice(0,12).map(record=>`<div class="pi-history-row"><span>${escapeHtml(record.date)}</span><strong>${escapeHtml(record.supplier)}<small class="pi-sub">Bill ${escapeHtml(record.billNo)}</small></strong><b>${money(record.rate)}</b></div>`).join('');
  document.body.insertAdjacentHTML('beforeend',`<div class="pi-modal" id="piModal" role="dialog" aria-modal="true" aria-labelledby="piModalTitle"><section class="pi-modal-card"><header class="pi-modal-head"><div><h2 id="piModalTitle">${escapeHtml(product.name)}</h2><p>${escapeHtml(product.category)} · normalized per ${escapeHtml(product.unit)}</p></div><button class="btn secondary" id="piModalClose" type="button" aria-label="Close price details">Close</button></header><div class="pi-modal-body"><section class="pi-detail-grid"><article class="pi-detail-stat"><span>Current price</span><strong>${money(product.current.rate)} / ${escapeHtml(product.unit)}</strong></article><article class="pi-detail-stat"><span>Market average</span><strong>${money(product.average)}</strong></article><article class="pi-detail-stat"><span>Movement</span><strong>${icon} ${percent(product.change)}</strong></article><article class="pi-detail-stat"><span>Possible saving</span><strong>${money(product.savings)}</strong></article></section><section class="pi-detail-section pi-recommend"><h3>Recommended supplier</h3><p><strong>${escapeHtml(product.cheapest.supplier)}</strong> currently has the lowest comparable rate at <strong>${money(product.cheapest.rate)} / ${escapeHtml(product.unit)}</strong>${product.savings>0?`, saving ${money(product.savings)} against the latest purchase rate.`:'. The latest purchase is already at the best available rate.'}</p></section><section class="pi-detail-columns"><article class="pi-detail-section"><h3>Supplier ranking</h3><div class="pi-history">${offers||'<p>No supplier comparison available.</p>'}</div></article><article class="pi-detail-section"><h3>Price history</h3><div class="pi-history">${history}</div></article></section><section class="pi-detail-section"><h3>Normalized calculation</h3><p>${product.comparable?'Rates are compared using the stored normalized base-unit rate.':'This product has pack-only records, so comparisons should only be made between equivalent packs.'}</p><p>${product.history.length} purchase records · ${product.suppliers} suppliers · ${product.days} days since latest purchase · volatility ${money(product.volatility)}</p></section></div></section></div>`);
  const modal=$('#piModal');
  const close=()=>modal?.remove();
  $('#piModalClose')?.addEventListener('click',close);
  modal?.addEventListener('click',event=>{if(event.target===modal)close()});
  document.addEventListener('keydown',function escape(event){if(event.key==='Escape'){close();document.removeEventListener('keydown',escape)}},{once:true});
  $('#piModalClose')?.focus();
}

function csvEscape(value){return`"${String(value??'').replace(/"/g,'""')}"`}

export function ratesPage(){
  injectStyles();
  if(store.role!=='admin'){
    content().innerHTML='<header class="page-head"><div><h1>Price Intelligence</h1><p>Administrator-only procurement analytics.</p></div></header><section class="card"><div class="empty">You do not have permission to view this page.</div></section>';
    return;
  }

  const data=build();
  const suppliers=new Set(data.flatMap(product=>product.offers.map(offer=>offer.supplier)));
  const categories=[...new Set(data.map(product=>product.category).filter(Boolean))].sort();
  const latestDate=data[0]?.current.date||'—';
  const lowest=data.reduce((best,product)=>!best||product.cheapest.rate<best.cheapest.rate?product:best,null);
  const highestIncrease=data.reduce((best,product)=>!best||product.change>best.change?product:best,null);
  const changed=data.filter(product=>Math.abs(product.change)>.01).length;
  const totalSavings=data.reduce((sum,product)=>sum+product.savings,0);

  content().innerHTML=`<header class="page-head pi-head"><div><h1>Price Intelligence</h1><p>Normalized supplier comparison and purchase decision support from the bills already loaded.</p></div><div class="pi-head-actions"><button class="btn secondary" id="piExport" type="button"><i class="fa-solid fa-download" aria-hidden="true"></i> Export view</button></div></header>
  <section class="pi-kpis" aria-label="Price intelligence summary">
    <article class="pi-kpi"><span>Products tracked</span><strong>${data.length}</strong><small>Product and unit combinations</small></article>
    <article class="pi-kpi"><span>Vendors compared</span><strong>${suppliers.size}</strong><small>Suppliers present in loaded bills</small></article>
    <article class="pi-kpi"><span>Lowest price</span><strong>${lowest?money(lowest.cheapest.rate):'—'}</strong><small>${lowest?`${escapeHtml(lowest.name)} / ${escapeHtml(lowest.unit)}`:'No comparable records'}</small></article>
    <article class="pi-kpi"><span>Highest increase</span><strong>${highestIncrease?percent(highestIncrease.change):'—'}</strong><small>${highestIncrease?escapeHtml(highestIncrease.name):'No movement history'}</small></article>
    <article class="pi-kpi"><span>Products changed</span><strong>${changed}</strong><small>Latest rate differs from previous</small></article>
    <article class="pi-kpi"><span>Savings opportunity</span><strong>${money(totalSavings)}</strong><small>Difference from current rate to best supplier</small></article>
    <article class="pi-kpi"><span>Comparable products</span><strong>${data.filter(product=>product.comparable&&product.suppliers>1).length}</strong><small>Multiple suppliers using the same base unit</small></article>
    <article class="pi-kpi"><span>Last update</span><strong>${escapeHtml(latestDate)}</strong><small>Most recent purchase date in loaded data</small></article>
  </section>
  <section class="pi-filters" aria-label="Price intelligence filters">
    <label><span>Search product</span><input id="piSearch" type="search" placeholder="Product, vendor or unit"></label>
    <label><span>Category</span><select id="piCategory"><option value="">All categories</option>${categories.map(category=>`<option>${escapeHtml(category)}</option>`).join('')}</select></label>
    <label><span>Vendor</span><select id="piVendor"><option value="">All vendors</option>${[...suppliers].sort().map(name=>`<option>${escapeHtml(name)}</option>`).join('')}</select></label>
    <label><span>Date from</span><input id="piFrom" type="date"></label>
    <label><span>Movement</span><select id="piMovement"><option value="">All movements</option><option value="changed">Changed only</option><option value="up">Increased</option><option value="down">Decreased</option><option value="flat">No change</option></select></label>
    <label><span>Sort by</span><select id="piSort"><option value="recent">Latest purchase</option><option value="name">Product name</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option><option value="increase">Highest increase</option><option value="saving">Highest saving</option></select></label>
    <div class="pi-filter-actions"><button class="btn secondary" id="piReset" type="button">Reset</button><button class="btn" id="piApply" type="button">Apply</button></div>
  </section>
  <section class="card pi-card"><div class="pi-table-wrap"><table class="table pi-table"><thead><tr><th>Product</th><th>Vendor</th><th>Bill date</th><th>Pack size</th><th>Base unit</th><th class="num">Current price</th><th class="num">Previous</th><th class="num">Difference</th><th class="num">Change</th><th>Trend</th><th class="num">Savings</th><th>History</th><th>Actions</th></tr></thead><tbody id="piRows"></tbody></table></div><div class="pi-mobile-list" id="piMobileRows"></div><footer class="pager"><span id="piMeta"></span></footer></section>`;

  let visible=[];
  const draw=()=>{
    const query=text($('#piSearch')?.value).toLowerCase();
    const category=$('#piCategory')?.value||'';
    const selectedVendor=$('#piVendor')?.value||'';
    const from=$('#piFrom')?.value||'';
    const movement=$('#piMovement')?.value||'';
    const sort=$('#piSort')?.value||'recent';
    visible=data.filter(product=>{
      const haystack=[product.name,product.category,product.unit,...product.offers.map(offer=>offer.supplier)].join(' ').toLowerCase();
      const trend=trendClass(product.change);
      return(!query||haystack.includes(query))&&(!category||product.category===category)&&(!selectedVendor||product.offers.some(offer=>offer.supplier===selectedVendor))&&(!from||product.current.date>=from)&&(!movement||(movement==='changed'?trend!=='flat':trend===movement));
    });
    visible.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price-low'?a.current.rate-b.current.rate:sort==='price-high'?b.current.rate-a.current.rate:sort==='increase'?b.change-a.change:sort==='saving'?b.savings-a.savings:b.current.date.localeCompare(a.current.date));

    const rowHtml=product=>{
      const trend=trendClass(product.change),icon=trend==='up'?'▲':trend==='down'?'▼':'—';
      return`<tr><td class="pi-product"><strong>${escapeHtml(product.name)}</strong><small>${product.history.length} purchases · ${product.suppliers} suppliers</small></td><td><strong>${escapeHtml(product.current.supplier)}</strong>${product.current.supplier===product.cheapest.supplier?'<span class="pi-best">★ Best value</span>':''}</td><td>${escapeHtml(product.current.date)}</td><td>${escapeHtml(product.current.pack)}</td><td>${escapeHtml(product.unit)}</td><td class="num"><strong>${money(product.current.rate)}</strong></td><td class="num">${product.previous?money(product.previous.rate):'—'}</td><td class="num">${product.previous?signedMoney(product.difference):'—'}</td><td class="num">${product.previous?percent(product.change):'—'}</td><td><span class="pi-trend ${trend}">${icon} ${trend==='up'?'Higher':trend==='down'?'Lower':'No change'}</span></td><td class="num"><strong>${money(product.savings)}</strong></td><td>${sparkline(product.history)}</td><td><button class="btn secondary pi-view" type="button" data-key="${escapeHtml(product.key)}">View</button></td></tr>`;
    };
    const cardHtml=product=>{
      const trend=trendClass(product.change),icon=trend==='up'?'▲':trend==='down'?'▼':'—';
      return`<article class="pi-mobile-card"><div class="pi-mobile-top"><div class="pi-product"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.current.supplier)} · ${escapeHtml(product.current.date)}</small></div><span class="pi-trend ${trend}">${icon} ${percent(product.change)}</span></div><div class="pi-mobile-grid"><div><span>Current price</span><strong>${money(product.current.rate)} / ${escapeHtml(product.unit)}</strong></div><div><span>Market average</span><strong>${money(product.average)}</strong></div><div><span>Previous</span><strong>${product.previous?money(product.previous.rate):'—'}</strong></div><div><span>Possible saving</span><strong>${money(product.savings)}</strong></div></div><div class="pi-mobile-actions"><button class="btn secondary pi-view" type="button" data-key="${escapeHtml(product.key)}">View details</button><button class="btn pi-best-filter" type="button" data-vendor="${escapeHtml(product.cheapest.supplier)}">Best: ${escapeHtml(product.cheapest.supplier)}</button></div></article>`;
    };
    $('#piRows').innerHTML=visible.map(rowHtml).join('')||'<tr><td colspan="13" class="empty">No products match these filters.</td></tr>';
    $('#piMobileRows').innerHTML=visible.map(cardHtml).join('')||'<div class="empty">No products match these filters.</div>';
    $('#piMeta').textContent=`${visible.length} of ${data.length} tracked product rates`;
    document.querySelectorAll('.pi-view').forEach(button=>button.addEventListener('click',()=>{const product=data.find(item=>item.key===button.dataset.key);if(product)detailModal(product)}));
    document.querySelectorAll('.pi-best-filter').forEach(button=>button.addEventListener('click',()=>{$('#piVendor').value=button.dataset.vendor||'';draw()}));
  };

  ['piSearch','piCategory','piVendor','piFrom','piMovement','piSort'].forEach(id=>{
    $(`#${id}`)?.addEventListener(id==='piSearch'?'input':'change',draw);
  });
  $('#piApply')?.addEventListener('click',draw);
  $('#piReset')?.addEventListener('click',()=>{['piSearch','piCategory','piVendor','piFrom','piMovement'].forEach(id=>{$(`#${id}`).value=''});$('#piSort').value='recent';draw()});
  $('#piExport')?.addEventListener('click',()=>{
    const headings=['Product','Vendor','Bill Date','Pack Size','Base Unit','Current Price','Previous Price','Difference','Change %','Best Supplier','Savings'];
    const lines=[headings.map(csvEscape).join(','),...visible.map(product=>[product.name,product.current.supplier,product.current.date,product.current.pack,product.unit,product.current.rate,product.previous?.rate||'',product.difference,product.change,product.cheapest.supplier,product.savings].map(csvEscape).join(','))];
    const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=`price-intelligence-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();URL.revokeObjectURL(url);
  });
  draw();
}
