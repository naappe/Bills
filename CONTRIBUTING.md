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
- Price Intelligence
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
