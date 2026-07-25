# White Saffron Procurement ERP

A static procurement application for entering, reviewing, and managing supplier bills. It is hosted on GitHub Pages and uses Supabase for authentication and bill data.

**Live site:** https://naappe.github.io/Bills/

## Application architecture

The application is a single-content renderer. It does not use separate HTML containers for each page.

```text
URL hash
  → hash router
  → selected view renderer
  → #content.innerHTML
```

The only page-content container is:

```html
<div id="content"></div>
```

Current supported routes (bill entry opens inside Bills):

- `#dashboard`
- `#bills`
- `#new`

## Active file structure

```text
/
├── index.html                         Application shell and script order
├── README.md                          This technical reference
└── assets/
    ├── css/
    │   ├── application-shell.css      Layout, navigation, forms and responsive rules
    │   └── design-system.css          Typography, spacing and component refinements
    └── js/
        └── core/
            ├── session-authentication.js  Login, logout and session display
            ├── view-renderers.js          Base view renderers and shared UI helpers
            ├── view-registry.js           Registers the three supported views
            ├── hash-router.js             Hash routing and window.show(view)
            └── application-controller.js  Supabase session and bill-data lifecycle
```

Inactive legacy files may remain in the repository, but they are not loaded by `index.html` and must not be reactivated without a separate review.

## Module responsibilities

### `index.html`

- Provides the login shell, application shell, sidebar and `#content`.
- Creates the Supabase browser client using the publishable key.
- Defines shared application state and simple display helpers.
- Loads active modules in this required order:

```text
view-renderers
→ session-authentication
→ view-registry
→ hash-router
→ application-controller
```

### `session-authentication.js`

- Handles sign-in and sign-out.
- Restores the correct login or application view.
- Resolves the current user role.
- Updates the header user details.

### `view-renderers.js`

- Owns shared UI helpers and base renderers.
- Renders Dashboard, Bills, and New Bill into `#content`.
- Provides bill list filtering, pagination, CSV export, bill create/update, and permitted deletion.
- Contains additional base renderers for future modules, but they are not routable until intentionally registered.

### `view-registry.js`

- Registers Dashboard, Bills, New Bill compatibility route, and Rates.
- Does not define routing, authentication, database queries, or admin overrides.
- Must remain syntactically valid and side-effect free.

### `hash-router.js`

- Defines `window.show(view)`.
- Reads the URL hash and selects a supported view.
- Updates active navigation and the page title.
- Shows a clear build error if a supported renderer is unavailable.

### `application-controller.js`

- Restores the Supabase session.
- Subscribes to authentication changes.
- Loads accessible `bills` records in 1,000-record pages.
- Prevents duplicate concurrent loads.
- Maintains database status and triggers the active renderer.

## Roles

- `admin`: create, edit and delete bills.
- `manager`: create and edit bills.
- `staff`: create bills and edit records when permitted.
- `readonly`: view and export only.

Frontend roles are usability controls. Supabase Row Level Security must enforce all real permissions.

## Rate intelligence

Each new bill item stores the entered **row total**, the derived purchase-unit rate (Case / PCS / PKT / TIN, etc.), and its normalized per-g, per-ML, or per-PCS rate. The Rates page compares the latest rate against the most recent earlier rate, highlights increases, and shows the cheapest vendor based on each vendor’s latest saved rate.

## Data behavior

- Primary table: `bills`.
- `state.rows`: all records loaded for the active user.
- `state.filtered`: Bills-page filtered result.
- Records are ordered newest first.
- The application supports common column aliases such as `status` / `payment_status` and `method` / `payment_method`.

## Deployment

GitHub Pages publishes directly from:

```text
Branch: main
Folder: /(root)
```

No GitHub Actions workflow is required for the current static site setup.

## Required verification before every deploy

Run a direct JavaScript syntax check before changing deployment settings or diagnosing browser cache:

```bash
node --check assets/js/core/view-renderers.js
node --check assets/js/core/session-authentication.js
node --check assets/js/core/view-registry.js
node --check assets/js/core/hash-router.js
node --check assets/js/core/application-controller.js
```

Then verify:

1. Each command exits successfully.
2. GitHub Pages has finished publishing the `main` branch.
3. The live site displays only Dashboard, Bills, and New Bill.
4. The browser console contains no uncaught syntax errors.
5. Dashboard, Bills (including embedded Add bill), Rates, and Mobile demo in both Phone and Tablet modes each render correctly after sign-in.

## Security

The frontend uses a Supabase publishable browser key. Never commit service-role keys, private API keys, passwords, tokens, or exported sensitive procurement data.
