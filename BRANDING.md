# White Saffron Application Brand Standard

This is the canonical visual standard for every application page. Earlier experimental sidebar and palette directions are retired.

## Brand Direction

**Minimalist, mobile-first finance workspace** with clear operational data and an editorial White Saffron identity.

## Canonical Tokens

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#fbf8f2` | `#111c26` |
| Surface | `#fffdf9` | `#1b2935` |
| Main text | `#1b1d1a` | `#f2f7fa` |
| Muted text | `#59635d` | `#a7b5c0` |
| Border | `#d8d2c8` | `#304554` |
| Saffron identity | `#c79200` | `#f2c84b` |
| Primary action | `#0f766e` | `#25c96a` |
| Danger | `#b42318` | `#ffaaa5` |

Saffron is for the brand mark, focus and selected-navigation detail. Teal/green is for primary actions and selected controls. Red is reserved for destructive actions and errors.

## Typography

| Purpose | Font | Weights |
| --- | --- | --- |
| Page and feature headings | Fraunces | 400, 600, 700 |
| Navigation, controls, cards and tables | Inter | 400, 500, 700 |

System fallbacks must remain so cached pages stay readable when web fonts are unavailable.

## Navigation

- Use the same sticky horizontal navigation on Dashboard, Bills, Supply Rates, Prices and Settings.
- Order: Dashboard, Bills, Supply Rates, Prices, Settings.
- Settings is visible only to the admin UID.
- Mobile navigation scrolls horizontally and keeps a minimum 44px touch target.
- Light is the default appearance. The Light/Dark switch saves `localStorage.ws-theme`.

## Components

- Cards and fields use the shared surface, border and radius tokens from `brand-system.css`.
- Primary buttons use the primary action token; secondary buttons use the surface token.
- Text and controls must remain readable in both appearances.
- The Bills page has three KPI cards: Showing Records, Total MVR and This Month.
- Pending is a status/filter value, not a KPI card.
- Amounts always show two decimal places and MVR where space permits.

## Responsive Standard

- Desktop content width is constrained and aligned beneath navigation.
- Tablet layouts wrap without horizontal page overflow.
- Mobile forms become one column; tables use a deliberate scroll or card layout.
- Dialogs fit the viewport and keep their action buttons reachable.

## Accessibility and Safety

- Visible focus, explicit labels, semantic buttons and adequate contrast are required.
- Visual changes must not alter calculations, permissions or stored data.
- Authentication and database mutations are never cached by the service worker.
- Use `SHAS.md` for canonical section/function names.
