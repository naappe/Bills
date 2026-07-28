# Contributing to White Saffron Procurement ERP

This repository is an internal procurement application. Changes should prioritize data integrity, clear purchasing workflows, predictable permissions, and stable GitHub Pages deployment.

## Before editing

1. Fetch the current file from the default branch.
2. Read `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `ROADMAP.md`, and `CHANGELOG.md`.
3. Confirm the current deployed version in `index.html`.
4. Identify the authoritative module for the route being changed.
5. Check whether the change affects historical bill records, calculations, permissions, or Supabase policies.
6. Create a backup or checkpoint before destructive or architectural work.

Never replace a repository file using incomplete content. Large-file updates must contain the complete intended file.

# Architecture rules

- `index.html` owns the application shell and asset imports.
- `app/js/main.js` owns application boot and authentication lifecycle.
- `app/js/router.js` owns hash routing and route metadata.
- `app/js/data.js` owns Supabase bill access and mutations.
- `app/js/store.js` owns shared browser state and formatting helpers.
- Dedicated page modules should own complex route-specific behavior.
- Avoid creating multiple competing renderers for the same route.
- Avoid adding global functions unless compatibility or diagnostics require them.
- Document any intentional global API.

# Rapid error log and fix playbook

Every newly discovered defect must be recorded here immediately with:

- symptom
- affected route and file
- likely cause
- permanent fix
- verification steps
- deployment version
- rollback note when relevant

Do not add temporary guard files, duplicate event systems, or second implementations of the same feature unless the existing implementation is first removed or intentionally deprecated.

## Active and recurring errors

### 1. Bill Entry fields flash and immediately lose focus

**Symptoms**

- Vendor suggestions, date picker, payment selects, unit select, or product suggestions appear briefly and close.
- Text inputs cannot retain focus long enough to type.
- The issue may affect every field on `#new`, not only the vendor field.

**Likely causes**

- A document-level `click`, `pointerdown`, `focus`, `blur`, or capture-phase listener is interfering with native form controls.
- A route renderer or global handler is re-rendering `#content` after a normal field interaction.
- Duplicate Bill Entry event systems are both handling the same event.
- A custom dropdown overlay is closing on the same pointer event used to open or select it.

**Permanent fix**

1. Keep Bill Entry interaction logic inside `app/js/bill-entry.js`.
2. Do not re-render the route on ordinary field interaction.
3. Use native inputs, `select`, `datalist`, and date controls unless a custom component is fully keyboard accessible and isolated.
4. Avoid capture-phase document handlers for form controls.
5. Remove duplicate `blur` logic that triggers product selection or route updates.
6. Test every field in one pass: vendor, date, bill number, TIN, mobile, location, payment status, payment method, category, product, pack, unit, quantity, rate, GST, notes.

**Verify**

- Click each field and keep it active for at least five seconds.
- Type into every text and number input.
- Open and select every native `select`.
- Open the browser date picker and choose a date.
- Select vendor and product suggestions.
- Confirm `document.activeElement` remains the clicked control until the user clicks elsewhere.

### 2. Add Row does not work

**Symptoms**

- Clicking `#addRow` does nothing.
- A row appears but lacks product autofill or live calculations.
- Multiple rows are added from one click.

**Likely causes**

- The listener was bound before the Bill Entry DOM existed.
- A capture listener stops propagation.
- A second guard module competes with `bill-entry.js`.
- New rows use different markup from the authoritative `rowTemplate()`.

**Permanent fix**

- Keep one `rowTemplate()` and one Add Row handler inside `bill-entry.js`.
- Prefer event delegation on `#billItems` for dynamic rows.
- Newly added rows must use the same product intelligence, pack parsing, unit conversion, GST calculation, remove behavior, and validation as the first row.
- Never create a separate `bill-entry-guard.js` or equivalent duplicate implementation.

**Verify**

- One click adds exactly one row.
- The new product field receives focus.
- Vendor-specific product suggestions work in the new row.
- Totals update while typing.
- Remove works for original and added rows.

### 3. New Bill button does not navigate

**Symptoms**

- `+ New Bill` appears clickable but does not open `#new`.
- Clicking the active route does nothing.

**Likely causes**

- Conflicting page-level and global route handlers.
- `location.hash` is already `#new` and no re-render occurs.
- A transparent element overlays the button.
- A prior JavaScript error stopped handler registration.

**Permanent fix**

- Route all `data-route` controls through the single router API.
- The router must explicitly re-render when navigating to the current route.
- Remove page-specific copies of route handling.
- Check for layout overlays with DevTools hit testing.

**Verify**

- Bills → New Bill.
- Dashboard → New Bill where available.
- Cancel and Close return to Bills.
- Browser Back works.
- Refresh on `#new` restores Bill Entry.

### 4. Vendor cannot be selected

**Symptoms**

- Suggestions appear but clicking one does not set the value.
- Vendor field flashes or closes immediately.
- TIN, mobile, and location do not populate.

**Likely causes**

- Custom vendor picker conflicts with native `datalist`.
- `blur` closes a custom list before selection completes.
- Vendor aliases are matched only by raw name.
- Multiple vendor picker modules are loaded.

**Permanent fix**

- Use one vendor selection implementation only.
- Prefer native `datalist` for the current architecture.
- Canonical matching should prioritize TIN, mobile, then normalized name.
- After selection, dispatch one change path and populate saved metadata without clearing user-entered values unnecessarily.

**Verify**

- Select an existing vendor with mouse and keyboard.
- Type and keep a new vendor name.
- Confirm TIN, mobile, and location autofill for known vendors.
- Confirm aliases and exact original supplier text are preserved.

### 5. Product suggestion cannot be selected or loses autofill

**Symptoms**

- Product suggestion closes before selection.
- Product name is selected but pack, unit, prior rate, or GST do not populate.
- Added rows behave differently from the first row.

**Likely causes**

- Product logic runs on `blur` before the browser commits the datalist value.
- New rows are created by different markup or a guard module.
- Vendor-specific catalogue filtering is stale.

**Permanent fix**

- Run product matching on `change` and controlled input events, not destructive blur handling.
- Reuse the same row creation and binding logic for every row.
- Refresh product suggestions after vendor changes.

**Verify**

- Select a known product in the first and later rows.
- Confirm pack, unit, previous rate, GST, and hint text populate consistently.
- Confirm unknown products remain editable and are learned only after a successful save.

### 6. Mixed asset versions or stale service-worker code

**Symptoms**

- `main.js` loads one version while `router.js` or page modules load another.
- A fixed bug remains after deployment.
- Network panel shows old files from Service Worker.

**Likely causes**

- Asset query versions were not updated everywhere.
- Old application shell cache remains active.
- Service worker cached a deleted file.

**Permanent fix**

1. Update the version consistently in `index.html`, `main.js`, `router.js`, routed module imports, manifest, and `sw.js`.
2. Use a new cache name for every release that changes runtime behavior.
3. Remove deleted files from the application shell.
4. Prefer network-first navigation and avoid caching Supabase data.

**Verify**

- Network panel shows one version across all local assets.
- Old cache names are deleted during service-worker activation.
- A hard refresh is not required after the new service worker controls the page.

### 7. Bill Entry audit reports missing form or undefined functions

**Symptoms**

- `#billForm`, `#billItems`, totals, and `#addRow` are reported missing.
- `window.parsePack`, `window.money`, or other helpers are reported undefined.

**Likely causes**

- The audit ran on a route other than `#new`.
- The audit assumes ES-module functions must exist on `window`.
- The audit checks View Source instead of the rendered DOM.

**Permanent fix**

- Audit the active SPA route and rendered DOM.
- Do not require module-private functions to be global.
- Add explicit diagnostics only when needed, and document any global API.

**Verify**

On `#new`, confirm:

- `document.querySelector('#billForm')`
- at least one `.bill-row`
- `#addRow`
- `#subtotal`
- `#gstTotal`
- `#grandTotal`

### 8. Sidebar collapse leaves a large empty column

**Symptoms**

- Labels disappear, but the sidebar keeps its full width.
- Main content does not expand after collapse.

**Likely cause**

- Fixed desktop sidebar width overrides the collapsed width.

**Permanent fix**

- Update both sidebar width and main-content offset in the collapsed state.
- Keep mobile drawer behavior independent of desktop collapse.

**Verify**

- Expanded width is correct.
- Collapsed width is approximately icon-only size.
- Main content expands without horizontal overflow.
- Reload preserves the chosen state.

### 9. Buttons work on one render and fail after navigation

**Symptoms**

- Edit, Delete, Add Row, filters, or modal controls stop after revisiting a route.

**Likely causes**

- Listeners are attached to old DOM nodes.
- The route is rendered repeatedly without cleanup.
- Multiple handlers are accumulated.

**Permanent fix**

- Bind route-specific listeners after rendering.
- Prefer delegation on a stable route container for dynamic controls.
- Avoid permanent global listeners for route-only behavior.
- Ensure repeated route entry creates exactly one active listener set.

**Verify**

- Open and leave each route at least three times.
- Repeat each key action after every return.
- Confirm no duplicate saves, deletes, row additions, or modal openings.

### 10. Performance advice does not fit GitHub Pages

**Symptoms**

- Recommendations mention `.htaccess`, PHP, Node.js, Nginx, or server-side compression settings.

**Correct interpretation**

- GitHub Pages controls server configuration and TTFB.
- Console scripts cannot permanently improve TTFB.
- Runtime script replacement can break authentication and routing.

**Permanent fixes available in this project**

- Minimize render-blocking assets.
- Defer noncritical CSS and JavaScript carefully.
- Reduce initial Supabase work.
- Use consistent cache versioning.
- Optimize images and DOM size.
- Remove duplicate listeners and unnecessary full-table aggregation.

## Immediate incident procedure

When a user reports a live defect:

1. Reproduce on the exact route and browser width.
2. Record the visible symptom precisely.
3. Check Console for the first error, not only later cascading errors.
4. Check Network for failed or mixed-version assets.
5. Inspect `document.activeElement` for focus bugs.
6. Confirm whether `#content` is being replaced during interaction.
7. Identify the one authoritative module.
8. Remove conflicting old code before adding new code.
9. Update the minimum necessary files.
10. Update `CHANGELOG.md` and this error section.
11. Bump all deployment and cache versions consistently.
12. Verify the exact reported behavior before declaring it fixed.

## Prohibited emergency patterns

Do not:

- add a second Bill Entry implementation
- use `stopImmediatePropagation()` broadly on document events
- observe the entire document tree when a route container is sufficient
- expose private module functions globally only to satisfy a faulty audit
- cache authenticated Supabase responses in the service worker
- keep deleted runtime files in the application shell
- claim a live database mutation passed without executing it
- fix one field while leaving the same focus bug on the rest of the form

# JavaScript standards

## General

- Use ES modules.
- Prefer `const`; use `let` only when reassignment is necessary.
- Keep functions focused and named by purpose.
- Validate external and form data before calculations.
- Escape user-controlled text before inserting it into HTML.
- Handle asynchronous errors and show useful UI feedback.
- Do not swallow Supabase errors silently.
- Keep currency formatting in MVR using the shared helper.

## Data access

- Use `data.js` for bill reads and writes.
- Do not scatter duplicate Supabase clients across modules.
- Do not expose service-role credentials.
- Treat the browser store as a cache, not the permanent source of truth.
- Update local store state only after a successful database operation.

## Calculations

Procurement calculations must be reproducible and testable.

- Normalize numeric strings safely.
- Reject or flag invalid zero denominators.
- Preserve entered values and original units.
- Compare prices only after converting to equivalent base units.
- Keep sufficient precision internally; round only for display where appropriate.
- Distinguish pack rate, base-unit rate, small-unit rate, GST, and line total.
- Do not infer missing units when the evidence is ambiguous.

# CSS and design standards

- Reuse variables and shared components from `app/css/app.css`.
- Keep module styles in their dedicated stylesheet.
- Avoid inline styles unless the value is truly dynamic or part of the permanent shell.
- Use consistent spacing, control height, border radius, and shadows.
- Preserve readable contrast and visible focus states.
- Use standard text sizes; avoid oversized headings and cramped labels.
- Test at desktop, tablet, and mobile widths.
- Tables must degrade gracefully into scrollable or card-based mobile layouts.
- Do not introduce a new visual theme for a single page.

# Accessibility

- Use semantic buttons for actions.
- Use labels for form controls.
- Maintain keyboard focus visibility.
- Give icon-only controls accessible names.
- Do not rely on color alone to communicate status.
- Ensure dialogs can be closed and do not trap users unintentionally.
- Keep text and controls readable at browser zoom levels.

# Product images

- Prefer exact recorded or approved catalogue images.
- Clearly label illustrative placeholders.
- Never present an unrelated generated or stock image as exact supplier product photography.
- Image metadata changes must not rewrite historical bill evidence.

# Vendor identity

Canonical vendor matching should prioritize:

1. TIN
2. Mobile number
3. Normalized name

Do not automatically merge vendors when identifiers conflict. Preserve aliases and original bill supplier text.

# Roles and security

- Hidden buttons are not security controls.
- Supabase RLS must enforce permissions.
- Never commit passwords, private tokens, service-role keys, or sensitive exports.
- Admin-only analytics and settings must be protected consistently.
- Review delete behavior carefully; deletion may require audit or soft-delete policies in future versions.

# Git workflow

Use a focused branch for risky work when available.

Recommended commit prefixes:

```text
feat: add supplier price comparison
fix: correct bill-date filtering
refactor: extract price calculations
perf: reduce initial bill loading
style: align vendor cards
docs: update database migration plan
test: add unit conversion cases
chore: update deployment metadata
```

Keep each commit focused. Do not combine unrelated visual, database, and architectural changes unless they are inseparable.

# Pull request or review description

Include:

- problem being solved
- files changed
- user-visible behavior
- data or schema impact
- role/permission impact
- calculation rules
- test evidence
- screenshots for visual changes
- rollback notes for risky changes

# Testing checklist

## Core lifecycle

- login succeeds
- invalid login shows an understandable error
- session restoration works after refresh
- sign-out returns to login
- no unexpected console errors

## Navigation

- Dashboard
- Bills
- New Bill
- Cost
- Products
- Vendors
- Reports
- Settings
- Admin
- unknown route fallback
- active navigation state
- mobile sidebar behavior

## Bills

- create bill
- edit bill
- delete bill with authorized role
- search
- date filtering
- payment status filtering
- bill date display
- last-edited display
- totals and GST calculations
- unit and pack calculations

## Bill Entry interaction

- every field retains focus
- vendor suggestion can be selected
- product suggestion can be selected
- date picker stays open
- payment and unit selects stay open
- Add Row adds exactly one row
- Remove Row works for every row
- dynamic rows retain product intelligence
- live subtotal, GST, and grand total update
- Review modal opens once
- save executes once
- Cancel and Close navigate once
- repeated entry to `#new` does not accumulate listeners

## Products

- search
- category filter
- active filter
- card/list toggle
- latest price
- base-unit price
- vendor count
- purchase count
- purchase-history modal
- metadata editing for authorized users
- image fallback behavior

## Vendors

- search
- canonical grouping
- TIN/mobile/name matching
- spend totals
- paid and pending totals
- product count
- bill count
- aliases and duplicate indicators
- bill-history modal
- metadata editing for authorized users

## Responsive review

Test at representative widths:

- mobile: approximately 360–430 px
- tablet: approximately 768–1024 px
- desktop: 1280 px and above

Also test browser zoom at 80%, 100%, and 125% when layout changes affect dense forms or tables.

# Performance review

Before merging performance-sensitive changes:

- check initial load time
- count Supabase requests
- avoid repeated authentication calls
- avoid repeated full-table aggregation where caching is safe
- inspect DOM size
- confirm filters do not trigger unnecessary reloads
- verify no stale asset is masking results

# Documentation requirement

Update documentation in the same release when changing:

- route ownership
- application lifecycle
- database schema
- roles or permissions
- calculations
- deployment process
- roadmap status
- known limitations

At minimum, update `CHANGELOG.md`. Architectural or database changes also require updates to their dedicated documents.

# Definition of done

A change is complete when:

- intended behavior works
- edge cases are handled
- calculations are verified
- permissions are enforced appropriately
- responsive layouts are reviewed
- console and network errors are checked
- documentation is current
- deployment versioning and cache behavior are correct
- rollback or recovery is understood for risky changes
