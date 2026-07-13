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


## Current Prices Page Standard

| Section | Identifier | Purpose |
| --- | --- | --- |
| Price Summary | `.stats` | Item, vendor and record counts |
| Price Filters | `.filters`, `.chips` | Search, vendor, sort, GST and change filters |
| Price Cards | `#cards` | Latest vendor/item prices and previous-price comparison |

Navigation order is Dashboard, Bills, Supply Rates, Prices, Settings (admin only). Prices are always formatted to two decimal places and the page is read-only.


## Public Prices Access Standard

- `prices.html` must open without a password.
- Anonymous queries select only approved Supply price fields.
- Apply `SUPABASE_PUBLIC_PRICES_READ.sql` once.
- Never expose Bills, Auth users, notes, invoice numbers or `created_by` through the public page.
- The page remains read-only.


## Shared Editorial Theme Standard

- Background: cream `#f7f6f2`.
- Surfaces: white `#ffffff` with warm-grey borders `#e4e2da`.
- Primary actions: deep green `#0f766e`.
- Accent: green `#16a36f`; navigation highlight may use saffron `#d4a72c`.
- Page headings: Georgia/editorial serif; operational text remains sans-serif.
- Apply consistently to Dashboard, Bills, Supply Rates, Prices, Settings and stock utilities.
- Do not alter calculations, permissions or stored records when changing theme CSS.


## Top Navigation and Colour Mode Standard

1. Main navigation is a sticky horizontal bar, not a desktop side menu.
2. Brand identity is left aligned; Dashboard, Bills, Supply Rates, Prices, Settings and theme control align right.
3. Mobile navigation remains horizontally scrollable.
4. `#themeToggle` switches between Light and Dark modes.
5. Persist the choice in `localStorage.ws-theme`.
6. Both modes must preserve readable cards, fields, tables, dialogs and navigation states.


## Accessible Brand Contrast Standard

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `#fbf8f2` | `#0d100e` |
| Surface | `#fffdf8` | `#171b18` |
| Primary text | `#1c201d` | `#f7f3ea` |
| Muted text | `#5f6862` | `#b8c0ba` |
| Primary action | `#0f766e` | `#20a596` |
| Brand accent | `#d4a72c` | `#f0bd36` |

The final brand stylesheet must be the last style element in `head`. Every surface, row, form control, table, dialog and button must define readable foreground and background colours in both modes.


## Reference-Matched Palette Standard

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#faf8f4` | `#0c0c0b` |
| Surface | `#ffffff` | `#1b1917` |
| Primary text | `#191714` | `#f7f2ea` |
| Muted text | `#68635d` | `#bdb5ac` |
| Action accent | `#b84308` | `#f0803f` |
| Brand mark | `#70c94f` | `#8cdf68` |

Orange is reserved for active navigation, primary controls and focus. Lime is reserved for the White Saffron mark and positive brand detail. Do not reintroduce mixed teal/navy primary navigation colours.


## Top Navigation Contrast Rule

- Inactive Light navigation: `#332f2b` on `#faf8f4` — 12.51:1.
- Active Light navigation: white on `#b84308` — 5.46:1.
- Inactive Dark navigation: `#e4ded6` on `#0c0c0b` — 14.65:1.
- Active Dark navigation: `#17110d` on `#f0803f` — 7.01:1.
- Navigation contrast rules must use the full `.sidebar .nav`, `.sidebar .side-nav`, and `.topnav .links` selectors so legacy rules cannot override them.


## Final White Saffron Brand Selection

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#fbf8f2` | `#0d100e` |
| Surface | `#fffdf9` | `#181c19` |
| Reading text | `#1b1d1a` | `#f5f2eb` |
| Muted text | `#59635d` | `#b9c1bb` |
| Saffron identity | `#c79200` | `#f0bd36` |
| Teal action | `#0f766e` | `#20a596` |

Saffron is limited to the brand mark, focus ring and active navigation underline. Teal is limited to actions, selected filters and active navigation text. This section supersedes earlier experimental palette sections.


## Industrial Dashboard Dark Mode

| Role | Colour |
| --- | --- |
| Canvas | `#111c26` |
| Navigation | `#182532` |
| Card surface | `#1b2935` |
| Raised/input surface | `#223441` / `#14212b` |
| Primary text | `#f2f7fa` |
| Secondary text | `#a7b5c0` |
| Active/action | `#25c96a` |
| Information/chart | `#56d4e8` |
| Warning/chart | `#f2c84b` |

Dark-mode contrast: primary 15.98:1, secondary 8.22:1, navigation 9.70:1, active controls 8.59:1.


## Appearance Switch Standard

- Identifier: `#themeToggle`.
- Always show both **Light** and **Dark** labels.
- Move the switch knob to indicate Dark mode.
- Use the device `prefers-color-scheme` only when no saved preference exists.
- Save manual selection in `localStorage.ws-theme`.
- Update `aria-pressed` and the action-oriented `aria-label` on every change.


## Shared Brand Stylesheet Standard

- Canonical file: `brand-system.css`.
- Load it once as the final stylesheet in every page `head`.
- Do not add new page-level brand colour overrides.
- Page CSS may define layout and page-specific components only.
- Global navigation, surfaces, typography colours, buttons, states and appearance modes belong in `brand-system.css`.
