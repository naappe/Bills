# Asset organization

The browser has two authoritative entry contracts:

```text
assets/css/app.css
index.html JavaScript module groups
```

## Design tokens

Source of truth:

```text
assets/tokens/design-tokens.json
```

Runtime semantic variables and compatibility aliases:

```text
assets/css/design-tokens.css
```

Do not add literal brand colors, page padding, card radius, control height, navigation height, or typography sizes to new modules. Use semantic variables such as:

```css
var(--color-brand-navy)
var(--color-brand-gold)
var(--color-surface)
var(--color-border)
var(--color-text)
var(--sp-1)
var(--sp-2)
var(--card-padding)
var(--radius-card)
var(--control-height)
```

## CSS runtime order

`assets/css/app.css` is the only local stylesheet referenced by `index.html`.

It imports modules in this order:

1. base application styles
2. typography compatibility
3. New Bill page styles
4. catalogue and price-list styles
5. shell and responsive layout
6. dashboard presentation
7. semantic tokens and legacy aliases

The token contract is always imported last.

## JavaScript module groups

Scripts remain separate because their current global definitions depend on exact execution order. `index.html` groups them as:

1. base data and compatibility
2. authentication and registry
3. page renderers
4. shared UI and token-aware enhancements
5. router and application controller

The router and application controller must remain last.

## Safe cleanup policy

A JavaScript file may only be removed after:

1. its globals and renderer assignments are identified;
2. no later module calls them;
3. all routes are tested;
4. New Bill create, review, save, edit and delete are tested;
5. role access and Supabase loading are verified;
6. the console error list remains empty.

## Naming standard

New files must use responsibility-based names, not version-only names.

Preferred examples:

```text
bill-entry.js
bill-list.js
product-catalogue.js
price-intelligence.js
reports.js
app-shell.js
```

Do not create another `fix-v12`, `final-fix`, or global override file.
