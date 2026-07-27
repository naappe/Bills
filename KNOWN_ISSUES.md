# White Saffron Procurement ERP
## Known Issues

Last updated: 2026-07-27

This file records confirmed limitations and issues. Do not remove an item until the behavior has been fixed and verified.

## Priority definitions

- **Critical** — data loss, security failure, application unavailable, or incorrect financial result
- **High** — major workflow blocked or materially misleading data
- **Medium** — workflow remains possible but is confusing, incomplete, or inefficient
- **Low** — visual, documentation, or minor usability issue

## Inventory is not yet implemented

**Priority:** High  
**Status:** Open  
**Area:** Products / Bill Entry / Database

### Current behavior

- Products may show `Not tracked` for stock.
- Saving a purchase bill does not create a verified inventory transaction.
- Current stock, low stock, and out-of-stock figures cannot be trusted because a dedicated inventory ledger is not present.

### Required fix

Design and approve product, inventory-transaction, stock-unit, reorder-level, and audit structures before enabling automatic stock updates.

### Safety rule

Do not infer current stock by summing purchases only. Purchases do not account for consumption, sales, waste, transfers, or adjustments.

---

## Retail prices are not reliably stored

**Priority:** High  
**Status:** Open  
**Area:** Products / Database

### Current behavior

- Products display `Retail: Not set` unless a compatible retail or selling-price field exists in stored data.
- There is no confirmed dedicated product master workflow for maintaining retail prices.

### Required fix

Add a product master record with an approved retail-price field, role permissions, edit history, and effective-date policy.

---

## Product catalogue is inferred from bill history

**Priority:** Medium  
**Status:** Open  
**Area:** Products

### Current behavior

- Product identity comes from description text in saved bill items.
- Spelling differences may create separate catalogue entries.
- Product images and descriptions may not exist.

### Required fix

Introduce canonical products and product aliases without deleting or rewriting original bill-item descriptions.

---

## Vendor identity is inferred from historical text

**Priority:** Medium  
**Status:** Open  
**Area:** Vendors / Bill Entry

### Current behavior

- Vendor details are aggregated from bill history.
- Similar names may represent the same supplier.
- Automatic merging would risk combining different suppliers.

### Required fix

Introduce canonical vendor records and reviewed aliases. Duplicate detection should recommend a merge but never perform one automatically.

---

## Invoice status is not guaranteed as a dedicated database column

**Priority:** Medium  
**Status:** Open  
**Area:** Bill Entry / Bills / Database

### Current behavior

- Bill Entry allows users to indicate that an invoice number is unavailable.
- The bill can be saved with an empty invoice number and updated later.
- The current compatibility save layer only writes fields that exist in the detected Supabase schema.

### Impact

A dedicated accountant queue for missing invoices cannot be fully reliable until invoice status is stored explicitly.

### Required fix

Add an approved invoice-status field and follow-up workflow after database review.

---

## Entire bill dataset loads into browser memory

**Priority:** Medium  
**Status:** Open  
**Area:** Performance / Data loading

### Current behavior

- `data.js` loads the configured bill table in pages of 1,000 rows.
- Dashboard, Bills, Products, Vendors, Reports, and Price Intelligence reuse the loaded dataset.

### Impact

This avoids repeated requests but may become slow or memory-heavy as the dataset grows substantially.

### Required fix

Evaluate server-side date filtering, pagination, reporting views, or normalized endpoints after preserving current reporting requirements.

---

## Product suggestions include browser-local learning

**Priority:** Medium  
**Status:** Open  
**Area:** Bill Entry

### Current behavior

- Recent vendor-product values can be learned in browser local storage.
- Learned values may differ between devices or browsers.

### Required fix

Move approved product/vendor defaults to shared database records after product and vendor normalization.

---

## Frontend roles are limited

**Priority:** Medium  
**Status:** Open  
**Area:** Authentication / Authorization

### Current behavior

- The application primarily distinguishes `admin` and `staff`.
- Some permissions are represented through frontend visibility and route guards.

### Security note

Supabase Row Level Security must remain the real authorization boundary.

### Required fix

Create trusted profile and role records with documented RLS policies for admin, manager, staff, accountant, and readonly roles if approved.

---

## Secure Supabase Auth user administration is unavailable from the static client

**Priority:** Medium  
**Status:** Open  
**Area:** Admin

### Current behavior

- A GitHub Pages frontend cannot safely use a Supabase service-role key to list, create, suspend, or delete authentication users.

### Required fix

Use the Supabase dashboard or an approved protected Edge Function/server endpoint.

---

## Automated test coverage is limited

**Priority:** Medium  
**Status:** Open  
**Area:** Quality assurance

### Current behavior

- Most verification is manual through the deployed GitHub Pages application and browser console.

### Required fix

Add non-destructive tests for:

- Pack parsing
- Unit conversion
- Bill totals
- Legacy field compatibility
- Filtering and pagination
- Role-aware routing
- Create and edit payload construction

---

## Cache may show an older deployment

**Priority:** Low  
**Status:** Ongoing operational risk  
**Area:** Deployment

### Current behavior

- GitHub Pages and browser caching can temporarily show old JavaScript or CSS.

### Workaround

- Wait for GitHub Pages deployment.
- Use a hard refresh.
- Confirm asset query strings were updated only for changed files.

### Required fix

Continue disciplined cache-busting. Do not add duplicate inline patches as a substitute for correcting the source file.

---

## Browser-native historical behavior may differ

**Priority:** Low  
**Status:** Monitored  
**Area:** Shared dropdowns

### Current behavior

- The project replaces supported native datalist behavior with a shared searchable-list enhancement.
- Browser-specific focus, click, and autofill behavior should still be tested across desktop and mobile browsers.

### Required verification

- Chrome
- Edge
- Firefox
- Safari
- Mobile Chrome
- Mobile Safari

---

## Issue reporting template

Use this format for new issues:

```md
## Issue title

**Priority:** Critical / High / Medium / Low
**Status:** Open / In progress / Blocked / Fixed pending verification
**Area:** Module or workflow

### Current behavior

Describe what happens.

### Expected behavior

Describe what should happen.

### Reproduction

1. Step one
2. Step two
3. Step three

### Evidence

- Screenshot
- Console error
- Network error
- Record example

### Required fix

Describe the smallest safe correction.
```
