## Context

The `sse-client` capability (introduced by `feature-sse-client`) replaced polling with an SSE stream that delivers the full `ApplianceJson` on every change. For aggregation-heavy views (the Kiosk energy panel sums `state.relays[0].power` across ~50 light appliances every 3 s) this means shipping 50 full payloads to produce one scalar — the exact case that still pileups on tablets.

The backend has committed to a transport model (see `../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md`, backed by the backend's openspec change `sse-transports`) that lets each subscription declare the specific scalar paths it needs, at a per-subscription interval, with optional server-side `sum` / `avg` aggregation. This design covers the GUI-side migration.

Key constraints carrying over from the current client:
- Vue 2.6 / TypeScript, no Composition API.
- Project pinned to Node.js v14.15.0 (build tooling only; `EventSource` is browser-native).
- Existing singleton pattern (`private static instance` + `getInstance()`) — keep.
- `AxiosUtils` singleton for REST — reuse for new register/deregister endpoints.
- Vuex `rest/config` store for base URL — reuse unchanged.
- Current `SseClient` has 4 external subscribe call sites: `Appliances.vue`, `Floorplan.vue`, `KioskPowerPanel.vue`, and (indirectly via `connected`-reading) `App.vue`. That's the full migration blast radius.

## Goals / Non-Goals

**Goals:**
- Single shared SSE connection, same as today. Only the subscription API on top changes.
- Components declare the exact scalar paths they render; payloads shrink accordingly.
- Server-side `sum` / `avg` aggregation for cards that do a pure reduction across appliances (the Kiosk lights-sum is the motivating case; apply where it fits).
- Per-component `registerTransport` / `unregisterTransport` lifecycle that mirrors today's `subscribe` / `unsubscribe` idiom.
- Automatic reconnect re-registers every active transport transparently — same shape as today, different body.
- The `transport-update` initial snapshot replaces first-paint REST bootstrapping of values.

**Non-Goals:**
- Dual-stack on the client. A single build uses transports everywhere. No feature flag, no gradual per-component migration, no fallback to `subscribe`.
- New operators beyond `sum` / `avg`. The backend ships only those in v1; we don't need others for the driving use cases.
- Live discovery of newly added / removed appliances. Treat the appliance list as a page-load snapshot from `GET /setup/appliances`, refreshed on navigation. Revisit only if kiosk behavior bites.
- Vuex integration for the transport registry. Same rationale as the existing `sse-client` — internal bookkeeping, no consumer.
- Rewriting `sse-connection-indicator`. It reads a `connected` boolean; that API stays.

## Decisions

### 1. Modify `sse-client` capability in place — do not add a second capability

`src/utils/sseClient.ts` keeps its name, file path, and singleton shape. The capability's name stays `sse-transport-client` in the new spec (a rename at the capability level) but the file, import path, and class identity are unchanged for callers that haven't migrated their bookkeeping yet — only the public API surface is different.

**Why not a parallel `sse-client-v2` file:** two singletons managing two subscription registries against one `EventSource` would be confusing and serve only a dual-stack client, which is a non-goal. The backend's dual-stack window is for backend coordination, not for GUI-side coexistence.

**Why not keep the `sse-client` capability name for the transport model too:** a capability renamed at the doc level is the right record of what happened — the old appliance-level subscription model is gone, not extended. Keeping the name would obscure the semantic break.

### 2. `registerTransport(spec)` returns `Promise<Handle>` that resolves after the initial snapshot

The backend guarantees the initial `transport-update` event fires synchronously with the register HTTP response. We model that on the client: `await sseClient.registerTransport(...)` resolves only after the first delivery has been applied to the per-handle state. Callers can trust that first paint has values.

```ts
const handle = await sseClient.registerTransport({
  minInterval: 3000,
  selection: { applianceIds: lightIds, paths: ['relays[0].power'] },
  aggregate: { op: 'sum' },
}, ({ aggregate }) => { this.totalW = aggregate.value })
// at this point handle.initial has already been applied to this.totalW
```

**Why not synchronous-handle + callback-first-delivery (today's pattern):** today's `subscribe` returns a handle synchronously and delivers first values through the callback. Callers that want "I have data now" have to guard against pre-data state with `getLatest()` or loading flags. With a Promise that awaits the snapshot, the mental model is simpler and eliminates the split-second window where the component mounted but hasn't received anything yet. The cost is one `await` per call site — all 4 of them already sit in `mounted()` which is async-friendly.

**Edge case:** if the SSE connection isn't yet established when `registerTransport` is called, the Promise waits for `connected`, registers, waits for snapshot, then resolves. This also replaces the current "queue subscription until connectionId arrives" logic — same behavior, Promise-wrapped.

### 3. Path-keyed internal cache

`Map<string, unknown>` keyed by `${applianceId}:${path}` replaces the current `Map<number, Appliance>`. The old `getLatest(applianceId)` method is removed; it has 1 active caller (`KioskPowerPanel.vue:330-335`, used to seed initial values before the SSE callback fires) and that caller is replaced by the initial-snapshot guarantee above.

**Why not keep both caches:** the appliance-keyed cache can't be rebuilt from transport payloads without re-synthesizing partial appliance objects, which reintroduces the fan-out problem we're removing.

**Why expose the path cache at all** (rather than making it purely internal): components that subscribe to many paths across many appliances may find it useful to look up `cache.get('42:relays[0].power')` during render. Keep a `getLatestPath(applianceId, path)` accessor as the public read of the cache. It's optional — callback delivery is still the primary path.

### 4. Callback payload shape mirrors the wire format

```ts
type TransportCallback = (payload: TransportUpdate) => void
type TransportUpdate =
  | { values: Array<{ applianceId: number; path: string; value: unknown }>; ts: string }
  | { aggregate: { op: 'sum' | 'avg'; value: number | null; sampleCount: number; totalCount: number }; ts: string }
```

The callback receives exactly what arrived on the wire for that transport, sans `transportId`. Callers branch on `'values' in payload` vs `'aggregate' in payload`. No normalization, no per-applianceId indexing — if a caller wants to index by id they do it themselves (and for the lights-sum aggregate they don't, since there's no id).

**Why not a discriminated union by `type: 'values' | 'aggregate'`:** the wire format doesn't carry a type discriminator; it uses the presence of `values` vs `aggregate`. Mirror the wire. Adds no client-side overhead.

### 5. Per-component transport ownership with explicit cleanup

Same idiom as today: each component owns its handle(s) and cleans up in `beforeDestroy`. No change to lifecycle pattern. What changes is the timing of deregistration for **dynamic transports** (card flip back, dialog close, route change inside a long-lived view) — those call `unregisterTransport` at the moment of UI state change, not at component destroy.

### 6. `pathsForApplianceType(type, usage)` helper in `src/utils/overmindUtils.ts`

Centralized lookup returning the scalar paths for a given appliance type in a given usage context:
- `compact` — what list/floorplan compact views render
- `detail` — what detail dialogs render

```ts
pathsForApplianceType('HT', 'compact')
// ['temperatures[0].temperature', 'humidities[0].humidity', 'batteries[0].batteryLevel']
pathsForApplianceType('BULB_RGB', 'detail')
// ['relays[0].state', 'relays[0].power', 'rgbws[0].brightness', 'rgbws[0].mode', ...]
```

**Why centralized:** Floorplan, Appliances list, and detail dialogs all need the same per-type path sets. Drift between them would mean one view receives data another doesn't. Single source of truth.

**Why not use `**` everywhere:** the `**` wildcard delivers full state, which is the old model we're moving away from. Only detail dialogs with a `minInterval` of 300–500 ms may reasonably use `**` — cheap for one appliance, expressive for complex controls (RGB picker, dimmer slider).

### 7. KioskPowerPanel: aggregate front, non-aggregate detail

Front of card — one persistent aggregate transport at `minInterval: 3000`:
```ts
{ applianceIds: lightIds, paths: ['relays[0].power'] }, aggregate: { op: 'sum' }
```

Back of card (on flip) — additional non-aggregate transport at `minInterval: 2000`:
```ts
{ applianceIds: lightIds, paths: ['relays[0].power'] }
```

On flip-back, `unregisterTransport(detailHandle)`. Front transport stays. The two transports observe the same `(applianceId, path)` pairs — backend §11.1 confirms they run on fully independent cadences, which is what we want (front card doesn't speed up when detail opens).

For RELAY_DUAL appliances in the same card, use `relays[*].power` instead of `relays[0].power`. The wildcard handles variable relay counts without client-side knowledge.

### 8. Floorplan compact view: one `perAppliance` transport per floor

On `Floorplan.vue` mount, build a single `perAppliance` selection from visible areas:
```ts
selection: {
  perAppliance: visibleAppliances.map(a => ({
    applianceId: a.appId,
    paths: pathsForApplianceType(a.type, 'compact'),
  })),
}
```
`minInterval: 1000`. On unmount, `unregisterTransport`. This replaces the current `subscribe(ids, cb, 500)` and drops the `minInterval` from 500 to 1000 ms — compact view doesn't need faster.

### 9. Floorplan detail dialog: single-appliance transport with `**` escape hatch

On dialog open:
```ts
selection: { perAppliance: [{ applianceId: app.id, paths: ['**'] }] }
minInterval: 300
```
`**` is acceptable here because it's a single appliance and the dialog renders many fields; the payload weight is one appliance's state, not 50.

Alternative (explicit paths from `pathsForApplianceType(type, 'detail')`) is equivalent for render but costs a helper entry per dialog type. Start with `**`; if it becomes a measurable overhead we tighten per-type.

Deregister on `beforeDestroy`. The Floorplan compact-view transport for the same appliance continues running at its slower cadence; they don't interfere.

### 10. Reconnect: sequential re-registration, same as today

On new `connectionId`, iterate the active-transport registry and call `POST /sse/transports/register` for each with the new id. `transportId` rotates on reconnect; the internal registry maps `Handle → currentTransportId`. Sequential is fine — register is cheap and the registry is small (<10 transports in practice across all views).

**Why not a batch endpoint:** it doesn't exist in v1 and the backend treats batching as a potential future optimization. We don't need it.

## Risks / Trade-offs

- **[Risk] Stringly-typed paths — typos silently no-op.** `relays[0].poer` passes registration, never fires, and the UI shows blank — no compile error, no runtime warning.
  **Mitigation:** `pathsForApplianceType` is the single source of truth for common paths. For non-centralized paths (one-off in dialogs), add a minimal TypeScript string-literal union `KnownPath` built from the backend's path table; usage can still take `string` for wildcards but developers get IDE completion for the common paths. Unit-test `pathsForApplianceType` to catch typos in the helper itself.

- **[Risk] Unit-incompatibility in aggregates.** The backend enforces nothing; summing `relays[0].power` (W) with `temperatures[0].temperature` (°C) silently produces garbage.
  **Mitigation:** aggregate transports are registered only through a narrow wrapper that asserts all paths in the selection are unit-compatible (power-only, temperature-only, etc.). This is a lint, not a runtime check — tests cover the known call sites.

- **[Risk] Initial snapshot race if a caller forgets the `await`.** A component that calls `registerTransport(...)` without awaiting will render with stale/empty state for the first paint.
  **Mitigation:** TypeScript return type is `Promise<Handle>` — `await`-less calls light up the "unhandled Promise" lint. The 4 migration call sites are audited manually.

- **[Risk] Kiosk long-lived sessions miss new appliances.** Backend explicitly scoped this out for v1.
  **Mitigation:** none in this change. If it bites in practice, add a scheduled `/setup/appliances` re-fetch to Kiosk views (short client change, no backend work) or push for a backend `appliance-list-changed` event in a follow-up.

- **[Risk] Reconnect storm on flaky WiFi re-registers every transport every reconnect.** N register calls per reconnect × reconnects.
  **Mitigation:** accept — registration is cheap, registry size small. Revisit if load testing shows a problem; a batch-register endpoint is a plausible future optimization.

- **[Trade-off] Dropping `getLatest(applianceId)` removes a convenient "any value I have for this appliance, right now" read.** Callers get per-path values through callbacks; synthesizing a whole appliance object client-side is no longer trivial.
  **Resolution:** this is intended — the whole change is to stop thinking in terms of appliance objects. The 1 current caller (`KioskPowerPanel.vue:330`) is replaced by the synchronous initial snapshot from `registerTransport`.

- **[Trade-off] Per-component transport lifecycle means careful cleanup on dynamic UI events** (card flip, dialog close, route change inside long-lived views). Forgotten `unregisterTransport` calls leak until the SSE connection drops.
  **Mitigation:** audit all dynamic-transport call sites to ensure `unregisterTransport` is paired with the opposite lifecycle event. Unit tests for flip/dialog add-remove.

## Migration Plan

1. **Backend lands `sse-transports`** with dual-stack window (old + new endpoints both serve). We dev against that.
2. **Relay outstanding pushback to backend** before their implementation merges: drop `pingable` top-level listener (keep `lastTimeOnline`). This is a separate back-channel, not a GUI code change.
3. **Land this GUI change in a single build**:
   - Rewrite `src/utils/sseClient.ts` to the new API.
   - Update `store/rest.ts` to add transport endpoints; remove the old appliance-subscription endpoints.
   - Migrate all 4 call sites (`Appliances.vue`, `Floorplan.vue`, `KioskPowerPanel.vue`, dialog components).
   - Add `pathsForApplianceType` helper.
   - Smoke-test kiosk, floorplan, appliance list, detail dialogs in dev.
4. **Deploy to staging**; verify tablet behavior improves (event pileup goes away, first paint still fast).
5. **Deploy to production.**
6. **Rollback path**: revert to the pre-migration build. The backend's dual-stack window keeps the old endpoints alive for one deployment cycle — that's the rollback deadline. After the backend removes the old endpoints, we're past the point of no return.

## Open Questions

1. **`pathsForApplianceType(type, 'detail')` vs blanket `**` in detail dialogs.** Lean: `**` for now (one appliance, cheap), tighten to explicit paths if measurement shows it matters. Confirm before implementation.
2. **Should `registerTransport` also expose a `onChange(payload)` event emitter pattern in addition to the callback arg?** Lean: no — single callback is simpler and matches today's `subscribe` ergonomics. Revisit if a component needs multiple subscribers to the same handle.
3. **Kiosk appliance-list refresh cadence.** Lean: none in this change — rely on navigation / reload to pick up new appliances. Flag for post-migration review.
4. **Removing `EchoGate` entirely.** Today it's still used indirectly by some debounced controls. Out of scope for this change unless it interacts with the snapshot timing — if it doesn't, leave it.
5. **Type-literal union for `KnownPath`.** Lean: add it as a minor quality-of-life improvement alongside the migration; skip if it turns out to conflict with the wildcard forms.
