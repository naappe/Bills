# White Saffron Bills — Brand Standard

## Official Direction

**Minimalist + Mobile-first Finance Dashboard**, with light data-heavy reporting.

## Experience Principles

1. Keep daily bill entry fast and obvious.
2. Show only useful financial totals and filters.
3. Make every primary control comfortable to use on phones and tablets.
4. Use consistent names from SHAS.md.
5. Keep all branding work frontend-only unless a database change is separately approved.

## Palette

| Role | Color | Use |
| --- | --- | --- |
| Brand navy | `#0f172a` | Shared sidebar foundation |
| Brand saffron | `#d4a72c` | White Saffron logo and active accent |
| Primary | Deep teal `#155e75` | Main buttons and active navigation |
| Primary hover | Dark teal `#164e63` | Button hover state |
| Accent | Teal `#0f766e` | Brand gradients and secondary emphasis |
| Success | Green `#16a34a` | Paid status |
| Warning | Amber `#a16207` | Pending status |
| Background | Light gray `#f8fafc` | Page background |
| Cards | White `#ffffff` | Panels, KPI cards, and bill cards |

## Current Page Hierarchy

1. Top Action Bar
2. Filter Bar
3. Bills KPI Summary Cards
4. Bill Records Section
5. Pagination

## Responsive Rules

- Desktop: four KPI cards in one row.
- Tablet: two KPI cards per row; filters wrap cleanly.
- Mobile: one KPI card per row; compact bill cards; touch targets remain at least 44px.

## Data Safety Boundary

Branding must not change the Supabase URL, table name, authentication, row-loading, add/edit/delete behavior, filters, export logic, or stored bill records.


## Shared Sidebar Standard

Bills, Supply Rates and Settings use the same sidebar structure and navigation order. Use navy as the stable background, saffron only as a restrained brand accent, and teal for the active destination. Settings must remain admin-only. Do not introduce a different sidebar palette on individual pages.
