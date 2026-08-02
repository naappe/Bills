# RC1 Release Decision

Decision: **HOLD — do not tag v1.0 yet**

The desktop Dark + Compact screenshots confirm that all eight routes render and the shared design system is applied. Static code review also confirms the read-only route architecture, preferences, responsive navigation, loading states, exports, and modal infrastructure.

## Confirmed blocker

A single unmatched bill vendor explains the MVR 500.00 Inventory-vs-Reports spend difference and the vendor-count difference:

- Bill ID: 3021
- Date: 2026-07-22
- Vendor: Jamna Fish
- Amount: MVR 500.00
- Relationship: missing from vendor master

See `DATA_RECONCILIATION_RC1.md` for the complete evidence.

## Data review required

Supply IDs 4, 14, and 30 appear to be test records and require data-owner confirmation before release.

## Remaining validation

- Light and System themes
- Comfortable density
- Tablet and mobile layouts
- CSV output contents
- Detail modal interactions
- Page sizes 20, 50, and 100
- Preference persistence after reload
- Keyboard and accessibility checks
- Authenticated console and network review

No production database records were changed during this validation.
