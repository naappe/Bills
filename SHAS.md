# SHAS — Site Hierarchy and Section Standards

This file is the canonical naming registry for the White Saffron Bills repository. Use these names in requests, commits, code comments, IDs, documentation, and future maintenance.

## Official Brand Vibe

- Primary direction: **Minimalist + Mobile-first**
- Reporting support: **Data-heavy**
- AI-powered features: **Not included**
- Data safety: visual or branding changes must not modify Supabase tables or records.

## Global Naming Standard

- Complete highlighted totals row: **KPI Summary Cards**
- One box inside that row: **KPI Card**
- Bills page instance: **Bills KPI Summary Cards**
- Stock page instance: **Stock KPI Summary Cards**

## index.html — Bills Application

| Order | Canonical name | Selector / identifier | Purpose |
| --- | --- | --- | --- |
| 1 | Login Section | `#loginView` | User authentication |
| 2 | Application Shell | `#appView` | Sidebar and main application |
| 3 | Sidebar Navigation | `.sidebar .nav` | Dashboard and Bills navigation |
| 4 | Top Action Bar | `.topbar` | Refresh, Export, Add Bill, Logout |
| 5 | Bills KPI Summary Cards | `#billsKpiSummaryCards.stats` | Showing Records, Total MVR, This Month |
| 6 | Filter Bar | `.filter-card` | Search, status, and date filters |
| 7 | Advanced Finance Dashboard | `#dashboardView` | Financial overview, six-month trend and analytical breakdowns |
| 8 | Bill Records Section | `#billsView` | Filtered bill list and pagination |
| 9 | Bill Entry Dialog | `#billDialog` | Add and edit bill form |

## stock.html — Stock Sheet Application

| Order | Canonical name | Selector / identifier | Purpose |
| --- | --- | --- | --- |
| 1 | Login Section | `#loginView` | User authentication |
| 2 | Stock Application | `#appView` | Complete stock workspace |
| 3 | Top Action Bar | `.topbar` | Bills link, Refresh, Logout |
| 4 | Stock KPI Summary Cards | `#stockKpiSummaryCards.stats` | Lines, Needs Review, Sheets, Photos |
| 5 | Upload Stock Sheet Section | `.grid .panel:first-child` | Photo, OCR review, and line entry |
| 6 | Stock Lines Section | `.grid .panel:last-child` | Searchable saved stock records |

## setup-stock.html — Setup Utility

| Order | Canonical name | Selector | Purpose |
| --- | --- | --- | --- |
| 1 | Stock Setup Page | `.wrap` | Setup utility container |
| 2 | Stock Setup Card | `.card` | Displays and copies setup SQL |

## Coding Rules

1. Keep the CSS classes `.stats` and `.stat` because they control layout and styling.
2. Use the stable IDs `#billsKpiSummaryCards` and `#stockKpiSummaryCards` when targeting the full component.
3. Use **KPI Summary Cards** in comments and documentation.
4. Use **KPI Card** only when referring to one card.
5. Update both this file and `README.md` when adding, removing, or renaming a major section.


## Advanced Finance Dashboard Hierarchy

| Order | Canonical name | Selector / identifier | Purpose |
| --- | --- | --- | --- |
| 1 | Dashboard Financial Overview | `.dashboard-overview` | Calculated insight and three finance indicators |
| 2 | Average Bill Indicator | `#averageBill` | Filtered total divided by filtered record count |
| 3 | Paid Value Indicator | `#paidDashboardAmount` | Paid value under the active filters |
| 4 | Payment Rate Indicator | `#paymentRate` | Paid value as a percentage of filtered total |
| 5 | Largest Bill Indicator | `#largestBill` | Highest bill value under active filters |
| 6 | Expense Trend Panel | `#monthlyTrend` | Latest six calendar months |
| 7 | Top Vendors Panel | `#topVendors` | Vendor totals and bill-list drill-down |
| 8 | Category Breakdown Panel | `#categoryDashboard` | Category totals and bill-list drill-down |
| 9 | Payment Methods Panel | `#paymentDashboard` | Payment method totals and drill-down |
| 10 | Status Summary Panel | `#statusSummary` | Paid, pending and cancelled totals |

## Filter Mathematics Standard

- **Last 20 added** sorts by `created_at` descending, falls back to numeric ID descending, and returns only 20 records.
- **Showing Records**, **Total MVR**, and **Pending** follow the active filter and search.
- **This Month** always totals every current-month bill loaded from Supabase, independent of the Last 20 filter.
- Dashboard breakdowns use `state.filtered`.
- Dashboard drill-down selections must also update the Bill Records list.

## Workflow Standard

The dashboard workflow is validation-only.

- Workflow file: `.github/workflows/build-standard-analytics-dashboard.yml`
- Permission: `contents: read`
- It must not edit, commit or push `index.html`.
- It validates required dashboard IDs.
- It extracts non-empty inline scripts and runs `node --check`.

## Repair SHA Registry

| SHA | Change |
| --- | --- |
| `5893d50` | Replaced the self-editing workflow with read-only validation |
| `5098e54` | Applied the bright finance analytics dashboard theme |
| `1c0e408` | Limited Last added to the latest 20 bills |
| `8b4c913` | Removed stale CSS, restored bill count and corrected monthly KPI scope |
| `7f8b941` | Updated README incident and repair documentation |

## Known Incident Causes

1. The former workflow could trigger from its own changes and push generated commits.
2. The former dashboard repair depended on brittle HTML regular-expression boundaries.
3. Last added sorted all rows but did not limit the resulting array.
4. Old dashboard CSS remained after the new dashboard replaced its wrappers.
5. A literal `\\n` remained in the CSS source.

These causes are resolved in the SHA registry above.


## Shared Application Sidebar

| Canonical name | Selector | Rule |
| --- | --- | --- |
| Application Sidebar | `.sidebar` | Shared navigation shell on Bills, Supply Rates and Settings |
| Brand Block | `.side-brand` | White Saffron identity and workspace label |
| Sidebar Navigation | `.nav`, `.side-nav` | Dashboard, Bills, Supply Rates and Settings links |
| Admin Settings Link | `.admin-only-nav` | Hidden unless the authenticated role is Admin |
| Sidebar Summary | `.sidebar-summary` | Short page-purpose description |

### Navigation Order

1. Dashboard
2. Bills
3. Supply Rates
4. Settings — Admin only

### Canonical Sidebar Colors

- Brand Navy: `#0f172a`
- Brand Saffron: `#d4a72c`
- Brand Teal: `#155e75`
- Active Teal: `#0f766e`
- Navigation Text: `#cbd5e1`


## Database Write Confirmation Standard

All user-facing Supabase mutations follow this sequence:

1. Validate the form and permissions.
2. Send the insert, update or delete request.
3. Request affected identifiers with `.select('id')`.
4. Confirm the returned row count matches the expected operation.
5. Show success only after confirmation.
6. Reload the relevant page data.

| Operation | Required confirmation |
| --- | --- |
| Single insert | One returned row ID |
| Bulk insert | Returned ID count equals submitted item count |
| Update | At least one returned row ID |
| Delete | At least one returned row ID |
| Vendor merge | Every selected bill ID is returned with the canonical vendor |

A zero-row response is treated as a permission or persistence failure, not success.

## Responsive Application Shell Standard

At widths up to `860px`:

- Navigation remains one horizontally scrollable row.
- Do not change navigation into a 2×2 grid.
- Active navigation uses the bottom saffron accent.
- Page titles use a compact 24px mobile scale.
- Action buttons use a two-column grid where space permits.
- Main content uses consistent 12–16px side padding.
- Sticky summaries must not cover editable form fields.

Dashboard/Bills in `index.html` are the canonical visual reference. Supply Rates and Settings must follow the same shell while retaining their page-specific functions.

## Current Stability Status — 13 July 2026

- JavaScript syntax: verified on `index.html`, `supply-rates.html`, `master.html`, and `stock.html`.
- Duplicate HTML IDs: none detected on the four core pages.
- Supabase write confirmation: enabled for core add, edit and delete operations.
- Data safety: no existing records were changed during the layout and documentation audit.


## Supply GST Calculation Standard

| Choice | Net | GST | Final |
| --- | --- | --- | --- |
| No GST | `quantity × rate` | `0` | `net` |
| Add GST +8% | `quantity × rate` | `net × 0.08` | `net + GST` |

Do not label new entry choices as Included/Excluded. Use exactly **No GST** and **Add GST +8%**.

## Vendor Item Memory Standard

1. Select the vendor first.
2. Show item suggestions only from that vendor's saved Supply history.
3. Match item names case-insensitively.
4. Use the newest saved record when the same vendor/item has multiple rates.
5. Reuse unit, unit rate and GST choice after exact selection.
6. Never reuse an item rate from a different vendor.


## Visible Dashboard Standard

The canonical visible Dashboard is **Supply Records Dashboard**.

| Section | Identifier | Purpose |
| --- | --- | --- |
| Supply Dashboard Hero | `.supply-dashboard-hero` | Supply overview and link to Supply Rates |
| Supply Dashboard KPIs | `.supply-dashboard-kpis` | Saved items, vendors, recorded value and latest record |
| Latest Supply Records | `#supplyRecentRecords` | Eight newest saved Supply records |

Bills KPI Summary Cards, Bills filters and Bill Records must appear only in the Bills view. Do not show Bills financial analytics in the visible Dashboard.


## Supply Dashboard Analysis Standard

| Section | Identifier | Calculation |
| --- | --- | --- |
| Top Items | `#supplyTopItems` | Sum quantity and final value by normalized item name; rank by recorded value |
| Top Vendors | `#supplyTopVendors` | Sum final value by normalized vendor name; show unique item count |
| Monthly Price Changes | `#supplyPriceChanges` | Compare the latest vendor/item unit rate in the newest two recorded months |

- Supply Dashboard queries are read-only and may load up to 5,000 newest Supply rows.
- A price difference is vendor-specific; prices from different vendors must never be compared as the same history.
- “High stock” means high recorded supplied quantity/value, not calculated on-hand inventory.
- Run `SUPABASE_SUPPLY_DASHBOARD_READ.sql` once so authenticated Bills users can select Supply rows. Write access remains restricted.


## Modern Supply Graph Standard

| Graph | Identifier | Purpose |
| --- | --- | --- |
| Monthly Supply Value | `#supplyMonthlyTrendChart` | Latest six-month recorded-value trend |
| Vendor Share | `#supplyVendorDonut` | Leading vendor value distribution |
| Highest-Value Items | `#supplyItemChart` | Top seven item values as horizontal bars |

Graphs must remain responsive, read-only, accessible with an SVG label, and dependency-free. They use the same loaded Supply rows as the KPI and analysis panels.
