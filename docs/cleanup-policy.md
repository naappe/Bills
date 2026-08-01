# White Saffron ERP Cleanup Policy

## Purpose

This policy governs removal of unused files and code from the White Saffron Procurement ERP. Cleanup work must be isolated from feature work and must preserve authentication, billing, routing, Supabase compatibility, responsive behavior, and GitHub Pages deployment.

## Branching

- Audit branch: `audit/unused-code-report`
- Cleanup branches: `cleanup/unused-files-batch-01`, `cleanup/unused-files-batch-02`, etc.
- Never mix cleanup deletions into feature pull requests.
- Do not create an `archive/` directory in the deployed repository. Git history is the recovery mechanism.

## Candidate lifecycle

`candidate -> review-required -> confirmed-unused -> deleted on cleanup branch -> verified -> merged`

A file must not be deleted merely because it has no obvious static reference.

## Classification statuses

- `required`: core entry point, runtime, data, authentication, save, routing, verification, or deployed asset.
- `referenced`: statically imported or linked.
- `runtime-only`: used through templates, selectors, generated DOM, routes, dynamic paths, or browser behavior.
- `legacy-protected`: required by `tools/verify.mjs` or an explicit compatibility contract.
- `review-required`: no reliable static reference; manual review is mandatory.
- `confirmed-unused`: all checks completed and deletion approved.

## Risk levels

- `low`: isolated image, icon, duplicate documentation asset.
- `medium`: page CSS, helper module, utility, optional asset.
- `high`: router, shared store, reports, shared UI, role logic.
- `critical`: `index.html`, `main.js`, Supabase/data layer, authentication, bill entry/save logic, verification workflow.

High and critical files require architecture review before removal.

## Required audit record

For every candidate record:

```text
File:
Type:
Owner:
Risk:
Status:
Imported by:
Uses:
DOM references:
UI dependencies:
Routes affected:
Verification dependency:
Runtime dependency:
Reason:
Replacement:
Commit:
Verified by:
Verification result:
```

## Confirmed-unused criteria

All conditions must be true:

- No ES module import or HTML reference.
- No dynamic route, template-string, or generated-path reference.
- No CSS `url(...)`, selector, icon, font, or asset reference.
- No DOM contract through IDs, classes, `data-*`, `querySelector`, or `getElementById`.
- No dependency in `tools/verify.mjs` or GitHub Actions.
- No authenticated runtime use in browser testing.
- No documented operational or planned purpose.
- A replacement, if any, is already deployed and verified.

## Batch limits

- Maximum five deleted files per cleanup PR.
- Prefer one logical subsystem per batch.
- Keep CSS and JavaScript removals separate when practical.

## Required validation

Run:

```bash
node tools/verify.mjs
node tools/audit-unused.mjs
```

Manually validate:

- Authentication and logout
- Dashboard
- Bills list
- Bill entry and save
- Bill edit
- Supply
- Inventory
- Cost / Price Intelligence
- Reports
- Settings
- Admin
- Search and filters
- Exports
- Desktop and mobile navigation
- Browser console and network errors

## Visual regression

Capture and compare screenshots for Dashboard, Bills, Bill Entry, Cost / Price Intelligence, Reports, and Admin after each deletion batch. A passing syntax check does not prove visual stability.

## Merge checklist

- [ ] Syntax verification passed
- [ ] Repository stability verification passed
- [ ] Audit report reviewed
- [ ] Routes tested
- [ ] Authenticated runtime tested
- [ ] No console errors
- [ ] Desktop checked
- [ ] Mobile checked
- [ ] Screenshots compared
- [ ] Existing features preserved
- [ ] Deletion rationale recorded
- [ ] Ready to merge
