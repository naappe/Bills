-- White Saffron Prices: optional item photo mapping
-- Run once in Supabase Dashboard > SQL Editor for project tmupbruwmwlrmewhoodn.

create table if not exists public.item_photos (
  item_key text primary key,
  photo_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.item_photos enable row level security;

drop policy if exists "Public can read item photos" on public.item_photos;
create policy "Public can read item photos"
on public.item_photos
for select
to anon, authenticated
using (true);

create index if not exists item_photos_updated_at_idx
on public.item_photos (updated_at desc);

-- Optional example after uploading a file to the `item-photos` Storage bucket:
-- insert into public.item_photos (item_key, photo_path)
-- values ('example-item-name', 'example-item-name.jpg')
-- on conflict (item_key) do update
-- set photo_path = excluded.photo_path,
--     updated_at = now();
