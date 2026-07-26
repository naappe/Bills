-- White Saffron Procurement ERP
-- Apply only after 001_normalized_procurement_schema.sql and profile backfill.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and active), 'readonly');
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_aliases enable row level security;
alter table public.products enable row level security;
alter table public.product_aliases enable row level security;
alter table public.procurement_bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.audit_logs enable row level security;
alter table public.workspace_settings enable row level security;

create policy profiles_read_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin');

create policy profiles_admin_write on public.profiles
for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy vendors_read on public.vendors
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));
create policy vendors_write on public.vendors
for all to authenticated
using (public.current_app_role() in ('admin','manager'))
with check (public.current_app_role() in ('admin','manager'));

create policy vendor_aliases_read on public.vendor_aliases
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));
create policy vendor_aliases_write on public.vendor_aliases
for all to authenticated
using (public.current_app_role() in ('admin','manager'))
with check (public.current_app_role() in ('admin','manager'));

create policy products_read on public.products
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));
create policy products_write on public.products
for all to authenticated
using (public.current_app_role() in ('admin','manager'))
with check (public.current_app_role() in ('admin','manager'));

create policy product_aliases_read on public.product_aliases
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));
create policy product_aliases_write on public.product_aliases
for all to authenticated
using (public.current_app_role() in ('admin','manager'))
with check (public.current_app_role() in ('admin','manager'));

create policy bills_read on public.procurement_bills
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));

create policy bills_insert on public.procurement_bills
for insert to authenticated
with check (
  public.current_app_role() in ('admin','manager','staff')
  and created_by = auth.uid()
);

create policy bills_update on public.procurement_bills
for update to authenticated
using (
  public.current_app_role() in ('admin','manager')
  or (
    public.current_app_role() = 'staff'
    and created_by = auth.uid()
    and created_at >= now() - interval '24 hours'
  )
)
with check (
  public.current_app_role() in ('admin','manager')
  or (
    public.current_app_role() = 'staff'
    and created_by = auth.uid()
    and created_at >= now() - interval '24 hours'
  )
);

create policy bills_delete on public.procurement_bills
for delete to authenticated
using (public.current_app_role() = 'admin');

create policy bill_items_read on public.bill_items
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));

create policy bill_items_insert on public.bill_items
for insert to authenticated
with check (
  public.current_app_role() in ('admin','manager','staff')
  and exists (
    select 1 from public.procurement_bills b
    where b.id = bill_id and b.created_by = auth.uid()
  )
);

create policy bill_items_update on public.bill_items
for update to authenticated
using (
  public.current_app_role() in ('admin','manager')
  or exists (
    select 1 from public.procurement_bills b
    where b.id = bill_id
      and b.created_by = auth.uid()
      and b.created_at >= now() - interval '24 hours'
  )
);

create policy bill_items_delete on public.bill_items
for delete to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'manager'
    and exists (select 1 from public.procurement_bills b where b.id = bill_id)
  )
);

create policy audit_read_admin on public.audit_logs
for select to authenticated using (public.current_app_role() = 'admin');
create policy audit_insert_authenticated on public.audit_logs
for insert to authenticated with check (actor_id = auth.uid());

create policy settings_read on public.workspace_settings
for select to authenticated using (public.current_app_role() in ('admin','manager','staff','readonly'));
create policy settings_admin_write on public.workspace_settings
for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
