-- Merge several duplicate master products into one correct product atomically.
create or replace function public.merge_master_products_bulk(p_source_ids uuid[],p_target_id uuid)
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_source_id uuid;
  v_count integer:=0;
begin
  if not public.is_app_admin() then raise exception 'Admin access required'; end if;
  if p_target_id is null or coalesce(array_length(p_source_ids,1),0)=0 then
    raise exception 'Select duplicate products and one correct product';
  end if;
  foreach v_source_id in array p_source_ids loop
    if v_source_id is null or v_source_id=p_target_id then continue; end if;
    perform public.merge_master_products(v_source_id,p_target_id);
    v_count:=v_count+1;
  end loop;
  if v_count=0 then raise exception 'No valid duplicate products selected'; end if;
  return v_count;
end
$$;
revoke all on function public.merge_master_products_bulk(uuid[],uuid) from public,anon;
grant execute on function public.merge_master_products_bulk(uuid[],uuid) to authenticated;
