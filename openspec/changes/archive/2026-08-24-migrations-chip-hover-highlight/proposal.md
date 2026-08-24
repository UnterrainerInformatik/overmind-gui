## Why

Hovering anywhere over a migration entry in the Migrations Overview paints the whole entry grey instead of highlighting the node chip under the cursor.

The page renders all three node lists (pending, done, error) inside a *single* `<tr>` of a `v-simple-table` - one row, three cells, each cell holding a stack of chips. Vuetify's data-table theme ships a row-hover rule (`> tbody > tr:hover { background: <table hover> }`, `#424242` on the dark theme the kiosk runs). With exactly one row in the table, that rule turns "highlight the row under the cursor" into "highlight the entire table body", and it fires no matter which cell - or which gap between chips - the pointer is over.

The chips do have hover feedback, but it neither reads nor discriminates. Vuetify's `states` mixin lights every chip's `::before` overlay at `opacity: .08` on hover (`.theme--dark.v-chip:hover::before`) - the same amount for the clickable pending and error chips as for the done chips, which open nothing. Against the `#616161` block the table paints at the same moment, a 0.08 white wash on one chip is invisible. So the page's loudest hover signal is the wrong one, and the quiet one that is left points at interactive and non-interactive rows alike.

## What Changes

- Suppress the inherited `v-simple-table` row-hover background for the migrations table, so pointing at the table no longer repaints it.
- Switch off Vuetify's blanket 0.08 chip hover overlay for the node chips, then raise it to a legible level for the clickable ones (pending, error), so the chip under the cursor is the thing that changes.
- Leave the done chips unhighlighted: they are not clickable, and the inherited highlight on them advertises an interaction that does not exist.
- Scope the raised highlight to pointer devices (`@media (hover: hover)`) so a tap on the kiosk tablet does not leave a chip stuck in the highlighted state.

## Capabilities

### Modified Capabilities
- `kiosk-migrations-overview`: adds a requirement that pointer hover feedback targets the individual node chip under the pointer, and that the table as a whole does not change appearance on hover.

## Impact

- `src/views/KioskMigrations.vue`: one class on the `v-simple-table` element plus CSS rules in the view's style block. No template restructuring, no script changes.
- No backend, route, store, or API contract changes; no change to click/retry behaviour.
