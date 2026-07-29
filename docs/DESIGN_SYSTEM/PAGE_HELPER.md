# Interactive Page Helper

The Page Helper is a development and review aid that identifies the structural regions present on the current page.

## Current implementation

- Shared module: `app/js/ui.js`
- Router integration: `app/js/router.js`
- Global element ID: `globalPageHelper`
- The helper is installed after each route renders.
- It is also reinstalled after asynchronous page content finishes rendering.

## Supported region names

- Page Header
- Filter / Toolbar
- KPI Summary
- KPI Cards
- Primary Content
- Secondary Panel
- Card Header
- Card Body
- Data Table
- Form / Fields
- Actions
- Pagination

Only regions detected on the current page should appear in the helper.

## Behaviour

1. A floating **Page helper** button appears without affecting document flow.
2. Opening it displays the region names detected on the current page.
3. Clicking a region scrolls to the first matching element.
4. Every matching element receives a temporary outline and pulse.
5. The highlight clears automatically.
6. The panel can be closed without disabling the helper.

## Maintenance rules

- Do not insert permanent helper headings into production page content.
- Prefer explicit `data-layout-area` attributes for important page regions.
- Shared selector fallbacks may be used for existing components.
- Exclude modal contents from the page-level helper.
- Recalculate helper targets after asynchronous rendering or major DOM replacement.
- Remove the previous helper instance before creating a new one.
- The helper must not block page controls on mobile.

## Recommended explicit markup

```html
<header class="page-head" data-layout-area="page-header">...</header>
<section class="toolbar" data-layout-area="filter-toolbar">...</section>
<section class="kpi-grid" data-layout-area="kpi-summary">...</section>
<article class="card" data-layout-area="primary-content">...</article>
```

Explicit attributes are more reliable than guessing page structure from class names.

## Verification checklist

For every route:

- Open the route directly.
- Confirm the floating helper appears.
- Open the helper and verify relevant region names are listed.
- Click every listed region.
- Confirm scrolling and highlighting work.
- Change filters or tabs that replace content and test again.
- Test desktop and mobile widths.
- Check browser console for errors.

## Known failure mode

Some pages render their main sections asynchronously. Installing the helper only during the first router pass causes it to miss those sections. The router must schedule a second shared-UI installation after the page renderer has had time to complete.
