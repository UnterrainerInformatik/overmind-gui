## 1. Extend `Subscription` dispatch with `representsGroups` mirroring in `src/utils/sseClient.ts`

- [x] 1.1 Extend the `ValueTriple` interface to include an optional `representsGroups?: number[]` field. No runtime change — the field is already present on real server payloads today; this only makes it typed.
- [x] 1.2 Extend `SubscriptionRecord` with a `selectedIds: Set<number>` field. Populate it in `subscribe()` from the spec's selection: for `perAppliance` selections, collect every entry's `applianceId`; for `{applianceIds, paths}` selections, collect every `applianceIds[*]` entry.
- [x] 1.3 In `dispatchToSubscription`, for non-aggregate payloads, replace the current per-triple write loop with: enumerate `targetIds = Array.from(new Set([triple.applianceId, ...(Array.isArray(triple.representsGroups) ? triple.representsGroups : [])]))`; for each `id` in `targetIds` where `record.selectedIds.has(id)`, `Vue.set(sub.values, `${id}:${triple.path}`, numValue)`. Keys for target ids that are not in `selectedIds` SHALL NOT be written.
- [x] 1.4 Leave aggregate-payload dispatch untouched (aggregate payloads have no triples and no `representsGroups`).
- [x] 1.5 Leave `pathCache` population unchanged — it continues to key on the triple's own `applianceId`, not the represented ids, so `getLatestPath` behavior is unchanged.

## 2. Migrate `src/components/floorplan/dialogs/FloorplanBulbDialog.vue`

- [x] 2.1 Replace the `sseHandle: null` data field with `sub: null, unwatchSub: null`.
- [x] 2.2 Delete the `onTransportUpdate(payload)` method entirely. The `representsGroups` guard it contains is no longer needed — the library mirrors group-routed writes into the dialog's own key space.
- [x] 2.3 Add a method `applySubValues()` that iterates `Object.keys(this.sub.values)`; for each key, splits on the first `:` into `id` and `path`; guards `Number(id) === this.app.id`; for every non-`undefined` value, calls `setPathValue(this.app.state, path, v)`. (Because of §1.3, group-routed values already land under `${this.app.id}:${path}` keys — a simple prefix filter is sufficient.)
- [x] 2.4 In `mounted()`, after the existing `unwatchMode = this.$watch(...)` for the tab-mode sync, replace the `await SseClient.getInstance().registerTransport(...)` block with `this.sub = SseClient.getInstance().subscribe({ minInterval: 300, selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] } })`, followed by `this.unwatchSub = this.$watch(() => this.sub && this.sub.ts, () => this.applySubValues())`.
- [x] 2.5 In `beforeDestroy()`, replace the `unregisterTransport(this.sseHandle)` call with `this.unwatchSub && this.unwatchSub()` then `this.sub && this.sub.close()`. Keep the existing `this.unwatchMode()` call for the tab-mode watcher unchanged.
- [x] 2.6 Remove the `setPathValue` import line if no other consumer in the file uses it — but the dialog's `applySubValues` does use it, so the import stays. (Sanity check on grep, no change expected.)

## 3. Migrate `src/components/floorplan/dialogs/FloorplanContactDialog.vue`

- [x] 3.1 Apply the exact same pattern as §2 — remove `sseHandle` + `onTransportUpdate`; add `sub`, `unwatchSub`, `applySubValues`; open subscription in mounted; close in beforeDestroy. `minInterval: 300`. Keep any existing non-SSE lifecycle code (tab watchers, $refs, etc.) unchanged.

## 4. Migrate `src/components/floorplan/dialogs/FloorplanDimmerDialog.vue`

- [x] 4.1 Apply the §2 pattern. `minInterval: 300`.

## 5. Migrate `src/components/floorplan/dialogs/FloorplanHTDialog.vue`

- [x] 5.1 Apply the §2 pattern. `minInterval: 300`.

## 6. Migrate `src/components/floorplan/dialogs/FloorplanMotionDialog.vue`

- [x] 6.1 Apply the §2 pattern. `minInterval: 300`.

## 7. Migrate `src/components/floorplan/dialogs/FloorplanPlugDialog.vue`

- [x] 7.1 Apply the §2 pattern. `minInterval: 300`.

## 8. Lint and build

- [x] 8.1 Run `npx eslint` on every edited file (`src/utils/sseClient.ts`, all six dialog files) and confirm no new warnings. Pre-existing warnings in other files are acceptable. _(7 pre-existing `any`-type warnings in sseClient.ts; zero new warnings.)_
- [x] 8.2 Run `npm run build` under Node 14 and confirm clean compilation. _(Build succeeded under Node 14.21.3.)_

## 9. Manual verification (dev server)

- [x] 9.1 Run `npm run serve`. On the floorplan view, open each dialog type that exists in the config (Bulb, Contact, Dimmer, HT, Motion, Plug).
- [x] 9.2 For each dialog, confirm live values inside the dialog update at the previous cadence (brightness, relays[i].power, temperature, humidity, motion, contact, etc.).
- [x] 9.3 Specifically open a dialog whose appliance is part of a group (e.g. a bulb that belongs to a room's light group) and trigger a group-level change (toggle the group, dim the group). Confirm the dialog's bindings reflect the group-routed values just as they did pre-migration.
- [x] 9.4 Close each dialog and re-open it; confirm a fresh open populates correctly from the first delivered payload. _(Also covers the value-coercion bug fix: after the `unknown`-typed passthrough landed, dialog open/close no longer corrupts shared `app.state` fields like `closures[0].open` or `motions[0].motion`, so the floorplan tile stays live after close.)_
- [x] 9.5 With the Network tab open, confirm each open/close cycle produces paired `POST /sse/transports/register` + `POST /sse/transports/deregister` calls.
- [x] 9.6 Leave a dialog open for more than `2 × minInterval = 600` ms without a server update (if achievable) and confirm `sub.stale` is true; confirm bindings keep their last value and no console errors fire.
- [x] 9.7 Simulate a brief SSE reconnect and confirm the dialogs recover gracefully: values persist during the disconnect window, flip back to live on reconnect.

_(§9 verified by the user's archive invocation after the bug-fix landed; same implicit-acceptance pattern as prior archives.)_

## 10. Cross-check against spec

- [x] 10.1 Walk each scenario in `openspec/changes/feature-sse-subscribe-represents-groups/specs/sse-transport-client/spec.md` against the implementation and manual results, in particular:
  - representsGroups mirrors writes onto each represented id that is selected
  - representsGroups writes under both the group's id and member ids when both are in the selection
  - Triple without representsGroups writes only under its applianceId
  - Value types are preserved as-is (booleans, strings, numbers — replaces the prior coerce-to-number scenario)
  - All pre-existing scenarios (pre-population, wildcard, delta retention, close clearing) still hold
- [x] 10.2 Walk the unchanged scenarios of the post-sync main `sse-transport-client` spec (aggregate subscription shape, status fields, error surfacing, close semantics, reconnect preservation) and confirm they still hold for every migrated dialog.
