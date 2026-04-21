## Why

On the kiosk energy panel (`KioskPowerPanel.vue` in `KioskOverview.vue`), the front-face cell of any group whose aggregate transport is registered late in `mounted()` — most visibly the lights cell — sits at `0 W` and never updates when appliances change state. The detail flip-side can show the same symptom (empty back face) when a cell is opened under unlucky timing. Neither of my earlier hypotheses (server-side aggregate limit; sseClient dropping `aggregate` when `values` also present) held up to a live `DEBUG_SSE = true` session: the server correctly emits aggregate-only events for aggregate transports, and the sseClient does not drop aggregates. The real root cause is a registration race in `src/utils/sseClient.ts`.

Evidence, directly from the live log:

```
[SSE] transport-update arrived {transportId: 't-12138e779267', matched: false, valuesCount: null, hasAggregate: true, knownTransportIds: Array(6)}
[SSE] registered on server {handleId: 'sse-9', transportId: 't-12138e779267', selection: {…}}
```

The `[SSE] transport-update arrived` line appears **before** the `[SSE] registered on server` line for the same `transportId`, with `matched: false`. Meaning: the server emitted the transport's initial `transport-update` before the client's `await axios.post('/sse/transports/register')` promise resolved. At that moment `byTransportId` did not yet contain `t-12138e779267`, so `onTransportUpdate` returned at `if (!record) return` without dispatching and without resolving the registration promise. When the axios POST finally resolved and `byTransportId.set(...)` ran, the initial update was already gone. The server doesn't resend it — initial is one-shot.

Two compounding consequences:

1. **`registerTransport`'s Promise never resolves.** `initialResolve(record.handle)` is only called inside `onTransportUpdate` once the first update arrives matched. A dropped-because-unmatched initial update means `await SseClient.getInstance().registerTransport(...)` hangs forever. `KioskPowerPanel.mounted()`'s sequential `await this.registerCellPower(cell)` loop stops iterating on the unlucky cell. In the captured log the hung cell is `sse-9`; every cell the `for` loop would have registered **after** it (lan, lights) never gets a transport at all, `cell.powerHandle` stays `null`, and the cell stays at the `initCells()` default of `0 W` forever.

2. **Detail transport has the same race.** `openDetailTransport` also `await`s `registerTransport`. When the initial detail update loses the race, `detailApps` stays `[]` on the back face. That reads as "the `bug-energy-panel-details` fix regressed" but it didn't — the underlying client-side race has been latent in `sseClient.ts` since the transport refactor. Before the recent server restart, timing on the real server happened to favour the client (POST resolves first → initial update arrives matched). After the restart, the server warms different internal queues and the initial emission outruns the axios round-trip often enough to make the symptom persistent. No push landed between "working" and "broken"; only timing flipped.

The fix is a small, self-contained change in the sseClient: when a `transport-update` arrives with a `transportId` that's not in `byTransportId` yet, **buffer the raw event data** in a `Map<transportId, rawData>` instead of discarding it, and **replay it once `registerOnServer` adds that id to `byTransportId`** — through the same dispatch path that would have fired had the event arrived post-registration (including `initialResolve`). No consumer changes. No wire-protocol changes. Aggregates stay, in the shape the server already emits.

## What Changes

- Add `private pendingInitialUpdates: Map<string, any>` to `SseClient` — one held raw payload per `transportId`, bounded by the number of in-flight registrations.
- Extract the payload-construction step of `onTransportUpdate` (the values/aggregate branching, pathCache population) into a small helper `buildPayloadFromData(data)` that returns the constructed payload or `null` if neither field is present. Use it from both the live-dispatch path and the replay path.
- In `onTransportUpdate`, when `byTransportId.get(transportId)` is `undefined`, store `data` in `pendingInitialUpdates` under its `transportId` and return. (Today this path silently drops the payload.)
- In `registerOnServer`, immediately after `this.byTransportId.set(transportId, record)`, check `pendingInitialUpdates` for `transportId`. If present, remove it, build the payload via the helper, invoke `record.callback(payload)`, and resolve `record.initialResolve(record.handle)` exactly as `onTransportUpdate` would have done at live dispatch.
- Update `sse-transport-client` capability spec: the existing `Transport-update event dispatch` requirement is MODIFIED to document the buffer-and-replay behavior; a new scenario "Initial update arrives before register completes" is added. `Values payload routed by transportId` / `Aggregate payload routed by transportId` / `No matching transport` scenarios are retained with unchanged text — they still apply for the steady-state path.
- No change to `KioskPowerPanel.vue`, no change to any other consumer, no change to the server, no change to the transport wire protocol.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `sse-transport-client`: `Transport-update event dispatch` amended so that an unmatched arrival whose `transportId` belongs to a transport still mid-registration is held in a pending map and delivered once `byTransportId.set(transportId, record)` runs for that transport, with the same callback + `initialResolve` semantics as a natively matched arrival. Unknown-transportId arrivals that do not correspond to any in-flight registration retain today's "silently ignore" behavior.

## Impact

- Code: `src/utils/sseClient.ts` (~15 added lines, plus factoring the payload build into a small helper). No touch to consumers.
- Specs: `openspec/specs/sse-transport-client/spec.md` — one modified requirement block plus one added scenario. `Path-keyed internal cache`, `Aggregate payloads bypass the path-keyed cache`, `Automatic reconnection`, `Connected state property`, etc., are unchanged.
- Behaviour:
  - Cells that previously registered lucky (won the race): unchanged.
  - Cells that previously registered unlucky (lost the race — lan, lights in the captured session): their transport's initial update is now delivered, `registerTransport`'s Promise resolves, `mounted()` continues to every subsequent cell, every cell's `powerHandle` is populated, every cell displays correct aggregate wattage.
  - Detail view: same rescue — the detail transport's initial update is no longer lost to the race.
- Risk surface: narrow. The change only starts retaining data that was already being thrown away. Memory ceiling is bounded by in-flight registrations.
- No server deploys. No user-facing API, store, or protocol change.

## Verification note (server-side tail)

Live verification with `DEBUG_SSE = true` confirmed the fix on the client: the lights cell populates to the server's initial aggregate (e.g. `82 W`) on load instead of sitting at `0 W`, and `[SSE] replaying buffered initial update` fires whenever the race loses. A separate, non-client issue was surfaced during the same verification: the server emits the initial `transport-update` for the lights aggregate (and for some floorplan values transports) but does not re-emit a fresh `transport-update` when individual child appliances change state. Consequences visible without reload: the lights cell holds the initial aggregate instead of updating live, and the floorplan reflects the first light toggle but not subsequent toggles. This change does not attempt to address that — client-side there is nothing to dispatch if nothing arrives — and the server-side re-emission is tracked as a separate follow-up outside this change's scope.
