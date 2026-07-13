# White Saffron Bills — Backup and Restore

## Current Stable Website Backup

- **Backup date:** 13 July 2026
- **Backup branch:** `backup-stable-2026-07-13`
- **Source branch:** `main`
- **Repository:** `naappe/Bills`
- **Status:** Stable checkpoint created after the layout cleanup, write-verification audit, GST correction and vendor item-memory update.

Backup link:

```text
https://github.com/naappe/Bills/tree/backup-stable-2026-07-13
```

## What This Backup Contains

The branch preserves all repository files at the checkpoint, including:

- Dashboard and Bills
- Supply Rates
- Settings and vendor management
- Inventory alert interface and setup SQL
- Stock entry page
- README, SHAS and branding standards
- Supabase setup SQL files

## Important Data Boundary

The GitHub backup protects website code and SQL setup files. It does **not** copy live Supabase database rows, Auth users, or Storage photos.

Periodically export these Supabase tables separately:

- `public.bills`
- `public.supply_rates`
- `public.stock_entries`
- `public.inventory_items` after its setup SQL is applied

Also back up the private `stock-photos` Storage bucket when it contains important photos.

## Safe Restore Method

If a later website change causes a problem:

1. Do not delete Supabase data.
2. Open the backup branch and verify the required files.
3. Restore only the affected code files from `backup-stable-2026-07-13`.
4. Commit the restored files to `main`.
5. Wait for GitHub Pages to deploy.
6. Test login, Dashboard, Bills, Supply Rates and Settings.
7. Verify one non-destructive read before testing any add, edit or delete action.

## Full Code Restore

A repository administrator can compare the current `main` branch against:

```text
backup-stable-2026-07-13
```

Then restore the stable files through a pull request or a deliberate branch update. Avoid force-resetting `main` unless the current changes have first been backed up.

## Create the Next Backup

Before a major future update, create another dated branch:

```text
backup-stable-YYYY-MM-DD
```

Never move or overwrite an existing dated backup branch.
