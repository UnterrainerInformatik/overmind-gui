## ADDED Requirements

### Requirement: Forced immediate reconnect on wake

The `SseClient` SHALL expose a public `reconnectNow()` method that attempts to restore a live SSE connection immediately, bypassing the reconnect backoff timer. It is intended to be called when a tab or display is re-activated after being backgrounded.

The method SHALL track a last-activity timestamp that is refreshed whenever a `connected` event or a `transport-update` event is received. It SHALL treat a connection as healthy — and do nothing — only when all of the following hold: at least one transport handle is registered, the underlying `EventSource` exists with `readyState === OPEN`, the client is marked connected, and activity has been seen within the last 15 seconds. In every other case it SHALL cancel any pending reconnect timer, close the existing `EventSource` (including one stuck in `CONNECTING`), and open a fresh connection right away.

When there are no registered transport handles, `reconnectNow()` SHALL do nothing.

#### Scenario: Wake with a dead socket forces immediate reconnect

- **WHEN** a transport is registered but the `EventSource` is closed or stuck in `CONNECTING`
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

- **WHEN** no `registerTransport()` has been called (no active handles)
- **AND** `reconnectNow()` is called
- **THEN** no `EventSource` is opened
