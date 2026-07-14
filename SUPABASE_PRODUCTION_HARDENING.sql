-- White Saffron production hardening
-- Run once in Supabase SQL Editor for project tmupbruwmwlrmewhoodn.
-- Safe and idempotent: preserves all existing records.
-- Admin UID: 5c0d47f8-68c1-4a60-a1b8-c80885c385da

create or replace function public.white_saffron_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['supply_rates','stock_entries','inventory_items']
  loop
    if to_regclass('public.' || table_name) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema='public' and information_schema.columns.table_name=table_name and column_name='updated_at'
       ) then
      execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.white_saffron_set_updated_at()',
        table_name || '_set_updated_at', table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.white_saffron_prevent_duplicate_bill_no()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bill_column text := tg_argv[0];
  normalized text;
  duplicate_found boolean;
  current_id text;
begin
  normalized := lower(btrim(to_jsonb(new) ->> bill_column));
  if normalized is null or normalized = '' then
    return new;
  end if;
  current_id := to_jsonb(new) ->> 'id';
  execute format(
    'select exists (
       select 1 from public.%I existing
       where lower(btrim((to_jsonb(existing) ->> %L))) = $1
         and ($2 is null or to_jsonb(existing) ->> ''id'' <> $2)
     )',
    tg_table_name, bill_column
  ) into duplicate_found using normalized, current_id;
  if duplicate_found then
    raise exception 'Bill number already exists: %', to_jsonb(new) ->> bill_column
      using errcode = '23505';
  end if;
  return new;
end;
$$;

do $$
declare bill_column text;
declare duplicate_count bigint;
begin
  if to_regclass('public.bills') is null then
    raise notice 'public.bills not found; bill-number protection skipped.';
    return;
  end if;

  select column_name into bill_column
  from information_schema.columns
  where table_schema='public'
    and table_name='bills'
    and column_name in ('bill_no','Bill No','bill_number','Bill Number')
  order by case column_name when 'bill_no' then 1 when 'Bill No' then 2 else 3 end
  limit 1;

  if bill_column is null then
    raise notice 'No supported bill-number column found; protection skipped.';
    return;
  end if;

  execute 'drop trigger if exists bills_prevent_duplicate_bill_no on public.bills';
  execute format(
    'create trigger bills_prevent_duplicate_bill_no before insert or update of %I on public.bills
     for each row execute function public.white_saffron_prevent_duplicate_bill_no(%L)',
    bill_column, bill_column
  );

  execute format(
    'select count(*) from (
       select lower(btrim(%I::text))
       from public.bills
       where nullif(btrim(%I::text), '''') is not null
       group by lower(btrim(%I::text))
       having count(*) > 1
     ) duplicates',
    bill_column, bill_column, bill_column
  ) into duplicate_count;

  if duplicate_count = 0 then
    execute format(
      'create unique index if not exists bills_bill_no_normalized_uidx
       on public.bills (lower(btrim(%I::text)))
       where nullif(btrim(%I::text), '''') is not null',
      bill_column, bill_column
    );
  else
    raise notice '% existing duplicate bill-number group(s) remain. New duplicates are blocked; clean old groups before adding the unique index.', duplicate_count;
  end if;
end $$;

-- Replace legacy email-based stock authorization with immutable user IDs.
do $$
begin
  if to_regclass('public.stock_entries') is not null then
    execute 'drop policy if exists "stock select own or admin" on public.stock_entries';
    execute 'create policy "stock select own or admin" on public.stock_entries for select to authenticated using (user_id=(select auth.uid()) or (select auth.uid())=''5c0d47f8-68c1-4a60-a1b8-c80885c385da''::uuid)';
    execute 'drop policy if exists "stock update own or admin" on public.stock_entries';
    execute 'create policy "stock update own or admin" on public.stock_entries for update to authenticated using (user_id=(select auth.uid()) or (select auth.uid())=''5c0d47f8-68c1-4a60-a1b8-c80885c385da''::uuid) with check (user_id=(select auth.uid()) or (select auth.uid())=''5c0d47f8-68c1-4a60-a1b8-c80885c385da''::uuid)';
    execute 'drop policy if exists "stock delete admin" on public.stock_entries';
    execute 'create policy "stock delete admin" on public.stock_entries for delete to authenticated using ((select auth.uid())=''5c0d47f8-68c1-4a60-a1b8-c80885c385da''::uuid)';
  end if;
end $$;

drop policy if exists "stock photos select own or admin" on storage.objects;
create policy "stock photos select own or admin" on storage.objects
for select to authenticated
using (
  bucket_id='stock-photos'
  and ((storage.foldername(name))[1]=(select auth.uid())::text
       or (select auth.uid())='5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid)
);

drop policy if exists "stock photos delete admin" on storage.objects;
create policy "stock photos delete admin" on storage.objects
for delete to authenticated
using (
  bucket_id='stock-photos'
  and (select auth.uid())='5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid
);
