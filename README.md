# White Saffron Procurement ERP

Modern procurement and supplier management system built for restaurants, cafés, hotels, and retail businesses.

Manage supplier bills, monitor product prices, compare vendors, and make purchasing decisions from one unified dashboard.

> **Current Version:** v4.6.0 (Stable)
>
> **Status:** Active Development
>
> **Platform:** GitHub Pages + Supabase
>
> **Live Demo:** https://naappe.github.io/Bills/

---

# Overview

White Saffron Procurement ERP is designed to simplify the entire purchasing process.

Instead of storing invoices as static documents, every bill becomes structured purchasing data that can be searched, compared, analyzed, and reported.

The system automatically builds product history, vendor statistics, procurement analytics, and future price intelligence from supplier bills.

---

# Key Features

## Procurement Dashboard

- Live procurement overview
- Monthly spending
- Payment status
- Vendor statistics
- Purchasing trends

## Bill Management

- Fast supplier bill entry
- Multiple line items
- Automatic totals
- Edit history
- Advanced search and filtering

## Product Catalogue

- Automatically generated from bills
- Product images and catalogue metadata
- Categories and active status
- Base-unit pricing
- Purchase history

## Vendor Management

- Supplier profiles derived from bills
- Canonical grouping by TIN, mobile, and normalized name
- Spending summaries
- Paid and pending totals
- Purchase history
- Duplicate and alias indicators

## Price Intelligence

The full v4.7 implementation is planned.

- Historical pricing
- Cheapest compatible supplier
- Vendor comparison
- Price alerts
- Savings analysis

## Reporting

- Procurement analytics
- Spending trends
- Vendor performance
- Product purchasing reports

---

# Technology

- HTML5
- CSS3
- Modern JavaScript ES modules
- Supabase Auth and database
- GitHub Pages

No build process or application server is required.

---

# Screens

- Dashboard
- Bills
- New Bill
- Products
- Vendors
- Price Intelligence
- Reports
- Settings
- Administration

---

# Project Architecture

White Saffron Procurement ERP is a static single-page application.

```text
GitHub Pages
  → index.html application shell
  → app/js/main.js
  → Supabase session restoration
  → paginated bill loading
  → hash router
  → route renderer
  → #content
```

Core ownership:

- `index.html` — application shell and asset loading
- `app/js/main.js` — boot, authentication lifecycle, and navigation
- `app/js/router.js` — route mapping and rendering
- `app/js/store.js` — shared browser state and formatting helpers
- `app/js/data.js` — Supabase authentication and bill mutations
- `app/js/pages.js` — shared page renderers
- `app/js/products.js` — product catalogue
- `app/js/vendors.js` — vendor directory
- `app/css/app.css` — design system and shared layout
- `app/css/products.css` — product-specific styles
- `app/css/vendors.css` — vendor-specific styles

Products and vendors are currently derived from historical bill records. Catalogue and alias overrides remain browser-local until the normalized database migration.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full runtime design and module ownership.

---

# Current Routes

| Route | Purpose |
|---|---|
| `#dashboard` | Procurement overview |
| `#bills` | Searchable supplier bills |
| `#new` | Add or edit a bill |
| `#rates` / `#prices` | Price Intelligence |
| `#products` | Product catalogue |
| `#vendors` | Supplier directory |
| `#reports` | Procurement reports |
| `#settings` | Workspace defaults |
| `#admin` | Users and system status |

---

# Data and Roles

- Primary runtime data: Supabase bills table
- Browser state: `store.rows`
- Currency: MVR
- Number formatting: `en-US`
- Bills load in database pages of 1,000 rows
- Historical bill data remains the source of truth

Current frontend roles:

- `admin` — full application controls where implemented
- `staff` — standard procurement access

The planned role model adds `manager` and `readonly`. Frontend checks are usability controls only; Supabase Row Level Security must enforce real permissions.

---

# Development Status

| Module | Status |
|---|---|
| Authentication | Complete |
| Application shell and router | Complete |
| Dashboard | Complete foundation |
| Bills | Complete foundation |
| Products | Complete v4.5 foundation |
| Vendors | Complete v4.6 foundation |
| Price Intelligence | Planned for v4.7 |
| Reports | Partial |
| Users and Roles | Planned for v4.8 |
| Database Normalization | Planned for v4.9 |
| Assisted Procurement | Planned for v5.0 |

---

# Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime, modules, state, routing, and performance
- [DATABASE.md](DATABASE.md) — current data model, target schema, RLS, and migration plan
- [CHANGELOG.md](CHANGELOG.md) — release history and known limitations
- [ROADMAP.md](ROADMAP.md) — implementation order and definition of done
- [CONTRIBUTING.md](CONTRIBUTING.md) — coding, design, security, testing, and Git standards

---

# Development Roadmap

## v4.6 — Stable Procurement Foundation

- Modular runtime
- Dashboard and Bills foundation
- Product Catalogue
- Vendor Directory
- Documentation checkpoint

## v4.7 — Price Intelligence

- Product price timeline
- Compatible vendor comparison
- Price movement alerts
- Savings opportunities
- Admin-only procurement insights

## v4.8 — Users and Roles

- User profiles
- Permission matrix
- Account status
- Audit logging
- RLS-aligned administration

## v4.9 — Database Normalization

- Products and product aliases
- Vendors and vendor aliases
- Normalized bills and bill items
- Migration validation and rollback

## v5.0 — Assisted Procurement

- OCR-assisted bill capture
- Product and vendor matching suggestions
- Duplicate and anomaly detection
- Forecasting and purchasing recommendations

---

# Deployment

GitHub Pages publishes from:

```text
Branch: main
Folder: /(root)
```

After deployment:

1. Wait for GitHub Pages to publish.
2. Hard refresh the live site.
3. Test login and session restoration.
4. Test every route.
5. Test bill create, edit, and delete behavior for the appropriate role.
6. Review desktop, tablet, and mobile layouts.
7. Check the browser console and network panel for failures.

---

# Security

The frontend may contain only a Supabase publishable browser key.

Never commit:

- service-role keys
- passwords
- private API keys
- access tokens
- sensitive procurement exports

Supabase Row Level Security is the application security boundary. Hidden controls and frontend role labels are not sufficient authorization.

---

# License

Internal White Saffron Project.
