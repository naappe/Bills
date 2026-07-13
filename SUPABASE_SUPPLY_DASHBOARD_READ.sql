-- White Saffron Supply Dashboard read access
-- Run once in the Supabase SQL Editor.
-- Signed-in Bills users receive read-only Supply visibility.
-- Insert, update and delete policies remain restricted.

drop policy if exists "Supply rates authorized read" on public.supply_rates;
drop policy if exists "Supply rates authenticated read" on public.supply_rates;

create policy "Supply rates authenticated read"
on public.supply_rates
for select
to authenticated
using (true);
