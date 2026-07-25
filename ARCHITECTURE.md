# White Saffron Procurement ERP — Runtime Architecture

This document records the currently deployed browser architecture. It exists to prevent older modules from being removed or reactivated without understanding which functions they still provide.

## Application shell

`index.html` owns:

- login and application containers
- sidebar and top bar
- `#content`
- Supabase browser client
- global `state`
- shared helpers such as `esc`, `num`, and `money`
- final CSS and JavaScript load order

All pages render into:

```html
<div id="content"></div>
```

## JavaScript load order

The browser loads modules in this order:

1. `view-renderers.js`
2. `bill-delete-fix.js`
3. `rates-legacy-compatibility.js`
4. `rates-page.js`
5. `vendor-bill-management.js`
6. `bill-date-sort.js`
7. `vendor-name-normalization.js`
8. `settings-page.js`
9. `session-authentication.js`
10. `view-registry.js`
11. `procurement-rebuild-v3.js`
12. `procurement-pages-v4.js`
13. `recovery-v5.js`
14. `bills-period-filter-v5.js`
15. `admin-manage-v5.js`
16. `vendors-settings-v6.js`
17. `site-audit-v7.js`
18. `product-editor-v8.js`
19. `ui-foundation.js`
20. `hash-router.js`
21. `application-controller.js`

Later renderer definitions take precedence over earlier definitions.

## Module classifications

### Current overrides

- `site-audit-v7.js`
  - final Bills renderer
  - final Products renderer before catalogue metadata enhancement
  - final Vendors renderer
  - date normalization and Bills activity sorting
  - runtime error collection
- `product-editor-v8.js`
  - catalogue metadata editor
  - Price Intelligence and Products enhancement
  - loaded-asset console audit

### Transition overrides

- `procurement-rebuild-v3.js`
  - Price Intelligence
  - Reports
  - product/rate aggregation helpers
- `procurement-pages-v4.js`
  - earlier Bills, Vendors, Settings and Admin implementations
  - retained until dependencies are fully extracted
- `recovery-v5.js`
  - Dashboard
- `bills-period-filter-v5.js`
  - earlier Bills period implementation; currently overridden by V7
- `admin-manage-v5.js`
  - Admin page and account panel
- `vendors-settings-v6.js`
  - Settings page; Vendors implementation is overridden by V7

### Base and compatibility modules

These files should not be deleted solely because their page renderer is overridden. They may still provide bill-entry, data-normalization, or compatibility behavior:

- `view-renderers.js`
- `rates-page.js`
- `vendor-bill-management.js`
- `bill-date-sort.js`
- `vendor-name-normalization.js`
- `settings-page.js`
- `bill-delete-fix.js`
- `rates-legacy-compatibility.js`

### Core lifecycle modules

- `session-authentication.js`
- `view-registry.js`
- `ui-foundation.js`
- `hash-router.js`
- `application-controller.js`

## CSS load order

1. `procurement-ui.css`
2. `ui-structure.css`
3. `alignment-system.css`
4. `procurement-rebuild-v3.css`
5. `procurement-pages-v4.css`
6. `recovery-v5.css`
7. `admin-manage-v5.css`
8. `vendors-settings-v6.css`
9. `site-audit-v7.css`
10. `product-editor-v8.css`

The last matching selector wins. V7 is the current shared visual authority; V8 owns only product-editor presentation.

## Route ownership

| Hash | Page | Final owner |
|---|---|---|
| `#dashboard` | Dashboard | `recovery-v5.js` |
| `#bills` | Bills list | `site-audit-v7.js` |
| `#new` | Bill entry/edit | base renderer stack |
| `#rates`, `#prices` | Price Intelligence | `procurement-rebuild-v3.js` + `product-editor-v8.js` |
| `#products` | Products | `site-audit-v7.js` + `product-editor-v8.js` |
| `#vendors` | Vendors | `site-audit-v7.js` |
| `#reports` | Reports | `procurement-rebuild-v3.js` |
| `#settings` | Settings | `vendors-settings-v6.js` |
| `#admin` | Admin | `admin-manage-v5.js` |

## Console verification

Run:

```js
WSAssetAudit()
```

This returns and prints all loaded script and stylesheet assets with their classification.

Check runtime errors:

```js
window.__WS_SITE_AUDIT__.errors
```

Check active module markers:

```js
({
  v3: window.__WS_PROCUREMENT_REBUILD__,
  v4: window.__WS_PROCUREMENT_PAGES_V4__,
  v5: window.__WS_RECOVERY_V5__,
  v6: window.__WS_VENDORS_SETTINGS_V6__,
  v7: window.__WS_SITE_AUDIT__,
  v8: window.__WS_PRODUCT_EDITOR__
})
```

## Safe cleanup rule

Do not delete a legacy or transition file merely because its renderer is not final. Before removal:

1. Search for globals, helper functions, event handlers, and DOM IDs it defines.
2. Verify no later module calls those functions.
3. Remove the script from a test branch first.
4. Test every route and bill create/edit/delete flow.
5. Confirm the console audit and runtime error list are clean.
6. Only then remove the file from the repository.

## Product metadata limitation

There is no dedicated Supabase products table. Catalogue edits currently use local storage and do not alter historical bill items. This is intentional until a controlled database migration is implemented.