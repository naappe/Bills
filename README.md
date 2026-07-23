# White Saffron Procurement ERP

A GitHub Pages procurement workspace backed by Supabase.

## Live application

`https://naappe.github.io/Bills/`

## Core modules

- Dashboard and purchasing KPIs
- Bills and multi-row bill entry
- Vendors
- Products, units, and categories
- Price Book and price history
- Reports and CSV exports
- Company settings
- Roles and permissions
- Bill approval, rejection, reopening, archive, and recovery
- Mobile and offline-state refinements

## Architecture

- Frontend: static HTML, CSS, and JavaScript
- Hosting: GitHub Pages
- Authentication and database: Supabase
- Deployment generation: `scripts/apply-v9.py`
- Automated release validation: `scripts/release-audit.py`

The browser uses a Supabase publishable key. Privileged service-role keys and third-party secret keys must never be committed to this repository.

## Release verification

```bash
python scripts/apply-v9.py
python scripts/release-audit.py
```

GitHub Actions runs these checks whenever application assets or deployment scripts change.

See [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) for role testing, live-browser acceptance checks, backup guidance, and rollback procedures.

## Operational warning

Automated checks verify the static application structure and scan for common secret-key patterns. They do not replace testing with real admin, staff, manager, and read-only accounts. Supabase policy behavior, live report downloads, browser-console behavior, and backup restoration must be validated in production before operational sign-off.
