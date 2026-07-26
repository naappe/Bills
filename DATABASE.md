# White Saffron Procurement ERP — Database

This document records the current data model and the planned normalized Supabase schema. It is a design reference, not an instruction to run migrations without review and backup.

## Current state

The deployed application uses one primary Supabase table configured through `app/js/config.js`.

```text
bills
```

The browser loads all rows through `app/js/data.js` in pages of 1,000 records and stores them in `store.rows`.

Current records may contain both bill-level fields and embedded item data. The application includes compatibility helpers because historical column names are not fully uniform.

Common bill-level concepts include:

- `id`
- bill date
- vendor or supplier name
- amount or grand total
- bill number
- payment status
- payment method
- TIN
- mobile
- category
- notes
- GST total
- net amount
- created timestamp
- updated timestamp
- items or item-derived fields

The exact production schema must be inspected in Supabase before any migration.

## Current source-of-truth rules

1. Historical bill records are procurement evidence and must not be rewritten merely to improve catalogue display.
2. Products are currently derived from bill items.
3. Vendors are currently derived from bill records.
4. Product catalogue metadata may be stored locally in the browser.
5. Vendor canonicalization and alias metadata may be stored locally in the browser.
6. Frontend role checks do not replace Row Level Security.

## Data-quality risks

The current denormalized structure can produce:

- duplicate vendor names
- inconsistent capitalization and spacing
- multiple names for the same supplier
- inconsistent product descriptions
- repeated pack and unit strings
- difficulty indexing individual bill items
- expensive browser-side aggregation
- limited auditability of catalogue overrides

These are known migration drivers, not reasons to modify historical data directly.

# Target normalized schema

## Entity overview

```text
profiles
  └── roles / permissions

vendors
  └── vendor_aliases

products
  └── product_aliases

bills
  └── bill_items
        ├── products
        └── vendors through bills

price observations
  └── derived from bill_items or materialized views

audit_logs
settings
```

## `profiles`

Purpose: application-level user identity and role metadata linked to Supabase Auth.

Suggested fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key; references `auth.users.id` |
| `display_name` | `text` | User-facing name |
| `role` | `text` or enum | `admin`, `manager`, `staff`, `readonly` |
| `active` | `boolean` | Disable access without deleting history |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Maintained by trigger or application |

## `vendors`

Purpose: canonical supplier directory.

Suggested fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Canonical display name |
| `normalized_name` | `text` | Search and duplicate matching |
| `tin` | `text` | Nullable; index when present |
| `mobile` | `text` | Nullable |
| `email` | `text` | Nullable |
| `address` | `text` | Nullable |
| `notes` | `text` | Internal notes |
| `active` | `boolean` | Default true |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Maintained timestamp |

Recommended uniqueness strategy:

- unique normalized TIN when present
- avoid forcing global mobile uniqueness without reviewing shared business numbers
- duplicate detection on normalized name, TIN, and mobile

## `vendor_aliases`

Purpose: map historical supplier names to a canonical vendor without rewriting original bills.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `vendor_id` | `uuid` | References `vendors.id` |
| `alias` | `text` | Original or alternate name |
| `normalized_alias` | `text` | Indexed matching value |
| `source` | `text` | Import, manual, migration, rule |
| `created_by` | `uuid` | References user where available |
| `created_at` | `timestamptz` | Default `now()` |

## `products`

Purpose: canonical product catalogue independent from historical descriptions.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Canonical display name |
| `normalized_name` | `text` | Search and matching |
| `category` | `text` | Controlled category where possible |
| `base_unit` | `text` | `g`, `kg`, `ml`, `l`, `pcs`, etc. |
| `image_url` | `text` | Exact or approved catalogue image |
| `active` | `boolean` | Default true |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Maintained timestamp |

## `product_aliases`

Purpose: map bill descriptions and spelling variants to canonical products.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `product_id` | `uuid` | References `products.id` |
| `alias` | `text` | Original item description |
| `normalized_alias` | `text` | Indexed matching value |
| `source` | `text` | Import, manual, matching rule |
| `created_by` | `uuid` | Optional user reference |
| `created_at` | `timestamptz` | Default `now()` |

## `bills`

Purpose: bill header and supplier transaction record.

Suggested fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `bill_date` | `date` | Supplier bill date |
| `vendor_id` | `uuid` | References `vendors.id` |
| `vendor_name_original` | `text` | Preserve source wording |
| `bill_no` | `text` | Nullable |
| `location` | `text` | Branch or purchase location |
| `category` | `text` | Header category if retained |
| `payment_status` | `text` | Controlled values |
| `payment_method` | `text` | Controlled values where possible |
| `subtotal` | `numeric(14,4)` | Before GST where available |
| `gst_total` | `numeric(14,4)` | Explicit GST total |
| `net_amount` | `numeric(14,4)` | Net total where applicable |
| `grand_total` | `numeric(14,4)` | Final bill amount |
| `notes` | `text` | Internal notes |
| `created_by` | `uuid` | Auth user reference |
| `updated_by` | `uuid` | Last editor |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Maintained timestamp |

Historical supplier name, TIN, and contact snapshots may also be retained on the bill when legal or operational traceability requires the exact original values.

## `bill_items`

Purpose: normalized purchasable lines.

Suggested fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `bill_id` | `uuid` | References `bills.id`; cascade delete only after policy review |
| `product_id` | `uuid` | Nullable during migration; references `products.id` |
| `description_original` | `text` | Preserve bill wording |
| `unit` | `text` | Entered purchase unit |
| `quantity` | `numeric(14,4)` | Number of packs or units |
| `pack_format` | `text` | Original pack notation |
| `pack_count` | `numeric(14,4)` | Parsed units per pack where known |
| `pack_size` | `numeric(14,4)` | Size of each contained unit |
| `pack_size_unit` | `text` | `g`, `kg`, `ml`, `l`, `pcs` |
| `base_quantity` | `numeric(18,6)` | Total normalized amount |
| `base_unit` | `text` | Normalized comparison unit |
| `pack_rate` | `numeric(14,4)` | Price per entered pack |
| `base_unit_rate` | `numeric(18,8)` | Price per kg, litre, or piece |
| `small_unit_rate` | `numeric(18,8)` | Price per g or ml when applicable |
| `gst_amount` | `numeric(14,4)` | Item GST when known |
| `line_total` | `numeric(14,4)` | Final line total |
| `image_url_original` | `text` | Optional source image |
| `created_at` | `timestamptz` | Default `now()` |

## Price intelligence

The preferred source of truth is normalized `bill_items`; avoid manually duplicating price history unless required for performance or snapshots.

Possible implementation options:

1. SQL view for current comparisons.
2. Materialized view refreshed after imports.
3. Dedicated `price_snapshots` table for approved monthly snapshots.
4. RPC functions for product/vendor comparison and trend calculations.

Price comparisons must use compatible base units. A pack rate must never be compared directly with a kilogram, litre, gram, millilitre, or piece rate without conversion.

## `audit_logs`

Purpose: immutable operational audit trail.

Suggested fields:

- `id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data` as `jsonb`
- `after_data` as `jsonb`
- `created_at`

Do not store passwords, tokens, or unnecessary sensitive values in audit payloads.

## `settings`

Purpose: controlled workspace defaults and thresholds.

Possible keys:

- default location
- payment defaults
- price alert percentages
- stale-price period
- preferred base units
- report period defaults
- organization display information

Use typed columns for stable settings or a validated key/value model for limited flexible settings.

# Index strategy

Recommended indexes after measuring actual queries:

- `bills (bill_date desc)`
- `bills (vendor_id, bill_date desc)`
- `bills (payment_status, bill_date desc)`
- `bill_items (bill_id)`
- `bill_items (product_id, created_at desc)`
- `bill_items (product_id, base_unit_rate)`
- `vendors (normalized_name)`
- `vendor_aliases (normalized_alias)`
- `products (normalized_name)`
- `product_aliases (normalized_alias)`

Use partial indexes for nullable identifiers such as TIN where beneficial.

# Row Level Security principles

RLS must be enabled and tested on every application table.

Target policy model:

| Role | Read | Create | Update | Delete | Administration |
|---|---:|---:|---:|---:|---:|
| `admin` | Yes | Yes | Yes | Yes | Yes |
| `manager` | Yes | Yes | Yes | Restricted | Limited |
| `staff` | Yes | Yes | Time/policy limited | No | No |
| `readonly` | Yes | No | No | No | No |

Policies should derive roles from trusted database data, not browser-supplied values.

# Migration sequence

## Stage 0 — Backup and inspection

- export current table schema
- export all current rows
- record row count and checksums where practical
- inspect nullability and historical field variants
- verify storage assets
- create a tagged Git checkpoint

## Stage 1 — Add canonical entities

- create `vendors`, `vendor_aliases`, `products`, and `product_aliases`
- do not alter existing bills
- import and review candidate canonical records

## Stage 2 — Normalize bill headers

- create new normalized `bills` table or additive columns
- map canonical vendors
- retain original supplier text
- validate totals and dates

## Stage 3 — Extract bill items

- create `bill_items`
- parse embedded item structures
- preserve original descriptions and pack strings
- calculate normalized quantities with explicit confidence/error reporting

## Stage 4 — Validate

- compare bill counts
- compare total spend by month
- compare total spend by vendor
- compare payment-status totals
- sample individual bills and line calculations
- document unresolved mappings

## Stage 5 — Switch application reads

- deploy behind a controlled version
- keep rollback capability
- monitor errors and aggregate differences
- only remove compatibility code after validation

# Backup and restore

Before every schema migration:

1. Export schema-only SQL.
2. Export table data.
3. Back up storage objects when used.
4. Record the Git commit and application version.
5. Test restore procedures in a non-production project when possible.

A backup is incomplete until a restore has been tested.

# Prohibited practices

- Never commit Supabase service-role keys.
- Never use frontend role flags as the only authorization mechanism.
- Never rewrite historical bill descriptions solely for catalogue aesthetics.
- Never merge vendors automatically when identifiers conflict.
- Never compare prices across incompatible units.
- Never run destructive migrations without an export and rollback plan.
