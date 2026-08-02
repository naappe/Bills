-- White Saffron ERP: audited stock ledger foundation

alter table public.stock_movements
  add column if not exists related_movement_id bigint
    references public.stock_movements(id) on delete set null,
  add column if not exists is_reversal boolean not null default false;

create index if not exists stock_movements_supply_date_idx
  on public.stock_movements(supply_id, movement_date desc, id desc);
create index if not exists stock_movements_related_idx
  on public.stock_movements(related_movement_id)
  where related_movement_id is not null;

create or replace function public.record_stock_movement(
  p_supply_id bigint,
  p_movement_type text,
  p_quantity numeric,
  p_reference text default null,
  p_reason text default null,
  p_movement_date date default current_date,
  p_rate numeric default null
) returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_type text:=lower(btrim(coalesce(p_movement_type,'')));
  v_qty numeric:=coalesce(p_quantity,0);
  v_previous numeric;
  v_new numeric;
  v_delta numeric;
  v_id bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(role) into v_role from public.user_roles
    where user_id=v_uid and is_active limit 1;
  if coalesce(v_role,'') not in ('admin','manager','staff') then
    raise exception 'Not authorized to record stock movements';
  end if;
  if v_type not in ('purchase','usage','return_in','return_out','adjustment_in','adjustment_out','opening_balance') then
    raise exception 'Invalid movement type';
  end if;
  if v_qty<=0 then raise exception 'Quantity must be greater than zero'; end if;
  if v_type in ('adjustment_in','adjustment_out','opening_balance') and v_role<>'admin' then
    raise exception 'Only admin can create adjustments or opening balances';
  end if;
  if v_type in ('return_in','return_out') and v_role='staff' then
    raise exception 'Staff cannot record returns';
  end if;
  if v_type in ('usage','return_out','adjustment_out','adjustment_in','opening_balance')
     and btrim(coalesce(p_reason,''))='' then
    raise exception 'A reason is required for this movement';
  end if;

  select coalesce(stock,0) into v_previous
    from public.supply where id=p_supply_id and is_active for update;
  if not found then raise exception 'Supply item not found'; end if;

  v_delta:=case when v_type in ('purchase','return_in','adjustment_in','opening_balance')
    then v_qty else -v_qty end;
  v_new:=v_previous+v_delta;
  if v_new<0 then
    raise exception 'Stock cannot become negative. Available: %, requested reduction: %',v_previous,v_qty;
  end if;

  update public.supply
    set stock=v_new,
        "Rate"=coalesce(p_rate,"Rate"),
        last_purchase_date=case when v_type in ('purchase','return_in')
          then coalesce(p_movement_date,current_date) else last_purchase_date end,
        updated_at=now()
    where id=p_supply_id;

  insert into public.stock_movements(
    supply_id,movement_type,quantity,previous_stock,new_stock,
    reference,reason,movement_date,created_by
  ) values (
    p_supply_id,v_type,v_qty,v_previous,v_new,
    nullif(btrim(p_reference),''),nullif(btrim(p_reason),''),
    coalesce(p_movement_date,current_date),v_uid
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.reverse_stock_movement(
  p_movement_id bigint,
  p_reason text
) returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_src public.stock_movements%rowtype;
  v_previous numeric;
  v_new numeric;
  v_delta numeric;
  v_id bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(role) into v_role from public.user_roles
    where user_id=v_uid and is_active limit 1;
  if coalesce(v_role,'') not in ('admin','manager') then
    raise exception 'Only admin or manager can reverse stock movements';
  end if;
  if btrim(coalesce(p_reason,''))='' then raise exception 'Reversal reason is required'; end if;

  select * into v_src from public.stock_movements where id=p_movement_id for update;
  if not found then raise exception 'Stock movement not found'; end if;
  if v_src.is_reversal then raise exception 'A reversal movement cannot be reversed'; end if;
  if exists(select 1 from public.stock_movements
      where related_movement_id=v_src.id and is_reversal) then
    raise exception 'This movement has already been reversed';
  end if;

  select coalesce(stock,0) into v_previous
    from public.supply where id=v_src.supply_id for update;
  v_delta:=case when v_src.movement_type in ('purchase','return_in','adjustment_in','opening_balance')
    then -v_src.quantity else v_src.quantity end;
  v_new:=v_previous+v_delta;
  if v_new<0 then raise exception 'Reversal would make stock negative'; end if;

  update public.supply set stock=v_new,updated_at=now() where id=v_src.supply_id;
  insert into public.stock_movements(
    supply_id,movement_type,quantity,previous_stock,new_stock,
    reference,reason,movement_date,created_by,related_movement_id,is_reversal
  ) values (
    v_src.supply_id,'reversal',abs(v_src.quantity),v_previous,v_new,
    coalesce(v_src.reference,'Movement #'||v_src.id),btrim(p_reason),
    current_date,v_uid,v_src.id,true
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.record_stock_movement(bigint,text,numeric,text,text,date,numeric) to authenticated;
grant execute on function public.reverse_stock_movement(bigint,text) to authenticated;

create or replace view public.stock_balance_audit as
select s.id as supply_id,
       s."Name" as supply_name,
       s.stock as cached_stock,
       coalesce(sum(case
         when m.movement_type in ('purchase','return_in','adjustment_in','opening_balance') then m.quantity
         when m.movement_type in ('usage','return_out','adjustment_out') then -m.quantity
         when m.movement_type='reversal' then m.new_stock-m.previous_stock
         else 0 end),0) as ledger_stock,
       s.stock-coalesce(sum(case
         when m.movement_type in ('purchase','return_in','adjustment_in','opening_balance') then m.quantity
         when m.movement_type in ('usage','return_out','adjustment_out') then -m.quantity
         when m.movement_type='reversal' then m.new_stock-m.previous_stock
         else 0 end),0) as variance
from public.supply s
left join public.stock_movements m on m.supply_id=s.id
group by s.id,s."Name",s.stock;

grant select on public.stock_balance_audit to authenticated;
