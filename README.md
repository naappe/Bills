# White Saffron Procurement ERP

A GitHub Pages procurement application for entering, reviewing, comparing, and reporting supplier bills. Supabase provides authentication and bill records; the browser renders all pages into one application shell.

**Live site:** https://naappe.github.io/Bills/

## Current routes

- `#dashboard` — procurement totals, payment health and monthly spend
- `#bills` — searchable bill list with bill date and last-edited activity
- `#new` — add or edit a bill
- `#rates` / `#prices` — price intelligence
- `#products` — product catalogue
- `#vendors` — supplier directory
- `#reports` — procurement analytics
- `#settings` — workspace defaults
- `#admin` — account and system overview

## Runtime architecture

```text
URL hash
  → hash-router.js
  → registered window renderer
  → #content
  → final route override, where applicable
```

The application currently uses a transition-layer architecture. Earlier modules remain loaded because some still provide shared bill-entry, rate, authentication, and compatibility functions. Newer modules loaded later override selected page renderers.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the authoritative load order and module ownership.

## Current page ownership

| Page | Final renderer |
|---|---|
| Dashboard | `recovery-v5.js` |
| Bills | `site-audit-v7.js` |
| New Bill | base bill-entry modules / `view-renderers.js` |
| Price Intelligence | `procurement-rebuild-v3.js`, enhanced by `product-editor-v8.js` |
| Products | `site-audit-v7.js`, enhanced by `product-editor-v8.js` |
| Vendors | `site-audit-v7.js` |
| Reports | `procurement-rebuild-v3.js` |
| Settings | `vendors-settings-v6.js` |
| Admin | `admin-manage-v5.js` |

## Product catalogue editing

Products are currently derived from recorded bill items; there is no dedicated Supabase `products` table.

The product editor supports catalogue-only metadata:

- display name
- category
- image URL

These overrides are saved in browser local storage under:

```text
ws-product-catalogue-v1
```

They do not rewrite historical supplier bills. This prevents catalogue edits from changing original procurement records. A future migration should move catalogue metadata into a dedicated Supabase products table.

## Product images

The Products page follows this order:

1. Saved bill-item image URL, when available.
2. Catalogue image URL saved through Edit Product.
3. Clearly labelled illustrative placeholder.

Illustrative images are not presented as exact product photography. Product names, suppliers, packs, and prices remain grounded in recorded bill data.

## Browser console audit

Open Developer Tools → Console and run:

```js
WSAssetAudit()
```

This prints every loaded JavaScript and CSS asset and classifies it as:

- current override
- transition override
- legacy/base
- core or vendor

Additional diagnostics:

```js
window.__WS_SITE_AUDIT__
window.__WS_PRODUCT_EDITOR__
window.__WS_RENDERERS__
```

To check runtime errors captured by the site audit:

```js
window.__WS_SITE_AUDIT__.errors
```

## Data behavior

- Primary Supabase table: `bills`
- Main runtime records: `state.rows`
- Bills are loaded in paginated database requests by `application-controller.js`
- Bill-date filters prioritize actual bill-date fields
- Last Added / Edited prioritizes `updated_at`, compatible edit fields, then `created_at`
- Amounts use MVR and `en-US` number formatting

## Roles

- `admin`: create, edit and delete bills
- `manager`: create and edit bills
- `staff`: create bills and edit when permitted
- `readonly`: view only

Frontend role checks are usability controls. Supabase Row Level Security must enforce actual permissions.

## Design system

- Interface font: Mona Sans
- Brand font: Playfair Display
- Primary navy: `#10204d`
- Saffron accent: `#ffb400`
- Success green: `#16835c`
- Background: soft procurement green-grey
- Bills: responsive list view
- Vendors: two-column desktop list
- Products: four-column desktop catalogue

## Deployment

GitHub Pages publishes from:

```text
Branch: main
Folder: /(root)
```

No build step is required.

## Required verification

After each deployment:

1. Wait for GitHub Pages to publish.
2. Hard refresh the live page.
3. Open the console and run `WSAssetAudit()`.
4. Confirm `window.__WS_SITE_AUDIT__.errors` is empty.
5. Test Dashboard, Bills, New Bill, Price Intelligence, Products, Vendors, Reports, Settings and Admin.
6. Verify desktop and mobile layouts.
7. Confirm create/edit/delete permissions with the appropriate user role.

## Security

The frontend contains only a Supabase publishable browser key. Never commit service-role keys, private API keys, passwords, access tokens, or exported sensitive procurement data.