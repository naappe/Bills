# Changelog

All notable changes to White Saffron Procurement ERP are recorded here.

The project uses semantic-style version numbers for checkpoints. Dates and exact feature boundaries before v4.6.0 are reconstructed from repository history and should be corrected when authoritative release notes are available.

## [Unreleased]

### Planned

- Dedicated Price Intelligence module
- Product price timeline
- Vendor price comparison
- Cheapest compatible supplier calculation
- Configurable price alerts
- Savings opportunities
- Users and roles administration
- Database normalization

## [4.6.0] — Stable procurement foundation

### Added

- Modular application entry point through `app/js/main.js`
- Hash router with route metadata and fallback handling
- Shared state container and record-normalization helpers
- Supabase data-access module
- Dedicated Product Catalogue module
- Dedicated Vendor Directory module
- Product search, filtering, view switching, and purchase history
- Vendor search, canonical grouping, duplicate indicators, and bill history
- Product and vendor module stylesheets
- Runtime deployment marker and application health object

### Changed

- Products and Vendors moved out of the shared page module
- Vendor canonical grouping now prioritizes TIN, then mobile, then normalized name
- Product catalogue and vendor analytics are derived from bill records
- Application version and asset query strings updated to v4.6.0
- Documentation updated for the modular runtime

### Known limitations

- Product catalogue overrides remain browser-local until a dedicated products table exists
- Vendor merge and alias metadata remain browser-local until normalized vendor tables exist
- The browser still loads the complete bills table in 1,000-row pages
- Frontend roles currently resolve primarily to `admin` or `staff`
- Supabase RLS remains the required security boundary

## [4.5.0] — Product catalogue

### Added

- Dedicated `app/js/products.js`
- Dedicated `app/css/products.css`
- Product cards and list view
- Category and active-state filters
- Latest price, base-unit price, pack, vendor, vendor count, purchase count, and last-purchase summaries
- Product purchase-history modal
- Admin catalogue metadata editor
- Product image fallback hierarchy

### Changed

- Router imports `productsPage` from the dedicated Products module

## [4.4.0] — Dashboard and bills refinement

### Changed

- Dashboard period controls and procurement summaries refined
- Bills search, filtering, bill-date display, and last-edited activity improved
- Responsive bills presentation improved
- Shared typography, spacing, and control sizing refined

### Fixed

- Bill-date and activity-date prioritization issues
- Several stale asset and navigation problems reported during the transition

## [4.3.0] — Design-system consolidation

### Changed

- Shared visual tokens introduced or consolidated
- Navigation, cards, controls, tables, forms, and responsive layouts aligned
- Standard interface typography and spacing adopted

## [4.2.0] — Bills workflow improvements

### Added

- Expanded bill-entry calculations
- Supplier and item details
- Payment, GST, pack, and unit-rate handling
- Search and period filters

### Changed

- Bill entry and bill history workflows improved for procurement use

## [4.1.0] — Dashboard improvements

### Added

- Procurement totals
- Payment-health summaries
- Monthly spend presentation
- Date-range driven dashboard behavior

## [4.0.0] — Procurement ERP foundation

### Added

- GitHub Pages application shell
- Supabase authentication
- Bill records
- Dashboard, Bills, Price Intelligence, Products, Vendors, Reports, Settings, and Admin routes
- MVR formatting and procurement-focused interface

# Release policy

A release is considered complete only when:

1. The deployed version is updated in `index.html`.
2. Asset query strings are updated when cache invalidation is necessary.
3. All routes are tested.
4. Authentication and session restoration are tested.
5. Relevant role permissions are tested.
6. Desktop and mobile layouts are reviewed.
7. Browser console errors are resolved or documented.
8. `README.md`, `ARCHITECTURE.md`, and this changelog are updated.
9. Database changes include backups, validation, and rollback notes.

# Change categories

Use these headings where applicable:

- `Added`
- `Changed`
- `Deprecated`
- `Removed`
- `Fixed`
- `Security`
- `Known limitations`

# Commit guidance

Recommended commit prefixes:

- `feat:` new user-facing functionality
- `fix:` defect correction
- `refactor:` internal restructuring without intended behavior change
- `perf:` performance improvement
- `docs:` documentation only
- `style:` visual styling only
- `test:` tests and verification tooling
- `chore:` maintenance and repository administration
