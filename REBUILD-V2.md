# Bills ERP Rebuild V2

## Structure

- `index.html` — application shell
- `app/css/tokens.css` — design tokens
- `app/css/app.css` — shared styles
- `app/js/config.js` — configuration
- `app/js/store.js` — central state and helpers
- `app/js/data.js` — data access
- `app/js/pages.js` — page renderers
- `app/js/router.js` — hash router
- `app/js/main.js` — startup and navigation

## Rules

1. The HTML loads one local stylesheet and one local JavaScript entry module.
2. Pages use the semantic values in `tokens.css`.
3. Every route has one renderer.
4. The router clears the previous page before rendering.
5. Data access is isolated from page presentation.
6. No version-numbered override files are loaded.
7. No document-wide DOM observer is used.

## Routes

`dashboard`, `bills`, `new`, `rates`, `products`, `vendors`, `reports`, `settings`, `admin`.

## Release

The current live site remains on `main`. Test this branch before merging it into the live branch.
