## Why

The backend has committed to a transport-based SSE subscription model that replaces the current appliance-level subscription: instead of shipping the full `ApplianceJson` on every state change, the server delivers only the specific scalar paths each view asks for, at a per-subscription interval, with optional server-side `sum` / `avg` aggregation. Under the current `sse-client` capability, the Kiosk lights-sum card receives ~50 full appliance payloads every 3 seconds just to compute one aggregate wattage — this is the root cause of event pileup on tablets. The backend's contract (`../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md`) is ready; this change migrates every GUI use of SSE to that model in a single build.

## What Changes

- **BREAKING** — Replace the entire appliance-level subscription API in `SseClient`: `subscribe(applianceIds, callback, minInterval)` / `unsubscribe(handle)` becomes `registerTransport(spec, callback)` / `unregisterTransport(handle)`.
- **BREAKING** — Replace `update` event dispatch (full `ApplianceJson` per entry) with `transport-update` event dispatch (either a `values` list of `{applianceId, path, value}` triples, or an `aggregate` payload `{op, value, sampleCount, totalCount}`).
- **BREAKING** — Replace `POST /sse/appliances/register` and `POST /sse/appliances/deregister` with `POST /sse/transports/register` and `POST /sse/transports/deregister`. Old endpoints are removed from `store/rest.ts`.
- **BREAKING** — The internal `Map<number, Appliance>` cache keyed by appliance id is replaced by a cache keyed by `(applianceId, path)`. `getLatest(applianceId)` is removed; components hold path-scoped state from callback deliveries instead.
- **Migrate `KioskPowerPanel.vue`** — front of card becomes a server-side `sum` aggregate transport over `relays[0].power` (one number per tick instead of 50 full payloads). Flipping the card registers a second non-aggregate transport for the per-appliance breakdown; flip-back deregisters it.
- **Migrate `Floorplan.vue` compact view** — single `perAppliance` transport at mount, with type-scoped path lists (lights/plugs/dimmers → `relays[*].power`; HT → `temperatures[0].temperature`+`humidities[0].humidity`; contact → `closures[0].open`; motion → `motions[0].motion`; battery-driven → `batteries[0].batteryLevel`). Deregistered on unmount.
- **Migrate Floorplan detail dialogs** — each dialog registers a per-dialog transport for its single appliance on `mounted` with a broad type-appropriate path list at `minInterval: 300–500ms` for live sliders; deregistered on `beforeDestroy`.
- **Migrate `Appliances.vue`** — list view uses a `perAppliance` transport scoped to what the list row renders (power / on-off / battery / `lastTimeOnline`), replacing the current `subscribe(ids, ..., 3000)` call.
- **Replace client-side aggregations with server-side aggregates** where the reduction is pure (`sum` or `avg`). The Kiosk lights-sum card is the driving case; any other card doing the same pattern (summing/averaging a scalar across many appliances in the compact view) gets the same treatment.
- **Do not double-bootstrap from `GET /setup/appliances`** — the `registerTransport` call resolves only after the synchronous initial snapshot arrives, so fetching the same values via REST first races the snapshot. `/setup/appliances` remains the appliance-list bootstrap (names, types, configs), nothing more.
- **Deregister on in-app lifecycle events only** — server cleans up transports when the SSE connection drops, so deregister on dialog close / card flip / route change, not on disconnect.
- **Reconnect re-registration** — on a new `connectionId`, re-register every active transport with the new id (existing reconnect shape in `sseClient.ts`, different body).

## Capabilities

### New Capabilities

- `sse-transport-client`: The singleton SSE transport client service — one `EventSource`, lazy connection, `connectionId` tracking, `registerTransport` / `unregisterTransport`, `transport-update` dispatch demultiplexed by `transportId` supporting both value-list and aggregate payload shapes, path-keyed internal cache, automatic reconnect with re-registration of every active transport.

### Modified Capabilities

- `sse-client`: All requirements **removed**. The appliance-level subscription model (subscribe/unsubscribe, `update` event routing by appliance id, `Map<number, Appliance>` cache, `getLatest(applianceId)`, `POST /sse/appliances/register`+`deregister` endpoints) is replaced by `sse-transport-client`. The capability ceases to exist once this change is archived.
- `sse-connection-indicator`: Unchanged at the requirement level — still reads a `connected` boolean from the SSE client. Implementation will read from the new `sse-transport-client` singleton.

## Impact

- **`src/utils/sseClient.ts`** — substantive rewrite. Public API changes; internal cache is re-keyed; `update` event handler replaced by `transport-update` dispatcher; reconnect flow rebuilds transports instead of subscriptions.
- **`src/store/rest.ts`** — add `sseTransportsRegister` (`/sse/transports/register`) and `sseTransportsDeregister` (`/sse/transports/deregister`); remove `sseAppliancesRegister` and `sseAppliancesDeregister`.
- **`src/views/Appliances.vue`** — migrate `subscribe` call site.
- **`src/components/floorplan/Floorplan.vue`** — migrate compact-view `subscribe` call site to a `perAppliance` transport with type-scoped paths.
- **`src/components/floorplan/dialogs/FloorplanDialogFactory.vue`** plus individual dialogs (`FloorplanPlugDialog`, `FloorplanBulbDialog`, `FloorplanHTDialog`, etc.) — add per-dialog transport registration on `mounted`, deregistration on `beforeDestroy`.
- **`src/components/KioskPowerPanel.vue`** — front-of-card aggregate transport; flip-card detail transport with add/remove on flip.
- **`src/App.vue`** — no behavior change (reads `connected` boolean only).
- **Helpers** — a small `pathsForApplianceType(type)` lookup somewhere in `utils/` for Floorplan / Appliances compact-view path selection.
- **Backend dependency** — `POST /sse/transports/register`, `POST /sse/transports/deregister`, `transport-update` SSE event. Contract in `../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md` (authoritative) and backed by the backend's openspec change `sse-transports` in `java-overmind-server`. GUI build must land only after the backend's dual-stack deployment is live.
- **No changes** to `POST /execute` or any other REST endpoint. `GET /setup/appliances` is unchanged and remains the appliance-list bootstrap.
- **Outstanding pushback to relay to backend before they implement** — drop `pingable` from the top-level listener slots (see `project_sse_transports` memory); it's used once in `AppliancePanel.vue:194` and derivable from `lastTimeOnline` age. Keep `lastTimeOnline` — `overmindUtils.ts:168` derives `onOffState='error'` from its staleness.
