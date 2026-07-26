-- White Saffron Procurement ERP
-- Reconcile security policies against the existing live schema.
-- This migration is additive/security-focused and does not rewrite procurement data.

-- Reporting views must enforce the querying user's permissions and RLS.
alter view if exists public.vendor_purchase_summary set (security_invoker = true);
alter view if exists public.product_price_summary set (security_invoker = true);

-- Helper expression used inline in policies:
-- active role is read from public.user_roles for auth.uid().

-- Bills: all active application users may read; staff may create and edit only
-- their own records for 24 hours; only admins may delete.
drop policy if exists bills_read_authenticated on public.bills;
drop policy if exists bills_insert_authenticated on public.bills;
drop policy if exists bills_update_admin_or_owner_24h on public.bills;
drop policy if exists bills_delete_admin_or_owner_24h on public.bills;

create policy bills_read_active_users on public.bills
for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.is_active
  )
);

create policy bills_insert_authorized on public.bills
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_active
      and ur.role in ('admin','manager','staff')
  )
);

create policy bills_update_authorized on public.bills
for update to authenticated
using (
  is_bills_admin()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_active
      and ur.role in ('manager','staff')
      and public.bills.user_id = auth.uid()
      and public.bills.created_at >= now() - interval '24 hours'
  )
)
with check (
  is_bills_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_active
        and ur.role in ('manager','staff')
    )
  )
);

create policy bills_delete_admin_only on public.bills
for delete to authenticated
using (is_bills_admin());

-- Bill items follow the parent bill's access model.
drop policy if exists "Bill owners can add item lines" on public.bill_items;
drop policy if exists "Bill owners can delete item lines" on public.bill_items;
drop policy if exists "Bill owners can read item lines" on public.bill_items;
drop policy if exists "Bill owners can update item lines" on public.bill_items;

create policy bill_items_read_active_users on public.bill_items
for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.is_active
  )
);

create policy bill_items_insert_authorized on public.bill_items
for insert to authenticated
with check (
  exists (
    select 1
    from public.bills b
    join public.user_roles ur on ur.user_id = auth.uid()
    where b.id = bill_items.bill_id
      and b.user_id = auth.uid()
      and ur.is_active
      and ur.role in ('admin','manager','staff')
  )
);

create policy bill_items_update_authorized on public.bill_items
for update to authenticated
using (
  is_bills_admin()
  or exists (
    select 1
    from public.bills b
    join public.user_roles ur on ur.user_id = auth.uid()
    where b.id = bill_items.bill_id
      and b.user_id = auth.uid()
      and b.created_at >= now() - interval '24 hours'
      and ur.is_active
      and ur.role in ('manager','staff')
  )
)
with check (
  is_bills_admin()
  or exists (
    select 1
    from public.bills b
    join public.user_roles ur on ur.user_id = auth.uid()
    where b.id = bill_items.bill_id
      and b.user_id = auth.uid()
      and ur.is_active
      and ur.role in ('manager','staff')
  )
);

create policy bill_items_delete_admin_only on public.bill_items
for delete to authenticated
using (is_bills_admin());

-- Catalogue reference data: readable by active users; maintained by managers/admins.
drop policy if exists products_authenticated_all on public.products;
create policy products_read_active_users on public.products
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy products_write_management on public.products
for all to authenticated
using (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'))
with check (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'));

drop policy if exists vendors_authenticated_all on public.vendors;
create policy vendors_read_active_users on public.vendors
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy vendors_write_management on public.vendors
for all to authenticated
using (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'))
with check (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'));

drop policy if exists categories_authenticated_all on public.categories;
create policy categories_read_active_users on public.categories
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy categories_write_management on public.categories
for all to authenticated
using (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'))
with check (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'));

drop policy if exists units_authenticated_all on public.units;
create policy units_read_active_users on public.units
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy units_write_management on public.units
for all to authenticated
using (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'))
with check (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'));

-- Price history is readable to active users. Direct writes are restricted to
-- management; internal SECURITY DEFINER synchronization triggers remain functional.
drop policy if exists price_history_authenticated_all on public.price_history;
create policy price_history_read_active_users on public.price_history
for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy price_history_write_management on public.price_history
for all to authenticated
using (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'))
with check (is_bills_admin() or exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active and ur.role='manager'));

-- Audit rows must identify the authenticated actor; only admins may read them.
drop policy if exists audit_insert_authenticated on public.audit_log;
drop policy if exists audit_read_admin on public.audit_log;
create policy audit_insert_actor_only on public.audit_log
for insert to authenticated
with check (changed_by = auth.uid());
create policy audit_read_admin on public.audit_log
for select to authenticated
using (is_bills_admin());
