# Layout System

These names describe the major visual regions used across White Saffron pages. They are internal design and development terminology. They should not be rendered as visible headings unless the page genuinely needs that heading.

## Standard hierarchy

```text
Application Shell
├── Sidebar
├── Top Bar
└── Page Content
    ├── Page Header
    ├── Filter / Toolbar
    ├── KPI Summary
    │   └── KPI Cards
    ├── Primary Content
    │   ├── Primary Data Panel
    │   └── Secondary Panel
    └── Supporting Content
```

## Region definitions

### Page Header

The page-level introduction. It can contain the page title, one concise description and primary actions. Do not duplicate the title already shown in the global top bar unless the local heading adds necessary context.

### Filter / Toolbar

Controls that change the visible dataset or page mode: search, date range, status, vendor, category, sorting, view mode and reset.

### KPI Summary

A single row or responsive grid containing the most important measurements for the current page and filter state.

### KPI Card

One metric with a label, value and short supporting detail. Currency values must remain readable and must not be truncated unnecessarily.

### Primary Content

The main working area of the page. This may be a table, record list, bill form, product workspace, report or comparison panel.

### Primary Data Panel

The dominant card or section containing the page's principal data or workflow.

### Secondary Panel

Supporting information or actions placed beside or below the primary panel. Examples include attention items, summaries, history and contextual actions.

### Card Header

The top section of a card. It may contain a title, explanation, status or compact action. Keep its spacing consistent across pages.

### Card Body

The main content area inside a card.

### Data Table

A structured tabular region. It should support horizontal scrolling where necessary and remain readable on smaller screens.

### Form / Fields

A related set of inputs. Group fields by task, not merely by database column order.

### Actions

Primary and secondary commands associated with the current page, card or form.

### Pagination

Controls for moving through large datasets. Pagination state should remain stable while navigating back from a record.

## Responsive behaviour

- Desktop may use multi-column primary and secondary panels.
- Tablet should reduce column count without compressing controls below usable sizes.
- Mobile should stack panels and use page-appropriate cards or horizontal table scrolling.
- Controls should remain touch-friendly.
- Text must not break one word into individual letters.

## Spacing rule

Adding visible helper labels must never alter production spacing, depth or hierarchy. The interactive helper should identify existing regions using overlays and outlines rather than inserting permanent content into page flow.
