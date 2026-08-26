## Why

The backend companion change `reconciliation-node-times` shipped on 2026-08-26 (`java-overmind-server` `c11f2d6`), and the fleet has converged against it: `GET /reconciliation` now carries a `doneAt` per done node, an `attemptCount` for done nodes too, and a recorded time for every failure reason. Two of those three arrive in the dialog and are dropped on the floor.

- **Failure-reason times never render.** `migration-dialog-times-and-battery` guessed that a timestamped reason would arrive as an object carrying its own time (`normalizeErrorMessage` looks for `entry.at` / `entry.recordedAt` / `entry.lastOccurredAt` / `entry.firstOccurredAt`) and recorded that guess as a risk to confirm against a live response. The guess was wrong: the endpoint keeps `errorMessages` a list of plain strings and hangs the times off two arrays parallel to it, `firstOccurredAts` and `lastOccurredAts` — exactly the shape `occurrenceCounts` already uses, which this view already handles. So every reason falls through the plain-string branch with `at: null` and the timeline the requirement asks for is never drawn. Live on 2026-08-26 that silently discards real data: error node 113 has two reasons recorded 33 seconds apart, and the dialog shows neither time.
- **A done node's attempt count is suppressed.** `attemptCount()` returns `null` for the done column, encoding the backend's old rule that a done node reports no count. The backend reversed that rule (its Decision 7): a done node now reports the attempts its cycle consumed *including the one that succeeded*, so a device that converged on the first try is distinguishable from one that fought through four failures. The node chips already show that count; only the dialog hides it.

Both are the consumer half of a backend change that is already live, so the fix is what makes that change observable at the kiosk.

## What Changes

- **A failure reason's time is read whichever way the backend attaches it** — inside the entry, or in a list parallel to the reasons, the way the occurrence count already is. Nothing about how a reason is *rendered* changes: same localized format with seconds, same "no time supplied, no time shown" rule.
- **The dialog shows a done node's attempt count**, on the same line format the pending and error columns use, and still omits the line entirely for a done node that converged before counts were recorded.
- No new request, no new field fetched, no layout change: both values are already in the migrations poll's payload.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `kiosk-migrations-overview`: the "Each failure reason is shown with the time it was recorded" requirement is extended to state that the time is read regardless of how the backend attaches it to the reason; the "information block" requirement is extended to say the attempt count is shown for a done node too and counts the attempt that succeeded.

## Impact

- `src/views/KioskMigrations.vue`: `errorEntries` passes the parallel `firstOccurredAts` / `lastOccurredAts` entries into `normalizeErrorMessage` alongside the occurrence count it already passes; `normalizeErrorMessage` falls back to them for both the string and the object shape; `attemptCount()` drops its done-column exclusion.
- No locale keys, no styles, no service or store changes. The existing `page.kiosk.migrations.attempts` key already labels the count.
- **Not in scope:** showing a done node's *overcome* failure reasons. The backend now retains them on done nodes, but the dialog deliberately draws no failure section for the done column (spec: "no dangling separator"), and reopening that layout decision is a separate question from making the times it already promises actually render.
