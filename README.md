# White Saffron Procurement ERP

Static procurement application hosted on GitHub Pages and backed by Supabase.

**Live application:** `https://naappe.github.io/Bills/`

## Active structure

```text
/
├── index.html
├── README.md
├── RELEASE-CHECKLIST.md
├── assets/
│   ├── css/
│   │   └── app-shell.css
│   └── js/
│       └── core/
│           ├── ui.js
│           ├── auth.js
│           ├── controller.js
│           └── health.js
└── .github/
    └── workflows/
        └── deploy.yml
```

The maintained application folders contain no more than five active files. Active filenames are stable and do not use patch suffixes such as `v17`, `fix`, or `final`.

## Module ownership

### `index.html`

- Application shell and navigation markup
- Supabase browser-client initialization
- Shared application state and formatting helpers
- Controlled script loading order

### `assets/js/core/auth.js`

- Login form
- Username-to-email compatibility mapping
- Role resolution
- Login/application screen visibility
- Logout action

Authentication subscriptions and session restoration are owned by the controller.

### `assets/js/core/controller.js`

- Single Supabase session restoration
- Single authentication-state subscription
- Role application
- Paginated loading of all bill records
- Duplicate-load protection
- Navigation and URL hash handling
- Database health state

### `assets/js/core/ui.js`

- Dashboard renderer
- Bills list, search, status filtering and pagination
- New/edit bill form
- Bill insert, update and administrator delete actions
- Products, vendors, price book, reports and settings renderers
- CSV export and shared display helpers

### `assets/js/core/health.js`

- Display-only database status cards
- Runtime version diagnostics
- No Supabase queries

### `assets/css/app-shell.css`

- Login screen
- Sidebar and top bar
- Shared cards, forms, tables, buttons and responsive layout

## Navigation

```text
Dashboard
Bills
Products
Vendors
Price Book
Reports
Settings
```

The controller owns navigation. All pages render into:

```html
<div id="content"></div>
```

## Roles

- `admin`: add, edit and delete bills
- `manager`: add and edit bills
- `staff`: add bills and edit records created within 24 hours when `created_at` is available
- `readonly`: view and export only

Frontend role controls are usability controls only. Supabase Row Level Security must independently enforce the same permissions.

## Data behavior

- Supabase table: `bills`
- Records load in pages of 1,000 until all accessible rows are retrieved
- `state.rows` contains the complete loaded result
- `state.filtered` contains the current Bills-page result
- Concurrent bill loads reuse one loading promise
- Bill writes detect the active schema aliases already present in loaded records, including `status` versus `payment_status` and `method` versus `payment_method`

## Pages

### Dashboard

Shows total bills, total purchasing value, vendor count, pending count and recent records.

### Bills

Provides vendor/bill-number search, status filtering, 20/50/100-row pagination, CSV export, editing and administrator deletion.

### New Bill

Creates and updates bill header records with bill date, bill number, vendor, amount, payment status and payment method.

### Products and Price Book

Derive product and rate information from saved bill `items` arrays when item-level data exists.

### Vendors

Builds a vendor summary from bill records, including bill count, total value and TIN when available.

### Reports

Shows purchasing value by status and recent monthly totals, with CSV export.

### Settings

Shows the current user, role, record count, connection state and runtime module versions. It does not expose the Supabase key.

## Deployment

GitHub Pages is deployed only through:

```text
.github/workflows/deploy.yml
```

Required repository setting:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

The deployment workflow runs on pushes to `main` and can also be started manually.

## Security

The frontend contains a Supabase publishable browser key. Never commit:

- service-role keys
- database passwords
- private API keys
- authentication tokens
- exported procurement records containing sensitive information

All read, insert, update and delete permissions must be enforced by Supabase Row Level Security.

## Production verification

After deployment:

1. Open `https://naappe.github.io/Bills/?v=5`.
2. Hard refresh.
3. Sign in as administrator.
4. Confirm the role label and loaded bill count.
5. Open every navigation page.
6. Create a test bill and verify it appears in Bills.
7. Edit the test bill.
8. Delete the test bill as administrator.
9. Test a staff or read-only account.
10. Confirm there are no failed requests or uncaught console errors.

Browser diagnostics:

```javascript
console.table({
  ui: window.__WS_CORE__?.version,
  auth: window.__WS_AUTH__?.version,
  controller: window.__WS_APP_CONTROLLER__?.version,
  health: window.__WS_RUNTIME_HEALTH__?.version,
  role: state?.role,
  user: state?.user?.email,
  rows: state?.rows?.length,
  status: window.__WS_DB_STATUS__?.status,
  message: window.__WS_DB_STATUS__?.message
});
```
