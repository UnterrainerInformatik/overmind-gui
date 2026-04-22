## Context

`SseClient` (`src/utils/sseClient.ts`) today exposes one public surface for live data: `registerTransport(spec, callback) → Promise<Handle>`, paired with `unregisterTransport(handle)` and the out-of-band read `getLatestPath(applianceId, path)`. Each `transport-update` event is demultiplexed by `transportId` and handed to the matching handle's callback as either a `values` payload (a list of `{applianceId, path, value}` triples) or an `aggregate` payload. The client also maintains an internal `pathCache` keyed `${applianceId}:${path}` that is populated from every values payload and read by `getLatestPath`. All of this is unchanged by this proposal.

The `pathCache` already captures, at the client-singleton level, exactly the "latest known value per path" semantic a typical consumer wants. Where consumers go wrong is in:

1. *Rebuilding their own per-payload projection from scratch*, which loses un-delivered paths on delta payloads (the `bug-energy-panel-detail-entries-vanish` failure mode, archived 2026-04-22).
2. *Wiring Vue reactivity by hand* around a callback, usually by copying values into component `data()` on each callback fire.
3. *Managing the lifecycle of an async handle*, including races between in-flight registration and user-driven close (the epoch-pattern fix already in `KioskPowerPanel`).

A second-shape API — "tell me what you want to watch, get back a reactive object scoped to that selection, merge deltas for you, give you a `close()`" — collapses all three to "subscribe once, bind in the template, close on teardown". The `pathCache` design and the new bug-fixed `KioskPowerPanel.detailPathValues` pattern prove the semantics work; this change lifts that pattern into the library as a first-class API next to `registerTransport`.

Consumer landscape at the time of writing:

- `KioskPowerPanel` — two kinds of use. Per-cell aggregate transports for the front-face power bars (small spec, long-lived, one scalar each). Per-click values transport for the detail back-face (short-lived, delta semantics critical). The detail path is the one we migrate here as a proof point. The aggregate path continues to use `registerTransport`.
- `floorplan-live-updates` — uses `registerTransport`, long-lived per-view. Not migrated here.
- `sse-connection-indicator` — observes `sseClient.connected` directly. Unaffected.

Vue version: the project is on Vue 2 (Vuetify 2 single-file components). `Vue.observable()` is the reactivity primitive that works today. Vue 3 would need `reactive()` in its place — the swap is a single-line change at the subscription construction site.

## Goals / Non-Goals

**Goals:**

- Provide a `subscribe(spec) → Subscription` surface on the `SseClient` singleton that returns synchronously and exposes a Vue-reactive object carrying the live, delta-merged state for the spec's selection.
- The `Subscription` is the complete consumer interface: no callbacks, no handle/promise, no manual cache, no per-payload bookkeeping. Template binding and Vue `watch`/`computed` drive all UI updates.
- `close()` is the single terminal method. It is safe to call before the server-side registration has completed; in that case it cancels the in-flight registration upon completion.
- Delta payloads refresh only the paths they carry; previously-seen paths retain their latest-known values for the life of the subscription. No consumer-observable "vanishing" on silent ticks.
- Reconnect of the underlying `EventSource` is transparent to subscription consumers: `sub.values` retains state across reconnects; the server-side transport is re-registered with the new `connectionId` automatically.
- All of the existing `SseClient` API (`registerTransport`, `unregisterTransport`, `getLatestPath`, reconnect, pathCache, `pendingInitialUpdates`) continues to work unchanged. The new surface is strictly additive.
- Migrate `KioskPowerPanel`'s detail transport to `subscribe()` as a proof point that the API is ergonomic in at least one real consumer and that it collapses the component's per-open bookkeeping (`detailPathValues`, `detailPaths`, `detailEpoch`, `detailHandle`, `onDetailUpdate`, `openDetailTransport`'s await-and-gate dance) into a much smaller surface.

**Non-Goals:**

- Not removing or deprecating `registerTransport` / `unregisterTransport`. Both remain first-class. `floorplan-live-updates` and the front-face transports of `KioskPowerPanel` continue to use them without change.
- Not changing any server-side contract: `/sse/appliances`, `/sse/transports/register`, `/sse/transports/deregister`, the `connected` / `transport-update` event shapes, the `pendingInitialUpdates` behavior, the aggregate op set. All unchanged.
- Not adding mid-subscription selection mutation. The spec is immutable after `subscribe()`; to change it, `close()` and `subscribe()` again. Rationale in Decision 3.
- Not introducing a dependency on Vue 3 or a reactivity shim. Vue 2 `Vue.observable()` is the target today; Vue 3 migration is a separate, one-line swap later.
- Not migrating `floorplan-live-updates`, `sse-connection-indicator`, or `KioskPowerPanel`'s front-face aggregate transports. They can migrate in follow-up changes at their own pace.
- Not exposing pause/resume on the subscription. No current consumer has asked for it; adding it would require client+server coordination (the server currently drops transports without backpressure). Close + re-subscribe is the escape hatch.
- Not exposing the internal `transportId` or an equivalent handle. The `Subscription` object itself is the identity.

## Decisions

### Decision 1: `subscribe()` returns the `Subscription` synchronously, not as a `Promise<Subscription>`

The core ergonomic pitch is "I get the data-object". Returning synchronously lets consumers write:

```js
mounted () {
  this.sub = sseClient.subscribe({...})  // Sub is already useful: reactive, bindable, closable.
},
beforeDestroy () {
  this.sub.close()
}
```

…with no `await`, no `.then`, no promise-resolved gate. Server-side registration happens in the background. Until it completes, `sub.connected === false` and `sub.ts === null`; templates bound to `sub.values['key']` read `undefined`, which renders fine. When the first `transport-update` arrives, the reactive fields update and the UI rerenders automatically.

Two small consequences of this choice:

1. **Error surfacing.** A registration failure (server returns 4xx/5xx, `connectionId` never arrives, axios throws) cannot be conveyed by a rejected Promise. Instead, the `Subscription` exposes `sub.error: Error | null`. On failure, `sub.error` is populated, `sub.connected` stays `false`, and `sub.ts` remains `null`. Consumers that care can `watch: { 'sub.error' ... }`. Consumers that do not care see a subscription that simply never populates. This matches how a user of a Vue data source typically wants to behave: show placeholder UI until data arrives, surface errors via a status field if desired.
2. **Close-before-registered race.** If a consumer calls `sub.close()` before the in-flight `POST /sse/transports/register` resolves, the subscription's internal generation token is bumped. When the server response lands, the returned `transportId` is immediately deregistered and no dispatch is wired up. This mirrors the epoch pattern the `KioskPowerPanel` already uses explicitly; it is now hidden inside `subscribe()` so consumers do not re-implement it.

**Alternatives considered:**

- *Return `Promise<Subscription>`*: would match `registerTransport`'s shape, but adds an `await` at every call site purely so the first payload can be guaranteed-present when the Promise resolves. Consumers can wait for the first payload themselves via `watch: { 'sub.ts' }` if they need to, at the cost of a few lines in the one place they care. Most places (e.g. binding `sub.values['k']` in a template) do not care.
- *Return `{ ready: Promise, sub: Subscription }`*: both ergonomics at once. Rejected as API bloat; one shape is enough.

### Decision 2: `sub.values` is a plain object keyed `${applianceId}:${path}` with pre-declared keys, not a `Map`

Vue 2 `Vue.observable()` intercepts get/set on plain-object properties. It does not make `Map` / `Set` instances reactive — access is not intercepted and templates do not rerender on `map.set()`. Using a plain object is the only way to get automatic template reactivity today on this codebase.

Because Vue 2 also does not react to *new* keys being added after observation (`Vue.set()` required for that), we pre-declare every key the subscription will ever use at subscribe time, initialized to `undefined`. This is possible because the selection is immutable (Decision 3): we know the full key set up front.

Flat string keys `${applianceId}:${path}` are chosen over a nested `values[applianceId][path]` shape because:

- They are ergonomic in templates (`sub.values['148:relays[0].power']` is one lookup; the nested form is two).
- They match the existing `SseClient.pathCache` key format, making it trivial to share building blocks internally (e.g. the delta-merge loop looks identical to the existing pathCache update).
- They make `Object.keys(sub.values)` a useful debugging affordance: every key you will ever see is visible from the moment of construction.

For Vue 3 migration later, `reactive(plainObject)` has the same semantics as `Vue.observable(plainObject)` and does support adding new keys reactively, so the pre-declaration step would become optional. It remains harmless and self-documenting.

**Alternatives considered:**

- *`Map<string, number>`*: rejected because Vue 2 templates do not react to mutation.
- *Nested objects keyed by `applianceId` then `path`*: rejected because of two-lookup template ergonomics and divergence from `pathCache`'s flat keys. Internally nothing is gained.
- *Typed wrapper class with getters*: rejected as over-engineering for a data container.

### Decision 3: Selection is immutable after `subscribe()`

The spec (and therefore the set of keys in `sub.values`, or the presence of `sub.aggregate`) is fixed at construction. There is no `sub.addPath`, `sub.setSelection`, or similar. To change it, `sub.close()` and call `subscribe()` again.

Reasons:

- Pre-declared reactive keys (Decision 2) rely on the selection being known at observation time.
- Server-side transports are registered against a fixed selection; changing the selection requires a server round-trip anyway. From the server's point of view, "change the selection" is already "deregister and re-register".
- Mid-life mutation opens a host of ambiguity: what happens to path values from the old selection that are no longer selected? Does `sub.values` shrink? Do pending in-flight payloads get dropped or merged? Every answer is a new failure mode. "Close and re-subscribe" makes all of those questions not arise.
- No consumer today has asked for mid-life mutation. If one ever does, it can be added behind a new method; this decision does not foreclose it.

### Decision 4: `sub.values` vs `sub.aggregate` are mutually exclusive and keyed off `spec.aggregate`

If `spec.aggregate` is absent, the subscription is a values subscription: `sub.values` is the reactive keyed object; `sub.aggregate` is `null`. If `spec.aggregate` is present, the subscription is an aggregate subscription: `sub.aggregate` is the reactive `{ value, sampleCount, totalCount }` object; `sub.values` is `null`.

This mirrors the existing payload shape dichotomy in `registerTransport` and avoids the "both are populated at once" ambiguity that a combined shape would create. Consumers of one kind never touch the other's slot.

The `sub.aggregate` initial state before the first payload is `{ value: null, sampleCount: 0, totalCount: 0 }`. `value: null` is the "no data yet" signal; a genuine zero aggregate would be `value: 0` (still a number). Consumers can template-guard on `sub.aggregate.value === null` or `sub.ts === null`.

### Decision 5: Stale detection uses a per-subscription timer keyed on `2 × minInterval`

`sub.stale` flips to `true` when more than `2 × spec.minInterval` has elapsed since the last payload while `sub.connected === true`. It flips back to `false` on the next payload.

The `2×` factor is the smallest multiplier that tolerates one skipped interval (server load, network jitter, clock skew) without false positives. Larger multipliers defer the "something's wrong" signal past the point where a UI would want it; smaller multipliers fire on routine jitter.

Implementation: on each delivered payload, reset a `setTimeout(() => { sub.stale = true }, 2 * spec.minInterval)`. On `close()`, clear it. On reconnect, clear and reset. When `sub.connected` flips to `false` on disconnect, `sub.stale` is left alone (the UI should show disconnected instead of stale; they are separate signals).

**Alternatives considered:**

- *`Date.now()` check in a shared ticker*: centralizes one interval for all subs, fewer timers. Rejected: the extra complexity of a shared ticker is not worth the saved timers at current consumer counts (single-digit).
- *No stale detection*: punt to consumers. Rejected — every consumer that cares would implement the same thing.

### Decision 6: Delta-merge semantics are identical to the bug-fixed `KioskPowerPanel.detailPathValues`

Per `transport-update`:

- For each triple `{applianceId, path, value}` in `payload.values`, write into `sub.values[``${applianceId}:${path}``]` a number (coerce via `Number.parseFloat` when the value is not already a number; NaN normalizes to `0`).
- Keys not in the payload are left untouched. Their previous value survives until a subsequent payload carries them.
- `sub.ts = payload.ts`.

This is exactly the merge logic specified by `kiosk-energy-panel-details` (Requirement *Detail entries display per-appliance summed power and name*). The library now owns it.

For aggregate payloads:

- `sub.aggregate.value = payload.aggregate.value`
- `sub.aggregate.sampleCount = payload.aggregate.sampleCount`
- `sub.aggregate.totalCount = payload.aggregate.totalCount`
- `sub.ts = payload.ts`

The shared `SseClient.pathCache` continues to be populated by the existing values-path (independent of subscription state), so `getLatestPath()` keeps working as specified. Aggregate payloads continue to bypass the pathCache.

### Decision 7: Reconnect preserves `sub.values` / `sub.aggregate` state

When the `EventSource` reconnects and the client re-registers all transports (existing behavior for `registerTransport` handles), subscription-backed records are re-registered too. The reactive `sub.values` / `sub.aggregate` fields are NOT cleared: they retain their last-known values and will be overwritten as fresh payloads arrive. `sub.connected` briefly flips to `false` during the reconnect window and back to `true` after the new `connected` event lands and the transport is re-registered.

Rationale: the user's expectation for a live dashboard is "keep showing the last values, indicate that we're reconnecting; once data flows again, update". Clearing on disconnect would cause a visual flash of empty state for every transient hiccup.

### Decision 8: `close()` is the only terminal method; calling it twice is a no-op

`close()`:

1. Bumps the subscription's internal generation token (invalidates any in-flight registration and any pending dispatches).
2. If a `transportId` has been assigned, calls `unregisterTransport` on the corresponding handle via the existing client machinery.
3. Sets `sub.connected = false`, `sub.stale = false`, clears the stale timer.
4. Replaces `sub.values` / `sub.aggregate` with a cleared shape: values → a plain object with every selected key mapped to `undefined`; aggregate → `{ value: null, sampleCount: 0, totalCount: 0 }`. Consumers bound to the subscription continue to render (no template errors), now with empty data.
5. Marks the subscription terminal. Subsequent calls to `close()` are no-ops (idempotent).

`sub.ts` is left at its last value (or `null`). No "closed" boolean is exposed separately; `sub.connected === false` and the cleared data are the signal. If we find we need a distinct closed signal later, we can add one; today there is no asymmetry between "closed" and "disconnected with no data" from the consumer's POV.

### Decision 9: Internally, `subscribe()` is implemented on top of existing `registerTransport` machinery

No need to re-implement the register / dispatch / reconnect / pendingInitialUpdates / pathCache plumbing. `subscribe()` builds the subscription's reactive shell, calls `registerTransport(spec, internalCallback)` under the hood, and the `internalCallback` is what performs the delta-merge into `sub.values` / `sub.aggregate`. `close()` calls `unregisterTransport(handle)` on completion (handling the close-before-registered race via the generation token).

This keeps `subscribe()` a thin orchestration layer, avoids duplicating the low-level event routing, and means bug fixes to the low-level machinery (e.g. the `pendingInitialUpdates` buffering) automatically benefit subscriptions too.

## Risks / Trade-offs

- **Two parallel public APIs doing overlapping work** → added surface area to maintain, document, and keep coherent. Mitigated by Decision 9 (subscribe is a wrapper, not a duplicate). Worst case: a future API change needs to propagate through both surfaces; in practice, `subscribe()` is a compositional layer on top of `registerTransport` and most changes will affect only one.
- **Vue 2 lock-in in the library** → `Vue.observable()` is imported in `sseClient.ts`. Vue 3 migration would swap it for `reactive()` at the one construction site. Documented in Decision 2; not a blocker; not a surprise.
- **Pre-declared-keys only** → consumers whose selection changes over time must close and resubscribe. In practice, selection changes *are* "the user picked a different thing to look at", so closing/resubscribing is the natural operation. Documented in Decision 3.
- **Close-before-registered window leaks a server-side transport for one round-trip** → same situation as the existing `registerTransport` + `unregisterTransport` race; already mitigated by deregistering on completion. No regression.
- **Stale detection uses a per-sub timer** → at current scale this is fine. If subscription counts ever grow into the hundreds per page, consolidate into a shared ticker. Not a concern today.
- **`sub.error` is a reactive field, not an exception** → consumers who `.then().catch()` on a missing Promise don't exist because `subscribe()` doesn't return a Promise. Consumers who want error propagation must watch `sub.error`. Documented.
- **Reconnect preserves `sub.values` with potentially-stale data** → the `stale` and `connected` flags exist precisely to let UIs show "these numbers may be old" during reconnect windows. Consumers who want harder guarantees can watch `sub.connected` and replace their templates during disconnect. Documented in Decision 7.
- **Aggregate subscriptions do not populate `pathCache`** → unchanged from today; aggregate payloads never did. Noted here for completeness.
- **Does not retroactively benefit `floorplan-live-updates` or front-face cell transports** → explicit non-goal; they can migrate later. Each migration is independent and small.

## Migration Plan

Client-only. No data migration, no feature flag, no rollout gate, no server changes.

- Ship `subscribe()` + internal machinery + types.
- Migrate `KioskPowerPanel.openDetailTransport` / `closeDetailTransport` / `beforeDestroy` / `onDetailUpdate` / related state to the new API. The component's detail render becomes a `computed` over `sub.values` + `cell.d.appliances` + `this.detailPaths` (the latter is either kept as a small per-open selection cache or folded into the subscription spec reconstruction — see `tasks.md`).
- Manual verify on the dev server the same scenarios the archived `bug-energy-panel-detail-entries-vanish` covered (delta retention, reopen-starts-empty, race on rapid click, destroy cleanup) plus the new-API-specific scenarios (close-before-registered, reconnect preserves values, error surfacing).
- Rollback is a revert of the commit; existing consumers are untouched so revert does not affect them.
