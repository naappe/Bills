# Supabase Reference

Database runbook for `naappe/Bills`. Read this file before changing database fields, RLS, vendor logic, or bill writes.

## Project

```text
Project ref: tmupbruwmwlrmewhoodn
Main bill table: public.bills
Vendor table: public.vendors
```

The frontend uses a Supabase publishable browser key. Never commit a service-role key, database password, private API key, access token, or exported private data.

## Bills table

Maintained bill fields:

```text
id
created_at
bill_date
bill_day
bill_no
vendor
vendor_id
tin
amount
subtotal
net_amount
gst_total
payment_status
payment_method
notes
items
user_id
created_by
updated_at
updated_by
```

The production table also contains old title-case aliases such as `Bill Date`, `Vendor`, `Amount`, `Bill No`, `Location`, and `TIN`. New code must use snake_case fields and must not create more aliases.

## Bill items

`bills.items` is a JSON array.

```json
{
  "product": "Chicken Breast",
  "pack_format": "10x500g",
  "unit": "CSE",
  "qty": 24,
  "rate": 150,
  "gst": 0,
  "subtotal": 3600,
  "gst_amount": 0,
  "line_total": 3600,
  "base_per_purchase": 5000,
  "total_base": 120000,
  "small_unit": "g",
  "small_rate": 0.03
}
```

Calculation rules:

```text
subtotal = qty × rate
gst_amount = subtotal × gst ÷ 100
line_total = subtotal + gst_amount
total_base = qty × base_per_purchase
small_rate = rate ÷ base_per_purchase
```

Supported units:

```text
CSE, CTN, BOX, PKT, PCS, DOZ, BTL, KG, G, L, ML, BAG, TIN, CAN, SET, PAIR, ROLL
```

Pack examples:

```text
10x500g
24x330ml
12x1L
6x2kg
48 PCS
```

## Vendors table

Confirmed fields:

```text
id uuid
name text
phone text
email text
tin text
address text
bank_details text
default_payment_method text
notes text
is_active boolean
deleted_at timestamptz
created_at timestamptz
updated_at timestamptz
created_by uuid
updated_by uuid
```

Vendor flow:

1. Load active, non-deleted vendors from `public.vendors`.
2. Search vendors by name in New Bill.
3. When an exact existing vendor is selected, fill TIN, phone, email, address, and default payment method.
4. When the name is new, save a new vendor before saving the bill.
5. Save the returned vendor UUID into `bills.vendor_id`.
6. Also keep `bills.vendor` and `bills.tin` for bill history compatibility.
7. Do not create duplicate vendors with only case or spacing differences.

## Bills RLS

RLS is enabled on `public.bills`.

Current policies:

```text
bills_read_authenticated
bills_insert_authenticated
bills_update_admin_or_owner_24h
bills_delete_admin_or_owner_24h
```

Rules:

```text
Authenticated users: read bills
Authenticated users: insert their own bills
Admin: update and delete any bill
Staff: update or delete their own bill within 24 hours
```

Admin resolution uses the maintained admin user UUID and may also accept an authenticated `app_metadata.role` of `admin`.

## Vendors RLS

Current policy:

```text
vendors_authenticated_all
```

Authenticated users currently have read/write access to `public.vendors`.

## Applied migration

```text
normalize_bills_rls_permissions
```

This migration removed overlapping bill policies and installed the maintained four-policy rules.

## Before changing Supabase

1. Read this file.
2. Inspect existing columns before adding a column.
3. Inspect existing policies before adding a policy.
4. Use a named migration for DDL or RLS changes.
5. Do not duplicate tables, fields, policies, or triggers.
6. Update this file after every database change.
7. Keep UI instructions out of the application unless explicitly requested.

## Verification SQL

Columns:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('bills', 'vendors')
order by table_name, ordinal_position;
```

Policies:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('bills', 'vendors')
order by tablename, policyname;
```

Counts:

```sql
select count(*) from public.bills;
select count(*) from public.vendors where is_active = true and deleted_at is null;
```
