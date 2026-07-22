const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

const oldNav = `<nav class="ocean-navigation" id="oceanNavigation" aria-label="Bills navigation">\n    <button class="active" data-view="bills" type="button"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Bills</button>\n  </nav>`;
const newNav = `<nav class="ocean-navigation" id="oceanNavigation" aria-label="Bills navigation">\n    <button data-view="dashboard" type="button"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i> Overview</button>\n    <button class="active" data-view="bills" type="button"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Bills</button>\n    <button id="navAddBillBtn" data-action="add-bill" type="button"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add New Bill</button>\n  </nav>`;
if (!html.includes(oldNav)) throw new Error('Ocean navigation block not found');
html = html.replace(oldNav, newNav);

html = html.replace(
  'Clear view of every supplier bill, payment and monthly spend.',
  'Review supplier transactions, payment status, bill dates and amounts due from one clear workspace.'
);
html = html.replace('＋ Add New Bill', '+ Add New Bill');
html = html.replace('<th>Vendor</th>', '<th>Supplier</th>');
html = html.replace('<label>Bill Date<input', '<label>Bill Date<input');
html = html.replace('<label>Receipt Total (MVR)<input', '<label>Amount Due (MVR)<input');
html = html.replace('<label>Status<select', '<label>Payment Status<select');
html = html.replace('<div class="modal-head"><strong id="dialogTitle">Add Bill</strong>', '<div class="modal-head"><div><strong id="dialogTitle">Add Bill</strong><small class="dialog-subtitle">Enter supplier, bill, payment and item details. Totals are calculated automatically.</small></div>');
html = html.replace('<div class="modal-body">', '<div class="modal-body"><div class="form-section-title full"><span>1</span><div><strong>Bill details</strong><small>Supplier, date and reference information</small></div></div>', 1);
html = html.replace('<label>Status<select', '<div class="form-section-title full"><span>2</span><div><strong>Payment</strong><small>Track whether this bill is paid, pending or cancelled</small></div></div><label>Payment Status<select');
html = html.replace('<section class="bill-items-editor full"', '<div class="form-section-title full"><span>3</span><div><strong>Items and totals</strong><small>Add the purchased items and verify the final amount</small></div></div><section class="bill-items-editor full"');

const bridge = `\n<script id="vendor-flow-navigation">\n(function(){\n  const addButton=document.getElementById('navAddBillBtn');\n  if(addButton){\n    addButton.addEventListener('click',function(){\n      document.getElementById('addBillTopBtn')?.click();\n      document.getElementById('oceanNavigation')?.classList.remove('nav-open');\n      document.getElementById('mobileMenuToggle')?.setAttribute('aria-expanded','false');\n    });\n  }\n})();\n<\/script>\n`;
if (!html.includes('id="vendor-flow-navigation"')) html = html.replace('</body>', bridge + '</body>');

fs.writeFileSync(path, html, 'utf8');
