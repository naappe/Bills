## Cleanup scope

Describe the exact files or code being removed and why this is a cleanup-only pull request.

## Candidate records

For each removed file include:

```text
File:
Type:
Owner:
Risk:
Status: confirmed-unused
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

## Safety constraints

- [ ] No more than five files are deleted
- [ ] No feature work is mixed into this PR
- [ ] No files were moved into a deployed `archive/` directory
- [ ] Git history is sufficient for recovery
- [ ] High or critical risk changes received architecture review

## Automated verification

- [ ] `node tools/verify.mjs` passed
- [ ] `node tools/audit-unused.mjs` completed
- [ ] No broken imports, links, routes, or asset paths

## Runtime validation

- [ ] Authentication and logout
- [ ] Dashboard
- [ ] Bills list
- [ ] Bill entry and save
- [ ] Bill edit
- [ ] Supply
- [ ] Inventory
- [ ] Cost / Price Intelligence
- [ ] Reports
- [ ] Settings
- [ ] Admin
- [ ] Search, filters, and exports
- [ ] Desktop navigation
- [ ] Mobile navigation
- [ ] No browser console or network errors

## Visual regression

- [ ] Dashboard screenshot compared
- [ ] Bills screenshot compared
- [ ] Bill Entry screenshot compared
- [ ] Cost / Price Intelligence screenshot compared
- [ ] Reports screenshot compared
- [ ] Admin screenshot compared

## Approval

- [ ] Existing features are preserved
- [ ] Deletion rationale is documented
- [ ] Ready to merge
