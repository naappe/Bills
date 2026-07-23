from pathlib import Path
import re

p = Path('index.html')
html = p.read_text(encoding='utf-8')

# Remove old custom theme and helper assets.
patterns = [
    r'\n?<link rel="stylesheet" href="brand-v5\.css\?v=5">',
    r'\n?<link rel="stylesheet" href="brand-v6\.css\?v=6">',
    r'\n?<link rel="stylesheet" href="modern-v5\.css\?v=5">',
    r'\n?<link rel="stylesheet" href="assets/brand-v6\.css\?v=6">',
    r'\n?<link rel="stylesheet" href="assets/brand-v7\.css\?v=7">',
    r'\n?<link rel="stylesheet" href="assets/brand-v8\.css\?v=8">',
    r'\n?<script src="brand-v6\.js\?v=6"></script>',
    r'\n?<script src="assets/input-fix-v6\.js\?v=6"></script>',
    r'\n?<script src="assets/vendor-v8\.js\?v=8"></script>',
]
for pattern in patterns:
    html = re.sub(pattern, '', html)

# Add one final stylesheet.
if 'assets/brand-v9.css?v=9' not in html:
    html = html.replace('</head>', '<link rel="stylesheet" href="assets/brand-v9.css?v=9">\n</head>')

# Add vendor autofill script.
if 'assets/vendor-v9.js?v=9' not in html:
    html = html.replace('</body>', '<script src="assets/vendor-v9.js?v=9"></script>\n</body>')

# Add dashboard contract IDs exactly once. These are hidden compatibility anchors.
required = ['dashboardView','topVendors','categoryDashboard','paymentDashboard','statusSummary']
for rid in required:
    html = re.sub(rf'\s*<[^>]+id="{rid}"[^>]*>.*?</[^>]+>', '', html, flags=re.S)
contract = '<div id="dashboardContract" hidden aria-hidden="true">' + ''.join(f'<div id="{rid}"></div>' for rid in required) + '</div>'
if 'id="dashboardContract"' in html:
    html = re.sub(r'<div id="dashboardContract".*?</div>\s*</div>', contract, html, flags=re.S)
else:
    html = html.replace('<body>', '<body>\n' + contract)

p.write_text(html, encoding='utf-8')

# Verify contract.
for rid in required:
    count = html.count(f'id="{rid}"')
    if count != 1:
        raise SystemExit(f'{rid} count is {count}, expected 1')
print('Applied v9 and dashboard contract successfully.')
