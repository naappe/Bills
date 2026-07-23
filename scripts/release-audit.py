from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
SELF = Path(__file__).resolve()

REQUIRED_FILES = [
    'assets/design-tokens.css',
    'assets/theme-settings.js',
    'assets/brand-v9.css',
    'assets/app-v13.js',
    'assets/layout-v14.js',
    'assets/dashboard-v15.js',
    'assets/dashboard-v15.css',
    'assets/bills-v16.js',
    'assets/bills-v16.css',
    'assets/crud-v17.js',
    'assets/crud-v17.css',
    'assets/procurement-v18.js',
    'assets/procurement-v18.css',
    'assets/operations-v19.js',
    'assets/operations-v19.css',
    'assets/production-v20.js',
    'assets/production-v20.css',
    'assets/ux-v21.js',
    'assets/ux-v21.css',
]

REQUIRED_IDS = [
    'loginView', 'appView', 'sidebar', 'content', 'dashboardView',
    'topVendors', 'categoryDashboard', 'paymentDashboard', 'statusSummary'
]

FORBIDDEN_PATTERNS = {
    'Supabase service-role JWT': r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',
    'OpenAI secret key': r'\bsk-[A-Za-z0-9_-]{20,}\b',
    'Private key block': r'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',
}

problems = []

if not INDEX.exists():
    problems.append('index.html is missing')
else:
    html = INDEX.read_text(encoding='utf-8')
    for element_id in REQUIRED_IDS:
        count = html.count(f'id="{element_id}"')
        if count != 1:
            problems.append(f'#{element_id}: expected once, found {count}')

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.exists():
            problems.append(f'missing asset: {rel}')
        if rel not in html:
            problems.append(f'asset not referenced by index.html: {rel}')

    if html.count('<body>') != 1 or html.count('</body>') != 1:
        problems.append('index.html must contain one body element')

for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.resolve() == SELF:
        continue
    if path.suffix.lower() not in {'.html', '.js', '.css', '.py', '.md', '.yml', '.yaml', '.json'}:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    for label, pattern in FORBIDDEN_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            problems.append(f'{label} detected in {path.relative_to(ROOT)}')

if problems:
    print('FINAL RELEASE AUDIT FAILED')
    for problem in problems:
        print(f'- {problem}')
    sys.exit(1)

print('FINAL RELEASE AUDIT PASSED')
print(f'- {len(REQUIRED_FILES)} required assets present and referenced')
print(f'- {len(REQUIRED_IDS)} required application elements present once')
print('- no service-role JWT, OpenAI secret, or private-key material detected')