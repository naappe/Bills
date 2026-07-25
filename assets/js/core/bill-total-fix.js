(()=>{
'use strict';
const VERSION=1;
const n=value=>Number(String(value??0).replace(/,/g,''))||0;
const cash=value=>typeof money==='function'?money(value):`MVR ${n(value).toFixed(2)}`;

function calculate(item){
 const qty=n(item?.qty);
 const entered=n(item?.rate);
 const gstPct=n(item?.gst);
 const subtotal=item?.rate_mode==='per_unit'?qty*entered:entered;
 const gst=subtotal*gstPct/100;
 return{subtotal,gst,total:subtotal+gst};
}

function values(){
 const items=Array.isArray(state?.items)?state.items:[];
 return items.reduce((sum,item)=>{
  const row=calculate(item);
  sum.subtotal+=row.subtotal;
  sum.gst+=row.gst;
  sum.total+=row.total;
  return sum;
 },{subtotal:0,gst:0,total:0});
}

function update(){
 const form=document.getElementById('billForm');
 if(!form)return;
 const total=values();
 const subtotal=form.querySelector('#billSubtotal');
 const gst=form.querySelector('#billGstTotal');
 const grand=form.querySelector('#grandTotal');
 if(subtotal)subtotal.textContent=cash(total.subtotal);
 if(gst)gst.textContent=cash(total.gst);
 if(grand)grand.textContent=cash(total.total);
}

function install(){
 const form=document.getElementById('billForm');
 if(!form||form.dataset.totalFix==='1')return;
 form.dataset.totalFix='1';
 const footer=form.querySelector('.bill-save-panel,.invoice-footer-card');
 if(!footer)return;
 let panel=footer.querySelector('.bill-total-summary,.invoice-total-due');
 if(!panel){
  panel=document.createElement('section');
  panel.className='bill-total-summary invoice-total-due';
  const note=footer.querySelector('.bill-row-save-note,.notice,.actions');
  footer.insertBefore(panel,note||footer.firstChild);
 }
 panel.innerHTML=`<div class="bill-total-row"><span>Subtotal</span><strong id="billSubtotal">MVR 0.00</strong></div><div class="bill-total-row"><span>GST total</span><strong id="billGstTotal">MVR 0.00</strong></div><div class="bill-total-row total"><span>Total due</span><strong id="grandTotal">MVR 0.00</strong></div>`;
 const refresh=()=>requestAnimationFrame(update);
 form.addEventListener('input',refresh);
 form.addEventListener('change',refresh);
 form.addEventListener('click',event=>{if(event.target.closest('#addRow,[data-remove]'))setTimeout(update,0)});
 update();
}

const original=window.renderNewBill;
if(typeof original==='function'){
 window.renderNewBill=async function(...args){
  const result=await original.apply(this,args);
  install();
  return result;
 };
 if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.new=window.renderNewBill;
}

console.info('[bill-total-fix] v1 ready');
})();