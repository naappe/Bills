# AI Librarian V2 Auto-Reports Guide

V2 moves the AI Librarian report history from browser-only localStorage into Supabase.

## What V2 Adds

- `ai_questions`: stores Librarian questions and lookup results in Supabase.
- `ai_reports`: stores 24-hour report summaries in Supabase.
- `ai_learnings`: stores repeated or learned topics for future knowledge updates.
- `generate-ai-report`: Supabase Edge Function that creates one report for the last 24 hours.
- Optional email delivery through Resend when email secrets are configured.
- Optional daily schedule through Supabase `pg_cron` and `pg_net`.

Supabase Edge Functions are server-side TypeScript functions running on Deno. Scheduled runs on Supabase use `pg_cron` plus `pg_net` to call an Edge Function on a cron schedule.

## Important Rules

- Keep this-year default unless user asks otherwise.
- Never place `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or email provider secrets in browser files.
- Staff users must not see or call admin AI report tools.
- V2 reports need cloud questions. Browser localStorage cannot be read by an Edge Function.

## Files Added

```text
SUPABASE_AI_REPORTS_V2.sql
supabase/functions/generate-ai-report/index.ts
AI_REPORTS_V2_GUIDE.md
```

## Step 1: Run SQL

Open Supabase SQL Editor and run:

```text
SUPABASE_AI_REPORTS_V2.sql
```

This creates:

```text
public.ai_questions
public.ai_reports
public.ai_learnings
```

## Step 2: Deploy Edge Function

Use Supabase CLI or Dashboard/Edge Functions upload.

CLI example:

```bash
supabase functions deploy generate-ai-report
```

The function source is:

```text
supabase/functions/generate-ai-report/index.ts
```

## Step 3: Add Function Secrets

Required:

```text
SUPABASE_URL=https://tmupbruwmwlrmewhoodn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional email:

```text
RESEND_API_KEY=your_resend_key
AI_REPORT_EMAIL_TO=naappe@gmail.com
AI_REPORT_EMAIL_FROM=AI Librarian <your_verified_sender@example.com>
```

Do not add these secrets to `index.html`, `librarian.html`, or GitHub Pages.

## Step 4: Test Function

Invoke the function once:

```bash
supabase functions invoke generate-ai-report --method POST
```

Expected result:

```json
{
  "success": true,
  "report": {
    "report_date": "YYYY-MM-DD"
  }
}
```

## Step 5: Enable Daily Schedule

After the function works, uncomment and run the schedule block at the bottom of:

```text
SUPABASE_AI_REPORTS_V2.sql
```

The schedule in that file runs at `03:00 UTC`, which is `08:00 Maldives time`.

## Step 6: Connect Librarian UI

Next code change needed in `librarian.html`:

- When `ask()` runs, insert the question record into `public.ai_questions`.
- Keep localStorage as fallback if Supabase insert fails.
- Add a small cloud report indicator showing the latest row from `public.ai_reports`.

Suggested insert payload:

```js
await db.from('ai_questions').insert({
  question: q,
  answer: top.title || top.summary || '',
  matched_key: top.key || 'none',
  matched_path: top.path || '',
  risk_level: riskLevel(q),
  is_weak: top.weak || top.score < 2,
  response_time_ms: duration,
  user_id: user.id,
  created_by: user.email
});
```

## Current Limitation

V2 files are ready, but the current live `librarian.html` still stores questions in browser localStorage only. The next live-app change should wire `saveRecent()` to also insert into `ai_questions`.
