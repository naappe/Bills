import {store,money,escapeHtml,text,number,billDate,vendor,itemsOf,productName,lineTotal,get,itemCategory,amount} from './store.js';

const $=selector=>document.querySelector(selector);
const content=()=>$('#content');
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');
const monthStart=()=>{const value=new Date();return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-01`};

function itemCost(item){
  const saved=lineTotal(item);
  if(saved>0)return saved;
  return number(get(item,'qty','quantity'))*number(get(item,'pack_rate','rate','price'));
}

function buildRows(){
  const rows=[];
  for(const bill of store.rows){
    const date=billDate(bill);
    if(!validDate(date))continue;
    const entries=itemsOf(bill);
    if(!entries.length){
      rows.push({date,product:'Unspecified item',supplier:vendor(bill),category:text(get(bill,'category'))||'Other',quantity:1,unit:'BILL',pack:'—',cost:amount(bill),billId:text(get(bill,'id'))});
      continue;
    }
    for(const item of entries){
      const cost=itemCost(item);
      if(cost<=0)continue;
      rows.push({
        date,
        product:productName(item,bill),
        supplier:vendor(bill),
        category:itemCategory(item,bill),
        quantity:number(get(item,'qty','quantity'))||1,
        unit:text(get(item,'unit')).toUpperCase()||'PCS',
        pack:text(get(item,'pack_format','packing'))||'—',
        cost,
        billId:text(get(bill,'id'))
      });
    }
  }
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||a.product.localeCompare(b.product));
}

function groupByProduct(rows){
  const grouped=new Map();
  for(const row of rows){
    const key=row.product.toLowerCase();
    if(!grouped.has(key))grouped.set(key,{name:row.product,total:0,purchases:0,vendors:new Set(),latest:row});
    const product=grouped.get(key);
    product.total+=row.cost;
    product.purchases++;
    product.vendors.add(row.supplier);
    if(row.date>product.latest.date)product.latest=row;
  }
  return [...grouped.values()].sort((a,b)=>b.total-a.total);
}

function csvEscape(value){return `"${String(value??'').replace(/"/g,'""')}"`}

export function costPage(){
  if(store.role!=='admin'){
    content().innerHTML='<header class="page-head"><div><h1>Cost</h1><p>Administrator-only purchase cost control.</p></div></header><section class="card"><div class="empty">You do not have permission to view this page.</div></section>';
    return;
  }

  const source=buildRows();
  const vendors=[...new Set(source.map(row=>row.supplier))].sort();
  const categories=[...new Set(source.map(row=>row.category))].sort();

  content().innerHTML=`<header class="page-head cost-head"><div><h1>Cost</h1><p>Review current purchase costs by product, vendor and period.</p></div><button class="btn secondary" id="costExport" type="button"><i class="fa-solid fa-download" aria-hidden="true"></i> Export CSV</button></header>
  <section class="cost-summary" aria-label="Cost summary">
    <article><span>Total cost</span><strong id="costTotal">MVR 0.00</strong><small>Filtered purchase value</small></article>
    <article><span>Products</span><strong id="costProducts">0</strong><small>Products in this view</small></article>
    <article><span>Vendors</span><strong id="costVendors">0</strong><small>Suppliers in this view</small></article>
    <article><span>Purchases</span><strong id="costPurchases">0</strong><small>Recorded item lines</small></article>
  </section>
  <section class="cost-filters" aria-label="Cost filters">
    <label><span>Search</span><input id="costSearch" type="search" placeholder="Product or vendor"></label>
    <label><span>Vendor</span><select id="costVendor"><option value="">All vendors</option>${vendors.map(name=>`<option>${escapeHtml(name)}</option>`).join('')}</select></label>
    <label><span>Category</span><select id="costCategory"><option value="">All categories</option>${categories.map(name=>`<option>${escapeHtml(name)}</option>`).join('')}</select></label>
    <label><span>From</span><input id="costFrom" type="date" value="${monthStart()}"></label>
    <label><span>To</span><input id="costTo" type="date"></label>
    <button class="btn secondary" id="costReset" type="button">Reset</button>
  </section>
  <section class="card cost-card">
    <header class="card-head"><div><h2>Product costs</h2><small>Latest recorded cost and total purchasing value</small></div></header>
    <div class="table-wrap"><table class="table cost-table"><thead><tr><th>Product</th><th>Latest vendor</th><th>Latest date</th><th>Pack</th><th class="num">Latest cost</th><th class="num">Purchases</th><th class="num">Total cost</th></tr></thead><tbody id="costRows"></tbody></table></div>
    <div class="cost-mobile" id="costMobile"></div>
    <footer class="pager"><span id="costMeta"></span></footer>
  </section>`;

  let visible=[];
  const draw=()=>{
    const query=text($('#costSearch').value).toLowerCase();
    const selectedVendor=$('#costVendor').value;
    const selectedCategory=$('#costCategory').value;
    const from=$('#costFrom').value;
    const to=$('#costTo').value;
    const filtered=source.filter(row=>(!query||`${row.product} ${row.supplier}`.toLowerCase().includes(query))&&(!selectedVendor||row.supplier===selectedVendor)&&(!selectedCategory||row.category===selectedCategory)&&(!from||row.date>=from)&&(!to||row.date<=to));
    visible=groupByProduct(filtered);
    const total=filtered.reduce((sum,row)=>sum+row.cost,0);
    $('#costTotal').textContent=money(total);
    $('#costProducts').textContent=visible.length.toLocaleString();
    $('#costVendors').textContent=new Set(filtered.map(row=>row.supplier)).size.toLocaleString();
    $('#costPurchases').textContent=filtered.length.toLocaleString();
    $('#costRows').innerHTML=visible.map(product=>`<tr><td><strong>${escapeHtml(product.name)}</strong><small class="cell-meta">${product.vendors.size} vendor${product.vendors.size===1?'':'s'}</small></td><td>${escapeHtml(product.latest.supplier)}</td><td>${escapeHtml(product.latest.date)}</td><td>${escapeHtml(product.latest.pack)} · ${escapeHtml(product.latest.unit)}</td><td class="num"><strong>${money(product.latest.cost)}</strong></td><td class="num">${product.purchases}</td><td class="num"><strong>${money(product.total)}</strong></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No costs match these filters.</td></tr>';
    $('#costMobile').innerHTML=visible.map(product=>`<article><div><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.latest.supplier)} · ${escapeHtml(product.latest.date)}</span></div><dl><div><dt>Latest</dt><dd>${money(product.latest.cost)}</dd></div><div><dt>Total</dt><dd>${money(product.total)}</dd></div><div><dt>Purchases</dt><dd>${product.purchases}</dd></div><div><dt>Pack</dt><dd>${escapeHtml(product.latest.pack)}</dd></div></dl></article>`).join('')||'<div class="empty">No costs match these filters.</div>';
    $('#costMeta').textContent=`${visible.length} products · ${filtered.length} purchases · ${money(total)}`;
  };

  ['costSearch','costVendor','costCategory','costFrom','costTo'].forEach(id=>$(`#${id}`).addEventListener(id==='costSearch'?'input':'change',draw));
  $('#costReset').onclick=()=>{$('#costSearch').value='';$('#costVendor').value='';$('#costCategory').value='';$('#costFrom').value=monthStart();$('#costTo').value='';draw()};
  $('#costExport').onclick=()=>{
    const lines=[['Product','Latest vendor','Latest date','Pack','Latest cost','Purchases','Total cost'],...visible.map(product=>[product.name,product.latest.supplier,product.latest.date,`${product.latest.pack} ${product.latest.unit}`,product.latest.cost,product.purchases,product.total])];
    const blob=new Blob([lines.map(line=>line.map(csvEscape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`white-saffron-cost-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);
  };
  draw();
}
