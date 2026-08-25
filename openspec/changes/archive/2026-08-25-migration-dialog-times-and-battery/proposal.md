## Why

The node dialog on the Migrations Overview answers "which device is this?" but not "when did anything happen to it?". A done node shows no completion time, so a migration that converged two minutes ago is indistinguishable from one that converged two days ago. An error node lists failure reasons with no times at all, so an operator cannot tell a node stuck since yesterday from one that failed five times in five seconds. And for the battery-driven sensors — which make up most of the nodes that stall in a reconciliation, because they are asleep when the reconciler reaches them — the dialog does not show the battery level at all, even though a flat battery is the most common reason such a node never converges.

The dialog also runs the appliance facts and the failure reasons together as one undifferentiated run of text, with nothing marking where the "what this device is" block ends and the "what went wrong" list begins.

## What Changes

- The dialog's information block gains a **battery line** for battery-driven appliances: the charge level as a percentage. It carries no timestamp of its own — a device that makes contact without posting a new battery level is stating that the stored level still stands, so the last-time-online line already in the block is the time through which the level is valid, and no new backend field is needed. An appliance that is not battery-driven gets no battery line at all.
- A **done node's dialog shows when the migration was carried out** for that node.
- **Each failure reason in an error node's dialog is shown with the time it was recorded**, so the failure history reads as a timeline.
- Both new times are rendered in the view's existing localized date/time format — explicitly **not** ISO-8601, matching the "Letztes Mal online" line already in the block.
- The dialog's **attempt count moves up into the information block** (it is a fact about the node, not a failure reason), and a **visual separator** is drawn between that block and the list of failure reasons.
- Every new line follows the block's established rule: a value the backend does not supply is omitted rather than rendered empty, as a placeholder, or as a zero. The change therefore ships and degrades cleanly against today's backend, and fills in as the companion backend change lands.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `kiosk-migrations-overview`: the "Node detail dialog shows appliance information" requirement is extended to cover the battery level, the done-node migration time, and per-failure-reason times; a new requirement covers the separator between the information block and the failure-reason list, and the attempt count's placement within the block.

## Impact

- `src/views/KioskMigrations.vue`: `normalizeAppliance` gains battery extraction from the parsed `state` (`batteries[0].batteryLevel`, plus `batteryDriven` from the record, the level's validity time being the last-time-online value the block already shows); the dialog template gains the battery, migration-time and per-reason-time lines, the moved attempt count and a `v-divider`; a small helper renders a failure reason that may arrive as a plain string or as a timestamped object.
- `src/locales/de-AT.json`, `src/locales/en-US.json`: new keys for the battery label and the migration-time label.
- **The battery line ships today; the two migration times wait on the backend.** Confirmed against the backend on 2026-08-25: `batteryDriven`, `batteries[0].batteryLevel` and `lastTimeOnline` are all already served by `/setup/appliances`, so the battery line needs nothing new. `ReconciliationNodeJson`, by contrast, is `{applianceId, name, attemptCount, errorMessages}` with no per-node timestamps anywhere — not in the DTO, not in `FieldReconciliationCoordinator.TargetState`, not in the persisted `reconciliation_action` row — so the migration time and the failure-reason times require the companion change `reconciliation-node-times` in `java-overmind-server`. Until it ships those two lines are simply absent, and the rest of this change is fully functional.
- Sequencing: the backend companion overlaps with the in-flight backend change `fix-reconciler-gen2-and-transport-errors`, which already reshapes `errorMessages` (duplicate-reason collapsing with occurrence counts) and adds a last-attempt time for error nodes. This GUI change reads whatever shape arrives defensively, so it is not blocked by that ordering.
- No change to the migrations polling, the panel/table layout, or the chip rendering.
