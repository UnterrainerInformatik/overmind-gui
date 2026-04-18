## ADDED Requirements

### Requirement: Red border when SSE is disconnected
The application SHALL display a 3px solid red border around the entire viewport when the SSE connection is not established. No border (default styling) SHALL be shown when connected.

#### Scenario: Disconnected state shows red border
- **WHEN** `SseClient.getInstance().connected` is `false`
- **THEN** the `.v-app` element has the CSS class `sse-disconnected`
- **AND** the element renders with a `border: 3px solid red`

#### Scenario: Connected state shows no red border
- **WHEN** `SseClient.getInstance().connected` is `true`
- **THEN** the `.v-app` element does NOT have the CSS class `sse-disconnected`
- **AND** the element renders with the default border (`1px solid rgba(0,0,0,0.12)`)

#### Scenario: Border visible in kiosk mode
- **WHEN** the app is in kiosk mode (`kioskMode` is `true`)
- **AND** the SSE connection is down
- **THEN** the red border is still visible

### Requirement: Connection state polling in App.vue
`App.vue` SHALL poll `SseClient.getInstance().connected` every 2 seconds via `setInterval` to update a local reactive data property that drives the CSS class binding.

#### Scenario: State check interval
- **WHEN** `App.vue` is mounted
- **THEN** a `setInterval` is created that reads `SseClient.getInstance().connected` every 2000ms
- **AND** updates a local `sseConnected` data property accordingly

#### Scenario: Interval cleanup on destroy
- **WHEN** `App.vue` is destroyed
- **THEN** the `setInterval` is cleared

### Requirement: Indicator responds to reconnection
The red border SHALL disappear within 2 seconds of the SSE connection being re-established (bounded by the polling interval).

#### Scenario: Reconnect clears border
- **WHEN** the SSE connection was down (red border visible)
- **AND** the connection re-establishes (`connected` becomes `true`)
- **THEN** within 2 seconds the `sse-disconnected` class is removed and the red border disappears
