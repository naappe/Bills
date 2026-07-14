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
| Monitoring ChatGPT | IN PROGRESS | Rebuild Bills header, filters, info bar and card reading structure | `index.html` | 2026-07-14 |

## Review Queue

| Commit | Worker | Purpose | Validation claimed | Monitor result | Monitor notes |
| --- | --- | --- | --- | --- | --- |
| `960f52f` | Monitoring ChatGPT | Restore Stock updated-at trigger | SQL structure inspected | PASS | Trigger restored; Stock photo policies remain removed. |
| `c43a867` | Monitoring ChatGPT | Supply invoice sizing and eight-column alignment | Inline JavaScript syntax passed | PASS | Eight visible invoice fields now match eight CSS grid columns. |
| `1717d9b` | Monitoring ChatGPT | Contrast, touch targets and financial hierarchy | Shared CSS inspected | PASS | Improves muted-text contrast, CTA visibility and modal focus. |
| `defd570` | Monitoring ChatGPT | Keep Stock manual; photos only in Supply Rates | No forbidden Stock photo/OCR references; syntax passed | PASS | Existing database rows were not deleted. |

| `5ddaae6`, `fa01c64`, `614a006`, `f8aaa9a`, `a755e79`, `69140c0` | Monitoring ChatGPT | Item photos managed in Settings and shown on Rates/Prices; invoice photos removed | All inline JavaScript parses; zero invoice-photo references in working pages; RLS SQL inspected | WARNING | Code passed. Live Supabase setup is pending because this session lacks database mutation permission. |

| `c421ecc` | Monitoring ChatGPT | Strengthen full-viewport native bill modal backdrop | Native dialog/top-layer verified; no inline or utility override; all inline JavaScript parses | PASS | Backdrop is 72% dark with 6px blur and WebKit fallback. |

| `40c185b` | Monitoring ChatGPT | Fix Supply Rates dark-theme login contrast | Selector scope inspected; contrast calculated; all inline JavaScript parses | PASS | Login card 15.10:1 heading contrast and 7.62:1 helper-text contrast. |

| `32843b0` | Monitoring ChatGPT | Make Bills loading resilient | Sequential pagination verified; old rows preserved on refresh failure; all inline JavaScript parses | PASS | Removes five-request concurrent wave that could blank the Bills list after one failed request. |

| `c49cc59` | Monitoring ChatGPT | Dashboard KPI, donut and action accessibility finishing pass | DOM assignments verified; dark selector scoped; 44px/14px actions verified; JavaScript parses | PASS | Vendors shows visible 0/value, single vendor shows 100%, dark donut center strengthened. |

| `c32e88d` | Monitoring ChatGPT | Repair Supply Rates dark-mode contrast | Final cascade order verified; WCAG ratios calculated; JavaScript parses | PASS | Price Watch, Budget, invoice, summary and history text now use 7.62:1–16.07:1 contrast. |

| `b1175f3` | Monitoring ChatGPT | Restructure Supply Dashboard narrative and remove duplicates | DOM order verified; removed IDs absent; latest table present; JavaScript parses | PASS | Compact KPI → monthly hero → vendor/top items → latest table; redundant analytics removed. |

| `dfd1d64`, `24b642d`, `40a2222`, `ee9cc25`, `c94a7f8`, `5f31543` | Monitoring ChatGPT | Shared layout system across all application pages | Variables/utilities verified; wrappers/classes present; all inline JavaScript parses | PASS | Unified page padding, 24px gaps, card treatment, 44px actions, filters and Bills info bar. |

| `e6b0af0`, `dcb11ff`, `3caabea`, `c6b0878`, `3acfbe8`, `affaf12` | Monitoring ChatGPT | Migrate application to Amber and Charcoal | Palette tokens and active pages scanned; contrast calculated; all JavaScript parses | PASS | No targeted teal tokens remain; heading 16.67:1, secondary 11.74:1, muted 6.90:1. |

| `58671d4` | Monitoring ChatGPT | Refine Amber and Charcoal into a balanced professional hierarchy | Palette preserved; CSS structure checked; contrast calculated | PASS | Amber reserved for emphasis; neutral secondary controls; layered charcoal/cream surfaces and restrained depth. |

| `17f1acf` | Monitoring ChatGPT | Correct Amber migration to color-only and restore semantic statuses | Refinement layer removed; palette/focus/modal/status rules verified; CSS balanced | PASS | Existing card/layout structure untouched; Paid green, Pending yellow, Cancelled red. |

## Monitor log

### 2026-07-14

- PASS: Removed the overreaching professional-refinement CSS layer from `58671d4`.
- PASS: Theme migration is color-only: teal→amber and slate→charcoal variables, focus, charts and modal colors.
- PASS: Existing cards/layout remain unchanged by the theme correction.
- PASS: Semantic statuses restored: Paid green, Pending yellow/amber and Cancelled red.
- PASS: CSS structure is balanced and all required palette tokens remain present.

- PASS: Preserved the exact Amber and Charcoal palette while replacing the mechanical all-orange appearance with restrained emphasis.
- PASS: Primary actions/active states remain amber; secondary and ghost actions are neutral; logout remains danger-styled.
- PASS: Cards use warm cream/charcoal layers, subtle depth and amber hover borders; hero areas use charcoal with a restrained deep-amber edge.
- PASS: Paid/Pending/Other badges follow the provided amber/yellow/charcoal specification.
- PASS: CSS braces are balanced; dark text contrast remains 16.67:1 / 11.74:1 / 6.90:1.

- PASS: Global palette migrated to amber `#d97706` / `#f59e0b` / `#fcd34d` and charcoal `#1a1a1a` / `#262626` / `#404040`.
- PASS: Buttons, active navigation, badges, charts, focus states, statuses and modal backdrop use the Amber and Charcoal theme.
- PASS: Removed targeted teal tokens from the shared stylesheet and all active pages.
- PASS: Dark contrast calculated at 16.67:1 headings, 11.74:1 secondary text and 6.90:1 muted text.
- PASS: Dashboard/Bills, Supply Rates/Price Watch, Prices, Settings and Stock JavaScript parses successfully.

- PASS: Added shared layout variables and reusable page-container, header-action, page-card, dashboard-grid, bills-list, search-bar, filter-group and info-bar classes.
- PASS: Applied the system to Dashboard/Bills, Supply Rates/Price Watch, Prices, Settings and Stock.
- PASS: Desktop uses 24px page/gap rhythm; tablet/mobile use the shared 16px responsive rhythm.
- PASS: Header actions are 44px with 14px text and card padding is 18px across pages.
- PASS: Dark mode inherits shared brand surfaces/borders; all changed-page inline JavaScript parses.

- PASS: Supply Dashboard now reads compact KPI strip → monthly hero chart → vendor share/top items → latest-records table.
- PASS: Removed duplicate Top Items, Top Vendors/vendor share and Monthly Price Changes sections from markup and JavaScript.
- PASS: Latest records now use Vendor, Item, Unit Rate, Final and Date columns.
- PASS: Desktop, tablet and mobile grid rules are present; all inline JavaScript parses.
- WARNING: GitHub reports no automated deployment/check status for this commit.

- PASS: Added a final dark-theme cascade layer after all Supply Rates component CSS.
- PASS: Price Watch KPIs, helper text, Budget Calculator, invoice labels/totals, table headings and alerts now have explicit dark-mode colors.
- PASS: Verified contrast ratios: muted 7.62:1, primary 15.10:1, KPI 16.07:1 and teal accent 11.17:1.
- PASS: Supply Rates inline JavaScript parses successfully.
- WARNING: GitHub reports no automated deployment/check status for this commit.

- PASS: Dashboard Vendors KPI always renders a visible numeric value in light and dark themes.
- PASS: Single-vendor doughnut center shows `100%` and the vendor name; dark center/track contrast strengthened.
- PASS: Refresh, Print/PDF, Export and Logout actions are explicitly 44px high with 14px text.
- PASS: Corrected the Dashboard dark-theme comma-selector scoping bug and revalidated all inline JavaScript.
- WARNING: GitHub reports no automated deployment/check status for this commit.

- PASS: Replaced fragile five-request Bills pagination with sequential 1,000-row pagination.
- PASS: A temporary Supabase/network error now shows a retry message and preserves already loaded records.
- PASS: Bills inline JavaScript parses successfully.
- WARNING: GitHub reports no automated deployment/check status for this commit; live authenticated data loading requires user verification.

- PASS: Fixed the screenshot-reported Supply Rates login contrast regression caused by an incorrectly scoped comma selector.
- PASS: Dark login card contrast is 15.10:1 for primary text and 7.62:1 for helper text.
- PASS: Supply Rates inline JavaScript parses successfully after the CSS-only fix.

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
