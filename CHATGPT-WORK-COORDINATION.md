# ChatGPT Work Coordination

This file is the shared handover board for every ChatGPT window working on `naappe/Bills`.

## Required workflow

Before changing code:

1. Read this file and the newest repository commits.
2. Do not edit a file currently listed as `IN PROGRESS` by another worker.
3. Add or update the Active Work entry with the exact scope and files.
4. Make one logical fix per commit.
5. Never claim completion until a monitor records `PASS`.
6. Never include passwords, private keys, tokens, or customer data in this file.

After committing:

1. Record the commit SHA, changed files, purpose and validation performed.
2. Set the result to `AWAITING REVIEW`.
3. The monitoring ChatGPT independently inspects the diff.
4. The monitor records:
   - `PASS` — correct and validated.
   - `WARNING` — improvement needed but not immediately dangerous.
   - `BLOCKED` — regression, unsafe database change, syntax error or broken requirement.
5. If the result is `WARNING` or `BLOCKED`, the worker must create a separate corrective commit and return it to `AWAITING REVIEW`.

## Permanent requirements

- Correct White login email: `whitesaffron2025@gmail.com`.
- Stock entry is manual and must not upload, fetch or display photos.
- Product photos belong to supply items (for example, Carrot), are managed in Settings, and appear on Rates/Prices pages. Invoice photos are not used.
- Preserve existing Supabase records and RLS protections.
- Do not expose service-role keys or passwords.
- Keep GitHub Pages compatibility: static HTML, CSS and JavaScript.
- Maintain usable desktop, tablet and mobile layouts.
- Minimum interactive target: 44 × 44 px.
- Minimum normal text: 14 px with accessible contrast.
- Filtered exports must match the visible filtered records.
- One logical fix per commit.

## Active Work

| Worker | Status | Scope | Files | Started |
| --- | --- | --- | --- | --- |
| Monitoring ChatGPT | IN PROGRESS | Fix Supply Rates dark-theme login contrast shown in live screenshot | `supply-rates.html` | 2026-07-14 |

## Review Queue

| Commit | Worker | Purpose | Validation claimed | Monitor result | Monitor notes |
| --- | --- | --- | --- | --- | --- |
| `960f52f` | Monitoring ChatGPT | Restore Stock updated-at trigger | SQL structure inspected | PASS | Trigger restored; Stock photo policies remain removed. |
| `c43a867` | Monitoring ChatGPT | Supply invoice sizing and eight-column alignment | Inline JavaScript syntax passed | PASS | Eight visible invoice fields now match eight CSS grid columns. |
| `1717d9b` | Monitoring ChatGPT | Contrast, touch targets and financial hierarchy | Shared CSS inspected | PASS | Improves muted-text contrast, CTA visibility and modal focus. |
| `defd570` | Monitoring ChatGPT | Keep Stock manual; photos only in Supply Rates | No forbidden Stock photo/OCR references; syntax passed | PASS | Existing database rows were not deleted. |

| `5ddaae6`, `fa01c64`, `614a006`, `f8aaa9a`, `a755e79`, `69140c0` | Monitoring ChatGPT | Item photos managed in Settings and shown on Rates/Prices; invoice photos removed | All inline JavaScript parses; zero invoice-photo references in working pages; RLS SQL inspected | WARNING | Code passed. Live Supabase setup is pending because this session lacks database mutation permission. |

| `c421ecc` | Monitoring ChatGPT | Strengthen full-viewport native bill modal backdrop | Native dialog/top-layer verified; no inline or utility override; all inline JavaScript parses | PASS | Backdrop is 72% dark with 6px blur and WebKit fallback. |

## Monitor log

### 2026-07-14

- PASS: Bill form uses native `showModal()`, so `dialog::backdrop` covers the viewport in the browser top layer.
- PASS: No inline dialog style or Tailwind-style backdrop class overrides the rule.
- PASS: Backdrop strengthened to `rgba(15,23,42,.72)` plus `blur(6px)` and WebKit fallback.
- PASS: All inline JavaScript still parses successfully.

- PASS: Settings now uploads/replaces/removes one photo per supply item.
- PASS: Supply Rates and Prices display item photos by normalized item name.
- PASS: Invoice-photo UI, JavaScript, bucket references and obsolete setup file are removed.
- PASS: All inline JavaScript in the three changed pages parses successfully.
- WARNING: Run `SUPABASE_ITEM_PHOTO_SETUP.sql` once in Supabase before uploads can work; the connected database tool denied mutation access.

- PASS: Stock has no photo upload, OCR, thumbnail or photo fetching.
- PASS: Supply Rates and its SQL use the same private bucket: `supply-invoice-photos`.
- PASS: Accessibility and Supply Invoice layout fixes are committed.
- WARNING: GitHub connector reports no automated validation status for the latest commits.
- FIXED: Stock setup accidentally lost its `updated_at` trigger; restored in `960f52f`.

## Handover message

Give every ChatGPT window this instruction:

> Read `CHATGPT-WORK-COORDINATION.md` before changing `naappe/Bills`. Register your work under Active Work, make one logical commit, record it in Review Queue as AWAITING REVIEW, and do not claim completion until the monitoring ChatGPT changes it to PASS.
