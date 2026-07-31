## Why

When a browser tab (or kiosk display) is backgrounded, the SSE socket dies but only recovers via the fixed ~3s backoff timer stacked on the browser's native retry and the 2s UI poll — in the worst case ~10s of red "disconnected" screen after the tab is re-activated. Worse, a socket left stuck in `CONNECTING` is refused a fresh attempt by the existing `ensureConnection()` guard, and a socket that silently died while hidden can still report `OPEN`, so no reconnect is triggered at all. Kiosk views run on tablets and phones where backgrounding is routine, so this is hit constantly.

## What Changes

- Add a public `reconnectNow()` method to the `SseClient` that forces an immediate reconnect: it cancels the pending backoff timer, tears down any dead/`CONNECTING` socket, and reopens right away — while leaving a genuinely healthy connection untouched.
- Track a `lastActivityTs` (updated on the `connected` event and every `transport-update`) so `reconnectNow()` can distinguish a healthy connection from one that reports `OPEN` but has gone silent, and refresh the latter.
- Wire a wake listener in `App.vue` (on `document` `visibilitychange` and `window` `focus`) that calls `reconnectNow()` when the tab becomes visible, so recovery is immediate instead of backoff-bound.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `sse-transport-client`: adds a forced-reconnect method and last-activity tracking to the transport client.
- `sse-connection-indicator`: `App.vue` additionally forces an immediate reconnect on tab re-activation so the red border clears without waiting for the backoff.

## Impact

- `src/lib/sse-client/sseClient.ts` — new `reconnectNow()` public method, `lastActivityTs` field, timestamp updates in `onConnected` / `onTransportUpdate`.
- `src/App.vue` — `visibilitychange` / `focus` wake listener added in `mounted`, removed in `beforeDestroy`.
- No API, dependency, or server changes. Behaviour is purely client-side recovery timing.
