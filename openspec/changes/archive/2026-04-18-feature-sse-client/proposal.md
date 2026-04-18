## Why

The frontend polls `GET /setup/appliances` every 2–3 seconds from multiple views independently. With ~300 appliances each potentially changing state every second, slow clients (kiosk tablets on weak WiFi) suffer request pileup, stale-state races, and UI flicker. An `EchoGate` mechanism was built to paper over these timing bugs. Replacing polling with a subscription-based SSE stream eliminates the root cause: the client receives only the appliances it needs, at a rate it can handle, pushed by the server.

## What Changes

- **New `SseClient` singleton service** — manages a single `EventSource` connection to the backend, handles subscription registration/deregistration via REST, and routes incoming appliance updates to subscribing components by appliance ID.
- **Replace `setInterval` polling in all views** — Appliances, Floorplan, Kiosk panels, and all components that currently call `appliancesService.getList()` on a timer will switch to `sseClient.subscribe(applianceIds, callback, minInterval)` in `mounted` and `sseClient.unsubscribe(handle)` in `beforeDestroy`.
- **Remove `EchoGate` usage** — the echo-gate pattern (timeout-based guess for matching server echoes) is replaced by a simple "is-dragging" flag in debounced controls (brightness slider, color picker, white picker). The SSE stream delivers the confirmed state directly.
- **Connection status indicator** — a thin red border around the viewport when the SSE connection is down, no border when connected. Visible in kiosk mode without cluttering the UI.
- **Remove `Debouncer` from poll loops** — the `Debouncer` class remains (still used for user-input debouncing on controls) but is no longer wrapped around polling calls since polling is gone.

## Capabilities

### New Capabilities

- `sse-client`: The singleton SSE client service — connection lifecycle, subscription management (subscribe/unsubscribe), event routing by appliance ID, internal cache, and automatic reconnect with re-registration.
- `sse-connection-indicator`: Visual connection-state indicator — red border on the viewport when disconnected, no border when connected.

### Modified Capabilities

_(none — no existing specs are affected at the requirement level)_

## Impact

- **Views affected:** `Appliances.vue`, `Floorplan.vue`, `Plans.vue`, `Switches.vue`, `WindowContacts.vue`, `KioskCamera.vue`, and all Kiosk panel components that poll appliance state.
- **Components affected:** `DebouncedBrightnessSlider.vue`, `DebouncedRgbwPicker.vue`, `DebouncedBwPicker.vue`, `DebouncedOnOffButton.vue` — EchoGate removal.
- **Utils affected:** `echoGate.ts` can be deleted once migration is complete. `debouncer.ts` stays but its usage shrinks.
- **New dependency on backend SSE endpoint:** `GET /sse/appliances` + `POST /sse/appliances/register` + `DELETE /sse/appliances/register/{id}` (see `ai/spec-sse-draft.md`).
- **No breaking changes to REST:** `POST /execute` and all other REST endpoints remain unchanged.
- **App.vue or layout component:** will mount the connection-status border.
