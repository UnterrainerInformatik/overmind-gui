## Why

While applying `feature-adopt-sse-subscribe` we discovered that all six floorplan detail dialogs (`FloorplanBulbDialog`, `ContactDialog`, `DimmerDialog`, `HTDialog`, `MotionDialog`, `PlugDialog`) rely on the server's `representsGroups` field inside `transport-update` values. The server sends triples where `triple.applianceId` is a *group* appliance and `triple.representsGroups: number[]` enumerates the member appliance ids that should mirror the value. The dialogs' existing `registerTransport` callbacks accept such a triple iff `triple.applianceId === this.app.id` OR `triple.representsGroups.includes(this.app.id)` — so a single bulb dialog naturally sees group-level power/state updates that the group represents onto it.

The current `Subscription` shape writes each triple under exactly one key, `${triple.applianceId}:${path}`, and does not react to `triple.representsGroups`. A naive migration of the dialogs would lose group-routed updates: a payload carrying `applianceId = <group>, representsGroups = [<bulb>]` would land under the group's key, while the dialog watcher looks for the bulb's key. That was the blocker that deferred §3–8 of `feature-adopt-sse-subscribe` and kept the six dialogs on the callback API.

This proposal closes that gap: `subscribe()` gains a small extension that, when `triple.representsGroups` is present, also writes the value under each `${representedId}:${path}` key that the subscription's selection actually contains. With that in place, the dialog migrations become straightforward and can land alongside the extension.

## What Changes

- Extend `SseClient.subscribe()` dispatch to understand `triple.representsGroups: number[] | undefined`:
  - For each triple delivered on a non-aggregate subscription, compute the set of "target ids" for the write: always the triple's `applianceId`, plus every id in `representsGroups` when present.
  - For each target id, write the value into `sub.values[``${id}:${path}``]` iff that id is in the subscription's selection. Ids present in `representsGroups` but not in the selection are ignored; the consumer subscribed for specific appliances and does not want unsubscribed ids polluting `sub.values`.
  - The existing selection-filtering applies: if the triple's `applianceId` itself is not in the subscription's selection (the server only sent it because `representsGroups` matched), the original key is NOT written — only the represented, subscribed ids get writes.
  - All writes continue to use `Vue.set` (wildcard-compatible) and keep the delta-retention semantic. Unchanged paths on unchanged ids stay at their previously-seen values.
  - Aggregate subscriptions are unaffected — aggregate payloads have no triples and no `representsGroups`.
- Migrate the six floorplan detail dialogs from `registerTransport` + callback to `subscribe(spec)` + `sub.close()`:
  - `src/components/floorplan/dialogs/FloorplanBulbDialog.vue`
  - `src/components/floorplan/dialogs/FloorplanContactDialog.vue`
  - `src/components/floorplan/dialogs/FloorplanDimmerDialog.vue`
  - `src/components/floorplan/dialogs/FloorplanHTDialog.vue`
  - `src/components/floorplan/dialogs/FloorplanMotionDialog.vue`
  - `src/components/floorplan/dialogs/FloorplanPlugDialog.vue`
  Each dialog subscribes for its own appliance id with wildcard paths (`paths: ['**']`), sets up a `$watch` on `sub.ts` that iterates `sub.values` and calls `setPathValue(this.app.state, path, v)` for every `${this.app.id}:${path}` key — no explicit `representsGroups` handling in the consumer, because the library has already projected the group-routed writes onto the dialog's own key space.
- `Floorplan.vue` remains on `registerTransport` — its callback does more than per-triple state writes (power aggregation across group children, `updateSeq++` to trigger canvas redraw) and needs a separate refactor; covered separately.
- No change to aggregate subscriptions, `registerTransport`, `getLatestPath`, `pathCache`, or any server-side contract.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `sse-transport-client`: the "Non-aggregate subscriptions expose reactive per-path values" requirement is extended with `representsGroups` mirroring semantics — when a triple carries `representsGroups: number[]`, the value is mirrored onto each represented id that is in the subscription's selection. Writes to unsubscribed ids are explicitly excluded.

## Impact

- Code:
  - `src/utils/sseClient.ts` — (1) add `representsGroups?: number[]` to `ValueTriple`; (2) compute the selection's id-set once at subscribe time (cache on `SubscriptionRecord`); (3) in `dispatchToSubscription`, for each triple, enumerate `[applianceId, ...representsGroups]`, filter by the cached id-set, and `Vue.set` for each matching target.
  - The 6 dialog files listed above — remove `registerTransport`/`unregisterTransport`, add `this.sub`, `this.unwatchSub`, a `$watch` on `sub.ts` with a per-dialog `applySubValues()` method, and a `close()` in `beforeDestroy`. Remove the `representsGroups` guard from the per-dialog code — it's now the library's job.
- Data flow: no backend changes; the `transport-update` event shape is unchanged. The client already receives `representsGroups` today; only its handling inside `Subscription` is new.
- Consumers: migrates 6 files; unaffected: `Appliances.vue`, `KioskPowerPanel.vue` (both already migrated by the prior change), `Floorplan.vue` (explicitly out of scope), `App.vue`, `sse-connection-indicator`.
- Dependencies: none added. Uses `Vue.set` (already imported in `sseClient.ts`).
- Rollback: revert the commit. Each dialog's diff is independent; the `representsGroups` dispatch logic is additive and backwards-compatible for triples that don't carry the field (i.e. triples from the existing `Appliances.vue` and `KioskPowerPanel` aggregate/detail flows are unaffected).
- Ordering: this change builds on `feature-adopt-sse-subscribe`; that change should be archived first so the main spec already contains the wildcard-aware "Non-aggregate subscriptions expose reactive per-path values" requirement that this delta modifies.
