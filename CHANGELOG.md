# Changelog

## [5.4.0] — Search category cost comparison

### Added

- Search results compare matching products as one category, such as all milk products
- Cheapest result is marked using a like-for-like base-unit cost
- Comparison rows show product, vendor, last entry, last price, packing, and large/small unit costs
- Selected product shows a focused last-price graph
- Small-unit prices retain up to six decimal places

### Changed

- Cost product details now show only the requested purchasing information

## [5.3.3] — Comparable pack-size costs

### Added

- Milk and other liquid packing recognizes `l`, `ltr`, `litre`, `liter`, and `ml`
- Different pack sizes of the same product have separate cost histories
- Liquid costs normalize to one litre, weight costs to one kilogram, and count packs to one piece

## [5.3.2] — Packing-only Cost products

### Fixed

- Cost excludes products and purchase points where Bill Entry packing was left empty

## [5.3.1] — Entered packing correction

### Fixed

- Cost now shows the weight of one packing value entered in Bill Entry
- Bill quantity no longer multiplies the displayed packing weight

## [5.3.0] — Product Cost analysis

### Added

- Searchable product cost summary with product images and price-change indicators
- Latest and highest purchase cost including GST
- Packing weight shown consistently in grams when a weight-based pack is recorded
- Purchase-cost history graph and direct access to the original bill

## [5.2.1] — Empty Cost workspace

### Removed

- All Cost data, calculations, filters, tables, responsive cards, and CSV export
- Dedicated Cost stylesheet

### Changed

- Cost remains only as a clean empty administrator route

## [5.2.0] — Cost workspace

### Added

- Dedicated admin-only Cost page
- Purchase cost totals by product, vendor, category, and period
- Responsive product-cost table and mobile cards
- Filtered Cost CSV export

### Removed

- Price History and Price Intelligence routes
- Legacy rates JavaScript and stylesheet files
- Price movement, volatility, supplier-ranking, savings, sparkline, and historical-price page logic

All notable changes to White Saffron Procurement ERP are recorded here.

The project uses semantic-style version numbers for checkpoints. Dates and exact feature boundaries before v4.6.0 are reconstructed from repository history and should be corrected when authoritative release notes are available.

## [Unreleased]

### Planned

- Approved inventory data model and transaction ledger
- Product and vendor master tables
- Retail-price management
- Missing-invoice follow-up workflow
- Configurable low-stock and price alerts
- Protected server-side user administration
- Secure role assignment backed by Supabase tables and RLS
- Database normalization

## [5.1.5] — Operational workflow simplification — 2026-07-27

### Added

- Shared searchable dropdown behavior for supported list inputs
- Operational Dashboard with recent bills, pending payments, spend trend, and category allocation
- Bills summary metrics for filtered bill count, value, pending count, and period
- Invoice-status workflow allowing bills to be saved before an invoice number is available
- Vendor-aware product suggestions in Bill Entry
- Product initials fallback when no product image exists
- AI development rules notice and project documentation index in README
- `PROJECT_ARCHITECTURE.md`, `WEBSITE_UPDATE.md`, `ROADMAP.md`, and `KNOWN_ISSUES.md`

### Changed

- Reorganized Dashboard into a compact operational workspace
- Reorganized Bills around date, vendor and invoice, items, payment, amount, and actions
- Replaced compressed mobile Bills tables with readable bill cards
- Simplified Bill Entry to prioritize vendor, date, invoice status, product, quantity, unit, price, and packing
- Moved payment, GST, vendor contact, category, and notes fields into secondary details
- Simplified Products into a static catalogue
- Displayed latest saved purchase rate as wholesale price
- Removed product-card navigation to a separate analytics/detail view
- Consolidated page density, headers, controls, filters, and table behavior through shared styles

### Preserved

- Supabase authentication and existing table compatibility
- Bill create, update, and delete operations
- Staff editing restrictions
- Administrator access rules
- Pack parsing and normalized unit calculations
- Price Intelligence calculations

### Known limitations

- Inventory quantities are not yet reliably stored or calculated
- Stock-in and stock-out ledgers do not yet exist
- Retail price appears only when a compatible stored field exists
- Product catalogue entries are inferred from purchase history rather than a dedicated product master table

## [4.8.0] — Admin and role workspace

### Added

- Dedicated `app/js/admin.js` module
- Dedicated `app/css/admin.css` stylesheet
- Admin-only route guard
- Configured access identity summary
- Staff and admin permission matrix
- Current-session details
- System-health indicators
- Recent procurement activity table
- Clear security boundary for Supabase Auth administration

### Changed

- Admin route now uses a dedicated module instead of the shared page implementation
- Application version and cache-busting asset references updated to v4.8.0

### Known limitations

- A static GitHub Pages client cannot securely list, create, suspend, or delete Supabase Auth users
- Secure user administration requires a protected Edge Function, server endpoint, or direct Supabase dashboard access
- Application aliases are configuration identities, not a complete Supabase Auth directory

## [4.7.1] — Procurement reports

### Added

- Dedicated Reports module and stylesheet
- Period, vendor, category, and payment-status filters
- Procurement, paid, pending, and average-bill KPIs
- Monthly spend trend
- Payment-health visualization
- Supplier, category, and product rankings
- CSV export and print layout

## [4.7.0] — Price Intelligence

### Added

- Dedicated Price Intelligence module and stylesheet
- Normalized unit-price comparison
- Price movement indicators
- Cheapest supplier detection
- Supplier range and savings analysis
- Product history and supplier comparison panels
- Admin-only access

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
8. `README.md`, `PROJECT_ARCHITECTURE.md`, `WEBSITE_UPDATE.md`, and this changelog are updated.
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
