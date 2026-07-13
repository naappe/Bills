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
| 5 | Bills KPI Summary Cards | `#billsKpiSummaryCards.stats` | Showing Records, Total MVR, Pending, This Month |
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
| 1 | Dashboard Financial Overview | `.dashboard-overview` | Calculated insight and four finance indicators |
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
