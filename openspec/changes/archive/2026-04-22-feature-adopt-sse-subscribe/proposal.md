## Why

`feature-sse-reactive-subscriptions` (implemented but not yet archived at the time of this proposal) introduced `SseClient.subscribe()` as a second, reactive way to consume SSE transports. Only one real consumer — `KioskPowerPanel`'s detail view — was migrated as a proof point. The rest of the codebase (9 call sites across 8 files) still uses the older `registerTransport(spec, callback)` shape, each re-implementing the same callback-into-state bookkeeping, handle tracking, and async-mounted boilerplate. Six of those call sites (the floorplan detail dialogs) use a wildcard selection (`paths: ['**']`) that today's `subscribe()` cannot accept because it pre-declares reactive keys from the selection at subscribe time.

This proposal (a) extends `subscribe()` with a small, backwards-compatible accommodation for wildcard selections so keys can be added reactively as payloads arrive, and (b) migrates the remaining consumers that map cleanly onto the subscription model to use `subscribe()` + `close()` in place of `registerTransport` + `unregisterTransport` + callback. `Floorplan.vue`'s group-routing/relay-aggregation callback is intentionally not migrated — its callback performs side-effects that do not map onto "reactive object"; it continues to use `registerTransport`. `App.vue`'s connection-status poll is not a transport consumer and is untouched.

## What Changes

- Extend `SseClient.subscribe()` to support selections whose `paths` contain the wildcard `'**'`:
  - For any `(applianceId, paths)` entry whose `paths` array contains `'**'`, keys are NOT pre-declared at subscribe time for that appliance; instead, each `transport-update` triple with that `applianceId` creates (or updates) its key in `sub.values` via `Vue.set`, so the key is reactive from the moment it first arrives.
  - Non-wildcard entries continue to pre-declare their keys as today.
  - Mixed selections (wildcard for some appliances, explicit for others) are supported: each entry is treated independently.
  - All other `Subscription` semantics (delta retention, close semantics, reconnect preservation, staleness, error surfacing) are unchanged.
  - This extension stands on its own and is useful even independent of consumer migration — a future change can use it.
- Migrate the following consumers from `registerTransport(spec, callback)` + `unregisterTransport(handle)` to `subscribe(spec)` + `sub.close()`:
  - `src/views/Appliances.vue` (one multi-appliance values subscription with explicit compact paths).
  - `src/components/KioskPowerPanel.vue` front-face per-cell aggregate transports (`registerCellPower`, `registerCellBattery`) — aggregate spec → reactive `sub.aggregate` + per-cell watchers that compute `cell.power`/`cell.percent`/`cell.sampleCount` from it.
- Do NOT migrate, explicitly:
  - The six floorplan detail dialogs (`FloorplanBulbDialog`, `ContactDialog`, `DimmerDialog`, `HTDialog`, `MotionDialog`, `PlugDialog`). Their existing callbacks use `triple.representsGroups` to accept payloads routed from group appliances (an `applianceId` that is a group, with `representsGroups: [<member_id>, …]` identifying which members the value mirrors onto). The current `Subscription` shape writes each triple under `${triple.applianceId}:${path}` only — group-routed triples land under the group's id, not the member's, and a naive watcher filter by `id === app.id` would lose them. Migrating requires a `Subscription`-shape extension to mirror group-routed values onto each represented member's key (or an equivalent raw-triple accessor); that is a separate, narrower design question deferred to a follow-up change. Dialogs remain on `registerTransport` in the meantime.
  - `src/components/floorplan/Floorplan.vue` — its callback performs group-appliance routing, relay-power aggregation across child appliances, non-power-path mirroring, and a canvas-redraw trigger (`updateSeq++`). The side-effectful per-triple iteration is not a clean fit for a reactive-object model; migrating would require a larger refactor of the component's draw pipeline. Left on `registerTransport`; reconsider in a future dedicated change.
  - `src/App.vue` — only polls `SseClient.getInstance().connected` at 2 Hz; not a transport consumer.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `sse-transport-client`: the existing requirement *"Non-aggregate subscriptions expose reactive per-path values"* is widened so that, for entries whose `paths` array contains the wildcard `'**'`, keys are added reactively on first delivery via `Vue.set` rather than being pre-declared from the selection. A new scenario covers the wildcard case. No other subscription semantics change.

## Impact

- Code:
  - `src/utils/sseClient.ts` — small change inside `flatKeysForSelection` (skip pre-declaration for wildcard-path entries) and `dispatchToSubscription` (use `Vue.set` on value writes so newly-arriving keys become reactive). `close()`'s value-clearing path iterates the actual key set on the reactive object (existing logic, lightly generalized).
  - `src/views/Appliances.vue` — replace `registerTransport`/`unregisterTransport` with `subscribe`/`close`. Replace the callback loop with a watcher on `sub.ts` that iterates `sub.values` and fans values into each appliance's `state` object via the existing `setPathValue` helper.
  - `src/components/KioskPowerPanel.vue` — `registerCellPower` / `registerCellBattery` store the subscription on the cell (`cell.powerSub`, `cell.batterySub`) and set up a `this.$watch` on each subscription's `aggregate.value` / `aggregate.sampleCount` that runs the existing cell-derivation logic. `beforeDestroy` closes each cell's subscriptions (and stops the associated watchers).
- Data flow: no backend changes. The `EventSource`, endpoint paths, payload shapes, `transport-update` routing, `pendingInitialUpdates` buffering, reconnection re-registration, and `pathCache` are all unchanged. The migrated consumers route through the existing `registerTransport` machinery via `subscribe()`'s internal wrapper (established by `feature-sse-reactive-subscriptions`).
- Consumers:
  - Migrated in this change: 2 files, 3 call sites (`Appliances.vue` + `KioskPowerPanel.vue`'s `registerCellPower` and `registerCellBattery`).
  - Not migrated (explicit non-goals): the 6 floorplan detail dialogs (deferred — need `representsGroups` extension to `Subscription`), `Floorplan.vue` (complex callback; separate refactor), `App.vue` (not a transport consumer), anything in `sse-connection-indicator` scope.
- Dependencies: no new packages. Uses `Vue.set` from the existing `Vue` import in `sseClient.ts`.
- Rollback: revert the commit; each migrated consumer's diff is local and independent, and the wildcard handling in `sseClient.ts` is additive (non-wildcard selections behave exactly as before).
- Ordering with `feature-sse-reactive-subscriptions`: this change's delta references a requirement introduced by that change's delta. The recommended archive order is (a) archive `feature-sse-reactive-subscriptions` first (syncs its specs into `openspec/specs/sse-transport-client/spec.md`), then (b) apply and archive this change. If applied in the other order, the delta's MODIFIED requirement header won't match and sync will fail — the fix is to archive the prior change before archiving this one.
