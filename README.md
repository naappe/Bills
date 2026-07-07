# White Saffron Bills Tracker

A single-page bill management app for White Saffron, hosted on GitHub Pages and connected to Supabase.

## Live App

GitHub Pages:

```text
https://naappe.github.io/Bills/
```

Stock Photo Entry:

```text
https://naappe.github.io/Bills/stock.html
```

Admin AI Librarian Monitor:

```text
https://naappe.github.io/Bills/librarian.html
```

## File Structure

```text
Bills/
├── index.html               # Full bills application: HTML, CSS, JavaScript, Supabase client
├── stock.html               # Stock photo upload and manual stock entry page
├── librarian.html           # Admin-only AI Librarian Monitor V1
├── SUPABASE_STOCK_SETUP.sql # SQL for stock_entries table and stock-photos storage bucket
├── PROJECT_KNOWLEDGE.json   # Machine-readable project knowledge index
├── README.md                # Project structure and operating notes
├── AI_LIBRARIAN.md          # Read-first project map for future AI/code changes
└── AI_BRAIN_GUIDE.md        # Optional AI assistant/backend hosting plan
```

The app is intentionally kept as static HTML files so GitHub Pages can host it without build tools, Node, or a server.

## Stock Photo Entry

The live Stock page is [`stock.html`](stock.html). V1 works without a host:

- Upload stock photos to the private Supabase Storage bucket `stock-photos`.
- Save manual stock data to `public.stock_entries`.
- Use status values `Needs Review`, `Reviewed`, and `Saved`.
- Admin can review all records; staff can work with their own records when the RLS setup is applied.

Before using Stock Entry, run [`SUPABASE_STOCK_SETUP.sql`](SUPABASE_STOCK_SETUP.sql) in the Supabase SQL Editor. The Supabase connector did not have permission to apply the schema automatically from this workspace.

AI photo extraction is the next phase. Later, a Supabase Edge Function or hosted backend can read the saved photo and fill the stock fields automatically. Do not put AI provider keys in browser code.

## AI Librarian

Future AI/code assistants should read [`AI_LIBRARIAN.md`](AI_LIBRARIAN.md) first. It explains the project structure, important functions, Supabase columns, roles, admin-only AI behavior, and common edit locations so changes can be made faster.

The live V1 Librarian Monitor is [`librarian.html`](librarian.html). It is admin-only, reads [`PROJECT_KNOWLEDGE.json`](PROJECT_KNOWLEDGE.json), searches known project areas, shows local recent queries, displays simple knowledge/monitoring stats, and generates a 24-hour Evolution Report from admin usage.

The Evolution Report checks:

- repeated questions,
- weak or missing knowledge matches,
- risky admin topics such as delete, RLS, policies, keys, and permissions,
- average local lookup time,
- recommended improvements for the next build.

V1 does not need OpenAI, WebSocket, or a backend. The report is generated from local browser history. Automatic 24-hour delivery requires V2 with a backend or Supabase Edge Function, a reports table, and a scheduled job.

## AI Brain Plan

The optional AI Brain plan is documented in [`AI_BRAIN_GUIDE.md`](AI_BRAIN_GUIDE.md).

Key rule: keep AI provider keys and service-role database keys in a backend or Supabase Edge Function, never in `index.html` or browser JavaScript.

AI Assistant, Insights, Predictions, Anomalies, and Librarian reports are admin-dashboard features only. Staff and white users should not see those pages or call those backend routes.

## Main Features

- Login with Supabase Auth.
- Username aliases:
  - `white` or `staff` maps to `whitesafrron2025@gmail.com`
  - `admin` or `naappe` maps to `naappe@gmail.com`
- Date filter for this year, today, this week, this month, last month, date range, and all years.
- Loads all Supabase rows in 1,000-record batches.
- Add, edit, delete, refresh, and export bills.
- New bills default to `Pending`.
- Existing imported bills with no payment status are displayed as `Paid` when dated up to today.
- Staff edit/delete is limited to own new entries within 24 hours in the app UI.
- Dashboard uses the same filtered data as the bills list.
- Analysis and future AI Brain views are admin-only.
- Bills list uses paged navigation instead of rendering every bill at once.
- Stock page uploads images to Supabase Storage and saves stock records.

## Supabase

Project URL used in the app:

```text
https://tmupbruwmwlrmewhoodn.supabase.co
```

Table expected by the bills app:

```text
public.bills
```

Table expected by the stock page:

```text
public.stock_entries
```

Storage bucket expected by the stock page:

```text
stock-photos
```

Supported bill columns include either imported CSV-style names or app-style names:

| Purpose | Supported Column Names |
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
| Created date | `created_at`, `createdAt` |

## Recommended Database Columns

For best results, keep these columns in `public.bills`:

```sql
id bigint generated by default as identity primary key,
bill_date text,
vendor text,
amount numeric,
bill_no text,
location text,
tin text,
category text,
payment_status text default 'Pending',
payment_method text,
notes text,
user_id uuid,
created_by text,
created_at timestamptz default now()
```

For stock setup, run:

```text
SUPABASE_STOCK_SETUP.sql
```

## Design System

The app uses a modern dashboard style:

- Inter / SF Pro style system fonts.
- Left sidebar navigation.
- Card-based stats and bill rows.
- Date range filtering.
- Soft shadows, light gray backgrounds, rounded 12px cards.
- Blue primary action color.
- Green paid badge, yellow pending badge, red cancelled badge.
- Mobile-first compact bill cards.

## Deployment

This repo is static. GitHub Pages serves the HTML files directly from the main branch.

After updates, wait about one minute and hard refresh the browser:

```text
Ctrl + F5
```

On mobile, close and reopen the browser tab if the old version is cached.
