# White Saffron Procurement ERP — Canonical Architecture

This document is the authoritative architecture contract for the White Saffron Procurement ERP. It defines the structure that all future implementation work must follow.

The current production code may still contain legacy sidebar-era structure. That legacy structure is not the target architecture and must not be extended with additional patches. Migration work must move the application toward this document while preserving business logic, routes, permissions, IDs, data attributes, calculations, and database behavior.

## 1. System model

White Saffron Procurement ERP is a static single-page application hosted on GitHub Pages.

```text
GitHub Pages
  → index.html application shell
  → app/js/main.js bootstrap
  → Supabase authentication
  → app/js/data.js data access
  → app/js/store.js shared state
  → app/js/router.js route selection
  → route page renderer
  → #content page mount
```

There is no required application server or build step.

## 2. Canonical application shell

The authenticated application must use one shared shell:

```text
Application
├── Global top header
│   ├── Brand
│   ├── Desktop navigation
│   ├── Page context
│   └── Account controls
├── Mobile navigation drawer
├── Full-width main content
│   └── #content route mount
└── Global footer
```

### Desktop

- Navigation is horizontal inside the global top header.
- There is no permanent left sidebar.
- Main content uses the full available viewport width.
- Page title and context remain visible without duplicating navigation.
- Account controls remain in the global header.

### Mobile

- The same route model is used.
- A menu button opens a temporary navigation drawer.
- The drawer is an interaction mode, not the desktop architecture.
- The backdrop and Escape key must close the drawer.

## 3. Shell ownership

### `index.html`

Owns permanent document structure only:

- authentication loader
- login view
- authenticated application root
- global header
- desktop navigation mount
- mobile navigation drawer
- page title and subtitle
- `#content` route mount
- footer
- stylesheet imports
- JavaScript module entry point

It must not contain temporary production patches when the correct source module can own the behavior.

### `app/js/main.js`

Owns application bootstrap and shell interaction:

- restore Supabase session
- show login or application view
- build navigation from one route definition
- populate account information
- open and close mobile navigation
- sign in and sign out
- load initial application data
- start the router

It must not contain page-specific rendering or duplicated route definitions.

### `app/js/router.js`

Owns routing:

- normalize hashes
- resolve routes
- enforce route visibility by role
- update active navigation state
- update page title and subtitle
- render into `#content`

### `app/js/store.js`

Owns shared browser state and shared record-formatting helpers.

### `app/js/data.js`

Owns all Supabase access used by application modules. UI modules must not introduce unrelated direct Supabase clients.

## 4. Navigation contract

Navigation must have one authoritative route definition used by desktop and mobile presentations.

Each route definition should provide:

```js
{
  id,
  hash,
  label,
  icon,
  title,
  subtitle,
  roles
}
```

Rules:

1. Do not maintain separate desktop and mobile route lists.
2. Preserve `data-route` as the routing contract.
3. Active state must be derived from the current route.
4. Role filtering must happen before navigation items render.
5. Navigation presentation may differ by breakpoint, but route behavior must remain identical.
6. Legacy sidebar collapse behavior must be removed during the shell migration rather than preserved as hidden dead code.

## 5. Route mount contract

All pages render into:

```html
<div class="content" id="content"></div>
```

Page modules may replace the contents of `#content`, but they must not replace the application shell.

A route renderer owns only its route content. It must not create another global header, sidebar, footer, or account panel.

## 6. CSS architecture

CSS must follow a strict ownership hierarchy:

```text
app/css/tokens.css
  design tokens only

app/css/app.css
  reset, base elements, authentication foundation

app/css/layout.css
  application shell, global header, navigation, content geometry, responsive shell

app/css/master-components.css
  reusable buttons, cards, forms, tables, filters, KPI components, badges, modals

app/css/<page>.css
  page-specific structures only

app/css/professional.css
  compatibility import entry point only
```

Rules:

- A shared component has one authoritative owner.
- Page styles must not redefine global buttons, fields, cards, tables, typography, or navigation.
- `professional.css` must not accumulate overrides.
- `marketplace-theme.css` must not operate as a competing global design system. Its reusable rules must be migrated into tokens, layout, or master components, then the legacy file can be retired.
- New `!important` rules are prohibited unless a documented third-party constraint requires them.
- Inline CSS and inline JavaScript patches are temporary migration tools only and must be removed after the owning source file is updated.

## 7. Shared component contract

Canonical KPI classes:

```css
.kpi-summary
.kpi-card
.kpi-card__icon
.kpi-card__content
.kpi-card__label
.kpi-card__value
.kpi-card__meta
```

The same principle applies to:

- buttons
- form controls
- cards
- toolbars
- tables
- empty states
- badges
- modals
- pagination

Legacy selectors may be mapped during migration, but new pages must use canonical shared components directly.

## 8. Functional preservation boundary

Architecture migration may change shell markup and styling, but it must preserve:

- authentication
- route hashes
- route permissions
- role behavior
- page renderer entry points
- `#content`
- required IDs and data attributes
- bill entry and editing
- vendor and product selection
- unit conversion
- pack parsing
- price calculations
- stock behavior
- deletion workflows
- Supabase queries and persistence behavior unless separately approved

The shell migration is not permission to rewrite business logic.

## 9. Migration sequence

The required order is:

1. Update canonical documentation.
2. Inventory shell IDs, event handlers, route definitions, and CSS dependencies.
3. Create the new top-header shell structure.
4. Move navigation rendering to one shared route definition.
5. Implement desktop horizontal navigation.
6. Implement mobile drawer navigation using the same route definition.
7. Convert layout geometry to full-width content.
8. Remove sidebar collapse logic and obsolete sidebar CSS.
9. Consolidate shared component ownership.
10. Remove temporary compatibility mappings only after all routes use canonical components.
11. Update cache versions once the migration is complete.
12. Verify every route, role, breakpoint, and critical workflow.

Do not perform this migration as disconnected CSS patches.

## 10. Verification requirements

Before the shell migration is considered complete, verify:

- login and restored sessions
- logout
- desktop navigation
- mobile drawer open and close
- active route state
- role-restricted routes
- browser back and forward navigation
- all route renderers
- bill search and filters
- bill creation and editing
- vendor and product controls
- price and unit calculations
- admin workflows
- desktop, tablet, and mobile layouts
- no horizontal shell overflow
- no duplicate listeners
- no console errors
- hard refresh loads the current asset versions

## 11. Documentation authority

When documents conflict, use this order:

1. `ARCHITECTURE.md`
2. `DESIGN-RULES.md`
3. `CSS-OWNERSHIP.md`
4. `AI_RULES.md`
5. `README.md`
6. historical implementation notes

Documentation must be updated when ownership changes. A legacy implementation does not override this canonical architecture.