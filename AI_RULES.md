# White Saffron Procurement ERP — AI Development Rules

These rules govern all AI-assisted work in this repository.

Authority order:

1. `ARCHITECTURE.md`
2. `DESIGN-RULES.md`
3. `CSS-OWNERSHIP.md`
4. `AI_RULES.md`
5. `README.md`

## 1. Mission

Maintain a professional procurement ERP with this priority:

1. reliability
2. accuracy
3. business-rule preservation
4. performance
5. usability
6. visual quality

## 2. Canonical architecture rule

Implementation must move toward the architecture defined in `ARCHITECTURE.md`.

The canonical shell is:

- global top header
- horizontal desktop navigation
- full-width content
- temporary mobile navigation drawer
- one shared route definition
- one shared component system

The legacy permanent sidebar is not a protected target architecture.

Do not patch the sidebar to imitate a top header. When the user approves shell migration, rebuild the connected shell structure, layout ownership, and navigation behavior as one controlled architectural change.

## 3. Preserve business logic

Every architectural or visual change must preserve:

- authentication
- routing hashes
- role restrictions
- Supabase behavior
- bill creation and editing
- bill totals
- pack parsing
- unit conversion
- per-KG, per-G, per-L, per-ML, and per-PCS calculations
- vendor management
- product management
- stock behavior
- deletion workflows
- historical records
- required IDs and data attributes

Architecture approval is not approval to rewrite business logic.

## 4. Inspect before editing

Before changing an existing file:

1. fetch the current default-branch version;
2. identify its owner and dependants;
3. inventory relevant IDs, classes, data attributes, event handlers, and exports;
4. determine whether the change is a bug fix, feature, migration, or documentation update;
5. modify the complete current file, never an assumed or stale copy.

Never replace a large file using a partial excerpt.

## 5. No patch stacking

Do not:

- add a new override to defeat an existing override;
- add inline production patches when the owning source file can be corrected;
- create duplicate navigation systems;
- create duplicate route definitions;
- create duplicate components;
- keep obsolete sidebar code after migration verification;
- use cache-busting as a substitute for fixing source ownership;
- add `!important` to resolve internal CSS ownership conflicts.

A temporary compatibility layer must be labeled, limited, documented, and removed after migration.

## 6. CSS ownership

Follow `CSS-OWNERSHIP.md` exactly:

- `tokens.css`: values only
- `app.css`: base document and authentication foundation
- `layout.css`: application shell and responsive navigation
- `master-components.css`: reusable components
- page CSS: unique route structures only
- `professional.css`: import-only compatibility entry point

Do not redefine shared buttons, fields, cards, tables, KPI components, or navigation inside page files.

## 7. Shared components

Reuse existing canonical components before creating new ones.

Canonical KPI classes:

```css
.kpi-summary
.kpi-card
.kpi-card__icon
.kpi-card__content
.kpi-card__label
.kpi-card__value
.kpi-card__meta
```

The same reuse rule applies to buttons, fields, cards, toolbars, tables, badges, pagination, modals, notices, and empty states.

## 8. Permission and scope

Explicit user approval is required before changing:

- architecture
- navigation system
- routing
- authentication
- database behavior
- Supabase schema or RLS
- business calculations
- permissions
- working workflows
- file or folder structure

When approval is granted for a named architectural task, proceed within that scope without repeatedly asking for permission for each connected file required to complete it.

Do not expand into unrelated modules.

Small isolated bug fixes that preserve behavior may be performed directly, but one bug must remain one fix.

## 9. Database safety

Never perform destructive database work without explicit approval.

Any database proposal must include:

- exact SQL
- affected tables and columns
- expected application changes
- risk assessment
- rollback plan

Frontend role checks are not a security boundary. Supabase RLS remains authoritative.

## 10. Performance

Avoid:

- duplicate listeners
- duplicate renderers
- repeated Supabase requests
- unnecessary observers or intervals
- unnecessary DOM replacement
- blocking scripts
- unused libraries
- memory leaks
- layout thrashing

Preserve fast navigation and mobile performance.

## 11. Git rules

- one logical change per commit;
- do not mix documentation, migration, bug fixes, and unrelated cleanup unless they are inseparable parts of the approved task;
- fetch the current blob SHA before updating a file;
- never force-push or rewrite history;
- use precise commit messages;
- never claim deployment success from a commit alone.

Recommended formats:

```text
docs: description
fix(scope): description
feat(scope): description
refactor(scope): description
```

## 12. Verification

Before claiming implementation is complete, verify the affected scope.

For shell changes, verify:

- login
- session restoration
- logout
- desktop navigation
- mobile drawer
- active route state
- browser back and forward
- role-restricted routes
- page title and subtitle
- every route renderer
- critical bill, product, vendor, cost, and admin workflows
- desktop, tablet, and mobile layouts
- console errors
- duplicate declarations and listeners
- current asset versions after hard refresh

Report:

- files changed
- functions or contracts changed
- tests performed
- actual result
- unresolved risks
- commit SHA

Do not say something is fixed when it was not verified.

## 13. Documentation synchronization

When ownership or architecture changes, update the relevant canonical documents in the same workstream.

Do not document unimplemented behavior as completed. Clearly label target architecture, migration status, and current implementation differences.

## 14. Emergency rule

When required facts are uncertain:

- stop editing;
- fetch the relevant current files;
- identify the conflict or missing information;
- state the risk;
- choose the smallest architecture-consistent next step.

Do not guess.