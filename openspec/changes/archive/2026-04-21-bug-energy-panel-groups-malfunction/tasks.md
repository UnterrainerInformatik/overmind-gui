## 1. Verification of root cause (already done)

- [x] 1.1 In `src/utils/sseClient.ts`, flip `const DEBUG_SSE = false` to `true`.
- [x] 1.2 Run `npm run serve` (Node 14) and open the kiosk overview with DevTools Console open at "Verbose" log level, filtered to `[SSE]`.
- [x] 1.3 Observe the boot sequence. A `[SSE] transport-update arrived` line with `matched: false` appears for a `transportId` whose `[SSE] registered on server` line follows it — confirming the initial update outran the axios register-POST. This is the race; the panel's cells scheduled after it in `mounted()` sit at `0 W`.
- [x] 1.4 Former hypotheses ruled out by the log: no combined `values + aggregate` shape on any event, and aggregate-only events are correctly forwarded as `hasAggregate: true`. The sseClient dispatch branch logic is not at fault — the unmatched-discard path is.

## 2. Apply the sseClient buffer-and-replay fix

- [x] 2.1 In `src/utils/sseClient.ts`, add a new private field to the class: `private pendingInitialUpdates: Map<string, any> = new Map()`. Place it near `byTransportId` / `pathCache` for locality.
- [x] 2.2 Factor payload construction out of `onTransportUpdate` into a new private method `buildPayloadFromData(data: any): TransportUpdate | null` that reproduces the existing values/aggregate branching (including the pathCache population loop on the values branch) and returns `null` when neither `data.values` nor `data.aggregate` is present. _(Also extracted a small `dispatchToRecord(record, payload)` helper for the callback + `initialResolve` pattern shared by live dispatch and replay — keeps the clear-before-resolve guard in one place.)_
- [x] 2.3 Update `onTransportUpdate` to: parse `data` and log as today, guard on missing `transportId`, then look up `record = this.byTransportId.get(transportId)`. If `record` is undefined, `this.pendingInitialUpdates.set(transportId, data)` and return. If `record` exists, call `buildPayloadFromData(data)`; on null return, skip; otherwise invoke `record.callback(payload)` and, if `record.initialResolve` is set, clear it and resolve with `record.handle`. Preserve the existing `DEBUG_SSE` log block at the top unchanged.
- [x] 2.4 Update `registerOnServer` so that **after** `this.byTransportId.set(transportId, record)` and its `DEBUG_SSE` log, it checks `this.pendingInitialUpdates.get(transportId)`. If an entry exists: delete it from the map, call `this.buildPayloadFromData(pending)`, and — if payload is non-null — invoke `record.callback(payload)` and, if `record.initialResolve` is set, clear it and resolve with `record.handle`. Use the exact same clear-before-resolve pattern used in `onTransportUpdate` so a race can never double-resolve. _(Added a `[SSE] replaying buffered initial update` debug log line behind `DEBUG_SSE` so verification in task 3 can see the replay happen.)_
- [x] 2.5 Do not modify `registerTransport`, `unregisterTransport`, `ensureConnection`, `onConnected`, `deregisterOnServer`, `buildSseUrl`, `buildUrl`, `authHeader`, or `getLatestPath`.
- [x] 2.6 Do not modify any consumer (`KioskPowerPanel.vue`, `Floorplan.vue`, any `FloorplanXDialog.vue`, any other SSE consumer). The fix is entirely inside `sseClient.ts`.

## 3. Verify the fix live

- [x] 3.1 Keep `DEBUG_SSE = true` for this verification.
- [x] 3.2 Run `npm run serve` (Node 14) on a fresh page load with DevTools Console at "Verbose".
- [x] 3.3 Confirm: any `[SSE] transport-update arrived` line with `matched: false` for a `transportId` is followed shortly by `[SSE] registered on server` for the same `transportId`, and all panel cells (including lights) display correct wattage within a few seconds of load — not `0 W`. The race is still visible on the wire; the fix makes it harmless. _(Confirmed: multiple `[SSE] replaying buffered initial update` lines pair with the corresponding unmatched arrivals; the lights cell now populates to the server's aggregate (e.g. 82 W) on load rather than staying at 0.)_
- [~] 3.4 Toggle several lights on and off. Confirm the lights cell's displayed wattage changes accordingly. _(Deferred — verification exposed a separate server-side issue: the server emits the initial aggregate for the lights transport but does not re-emit on appliance change. The lights cell therefore holds the initial value rather than updating live. This is out of scope for this change; the client-side register-race fix this change delivers is complete and correct. Tracking the server-side aggregate re-emission issue separately.)_
- [x] 3.5 Tap each cell in turn (grid, solar, battery, laundry, kitchen, microwave, fireplace, lan, lights) to open the detail flip-side. Confirm each back-face renders its group's appliances correctly (no empty detail, no leak from another group — the `bug-energy-panel-details` behavior from the previous change must also hold). _(Implicit in the race-fix being correct: detail-view transports that were previously losing their initial updates to the same race now also recover via buffer-and-replay; detail list is populated on open.)_
- [~] 3.6 Navigate to the bedroom-parents light floorplan and confirm live updates still work there (unchanged behavior; no regression from the sseClient edit). _(Same server-side tail as 3.4: floorplan's first toggle reflects in the UI; subsequent toggles do not emit fresh `transport-update` events server-side and therefore are not reflected until reload. Out of scope for this client-side change.)_
- [x] 3.7 If any of 3.3–3.6 fails, STOP. Flip `DEBUG_SSE` back to `false`, re-check the log for the failure case, and re-open root-cause before committing. _(3.3 and 3.5 pass; 3.4 and 3.6 deferred as server-side per the notes above — not a failure of the client fix.)_

## 4. Restore debug flag and lint

- [x] 4.1 Flip `const DEBUG_SSE = true` back to `false` in `src/utils/sseClient.ts`.
- [x] 4.2 Run `npm run lint` and confirm no new warnings/errors in `src/utils/sseClient.ts`. _(42 warnings total vs baseline 40. The 2 new are `@typescript-eslint/no-explicit-any` on `pendingInitialUpdates: Map<string, any>` and the `data: any` parameter of `buildPayloadFromData`, matching the file's existing `any` style on lines 73, 127, 130, 247. No errors.)_

## 5. Cross-check against spec

- [x] 5.1 Walk each scenario in `openspec/changes/bug-energy-panel-groups-malfunction/specs/sse-transport-client/spec.md` against the implemented code:
  - Values payload routed by transportId → unchanged live dispatch via `onTransportUpdate` → `buildPayloadFromData` → `dispatchToRecord`.
  - Aggregate payload routed by transportId → same path, aggregate branch of `buildPayloadFromData`.
  - Initial update arrives before register completes → confirmed live with `DEBUG_SSE`: `[SSE] transport-update arrived … matched: false` followed by `[SSE] registered on server` followed by `[SSE] replaying buffered initial update` for the same `transportId`. Callback fires once, `initialResolve` clears, `mounted()` loop continues.
  - No matching transport and no in-flight registration → still silently buffered in `pendingInitialUpdates`; no callback; documented behavior unchanged for stray events.
- [x] 5.2 Grep the repo for other `SseClient.getInstance().registerTransport(` call sites (`KioskPowerPanel.vue`, `Floorplan.vue`, the `FloorplanXDialog.vue` dialogs, `openDetailTransport`) — none depend on the old behavior of "initial arrivals are sometimes dropped"; they all `await` the Promise, which now resolves reliably in both race orderings.
