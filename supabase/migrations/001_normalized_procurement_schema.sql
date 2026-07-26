-- White Saffron Procurement ERP
-- Stage 1 additive schema. Review and back up production before running.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('admin','manager','staff','readonly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  tin text,
  mobile text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vendors_tin_unique
  on public.vendors (tin) where tin is not null and btrim(tin) <> '';
create index if not exists vendors_normalized_name_idx on public.vendors (normalized_name);

create table if not exists public.vendor_aliases (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source text not null default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (vendor_id, normalized_alias)
);
create index if not exists vendor_aliases_normalized_idx on public.vendor_aliases (normalized_alias);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  category text,
  base_unit text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_normalized_name_idx on public.products (normalized_name);

create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source text not null default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (product_id, normalized_alias)
);
create index if not exists product_aliases_normalized_idx on public.product_aliases (normalized_alias);

create table if not exists public.procurement_bills (
  id uuid primary key default gen_random_uuid(),
  legacy_bill_id text,
  bill_date date not null,
  vendor_id uuid references public.vendors(id),
  vendor_name_original text,
  vendor_tin_original text,
  vendor_mobile_original text,
  bill_no text,
  location text,
  category text,
  payment_status text not null default 'Pending',
  payment_method text,
  subtotal numeric(14,4) not null default 0,
  gst_total numeric(14,4) not null default 0,
  net_amount numeric(14,4) not null default 0,
  grand_total numeric(14,4) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists procurement_bills_date_idx on public.procurement_bills (bill_date desc);
create index if not exists procurement_bills_vendor_date_idx on public.procurement_bills (vendor_id, bill_date desc);
create index if not exists procurement_bills_status_date_idx on public.procurement_bills (payment_status, bill_date desc);

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.procurement_bills(id) on delete cascade,
  product_id uuid references public.products(id),
  description_original text not null,
  unit text,
  quantity numeric(14,4) not null default 1,
  pack_format text,
  pack_count numeric(14,4),
  pack_size numeric(14,4),
  pack_size_unit text,
  base_quantity numeric(18,6),
  base_unit text,
  pack_rate numeric(14,4),
  base_unit_rate numeric(18,8),
  small_unit_rate numeric(18,8),
  gst_amount numeric(14,4) not null default 0,
  line_total numeric(14,4) not null default 0,
  image_url_original text,
  created_at timestamptz not null default now()
);
create index if not exists bill_items_bill_idx on public.bill_items (bill_id);
create index if not exists bill_items_product_date_idx on public.bill_items (product_id, created_at desc);
create index if not exists bill_items_product_rate_idx on public.bill_items (product_id, base_unit_rate);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger vendors_touch_updated_at before update on public.vendors
for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();
create trigger procurement_bills_touch_updated_at before update on public.procurement_bills
for each row execute function public.touch_updated_at();

comment on table public.procurement_bills is 'Normalized bill headers. Existing public.bills remains untouched during migration.';
comment on table public.bill_items is 'Normalized bill lines linked to procurement_bills.';
