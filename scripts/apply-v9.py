from pathlib import Path
import re

p = Path('index.html')
html = p.read_text(encoding='utf-8')

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

html = re.sub(r'<link rel="stylesheet" href="assets/brand-v9\.css\?v=\d+">','<link rel="stylesheet" href="assets/brand-v9.css?v=13">',html)
if 'assets/brand-v9.css?v=13' not in html:
    html = html.replace('</head>', '<link rel="stylesheet" href="assets/brand-v9.css?v=13">\n</head>')
for asset, version in [('dashboard-v15','15'),('bills-v16','16'),('crud-v17','17'),('design-tokens','1')]:
    html = re.sub(rf'\n?<link rel="stylesheet" href="assets/{asset}\.css\?v=\d+">','',html)
    html = html.replace('</head>',f'<link rel="stylesheet" href="assets/{asset}.css?v={version}">\n</head>')

required=['dashboardView','topVendors','categoryDashboard','paymentDashboard','statusSummary']
contract='<div id="dashboardContract" hidden aria-hidden="true">'+''.join(f'<span id="{rid}"></span>' for rid in required)+'</div>'
shell=f'''<body>
{contract}
<section class="login" id="loginView">
  <div class="login-card"><div class="mark">WS</div><h1>Procurement ERP</h1><p class="muted">Bills, vendors, product prices and purchasing insight.</p><form id="loginForm" class="stack"><label>Username or email<input class="field" id="loginName" required autocomplete="username"></label><label>Password<input class="field" id="loginPassword" type="password" required autocomplete="current-password"></label><button class="btn">Sign in</button><div class="notice" id="loginNotice"></div></form></div>
</section>
<section class="app hidden" id="appView">
  <aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-badge">WS</div><div><strong>White Saffron</strong><small>Procurement ERP</small></div></div><nav class="nav"><button type="button" data-view="dashboard" class="active">▦ Dashboard</button><button type="button" data-view="bills">▤ Bills</button><button type="button" data-view="new" class="primary">＋ New Bill</button><button type="button" data-view="products">◫ Products</button><button type="button" data-view="vendors">♙ Vendors</button><button type="button" data-view="prices">↗ Price Book</button><button type="button" data-view="reports">▥ Reports</button><button type="button" data-view="settings">⚙ Settings</button></nav><div class="side-foot"><button class="btn secondary" id="logoutBtn" type="button" style="width:100%">Sign out</button></div></aside>
  <main class="main"><header class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="btn secondary mobile-menu" id="menuBtn" type="button">☰</button><div class="topbar-title" id="topTitle">Dashboard</div></div><div class="user"><div style="text-align:right"><strong id="roleLabel" style="font-size:12px">STAFF</strong><div class="muted" id="emailLabel" style="font-size:11px">Signed in</div></div><div class="avatar" id="avatar">A</div></div></header><div class="content" id="content"></div></main>
</section>
'''
script_marker='<script>\nconst SUPABASE_URL='
if script_marker not in html: raise SystemExit('Main application script marker not found; refusing destructive rewrite.')
head,rest=html.split('<body>',1)
_,script_and_tail=rest.split(script_marker,1)
html=head+shell+script_marker+script_and_tail

for asset in ['vendor-v9','performance-v12','app-v13','layout-v14','dashboard-v15','bills-v16','crud-v17','theme-settings']:
    html=re.sub(rf'\n?<script src="assets/{asset}\.js\?v=\d+"></script>','',html)
modules=(
 '<script src="assets/theme-settings.js?v=1"></script>\n'
 '<script src="assets/app-v13.js?v=13"></script>\n'
 '<script src="assets/layout-v14.js?v=14"></script>\n'
 '<script src="assets/dashboard-v15.js?v=15"></script>\n'
 '<script src="assets/bills-v16.js?v=16"></script>\n'
 '<script src="assets/crud-v17.js?v=17"></script>\n'
)
html=html.replace('</body>',modules+'</body>')
p.write_text(html,encoding='utf-8')

checks={'loginView':html.count('id="loginView"'),'appView':html.count('id="appView"'),'sidebar':html.count('id="sidebar"'),'content':html.count('id="content"'),'avatar':html.count('id="avatar"'),'master-tokens':html.count('assets/design-tokens.css?v=1'),'theme-settings':html.count('assets/theme-settings.js?v=1'),'app-v13':html.count('assets/app-v13.js?v=13'),'layout-v14':html.count('assets/layout-v14.js?v=14'),'dashboard-v15':html.count('assets/dashboard-v15.js?v=15'),'bills-v16':html.count('assets/bills-v16.js?v=16'),'crud-v17-css':html.count('assets/crud-v17.css?v=17'),'crud-v17-js':html.count('assets/crud-v17.js?v=17')}
for name,count in checks.items():
    if count!=1: raise SystemExit(f'{name} count is {count}, expected 1')
for rid in required:
    if html.count(f'id="{rid}"')!=1: raise SystemExit(f'{rid} contract count invalid')
if 'assets/vendor-v9.js' in html or 'assets/performance-v12.js' in html: raise SystemExit('Competing legacy helper script is still referenced')
print('Applied master design, current modules and normalized CRUD management.')
