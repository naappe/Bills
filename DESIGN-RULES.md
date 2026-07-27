# Design Rules for Visual Redesign

This document protects critical HTML identifiers, CSS selectors, and JavaScript entry points that **must not change** during visual redesigns. These are the borders between styling, layout, and functional code.

## Critical HTML Element IDs

These IDs are referenced directly by JavaScript and must be preserved exactly:

### Authentication and Shell

| ID | Module | Purpose | Impact if changed |
|---|---|---|---|
| `authLoader` | `main.js` | Splash screen during session check | Auth UI would not show during boot |
| `loginView` | `main.js` | Login card container | Sign-in flow broken |
| `loginForm` | `main.js` | Email/password form element | Login submission fails |
| `loginName` | `main.js` | Email input field | Cannot enter username |
| `loginPassword` | `main.js` | Password input field | Cannot enter password |
| `loginNotice` | `main.js` | Error/status message below form | Status messages don't display |
| `logoutBtn` | `main.js` | Logout button in sidebar | Sign-out breaks |
| `appView` | `main.js` | Main app container (hidden during login) | App-show/hide flow broken |
| `sidebar` | `main.js`, `router.js` | Left navigation drawer | Navigation breaks |
| `sidebarBackdrop` | `main.js` | Mobile overlay behind sidebar | Mobile nav doesn't close |
| `sidebarClose` | `main.js` | Close button inside sidebar | Mobile close button doesn't work |
| `content` | `main.js`, all page modules | Main content area where pages render | All page rendering fails |
| `authMessage` | `main.js` | Loading message text node | Status messages hidden |

### Navigation

| ID | Module | Purpose | Impact if changed |
|---|---|---|---|
| `nav` | `main.js` | Navigation items container | Sidebar items don't render |
| `menuBtn` | `main.js` | Mobile menu toggle button | Mobile menu can't open |
| `collapseSidebar` | `main.js` | Desktop sidebar collapse button | Desktop collapse doesn't work |
| `footer` | `main.js` | Footer container | Version/year doesn't appear |
| `footerYear` | `main.js` | Year text in footer | Doesn't update to current year |

### User Profile Display

| ID | Module | Purpose | Impact if changed |
|---|---|---|---|
| `emailLabel` | `main.js` | Email display in sidebar | User email hidden |
| `roleLabel` | `main.js` | Role badge (ADMIN/STAFF) | User role hidden |
| `avatar` | `main.js` | User initial circle (top right) | User avatar not shown |
| `sideEmail` | `main.js` | Email in sidebar footer | User email hidden in mobile |
| `sideRole` | `main.js` | Role in sidebar footer | User role hidden in mobile |
| `sideAvatar` | `main.js` | User initial in sidebar footer | User avatar hidden in mobile |

### Page-Specific Content

| ID | Module | Purpose | Impact if changed |
|---|---|---|---|
| `billSearch` | `bills.js` | Bill search input | Search input broken |
| `billPeriod` | `bills.js` | Date range dropdown | Can't filter by period |
| `billFrom` | `bills.js` | Start date picker (custom range) | Custom range start doesn't work |
| `billTo` | `bills.js` | End date picker (custom range) | Custom range end doesn't work |
| `billVendor` | `bills.js` | Vendor filter dropdown | Can't filter by vendor |
| `billPageSize` | `bills.js` | Rows per page dropdown | Pagination size doesn't change |
| `billRows` | `bills.js` | Table body | Bills list won't render |
| `pageMeta` | `bills.js` | Pagination info text | Pagination numbers hidden |
| `prevPage` | `bills.js` | Previous page button | Can't navigate pages |
| `nextPage` | `bills.js` | Next page button | Can't navigate pages |
| `retryWorkspace` | `main.js` | Retry button on workspace error | Can't retry failed startup |
| `bill-custom` (class) | `bills.js` | Custom date range controls | Hidden/shown state breaks |

## Protected CSS Selectors

These selectors are targeted by JavaScript and must not be removed or renamed:

### Layout Classes

```css
/* Sidebar state */
.sidebar.open                    /* Mobile sidebar visibility */
.sidebar-collapsed               /* Desktop sidebar collapse state */
.sidebar-backdrop.visible        /* Mobile backdrop visibility */

/* Navigation state */
.nav-open                        /* Body class for open mobile nav */
.nav-group                       /* Navigation group container */
.nav-label                       /* Group header */

/* Auth state */
.auth-pending                    /* Body class during auth check */
.auth-loader                     /* Loading splash screen */
.login.hidden                    /* Hidden login view */
.app.hidden                      /* Hidden app view */

/* Page rendering */
.modal                           /* Bill detail modal */
.bill-view-modal                 /* Specific bill modal styling */
.bill-view-card                  /* Modal content card */
```

### Data-Attribute Selectors (Must Preserve)

JavaScript searches for these data attributes and will break if removed:

```javascript
/* Navigation */
a[data-route]                    /* Route link in any element */
button[data-route]               /* Route button in any element */

/* Bill management */
[data-view]                      /* Clickable bill row (view detail) */
[data-edit]                      /* Edit bill button */
[data-delete]                    /* Delete bill button */
[data-edit-modal]                /* Edit from bill detail modal */
[data-close]                     /* Close button in modal */

/* Auth status messages */
[data-auth-message]              /* Auth loader message text node */
```

## Protected Event Handlers

These elements must remain interactive:

| Selector | Event | Purpose |
|---|---|---|
| `#menuBtn` | `click` | Mobile menu toggle |
| `#collapseSidebar` | `click` | Desktop sidebar collapse |
| `#sidebarBackdrop` | `click` | Close sidebar on overlay click |
| `#logoutBtn` | `click` | Sign out (async) |
| `#loginForm` | `submit` | Sign in (async) |
| `#billSearch` | `input` | Real-time search (debounced) |
| `#billPeriod` | `change` | Date range filter |
| `#billFrom`, `#billTo` | `change` | Custom range dates |
| `#billVendor` | `change` | Vendor filter |
| `#billPageSize` | `change` | Pagination size |
| `#prevPage`, `#nextPage` | `click` | Page navigation |
| `[data-view]` rows | `click`, `keydown` (Enter) | View bill detail |
| `[data-edit]` buttons | `click` | Edit bill |
| `[data-delete]` buttons | `click` | Delete bill (with confirm) |
| `.modal` | `click` (target===modal) | Close modal on backdrop |
| `document` | `click` (data-route bubbles) | Route navigation bubbling |
| `document` | `hashchange` | Route rendering on hash change |
| `document` | `error`, `unhandledrejection` | Error logging |
| `window` | `keydown` (Escape) | Close sidebar and modals |
| `window` | `resize` | Close mobile sidebar on desktop view |

## Safe Design Changes

These aspects **can** be changed safely:

✓ CSS colors, gradients, borders, shadows  
✓ Font sizes, weights, line heights  
✓ Padding, margins, gaps (within layout bounds)  
✓ Border radius, animations, transitions  
✓ Background patterns and fills  
✓ Icon sizes and rotation  
✓ Flex/grid direction and alignment (if IDs stay)  
✓ Media query breakpoints (if interaction stays the same)  
✓ Class names (as long as data-attributes and IDs remain)  

## Dangerous Changes

✗ Removing or renaming an ID listed above  
✗ Removing `[data-route]`, `[data-view]`, `[data-edit]`, `[data-delete]` attributes  
✗ Removing `.modal`, `.sidebar`, `.nav-group` classes from their elements  
✗ Hiding an element with `display:none` that JavaScript expects to find and manipulate  
✗ Moving form inputs (`#billSearch`, `#billFrom`, etc.) to different elements  
✗ Removing `#content` or changing its parent in the HTML tree  
✗ Changing how modals are created (currently `document.createElement('div')`) without updating `bills.js`  

## Testing After Design Changes

After CSS or layout updates, always verify:

1. **Authentication flow** — Login, session restore, logout all work.
2. **Navigation** — All sidebar routes accessible, mobile menu opens/closes.
3. **Bill list filtering** — Search, date range, vendor, page size all filter correctly.
4. **Bill detail modal** — View, edit, delete buttons respond; escape key closes.
5. **Mobile responsiveness** — Sidebar drawer opens/closes at breakpoint; elements remain clickable.
6. **Console** — No errors about "cannot find element" or "undefined" references.
7. **Dark/light theme** — If theme changes, verify all elements remain visible and legible.

## Supabase Row Level Security

Supabase RLS rules are **not** in this repository — they live in the Supabase project. Changes to RLS are independent of frontend design but must be coordinated during feature work.

Frontend role checks (`if (store.role !== 'admin')`) are a usability convenience only. RLS is the actual authorization boundary.
