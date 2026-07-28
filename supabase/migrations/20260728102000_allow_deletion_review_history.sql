-- Keep full approval/rejection history while preventing duplicate pending requests.
alter table public.deletion_requests
drop constraint if exists deletion_requests_entity_type_entity_id_status_key;

create unique index if not exists deletion_requests_one_pending_per_entity_idx
on public.deletion_requests(entity_type,entity_id)
where status='pending';
