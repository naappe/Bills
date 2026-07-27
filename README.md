# White Saffron Procurement ERP

White Saffron Procurement ERP is a browser-based procurement system for recording supplier bills, tracking product costs, comparing vendors, and reviewing purchasing performance.

**Current version:** `v5.1.4`  
**Status:** Active development  
**Platform:** GitHub Pages + Supabase  
**Live site:** https://naappe.github.io/Bills/

## Current application

The application is a static single-page app built with HTML, CSS, and JavaScript ES modules. Supabase provides authentication and persistent bill data. GitHub Pages hosts the frontend.

### Main modules

- **Dashboard** — procurement overview and key spending indicators.
- **Bills** — searchable supplier bills, date and vendor filters, pagination, bill detail popup, editing, and deletion controls.
- **Bill Entry** — one supplier bill with multiple product rows saved as one bill record.
- **Price Intelligence** — normalized product costs, supplier comparison, price trends, and alerts for administrators.
- **Products** — product catalogue with images, retail pricing, wholesale pricing, pack information, and case quantity.
- **Vendors** — supplier directory and procurement history.
- **Reports** — procurement value, payment status, average bill value, supplier statistics, and spending trends.
- **Settings** — workspace configuration.
- **Admin & Users** — administrator-only account and system controls.

## Bill workflow

1. Select or type a vendor.
2. Existing vendor TIN, mobile number, and location are filled when saved data is available.
3. Enter the bill date, bill number, payment details, and category.
4. Add one or more product rows.
5. Enter pack format, unit, quantity, pack rate, and GST.
6. Review calculated subtotal, GST, and total.
7. Save all item rows as one bill record.
8. Open any bill row to view the complete supplier bill in a detail popup.
9. Edit a bill to restore all saved item rows back into Bill Entry.

## Product pricing rules

The Products page is intentionally simple and customer-facing:

- Retail price is the price for one selling unit.
- Wholesale price is the price for one configured case.
- Case quantity is stored separately from bill quantity.
- Product images are displayed with `object-fit: contain`.
- Base-unit calculations are not displayed on product cards.

Technical calculations such as cost per KG, G, L, ML, or PCS belong only in Price Intelligence.

## Bill data model

Each bill stores shared bill information and an `items` collection. Item rows may contain:

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

Older records without an `items` collection are still supported through legacy single-item fields.

## Access rules

- **Admin** — full application controls, including Price Intelligence and delete operations.
- **Staff** — standard procurement access; editing is restricted to the allowed time window where implemented.

Frontend role checks improve usability, but Supabase Row Level Security must enforce actual permissions.

## Technology

- HTML5
- CSS3
- JavaScript ES modules
- Supabase Auth and database
- GitHub Pages
- Font Awesome
- Inter typeface

No build process or application server is required.

## Runtime structure

```text
index.html
└── app/
    ├── css/
    │   ├── app.css
    │   ├── system.css
    │   ├── layout.css
    │   ├── consistency.css
    │   ├── products.css
    │   ├── vendors.css
    │   ├── rates.css
    │   ├── reports.css
    │   ├── admin.css
    │   ├── dashboard.css
    │   └── bills-mobile.css
    └── js/
        ├── main.js
        ├── router.js
        ├── store.js
        ├── data.js
        ├── dashboard.js
        ├── bills.js
        ├── bill-entry.js
        ├── products.js
        ├── vendors.js
        ├── rates.js
        ├── reports.js
        ├── settings.js
        ├── admin.js
        └── vendor-picker.js
```

## Current routes

| Route | Purpose |
|---|---|
| `#dashboard` | Procurement overview |
| `#bills` | Bill list, filters, details, edit, and delete |
| `#new` | Create or edit a supplier bill |
| `#rates` / `#prices` | Price Intelligence |
| `#products` | Product catalogue |
| `#vendors` | Vendor directory |
| `#reports` | Procurement reports |
| `#settings` | Workspace settings |
| `#admin` | Users and system administration |

## UI and performance

- One fixed desktop sidebar.
- One browser scrollbar on the far right.
- Shared top bar and responsive content layout.
- Full-width application content.
- Mobile sidebar drawer.
- Versioned assets to prevent stale browser files.
- Current page load is lightweight and uses browser caching for static assets.

## Module loading

JavaScript modules are loaded in `index.html` using ES module imports. `main.js` imports `router.js` and other core modules; `router.js` imports page renderers. The browser's ES module system evaluates all dependencies before the entry point completes. Module evaluation order depends on the import dependency graph, not HTML source order.

The router enforces that only admin users can navigate to `#admin`. All other role restrictions are backend-enforced via Supabase Row Level Security.

## Bill loading protection

The application prevents duplicate simultaneous bill list loads by tracking the current bill fetch promise. When the user navigates away from `#bills` and returns, overlapping load requests are resolved to the same promise rather than creating duplicate fetches.

## Deployment

GitHub Pages publishes from:

```text
Branch: main
Folder: /(root)
```

After a deployment:

1. Wait for GitHub Pages to publish.
2. Refresh the live site.
3. Confirm the deployment version in `index.html`.
4. Test authentication and session restoration.
5. Test Dashboard, Bills, Bill Entry, Products, Vendors, Price Intelligence, Reports, Settings, and Admin.
6. Test bill create, view, edit, and delete flows.
7. Check desktop, tablet, and mobile layouts.
8. Confirm there are no browser console errors or failed network requests.

## Security

Only a Supabase publishable browser key may be present in frontend code.

Never commit:

- Supabase service-role keys
- passwords
- private API keys
- access tokens
- confidential exports

Supabase Row Level Security is the security boundary. Hiding frontend controls is not sufficient authorization.

## Project status

The current application foundation is operational. Active work is focused on data accuracy, consistent user experience, product and vendor intelligence, reporting quality, and database normalization. The organization and CSS structure are being consolidated to reduce stylesheet overlap and improve maintainability.

## License

Internal White Saffron project.
