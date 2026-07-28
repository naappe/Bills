# CSS Ownership Map

This document inventories which stylesheet owns each visual component. No merging occurs yet—this is a safe reference for identifying where to make design changes and detecting duplicate or conflicting rules.

---

## File Responsibilities

### `tokens.css`
**Scope:** Design tokens only (colors, spacing, typography, sizes, shadows, transitions)  
**Never contains:** Selectors, components, page-specific rules  
**Read by:** All other stylesheets  

#### Current tokens defined:
- Colors: `--color-*`, `--brand-*`, `--surface-*`, `--text-*`, `--bg-*`
- Spacing: `--sp-1`, `--sp-2`, `--sp-3`, `--sp-1-5`, `--sp-5`
- Typography: `--fs-*` (font sizes), `--weight-*` (font weights), `--font-ui`, `--line-normal`
- Sizes: `--sidebar-width`, `--header-height`, `--control-height`, `--table-row`, `--nav-height`
- Radii: `--radius-card`, `--radius-control`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-focus`
- Transitions: `--duration-fast`, `--duration-normal`

---

### `app.css`
**Scope:** Base HTML elements, typography reset, login page, form elements  
**Key selectors:**
```css
* { box-sizing: border-box }
html { font-size: var(--fs-16) }
body { background, color, font }
h1, h2, h3, h4, h5, h6 { typography }
p, ul, ol, li { typography }
a, button, input, select, textarea { base styles }

.login { full-page container }
.login-card { card container }
.login-mark { logo }
.app { top-level grid }
.sidebar { flex column }
.main { flex column }
.topbar { sticky header }
```

**Also contains:**
- Page layout grid (`grid-template-columns: var(--sidebar-width) 1fr`)
- Button base styles (`.btn`)
- Table base styles (`.table`)
- Form element sizing

**Overlap risk:** Button and input styles also in `consistency.css` and `system.css`

---

### `system.css`
**Scope:** Composition of tokens into layout behaviors, responsive rules, form controls  
**Key selectors:**
```css
.app, .main, .content { min-width: 0 (prevent flex overflow) }
.page-head { alignment, sizing }
.grid-4, .grid-2, .catalog { grid templates with !important }
.toolbar, .date-toolbar, .bills-toolbar { filter layout }
.card, .kpi { card styling }
.btn { button styling (with !important) }
input, select, textarea { control styling }
.sidebar, .nav, .side-foot { sidebar structure }
.table, .table th, .table td { table styling }
.badge, .pager, .empty { utility components }
```

**Critical:**
- Overrides form controls and buttons with `!important`
- Sets all grid templates with `!important`
- All responsive breakpoints: `@media (max-width: 820px)`, `@media (max-width: 520px)`

**Overlap risk:** High—duplicates rules from `app.css` and `consistency.css` with `!important`

---

### `layout.css`
**Scope:** Desktop-specific fixed sidebar and topbar positioning, responsive sidebar drawer  
**Key selectors:**
```css
@media (min-width: 821px) {
  .app { display: block; position-relative }
  .sidebar { position: fixed; width: var(--sidebar-width) }
  .nav { overflow-y: auto; scrollbar hidden }
  .nav-group, .nav-label, .nav a { spacing and alignment }
  .nav a.active { box-shadow: inset (active indicator) }
  .side-foot { flex footer }
  .main { margin-left: var(--sidebar-width); transition }
  .topbar { left: var(--sidebar-width); }
  .content { max-width: none; padding }
  .sidebar-collapsed { width: 76px }
  .sidebar-collapsed .nav { icons-only layout }
}

@media (max-width: 820px) {
  .main { margin-left: 0 }
  .content { max-width: none }
}
```

**Owned here:**
- Fixed sidebar positioning
- Desktop navigation layout and active states
- Collapsed sidebar icon-only mode
- Responsive breakpoint at 821px
- Sidebar animation: `transform: translateX(-105%)`

**Depends on:** `--sidebar-width` (80px expanded, 76px collapsed from tokens)

---

### `consistency.css`
**Scope:** Cross-route typography, component hierarchy, shared card/table sizing  
**Key selectors:**
```css
.content { gap, align-content, padding }
.content > .page-head { h1, p sizing }
.content > .page-head + .toolbar { margin-top }
.card, .toolbar, .date-toolbar { border, background }
.card-head { height, padding, h2, small }
.card-body { padding }
.actions { gap, alignment }
.btn { height, border-radius, font }
label { gap, color, font }
input, select, textarea { height, font, focus state }
.grid-4, .grid-2 { auto-fit grid }
.kpi { height, padding }
.table, .table th, .table td { alignment, font }
.bills-table th:nth-child(n), .bills-table td:nth-child(n) { exact widths }
.pager { height, padding }
```

**Critical rules:**
```css
.bills-table th:nth-child(1) { width: 120px }
.bills-table th:nth-child(2) { width: 130px }
/* ... etc for 6 columns */
```

**Overlap risk:** Button, input, and grid styles also in `system.css` (sometimes with conflicts)

---

### `products.css`
**Scope:** Product catalogue page layout and card styling  
**Likely contains:**
```css
.product-card { image, title, pricing }
.product-image { object-fit, sizing }
.product-meta { brand, category }
.price-badge { retail vs wholesale }
.product-filters { search, category, vendor }
```

**Should own:** Product grid layout, product card dimensions, filter layout

---

### `vendors.css`
**Scope:** Vendor directory page layout  
**Likely contains:**
```css
.vendor-card { profile, contact }
.vendor-meta { statistics, history }
.vendor-filters { search, region }
.contact-row { phone, email, address }
```

**Should own:** Vendor grid, vendor card dimensions

---

## Redesign Roadmap (After This Inventory)

### Phase 1: Sidebar & Layout (Highest priority)
- Increase sidebar width to 250px (update `--sidebar-width` in `tokens.css`)
- Make collapsed sidebar icons-only (update `layout.css`)
- Fix sidebar footer layout (update `layout.css`)
- Verify all pages inherit correct `--sidebar-width`

### Phase 2: Cost (High priority)
- Fix sidebar clipping — may need to widen content area
- Verify the desktop table and mobile cards at their responsive breakpoints
- Keep the cost filters readable at desktop, tablet, and mobile widths
- Ensure full page width is used — check `.content` max-width

### Phase 3: Bills Page
- Improve bill list layout — update `.bills-table` column widths if needed
- Vendor search integration — add to `.bills-toolbar`
- Date filter responsive — ensure `.date-toolbar` wraps correctly
- Responsive table — verify `.bills-mobile.css` works at all breakpoints

### Phase 4: Consolidate Duplicates (After visual stability)
- Merge `app.css` and `system.css` (button and input rules)
- Consolidate `.grid-*` definitions
- Remove `!important` flags once consolidation is complete
- Reduce stylesheet count from 11 to 6-7 files

---

## Testing Checklist for Next Designer

After any CSS change:

1. Desktop (821px+): Sidebar expanded, all pages render correctly
2. Desktop (821px+): Sidebar collapsed, icons visible, content uses full width
3. Tablet (520px–820px): Sidebar drawer opens/closes, content is readable
4. Mobile (0–519px): All content readable, no horizontal scroll
5. Bills page: Table columns visible, filters wrap correctly
6. Cost: No overflow, full width used
7. Dashboard: KPI cards responsive, layout doesn't break
8. Admin: Two-column layout maintained, scrollbars manageable

---

## Files to Review Next

1. `cost.css` — Check for overflow and width issues
2. `bills-mobile.css` — Verify responsive rules work correctly
3. `layout.css` — Sidebar width and collapsed state
4. `consistency.css` — `.bills-table` column widths
5. `system.css` — Global grid and button `!important` rules

---

## Summary

The application currently distributes CSS across 11 files with significant overlap in buttons, inputs, grids, and card rules. The core shell (sidebar, topbar, content area) is split between `app.css` and `layout.css`, making it harder to update the layout together.

**Immediate action:** Update only `tokens.css` and `layout.css` to resize the sidebar and fix collapsed mode. This unblocks visual work without the risk of affecting other components.

**After stability:** Consolidate duplicates so each component has one authoritative owner.
