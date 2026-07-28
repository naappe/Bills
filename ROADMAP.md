# White Saffron Procurement ERP — Roadmap

This roadmap defines intended implementation order and dependencies. Deployed behavior remains authoritative.

## Current checkpoint

**Version:** v5.1.5  
**Status:** Operational procurement foundation with simplified daily workflows  
**Deployment:** GitHub Pages  
**Database:** Supabase

## Completed foundation

- Authentication and session restoration
- Application shell and hash router
- Shared state and guarded bill loading
- Operational Dashboard
- Bills search, filtering, pagination, detail, edit, and authorized delete
- Simplified Bill Entry with invoice-number-later workflow
- Static Products catalogue derived from purchases
- Vendor directory derived from purchases
- Cost
- Reports, Settings, and Admin foundations
- Responsive desktop and mobile layouts
- Shared searchable dropdown behavior
- AI development and architecture documentation

## Implementation order

```text
1. Inventory and product data design
        ↓
2. Product and vendor master records
        ↓
3. Stock transactions and alerts
        ↓
4. Accountant and invoice follow-up
        ↓
5. Roles, approvals, and audit history
        ↓
6. Assisted procurement and forecasting
```

# Phase 1 — Inventory and Product Data Design

## Objective

Create an approved data model before enabling automatic stock behavior.

## Required entities

- Products
- Product aliases
- Vendors
- Vendor aliases
- Bill headers
- Bill items
- Inventory transactions
- Stock balances or calculated stock views
- Reorder settings
- Audit history

## Inventory transaction types

- Purchase receipt / stock in
- Consumption / stock out
- Sale / stock out, if POS is later introduced
- Adjustment increase
- Adjustment decrease
- Opening balance
- Transfer, if multiple locations are introduced

## Required inventory fields

- Product ID
- Quantity
- Unit
- Transaction type
- Source bill or document
- Location
- Transaction date
- Created by
- Created at
- Notes or reason

## Definition of done

- Exact SQL reviewed and approved
- Existing data backed up
- Rollback plan documented
- Product and vendor mappings validated
- Historical financial totals remain unchanged
- Sample stock calculations verified
- RLS policies documented and tested

# Phase 2 — Product and Vendor Master Records

## Objective

Stop relying entirely on bill history for catalogue identity and editable metadata.

## Product scope

- Canonical product name
- Description
- Image URL
- Default packing
- Base unit
- Case quantity
- Wholesale purchase reference
- Retail price
- Reorder level
- Active/inactive state

## Vendor scope

- Canonical vendor name
- TIN
- Mobile
- Address or location
- Aliases
- Active/inactive state
- Procurement history links

## Rules

- Preserve original text from historical bills
- Never silently merge vendors or products
- Show unresolved aliases for review
- Duplicate detection must recommend, not automatically merge

# Phase 3 — Stock Operations

## Objective

Enable truthful stock visibility and purchasing alerts.

## Scope

- Automatic stock-in transaction after a valid purchase bill is saved
- Stock-out or consumption entry
- Current quantity by product
- In stock, low stock, and out of stock status
- Reorder-level configuration
- Adjustment workflow with reason and user audit
- Inventory history by product
- Stock summary on Dashboard and Products

## Rules

- Saving a bill must not double-add stock during edits
- Deleting or changing a bill must create a controlled reversal or adjustment
- Stock unit conversions must be deterministic
- Every stock change requires a source and audit trail

# Phase 4 — Accountant and Invoice Follow-up

## Objective

Support purchases received before the official invoice number is available.

## Scope

- Invoice status field stored explicitly
- Missing-invoice filter in Bills
- Accountant follow-up queue
- Add invoice number later
- Duplicate invoice-number detection by vendor
- Optional attachment or scan reference
- Completion timestamp and user audit

# Phase 5 — Roles, Approvals, and Audit

## Objective

Replace implicit frontend role classification with trusted profiles and auditable permissions.

## Proposed roles

- Admin
- Manager
- Staff
- Accountant
- Readonly

## Proposed controls

- Add bills
- Edit bills
- Delete bills
- Complete invoice details
- Adjust stock
- Edit product pricing
- View Cost
- Manage users and settings

Final permissions must be enforced with Supabase RLS, not only hidden controls.

# Phase 6 — Assisted Procurement

## Objective

Add controlled automation while keeping users responsible for approval.

## Potential scope

- OCR-assisted bill capture
- Suggested product and vendor matching
- Duplicate-bill detection
- Unusual-price detection
- Purchase recommendations
- Demand forecasting
- Budget alerts
- Supplier quotation comparison
- Confidence indicators and review queues

## Safety rules

- AI suggestions must never silently alter approved records
- Show source evidence and confidence
- Require confirmation for imported or matched values
- Maintain an audit trail
- Never present forecasts as guaranteed outcomes

# Later backlog

- Purchase orders
- Approval workflows
- Barcode and QR support
- Camera capture
- POS integration
- Multiple locations
- Transfers
- Supplier performance scoring
- PDF reports
- Spreadsheet exports
- Email notifications
- Offline-capable workflows
- Controlled external API integrations

# Technical debt

- Complete bill dataset is loaded into browser memory
- Product catalogue is inferred from purchases
- Some vendor-product learning is browser-local
- Role model is limited
- Bill data remains denormalized
- Historical alias compatibility increases complexity
- Automated test coverage is limited
- Some page behavior and styles remain embedded in route modules

Technical debt should be addressed when it directly improves correctness, security, performance, or delivery safety.

# Release checklist

1. Read `AI_RULES.md`.
2. Define exact scope and excluded files.
3. Back up before database work.
4. Test changed workflows.
5. Test role restrictions.
6. Test desktop and mobile layouts.
7. Review console and network errors.
8. Verify RLS for data changes.
9. Update documentation.
10. Record the release in `CHANGELOG.md`.
