## 1. Coordination with backend

- [x] 1.1 Relay pushback to backend: drop `pingable` from the top-level listener slots in the backend's `sse-transports` change (keep `lastTimeOnline`). Reference `AppliancePanel.vue:194` as the single usage site.
- [x] 1.2 Wait for backend's `sse-transports` change to merge and dual-stack deployment to go live.
- [x] 1.3 Manually verify new endpoints respond in dev: `POST /sse/transports/register` returns `{ transportId }` and fires an initial `transport-update` synchronously.

## 2. REST endpoint config

- [x] 2.1 Add `sseTransportsRegister` (`/sse/transports/register`) to `src/store/rest.ts`.
- [x] 2.2 Add `sseTransportsDeregister` (`/sse/transports/deregister`) to `src/store/rest.ts`.
- [x] 2.3 Remove `sseAppliancesRegister` and `sseAppliancesDeregister` entries from `src/store/rest.ts`.

## 3. `pathsForApplianceType` helper

- [x] 3.1 Add `pathsForApplianceType(type: ApplianceType, usage: 'compact' | 'detail'): string[]` to `src/utils/overmindUtils.ts`.
- [x] 3.2 Fill the `compact` lookup for PLUG, RELAY, DIMMER, BULB_RGB, RELAY_DUAL, HT, MOTION_SENSOR, CONTACT_SENSOR per the spec scenarios.
- [x] 3.3 Fill the `detail` lookup for the same types; may use `'**'` as the single entry for dialogs that render many fields (see `design.md` §9).
- [x] 3.4 Return `[]` for unknown types (spec scenario: unknown type returns empty).

## 4. `SseClient` rewrite

- [x] 4.1 Replace `subscribe` / `unsubscribe` / `getLatest` with `registerTransport(spec, callback): Promise<Handle>`, `unregisterTransport(handle): void`, `getLatestPath(applianceId, path): unknown | null`.
- [x] 4.2 Change internal cache from `Map<number, Appliance>` to `Map<string, unknown>` keyed by `${applianceId}:${path}`.
- [x] 4.3 Replace `update` event listener with `transport-update` listener; route payloads by `transportId` to the handle's callback, stripping the `transportId` field before passing.
- [x] 4.4 Implement initial-snapshot awaiting: the `registerTransport` Promise resolves only after the first `transport-update` for its `transportId` has been applied to the cache and delivered to the callback.
- [x] 4.5 Update reconnect logic: on new `connectionId`, iterate the active-handle registry and call `POST /sse/transports/register` for each with the original spec and new `connectionId`; update each handle's recorded `transportId`.
- [x] 4.6 Silently ignore `transport-update` events for transportIds not in the local registry (stray-event race guard).
- [x] 4.7 Remove `parseState` / `parseConfig` calls from `SseClient`; transport payloads carry already-typed scalars.
- [x] 4.8 Preserve `connected: boolean` read-only property (consumed by `sse-connection-indicator`).
- [ ] 4.9 Update or add tests for `SseClient` covering the spec scenarios (singleton, lazy connect, register-resolves-after-snapshot, aggregate bypass of cache, reconnect re-registration, stray-event guard).

## 5. Migrate `src/views/Appliances.vue`

- [x] 5.1 Replace `subscribe(ids, cb, 3000)` with `await registerTransport({ minInterval: 3000, selection: { perAppliance: this.appliances.map(a => ({ applianceId: a.id, paths: pathsForApplianceType(a.type, 'compact') })) } }, cb)` in `mounted()`.
- [x] 5.2 Rewrite the callback to apply values from the `values` payload into the appliance rows (per-path update, not per-appliance replacement).
- [x] 5.3 Replace `beforeDestroy` call with `unregisterTransport(this.sseHandle)`.

## 6. Migrate `src/components/floorplan/Floorplan.vue`

- [x] 6.1 Replace the compact-view `subscribe(ids, cb, 500)` with `await registerTransport({ minInterval: 1000, selection: { perAppliance: visibleAreas.map(...) } }, cb)` in `mounted()`.
- [x] 6.2 Use `pathsForApplianceType(a.type, 'compact')` to build per-area path sets from `this.areas`.
- [x] 6.3 Rewrite the callback to update per-area state by `(applianceId, path)` — the redraw() trigger is per-change, not per-appliance.
- [x] 6.4 Replace `beforeDestroy` call with `unregisterTransport(this.sseHandle)`.

## 7. Migrate Floorplan detail dialogs

- [x] 7.1 In each dialog component (`FloorplanPlugDialog.vue`, `FloorplanBulbDialog.vue`, `FloorplanHTDialog.vue`, etc.), add `mounted()` that calls `await registerTransport({ minInterval: 300, selection: { perAppliance: [{ applianceId: this.app.id, paths: ['**'] }] } }, cb)`.
- [x] 7.2 In each dialog's callback, apply incoming `values` to the local `app` state mirror the dialog reads from.
- [x] 7.3 In each dialog's `beforeDestroy`, call `unregisterTransport(this.sseHandle)`.
- [ ] 7.4 Verify that the existing Floorplan compact-view transport for the same appliance continues running independently (backend §11.1 — no interference expected).

## 8. Migrate `src/components/KioskPowerPanel.vue`

- [x] 8.1 Replace the single `subscribe(ids, cb, 3000)` with an aggregate transport on mount: `await registerTransport({ minInterval: 3000, selection: { applianceIds: lightIds, paths: ['relays[*].power'] }, aggregate: { op: 'sum' } }, cb)`.
- [x] 8.2 Rewrite the callback to set the displayed wattage from `aggregate.value` directly; drop client-side summing (`getPowerByIndexes`, per-appliance power iteration).
- [x] 8.3 On card flip (front → back), register a second non-aggregate transport: `await registerTransport({ minInterval: 2000, selection: { applianceIds: lightIds, paths: ['relays[*].power'] } }, cb)` and store its handle.
- [x] 8.4 On card flip (back → front), `unregisterTransport(detailHandle)`. Front aggregate handle stays.
- [x] 8.5 Render `sampleCount === 0` as the "no contributors" state (empty-sum is `value: 0`, empty-avg is `value: null` — distinguish via `sampleCount`).
- [x] 8.6 Remove any calls to the old `SseClient.getLatest(id)` used to seed initial values — the Promise-awaited snapshot covers first paint.

## 9. Smoke-test in dev

- [ ] 9.1 Appliance list: state updates arrive, rows re-render only on real changes.
- [ ] 9.2 Floorplan compact: lights show live W, HT shows live temp + humidity, contact shows open/closed, motion shows motion, battery levels render.
- [ ] 9.3 Floorplan detail dialog: open a DIMMER dialog, move the brightness slider, confirm it feels live (<500 ms round-trip via the 300 ms transport).
- [ ] 9.4 Kiosk energy panel front: lights-sum displays one number, updates every 3 s; verify via network tab that payload is a single aggregate, not 50 appliance objects.
- [ ] 9.5 Kiosk energy panel flip: flip to detail, confirm per-appliance numbers appear; flip back, confirm detail transport deregisters (watch network).
- [ ] 9.6 Disconnect/reconnect: drop the backend connection (stop/start the server), verify the red-border indicator flips, every active transport re-registers on reconnect, and UI returns to live.
- [ ] 9.7 Tablet test: run on at least one kiosk tablet on production-like WiFi; confirm event pileup is gone.

## 10. Cleanup

- [x] 10.1 Delete any code paths that referenced the removed `subscribe` / `unsubscribe` / `getLatest` APIs after migration is complete.
- [x] 10.2 Keep `overmindUtils.parseState` / `parseConfig` — they're still used elsewhere for REST flows — but remove their invocations from `SseClient`.
- [x] 10.3 Add a closing note to `ai/spec-sse-transports-draft.md` that it has been superseded by the backend brief (`../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md`) and implemented by this openspec change.
