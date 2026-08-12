-- BusinessOS v0.2: optimize procurement RLS and cover foreign keys with indexes.

drop policy if exists purchase_requests_read_active_users on public.purchase_requests;
create policy purchase_requests_read_active_users on public.purchase_requests for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.is_active));

drop policy if exists purchase_request_items_read_active_users on public.purchase_request_items;
create policy purchase_request_items_read_active_users on public.purchase_request_items for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.is_active));

drop policy if exists purchase_orders_read_active_users on public.purchase_orders;
create policy purchase_orders_read_active_users on public.purchase_orders for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.is_active));

drop policy if exists purchase_order_items_read_active_users on public.purchase_order_items;
create policy purchase_order_items_read_active_users on public.purchase_order_items for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.is_active));

create index if not exists purchase_requests_reviewed_by_idx on public.purchase_requests(reviewed_by) where reviewed_by is not null;
create index if not exists purchase_request_items_preferred_vendor_idx on public.purchase_request_items(preferred_vendor_id) where preferred_vendor_id is not null;
create index if not exists purchase_orders_created_by_idx on public.purchase_orders(created_by);
create index if not exists purchase_orders_approved_by_idx on public.purchase_orders(approved_by) where approved_by is not null;
create index if not exists purchase_order_items_supply_idx on public.purchase_order_items(supply_id);
