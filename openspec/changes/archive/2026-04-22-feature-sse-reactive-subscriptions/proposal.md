## Why

The `sse-transport-client` capability today is built around a callback API: `registerTransport(spec, cb) → Promise<Handle>`. Each consumer owns the work of reacting to `transport-update` events, merging delta payloads into its own state, wiring that state into Vue reactivity, and deciding when to deregister. This is ergonomically heavy and has already produced one confirmed library-shaped bug (`bug-energy-panel-detail-entries-vanish`, archived 2026-04-22) where treating delta payloads as full snapshots caused appliances to vanish from the energy-panel detail view. The same failure mode is latent in any other consumer doing the same thing.

The core information a typical consumer wants is "a live, Vue-reactive object that shows me the latest known per-path values for my selection, updated in the background, until I close it". Today they have to build that themselves on top of raw messages. A subscription-shaped API that returns exactly that object removes the burden, removes the class of bugs, and shrinks consumer code.

## What Changes

- Add a `subscribe(spec) → Subscription` method on `SseClient` that returns a Vue-reactive subscription object synchronously. The method is additive; `registerTransport` / `unregisterTransport` / `getLatestPath` remain unchanged and untouched in behavior.
- The `Subscription` object exposes Vue-reactive fields shaped by the spec:
  - Non-aggregate specs: `sub.values` — a plain object keyed `${applianceId}:${path}`, pre-populated with `undefined` for every path in the selection at subscribe time, then mutated in place as each `transport-update` arrives. Delta payloads refresh the paths they carry and leave others at their previous latest-known value (the correct default, matching the bug fix in `kiosk-energy-panel-details`).
  - Aggregate specs: `sub.aggregate` — a reactive object `{ value: number | null, sampleCount: number, totalCount: number }`, updated per payload.
  - Always: `sub.ts: string | null` (last payload timestamp), `sub.connected: boolean` (tracks whether the server-side transport is currently registered), `sub.stale: boolean` (true when more than `2 × minInterval` has elapsed since the last payload while connected), `sub.error: Error | null` (populated on registration failure).
- `sub.close()` is the single terminal method. It deregisters the server-side transport, flips `sub.connected = false`, freezes the subscription against further mutation, and is safe to call at any point — including before in-flight registration resolves (in which case the returned handle is unregistered on completion). After close, the subscription's reactive state is cleared so consumers still bound to it see empty/null values rather than stale final state.
- Selection is fixed at `subscribe` time. The shape of `sub.values` (the set of keys) is determined by the spec and does not change for the life of the subscription. To change selection, `close()` the existing subscription and `subscribe(newSpec)`.
- Reconnect behavior is consistent with `registerTransport`: if the underlying `EventSource` reconnects, each live subscription is re-registered on the new connection; `sub.values` retains its previously-seen values until fresh payloads overwrite them.
- Migrate `KioskPowerPanel`'s detail transport (the one consumer affected by the vanishing-bug fix) to `subscribe()` as the proof point. The front-face per-cell aggregate transports stay on `registerTransport` for now — they can migrate later when it suits.
- No changes to the server-side SSE contract, the endpoint shapes, or the `transport-update` payload format.

## Capabilities

### New Capabilities
<!-- None. The new API is an additive surface on the existing sse-transport-client capability. -->

### Modified Capabilities
- `sse-transport-client`: adds a `subscribe(spec) → Subscription` surface as a second way to use the client alongside `registerTransport`, specifies the shape of the returned `Subscription` object, its reactive semantics, its lifecycle (including `close()` and the pre-registration-close race), and its reconnect behavior. The existing callback API is untouched.
- `kiosk-energy-panel-details`: the detail transport's registration requirement is switched from `registerTransport`/callback to `subscribe()`/reactive `Subscription`. The rendered behavior (group binding, idle filter, sort, 12-row cap, name fallback, epoch supersession, close cleanup, destroy cleanup) is unchanged.

## Impact

- Code:
  - `src/utils/sseClient.ts` — add `subscribe()`, `Subscription` interface, internal `SubscriptionRecord` state, reactive object construction via `Vue.observable`, delta-merge logic, stale timer, reconnection hook that re-registers subscriptions. No change to existing `registerTransport`/`unregisterTransport`/`getLatestPath`/cache/reconnect paths.
  - `src/components/KioskPowerPanel.vue` — detail-transport path migrated to `subscribe()`; `detailPathValues` / `detailPaths` local caches replaced by the subscription's reactive `values` object; `openDetailTransport` / `closeDetailTransport` / `beforeDestroy` simplified accordingly. The `onDetailUpdate` callback disappears — rendering is driven by a computed property over `sub.values` + `cell.d.appliances`.
- Data flow: no backend changes, no store changes, no new REST endpoints. The `EventSource` connection and `transport-update` event shape are unchanged.
- Consumers:
  - `KioskPowerPanel` — migrated to the new API in this change.
  - `floorplan-live-updates`, `sse-connection-indicator` — unchanged; continue to use `registerTransport` as today.
- Vue integration: the subscription is wrapped with `Vue.observable()` internally so consumers can bind `sub.values`, `sub.ts`, `sub.connected`, etc. directly in templates and `watch` clauses. Migration to Vue 3 would swap `Vue.observable()` for `reactive()` at the single construction site and is otherwise a no-op for consumers.
- Dependencies: no new npm dependencies. Uses `Vue` already imported by `sseClient.ts` for `Vue.axios`.
- Rollback: reverting the change removes `subscribe()` and returns `KioskPowerPanel`'s detail transport to the callback API. The existing callback API surface and all other consumers are unaffected.
