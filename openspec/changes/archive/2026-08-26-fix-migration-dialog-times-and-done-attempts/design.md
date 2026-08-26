## Context

See proposal.md — Why. The wire shape, read from a live `GET /reconciliation` on `babylon5` on 2026-08-26 (server `c11f2d6`, 105 nodes on `wifi-dns-nameserver`):

```json
{ "applianceId": 113, "name": "Bewegungsmelder Stiege EG-OG - EG", "attemptCount": 1,
  "errorMessages": ["DeviceUnreachableException: …", "RestClientException: … 401."],
  "occurrenceCounts": [1, 1],
  "lastAttemptAt": "2026-08-26T10:16:03.646001424",
  "firstOccurredAts": ["2026-08-26T10:15:30.763162135", "2026-08-26T10:16:03.646001424"],
  "lastOccurredAts":  ["2026-08-26T10:15:30.763162135", "2026-08-26T10:16:03.646001424"] }
```

```json
{ "applianceId": 161, "name": "Server", "attemptCount": 1, "errorMessages": [],
  "occurrenceCounts": [], "lastAttemptAt": "2026-08-26T10:13:07.921389219",
  "doneAt": "2026-08-26T10:13:07.921389219", "firstOccurredAts": [], "lastOccurredAts": [] }
```

Three facts about that payload drive the decisions below:

- `errorMessages` stays a list of **plain strings**. The times are two arrays parallel to it, exactly as `occurrenceCounts` is. The object-with-its-own-time shape `migration-dialog-times-and-battery` Decision 5 anticipated is the shape of the *persisted CLOB entry*, not of the wire.
- A per-reason time that is unknown is a literal `null` **element**, not a missing one — the arrays must stay index-parallel. Node-level fields (`doneAt`, `attemptCount`, `lastAttemptAt`) are the opposite: an unknown one is an omitted key, never `null`. Live there are 28 such null elements (both arrays of the 14 pending nodes still holding a pre-change `NullPointerException` reason) and no other `null` anywhere.
- Times are not backfilled. 71 of 88 done nodes converged before the deploy and carry neither `doneAt` nor `attemptCount`; 17 converged after it and carry both. Whatever this change does must render both groups without a placeholder.

## Goals / Non-Goals

**Goals**
- Make the two live values the dialog already promises actually appear.
- Keep the view version-agnostic: it must still render correctly against the pre-`c11f2d6` payload, and against the shape Decision 5 anticipated, without a version flag.
- Change no rendering rule, no format and no layout — this is a reading fix.

**Non-Goals**
- No done-node failure list (see proposal, Not in scope).
- No new backend field, no second request, no change to polling.
- No rework of the normalizer into a typed model; it stays one tolerant function.

## Decisions

1. **The parallel arrays are passed in as fallbacks, exactly as the occurrence count already is.** `errorEntries` already zips `occurrenceCounts[i]` into `normalizeErrorMessage(entry, counts[i])` for precisely this reason — the shape that keeps a per-reason value beside the reasons instead of inside them. The times are that same shape, so they take that same path: `normalizeErrorMessage(entry, counts[i], last[i], first[i])`. The alternative — zipping the three arrays into synthetic `{text, at, count}` objects before calling the normalizer — was rejected: it would leave the normalizer with a dead object branch that no longer matches any real payload, and the fallback parameter is the pattern the function was already written around.
2. **Last occurrence wins over first, for both shapes.** The normalizer's existing object branch prefers `entry.lastOccurredAt` over `entry.firstOccurredAt` because the most recent occurrence is what says whether a node is still failing; the array fallbacks keep that order (`last[i]` before `first[i]`) so a collapsed entry reads the same whichever way its time arrived. For an uncollapsed reason the backend writes the same value in both, so the choice is invisible there.
3. **A `null` array element needs no special handling.** `firstNonEmpty` already maps `null` and `undefined` to `null` and falls through to the next candidate, so a pre-change reason yields `at: null` and `errorMessageLine` omits its time — which is the "reason without a time" scenario the spec already pins, now reached through the arrays instead of through the string branch.
4. **The done column's attempt count is no longer special-cased.** `attemptCount()` loses its `column === 'done'` guard and becomes the same one-line `firstDefined` lookup for all three columns. The old guard was a deliberate mirror of the backend's old rule; with that rule reversed, keeping a client-side suppression would mean the chip shows a count the dialog denies. The not-backfilled case needs no guard of its own: a pre-deploy done node has no `attemptCount` key, `firstDefined` returns `null`, and the template's `v-if` drops the line — the same path a never-attempted pending node already takes.
5. **The count is shown unlabelled as to what it means.** It keeps the existing `page.kiosk.migrations.attempts` label rather than gaining a done-specific wording. The number's meaning is the same fact in every column — how many attempts the cycle consumed — and the backend's rule that the successful attempt is included makes "1" the honest reading for a first-try convergence, not an off-by-one to explain in the UI.

## Risks / Trade-offs

- [A done node now shows `Versuche: 1` where it previously showed nothing] → that is the point of the backend change, and the chip beside it already shows the same number. The alternative, hiding a value the backend deliberately started sending, is worse.
- [The object branch of the normalizer is now unreachable against the live backend] → kept anyway. It costs two lines, it is what lets this view survive a backend that changes its mind, and deleting it would re-create exactly the coupling that caused this bug.
- [An unreachable-attempt failure records a reason without incrementing the count, so a node can show one reason and `attemptCount: 1`] → correct per the backend's design D4 (an unreachable attempt does not consume the retry budget) and out of this view's hands; it renders what the backend reports.

## Migration Plan

Pure frontend change in one view; ship with the normal build. Backward-compatible with the pre-`c11f2d6` payload and forward-compatible with the anticipated object shape, so there is no ordering constraint against the backend. Rollback = revert the commit; the dialog returns to omitting the two values.
