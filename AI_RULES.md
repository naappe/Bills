# White Saffron Procurement ERP
## AI Development Rules

---

# Mission

Build and maintain a professional Procurement ERP.

Priority:

1. Reliability
2. Accuracy
3. Speed
4. User Experience
5. Visual Quality

A stable working system is always more important than a large redesign.

---

# Golden Rule

Never overwrite or replace working functionality without user approval.

If an existing function works correctly:

- Extend it.
- Fix it.
- Improve it.

Do NOT replace it.

Preserve working behavior over rewriting. The objective is to fix or extend the existing system, not replace it. The smallest safe change is always preferred.

---

# Protected Website Baseline

The current production website is the protected baseline.

When a page already contains working fields, controls, calculations, actions, layout regions, responsive behavior, or navigation:

- Keep them in place.
- Do not replace them with a newly invented page or component.
- Do not restore an older page version.
- Do not copy a different page frame over the existing page.
- Do not remove a field merely because a simplified design looks cleaner.
- Do not change a working workflow while fixing spacing, typography, alignment, or color.
- Do not combine a visual correction with structural or functional changes.

Existing page structure is authoritative unless the user explicitly approves a redesign or upgrade.

Future work must be incremental. Additions must extend the existing page rather than replace it.

Before editing a page, inventory and preserve:

- Existing fields and field IDs
- Buttons and actions
- Event handlers
- Validation
- Calculations
- Save and edit wiring
- Routes and links
- Role restrictions
- Responsive layout
- Data attributes and DOM contracts
- Existing user-visible information

A visual update must not cause any of these to disappear, move into a different workflow, or become disconnected.

---

# Master Styling Contract

Typography, spacing, field height, padding, card geometry, buttons, inputs, labels, tables, badges, modals, and responsive behavior must be controlled by the shared master CSS layers.

Page-specific CSS may only handle layout or behavior unique to that page.

Do not redefine shared visual properties inside individual page files when a master token or shared component already exists.

The master styling contract must provide consistent:

- Font family
- Font sizes
- Font weights
- Line heights
- Input and select heights
- Label spacing
- Field padding
- Button sizes
- Card padding
- Section gaps
- Border radii
- Borders and shadows
- Table density
- Mobile spacing
- Focus states
- Disabled states

When one page looks inconsistent, fix or extend the shared master rule only after confirming the change is safe for all pages. Do not overwrite individual page structure to force consistency.

Shared CSS changes require cross-page review because they can affect every route.

---

# Permission Required

Before changing any existing working function, logic, workflow, UI component, database behavior, or architecture, always ask permission.

State clearly:

- Files affected
- Functions affected
- Reason for the change
- Existing behavior that may be affected
- Possible side effects
- Safer or smaller alternative, if available

Wait for approval before proceeding.

---

# Allowed Without Permission

Only small, isolated fixes that preserve current behavior may be made immediately.

Examples:

- Console errors
- Runtime errors
- Syntax errors
- CSS alignment defects
- Responsive layout defects
- Cache/version updates
- Missing event handlers
- Null or undefined protection
- Typographical corrections
- Broken links
- Browser compatibility fixes
- Small isolated bug fixes

Only modify the affected code. Do not combine the fix with redesign, refactoring, cleanup, renaming, or unrelated improvements.

---

# Never Without Permission

Do NOT:

- Rewrite files
- Replace working functions
- Refactor working code
- Rename functions
- Rename files
- Rename folders
- Change folder structure
- Replace UI components
- Rewrite authentication
- Rewrite routing
- Rewrite calculations
- Rewrite database logic
- Change Supabase schema
- Change RLS policies
- Change permissions
- Remove existing features
- Delete data
- Create duplicate implementations
- Introduce a new framework or library
- Change established business rules

---

# Core Protected Areas

The following require explicit approval before modification:

- `index.html`
- `app/js/main.js`
- `app/js/data.js`
- `app/js/router.js`
- `app/js/store.js`
- Authentication logic
- Supabase configuration
- Database queries
- Price calculations
- Bill calculations
- Navigation system
- User-role logic
- Stock logic
- Vendor logic
- Product logic
- Price Intelligence logic

A protected file may still receive an approved isolated fix, but no broad rewrite is allowed.

---

# Reuse Before Creating

Before writing new code:

1. Search for an existing function or component.
2. Reuse it if suitable.
3. Extend it if necessary.
4. Create new code only when no safe reusable implementation exists.

Never duplicate business logic, event handlers, rendering logic, calculations, styles, or constants.

---

# Bug Fix Policy

Fix only the reported issue.

Do not redesign unrelated areas.

Do not clean unrelated code.

Do not change styling outside the affected component.

Do not rename unrelated variables or functions.

Do not modify another module unless the reported issue directly depends on it.

One bug = one fix.

---

# UI Consistency

Do not create a new visual pattern when an existing one can be reused.

Always reuse the established:

- Buttons
- Cards
- Tables
- Inputs
- Dropdowns
- Badges
- Modals
- Colors
- Typography
- Spacing
- Shadows
- Borders
- Icons
- Responsive behavior

Do not apply broad page-wide color changes without approval.

Do not use grey as the default background for the whole website unless explicitly requested.

---

# Business Logic Protection

Every change must preserve:

- Procurement workflow
- Bill entry
- Bill totals
- Unit conversion
- Pack parsing
- Per-KG, per-G, per-L, per-ML, and per-PCS calculations
- Vendor management
- Product management
- Price Intelligence
- Stock updates
- User roles
- Authentication
- Existing records and historical data

No update should break another module.

---

# Database Safety

Never, without explicit approval:

- Rename tables
- Rename columns
- Delete columns
- Change column types
- Change primary or foreign keys
- Modify authentication
- Modify RLS policies
- Delete records
- Truncate tables
- Change production data
- Add destructive migrations

Any database proposal must include:

- Exact SQL
- Tables affected
- Risk assessment
- Rollback plan
- Expected application changes

---

# Performance Rules

Every change must:

- Avoid duplicate event listeners
- Avoid duplicate rendering
- Avoid unnecessary DOM updates
- Avoid unnecessary Supabase requests
- Avoid repeated authentication requests
- Avoid loading unused libraries
- Avoid memory leaks
- Avoid unnecessary reflows
- Avoid large blocking scripts
- Preserve fast navigation
- Preserve mobile performance

Do not introduce new polling, intervals, observers, or background requests without approval.

---

# Browser Compatibility

Every update must work in:

- Chrome
- Edge
- Firefox
- Safari
- Mobile Chrome
- Mobile Safari

Avoid browser-specific hacks unless they are documented and approved.

---

# Git Workflow

- One logical change per commit.
- Never mix bug fixes with UI redesign.
- Never mix refactoring with a feature change.
- Never commit unfinished or unverified code.
- Commit only the files required for the task.
- Commit messages must describe exactly what changed.
- Do not force-push, rewrite history, or delete branches without approval.

Recommended commit formats:

- `fix(scope): description`
- `feat(scope): description`
- `docs: description`
- `refactor(scope): description`
- `perf(scope): description`

---

# Before Every Commit

Verify:

- Existing features still work
- No console errors
- No runtime errors
- No uncaught promise rejections
- Navigation works
- Search works
- Filters work
- Bill entry works
- Vendor selection works
- Product selection works
- Calculations remain accurate
- Mobile layout works
- Desktop layout works
- Authentication works
- User-role restrictions work
- No duplicate listeners
- No duplicate requests
- No broken routes
- No unnecessary file changes
- Hard refresh loads the newest assets
- Cache-busting version is updated when necessary

---

# Testing Evidence

Before claiming a fix is complete, provide evidence such as:

- Files changed
- Functions changed
- Test performed
- Expected result
- Actual result
- Console status
- Commit SHA

Do not claim something is fixed if it was not verified.

If verification is not possible, state that clearly.

---

# Documentation

Whenever functionality changes, update the relevant documentation:

- `README.md`
- `AI_RULES.md`
- `WEBSITE_UPDATE.md`
- `CHANGELOG.md`, if present

Documentation must match the actual implementation.

Do not document a feature that was not implemented.

---

# Code Quality

- Keep functions focused.
- Use clear, descriptive names.
- Keep one responsibility per function.
- Avoid deeply nested logic.
- Avoid global variables unless already part of the architecture.
- Remove dead code only when approved or directly related to the fix.
- Do not leave temporary console logs.
- Do not leave debug scripts in production.
- Do not leave commented-out replacement code.
- Avoid magic numbers and duplicated constants.
- Preserve existing public interfaces unless approval is given.

---

# Temporary Workarounds

Temporary workarounds must be:

- Clearly labeled
- Limited to the affected issue
- Documented with the reason
- Safe to remove later
- Approved if they alter normal behavior

Do not leave multiple competing fixes for the same issue.

---

# Cache and Deployment Safety

When JavaScript or CSS changes:

- Update the relevant cache-busting version only when required.
- Do not change every asset version unnecessarily.
- Confirm GitHub Pages is serving the new file.
- Confirm hard refresh loads the updated asset.
- Do not add inline production patches when the correct source file can be safely fixed.
- Remove temporary inline patches after the permanent fix is verified.

---

# Scope Control

Before editing, define:

- Requested problem
- Exact affected component
- Expected behavior
- Files required
- Files explicitly excluded

Do not expand the scope without permission.

---

# Emergency Rule

If uncertain:

STOP.

Do not guess.

Explain:

- What is uncertain
- Files involved
- Functions involved
- Reason for the uncertainty
- Risks
- Possible solutions
- Recommended safest option

Wait for approval.

---

# Development Philosophy

The goal is not to rewrite.

The goal is to preserve, improve, and extend.

Prefer the smallest safe change.

Protect working functionality.

Every update should leave the system more stable than before.