-- White Saffron Supply Invoice Photo setup
-- Run once in Supabase SQL Editor for project tmupbruwmwlrmewhoodn.
-- Adds an optional private invoice photo. Existing Supply Rate rows are unchanged.

alter table public.supply_rates
add column if not exists invoice_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supply-invoice-photos',
  'supply-invoice-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "supply invoice photos insert own folder" on storage.objects;
create policy "supply invoice photos insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'supply-invoice-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select auth.uid()) in (
    '79c4c15e-87b7-415a-82f0-825054458e59'::uuid,
    '5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid
  )
);

drop policy if exists "supply invoice photos authorized read" on storage.objects;
create policy "supply invoice photos authorized read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'supply-invoice-photos'
  and (select auth.uid()) in (
    '79c4c15e-87b7-415a-82f0-825054458e59'::uuid,
    '5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid
  )
);

drop policy if exists "supply invoice photos delete owner or admin" on storage.objects;
create policy "supply invoice photos delete owner or admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'supply-invoice-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select auth.uid()) = '5c0d47f8-68c1-4a60-a1b8-c80885c385da'::uuid
  )
);
