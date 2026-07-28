-- Keep bill-level administration aligned with the role managed in Admin & users.
create or replace function public.is_bills_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = '5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid
      or exists (
        select 1
        from public.user_roles r
        where r.user_id = auth.uid()
          and r.role = 'admin'
          and r.is_active = true
      );
$$;

revoke all on function public.is_bills_admin() from public, anon;
grant execute on function public.is_bills_admin() to authenticated;
