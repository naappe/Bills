-- BusinessOS v0.3.1: allow GRN posting before opening stock count.
-- Accepted quantities for uninitialized products remain explicitly inventory-pending.

alter table public.goods_receipt_items add column if not exists inventory_posted boolean not null default false;
alter table public.goods_receipt_items add column if not exists stock_movement_id bigint references public.stock_movements(id) on delete set null;
create index if not exists goods_receipt_items_inventory_pending_idx on public.goods_receipt_items(inventory_posted,goods_receipt_id) where received_quantity>0;

create or replace function public.post_goods_receipt(
  p_order_id bigint,
  p_receipt jsonb,
  p_items jsonb,
  p_allow_over_delivery boolean default false
) returns bigint
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_po public.purchase_orders%rowtype;
  v_grn_id bigint;
  v_grn_item_id bigint;
  v_grn_no text;
  v_line jsonb;
  v_item public.purchase_order_items%rowtype;
  v_qty numeric;
  v_rejected numeric;
  v_remaining numeric;
  v_over numeric;
  v_stock numeric;
  v_new_stock numeric;
  v_tracking boolean;
  v_stock_movement_id bigint;
  v_line_count integer:=0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(role) into v_role from public.user_roles where user_id=v_uid and is_active limit 1;
  if coalesce(v_role,'') not in ('admin','manager','staff') then raise exception 'Not authorized to post goods receipts'; end if;

  select * into v_po from public.purchase_orders where id=p_order_id for update;
  if not found then raise exception 'Purchase order not found'; end if;
  if v_po.status not in ('sent','part_received') then raise exception 'Only sent or partially received purchase orders can be received'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'At least one receipt line is required'; end if;

  v_grn_no:='GRN-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.goods_receipt_no_seq')::text,6,'0');
  insert into public.goods_receipts(grn_no,purchase_order_id,receipt_date,supplier_delivery_no,location,notes,created_by)
  values(v_grn_no,p_order_id,coalesce(nullif(p_receipt->>'receipt_date','')::date,current_date),nullif(btrim(p_receipt->>'supplier_delivery_no'),''),nullif(btrim(p_receipt->>'location'),''),nullif(btrim(p_receipt->>'notes'),''),v_uid)
  returning id into v_grn_id;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_qty:=coalesce(nullif(v_line->>'received_quantity','')::numeric,0);
    v_rejected:=coalesce(nullif(v_line->>'rejected_quantity','')::numeric,0);
    if v_qty<0 or v_rejected<0 then raise exception 'Received and rejected quantities cannot be negative'; end if;
    if v_qty+v_rejected<=0 then continue; end if;

    select * into v_item from public.purchase_order_items where id=(v_line->>'purchase_order_item_id')::bigint and purchase_order_id=p_order_id for update;
    if not found then raise exception 'Purchase order item not found or does not belong to this order'; end if;

    v_remaining:=greatest(v_item.quantity-v_item.received_quantity,0);
    v_over:=greatest(v_qty-v_remaining,0);
    if v_over>0 and (not p_allow_over_delivery or v_role='staff') then raise exception 'Over-delivery of % % requires manager/admin acceptance',v_over,v_item.unit; end if;

    select coalesce(stock,0),stock_tracking_active into v_stock,v_tracking from public.supply where id=v_item.supply_id and is_active for update;
    if not found then raise exception 'Product % is not active',v_item.description; end if;

    insert into public.goods_receipt_items(
      goods_receipt_id,purchase_order_item_id,supply_id,description,unit,ordered_quantity,previously_received,
      received_quantity,rejected_quantity,over_delivery_quantity,remaining_after,unit_rate,notes,inventory_posted
    ) values(
      v_grn_id,v_item.id,v_item.supply_id,v_item.description,v_item.unit,v_item.quantity,v_item.received_quantity,
      v_qty,v_rejected,v_over,greatest(v_item.quantity-(v_item.received_quantity+v_qty),0),v_item.unit_rate,
      nullif(btrim(v_line->>'notes'),''),false
    ) returning id into v_grn_item_id;

    if v_qty>0 and coalesce(v_tracking,false) then
      v_new_stock:=v_stock+v_qty;
      update public.supply set stock=v_new_stock,"Rate"=case when v_item.unit_rate>0 then v_item.unit_rate::double precision else "Rate" end,last_purchase_date=coalesce(nullif(p_receipt->>'receipt_date','')::date,current_date),updated_at=now() where id=v_item.supply_id;
      insert into public.stock_movements(supply_id,movement_type,quantity,previous_stock,new_stock,reference,reason,movement_date,created_by,goods_receipt_id,goods_receipt_item_id)
      values(v_item.supply_id,'purchase',v_qty,v_stock,v_new_stock,v_grn_no,'Goods receipt from '||v_po.po_no,coalesce(nullif(p_receipt->>'receipt_date','')::date,current_date),v_uid,v_grn_id,v_grn_item_id)
      returning id into v_stock_movement_id;
      update public.goods_receipt_items set inventory_posted=true,stock_movement_id=v_stock_movement_id where id=v_grn_item_id;
    end if;

    if v_qty>0 then update public.purchase_order_items set received_quantity=received_quantity+v_qty where id=v_item.id; end if;
    v_line_count:=v_line_count+1;
  end loop;

  if v_line_count=0 then raise exception 'Enter a received or rejected quantity on at least one line'; end if;

  update public.purchase_orders po set status=case when not exists(select 1 from public.purchase_order_items i where i.purchase_order_id=po.id and i.received_quantity<i.quantity) then 'received' else 'part_received' end,updated_at=now() where po.id=p_order_id;
  return v_grn_id;
end;
$$;

create or replace function public.post_pending_goods_receipt_inventory(p_receipt_item_id bigint)
returns bigint
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_role text;
  v_item public.goods_receipt_items%rowtype;
  v_grn public.goods_receipts%rowtype;
  v_po public.purchase_orders%rowtype;
  v_stock numeric;
  v_new numeric;
  v_tracking boolean;
  v_movement_id bigint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(role) into v_role from public.user_roles where user_id=v_uid and is_active limit 1;
  if coalesce(v_role,'') not in ('admin','manager','staff') then raise exception 'Not authorized'; end if;

  select * into v_item from public.goods_receipt_items where id=p_receipt_item_id for update;
  if not found then raise exception 'Goods receipt item not found'; end if;
  if v_item.inventory_posted then return v_item.stock_movement_id; end if;
  if v_item.received_quantity<=0 then raise exception 'This line has no accepted quantity to post'; end if;

  select * into v_grn from public.goods_receipts where id=v_item.goods_receipt_id;
  select * into v_po from public.purchase_orders where id=v_grn.purchase_order_id;
  select coalesce(stock,0),stock_tracking_active into v_stock,v_tracking from public.supply where id=v_item.supply_id and is_active for update;
  if not found then raise exception 'Product is not active'; end if;
  if not coalesce(v_tracking,false) then raise exception 'Initialize the opening stock count first'; end if;

  v_new:=v_stock+v_item.received_quantity;
  update public.supply set stock=v_new,"Rate"=case when v_item.unit_rate>0 then v_item.unit_rate::double precision else "Rate" end,last_purchase_date=v_grn.receipt_date,updated_at=now() where id=v_item.supply_id;
  insert into public.stock_movements(supply_id,movement_type,quantity,previous_stock,new_stock,reference,reason,movement_date,created_by,goods_receipt_id,goods_receipt_item_id)
  values(v_item.supply_id,'purchase',v_item.received_quantity,v_stock,v_new,v_grn.grn_no,'Deferred goods receipt from '||v_po.po_no,v_grn.receipt_date,v_uid,v_grn.id,v_item.id)
  returning id into v_movement_id;
  update public.goods_receipt_items set inventory_posted=true,stock_movement_id=v_movement_id where id=v_item.id;
  return v_movement_id;
end;
$$;

revoke all on function public.post_pending_goods_receipt_inventory(bigint) from public,anon;
grant execute on function public.post_pending_goods_receipt_inventory(bigint) to authenticated;
