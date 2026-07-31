## 1. Core SseClient reconnect support

- [x] 1.1 Add a `lastActivityTs` field to `SseClient` and refresh it in `onConnected` and at the top of `onTransportUpdate`
- [x] 1.2 Add a public `reconnectNow()` method that no-ops when there are no handles, no-ops when the socket is OPEN + connected + active within 15s, and otherwise clears the pending reconnect timer, tears down the existing `EventSource`, and reopens immediately

## 2. App.vue wake wiring

- [x] 2.1 Add an `onWake` handler that no-ops while `document.hidden`, else calls `SseClient.getInstance().reconnectNow()` and re-samples `connected` into `sseConnected`
- [x] 2.2 Register the handler on `document` `visibilitychange` and `window` `focus` in `mounted`
- [x] 2.3 Remove both listeners in `beforeDestroy`

## 3. Verification

- [x] 3.1 Confirm listeners are cleaned up on destroy and a healthy connection is left untouched on quick tab switches (no reconnect churn / red flash)
