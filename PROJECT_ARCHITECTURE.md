# White Saffron Procurement ERP
## Project Architecture

This document describes the current production architecture. It must be updated when routes, workflows, data structures, or protected modules change.

## System flow

```text
Supabase Authentication
        ↓
Application Shell (`index.html`)
        ↓
Bootstrap and session handling (`app/js/main.js`)
        ↓
Hash router (`app/js/router.js`)
        ↓
Shared in-memory state (`app/js/store.js`)
        ↓
Page renderer
        ↓
Supabase data operations (`app/js/data.js`)
```

## Hosting and runtime

- Frontend hosting: GitHub Pages
- Backend service: Supabase
- Application type: static single-page application
- Language: browser JavaScript ES modules
- Build step: none
- Primary currency: MVR
- Authentication: Supabase Auth
- Persistence: one configured Supabase bill table with legacy-column compatibility

## Application shell

### `index.html`

Responsibilities:

- Loads global CSS and external assets.
- Provides authentication, sidebar, top bar, content area, and footer containers.
- Loads Supabase browser client.
- Starts `app/js/main.js`.
- Applies cache-busting query strings to changed assets.

Protected status: changes require careful review because every route depends on this file.

## Core JavaScript

### `app/js/main.js`

- Restores authentication sessions.
- Handles login and logout.
- Loads bill data once through the guarded data loader.
- Builds role-aware navigation.
- Starts the router.
- Records runtime errors.
- Controls desktop and mobile sidebar behavior.

### `app/js/router.js`

- Maps hash routes to page renderers.
- Updates active navigation state.
- Updates top-bar titles and subtitles.
- Prevents non-admin access to `#admin`.
- Clears and renders the active page.
- Initializes shared UI behavior after rendering.

### `app/js/store.js`

- Holds the authenticated user and role.
- Holds loaded Supabase rows.
- Holds route, filters, pagination, and editing state.
- Provides compatibility helpers for historical field names.
- Provides money, number, date, vendor, amount, item, and text helpers.

### `app/js/data.js`

- Creates the Supabase client.
- Handles authentication operations.
- Loads all bill rows with pagination.
- Prevents duplicate simultaneous bill loads.
- Adapts canonical payload fields to columns detected in existing data.
- Creates, updates, and deletes bill records.
- Updates the in-memory store after successful writes.

### `app/js/ui.js`

- Enhances supported list inputs with shared searchable dropdown behavior.
- Supports mouse, touch, and keyboard selection.
- Reinitializes behavior after route rendering.

## Route modules

### Dashboard — `app/js/dashboard.js`

Purpose:

- Operational procurement overview.
- Date-period filtering.
- Spend, bill, supplier, and payment indicators.
- Recent bills and pending payments.
- Spend trend and category allocation.

Data source: `store.rows` only. It must not issue duplicate Supabase requests.

### Bills — `app/js/bills.js`

Purpose:

- Search and filter supplier bills.
- Paginate records.
- View a complete bill.
- Edit eligible bills.
- Delete bills for authorized administrators.

Primary presentation:

```text
Date | Vendor & Bill | Items | Payment | Amount | Actions
```

### Bill Entry — `app/js/bill-entry.js`

Purpose:

- Create or edit a supplier purchase.
- Support invoice number available/not-yet-available workflow.
- Add one or more products.
- Calculate line totals, GST, and bill total.
- Learn recent vendor-product values locally for quicker entry.
- Save through `saveBillRecords` or `updateBill`.

Primary fields:

- Vendor
- Date
- Invoice status
- Invoice number when available
- Product
- Quantity
- Unit
- Purchase price
- Optional packing

Advanced fields remain secondary.

### Products — `app/js/products.js`

Purpose:

- Static searchable catalogue.
- Show latest vendor and packing.
- Show latest saved purchase rate as wholesale price.
- Show retail price only when a compatible stored field exists.
- Show stock status only when reliable stock fields exist.

Product cards are informational and do not navigate to a second detail page.

### Vendors — `app/js/vendors.js`

Purpose:

- Aggregate suppliers from bill history.
- Show vendor details and procurement history.
- Support supplier-oriented analysis without duplicating bill loading.

### Price Intelligence — `app/js/rates.js`

Purpose:

- Normalize purchase costs across KG, G, L, ML, PCS, and pack formats.
- Compare suppliers.
- Identify price movement, cheapest supplier, volatility, and savings opportunities.
- Restrict access to administrators through navigation and route policy.

### Reports — `app/js/reports.js`

Purpose:

- Procurement summaries and trends.
- Payment and supplier reporting.
- Reuse loaded data rather than querying Supabase again.

### Settings — `app/js/settings.js`

Purpose:

- Workspace and account preferences.
- Password and session-related controls where implemented.

### Admin — `app/js/admin.js`

Purpose:

- Administrator-only system and user information.
- Must not be exposed as functional authorization; Supabase RLS remains authoritative.

## CSS architecture

### Shared CSS

- `app.css` — global application components and base styling.
- `system.css` — design tokens and system-level rules.
- `layout.css` — application shell, sidebar, top bar, and responsive layout.
- `consistency.css` — cross-route spacing, controls, cards, tables, and density.

### Route CSS

- `dashboard.css`
- `products.css`
- `vendors.css`
- `rates.css`
- `reports.css`
- `admin.css`
- `bills-mobile.css`

Page-specific CSS must not duplicate shared controls when a global pattern already exists.

## Bill data workflow

```text
User enters bill
      ↓
Bill Entry calculates rows and totals
      ↓
Review confirmation
      ↓
Canonical record created
      ↓
`data.js` adapts aliases to detected table columns
      ↓
Supabase insert/update
      ↓
Returned row replaces or extends `store.rows`
      ↓
Bills, Products, Vendors, Dashboard, Reports, and Price Intelligence update from shared data
```

## Bill record structure

Shared bill fields may include:

- `bill_date`
- `bill_no`
- `vendor`
- `payment_status`
- `payment_method`
- `amount`
- `gst_total`
- `tin`
- `mobile`
- `location`
- `category`
- `notes`
- `items`

Item fields may include:

- `description`
- `pack_format`
- `unit`
- `qty`
- `pack_rate`
- `row_total`
- `gst`
- `base_quantity`
- `base_unit`
- `unit_rate`
- `large_unit_rate`

Historical single-item records remain readable through compatibility helpers.

## Inventory boundary

The current application does not yet have a guaranteed inventory ledger.

Do not claim automatic stock updates until the approved database model includes reliable fields or tables for:

- Product identity
- Stock quantity
- Stock unit
- Purchase stock-in transactions
- Usage or sale stock-out transactions
- Reorder level
- Adjustment history
- User and timestamp audit trail

The Products page must show `Not tracked` rather than infer stock from purchase history.

## Security boundary

Frontend role checks are user-interface controls only.

Actual authorization must be enforced by Supabase Row Level Security. Never place service-role keys, passwords, or private credentials in frontend files.

## Change policy

Before modifying architecture, read `AI_RULES.md`.

Architecture changes require:

1. Explicit scope.
2. Files and workflows affected.
3. Risk analysis.
4. Database impact, if any.
5. Rollback plan.
6. Documentation updates.
