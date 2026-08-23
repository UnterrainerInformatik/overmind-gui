## Why

On the Migrations Overview kiosk page, an operator can currently only see a node's retry/attempt count by tapping it open in the detail dialog - there is no way to scan all nodes for a migration and spot which ones are burning through retries at a glance. Separately, the page's node lists routinely grow long enough to need scrolling, but on the tablet the list does not scroll at all, so nodes below the fold are simply unreachable.

## What Changes

- Render each node row (pending, done, and error) as an outlined chip, full width of its table column, with a transparent background.
- Show the node's retry/attempt count inside its chip, right-aligned, so every node's retry count is visible without opening the detail dialog.
- Fix touch scrolling on the Migrations Overview page: the node lists sit inside a container that does not scroll on the tablet even when content overflows. Give the migrations list its own explicit scroll container (bounded height, touch-scrollable) with a visible scrollbar on the right when content overflows.

## Capabilities

### Modified Capabilities
- `kiosk-migrations-overview`: adds a requirement that each node's retry/attempt count is visible at a glance (not just in the detail dialog) via an outlined, full-width, transparent chip with the count right-aligned; adds a requirement that the node list remains reachable by touch scroll (with a visible scrollbar) when it overflows the available height.

## Impact

- `src/views/KioskMigrations.vue`: node-row markup (pending/done/error `<td>` contents) switches from plain icon+text rows to `v-chip` rows; list container gains an explicit scrollable wrapper with `overflow-y: auto` and touch-scroll styling.
- No backend or service-layer changes - `attemptCount` is already delivered per node by the existing `GET /reconciliation` response for pending/error nodes (currently only read in the node-detail dialog); this change reads the same field earlier, in the row itself. Whether `attemptCount` is also populated for already-`done` nodes is confirmed in design.md.
- No route, store, or API contract changes.
