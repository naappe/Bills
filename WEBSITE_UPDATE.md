# White Saffron Procurement ERP
## Website Update

Last updated: 2026-07-27

This file records the current implementation state for future developers and AI assistants. It must describe only work that exists in the repository.

## Completed

### Application foundation

- GitHub Pages static single-page application.
- Supabase authentication and persistent bill data.
- Role-aware navigation.
- Shared in-memory store.
- Guarded bill loading to avoid duplicate simultaneous requests.
- Versioned JavaScript and CSS assets.
- Responsive desktop and mobile application shell.
- Shared searchable-list component.

### Dashboard

- Operational dashboard redesign.
- Period filters.
- Procurement spend and bill indicators.
- Paid and pending summaries.
- Supplier coverage.
- Recent bills.
- Pending-payment list.
- Invoice follow-up list for bills without invoice numbers.
- Top-supplier summary for the selected period.
- Balanced right-side operational stack with no unused blank panel area.
- Spend trend.
- Category allocation.
- Dashboard summaries use the already loaded `store.rows` data and do not add Supabase requests.

### Bills

- Search by record, invoice, product, and vendor.
- Period and custom-date filters.
- Vendor filter.
- Pagination and page-size selection.
- Organized desktop table.
- Dedicated mobile bill cards.
- Payment badges.
- Filtered totals and bill counts.
- Bill detail modal.
- Edit controls.
- Admin delete controls.
- Staff edit-window enforcement where implemented.

### Bill Entry

- Simplified daily purchase-entry workflow.
- Vendor search and saved vendor detail fill.
- Bill date.
- Invoice status selection.
- Invoice number shown only when available.
- One initial product row.
- Additional product rows.
- Product suggestions based on vendor history.
- Quantity, unit, purchase price, and optional packing.
- Automatic line totals.
- GST and grand-total calculations.
- Review before save.
- Create and edit through the existing Supabase save layer.
- Accountant can add a missing invoice number later by editing the bill.

### Products

- Static catalogue only.
- Product search by product or vendor.
- Product image or initials fallback.
- Product name.
- Latest vendor.
- Packing.
- Latest purchase rate displayed as wholesale price.
- Retail price displayed only when stored data exists.
- Stock status displayed as not tracked when inventory data is unavailable.
- Product cards no longer open a second analytics page.

### Price Intelligence

- Admin-only navigation.
- Product and supplier comparison.
- Current and previous normalized prices.
- Price movement.
- Best supplier.
- Potential savings.
- Supplier averages and volatility.
- Price history and ranking details.

### Documentation

- `AI_RULES.md`
- README AI-policy notice and documentation index.
- `PROJECT_ARCHITECTURE.md`
- `WEBSITE_UPDATE.md`
- `CHANGELOG.md`
- `ROADMAP.md`
- `KNOWN_ISSUES.md`

## In Progress

- Consolidating shared UI patterns without changing business logic.
- Improving daily procurement usability.
- Verifying current Supabase columns against desired product and inventory fields.
- Reducing page-specific styles where shared components can be reused.
- Confirming all revised pages on desktop, tablet, and mobile.

## Next

### Highest priority

1. Design and approve the inventory database model.
2. Add real product master records instead of inferring all products from bill history.
3. Add retail-price storage and controlled editing.
4. Add stock-in transactions from saved purchases.
5. Add stock-out or consumption transactions.
6. Add low-stock and unavailable-stock alerts.
7. Add invoice-missing filters for accountant follow-up.

### UI priority

1. Review Vendors layout.
2. Review Reports layout and usefulness.
3. Standardize remaining modals and filter bars.
4. Confirm mobile Bill Entry usability.
5. Improve empty states and loading feedback.

### Validation priority

- Authentication and session restoration.
- Admin versus staff access.
- Bill create, edit, view, and delete.
- Invoice-number-later workflow.
- Product suggestions.
- Unit and pack calculations.
- Price Intelligence accuracy.
- Browser console and network errors.
- Chrome, Edge, Firefox, Safari, and mobile browsers.

## Do Not Claim Yet

The following are not complete and must not be described as working production features:

- Automatic inventory updates.
- Reliable current stock quantity.
- Low-stock alerts.
- Out-of-stock alerts.
- Dedicated retail-price management.
- Barcode support.
- POS sales.
- Purchase approvals.
- AI demand forecasting.

## Current operational boundary

The loaded supplier-bill dataset remains the source for Dashboard, Bills, Products, Vendors, Reports, and Price Intelligence.

No page should issue an additional Supabase bill request when the required data already exists in `store.rows`.