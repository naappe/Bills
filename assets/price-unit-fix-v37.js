(()=>{
'use strict';
const N=v=>Number(v||0),E=v=>esc(v??'');
function normalizePack(pack,selectedUnit,enteredRate){
 const text=String(pack||'').trim().toLowerCase();
 let unit=String(selectedUnit||'PCS').trim().toUpperCase();
 let quantity=1;
 let m=text.match(/^\s*([\d.]+)\s*[x×]\s*([\d.]+)\s*(kg|g|l|ml|pcs|pkt|box|ctn|doz|bag|tin|can|bottle|set|pair)?\s*$/i);
 if(m){quantity=N(m[1])*N(m[2]);if(m[3])unit=m[3].toUpperCase();}
 else{
  m=text.match(/^\s*([\d.]+)\s*(kg|g|l|ml|pcs|pkt|box|ctn|doz|bag|tin|can|bottle|set|pair)\s*$/i);
  if(m){quantity=N(m[1]);unit=m[2].toUpperCase();}
 }
 if(unit==='KG'){quantity*=1000;unit='G';}
 else if(unit==='L'){quantity*=1000;unit='ML';}
 else if(unit==='DOZ'){quantity*=12;unit='PCS';}
 quantity=quantity||1;
 return{quantity,baseUnit:unit,unitRate:N(enteredRate)/quantity};
}
window.renderPrices=async function(){
 const [itemsRes,productsRes,vendorsRes]=await Promise.all([
  db.from('bill_items').select('*,bills(vendor,bill_date,created_at)').is('deleted_at',null).order('created_at',{ascending:false}).limit(5000),
  db.from('products').select('*').is('deleted_at',null),
  db.from('vendors').select('id,name')
 ]);
 const products=new Map((productsRes.data||[]).map(p=>[p.id,p]));
 const vendors=new Map((vendorsRes.data||[]).map(v=>[v.id,v.name]));
 const groups=new Map();
 (itemsRes.data||[]).forEach(i=>{
  const name=products.get(i.product_id)?.name||i.item_name||i.description;
  if(!name)return;
  const calc=normalizePack(i.pack_format,i.unit,i.unit_rate);
  const key=i.product_id||String(name).trim().toLowerCase();
  const row={name,vendor:i.bills?.vendor||vendors.get(i.vendor_id)||'-',entered:N(i.unit_rate),selectedUnit:String(i.unit||'PCS').toUpperCase(),pack:i.pack_format||'',per:calc.unitRate,base:calc.baseUnit,totalBase:calc.quantity,date:i.bills?.bill_date||i.created_at,created:i.created_at};
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
 });
 const rows=[...groups.values()].map(list=>{list.sort((a,b)=>new Date(b.created)-new Date(a.created));const vals=list.map(x=>x.per).filter(Number.isFinite),current=list[0],previous=list[1]?.per??current.per;return{...current,previous,lowest:Math.min(...vals),highest:Math.max(...vals)}});
 const draw=()=>{
  const q=($('#v37PriceSearch')?.value||'').toLowerCase(),trend=$('#v37PriceTrend')?.value||'';
  const out=rows.filter(r=>[r.name,r.vendor,r.selectedUnit,r.base].join(' ').toLowerCase().includes(q)&&(!trend||(trend==='up'&&r.per>r.previous)||(trend==='down'&&r.per<r.previous)||(trend==='flat'&&r.per===r.previous)));
  $('#v37PriceRows').innerHTML=out.map(r=>{const diff=r.previous?((r.per-r.previous)/r.previous)*100:0;return`<tr><td><strong>${E(r.name)}</strong><div class="muted">${E(r.vendor)}</div></td><td>${E(r.pack||'1 '+r.selectedUnit)}<div class="muted">Entered rate: ${money(r.entered)}</div><div class="muted">${r.totalBase.toLocaleString()} ${E(r.base)} total</div></td><td class="v26-rate">${money(r.per)}<small>per 1 ${E(r.base)}</small></td><td>${money(r.lowest)}</td><td>${money(r.highest)}</td><td>${diff===0?'No change':`${diff>0?'▲':'▼'} ${Math.abs(diff).toFixed(1)}%`}</td><td>${new Date(r.date).toLocaleDateString('en-GB')}</td></tr>`}).join('')||'<tr><td colspan="7"><div class="ux-empty"><h3>No price history yet</h3><p>Save bill items with a selected unit, pack format and rate.</p></div></td></tr>';
 };
 $('#content').innerHTML=pageHead('Price Book','Price per base unit is calculated from the selected unit and pack format.','<button class="btn secondary" id="v37Refresh">↻ Refresh</button>')+`<section class="ux-card"><div class="ux-product-toolbar"><input class="field" id="v37PriceSearch" placeholder="Search product, vendor or unit"><select class="field" id="v37PriceTrend"><option value="">All movements</option><option value="up">Price increased</option><option value="down">Price decreased</option><option value="flat">No change</option></select><span class="ux-chip">${rows.length} tracked products</span></div><div class="table-wrap"><table><thead><tr><th>Product / Vendor</th><th>Bill pack & entered rate</th><th>Price for 1 unit</th><th>Lowest / 1</th><th>Highest / 1</th><th>Movement</th><th>Last purchase</th></tr></thead><tbody id="v37PriceRows"></tbody></table></div></section>`;
 $('#v37PriceSearch').oninput=draw;$('#v37PriceTrend').oninput=draw;$('#v37Refresh').onclick=()=>renderPrices();draw();
};
window.__WS_PRICE_UNIT_FIX__={version:37,normalizePack};
})();