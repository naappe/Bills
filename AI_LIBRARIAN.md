# AI Librarian

This file is the project librarian for the White Saffron Bills app. Future AI assistants should read this first before editing code. Its job is to explain where everything lives, what each part means, and what should not be broken.

## Purpose

The user wants fast script changes without re-analyzing the whole project every time. Treat this file as the shortcut map.

When asked to change the app:

1. Read this file first.
2. Read `README.md` for operating notes.
3. Read `index.html` for the live code.
4. Read `AI_BRAIN_GUIDE.md` only when working on real backend AI/chat features.
5. Make the smallest safe change and preserve existing behavior.

## Current Live App

```text
Live URL: https://naappe.github.io/Bills/
Repository: naappe/Bills
Hosting: GitHub Pages
Frontend: single static index.html
Database/Auth: Supabase project tmupbruwmwlrmewhoodn
Main table: public.bills
```

The app is intentionally one HTML file. There is no build step, no package manager, and no local server required for deployment.

## File Map

| File | Use |
| --- | --- |
| `index.html` | Live app. Contains HTML, CSS, JavaScript, Supabase client, auth, filters, bill list, dashboard, admin AI view. |
| `README.md` | Human operating notes, deployment notes, data columns, role summary. |
| `AI_LIBRARIAN.md` | This project map for future AI/code assistants. Read first. |
| `AI_BRAIN_GUIDE.md` | Planned future backend AI/chat architecture. Not live yet. |

## User Roles

| Role | Login alias/email | Current access |
| --- | --- | --- |
| Admin | `admin`, `naappe`, `naappe@gmail.com` | Dashboard, Bills, admin AI insights, all UI edit/delete. |
| Staff/white | `white`, `staff`, `whitesafrron2025@gmail.com` | Dashboard and Bills only. No AI tab. Edit/delete only own new entries within 24 hours in UI. |

Important: frontend hiding is not database security. Real protection should also exist in Supabase RLS policies.

## Supabase Data Model

The app supports imported CSV-style columns and app-style columns at the same time.

| Purpose | Supported names |
| --- | --- |
| Bill date | `Bill Date`, `bill_date` |
| Vendor | `Vendor`, `vendor` |
| Amount | `Amount`, `amount` |
| Bill number | `Bill No`, `bill_no` |
| Location | `Location`, `location` |
| TIN | `TIN`, `tin` |
| Category | `Category`, `category` |
| Status | `payment_status`, `Payment Status`, `status`, `Status` |
| Payment method | `payment_method`, `Payment Method`, `method`, `Method` |
| Notes | `notes`, `Notes` |
| User id | `user_id`, `User ID` |
| Created by | `created_by`, `Created By` |
| Created date | `created_at`, `createdAt` |

Known row count context: the imported table had about 2,474 total records and about 2,315 this-year records as of the latest user screenshots.

## Current App Behavior

- Default page after login is `Bills`.
- `Refresh` returns user to Bills and reloads Supabase data.
- Bills load in 1,000-row batches to avoid Supabase default range limits.
- Bill list is paginated at 12 bills per page.
- Default date filter is `This year`.
- Admin can switch date filter to today, this week, this month, last month, date range, or all years.
- Existing imported bills with blank status are shown as `Paid` when dated up to today.
- New bills default to `Pending`.
- Mobile cards prioritize vendor name first and amount smaller on the right.
- AI/admin view hides normal bill actions, stats, and filters, then shows smart insight cards first.

## Important JavaScript Areas In `index.html`

Because the app is minified into long lines, search by function or constant name.

| Search term | What it controls |
| --- | --- |
| `SUPABASE_URL` | Supabase project connection. |
| `LOGIN_ALIASES` | Username shortcuts like `white`, `admin`, `naappe`. |
| `ADMIN_EMAILS` | Emails treated as admin. |
| `roleFor` | Role detection after login. |
| `isAdmin` | Admin helper. |
| `keys` | Column-name compatibility map. |
| `parseDate` | Date parsing for imported `d/m/yyyy` values. |
| `inDateScope` | Date filter logic. |
| `normStatus` | Paid/Pending/Cancelled display logic. |
| `category` | Automatic category guess. |
| `canEdit` | UI edit/delete permission logic. |
| `applyFilters` | Search/status/date filtering. |
| `renderStats` | Top stats and admin record text. |
| `renderInsights` | Current smart AI insight cards. |
| `renderRows` | Bill card list and pagination. |
| `switchView` | Dashboard/Bills/AI view switching. |
| `loadBills` | Supabase batch loading. |
| `buildPayload` | Add/edit bill payload. |
| `openDialog` | Add/edit modal setup. |
| `saveBill` | Insert/update Supabase row. |
| `deleteBill` | Delete Supabase row. |
| `exportCsv` | CSV export. |

## What The Current AI Tab Is

The current live AI tab is not full chat AI. It is an admin-only smart analysis view built in browser JavaScript.

Current useful cards:

- Spending focus: highest vendor by amount.
- Pending exposure: total pending value.
- Category pattern: highest category by amount.
- Duplicate check: repeated bill numbers.

This is useful for fast admin review, but it does not call OpenAI or a hosted AI model yet.

## What Real AI Should Become

The user's desired future system is an AI helper that acts like a librarian. It should know the project structure and guide changes quickly.

There are two different AI ideas:

| Idea | Meaning | Status |
| --- | --- | --- |
| Project AI Librarian | Repo documentation that helps ChatGPT/Codex understand the project fast. | This file implements it. |
| App AI Brain | Live admin chat/insight backend that analyzes bills with an AI provider. | Planned in `AI_BRAIN_GUIDE.md`. |

For real app AI chat, do not put provider keys in `index.html`. Use a backend or Supabase Edge Function.

## Common Change Requests And Where To Edit

| User asks | Edit area |
| --- | --- |
| Change mobile bill card layout | CSS media queries and `renderRows`. |
| Hide something from staff | CSS `.admin-only`, `body.admin`, and `switchView` guard. |
| Change admin-only AI page | `analysisView`, `renderInsights`, `switchView`, `body.ai-view` CSS. |
| Change filters | Filter HTML, `inDateScope`, `applyFilters`, `renderStats`. |
| Change records per page | `BILLS_PER_PAGE`. |
| Change Supabase table/keys | `SUPABASE_URL`, `SUPABASE_KEY`, `TABLE_NAME`. Be careful with public keys. |
| Change roles/admin email | `LOGIN_ALIASES`, `ADMIN_EMAILS`, `roleFor`. |
| Change export columns | `exportCsv`. |
| Add bill fields | Modal form, `keys`, `buildPayload`, `openDialog`, `exportCsv`, display in `renderRows`. |
| Add real AI chat | Do not only edit frontend. Add backend/Edge Function from `AI_BRAIN_GUIDE.md`. |

## Design Rules From The User

- Modern, clean, professional, simple.
- Mobile must be easy and compact.
- Each bill should feel separate, not one endless table.
- Vendor name should be easy to identify.
- Price should not dominate mobile cards.
- Staff/white should not see admin AI.
- Admin needs useful analysis, not unnecessary frontend text.
- This-year view is the default.
- Imported old bills are paid; new bills are pending.

## Do Not Break

- Do not expose service role keys or AI provider keys in browser code.
- Do not remove CSV-style column compatibility unless the database is migrated.
- Do not make staff see admin AI.
- Do not revert pagination.
- Do not load only 1,000 records; keep batch loading.
- Do not assume every imported bill has `user_id`.
- Do not use `auth.uid() = user_id` as the only SELECT policy if imported shared rows must be visible.
- Do not turn the static GitHub Pages app into a build app unless the user asks.

## Fast Debug Checklist

If bills do not load:

1. Check browser console error.
2. Check Supabase RLS policies for `public.bills`.
3. Check Data API grants for `anon` and `authenticated` roles.
4. Confirm the table is still named `bills`.
5. Confirm columns still match the `keys` map.
6. Confirm the publishable key is valid.

If AI tab is missing:

1. Confirm login is admin/naappe.
2. Confirm `ADMIN_EMAILS` contains the admin email.
3. Confirm `document.body` gets class `admin` after login.
4. Confirm the AI nav button has `admin-only`.

## Best Response Pattern For Future AI Assistants

When the user asks for a change:

1. Say what you understood in one sentence.
2. Fetch/read `AI_LIBRARIAN.md`, `README.md`, and the relevant part of `index.html`.
3. Make the GitHub change.
4. Read back the changed section.
5. Tell the user the commit SHA and what to hard refresh.

Keep explanations short. The user wants speed and direct fixes.
