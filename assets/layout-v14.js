(()=>{
'use strict';

const style=document.createElement('style');
style.id='layout-v14-styles';
style.textContent=`
  .bill-workspace{display:grid;gap:16px}
  .bill-info-section{width:100%}
  .bill-lower-grid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:16px;align-items:start}
  .bill-lower-grid .summary{margin-top:0!important;position:sticky!important;top:86px!important;padding:18px!important;min-height:0!important}
  .bill-lower-grid .summary h3{margin:0 0 12px!important;font-size:18px!important}
  .bill-lower-grid .sum-row{padding:8px 0!important}
  .bill-info-grid{display:grid!important;grid-template-columns:minmax(260px,1.35fr) minmax(150px,.8fr) minmax(150px,.8fr) 150px!important;gap:12px!important;padding:18px!important;align-items:start!important}
  .bill-info-grid .vendor-field{grid-column:span 1!important}
  .bill-info-grid .notes-field{grid-column:span 1!important;max-width:none!important}
  .bill-info-grid [name="bill_no"]{width:150px!important;max-width:150px!important}
  .bill-info-grid [name="notes"]{min-height:42px!important;height:42px!important;max-height:58px!important}
  .bill-info-grid label{font-size:13px!important;font-weight:700!important;color:#243a58!important}
  .bill-info-grid .field{font-size:14px!important}
  .section-title,.card-head strong{font-size:17px!important}
  .page-head h1{font-size:27px!important}
  .items-table{table-layout:fixed!important;min-width:760px!important}
  .items-table th:nth-child(1){width:30%}
  .items-table th:nth-child(2){width:12%}
  .items-table th:nth-child(3){width:12%}
  .items-table th:nth-child(4){width:18%}
  .items-table th:nth-child(5){width:14%}
  .items-table th:nth-child(6){width:14%}
  .items-table td,.items-table th{padding:11px 12px!important}
  .advanced-vendor{position:relative!important}
  .vendor-dropdown{position:absolute!important;z-index:1000!important;left:0!important;right:0!important;top:calc(100% + 6px)!important;max-height:290px!important;overflow:auto!important;background:#fff!important;border:1px solid #bdd4f2!important;border-radius:10px!important;box-shadow:0 16px 36px rgba(16,35,63,.16)!important;padding:6px!important}
  .vendor-option{width:100%!important;border:0!important;background:#fff!important;text-align:left!important;padding:10px 11px!important;border-radius:7px!important;display:grid!important;gap:3px!important;color:#10233f!important}
  .vendor-option:hover,.vendor-option.active{background:#eaf3ff!important}
  .vendor-option strong{font-size:13px!important}
  .vendor-option span{font-size:11px!important;color:#60708a!important}
  .vendor-empty{padding:12px!important;font-size:12px!important;color:#60708a!important}
  @media(max-width:1180px){.bill-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.bill-info-grid [name="bill_no"]{width:100%!important;max-width:none!important}}
  @media(max-width:980px){.bill-lower-grid{grid-template-columns:1fr!important}.bill-lower-grid .summary{position:static!important}.bill-info-grid{grid-template-columns:1fr 1fr!important}}
  @media(max-width:620px){.bill-info-grid{grid-template-columns:1fr!important}.bill-lower-grid{grid-template-columns:1fr!important}}
`;
document.head.appendChild(style);

window.renderNewBill=function(){
  if(!state.items.length)state.items=[freshItem()];
  const r=state.editing||{};
  const vendorOptions=aggregateVendors(state.rows).map(v=>`<option value="${esc(v.name)}"></option>`).join('');
  $('#content').innerHTML=pageHead(
    state.editing?'Edit bill':'New bill',
    'Enter bill information and purchased items in one organised workspace.',
    '<button class="btn secondary" data-go="bills" type="button">Back to Bills</button>'
  )+`<form id="billForm" class="bill-workspace">
    <section class="section bill-info-section">
      <div class="section-title">Bill information</div>
      <div class="bill-info-grid">
        <label class="vendor-field">Vendor
          <div class="vendor-row"><div>
            <input class="field" name="vendor" id="vendorInput" list="vendorOptions" required value="${esc(vendorVal(r))}" placeholder="Search saved vendor by name, TIN, phone or location">
            <div class="vendor-help">Select a saved vendor to fill TIN and location automatically.</div>
          </div><button class="btn secondary" type="button" id="clearVendor">New vendor</button></div>
          <datalist id="vendorOptions">${vendorOptions}</datalist>
        </label>
        <label>Bill date<input class="field" name="bill_date" type="date" required value="${esc(toDateInput(dateVal(r))||today())}"></label>
        <label>Due date<input class="field" name="due_date" type="date" value="${esc(toDateInput(get(r,'due_date','Due Date')))}"></label>
        <label>Bill number<input class="field" name="bill_no" value="${esc(get(r,'bill_no','Bill No'))}" placeholder="Bill no."></label>
        <label>TIN<input class="field" name="tin" value="${esc(get(r,'tin','TIN'))}"></label>
        <label>Location<input class="field" name="location" value="${esc(get(r,'location','Location'))}"></label>
        <label>Status<select class="field" name="payment_status">${['Pending','Paid','Cancelled'].map(x=>`<option ${statusVal(r)===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Payment method<select class="field" name="payment_method">${['','Cash','Bank Transfer','Card','Credit','Other'].map(x=>`<option ${get(r,'payment_method','Payment Method')===x?'selected':''}>${x||'Not set'}</option>`).join('')}</select></label>
        <label>Category<select class="field" name="category">${['Food & Grocery','Packaging','Utilities','Maintenance','Transport','Office','Other'].map(x=>`<option ${get(r,'category','Category')===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label class="notes-field">Notes<textarea class="field" name="notes" placeholder="Optional notes">${esc(get(r,'notes','Notes'))}</textarea></label>
      </div>
    </section>
    <div class="bill-lower-grid">
      <section class="section">
        <div class="card-head"><strong>Bill items</strong><button class="btn secondary small" type="button" id="addItem">＋ Add row</button></div>
        <div class="table-wrap"><table class="items-table"><thead><tr><th>Product / description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>GST %</th><th>Total</th><th></th></tr></thead><tbody id="itemRows"></tbody></table></div>
      </section>
      <aside class="summary">
        <h3>Bill summary</h3>
        <div class="sum-row"><span>Items</span><strong id="sumItems">0</strong></div>
        <div class="sum-row"><span>Subtotal</span><strong id="sumSubtotal">MVR 0.00</strong></div>
        <div class="sum-row"><span>GST</span><strong id="sumGst">MVR 0.00</strong></div>
        <div class="sum-row grand"><span>Grand total</span><strong id="sumGrand">MVR 0.00</strong></div>
        <button class="btn" type="submit">${state.editing?'Update Bill':'Save Bill'}</button>
        <div id="saveNotice" style="margin-top:10px;font-size:12px;color:#d9edff"></div>
      </aside>
    </div>
  </form>`;
  bindGo();
  renderItemRows();
  $('#addItem').onclick=()=>{state.items.push(freshItem());renderItemRows()};
  $('#clearVendor').onclick=()=>{const input=$('#vendorInput');input.value='';const form=input.closest('form');form.querySelector('[name="tin"]').value='';form.querySelector('[name="location"]').value='';input.focus()};
  $('#billForm').onsubmit=saveBill;
};
})();