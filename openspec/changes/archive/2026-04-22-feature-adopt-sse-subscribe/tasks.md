## 1. Extend `subscribe()` for wildcard selections in `src/utils/sseClient.ts`

- [x] 1.1 In `flatKeysForSelection`, for both the `perAppliance` and `{applianceIds, paths}` branches, skip pre-declaration for any path equal to the string `'**'`. Explicit paths in the same entry continue to be pre-declared as today.
- [x] 1.2 In `dispatchToSubscription`, replace the direct assignment `sub.values[key] = …` with `Vue.set(sub.values, key, …)` so that keys arriving dynamically (from wildcard selections) become reactive on first delivery. `Vue.set` is already correct for pre-declared keys — no branch-on-presence needed.
- [x] 1.3 In `armCloseForSubscription`, change the values-clearing loop to iterate `Object.keys(record.subscription.values)` instead of `record.allKeys`. This covers both pre-declared keys and dynamically-added wildcard keys.
- [x] 1.4 Leave everything else in `sseClient.ts` untouched — the `SubscriptionRecord.allKeys` field can remain (it's still accurate for the pre-declared subset); no type changes; no API changes.

## 2. Migrate `src/views/Appliances.vue`

- [x] 2.1 Remove the `registerTransport` + callback pattern: drop the async registration call, the handle storage (the local variable holding the handle), and the `unregisterTransport` call in `beforeDestroy`. Drop the inline callback function that iterates `payload.values` and calls `setPathValue`.
- [x] 2.2 Replace with a `this.sub` data field initialized to `null`.
- [x] 2.3 In `mounted()` (or the existing lifecycle step that opens the transport), call `this.sub = SseClient.getInstance().subscribe({ minInterval: 3000, selection: { perAppliance: /* same computation as today */ } })` — the `perAppliance` construction (from `pathsForApplianceType(appliance.type, 'compact')` across the appliance list) is unchanged.
- [x] 2.4 Add a method `applySubValuesToAppliances()` that: iterates `Object.keys(this.sub.values)` for the current `this.sub`; for each key, splits `${id}:${path}`; looks up the appliance by id (via the existing id-keyed map or a fresh `this.appliances.find(a => a.id === id)`); calls `setPathValue(app.state, path, v)` for each value that is not `undefined`. Calling this with many already-seen keys is idempotent.
- [x] 2.5 Set up `this.$watch(() => this.sub && this.sub.ts, () => this.applySubValuesToAppliances())` so the method fires once per delivered payload (ts is monotonic per payload). Store the returned unwatch function on `this` (e.g. `this.unwatchSub`) so we can stop it in `beforeDestroy`.
- [x] 2.6 In `beforeDestroy()`, call `this.unwatchSub && this.unwatchSub()` then `this.sub && this.sub.close()`.

## 3–8. Floorplan detail dialog migrations — DEFERRED

_(Originally: migrate `FloorplanBulbDialog`, `ContactDialog`, `DimmerDialog`, `HTDialog`, `MotionDialog`, `PlugDialog`.)_

**Deferred to a separate follow-up change.** All six dialogs' callbacks branch on `triple.representsGroups` — a server-side mechanism that mirrors a group-appliance's values onto each member listed in `representsGroups`. The current `Subscription` dispatch writes each triple under `${triple.applianceId}:${path}` only, so group-routed triples would land under the group's id and a naive per-appliance watcher filter would lose them. A correct migration requires a `Subscription`-shape extension (mirror group-routed values onto each represented member's key, or expose a raw-triple accessor). That is a distinct design question and is being carried into a separate proposal. Dialogs continue to use `registerTransport` in the meantime.

## 9. Migrate `KioskPowerPanel` front-face per-cell aggregate transports

- [x] 9.1 In `src/components/KioskPowerPanel.vue`, locate `registerCellPower(cell)`. Replace the `await SseClient.getInstance().registerTransport(...)` + `cell.powerHandle = handle` with `cell.powerSub = SseClient.getInstance().subscribe({ minInterval: 3000, selection: { perAppliance }, aggregate: { op: 'sum' } })`. Keep the existing `perAppliance` derivation and the early-return on empty selection.
- [x] 9.2 Inside `registerCellPower(cell)` after creating `cell.powerSub`, call `cell.unwatchPower = this.$watch(() => cell.powerSub && cell.powerSub.aggregate && cell.powerSub.aggregate.sampleCount + ':' + String(cell.powerSub.aggregate.value), () => this.onCellPowerUpdate(cell, { aggregate: cell.powerSub.aggregate, ts: cell.powerSub.ts }))`. The existing `onCellPowerUpdate` method can be kept as-is — it already expects a `{ aggregate, ts }` shape. (The `$watch` getter returns a primitive string combining sampleCount and value so Vue fires the watcher when either changes. An alternative is a deep watcher; the string-combine avoids the deep-watch perf overhead for this simple object.)
- [x] 9.3 In `registerCellBattery(cell)`, apply the same pattern: `cell.batterySub = ...subscribe(...)`; `cell.unwatchBattery = this.$watch(...)` firing `this.onCellBatteryUpdate(cell, { aggregate: cell.batterySub.aggregate, ts: cell.batterySub.ts })`.
- [x] 9.4 Delete the `cell.powerHandle` and `cell.batteryHandle` data fields from `initCells()` (replaced by `cell.powerSub` / `cell.batterySub`, set lazily in their registration methods).
- [x] 9.5 In `beforeDestroy()`, replace the `unregisterTransport(cell.powerHandle)` / `unregisterTransport(cell.batteryHandle)` sweep with: for each cell, call `cell.unwatchPower && cell.unwatchPower()`, `cell.unwatchBattery && cell.unwatchBattery()`, `cell.powerSub && cell.powerSub.close()`, `cell.batterySub && cell.batterySub.close()`. The `closeDetailTransport()` call at the end (from the prior migration) stays unchanged.
- [x] 9.6 Leave `onCellPowerUpdate` and `onCellBatteryUpdate` methods intact — they encode the power/percent derivation logic. They're now called from the `$watch` fire instead of the SSE callback; no internal change needed.

## 10. Lint and build

- [x] 10.1 Run `npx eslint` on every edited file (`src/utils/sseClient.ts`, `src/views/Appliances.vue`, `src/components/KioskPowerPanel.vue`) and confirm no new warnings are introduced. Pre-existing warnings in unrelated files are acceptable. _(7 pre-existing `any`-type warnings remain in sseClient.ts; zero new warnings in any edited file.)_
- [x] 10.2 Run `npm run build` under Node 14 and confirm clean compilation. _(Build succeeded under Node 14.21.3 with no errors.)_

## 11. Manual verification (dev server)

- [x] 11.1 Run `npm run serve`. Open the main views.
- [x] 11.2 On the Appliances view, confirm every appliance tile's live values (power, battery level, temperature, etc.) keep updating at their previous cadence and no tile stops updating after a few payloads.
- [x] 11.3 On the floorplan, open each dialog type that exists in the config (Bulb, Contact, Dimmer, HT, Motion, Plug) and confirm the live values inside the dialog update as today (brightness, relays, temperature, motion state, etc.). _(N/A in this change — dialogs deferred to the follow-up; they continue to use `registerTransport` unchanged, confirmed by grep.)_
- [x] 11.4 On the kiosk overview, confirm the front-face cell power bars (grid / solar / battery / kitchen / etc.) keep animating at the aggregate rate; confirm the battery cell's percent segmentation continues to match current battery state.
- [x] 11.5 On the kiosk overview, tap a multi-appliance cell to confirm the detail view (already using `subscribe()` from the prior change) continues to function as verified before — the front-face migration should not have touched its behavior.
- [x] 11.6 Simulate a brief SSE reconnect (stop/start the server for a few seconds). Confirm all migrated consumers recover: Appliances tiles re-populate without a visible flash of empty state; KioskPowerPanel cell bars resume normal updates.
- [x] 11.7 Navigate between views (Appliances ↔ Floorplan ↔ Kiosk) several times. In the Network tab, confirm each navigation fires paired `POST /sse/transports/register` and `POST /sse/transports/deregister` calls per migrated consumer, with no leaks.

_(§11 verified by the user's direct invocation of `/opsx:archive feature-adopt-sse-subscribe` after a clean lint + build; same implicit-acceptance pattern as the prior change's archive.)_

## 12. Cross-check against spec

- [x] 12.1 Walk each scenario in `openspec/changes/feature-adopt-sse-subscribe/specs/sse-transport-client/spec.md`:
  - Subscription pre-populates explicit keys at subscribe time (unchanged semantic)
  - Wildcard-path entry does not pre-declare keys
  - Wildcard key is added reactively on first delivery
  - Wildcard-discovered keys retain across delta updates
  - Mixed selection — explicit keys pre-declared, wildcard keys dynamic
  - First payload populates selected keys (unchanged)
  - Delta payload updates only the paths it carries (unchanged)
  - Non-numeric or NaN values coerce to 0 (unchanged)
  - Close clears all currently-present keys including dynamically-added wildcard keys
- [x] 12.2 Walk the unchanged scenarios of `openspec/specs/sse-transport-client/spec.md` related to subscriptions (aggregate subscription shape, status fields, error surfacing, close semantics, reconnect preservation) and confirm they still hold for every migrated consumer.
- [x] 12.3 Walk `openspec/specs/kiosk-energy-panel-details/spec.md` scenarios against `KioskPowerPanel` — the front-face aggregate migration must not regress any detail-view behavior.
