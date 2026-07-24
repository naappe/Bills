# White Saffron Procurement ERP

A static procurement application hosted on GitHub Pages and backed by Supabase.

**Live application:** `https://naappe.github.io/Bills/`

## System purpose

The application manages:

- procurement bills and multi-row bill entry;
- vendors and vendor details;
- products, categories, units and pack formats;
- purchase rates and derived KG, G, L, ML and PCS rates;
- dashboards, filters, reports and CSV exports;
- authenticated roles and administrative actions.

## Architecture rules

### 1. Maximum five files per folder

Every maintained application folder should contain no more than five active files. When a section grows beyond five files, create a clearly named subfolder instead of adding another versioned patch file.

### 2. No version numbers in active filenames

Use stable names such as `controller.js`, `bills.js` and `components.css`.

Do not create new files such as:

```text
bills-v17.js
bills-fix-v34.js
bills-final-v35.js
```

Git already provides version history.

### 3. One owner per responsibility

- Authentication is owned by one module.
- Supabase loading is owned by one controller.
- Routing is owned by one router/controller.
- A page renderer must render only its own page.
- Health modules display state but do not query the database.

### 4. Supabase is the data source

The bill records must not be committed as `bills.json`, `data.js` or multiple static data chunks.

Supabase remains the source of truth for bills, vendors and operational records. Static JSON files may only contain non-sensitive application configuration or fixed reference values.

## Maintained structure

```text
/
├── index.html                 Application shell and script loading order
├── README.md                  Architecture and maintenance guide
├── theme-v4.css               Temporary legacy theme entry
├── RELEASE-CHECKLIST.md       Production verification checklist
└── assets/                    Application code and styles

assets/
├── css/
│   └── app-shell.css          Global shell, layout and shared controls
└── js/
    └── core/
        ├── ui.js              Shared UI helpers and basic render utilities
        ├── auth.js            Login form, session view and role resolution
        ├── controller.js      Startup, Supabase loading, state and navigation
        └── health.js          Database status display and diagnostics
```

The active core folder currently contains four files, within the five-file limit.

## Core section responsibilities

### `index.html`

Job:

- defines the login and application shell;
- loads external libraries;
- creates the Supabase client and shared application state;
- loads modules in a controlled order;
- contains no bill-query ownership.

Check this file when:

- a script or stylesheet is not loading;
- GitHub Pages serves an old asset;
- the login or sidebar shell is missing;
- startup order is incorrect.

### `assets/css/app-shell.css`

Job:

- page frame and viewport sizing;
- sidebar and top bar;
- login screen;
- shared buttons, cards, fields and tables;
- responsive application shell.

Check this file when:

- the application exceeds the viewport;
- the sidebar, header or login page is misaligned;
- shared spacing or typography is inconsistent.

### `assets/js/core/ui.js`

Job:

- shared value helpers;
- money and date presentation helpers;
- bill-table pagination rendering;
- common page navigation helpers;
- CSV export utility;
- basic authenticated-view rendering.

Check this file when:

- bill table rows render incorrectly;
- pagination is wrong;
- shared formatting is wrong;
- page render dispatch fails.

This file does not own authentication subscriptions or Supabase bill loading.

### `assets/js/core/auth.js`

Job:

- login-form submission;
- username-to-email mapping;
- role resolution;
- showing either the login screen or application screen.

Check this file when:

- sign-in fails after Supabase returns a response;
- the application displays STAFF instead of ADMIN;
- the login screen does not hide after authentication.

This file does not start a second bill query.

### `assets/js/core/controller.js`

Job:

- restores the current Supabase session;
- owns the single authentication-state subscription;
- loads all bills in controlled pages;
- stores records in `state.rows` and `state.filtered`;
- updates database health state;
- owns navigation and reload operations;
- prevents duplicate simultaneous loading through one loading promise.

Check this file when:

- the database remains on `Connecting…`;
- authenticated users receive zero rows;
- manual reload does not work;
- navigation or startup is stuck.

This is the only core file permitted to own bill loading.

### `assets/js/core/health.js`

Job:

- displays connection state;
- displays loaded-record count;
- exposes browser diagnostics through `checkAppVersions()`.

Check this file when:

- health cards display the wrong state;
- diagnostic versions are not visible.

This file must never call Supabase.

## Feature sections

The remaining legacy feature files are temporarily loaded from `assets/`. They are being consolidated into the following structure, with no more than five files per folder:

```text
assets/js/
├── core/                      Authentication, startup and shared state
├── bills/                     Bill list, bill entry, calculations and actions
├── catalog/                   Products, vendors, categories and price book
├── dashboard/                 Dashboard, reports and analytics
└── admin/                     Settings, users, archive and recovery

assets/css/
├── core/                      Tokens, reset, shell and responsive rules
├── bills/                     Bill list and bill-entry styling
├── catalog/                   Product, vendor and price-book styling
├── dashboard/                 Dashboard and report styling
└── admin/                     Settings and administrative styling
```

### Planned JavaScript files

#### `assets/js/bills/`

```text
bills.js          Bill list, filters and pagination
entry.js          New/edit bill form and row management
pricing.js        Pack parsing and unit-rate calculations
actions.js        Save, edit, delete, archive and restore
validation.js     Input validation and user-facing errors
```

#### `assets/js/catalog/`

```text
products.js       Product list and product maintenance
vendors.js        Vendor list, TIN and contact information
prices.js         Price book and rate history
categories.js     Category and unit reference logic
catalog-utils.js  Shared catalog helpers
```

#### `assets/js/dashboard/`

```text
dashboard.js      KPIs and overview cards
reports.js        Report preparation and export actions
filters.js        Date, vendor and status filtering
charts.js         Chart data and visual rendering
analytics.js      Aggregations and purchasing insights
```

#### `assets/js/admin/`

```text
settings.js       Company and application settings
users.js          User and role administration
archive.js        Archive, recovery and reset operations
audit.js          Operational diagnostics and audit display
admin-utils.js    Shared administrative helpers
```

## Bill-entry business rules

Allowed purchase units:

```text
PCS, PKT, DOZ, CTN, BTL, KG, G, L, ML
```

Pack-format examples:

```text
24x500g
12x1L
6x2kg
48 PCS
20x330ml
```

Pricing output:

- PCS: rate per PCS;
- KG: rate per KG and rate per G;
- L: rate per L and rate per ML;
- CTN, PKT, DOZ and BTL: purchase-unit rate plus derived base-unit rate.

Bill-entry fields:

```text
Product
Quantity
Purchase Unit
Pack Format
Rate or Net Amount
GST
```

Do not reintroduce:

- Invoice Rate selector;
- Inner Item selector;
- duplicate pricing cards;
- duplicate rate-per-piece displays.

## Application state

The shared browser state currently contains:

```text
user        Authenticated Supabase user
role        admin, manager, staff or readonly
rows        Complete loaded bill records
filtered    Current filtered bill records
view        Current page
page        Current table page
pageSize    Rows displayed per page
items       Current bill-entry rows
editing     Bill currently being edited
```

Do not create separate competing state objects for individual patch files.

## Loading sequence

The required startup sequence is:

```text
1. External Supabase library
2. Shared configuration and state
3. Core UI helpers
4. Authentication UI
5. Feature renderers
6. Application controller
7. Display-only health module
```

The controller is deliberately loaded after feature renderers so it can authenticate, load records and render the requested page only after the required functions exist.

## Where to make changes

| Requirement | Primary section |
|---|---|
| Login, session or role | `assets/js/core/auth.js` |
| Bills not loading | `assets/js/core/controller.js` |
| Bill rows or pagination | `assets/js/core/ui.js` and future `assets/js/bills/bills.js` |
| Pack-format calculation | future `assets/js/bills/pricing.js` |
| Bill save/edit/delete | future `assets/js/bills/actions.js` |
| Vendor or product logic | future `assets/js/catalog/` |
| Dashboard metrics | future `assets/js/dashboard/` |
| Shared frame or mobile layout | `assets/css/app-shell.css` |
| Database status display | `assets/js/core/health.js` |
| Script loading order | `index.html` |

## Development rules

Before committing a change:

1. Identify the section that owns the responsibility.
2. Modify the owning file instead of creating a patch file.
3. Do not add another auth listener, router or database loader.
4. Keep each folder at five active files or fewer.
5. Use descriptive stable filenames.
6. Remove obsolete imports from `index.html`.
7. Test desktop and mobile layouts.
8. Test with admin and staff accounts.
9. Confirm the console contains no uncaught errors.
10. Confirm database status reaches `Connected` and the loaded count is correct.

## Browser diagnostics

Run this in DevTools after signing in:

```javascript
console.table({
  controller: window.__WS_APP_CONTROLLER__?.version,
  auth: window.__WS_AUTH__?.version,
  health: window.__WS_RUNTIME_HEALTH__?.version,
  role: state?.role,
  user: state?.user?.email,
  rows: state?.rows?.length,
  status: window.__WS_DB_STATUS__?.status,
  message: window.__WS_DB_STATUS__?.message
});
```

Expected production state:

```text
role: admin or the assigned user role
rows: greater than 0
status: Connected
message: empty
```

## Security

The browser uses a Supabase publishable key. Never commit:

- Supabase service-role keys;
- database passwords;
- private API keys;
- personal exports of bill records;
- authentication tokens.

Access control must be enforced through Supabase Row Level Security policies, not by hiding buttons in JavaScript.

## Release verification

After deployment:

1. open the live GitHub Pages application;
2. hard refresh with `Ctrl + Shift + R`;
3. sign in as an administrator;
4. verify the role label;
5. verify database status becomes `Connected`;
6. verify the loaded bill count;
7. test dashboard, bills, new bill, products, vendors, price book, reports and settings;
8. test search and date filters;
9. inspect the browser console;
10. test a staff account and confirm restricted actions are unavailable.

See `RELEASE-CHECKLIST.md` for production acceptance and rollback procedures.
