-- AI Librarian V2 cloud reporting setup
-- Run in Supabase SQL Editor for project tmupbruwmwlrmewhoodn.
-- This creates cloud tables for Librarian questions, reports, and learnings.
-- Keep this-year default unless user asks otherwise.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.ai_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  matched_key text,
  matched_path text,
  risk_level text not null default 'low' check (risk_level in ('low', 'review', 'high')),
  is_risky boolean generated always as (risk_level in ('review', 'high')) stored,
  is_weak boolean not null default false,
  response_time_ms integer not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique default current_date,
  window_start timestamptz not null,
  window_end timestamptz not null,
  query_count integer not null default 0,
  avg_response_ms integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  risky_questions jsonb not null default '[]'::jsonb,
  weak_questions jsonb not null default '[]'::jsonb,
  repeated_questions jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.ai_learnings (
  id uuid primary key default gen_random_uuid(),
  topic text not null unique,
  confidence numeric(4,3) not null default 0.500,
  times_asked integer not null default 1,
  last_used timestamptz not null default now(),
  source text not null default 'librarian',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_questions_created_at_idx on public.ai_questions (created_at desc);
create index if not exists ai_questions_risk_idx on public.ai_questions (risk_level, created_at desc);
create index if not exists ai_questions_weak_idx on public.ai_questions (is_weak, created_at desc);
create index if not exists ai_reports_report_date_idx on public.ai_reports (report_date desc);

alter table public.ai_questions enable row level security;
alter table public.ai_reports enable row level security;
alter table public.ai_learnings enable row level security;

-- Frontend admin can insert their own Librarian questions.
drop policy if exists "Admin can insert ai questions" on public.ai_questions;
create policy "Admin can insert ai questions"
on public.ai_questions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Authenticated users can read their own questions. Admin report function can read all using service role.
drop policy if exists "Users can read own ai questions" on public.ai_questions;
create policy "Users can read own ai questions"
on public.ai_questions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Reports and learnings are backend/service-role managed in V2. Keep browser read closed for now.
-- If you later want admin browser read, add an admin role table or app_metadata role and create a strict admin SELECT policy.

-- Grant table access to authenticated role for ai_questions API access; RLS still controls rows.
grant select, insert on public.ai_questions to authenticated;
grant select on public.ai_reports to authenticated;
grant select on public.ai_learnings to authenticated;

-- Optional schedule: run after the Edge Function generate-ai-report is deployed.
-- 08:00 Maldives time is 03:00 UTC.
-- Store secrets first in Supabase Vault or replace safely in the Dashboard, not in browser code.
--
-- select vault.create_secret('https://tmupbruwmwlrmewhoodn.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'publishable_key');
--
-- select cron.schedule(
--   'daily-ai-librarian-report',
--   '0 3 * * *',
--   $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/generate-ai-report',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
--     ),
--     body := jsonb_build_object('source', 'pg_cron', 'time', now())
--   ) as request_id;
--   $$
-- );
