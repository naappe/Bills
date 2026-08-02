# White Saffron Procurement ERP v1.0 Release Checklist

Release candidate branch: `release/v1.0-rc1`

Target release: **White Saffron Procurement ERP v1.0 – Read-only Foundation**

## Release rules

During stabilization, only validation, bug fixes, accessibility fixes, performance fixes, UI consistency fixes, and documentation updates are allowed. New features, CRUD work, schema changes, RLS changes, OCR, attachments, and approval workflows are blocked until v1.0 is released.

## 1. Route validation

| Module | Opens | Data loads | UI renders | Pass |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ☐ | ☐ | ☐ | ☐ |
| Bills | ☐ | ☐ | ☐ | ☐ |
| Supply | ☐ | ☐ | ☐ | ☐ |
| Inventory | ☐ | ☐ | ☐ | ☐ |
| Cost | ☐ | ☐ | ☐ | ☐ |
| Reports | ☐ | ☐ | ☐ | ☐ |
| Settings | ☐ | ☐ | ☐ | ☐ |
| Admin | ☐ | ☐ | ☐ | ☐ |

## 2. Functional validation

- [ ] Dashboard KPIs match live data
- [ ] Dashboard refresh works
- [ ] Bills search works
- [ ] Bills pagination works
- [ ] Bills CSV export works
- [ ] Bills detail modal works
- [ ] Supply search works
- [ ] Supply pagination works
- [ ] Inventory filters work
- [ ] Inventory pagination works
- [ ] Inventory CSV export works
- [ ] Inventory detail modal works
- [ ] Cost filters work
- [ ] Cost calculations are correct
- [ ] Cost CSV export works
- [ ] Reports date filters work
- [ ] Reports summaries are correct
- [ ] Reports CSV exports work
- [ ] Settings save works
- [ ] Settings reset works
- [ ] Admin refresh works

## 3. Preference validation

- [ ] System theme works
- [ ] Light theme works
- [ ] Dark theme works
- [ ] Comfortable density works
- [ ] Compact density works
- [ ] Page size 20 works
- [ ] Page size 50 works
- [ ] Page size 100 works
- [ ] Preferences persist after reload
- [ ] Developer Mode preference persists

## 4. Responsive validation

Test at desktop, tablet, and mobile widths.

- [ ] Desktop navigation works
- [ ] Mobile drawer works
- [ ] KPI grids wrap correctly
- [ ] Toolbars wrap correctly
- [ ] Tables remain usable
- [ ] Pagination remains usable
- [ ] Modals fit the viewport
- [ ] No horizontal layout overflow outside tables

## 5. Accessibility validation

- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Form controls have labels
- [ ] Dialog controls are accessible
- [ ] Color contrast is acceptable
- [ ] Escape closes modal, drawer, and Developer Mode

## 6. Technical validation

- [ ] No JavaScript console errors
- [ ] No unhandled promise rejections
- [ ] No failed authenticated Supabase requests
- [ ] No missing assets
- [ ] No broken routes
- [ ] No CSS variable failures

## 7. Performance validation

- [ ] Initial load is acceptable
- [ ] Route switching is responsive
- [ ] Theme switching is stable
- [ ] Density switching is stable
- [ ] Table rendering is responsive
- [ ] No material layout shifts

## 8. Release decision

The release may be tagged only when:

- all checklist items pass;
- no Critical defects remain;
- no High defects remain;
- deferred Medium/Low defects are documented and accepted;
- the verified release commit is recorded.

Final tag:

```text
v1.0
```

Release title:

```text
White Saffron Procurement ERP v1.0 – Read-only Foundation
```
