-- Master product catalog, aliases, and admin merge workflow.
create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (lower(regexp_replace(btrim(alias), '\s+', ' ', 'g'))) stored,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint product_aliases_alias_not_blank check (btrim(alias) <> ''),
  constraint product_aliases_normalized_unique unique (normalized_alias)
);
alter table public.product_aliases enable row level security;
create policy product_aliases_read_active on public.product_aliases for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));
create policy product_aliases_manage_admin on public.product_aliases for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());
create policy products_insert_active_users on public.products for insert to authenticated
with check (exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active));

create or replace function public.create_master_product(p_name text)
returns public.products language plpgsql security invoker set search_path=public as $$
declare v_name text:=regexp_replace(btrim(coalesce(p_name,'')),'\s+',' ','g'); v_product public.products;
begin
 if not exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.is_active) then raise exception 'Active user required'; end if;
 if v_name='' then raise exception 'Product name is required'; end if;
 select p.* into v_product from public.products p left join public.product_aliases a on a.product_id=p.id
 where p.deleted_at is null and (lower(btrim(p.name))=lower(v_name) or a.normalized_alias=lower(v_name))
 order by p.created_at limit 1;
 if v_product.id is null then insert into public.products(name,is_active,created_by,updated_by) values(v_name,true,auth.uid(),auth.uid()) returning * into v_product; end if;
 return v_product;
end $$;
revoke all on function public.create_master_product(text) from public,anon;
grant execute on function public.create_master_product(text) to authenticated;

create or replace function public.merge_master_products(p_source_id uuid,p_target_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare v_source_name text; v_target_name text;
begin
 if not public.is_app_admin() then raise exception 'Admin access required'; end if;
 if p_source_id is null or p_target_id is null or p_source_id=p_target_id then raise exception 'Choose two different products'; end if;
 select name into v_source_name from public.products where id=p_source_id and deleted_at is null for update;
 select name into v_target_name from public.products where id=p_target_id and deleted_at is null for update;
 if v_source_name is null or v_target_name is null then raise exception 'Product not found'; end if;
 insert into public.product_aliases(product_id,alias,created_by) values(p_target_id,v_source_name,auth.uid())
 on conflict(normalized_alias) do update set product_id=excluded.product_id;
 insert into public.product_aliases(product_id,alias,created_by) select p_target_id,alias,auth.uid() from public.product_aliases where product_id=p_source_id
 on conflict(normalized_alias) do update set product_id=excluded.product_id;
 update public.bill_items set product_id=p_target_id,item_name=v_target_name,description=v_target_name,updated_at=now(),updated_by=auth.uid()
 where product_id=p_source_id or lower(btrim(coalesce(description,item_name,'')))=lower(btrim(v_source_name));
 update public.price_history set product_id=p_target_id where product_id=p_source_id;
 update public.bills b set items=(select coalesce(jsonb_agg(case
  when lower(btrim(coalesce(item->>'description',item->>'item_name',item->>'name','')))=lower(btrim(v_source_name))
   or nullif(item->>'product_id','')=p_source_id::text
  then (item||jsonb_build_object('description',v_target_name,'product_id',p_target_id::text))-'item_name'-'name' else item end order by ord),'[]'::jsonb)
  from jsonb_array_elements(b.items) with ordinality x(item,ord)),updated_at=now()
 where jsonb_typeof(b.items)='array' and exists(select 1 from jsonb_array_elements(b.items) item
  where lower(btrim(coalesce(item->>'description',item->>'item_name',item->>'name','')))=lower(btrim(v_source_name))
   or nullif(item->>'product_id','')=p_source_id::text);
 delete from public.product_aliases where product_id=p_source_id;
 update public.products set is_active=false,deleted_at=now(),updated_at=now(),updated_by=auth.uid() where id=p_source_id;
end $$;
revoke all on function public.merge_master_products(uuid,uuid) from public,anon;
grant execute on function public.merge_master_products(uuid,uuid) to authenticated;
