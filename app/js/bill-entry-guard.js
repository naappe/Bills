import {money,number,text} from './store.js';

const units=['BTL','ML','L','KG','G','PCS','CTN','DOZ','PKT'];
const field=(row,name)=>row.querySelector(`[data-field="${name}"]`);

function rowMarkup(){
  return `<div class="bill-row" data-dynamic-row="1"><label class="item-name">Product<input data-field="description" list="productSuggestions" autocomplete="off" required placeholder="Start typing product name"><small data-product-hint class="cell-meta">New product — it will be saved for this vendor.</small></label><label>Pack format<input data-field="pack" placeholder="24x330 ml"></label><label>Unit<select data-field="unit">${units.map(unit=>`<option>${unit}</option>`).join('')}</select></label><label>Qty<input data-field="qty" type="number" min="0.001" step="any" value="1"></label><label>Pack rate<input data-field="rate" type="number" min="0" step="any" placeholder="MVR"></label><label>GST %<input data-field="gst" type="number" min="0" step="any" value="0"></label><div class="rate-preview"><span data-base>—</span><small data-rates>Enter pack details</small></div><button class="btn danger small remove-row" data-remove type="button" aria-label="Remove item row">×</button></div>`;
}

function parsePack(pack,unit,qty=1){
  const value=text(pack).toLowerCase().replace(/[×*]/g,'x').replace(/\s+/g,'');
  let count=1,size=1,kind=text(unit).toUpperCase()||'PCS';
  const multi=value.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt)$/);
  const single=value.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml|pcs?|btl|pkt)$/);
  if(multi){count=number(multi[1]);size=number(multi[2]);kind=multi[3].toUpperCase()}
  else if(single){size=number(single[1]);kind=single[2].toUpperCase()}
  let base=count*size*number(qty||1);
  if(kind==='KG'||kind==='L')base*=1000;
  return {base,baseUnit:['KG','G'].includes(kind)?'G':['L','ML'].includes(kind)?'ML':'PCS'};
}

function recalculate(form){
  if(!form?.isConnected)return;
  let subtotal=0,gstTotal=0;
  form.querySelectorAll('.bill-row').forEach(row=>{
    const qty=number(field(row,'qty')?.value),rate=number(field(row,'rate')?.value),gst=number(field(row,'gst')?.value);
    const line=qty*rate,parsed=parsePack(field(row,'pack')?.value,field(row,'unit')?.value,qty),small=parsed.base?line/parsed.base:0,large=['G','ML'].includes(parsed.baseUnit)?small*1000:small;
    subtotal+=line;gstTotal+=line*gst/100;
    const base=row.querySelector('[data-base]'),rates=row.querySelector('[data-rates]');
    if(base)base.textContent=parsed.base?`${parsed.base.toLocaleString('en-US')} ${parsed.baseUnit}`:'—';
    if(rates){const smallText=parsed.base?`${money(small)} / ${parsed.baseUnit}`:'No base rate',largeUnit=parsed.baseUnit==='G'?'KG':parsed.baseUnit==='ML'?'L':'PCS';rates.textContent=`${smallText} · ${money(large)} / ${largeUnit} · Line ${money(line)}`}
  });
  const subtotalNode=form.querySelector('#subtotal'),gstNode=form.querySelector('#gstTotal'),grandNode=form.querySelector('#grandTotal');
  if(subtotalNode)subtotalNode.textContent=money(subtotal);
  if(gstNode)gstNode.textContent=money(gstTotal);
  if(grandNode)grandNode.textContent=money(subtotal+gstTotal);
}

function addRow(form){
  const container=form.querySelector('#billItems');
  if(!container)return;
  container.insertAdjacentHTML('beforeend',rowMarkup());
  const row=container.lastElementChild;
  recalculate(form);
  row?.querySelector('[data-field="description"]')?.focus({preventScroll:true});
  row?.scrollIntoView({behavior:'smooth',block:'nearest'});
}

document.addEventListener('click',event=>{
  const add=event.target.closest('#addRow');
  if(add){
    const form=add.closest('#billForm');
    if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();
    addRow(form);return;
  }
  const remove=event.target.closest('#billForm [data-remove]');
  if(remove){
    const form=remove.closest('#billForm'),rows=form?.querySelectorAll('.bill-row');
    if(!form||!rows?.length)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(rows.length===1){
      rows[0].querySelectorAll('input').forEach(input=>input.value=input.dataset.field==='qty'?'1':input.dataset.field==='gst'?'0':'');
    }else remove.closest('.bill-row')?.remove();
    recalculate(form);
  }
},true);

document.addEventListener('input',event=>{
  const form=event.target.closest?.('#billForm');
  if(form&&event.target.closest('.bill-row'))recalculate(form);
},true);

document.addEventListener('change',event=>{
  const form=event.target.closest?.('#billForm');
  if(form&&event.target.closest('.bill-row'))recalculate(form);
},true);

new MutationObserver(()=>{
  const form=document.querySelector('#billForm');
  if(form&&!form.dataset.guardReady){form.dataset.guardReady='1';recalculate(form)}
}).observe(document.documentElement,{childList:true,subtree:true});
