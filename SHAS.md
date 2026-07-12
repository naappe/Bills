# SHAS — Site Hierarchy and Section Standards

This file is the canonical naming registry for the White Saffron Bills repository. Use these names in requests, commits, code comments, IDs, documentation, and future maintenance.

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
| 7 | Dashboard Summary | `#dashboardView` | Vendor and status summaries |
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
