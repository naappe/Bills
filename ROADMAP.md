# White Saffron Procurement ERP — Roadmap

This roadmap defines the intended implementation order, module boundaries, dependencies, and completion criteria. It is a planning document; deployed behavior remains authoritative.

## Current checkpoint

**Version:** v4.6.0  
**Status:** Stable procurement foundation  
**Deployment:** GitHub Pages  
**Database:** Supabase  

Completed foundation:

- authentication and session restoration
- application shell and hash router
- procurement dashboard
- bill listing and entry workflows
- product catalogue derived from bills
- vendor directory derived from bills
- reports, settings, and administration foundations
- responsive design system

## Work order

```text
v4.7 Price Intelligence
  → v4.8 Users and Roles
  → v4.9 Database Normalization
  → v5.0 Assisted Procurement
```

Database work may begin earlier in isolated preparation branches, but production migration must follow the documented validation and backup process.

# v4.7.0 — Price Intelligence

## Objective

Turn recorded bill items into reliable, comparable purchasing intelligence that helps management identify price movements, supplier differences, and potential savings.

## Scope

### Product price history

- chronological purchase timeline
- vendor, date, quantity, pack, line total, and calculated rate
- comparable base-unit rates
- latest, previous, minimum, maximum, average, and median prices
- period filters

### Vendor comparison

- compare suppliers for the same canonical product
- latest compatible price per vendor
- price difference and percentage difference
- purchase count and last-purchase date
- highlight lowest recent compatible rate
- exclude incompatible units and invalid conversions

### Price movements

- increase and decrease since previous purchase
- weekly, monthly, and quarterly comparisons
- volatility indicator
- stale price indicator
- configurable alert thresholds

### Savings analysis

- estimate potential savings using a lower compatible recent rate
- show the source vendor and observation date
- distinguish historical opportunity from guaranteed current availability
- aggregate potential savings by product and period

### Dashboard and reports

- largest increases
- largest decreases
- most volatile products
- largest estimated savings opportunities
- suppliers with the highest current average premium

### Access

- detailed price intelligence is admin-only unless the role matrix is explicitly expanded
- non-admin users must not edit thresholds or canonical mappings

## Data rules

- compare only equivalent base units
- never compare a pack price directly with a kg, litre, gram, ml, or piece rate
- retain original bill values
- display observation dates
- label estimates as estimates
- exclude zero, missing, or mathematically invalid rates

## Deliverables

- dedicated `price-intelligence.js` module or equivalent
- dedicated styles only where shared tokens are insufficient
- product timeline view
- vendor comparison table/cards
- alert logic
- savings summary
- updated architecture and changelog

## Definition of done

- calculations validated against sample bills
- incompatible units excluded correctly
- date filters behave consistently
- admin access enforced in UI and database policy where applicable
- mobile and desktop views verified
- no console errors
- performance remains acceptable with the current bill volume

# v4.8.0 — Users and Roles

## Objective

Replace implicit frontend role classification with explicit application profiles, controlled permissions, and auditable administration.

## Scope

- profiles table linked to Supabase Auth
- roles: admin, manager, staff, readonly
- active/inactive users
- user list and account status
- invitation or onboarding workflow where supported
- permission matrix
- login/session information where available
- audit log for sensitive actions
- safer admin interface

## Target permission model

| Capability | Admin | Manager | Staff | Readonly |
|---|---:|---:|---:|---:|
| View procurement data | Yes | Yes | Yes | Yes |
| Add bills | Yes | Yes | Yes | No |
| Edit bills | Yes | Yes | Policy-limited | No |
| Delete bills | Yes | Restricted | No | No |
| Edit product/vendor metadata | Yes | Limited | No | No |
| View Price Intelligence | Yes | Optional | No | No |
| Manage users and settings | Yes | No | No | No |

Final permissions must be enforced with Supabase RLS, not only hidden buttons.

## Definition of done

- role source is trusted database data
- RLS policies are documented and tested
- inactive users lose application access as intended
- administrative actions create audit events
- account screens are responsive and understandable

# v4.9.0 — Database Normalization

## Objective

Create first-class products, vendors, bill headers, bill items, aliases, and auditable metadata without losing historical procurement evidence.

## Scope

- `profiles`
- `vendors`
- `vendor_aliases`
- `products`
- `product_aliases`
- normalized `bills`
- `bill_items`
- audit logs
- settings
- price views or materialized views
- migration and rollback scripts

## Migration principles

- back up before migration
- preserve original supplier and item text
- migrate additively before removing compatibility fields
- compare counts and financial totals before cutover
- keep unresolved mappings visible
- test restore procedures

## Definition of done

- row counts validated
- monthly totals match the source dataset
- vendor totals match within explained exceptions
- sample bill calculations match
- rollback is documented and tested
- application reads and writes use normalized tables

# v5.0.0 — Assisted Procurement

## Objective

Add controlled automation and machine-assisted workflows while keeping users responsible for approval.

## Scope

- OCR-assisted bill capture
- suggested product matching
- suggested vendor matching
- duplicate-bill detection
- unusual-price detection
- spend forecasting
- budget alerts
- purchasing recommendations
- confidence indicators and review queues

## Safety and accuracy rules

- AI suggestions must never silently alter approved records
- show confidence and source evidence
- require user confirmation for mappings and imported values
- maintain an audit trail
- avoid presenting forecasts as guaranteed outcomes

# Backlog

Potential later work:

- purchase orders
- supplier quotation comparison
- approval workflows
- inventory integration
- branch/location support
- barcode and QR support
- camera capture
- PDF reports
- spreadsheet export
- email notifications
- offline-capable workflows
- budget management
- supplier performance scoring
- public API or controlled integrations

# Technical debt register

Current known debt:

- complete bill table loaded into browser memory
- product metadata stored locally
- vendor alias metadata stored locally
- limited role model
- denormalized bill items
- compatibility field extraction
- shared `pages.js` responsibilities remain broad
- automated test coverage is limited

Technical debt work should be scheduled when it directly reduces correctness, security, performance, or delivery risk.

# Release checklist

For every release:

1. Confirm repository integrity before editing.
2. Update version markers.
3. Test all changed routes.
4. Test bill create, update, and delete behavior as applicable.
5. Test role restrictions.
6. Test responsive layouts.
7. Review console errors and network failures.
8. Verify Supabase policies for data changes.
9. Update documentation.
10. Create a checkpoint commit and backup before risky migrations.
