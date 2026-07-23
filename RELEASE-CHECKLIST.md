# White Saffron Procurement ERP — Release Checklist

## Automated checks

Run:

```bash
python scripts/apply-v9.py
python scripts/release-audit.py
```

The audit checks the generated application shell, required production assets, duplicate root elements, and accidental inclusion of service-role, OpenAI, or private-key secrets.

## Database verification

The following production tables have Row Level Security enabled:

- `app_settings`
- `audit_log`
- `bill_items`
- `bills`
- `company_settings`
- `price_history`
- `products`
- `restore_bin`
- `role_permissions`
- `user_roles`
- `vendors`

RLS being enabled does not by itself prove that every policy grants the intended access. Test each role with a real account before changing production permissions.

## Manual acceptance test

1. Sign in as admin and staff.
2. Open every navigation page.
3. Create a bill with multiple item units and confirm subtotal, GST, and grand total.
4. Edit an unapproved bill.
5. Approve a bill and confirm normal editing is blocked.
6. Reopen the approved bill as an authorized role.
7. Archive and restore a bill, vendor, and product where supported.
8. Confirm vendor and product search results are correct.
9. Export each report and verify the downloaded values.
10. Test at desktop, tablet, and narrow mobile widths.
11. Test offline and reconnect notifications.
12. Confirm no uncaught errors appear in the browser console.

## Backup and rollback

- Export critical Supabase data before structural changes.
- Keep the previous known-good Git commit SHA.
- Roll back the frontend by reverting the latest release commit.
- Roll back database structure only through a reviewed Supabase migration; do not delete production columns manually.

## Release status

Static code and schema checks are automated. Live browser behavior, real-account permission boundaries, report downloads, and backup restoration require manual production acceptance testing before operational sign-off.
