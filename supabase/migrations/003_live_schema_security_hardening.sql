-- White Saffron Procurement ERP
-- Security hardening for the existing live schema discovered on 2026-07-26.
-- This migration does not alter bill data or existing table structures.

-- SECURITY DEFINER helpers must never be callable anonymously.
revoke execute on function public.admin_update_user_role(uuid,text,boolean,text) from anon, public;
revoke execute on function public.admin_user_overview() from anon, public;
revoke execute on function public.is_app_admin() from anon, public;
revoke execute on function public.is_bills_admin() from anon, public;
revoke execute on function public.match_or_create_bill_item_product() from anon, public;
revoke execute on function public.sync_bill_json_items() from anon, public;
revoke execute on function public.sync_product_price_history() from anon, public;

-- Keep only the user-facing administrative RPCs available to signed-in users.
grant execute on function public.admin_update_user_role(uuid,text,boolean,text) to authenticated;
grant execute on function public.admin_user_overview() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_bills_admin() to authenticated;

-- Trigger functions are invoked by PostgreSQL triggers and do not require direct API access.
revoke execute on function public.match_or_create_bill_item_product() from authenticated;
revoke execute on function public.sync_bill_json_items() from authenticated;
revoke execute on function public.sync_product_price_history() from authenticated;

-- Pin search paths on mutable trigger/helper functions.
alter function public.update_updated_at_column() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.update_updated_at() set search_path = public;
alter function public.bill_duplicate_key(text,text,text,text) set search_path = public;
alter function public.set_bill_duplicate_key() set search_path = public;
