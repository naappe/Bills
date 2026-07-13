-- White Saffron public Prices page read access
-- Run once in Supabase SQL Editor for project tmupbruwmwlrmewhoodn.
-- Exposes only price catalogue columns to visitors without login.
-- Bills, Auth users, notes, invoice numbers and created_by are not exposed.

alter table public.supply_rates enable row level security;

drop policy if exists "Public prices read" on public.supply_rates;

create policy "Public prices read"
on public.supply_rates
for select
to anon
using (true);

revoke all on table public.supply_rates from anon;

grant select (
  vendor,
  item_code,
  item_name,
  uom,
  quantity,
  unit_rate,
  gst_rate,
  gst_mode,
  final_amount,
  invoice_date,
  created_at
)
on public.supply_rates
to anon;
