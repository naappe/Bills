# Design Tokens Reference

Source: **Complete Tokenization System — Ewity POS Dashboard** (`Pasted text(107).txt`).

This file preserves the supplied token architecture as a reference for future White Saffron work. It must be adapted to the existing application rather than copied over the current design system.

## 1. Token architecture

Use three layers:

1. **Base tokens** — raw values such as colour, font size, spacing, radius, shadow and duration.
2. **Semantic tokens** — purpose-based mappings such as card background, input border, success state and sidebar active colour.
3. **Component tokens** — values scoped to cards, tables, KPI cards, buttons, modals, tooltips and charts.

Recommended naming pattern:

```css
--token-{category}-{name}
--token-{component}-{property}
```

Examples:

```css
--token-color-brand-primary
--token-font-size-md
--token-spacing-8
--token-card-border
--token-button-primary-bg
```

## 2. Colour families

The supplied reference defines:

- Brand primary, dark, light, lighter and lightest variants.
- Brand secondary and accent.
- Semantic success, error, warning and information colours, each with background and border variants.
- Neutral values from white through grey to black.
- Eight chart colours and chart gradients.
- Online, offline, away and busy status colours.

Reference primary values:

```css
--token-color-brand-primary: #356ec9;
--token-color-brand-primary-dark: #2b5aa6;
--token-color-brand-primary-light: #4a82d4;
--token-color-brand-primary-lightest: #e6f0ff;
--token-color-success: #52c41a;
--token-color-error: #f5222d;
--token-color-warning: #faad14;
--token-color-info: #1890ff;
```

These are reference values only. White Saffron's approved brand colours remain authoritative.

## 3. Typography

Primary family:

```css
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif
```

Reference size scale:

| Token | Size |
|---|---:|
| xs | 10px |
| sm | 11px |
| base | 13px |
| md | 14px |
| lg | 16px |
| xl | 18px |
| 2xl | 20px |
| 3xl | 24px |
| 4xl | 30px |
| 5xl | 38px |
| 6xl | 48px |
| 7xl | 60px |
| 8xl | 76px |

Weights range from 100 to 900. The common application hierarchy should prefer 400, 500, 600, 700 and 800.

Reference line heights are 1.2, 1.4, 1.5, 1.6, 1.8 and 2. Letter spacing includes tight, normal, wide, wider and widest.

## 4. Spacing

The supplied scale uses compact 2px increments at the low end and larger increments for layout spacing:

```text
0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24,
28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128px
```

Use existing White Saffron spacing tokens first. Add a new token only when the existing scale cannot express a recurring layout requirement.

## 5. Borders and radii

Reference widths: 0, 1, 2, 3, 4 and 8px.

Reference radii:

```text
0, 2, 4, 6, 8, 12, 16, 24px, full pill
```

Use solid borders by default. Dashed and dotted borders should be reserved for explicit states such as drop zones or temporary placeholders.

## 6. Shadows

The reference defines shadow levels from `xs` through `3xl`, plus inset and focus-ring shadows.

White Saffron should use restrained depth:

- `xs` or `sm` for standard cards.
- `md` for elevated menus.
- `lg` or `xl` for dialogs and popovers.
- Focus rings must remain visible for keyboard users.

## 7. Layout tokens

Reference values include:

```css
--token-container-max-width: 1440px;
--token-content-max-width: 1200px;
--token-sidebar-width: 180px;
--token-sidebar-collapsed: 56px;
--token-topbar-height: 44px;
--token-table-row-height: 40px;
--token-table-header-height: 44px;
--token-kpi-min-width: 220px;
```

Do not apply the reference sidebar sizes to White Saffron. The current application geometry remains the source of truth.

## 8. Layering

Reference z-index roles:

```text
dropdown 1000
sticky 1020
fixed 1030
modal backdrop 1040
modal 1050
popover 1060
tooltip 1070
toast 1080
loading 1090
max 9999
```

Use named semantic layers instead of random z-index values.

## 9. Motion

Reference transitions:

```text
fast 100ms
base 200ms
slow 300ms
slower 500ms
spring 400ms
```

All non-essential animation must be disabled or reduced under `prefers-reduced-motion: reduce`.

## 10. Breakpoints

Reference breakpoints:

```text
sm 576px
md 768px
lg 1024px
xl 1280px
2xl 1536px
```

The application should remain mobile-first, but existing White Saffron breakpoints must be checked before adding new media queries.

## 11. Semantic component tokens

The source proposes semantic mappings for:

- Sidebar and navigation.
- Top bar.
- Cards and KPI cards.
- Charts and tables.
- Primary, secondary, ghost and danger buttons.
- Inputs and disabled states.
- Modals, tooltips and badges.

Example structure:

```css
--token-card-bg
--token-card-border
--token-card-shadow
--token-input-border
--token-input-focus-border
--token-button-primary-bg
--token-button-primary-hover-bg
--token-badge-success-bg
--token-badge-success-color
```

## 12. Themes and accessibility

The reference includes:

- Light theme.
- Dark theme overrides.
- High-contrast overrides.
- Reduced-motion overrides.

Dark mode must not be enabled merely because it exists in the reference. It requires a complete audit of every component and explicit product approval.

## 13. Utility classes

The supplied system contains utilities for:

- Flexbox and grid.
- Gap, padding and margin.
- Typography and text alignment.
- Colour and background.
- Borders, radii and shadows.
- Position, dimensions and overflow.
- Cursor, opacity, transition and visibility.
- Responsive display utilities.

Avoid introducing hundreds of unused utilities. Add only utilities that remove genuine repetition and do not conflict with component ownership.

## 14. JavaScript token API

The source defines a `DesignTokens` object and a `TokenManager` with helpers including:

```javascript
token.get(path)
token.getColor(path)
token.getSize(path)
token.getFontSize(path)
token.getShadow(path)
token.getBreakpoint(path)
token.getZIndex(path)
token.setTheme(theme)
token.toggleTheme()
```

It also proposes CSS-variable generation, listeners for theme changes, CSS-in-JS helpers, React hooks, Vue composition helpers and TypeScript token-path types.

White Saffron is currently a plain HTML/CSS/JavaScript application. React and Vue helpers are reference material only and should not be added.

## 15. Adoption rule

When using this reference:

1. Audit existing files such as shared tokens, layout, consistency and page-specific CSS.
2. Map existing values to semantic names before creating replacements.
3. Preserve current visual identity and behaviour.
4. Refactor incrementally by component.
5. Verify desktop, tablet and mobile layouts.
6. Check keyboard focus, contrast and reduced motion.
7. Never mass-replace styles without a page-by-page visual check.
