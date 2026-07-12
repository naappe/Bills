# Changelog

## 2026-07-12

### Changed
- Moved the search, status, and date controls below the KPI summary cards.
- Removed the Executive Overview dashboard hero section.
- Hid routine successful-load notices while preserving error reporting.

### Data safety
- No database schema or bill data changes.

## 2026-07-12 — Header cleanup and branding

### Changed
- Renamed frontend branding to Cafe' White Saffron.
- Removed duplicate and nonessential header/status text.
- Kept one Add Bill action in the Bill Records section.

### Data safety
- No bill records were deleted or modified.


## 2026-07-12 — Advanced dashboard and stability audit

### Added
- Bright finance analytics dashboard.
- Average bill, paid value, payment rate and largest bill indicators.
- Six-month expense trend chart.
- Filter-aware vendor, category, payment method and status breakdowns.

### Fixed
- Last added previously sorted all loaded bills without limiting the result. It now returns the latest 20.
- Total MVR and Pending now calculate from the active filter.
- This Month now remains the complete current-month total.
- Restored the visible filtered bill-count row.
- Removed obsolete dashboard CSS and a literal `\\n` parsing artifact.
- Replaced the self-editing GitHub workflow with read-only HTML and JavaScript validation.

### Root cause
- The old workflow could retrigger through its own file changes and attempted generated commits and pushes.
- Dashboard replacement relied on fragile HTML regex boundaries.
- The Last added code omitted the final array limit.
- Legacy CSS was not removed when dashboard wrappers changed.

### Repair SHAs
- `5893d50` — workflow validation fix.
- `5098e54` — finance dashboard theme.
- `1c0e408` — Last 20 filter.
- `8b4c913` — audit cleanup and KPI correction.
- `7f8b941` — README incident documentation.
- `5c2d49d` — SHAS hierarchy and repair registry.

### Verification
- Inline JavaScript passed `node --check`.
- No duplicate static HTML IDs were found.
- All required dashboard IDs occur exactly once.
- No Supabase records or schema were modified.
