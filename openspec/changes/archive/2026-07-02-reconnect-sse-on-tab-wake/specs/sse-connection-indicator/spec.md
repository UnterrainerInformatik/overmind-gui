## ADDED Requirements

### Requirement: Force reconnect on tab re-activation

`App.vue` SHALL force an immediate SSE reconnect whenever the tab or display becomes visible again, so the red disconnected border clears without waiting for the reconnect backoff. It SHALL register a single wake handler on both the `document` `visibilitychange` event and the `window` `focus` event in `mounted`, and SHALL remove both listeners in `beforeDestroy`.

The handler SHALL do nothing while the document is hidden. When the document is visible it SHALL call `SseClient.getInstance().reconnectNow()` and then re-sample `SseClient.getInstance().connected` into the local `sseConnected` property.

#### Scenario: Tab becomes visible triggers immediate reconnect

- **WHEN** `App.vue` is mounted and the tab transitions from hidden to visible (`visibilitychange` fires with `document.hidden === false`)
- **THEN** `SseClient.getInstance().reconnectNow()` is called
- **AND** `sseConnected` is updated from `SseClient.getInstance().connected`

#### Scenario: Window focus triggers immediate reconnect

- **WHEN** `App.vue` is mounted and the window receives `focus` while the document is visible
- **THEN** `SseClient.getInstance().reconnectNow()` is called

#### Scenario: Hidden document is ignored

- **WHEN** the wake handler runs while `document.hidden` is `true`
- **THEN** `reconnectNow()` is NOT called

#### Scenario: Wake listeners cleaned up on destroy

- **WHEN** `App.vue` is destroyed
- **THEN** both the `visibilitychange` and `focus` listeners are removed
