# White Saffron Design System

The application uses `app/css/tokens.css` as the single source of truth for visual decisions. Page and component styles should consume these variables instead of introducing new hardcoded brand colors, shadows, radii, font sizes, or recurring spacing values.

## Brand palette

| Token | Value | Use |
|---|---:|---|
| `--brand-navy` | `#1A3C6E` | Primary navigation, links, focus and selected states |
| `--brand-navy-900` | `#102A50` | Strong brand text and gradient depth |
| `--brand-navy-100` | `#EAF0F7` | Soft branded backgrounds |
| `--brand-gold` | `#F5A623` | Primary actions, highlights and KPI accents |
| `--brand-gold-100` | `#FFF4DA` | Soft highlighted rows and selected surfaces |

## Neutral surfaces and text

Use `--bg` for the application canvas, `--surface` for cards and controls, and `--surface-muted` for secondary areas. Text must use `--text`, `--text-strong`, or `--text-muted`. Borders use `--border`.

## Status colors

- Success: `--success` and `--success-soft`
- Warning: `--warning` and `--warning-soft`
- Danger: `--danger`, `--danger-soft`, and `--border-danger`

Status colors communicate meaning and must not be used as decorative page colors.

## Typography

- Headings and controls: `--font-heading` (Montserrat)
- Body text and form fields: `--font-body` (Lato)
- IDs and technical values: `--font-mono`
- Sizes: `--fs-10` through `--fs-44`
- Weights: `--weight-regular` through `--weight-black`

## Spacing

Use the shared spacing scale:

- `--sp-0`: 4px
- `--sp-1`: 8px
- `--sp-1-5`: 12px
- `--sp-2`: 16px
- `--sp-2-5`: 20px
- `--sp-3`: 24px
- `--sp-4`: 32px
- `--sp-5`: 40px
- `--sp-6`: 48px

Small, one-off geometry needed for table columns or responsive grids may remain component-specific.

## Shape and elevation

Controls use `--radius-control`; cards use `--radius-card`; large dialogs use `--radius-lg`; pills and circular UI use `--radius-pill`. Use `--shadow-sm`, `--shadow-md`, and `--shadow-focus` rather than custom shadows.

## Component rules

- Cards use `--surface`, `--border`, `--radius-card`, and `--shadow-sm`.
- Buttons use `--control-height`, `--radius-control`, and the brand/status tokens.
- Form controls use the standard control height and focus ring.
- Tables use `--table-row`, neutral surfaces, shared typography and status badges.
- Page-specific CSS may define layout but should inherit visual treatment from the shared tokens.

## Adding a new token

Add a token only when a value represents a reusable design decision. Do not create tokens for every isolated pixel value. Name tokens by purpose rather than page name, document them here, then consume them through `var(--token-name)`.