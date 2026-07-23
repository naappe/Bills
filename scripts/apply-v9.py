from pathlib import Path
import re

p = Path('index.html')
html = p.read_text(encoding='utf-8')

# Remove obsolete custom theme and helper assets.
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

# Keep one final stylesheet and force browsers to fetch the repaired layout CSS.
html = re.sub(
    r'<link rel="stylesheet" href="assets/brand-v9\.css\?v=\d+">',
    '<link rel="stylesheet" href="assets/brand-v9.css?v=11">',
    html,
)
if 'assets/brand-v9.css?v=11' not in html:
    html = html.replace('</head>', '<link rel="stylesheet" href="assets/brand-v9.css?v=11">\n</head>')

# Rebuild the complete static application shell. The previous nested-div regex
# damaged everything between <body> and the main application script.
required = ['dashboardView','topVendors','categoryDashboard','paymentDashboard','statusSummary']
contract = '<div id="dashboardContract" hidden aria-hidden="true">' + ''.join(
    f'<span id="{rid}"></span>' for rid in required
) + '</div>'

shell = f'''<body>
{contract}
<section class="login" id="loginView">
  <div class="login-card">
    <div class="mark">WS</div>
    <h1>Procurement ERP</h1>
    <p class="muted">Bills, vendors, product prices and purchasing insight.</p>
    <form id="loginForm" class="stack">
      <label>Username or email<input class="field" id="loginName" required autocomplete="username"></label>
      <label>Password<input class="field" id="loginPassword" type="password" required autocomplete="current-password"></label>
      <button class="btn">Sign in</button>
      <div class="notice" id="loginNotice"></div>
    </form>
  </div>
</section>
<section class="app hidden" id="appView">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="brand-badge">WS</div><div><strong>White Saffron</strong><small>Procurement ERP</small></div></div>
    <nav class="nav">
      <button data-view="dashboard" class="active">▦ Dashboard</button>
      <button data-view="bills">▤ Bills</button>
      <button data-view="new" class="primary">＋ New Bill</button>
      <button data-view="products">◫ Products</button>
      <button data-view="vendors">♙ Vendors</button>
      <button data-view="prices">↗ Price Book</button>
      <button data-view="reports">▥ Reports</button>
      <button data-view="settings">⚙ Settings</button>
    </nav>
    <div class="side-foot"><button class="btn secondary" id="logoutBtn" style="width:100%">Sign out</button></div>
  </aside>
  <main class="main">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn secondary mobile-menu" id="menuBtn">☰</button>
        <div class="topbar-title" id="topTitle">Dashboard</div>
      </div>
      <div class="user">
        <div style="text-align:right"><strong id="roleLabel" style="font-size:12px">STAFF</strong><div class="muted" id="emailLabel" style="font-size:11px">Signed in</div></div>
        <div class="avatar" id="avatar">A</div>
      </div>
    </header>
    <div class="content" id="content"></div>
  </main>
</section>
'''

script_marker = '<script>\nconst SUPABASE_URL='
if script_marker not in html:
    raise SystemExit('Main application script marker not found; refusing destructive rewrite.')
head, rest = html.split('<body>', 1)
_, script_and_tail = rest.split(script_marker, 1)
html = head + shell + script_marker + script_and_tail

# Add vendor autofill script once.
html = re.sub(r'\n?<script src="assets/vendor-v9\.js\?v=\d+"></script>', '', html)
html = html.replace('</body>', '<script src="assets/vendor-v9.js?v=11"></script>\n</body>')

p.write_text(html, encoding='utf-8')

# Verify the shell and compatibility contract.
checks = {
    'loginView': html.count('id="loginView"'),
    'appView': html.count('id="appView"'),
    'sidebar': html.count('id="sidebar"'),
    'content': html.count('id="content"'),
    'avatar': html.count('id="avatar"'),
}
for name, count in checks.items():
    if count != 1:
        raise SystemExit(f'{name} count is {count}, expected 1')
for rid in required:
    count = html.count(f'id="{rid}"')
    if count != 1:
        raise SystemExit(f'{rid} count is {count}, expected 1')
print('Repaired application shell and applied v11 assets successfully.')
