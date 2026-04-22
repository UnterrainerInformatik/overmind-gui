## 1. Types and interfaces in `src/utils/sseClient.ts`

- [x] 1.1 Add an exported `SubscriptionSpec` type equal in shape to the existing `TransportSpec` (`{ minInterval: number; selection: SelectionShape; aggregate?: { op: AggregateOp } }`). Document that it is the spec passed to `subscribe()`.
- [x] 1.2 Add an exported `Subscription` interface describing the returned object. Fields: `values: Record<string, number | undefined> | null`, `aggregate: { value: number | null; sampleCount: number; totalCount: number } | null`, `ts: string | null`, `connected: boolean`, `stale: boolean`, `error: Error | null`, `close(): void`. Note in JSDoc that the object is Vue-reactive.
- [x] 1.3 Add an internal `SubscriptionRecord` type holding: `subscription: Subscription` (the reactive object), `spec: SubscriptionSpec`, `handle: Handle | null`, `transportId: string | null`, `generation: number` (epoch-style invalidation counter), `staleTimer: ReturnType<typeof setTimeout> | null`, `closed: boolean`, `allKeys: string[]` (the pre-declared flat keys for non-aggregate subscriptions; empty for aggregate).

## 2. SseClient subscription internals

- [x] 2.1 Add a private field `subscriptions: Set<SubscriptionRecord>` to `SseClient` that holds every live (non-closed) subscription. Do not mix it with the existing `handles: Map<string, HandleRecord>`; keep the surfaces isolated for clarity.
- [x] 2.2 Add a private method `buildSubscriptionShell(spec: SubscriptionSpec): Subscription` that:
  - Computes the flat key list from `spec.selection` using the same path-expansion rules as `registerTransport` would (values subscriptions only; aggregate subscriptions have an empty key list).
  - Builds a plain object `valuesObj` with one key per flat key, each initialized to `undefined`.
  - Builds a plain object `aggregateObj` equal to `{ value: null, sampleCount: 0, totalCount: 0 }`.
  - Wraps an outer shell object `{ values: spec.aggregate ? null : valuesObj, aggregate: spec.aggregate ? aggregateObj : null, ts: null, connected: false, stale: false, error: null, close: () => { /* filled in after record creation */ } }` with `Vue.observable()` and returns it.
- [x] 2.3 Add a private method `dispatchToSubscription(record: SubscriptionRecord, payload: TransportUpdate): void` that, if `record.closed` is `false`:
  - For values payloads: for each triple `{applianceId, path, value}`, coerce `value` to a number (`Number.parseFloat` if not already numeric; NaN → `0`) and write `record.subscription.values[``${applianceId}:${path}``] = n`.
  - For aggregate payloads: set `record.subscription.aggregate.value`, `.sampleCount`, and `.totalCount` from the payload.
  - Set `record.subscription.ts = payload.ts`, `record.subscription.stale = false`.
  - Reset the stale timer: `clearTimeout(record.staleTimer)` and `record.staleTimer = setTimeout(() => { if (!record.closed) record.subscription.stale = true }, 2 * record.spec.minInterval)`.
- [x] 2.4 Add a private method `armCloseForSubscription(record: SubscriptionRecord): () => void` that returns the `close()` implementation bound to `record`. Behavior:
  - If `record.closed`, return immediately (idempotent).
  - Set `record.closed = true`, increment `record.generation`.
  - Clear the stale timer.
  - If `record.handle !== null`, call `this.unregisterTransport(record.handle)` (reuses existing deregister machinery).
  - Remove `record` from `this.subscriptions`.
  - Reset the reactive shell: set every pre-declared key in `record.subscription.values` (if non-null) to `undefined`; reset `record.subscription.aggregate` (if non-null) to `{ value: null, sampleCount: 0, totalCount: 0 }`; set `connected = false`, `stale = false`. Leave `ts` at its current value (may be `null` if no payload ever arrived).

## 3. Public `subscribe()` method

- [x] 3.1 Add `public subscribe(spec: SubscriptionSpec): Subscription` on `SseClient`.
- [x] 3.2 Inside `subscribe`: build the subscription shell via `buildSubscriptionShell(spec)`; build the `SubscriptionRecord` (handle `null`, transportId `null`, generation `0`, staleTimer `null`, closed `false`, allKeys from the shell construction); add the record to `this.subscriptions`; wire `record.subscription.close = armCloseForSubscription(record)`.
- [x] 3.3 In the same method, capture `const gen = record.generation` and fire-and-forget a call to the existing `registerTransport(spec, cb)` where `cb` is a closure over `record` that:
  - Returns early if `record.closed` or `gen !== record.generation`.
  - Otherwise calls `dispatchToSubscription(record, payload)` and sets `record.subscription.connected = true` on the first delivery.
- [x] 3.4 Chain `.then(handle => { ... })` on the `registerTransport` Promise so that, once the handle resolves:
  - If `record.closed || gen !== record.generation`, call `this.unregisterTransport(handle)` and return (handles the close-before-registered race without exposing it to the consumer).
  - Otherwise set `record.handle = handle` and `record.transportId = handle.id` (or use the client's internal mapping from handle id to transportId — whichever is cleanest; see `SseClient.handles`).
- [x] 3.5 Chain `.catch(err => { ... })` on the `registerTransport` Promise so that if `record.closed === false`, set `record.subscription.error = err instanceof Error ? err : new Error(String(err))`; leave `connected` at `false`.
- [x] 3.6 Return `record.subscription` to the caller (synchronous).

## 4. Reconnect integration

- [x] 4.1 In `onConnected` (existing reconnect entry point that clears `byTransportId` and re-registers every `HandleRecord`), leave the existing `handles` sweep untouched. Subscriptions are already routed through `registerTransport` in §3.3, so their underlying `HandleRecord`s are reconnected by the existing sweep — verify this via a read of the existing code before marking the task done; if the internal subscription record needs to flip `record.subscription.connected = false` during the reconnect window and `= true` after, add that nudge inside the existing `registerOnServer` success path or via a thin wrapper. _(Verified: existing `handles.forEach(record => { record.transportId = null; this.registerOnServer(record) })` in onConnected re-registers the underlying HandleRecord of each subscription. `connected = true` flips back on the next payload via `dispatchToSubscription` — no wrapper needed.)_
- [x] 4.2 Confirm that on disconnect (`this.eventSource.onerror` setting `this._connected = false`), every live subscription's `subscription.connected` flips to `false`. Simplest implementation: iterate `this.subscriptions` in the onerror branch and set `record.subscription.connected = false` (and clear staleness timers). On the subsequent `onConnected`, the register-sweep will naturally restore `true` via the first payload in §3.3. _(Implemented via `markSubscriptionsDisconnected()` called from `onerror`.)_

## 5. KioskPowerPanel detail-view migration

- [x] 5.1 In `src/components/KioskPowerPanel.vue`, replace the `data()` fields `detailApps`, `detailHandle`, `detailEpoch`, `detailPathValues`, `detailPaths` with a single `detailSub: null` field (holds the current `Subscription` or `null`).
- [x] 5.2 Delete the `onDetailUpdate` method. The render is now driven by a computed property (§5.5), not a callback.
- [x] 5.3 Rewrite `openDetailTransport(rowIndex, appIndex)` to: (a) call `this.closeDetailTransport()` to close any existing detail subscription; (b) compute `perAppliance = buildPerAppliance(cell.d.appliances)`; (c) if `perAppliance.length === 0`, return without creating a subscription; (d) otherwise set `this.detailSub = SseClient.getInstance().subscribe({ minInterval: 2000, selection: { perAppliance } })`. No `await`, no handle, no epoch.
- [x] 5.4 Rewrite `closeDetailTransport()` to: if `this.detailSub !== null`, call `this.detailSub.close()` and then `this.detailSub = null`. Nothing else.
- [x] 5.5 Add a computed property `detailApps()` that returns `[]` when `this.detailSub === null` or `this.showDetailsOf === null`. Otherwise: read the clicked cell via `this.appliances[this.showDetailsOf.rowIndex][this.showDetailsOf.appIndex]`; for each appliance `a` in `cell.d.appliances`, compute `powerRaw` by iterating `buildPerAppliance([a])[0]?.paths ?? []` and summing `this.detailSub.values[``${a.id}:${path}``] ?? 0`; build the entry shape `{id, name, powerRaw, power}` (name via `this.nameById.get(a.id) || String(a.id)`, power via `overmindUtils.formatPower(powerRaw, true)`); sort descending by `powerRaw`; filter `|powerRaw| > 1`; cap at 12. The template binding `v-for="(app, i) in detailApps"` stays as-is.
- [x] 5.6 In `beforeDestroy()`, replace the existing detail-transport teardown (epoch bump + `unregisterTransport(detailHandle)` + `detailPathValues`/`detailPaths` reset) with `this.closeDetailTransport()`. The front-face per-cell aggregate transport teardown (the `cell.powerHandle` / `cell.batteryHandle` sweep) stays unchanged.
- [x] 5.7 Scan the component for any remaining references to `detailApps` (as a `data()` field), `detailHandle`, `detailEpoch`, `detailPathValues`, `detailPaths`, `onDetailUpdate`, and remove or update them. The computed `detailApps` replaces all usages of the former data field from the template. _(Verified via grep — zero stale references remain.)_

## 6. Lint and build

- [x] 6.1 Run `npx eslint src/utils/sseClient.ts src/components/KioskPowerPanel.vue` and address any warnings/errors introduced by the edits (pre-existing warnings in other files are acceptable; edited files should introduce none). _(Only 7 pre-existing `any`-type warnings in sseClient.ts remain; no new warnings from either edit.)_
- [x] 6.2 Run `npm run build` (under Node 14) and confirm no TypeScript/Vue compilation regressions. _(Build succeeded under Node 14.21.3 with no errors.)_

## 7. Manual verification (dev server)

- [x] 7.1 Run `npm run serve` and open the kiosk overview. Front-face cell power bars (aggregate transports, unchanged code path) continue to update normally.
- [x] 7.2 Tap a multi-appliance cell, wait at least two `minInterval` ticks (~6 seconds), and confirm that appliances which were rendered on the first update remain visible across subsequent delta updates — same invariant as `bug-energy-panel-detail-entries-vanish`, now satisfied by the library.
- [x] 7.3 Tap back to close, tap the same cell again; confirm the new open starts with an empty render and populates as payloads arrive. Repeat for three cells with different appliance counts.
- [x] 7.4 Rapid click scenario: tap cell A, immediately tap back, immediately tap cell B. Confirm the detail list reflects only cell B (the library's internal close-before-registered race handling replaces the former component-level `detailEpoch`).
- [x] 7.5 Navigate away from the kiosk overview while a detail view is open; confirm (via Network tab XHR) that a `POST /sse/transports/deregister` fires for the detail transport and no console errors surface.
- [x] 7.6 Simulate a brief SSE reconnect (stop/start the server or block the EventSource for a few seconds). Confirm: (a) `detailSub.connected` flips to `false` and the list keeps its last values visible; (b) on reconnect, `detailSub.connected` flips back to `true` and fresh payloads resume updating the list; (c) no flash of empty list during the reconnect window.
- [x] 7.7 Optional smoke: expose `window.__sseClient = SseClient.getInstance()` temporarily and, from the devtools console, create a values subscription with a selection of 1–2 known appliance paths, assign it to a `window` variable, confirm `.values` populates reactively; call `.close()` and confirm `.connected` becomes `false`, the reactive `values` keys become `undefined`, and deregister fires in the Network tab. Revert the `window` exposure before commit.

_(§7 collectively verified by the user's "Tests done. Everything is fine." confirmation on the live kiosk overview after the code edits landed.)_

## 8. Cross-check against spec

- [x] 8.1 Walk each scenario in `openspec/changes/feature-sse-reactive-subscriptions/specs/sse-transport-client/spec.md` against the implementation and manual results:
  - Synchronous return
  - Subscribe starts server registration in the background
  - Subscription pre-populates keys at subscribe time
  - First payload populates selected keys
  - Delta payload updates only the paths it carries
  - Non-numeric or NaN values coerce to 0
  - Aggregate subscription pre-populates
  - Aggregate payload updates reactive aggregate
  - Connected flips true after first registration
  - Stale flips true after 2× minInterval without a payload
  - Stale resets on a fresh payload
  - Failed registration surfaces as `sub.error`
  - Close after successful registration deregisters the server-side transport
  - Close before registration completes cancels in-flight registration
  - Close is idempotent
  - Reconnect preserves per-path values
  - Reconnect resets the staleness timer
- [x] 8.2 Walk each scenario in `openspec/changes/feature-sse-reactive-subscriptions/specs/kiosk-energy-panel-details/spec.md` against the migrated `KioskPowerPanel` detail path: selection construction, close, late-update-after-close, rapid-click supersession, destroy-in-flight.
- [x] 8.3 Walk the unchanged scenarios of `openspec/specs/kiosk-energy-panel-details/spec.md` that this change does not modify (group binding, per-appliance summing, delta retention, idle filter, sort, cap, name fallback, reopen-starts-empty) and confirm they still hold under the migrated implementation.
