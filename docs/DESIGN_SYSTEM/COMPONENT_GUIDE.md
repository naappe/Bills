# Component Guide

This guide records the shared behaviour expected from White Saffron interface components.

## Cards

- Use the existing shared `.card`, `.card-head` and `.card-body` patterns where available.
- Keep border, radius, shadow and internal padding consistent.
- Avoid nested cards unless the hierarchy is visually necessary.
- Empty states belong inside the card body and should explain the next useful action.

## KPI cards

Each KPI card should contain:

1. A concise label.
2. A complete value.
3. One short contextual line.
4. An optional icon or trend indicator.

Do not truncate important currency or quantity values with ellipses. Reduce typography responsively before hiding the value.

## Buttons

- Primary: the main action for the current context.
- Secondary: supporting or reversible action.
- Ghost: low-emphasis navigation or inline action.
- Danger: destructive action requiring clear confirmation.
- Buttons should use action-oriented labels.
- Destructive controls must follow role and time-window rules already defined by the application.

## Forms

- Labels must remain visible; placeholders are not replacements for labels.
- Required fields should be clear.
- Group related fields into logical sections.
- Display validation close to the field.
- Preserve user input when validation fails.
- Searchable lists must close after selection and support keyboard navigation.

## Tables

- Use a clear header row and consistent cell alignment.
- Numbers and currency should align predictably.
- Long tables should use sticky headers when practical.
- Preserve filters and pagination when opening and returning from a record.
- On mobile, use either deliberate card conversion or controlled horizontal scrolling.

## Status indicators

Use semantic colour together with text or an icon. Never rely on colour alone.

Typical states:

- Success / completed / paid.
- Warning / pending / attention.
- Error / failed / rejected.
- Information / neutral progress.

## Modals and menus

- Modals must trap focus and provide an obvious close action.
- Dropdowns should close on outside click, Escape and successful selection.
- Layering must use semantic z-index roles rather than arbitrary large values.

## Charts

- State the metric and time range clearly.
- Use accessible labels or summaries.
- Avoid decorative chart elements that imply accuracy not supported by the data.
- Empty or incomplete datasets should show a clear message instead of a misleading graph.

## Accessibility

- Maintain visible keyboard focus.
- Ensure sufficient contrast.
- Respect reduced-motion preferences.
- Use semantic HTML where practical.
- Interactive elements must have accessible names.

## Ownership rule

Shared component behaviour belongs in shared CSS or shared UI modules. Page-specific files should contain only the differences required by that page. Do not duplicate a shared rule in many page files.
