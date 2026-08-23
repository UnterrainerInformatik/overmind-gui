## Context

See `proposal.md` - Why. Relevant current state in `src/views/KioskMigrations.vue`:

- Each migration entry (`entry`) renders a `v-simple-table` with three columns (pending/done/error). Each column's `<td>` either shows a plain count (`entry.pendingCount`, etc.) when no per-node array is available, or a list of plain rows (`v-icon` + `{{ node.name }}`) when `entry.pendingNodes`/`doneNodes`/`errorNodes` is populated.
- `node.attemptCount` already exists on the node object and is read today only inside the node-detail dialog (`selectedNode.node.attemptCount`), guarded with a `!== null && !== undefined` check - the dialog already tolerates the field being absent.
- The page has no explicit scroll container. `.migrations-list` (the outer `v-container`) has no bound on its height and no `overflow` set; its ancestor `.v-app` (global rule in `App.vue`) is pinned to `height: 100vh; max-height: 100vh`. On a desktop browser the overflow still bubbles to the document and scrolls; on the kiosk tablet's browser it does not - consistent with how locked-down kiosk browsers commonly behave (document/page-level scroll and overscroll disabled by the kiosk shell, while scroll *within* an element that declares its own `overflow: auto` still works). There is no existing scrollable list anywhere else in kiosk mode to follow as precedent - every other `Kiosk*` view is a fixed-viewport dashboard.

## Goals / Non-Goals

**Goals:**
- Make every rendered node row (pending, done, error) show its retry/attempt count without an extra tap, using the chip styling described in the proposal.
- Make the node lists reliably touch-scrollable on the kiosk tablet, with a scrollbar that appears only when a list actually overflows.

**Non-Goals:**
- Changing what counts as "pending"/"done"/"error", or the detail-dialog / retry-action behavior - those are unchanged.
- Adding retry-count sorting/filtering. This change only makes the existing per-node data visible in the row; it doesn't add new interactions.
- Fixing scrolling anywhere else in kiosk mode - scoped to the Migrations Overview node lists, the one place kiosk mode currently has scrollable content.

## Decisions

**1. Node rows become `v-chip` (`outlined`, `color="transparent"`, `width: 100%`), replacing the plain `v-icon` + text rows.**
Keeps the existing status icon (schedule/check_circle/error) and node name on the left, adds the retry count on the right via `d-flex justify-space-between align-center` inside the chip. `outlined` + explicit `background-color: transparent` matches the request precisely (Vuetify's `outlined` chips are transparent by default, but the color prop is set explicitly so it doesn't pick up a themed tint). Width is forced to 100% with a small CSS rule (`v-chip` doesn't stretch by default) rather than switching to a different component, so the existing per-row click-to-open-dialog behavior (`clickable-node`) carries over unchanged.
*Alternative considered*: a two-column flex row (name left, count in a plain `<span>` right) without the chip wrapper - rejected because the proposal explicitly asks for outlined chips, and chips also give a free visual boundary between stacked rows in a scrollable list.

**2. Retry count source: `node.attemptCount`, rendered only when defined - for all three lists.**
Reuses the exact field the detail dialog already reads. For `pendingNodes`/`errorNodes` this is confirmed live (already displayed in the dialog for those). For `doneNodes`, the backend's `GET /reconciliation` node shape has never been exercised for this field specifically (the dialog is only reachable from pending/error rows today, since done rows have no click handler) - this change does not add a click handler to done rows, so it inherits whatever `doneNodes[].attemptCount` the backend already sends, if anything. Per the existing dialog's guard pattern, the chip omits the count segment entirely when `attemptCount` is `null`/`undefined`, so a done node without the field simply renders as a chip with no count - no placeholder, no assumed zero.
*Alternative considered*: defaulting missing counts to `0` - rejected, since a missing field and "zero retries" are different facts and conflating them would be misleading for pending/error nodes if the field is ever legitimately absent.

**3. Scroll fix: give the node-list `<td>` content its own bounded, scrollable wrapper instead of relying on document-level scroll.**
Wrap each column's node list in a `<div class="migrations-node-list">` with `max-height` (e.g. `40vh`, tuned in implementation) and `overflow-y: auto; -webkit-overflow-scrolling: touch;`. This makes each column independently scrollable rather than trying to make the whole page scroll - matches the per-column layout already in place and sidesteps the `.v-app { height: 100vh }` constraint entirely (no change needed there). A visible scrollbar is forced with `::-webkit-scrollbar` styling (width, thumb/track colors) rather than left to the platform default, because default touch-browser scrollbars are frequently overlay-only/invisible until actively dragged, which would fail the "scrollbar on the right when needed" ask.
*Alternative considered*: making the whole page (`.migrations-list`) scroll as one unit instead of per-column - rejected because the table's three columns already lay out side by side with independent content lengths (e.g. many pending nodes but zero errors), so a single page-level scroll would force all three columns to the height of the tallest one anyway; per-column scroll keeps each column compact when its own list is short.
*Alternative considered*: removing `max-height: 100vh` from the global `.v-app` rule - rejected as out of scope (a global rule shared by every view in the app) and unnecessary once each column manages its own scroll.

## Risks / Trade-offs

- **[`doneNodes[].attemptCount` may not exist on the backend response]** → Mitigation: Decision 2's omit-when-undefined behavior means done-node chips just render without a count in that case; nothing breaks, and the pending/error chips (the ones operators actually care about for spotting stuck nodes) are unaffected either way.
- **[Kiosk browser's actual scroll-blocking mechanism is not confirmed from code alone - Context's explanation is the standard kiosk-browser pattern but not verified against the specific device/browser in use]** → Mitigation: giving each node list its own `overflow-y: auto` container is the correct fix under every plausible cause (document-level scroll disabled by the kiosk shell, or simply no scroll container existing at all); low risk of not helping, and no downside on desktop browsers where scrolling already worked.
- **[Per-column `max-height` is a fixed value, not fully responsive to viewport size]** → Mitigation: use a viewport-relative unit (`vh`) rather than a hard pixel value so it scales with screen size; exact value left to implementation/tasks.

## Open Questions

- Exact `max-height` value for the per-column scroll container - left to implementation, tuned by eye against the kiosk tablet's actual screen size.
