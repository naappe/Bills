# White Saffron Procurement ERP

White Saffron Procurement ERP is a browser-based procurement system for recording supplier bills, tracking product costs, comparing vendors, and reviewing purchasing performance.

## 🤖 AI Development Rules

This repository uses a strict AI development policy.

Before making any code changes, read:

➡️ **[AI_RULES.md](AI_RULES.md)**

All contributors and AI assistants must follow those rules before modifying the project.

## Project documentation

| File | Purpose |
|---|---|
| [AI_RULES.md](AI_RULES.md) | Mandatory development and safety rules |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | Application structure, modules, workflows, and data boundaries |
| [WEBSITE_UPDATE.md](WEBSITE_UPDATE.md) | Current completed work, active work, and next priorities |
| [CHANGELOG.md](CHANGELOG.md) | User-visible releases and significant changes |
| [ROADMAP.md](ROADMAP.md) | Approved and proposed future capabilities |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Confirmed limitations, defects, and risks |

**Current version:** `v5.1.5`  
**Status:** Active development  
**Platform:** GitHub Pages + Supabase  
**Live site:** https://naappe.github.io/Bills/

## Current application

The application is a static single-page app built with HTML, CSS, and JavaScript ES modules. Supabase provides authentication and persistent bill data. GitHub Pages hosts the frontend.

### Main modules

- **Dashboard** — operational procurement overview, recent bills, pending payments, spending trends, and category allocation.
- **Bills** — searchable supplier bills, date and vendor filters, pagination, bill detail popup, editing, and deletion controls.
- **Bill Entry** — simplified supplier purchase entry with invoice-status handling and multiple product rows.
- **Cost** — administrator-only empty workspace reserved for future development.
- **Products** — static product catalogue showing latest vendor, packing, wholesale price, retail-price availability, and stock-tracking status.
- **Vendors** — supplier directory and procurement history.
- **Reports** — procurement value, payment status, average bill value, supplier statistics, and spending trends.
- **Settings** — workspace configuration and account controls.
- **Admin & Users** — administrator-only account and system controls.

## Bill workflow

1. Select or type a vendor.
2. Enter the bill date.
3. Select whether an invoice number is available.
4. Enter the invoice number only when available.
5. Add one or more products.
6. Enter quantity, unit, purchase price, and optional packing.
7. Review the automatic line totals, subtotal, GST, and grand total.
8. Save the bill.
9. Open a bill later to review or edit it.
10. Add a missing invoice number later when the accountant receives it.

Advanced vendor, payment, GST, category, and notes fields remain available as secondary details.

## Product pricing rules

The Products page is intentionally a simple catalogue:

- Wholesale price is derived from the latest saved purchase rate.
- Retail price is shown only when a compatible saved field exists.
- Product packing comes from saved bill-item data.
- Product cards do not open a second analytics page.
- Technical normalized-rate analysis belongs in Cost.
- Stock is shown as not tracked unless reliable inventory fields exist.

The application must not invent retail prices, stock quantities, or reorder alerts when the database does not store them.

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

Older records without an `items` collection remain supported through legacy single-item fields.

## Access rules

- **Admin** — full application controls, including Cost and delete operations.
- **Staff** — standard procurement access with bill editing and deletion requests available without a time limit.

Frontend role checks improve usability, but Supabase Row Level Security must enforce actual permissions.

## Bill deletion workflow

### Staff

- Staff may request deletion at any time; there is no 24-hour lock.
- Clicking Delete creates a pending `deletion_requests` record with entity type `bill`.
- The bill remains active and visible until Admin reviews the request.

### Admin review

- **Approve** moves the bill to recoverable Trash by setting `deleted_at`.
- **Reject** leaves the bill unchanged and marks the request rejected.
- Both outcomes are handled atomically by `review_bill_deletion_request`.

### Direct Admin deletion

Admin Delete calls `trash_bill` and moves the bill directly to Trash. It does not permanently delete the bill immediately.

### Restore and permanent deletion

- Admin can restore a bill from **Admin & users → Bill Trash** for 30 days.
- Restoring calls `restore_bill_from_trash`, clears `deleted_at`, and returns the bill to the active Bills view.
- The scheduled `purge_expired_bill_trash` database function runs daily and permanently removes bills after the 30-day recovery window.
- Production RPC calls must not be tested against arbitrary real IDs because trash and approval operations modify live data.

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
├── AI_RULES.md
├── PROJECT_ARCHITECTURE.md
├── WEBSITE_UPDATE.md
├── CHANGELOG.md
├── ROADMAP.md
├── KNOWN_ISSUES.md
└── app/
    ├── css/
    │   ├── app.css
    │   ├── system.css
    │   ├── layout.css
    │   ├── consistency.css
    │   ├── products.css
    │   ├── vendors.css
    │   ├── reports.css
    │   ├── admin.css
    │   ├── dashboard.css
    │   └── bills-mobile.css
    └── js/
        ├── main.js
        ├── router.js
        ├── store.js
        ├── data.js
        ├── ui.js
        ├── dashboard.js
        ├── bills.js
        ├── bill-entry.js
        ├── products.js
        ├── vendors.js
        ├── cost.js
        ├── reports.js
        ├── settings.js
        └── admin.js
```

## Current routes

| Route | Purpose |
|---|---|
| `#dashboard` | Procurement overview |
| `#bills` | Bill list, filters, details, edit, and delete |
| `#new` | Create or edit a supplier bill |
| `#cost` | Empty administrator Cost workspace |
| `#products` | Static product catalogue |
| `#vendors` | Vendor directory |
| `#reports` | Procurement reports |
| `#settings` | Workspace settings |
| `#admin` | Users and system administration |

## UI and performance

- Fixed desktop sidebar and mobile drawer.
- Shared top bar and responsive content layout.
- Versioned assets to reduce stale browser files.
- Shared searchable-list behavior.
- No service worker or PWA at this stage.
- Bill data is loaded through one guarded Supabase loading workflow.

## Deployment

GitHub Pages publishes from:

```text
Branch: main
Folder: /(root)
```

After a deployment:

1. Wait for GitHub Pages to publish.
2. Hard refresh the live site.
3. Test authentication and session restoration.
4. Test Dashboard, Bills, Bill Entry, Products, Vendors, Cost, Reports, Settings, and Admin.
5. Test bill create, view, edit, and delete flows.
6. Check desktop, tablet, and mobile layouts.
7. Confirm there are no browser console errors or failed network requests.

## Security

Only a Supabase publishable browser key may be present in frontend code.

Never commit:

- Supabase service-role keys
- Passwords
- Private API keys
- Access tokens
- Confidential exports

Supabase Row Level Security is the security boundary. Hiding frontend controls is not sufficient authorization.

## Project status

The application foundation is operational. Current work focuses on simplifying daily procurement entry, improving data accuracy, consolidating UI behavior, and designing a safe inventory model before enabling stock calculations.

## License

Internal White Saffron project.
