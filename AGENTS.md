# White Saffron Procurement ERP — AI Continuation Rules

This file is the authoritative working agreement for any AI, coding agent, contributor, or automation that modifies this repository.

Read this file before making any change.

## 1. Project identity

- Repository: `naappe/Bills`
- Live site: `https://naappe.github.io/Bills/`
- Product: White Saffron Procurement ERP
- Hosting: GitHub Pages
- Frontend: static HTML, CSS, and JavaScript ES modules
- Backend: Supabase
- Currency: MVR
- Current application version when this file was created: `4.9.56`

## 2. Non-negotiable working rules

1. Inspect the current repository before editing.
2. Never rebuild or rewrite the whole application unless the user explicitly asks for a full rebuild.
3. Preserve all working features, routes, permissions, Supabase behavior, data mappings, and user flows.
4. Make the smallest safe change that solves the reported issue.
5. Do not claim a fix until the edited files have been fetched again and verified.
6. Do not invent files, functions, tables, columns, routes, or Supabase policies.
7. Do not edit the Supabase schema, RLS, buckets, or authentication configuration unless the user explicitly requests it.
8. Never expose service-role keys or privileged credentials in browser code.
9. Do not generate product images unless the user explicitly asks for generated images.
10. Keep version numbers synchronized across `index.html`, CSS imports, JavaScript imports, and application health/version metadata.
11. Use one logical commit per completed change unless a sequential file update requires multiple commits.
12. Do not add speculative performance scripts. Core CSS must remain render-blocking so the application never flashes unstyled or appears broken.

## 3. Design system and visual rules

The website must retain the White Saffron brand theme.

### Main palette

- Navy: `#1A3C6E`
- Deep navy: `#102A50`
- Gold: `#F5A623`
- Soft gold: `#F7C85B`
- Background: soft green-grey `#F3F7F5`
- Surface: white `#FFFFFF`
- Text: `#344054`
- Strong text: `#102A50`
- Muted text: `#667085`

### Theme rules

- Do not turn the whole website grey.
- Grey is allowed only for neutral controls, borders, disabled states, and empty product-image fallbacks.
- Use navy for primary structure and important actions.
- Use gold as a controlled accent, not as a full-page background.
- Keep cards white, clean, compact, and readable.
- Use Inter consistently.
- Maintain shared spacing, radius, shadows, button heights, table density, and page hierarchy across all routes.
- Do not introduce a separate visual language on one page.

## 4. Shared page hierarchy

Every route must follow this hierarchy:

1. Sidebar
2. Top bar
3. Page heading
4. Short page description
5. Primary action when needed
6. Filters or toolbar
7. KPIs, cards, table, or content
8. Pagination or secondary actions
9. Footer

The router already ensures a missing page heading is inserted. Do not bypass or duplicate that behavior unnecessarily.

## 5. Responsive rules

Desktop and mobile are separate layout states, not scaled copies.

### Desktop

- Fixed sidebar
- Full tables where appropriate
- Compact but readable cards
- Consistent page padding

### Mobile

- Sidebar becomes an overlay drawer.
- Background scrolling must lock while the drawer is open.
- Mobile Bills must use stacked bill cards, not a squeezed desktop table.
- Avoid fixed desktop widths and large `min-width` values on mobile.
- Do not create horizontal overflow unless the user explicitly wants a horizontally scrollable data table.
- Controls should stack at full width.
- Touch targets should remain at least about 40–44 px high.

## 6. Product page rules

- Product cards are compact profile-style cards.
- Product image area background must remain clean white.
- Uploaded product images are displayed in a circular frame.
- Uploaded images are cropped and resized to `300 × 300 px` WebP before Supabase upload.
- Supabase Storage bucket expected by the current code: `product-images`.
- When a product image is missing, only the circular avatar fallback should be grey.
- The rest of the product card and website must retain the White Saffron theme.
- Do not auto-generate catalogue images.
- Admin may edit product name, case quantity, image URL, or upload an image.

## 7. Bills page rules

Desktop table columns currently follow this simplified model:

- Record number
- Bill date
- Created date and time
- Vendor
- Bill total
- Actions

Behavior:

- Entire row opens bill details.
- Edit and Delete buttons must not trigger row opening.
- Admin may delete.
- Staff may edit only within the allowed time window.
- Landing period defaults to This Month.
- Page sizes: 20 and 50.
- Search may switch to All Time when needed.
- Mobile uses labelled stacked cards, never the desktop table compressed into the viewport.

## 8. Authentication and roles

- Supabase Auth is used.
- Admin role is currently derived from approved user IDs in configuration.
- Staff must never be able to promote themselves.
- Current browser-only application cannot securely list or administer all Auth users without a protected backend or Edge Function.
- Password changes and reset emails are self-service account functions.
- Preserve the `zee` login alias unless the user explicitly removes it.

## 9. Data safety

- Do not delete, transform, or migrate procurement data without explicit approval.
- Preserve unknown Supabase columns.
- Use the existing compatibility logic when saving records.
- Do not assume every historical bill has the same schema.
- Keep MVR calculations exact and avoid unnecessary rounding.
- Do not remove existing data fields merely because they are not shown in the current UI.

## 10. Performance rules

- Prefer targeted CSS and JavaScript updates.
- Avoid loading the same Supabase data repeatedly.
- Preserve caching/indexing already implemented in page modules.
- Avoid large libraries when native browser APIs are sufficient.
- Do not lazy-load core CSS using `media="print"`; it can cause unstyled flashes and broken first render.
- Non-critical code may be deferred only after confirming it is not needed for first interaction.
- Any cache-busting version update must use the current application version consistently.

## 11. Accessibility rules

- Keep semantic headings.
- Buttons must be real `<button>` elements.
- Interactive rows/cards must support keyboard activation.
- Maintain visible focus indicators.
- Keep ARIA state synchronized for the mobile sidebar.
- Escape should close overlays and modals where practical.
- Images need useful alt text.
- Do not use color alone to communicate status.

## 12. Required workflow for every change

1. Read `AGENTS.md`.
2. Fetch the current target files.
3. Identify the smallest affected surface.
4. Check related imports, versions, and shared styles.
5. Make the change.
6. Fetch each changed file again.
7. Verify syntax, imports, selectors, version numbers, and route behavior.
8. Report exactly what changed and provide the commit SHA.
9. State any part that still requires browser, Supabase, or deployment verification.

## 13. Prohibited patterns

Do not:

- Replace the entire theme because one component needs a neutral color.
- Add duplicate global CSS overrides when the token system should be updated.
- Add inline scripts that dynamically reload the same core CSS already linked in `<head>`.
- Reference old asset versions.
- create fake images, placeholder catalogue illustrations, or AI-generated product photos.
- hide errors instead of fixing the source.
- remove working files merely to simplify the repository.
- change page names, routes, or navigation hierarchy without explicit approval.
- promise that GitHub Pages has deployed before verifying deployment status.

## 14. Current navigation hierarchy

- Overview
  - Dashboard
- Procurement
  - Bills
  - Cost — admin only
  - Products
  - Vendors
- Analytics
  - Reports
- Administration
  - Settings
  - Admin & users — admin only

## 15. Definition of done

A change is complete only when:

- The requested issue is fixed.
- Existing functionality is preserved.
- Desktop and mobile behavior are considered.
- Styling matches the shared design system.
- No stale version references remain in edited dependencies.
- Changed files are fetched and verified after writing.
- The final response is honest about what was and was not tested.

When user instructions conflict with this file, follow the user’s latest explicit instruction, but preserve security, data safety, and working functionality unless the user clearly accepts the consequences.
