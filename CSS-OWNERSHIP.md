# White Saffron Procurement ERP — Canonical CSS Ownership

This file defines the required ownership of every CSS layer. It replaces the legacy inventory model in which multiple files competed for buttons, forms, grids, cards, navigation, and responsive behavior.

The goal is one authoritative owner per concern.

## 1. Required load order

```text
1. tokens.css
2. app.css
3. layout.css
4. master-components.css
5. page-specific CSS
6. professional.css only when retained as a compatibility import
```

A later file must not become a general override layer for an earlier file.

## 2. File ownership

### `tokens.css`

Owns values only:

- colors
- typography families, sizes, weights, and line heights
- spacing scale
- radii
- shadows
- control heights
- header dimensions
- content width values
- transitions
- breakpoints where represented as custom properties

It must not contain component selectors or page-specific rules.

### `app.css`

Owns the base document layer:

- box sizing
- body and root behavior
- default typography
- links
- base media behavior
- authentication screen foundation
- generic hidden-state utilities where required

It does not own navigation geometry, page grids, reusable cards, or page-specific components.

### `layout.css`

Owns the complete application shell:

- authenticated application root
- global top header
- brand area
- desktop horizontal navigation
- active navigation layout state
- account area
- page context area
- full-width main region
- `#content` geometry
- footer placement
- mobile menu trigger
- mobile drawer
- mobile backdrop
- shell responsive breakpoints

It must not contain product, vendor, bill, cost, report, or admin page styling.

The canonical desktop layout has no permanent left sidebar and no sidebar content offset.

### `master-components.css`

Owns reusable visual components:

- `.btn` variants
- input, select, textarea, and label styling
- cards and card sections
- toolbars and filter groups
- tables and table containers
- KPI components
- badges
- pagination
- modals
- empty states
- notices and alerts
- shared list and summary patterns

Canonical KPI selectors:

```css
.kpi-summary
.kpi-card
.kpi-card__icon
.kpi-card__content
.kpi-card__label
.kpi-card__value
.kpi-card__meta
```

### Page-specific stylesheets

Examples:

```text
products.css
vendors.css
reports.css
admin.css
dashboard.css
bills-mobile.css
cost.css
```

They may own only structures unique to their route, such as:

- product media arrangement
- vendor profile composition
- report chart containers
- admin workflow grids
- bill-line editor columns
- cost comparison visualization

They must consume shared components and tokens rather than restyling them.

### `professional.css`

Compatibility entry point only.

Allowed content:

```css
@import url('./master-components.css?v=<version>');
```

It must not accumulate selectors, fixes, patches, or page overrides.

### `marketplace-theme.css`

Legacy transition file.

It must not remain a competing global design layer. During migration:

1. classify each useful rule as token, layout, shared component, or page-specific;
2. move it to the authoritative owner;
3. remove duplicate and obsolete rules;
4. remove the stylesheet import when no required rules remain.

## 3. Legacy files and overlap

The current repository may still contain shared rules in:

- `system.css`
- `consistency.css`
- `kpi.css`
- `marketplace-theme.css`
- page CSS
- inline `<style>` blocks

These are migration sources, not permanent competing owners.

Rules must be moved deliberately. Do not silence conflicts by adding another override file.

## 4. Migration map

| Legacy concern | Canonical owner |
|---|---|
| sidebar and collapsed-sidebar rules | remove during shell migration |
| desktop top navigation | `layout.css` |
| mobile drawer | `layout.css` |
| `.btn` | `master-components.css` |
| inputs, selects, textareas, labels | `master-components.css` |
| cards | `master-components.css` |
| shared grids | `master-components.css` or page CSS when truly page-specific |
| KPI appearance | `master-components.css` |
| table foundation | `master-components.css` |
| exact route-specific table columns | owning page stylesheet |
| page headers and toolbars | `master-components.css` plus layout arrangement where required |
| color and spacing constants | `tokens.css` |
| inline shell styling | `layout.css` or `app.css` |

## 5. Conflict rules

- Do not define the same component in two active files.
- Do not use selector specificity as an ownership strategy.
- Do not add `!important` to win internal stylesheet conflicts.
- Do not add versioned duplicate imports.
- Do not keep old rules “just in case” after migration verification.
- Do not mix desktop shell architecture into page stylesheets.

## 6. Page stylesheet contract

A page stylesheet may:

- define a route-specific grid
- define route-specific media sizing
- arrange canonical cards or controls
- define a unique chart or editor visualization

A page stylesheet may not:

- replace global typography
- redefine `.btn`
- redefine all inputs or selects
- redefine global cards
- redefine navigation
- change the application content offset
- create another design token system

## 7. Responsive ownership

Shell breakpoints belong to `layout.css`.

Shared component adaptation belongs to `master-components.css`.

Page-specific responsive behavior belongs to that page stylesheet.

A breakpoint must not contain unrelated rules from multiple ownership layers merely because they share the same screen width.

## 8. Removal sequence

When consolidating a legacy rule:

1. identify every selector and dependent DOM contract;
2. place the final rule in the canonical owner;
3. test all affected routes and breakpoints;
4. remove the legacy rule;
5. confirm computed styles no longer depend on the old file;
6. remove an empty legacy import only after production verification.

## 9. Completion criteria

CSS consolidation is complete when:

- the desktop shell uses top navigation;
- no permanent sidebar geometry remains;
- shared components have one owner;
- `professional.css` is import-only or removed;
- `marketplace-theme.css` is removed or page-scoped without global overlap;
- inline production patches are removed;
- no internal conflict requires `!important`;
- every route works at desktop, tablet, and mobile widths;
- hard refresh loads the intended assets.

`ARCHITECTURE.md` remains the highest authority.