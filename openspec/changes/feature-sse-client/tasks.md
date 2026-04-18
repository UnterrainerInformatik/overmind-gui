## 1. Configuration

- [x] 1.1 Add SSE endpoint paths to `src/store/rest.ts`: `sseAppliances: '/sse/appliances'`, `sseAppliancesRegister: '/sse/appliances/register'`, `sseAppliancesDeregister: '/sse/appliances/deregister'`

## 2. SseClient core

- [x] 2.1 Create `src/utils/sseClient.ts` with singleton `getInstance()` pattern, `LocalSubscription` interface, private fields (`connectionId`, `subscriptions` Map, `cache` Map, `connected` boolean)
- [x] 2.2 Implement `ensureConnection()` — lazy `EventSource` creation, build URL from `rest/config` server config, listen for `connected` / `update` / `error` events
- [x] 2.3 Implement `connected` event handler — store `connectionId`, process any queued subscriptions (pending registrations that arrived before `connected`)
- [x] 2.4 Implement `update` event handler — parse JSON, call `overmindUtils.parseState` and `overmindUtils.parseConfig` on each entry, update cache, route entries to matching subscription callbacks by appliance ID
- [x] 2.5 Implement `error` event handler — set `connected = false`
- [x] 2.6 Implement `subscribe(applianceIds, callback, minInterval?)` — generate handle, store local subscription, call `ensureConnection()`, fire async `POST /sse/appliances/register` (or queue if no connectionId yet), return handle synchronously
- [x] 2.7 Implement `unsubscribe(handle)` — remove from local map, fire async `POST /sse/appliances/deregister` with `{ connectionId, subscriptionId }`, no-op if handle unknown
- [x] 2.8 Implement `getLatest(applianceId)` — return from cache or `null`
- [x] 2.9 Implement reconnection — on new `connected` event (new `connectionId`), re-register all active subscriptions, update their `serverSubscriptionId`

## 3. Connection indicator

- [x] 3.1 In `App.vue`, add `sseConnected` data property (default `true`), `setInterval` in `mounted` polling `SseClient.getInstance().connected` every 2000ms, `clearInterval` in `beforeDestroy`
- [x] 3.2 In `App.vue` template, bind `:class="{ 'sse-disconnected': !sseConnected }"` on the `<v-app>` element
- [x] 3.3 In `App.vue` styles, add `.v-app.sse-disconnected { border: 3px solid red; }` overriding the existing `.v-app` border

## 4. Migrate views from polling to SSE

- [x] 4.1 `src/views/Appliances.vue` — remove `setInterval`/`clearInterval`/`Debouncer`, subscribe to appliance IDs in `mounted`, unsubscribe in `beforeDestroy`, update `this.appliances` array in callback
- [x] 4.2 `src/components/floorplan/Floorplan.vue` — remove `setInterval`/`clearInterval`/`Debouncer`, subscribe to relevant appliance IDs in `mounted`, unsubscribe in `beforeDestroy`, update `appMap` in callback
- [x] 4.3 `src/components/KioskPowerPanel.vue` — remove `setInterval`/`clearInterval`/`Debouncer`, subscribe to power-relevant appliance IDs in `mounted`, unsubscribe in `beforeDestroy`

## 5. Migrate debounced controls from EchoGate to SSE

- [x] 5.1 `src/components/input/DebouncedBrightnessSlider.vue` — remove `EchoGate` import and instance, remove the polling `setInterval`, receive state updates via parent's SSE subscription, replace gate logic with a simple `isDragging` flag that suppresses incoming updates during user interaction
- [x] 5.2 `src/components/input/DebouncedRgbwPicker.vue` — same pattern: remove `EchoGate`, remove polling `setInterval`, use `isDragging` flag
- [x] 5.3 `src/components/input/DebouncedBwPicker.vue` — same pattern: remove `EchoGate`, remove polling `setInterval`, use `isDragging` flag
- [x] 5.4 `src/components/input/DebouncedOnOffButton.vue` — remove `EchoGate`, simplify to fire-and-wait-for-SSE-confirmation

## 6. Cleanup

- [x] 6.1 Delete `src/utils/echoGate.ts` after all EchoGate consumers are migrated
- [x] 6.2 Remove unused `Debouncer` imports from migrated views (keep `debouncer.ts` itself — still used by controls for user-input debouncing)
