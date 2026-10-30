## ADDED Requirements

### Requirement: Listen to named server events

The `SseClient` SHALL expose a way to register a listener for a named SSE event other than
`connected` and `transport-update` (e.g. `audio-state`), and to remove it again. A listener SHALL
receive the event's parsed JSON payload. Listeners SHALL stay attached across reconnects: every new
`EventSource` the client opens SHALL deliver the named events to all listeners registered at that
time. A payload that is not valid JSON SHALL be dropped without throwing and without affecting other
listeners or transports. Receiving a named event SHALL count as connection activity, like a
`transport-update` event.

#### Scenario: Listener receives a named event
- **WHEN** a component registers a listener for `audio-state`
- **AND** the server sends an `audio-state` event with a JSON payload
- **THEN** the listener is invoked with the parsed payload

#### Scenario: Listener survives reconnect
- **WHEN** a listener for `audio-state` is registered and the SSE connection drops and reconnects
- **AND** the server sends an `audio-state` event on the new connection
- **THEN** the listener is invoked with that event's payload

#### Scenario: Removed listener is not called
- **WHEN** a component removes its `audio-state` listener
- **AND** the server sends an `audio-state` event
- **THEN** that listener is not invoked

#### Scenario: Malformed payload
- **WHEN** the server sends an `audio-state` event whose data is not valid JSON
- **THEN** no listener is invoked for it and no error escapes the client

## MODIFIED Requirements

### Requirement: Lazy SSE connection
The `SseClient` SHALL NOT open an `EventSource` connection on instantiation. It SHALL open the connection only when the first `registerTransport()` call is made or the first named-event listener is registered, whichever happens first. While at least one transport or named-event listener is registered, the client SHALL keep reconnecting after a drop; reconnect scheduling and the wake behaviour of `reconnectNow()` SHALL treat a registered named-event listener the same as a registered transport handle.

#### Scenario: No connection before first register
- **WHEN** `SseClient.getInstance()` is called but no `registerTransport()` has been called and no named-event listener has been registered
- **THEN** no `EventSource` connection exists

#### Scenario: Connection opens on first register
- **WHEN** a component calls `registerTransport()` for the first time
- **THEN** the client opens an `EventSource` to the SSE endpoint
- **AND** stores the `connectionId` from the server's `connected` event

#### Scenario: Connection opens on first named-event listener
- **WHEN** no transport is registered and a component registers a listener for `audio-state`
- **THEN** the client opens an `EventSource` to the SSE endpoint
- **AND** stores the `connectionId` from the server's `connected` event

#### Scenario: Listener alone keeps the connection alive
- **WHEN** only a named-event listener is registered (no transports) and the connection drops
- **THEN** the client reconnects after the reconnect delay
- **AND** `reconnectNow()` on wake reopens a dead connection immediately

### Requirement: Forced immediate reconnect on wake

The `SseClient` SHALL expose a public `reconnectNow()` method that attempts to restore a live SSE connection immediately, bypassing the reconnect backoff timer. It is intended to be called when a tab or display is re-activated after being backgrounded.

The method SHALL track a last-activity timestamp that is refreshed whenever a `connected` event, a `transport-update` event or a named event with a registered listener is received. It SHALL treat a connection as healthy — and do nothing — only when all of the following hold: at least one transport handle or named-event listener is registered, the underlying `EventSource` exists with `readyState === OPEN`, the client is marked connected, and activity has been seen within the last 15 seconds. In every other case it SHALL cancel any pending reconnect timer, close the existing `EventSource` (including one stuck in `CONNECTING`), and open a fresh connection right away.

When there are no registered transport handles and no named-event listeners, `reconnectNow()` SHALL do nothing.

#### Scenario: Wake with a dead socket forces immediate reconnect

- **WHEN** a transport or a named-event listener is registered but the `EventSource` is closed or stuck in `CONNECTING`
- **AND** `reconnectNow()` is called
- **THEN** the client clears any pending reconnect timer
- **AND** closes the existing `EventSource`
- **AND** opens a new `EventSource` immediately without waiting for the reconnect delay

#### Scenario: Wake with a silently stale but OPEN socket forces reconnect

- **WHEN** the `EventSource` reports `readyState === OPEN` and the client is marked connected
- **AND** no `connected` or `transport-update` event has been received for more than 15 seconds
- **AND** `reconnectNow()` is called
- **THEN** the client closes the stale `EventSource` and opens a fresh one immediately

#### Scenario: Wake with a healthy, recently-active connection is a no-op

- **WHEN** the `EventSource` reports `readyState === OPEN`, the client is marked connected, and activity was seen within the last 15 seconds
- **AND** `reconnectNow()` is called
- **THEN** the existing connection is left untouched and no new `EventSource` is opened

#### Scenario: Wake with no registered transports does nothing

- **WHEN** no `registerTransport()` has been called and no named-event listener is registered
- **AND** `reconnectNow()` is called
- **THEN** no `EventSource` is opened

