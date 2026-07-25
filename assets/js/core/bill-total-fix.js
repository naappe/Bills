(()=>{
'use strict';
const VERSION=2;
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

function installStyles(){
 let style=document.getElementById('wsBillTotalFixStyles');
 if(!style){style=document.createElement('style');style.id='wsBillTotalFixStyles';document.head.appendChild(style)}
 style.textContent=`
 #billForm .bill-save-panel,#billForm .invoice-footer-card{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(320px,420px)!important;
  gap:18px!important;
  padding:18px!important;
  align-items:start!important;
 }
 #billForm .bill-save-panel>label,#billForm .invoice-footer-card>label{
  grid-column:1!important;
  grid-row:1/5!important;
 }
 #billForm .bill-save-panel textarea,#billForm .invoice-footer-card textarea{
  min-height:88px!important;
  max-height:140px!important;
  resize:vertical!important;
 }
 #billForm .ws-live-bill-totals{
  display:block!important;
  grid-column:2!important;
  grid-row:1!important;
  border:1px solid #dfe7e2!important;
  border-radius:12px!important;
  background:#fff!important;
  overflow:hidden!important;
 }
 #billForm .ws-live-bill-totals .bill-total-row{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:16px!important;
  padding:10px 14px!important;
  border-bottom:1px solid #e5ebe7!important;
  color:#657487!important;
  font-size:13px!important;
 }
 #billForm .ws-live-bill-totals .bill-total-row strong{
  color:#0f1e4c!important;
  font-size:14px!important;
 }
 #billForm .ws-live-bill-totals .bill-total-row.total{
  padding:13px 14px!important;
  border-bottom:0!important;
  background:#fff8e5!important;
  color:#0f1e4c!important;
  font-weight:800!important;
 }
 #billForm .ws-live-bill-totals .bill-total-row.total strong{
  font-size:21px!important;
 }
 #billForm .bill-row-save-note{
  grid-column:2!important;
  margin:0!important;
  font-size:11px!important;
  line-height:1.4!important;
 }
 #billForm .bill-save-panel .notice,#billForm .invoice-footer-card .notice{
  grid-column:2!important;
  min-height:16px!important;
  margin:0!important;
 }
 #billForm .bill-save-panel>.actions,#billForm .invoice-footer-card>.actions{
  grid-column:2!important;
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:10px!important;
  margin:0!important;
 }
 #billForm .bill-save-panel>.actions .btn,#billForm .invoice-footer-card>.actions .btn{
  min-height:40px!important;
 }
 #billForm #itemRows [data-row]>.form-grid,#billForm #itemRows [data-row]>.invoice-line-grid{
  padding-top:10px!important;
  padding-bottom:10px!important;
 }
 #billForm .invoice-line-row:before{
  top:15px!important;
 }
 #billForm .invoice-line-actions{
  top:13px!important;
 }
 @media(max-width:760px){
  #billForm .bill-save-panel,#billForm .invoice-footer-card{grid-template-columns:1fr!important;padding:14px!important}
  #billForm .bill-save-panel>label,#billForm .invoice-footer-card>label,
  #billForm .ws-live-bill-totals,#billForm .bill-row-save-note,
  #billForm .bill-save-panel .notice,#billForm .invoice-footer-card .notice,
  #billForm .bill-save-panel>.actions,#billForm .invoice-footer-card>.actions{
   grid-column:1!important;grid-row:auto!important
  }
 }
 `;
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
 if(!form||form.dataset.totalFix==='2')return;
 form.dataset.totalFix='2';
 installStyles();
 const footer=form.querySelector('.bill-save-panel,.invoice-footer-card');
 if(!footer)return;
 footer.querySelectorAll('.bill-total-summary,.invoice-total-due,.ws-live-bill-totals').forEach(node=>node.remove());
 const panel=document.createElement('section');
 panel.className='ws-live-bill-totals';
 panel.setAttribute('aria-label','Live bill totals');
 panel.innerHTML=`<div class="bill-total-row"><span>Subtotal</span><strong id="billSubtotal">MVR 0.00</strong></div><div class="bill-total-row"><span>GST total</span><strong id="billGstTotal">MVR 0.00</strong></div><div class="bill-total-row total"><span>Total due</span><strong id="grandTotal">MVR 0.00</strong></div>`;
 const note=footer.querySelector('.bill-row-save-note,.notice,.actions');
 footer.insertBefore(panel,note||footer.firstChild);
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

console.info('[bill-total-fix] v2 ready');
})();