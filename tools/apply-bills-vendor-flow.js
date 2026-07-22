const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

const oldNav = `<nav class="ocean-navigation" id="oceanNavigation" aria-label="Bills navigation">\n    <button class="active" data-view="bills" type="button"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Bills</button>\n  </nav>`;
const newNav = `<nav class="ocean-navigation" id="oceanNavigation" aria-label="Bills navigation">\n    <button data-view="dashboard" type="button"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i> Overview</button>\n    <button class="active" data-view="bills" type="button"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Bills</button>\n    <button id="navAddBillBtn" data-action="add-bill" type="button"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add New Bill</button>\n  </nav>`;
if (html.includes(oldNav)) html = html.replace(oldNav, newNav);
if (!html.includes('id="navAddBillBtn"')) throw new Error('Navigation could not be updated');

html = html.replace(
  'Clear view of every supplier bill, payment and monthly spend.',
  'Review supplier transactions, payment status, bill dates and amounts due from one clear workspace.'
);
html = html.replace('＋ Add New Bill', '+ Add New Bill');
html = html.replace('<th>Vendor</th>', '<th>Supplier</th>');
html = html.replace('<label>Receipt Total (MVR)<input', '<label>Amount Due (MVR)<input');

if (!html.includes('class="dialog-subtitle"')) {
  html = html.replace(
    '<div class="modal-head"><strong id="dialogTitle">Add Bill</strong>',
    '<div class="modal-head"><div><strong id="dialogTitle">Add Bill</strong><small class="dialog-subtitle">Enter supplier, bill, payment and item details. Totals are calculated automatically.</small></div>'
  );
}
if (!html.includes('>Bill details</strong>')) {
  html = html.replace(
    '<div class="modal-body">',
    '<div class="modal-body"><div class="form-section-title full"><span>1</span><div><strong>Bill details</strong><small>Supplier, date and reference information</small></div></div>',
    1
  );
}
if (!html.includes('>Payment</strong>')) {
  html = html.replace(
    '<label>Status<select class="field" name="payment_status">',
    '<div class="form-section-title full"><span>2</span><div><strong>Payment</strong><small>Track whether this bill is paid, pending or cancelled</small></div></div><label>Payment Status<select class="field" name="payment_status">'
  );
}
if (!html.includes('>Items and totals</strong>')) {
  html = html.replace(
    '<section class="bill-items-editor full"',
    '<div class="form-section-title full"><span>3</span><div><strong>Items and totals</strong><small>Add purchased items and verify the final amount</small></div></div><section class="bill-items-editor full"'
  );
}

const styles = `\n<style id="vendor-flow-style">\n.dialog-subtitle{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:500}.form-section-title{display:flex;align-items:center;gap:10px;margin:4px 0 0;padding:12px 0 8px;border-bottom:1px solid #e2e8f0}.form-section-title>span{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#e8f5f1;color:#0f766e;font-size:12px;font-weight:800}.form-section-title strong,.form-section-title small{display:block}.form-section-title strong{color:#172033;font-size:14px}.form-section-title small{margin-top:2px;color:#64748b;font-size:11px;font-weight:500}#navAddBillBtn{background:#0f766e!important;color:#fff!important;border-radius:9px!important;min-height:38px!important;margin:10px 0 10px auto!important;border-bottom:0!important}#navAddBillBtn:hover{background:#0b5f59!important;color:#fff!important}.modal-foot{position:sticky;bottom:0;background:#fff;z-index:2}@media(max-width:768px){#navAddBillBtn{margin:0!important;width:100%!important}.form-section-title{padding-top:8px}.modal-body{padding-bottom:8px!important}}\n</style>\n`;
if (!html.includes('id="vendor-flow-style"')) html = html.replace('</head>', styles + '</head>');

const bridge = `\n<script id="vendor-flow-navigation">\n(function(){\n  const addButton=document.getElementById('navAddBillBtn');\n  if(addButton){\n    addButton.addEventListener('click',function(){\n      document.getElementById('addBillTopBtn')?.click();\n      document.getElementById('oceanNavigation')?.classList.remove('nav-open');\n      document.getElementById('mobileMenuToggle')?.setAttribute('aria-expanded','false');\n    });\n  }\n})();\n<\/script>\n`;
if (!html.includes('id="vendor-flow-navigation"')) html = html.replace('</body>', bridge + '</body>');

fs.writeFileSync(path, html, 'utf8');
