# White Saffron Procurement ERP — Architecture

This document describes the deployed v4.6.0 architecture. It replaces the previous transition-layer description and should be updated whenever routing, state, data access, or module ownership changes.

## System overview

White Saffron Procurement ERP is a static single-page application hosted on GitHub Pages. Supabase provides authentication and persistent bill records. The browser contains the application shell, router, state store, page renderers, formatting utilities, and data-access layer.

```text
GitHub Pages
  → index.html application shell
  → app/js/main.js boot sequence
  → Supabase session restoration
  → paginated bill loading
  → hash router
  → route renderer
  → #content
```

No build step, server-side renderer, or application server is required.

## Application shell

`index.html` owns the permanent document structure:

- login view
- authenticated application view
- sidebar navigation
- top bar
- route title and subtitle
- `#content` page mount point
- application footer
- Supabase browser client script
- application stylesheet imports
- `app/js/main.js` module entry point

All route renderers mount into:

```html
<div class="content" id="content"></div>
```

The shell also exposes the deployed version through:

```js
window.__BILLS_DEPLOYMENT__
```

## JavaScript modules

### `app/js/main.js`

Application bootstrap and lifecycle owner.

Responsibilities:

- build navigation
- restore the Supabase session
- show login or application views
- load all bill records
- start the router
- handle sign-in and sign-out
- expose `window.app`
- maintain basic boot health information

### `app/js/router.js`

Hash-based routing owner.

Responsibilities:

- normalize route names
- map hashes to page renderers
- update active navigation state
- update page title and subtitle
- clear `#content` before rendering
- expose `window.show()` and `window.router`

Current routes:

| Hash | Renderer |
|---|---|
| `#dashboard` | `dashboardPage` |
| `#bills` | `billsPage` |
| `#new` | `newBillPage` |
| `#cost` | `costPage` |
| `#products` | `productsPage` |
| `#vendors` | `vendorsPage` |
| `#reports` | `reportsPage` |
| `#settings` | `settingsPage` |
| `#admin` | `adminPage` |

Unknown hashes fall back to Dashboard.

### `app/js/pages.js`

Shared page-rendering module for:

- Dashboard
- Bills
- New Bill
- Cost
- Reports
- Settings
- Admin

This file currently retains multiple business functions and should not be replaced without validating every exported renderer.

### `app/js/products.js`

Product catalogue owner.

Responsibilities:

- derive products from recorded bill items
- product search and filtering
- card/list presentation
- price and purchase summaries
- purchase-history modal
- catalogue metadata overrides

Until a normalized `products` table exists, catalogue-only metadata remains browser-local and must not rewrite historical bill records.

### `app/js/vendors.js`

Vendor directory owner.

Responsibilities:

- derive vendors from bill records
- canonical grouping by TIN, mobile, then normalized name
- supplier search and filtering
- spend, paid, pending, average bill, product, and purchase summaries
- duplicate and alias indicators
- bill-history modal
- vendor metadata overrides

Until normalized vendor tables exist, merge and alias metadata remains browser-local.

### `app/js/store.js`

Small shared state container.

Current state:

```js
{
  user,
  role,
  rows,
  route,
  page,
  pageSize,
  editing
}
```

`store.set()` merges patches and dispatches a `store:change` custom event.

This module also owns common formatting and record-normalization helpers, including MVR formatting, bill date, vendor, amount, status, bill number, and product extraction.

### `app/js/data.js`

Supabase data-access layer.

Responsibilities:

- create the Supabase client
- sign in and sign out
- restore the current session
- classify the current user as `admin` or `staff`
- load bills in pages of 1,000 rows
- insert bill records
- update bill records
- delete bill records
- synchronize successful mutations into the browser store

UI modules should use this layer rather than issuing unrelated Supabase calls directly.

### `app/js/config.js`

Runtime configuration owner.

Typical responsibilities:

- Supabase URL
- Supabase publishable key
- source table name
- login aliases
- administrator user IDs

Never place service-role keys or other privileged secrets in this browser-delivered file.

## CSS ownership

Current stylesheets are loaded in this order:

1. `app/css/app.css`
2. `app/css/products.css`
3. `app/css/vendors.css`

`app.css` owns the application shell, design tokens, shared controls, page layout, tables, forms, and responsive foundation.

`products.css` and `vendors.css` should contain only module-specific presentation and must reuse tokens from `app.css` wherever possible.

## Runtime data flow

```text
Supabase bills table
  → data.js loadBills()
  → store.rows
  → page aggregation and filtering
  → HTML renderer
  → #content
```

Mutations follow the reverse path:

```text
Form action
  → data.js insert/update/delete
  → Supabase
  → store.rows update
  → route refresh or local UI update
```

## Authentication and authorization

Supabase Auth provides authentication. The frontend currently assigns:

- `admin` when the authenticated user ID exists in `CONFIG.adminIds`
- `staff` otherwise

Frontend checks improve usability but are not a security boundary. Supabase Row Level Security policies must enforce actual read, insert, update, and delete permissions.

## Product and vendor derivation

Products and vendors are currently analytical views derived from bills rather than first-class database entities.

Consequences:

- historical bills remain the source of truth
- catalogue corrections must not silently change historical records
- duplicate supplier names require canonical grouping
- normalized products, vendors, aliases, and cost workspace remain planned database work

See `DATABASE.md` for the target schema.

## Performance model

Current bill loading requests the complete table in 1,000-row pages and stores all records in memory. This is acceptable for the current data volume but has a practical limit.

Future optimization should introduce:

- date-bounded default queries
- server-side filtering and pagination
- aggregate views or RPC functions
- normalized bill-item indexes
- lazy detail loading
- cached catalogue summaries

Performance changes must preserve accurate totals and date filters.

## Global diagnostics

Available runtime diagnostics include:

```js
window.__BILLS_DEPLOYMENT__
window.app
window.router
```

`window.app.health` records boot, authentication, data-loading, and error state.

## Change-safety rules

Before changing architecture:

1. Fetch and inspect the current file from the default branch.
2. Never replace a large file with a partial payload.
3. Keep one authoritative renderer per route.
4. Preserve the `main.js → data load → router` lifecycle.
5. Use `data.js` for Supabase bill mutations.
6. Test all routes after changes.
7. Test sign-in, session restoration, and sign-out.
8. Test bill creation, editing, and deletion with permitted roles.
9. Test desktop, tablet, and mobile layouts.
10. Update this document, `README.md`, and `CHANGELOG.md` when ownership changes.

## Planned architecture evolution

### v4.7 — Cost

- dedicated price-intelligence module
- product timeline aggregation
- comparable base-unit rates
- supplier comparison
- alert thresholds
- savings estimates

### v4.8 — Users and Roles

- normalized user profiles
- explicit role and permission data
- audit events
- administration workflows

### v4.9 — Database normalization

- products
- product aliases
- vendors
- vendor aliases
- bills
- bill items
- cost workspace or derived price views

### v5.0 — Assisted procurement

- controlled OCR ingestion
- product and vendor matching suggestions
- anomaly detection
- forecasting and purchasing recommendations

All future migrations must preserve original supplier bill evidence and provide a documented rollback path.
