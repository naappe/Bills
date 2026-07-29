# White Saffron Procurement ERP — Design Rules

This document defines the visual and DOM contracts that must be preserved while implementing the canonical architecture in `ARCHITECTURE.md`.

The target shell is a desktop top-header navigation with a full-width content area and a mobile navigation drawer. The legacy permanent sidebar is not a protected design requirement.

## 1. Design objective

The interface must be:

- professional and calm
- consistent across every route
- full-width on desktop
- responsive without horizontal shell overflow
- based on shared components rather than page patches
- visually modern without changing business workflows

## 2. Protected functional contracts

These elements are functionally significant and must remain available, although their position inside the canonical shell may change.

### Authentication and application

| ID | Purpose |
|---|---|
| `authLoader` | Session restoration loader |
| `loginView` | Login view |
| `loginForm` | Login submission |
| `loginName` | Username or email field |
| `loginPassword` | Password field |
| `loginNotice` | Authentication status |
| `appView` | Authenticated application root |
| `logoutBtn` | Sign out |
| `content` | Route rendering mount |

### Shell and navigation

| Contract | Purpose |
|---|---|
| `nav` | Authoritative desktop navigation mount |
| `menuBtn` | Mobile navigation trigger |
| `sidebarBackdrop` | Temporary mobile drawer backdrop; may be renamed only with corresponding JavaScript migration |
| `sidebarClose` | Mobile drawer close action; may be renamed only with corresponding JavaScript migration |
| `topTitle` | Current route title |
| `topSubtitle` | Current route subtitle |
| `footer` | Global footer |
| `footerYear` | Current year |
| `data-route` | Route action contract |

`collapseSidebar` is a legacy desktop-sidebar contract. It must not be carried into the canonical top-navigation shell. Its JavaScript and styling must be removed as one coordinated migration.

### User display

Preserve the functional account outputs:

- `emailLabel`
- `roleLabel`
- `avatar`

Legacy sidebar duplicates such as `sideEmail`, `sideRole`, and `sideAvatar` may be removed after account information is rendered correctly in the canonical header and mobile drawer.

## 3. Route-page contracts

Page-specific IDs and data attributes used by JavaScript must be preserved unless their owning module is updated in the same change.

Examples include:

```text
billSearch
billPeriod
billFrom
billTo
billVendor
billPageSize
billRows
pageMeta
prevPage
nextPage
```

Protected data attributes include:

```css
[data-route]
[data-view]
[data-edit]
[data-delete]
[data-edit-modal]
[data-close]
[data-auth-message]
```

## 4. Canonical visual hierarchy

Every route should follow this structure where applicable:

```text
Page header
  → title
  → description or context
  → primary action

Filter or action toolbar

KPI summary

Primary content
  → table, card grid, form, report, or analysis

Secondary information
```

Do not invent a separate visual language for individual pages.

## 5. Shared component rules

Shared components must use the master component layer.

### KPI

```css
.kpi-summary
.kpi-card
.kpi-card__icon
.kpi-card__content
.kpi-card__label
.kpi-card__value
.kpi-card__meta
```

### Shared families

The same shared ownership applies to:

- `.btn`
- form inputs, selects, and textareas
- cards and card headers
- toolbars and filter groups
- tables
- badges
- modals
- pagination
- empty and error states

Page CSS may arrange these components but must not redefine their base appearance.

## 6. Layout rules

### Desktop

- Global navigation is horizontal.
- There is no permanent left content offset.
- Content width is controlled by the main shell, not by individual pages.
- The header remains readable when navigation contains all permitted routes.
- Navigation may scroll horizontally or use a controlled overflow menu if required; it must not wrap into an unstable multi-row shell.

### Tablet and mobile

- The desktop navigation is replaced by a menu trigger.
- The mobile drawer overlays content rather than reducing content width.
- The drawer must close using its close button, backdrop, route selection, and Escape key.
- Interactive controls must remain comfortably tappable.
- Tables may transform to cards where an existing mobile renderer provides that behavior.

## 7. Styling boundaries

Safe visual changes include:

- colors from approved tokens
- spacing from approved tokens
- typography from approved tokens
- component radius, borders, and shadows
- responsive arrangement
- icon presentation

Structural changes are allowed only when implementing the approved canonical architecture and preserving all functional contracts.

## 8. Prohibited patching

Do not:

- turn the sidebar into a top bar using isolated positioning overrides
- keep both old and new navigation systems active
- add repeated inline fixes to `index.html`
- redefine global components in page CSS
- add a new stylesheet merely to override another stylesheet
- use cache-version changes as a substitute for correcting source ownership
- leave obsolete sidebar rules after the shell migration

## 9. Accessibility

- Navigation must use semantic landmarks.
- Buttons must remain buttons and links must remain links where appropriate.
- Active navigation must be visually distinct and programmatically identifiable.
- Focus states must remain visible.
- Mobile drawer state must update `aria-expanded`.
- Icons must not be the only accessible label.
- Color alone must not communicate status.

## 10. Verification checklist

After shell or design changes, verify:

1. Authentication loader, login, session restoration, and logout.
2. Every permitted desktop navigation route.
3. Mobile drawer open, close, focus, backdrop, Escape, and route selection.
4. Active navigation state after direct hash load, click, back, and forward.
5. Page titles and subtitles.
6. All page filters and actions.
7. Bill detail, editing, deletion, and modal behavior.
8. Admin-only controls.
9. Desktop, tablet, and mobile rendering.
10. No missing-element, duplicate-declaration, or uncaught runtime errors.

`ARCHITECTURE.md` is authoritative when this file and the implementation differ.