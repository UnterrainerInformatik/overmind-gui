## ADDED Requirements

### Requirement: Singleton SSE client service
The system SHALL provide a singleton `SseClient` class in `src/utils/sseClient.ts` following the existing `getInstance()` pattern. All components SHALL share this single instance for SSE communication.

#### Scenario: Singleton access
- **WHEN** multiple components import and call `SseClient.getInstance()`
- **THEN** they all receive the same instance

### Requirement: Lazy SSE connection
The `SseClient` SHALL NOT open an `EventSource` connection on instantiation. It SHALL open the connection only when the first `subscribe()` call is made.

#### Scenario: No connection before first subscribe
- **WHEN** `SseClient.getInstance()` is called but no `subscribe()` has been called
- **THEN** no `EventSource` connection exists

#### Scenario: Connection opens on first subscribe
- **WHEN** a component calls `subscribe()` for the first time
- **THEN** the client opens an `EventSource` to the SSE endpoint
- **AND** stores the `connectionId` from the server's `connected` event

### Requirement: SSE endpoint URL from store config
The `EventSource` URL SHALL be built from the Vuex `rest/config` server configuration (protocol, address, port), resolving correctly in both dev and production environments.

#### Scenario: Dev environment URL
- **WHEN** the store config is `{ protocol: "http", address: "localhost", port: "8080" }`
- **THEN** the `EventSource` URL is `http://localhost:8080/sse/appliances`

#### Scenario: Production environment URL
- **WHEN** the store config is `{ protocol: "https", address: "overmindserver.unterrainer.info", port: "443" }`
- **THEN** the `EventSource` URL is `https://overmindserver.unterrainer.info:443/sse/appliances`

### Requirement: Subscribe to appliance updates
The `SseClient` SHALL expose a `subscribe(applianceIds, callback, minInterval?)` method that returns a handle string synchronously.

#### Scenario: Basic subscription
- **WHEN** a component calls `subscribe([42, 43], callback, 1000)`
- **THEN** the client returns a unique handle string immediately
- **AND** calls `POST /sse/appliances/register` with `{ connectionId, applianceIds: [42, 43], minInterval: 1000 }` asynchronously
- **AND** stores the returned `subscriptionId` against the handle

#### Scenario: Default minInterval
- **WHEN** a component calls `subscribe([42], callback)` without specifying `minInterval`
- **THEN** the client registers with `minInterval: 1000` (default)

#### Scenario: Subscribe before connected event
- **WHEN** a component calls `subscribe()` before the SSE `connected` event has arrived
- **THEN** the client queues the subscription
- **AND** processes it (calls `POST /register`) when the `connected` event delivers the `connectionId`

### Requirement: Unsubscribe from appliance updates
The `SseClient` SHALL expose an `unsubscribe(handle)` method that removes the local subscription and deregisters from the server.

#### Scenario: Successful unsubscribe
- **WHEN** a component calls `unsubscribe(handle)`
- **THEN** the client removes the subscription from its local map
- **AND** calls `POST /sse/appliances/deregister` with `{ connectionId, subscriptionId }` asynchronously

#### Scenario: Unsubscribe with unknown handle
- **WHEN** a component calls `unsubscribe()` with a handle that does not exist
- **THEN** the client does nothing (no error thrown)

### Requirement: Event routing by appliance ID
When the SSE stream delivers an `update` event, the client SHALL route each appliance entry to the callbacks of subscriptions that include that appliance's ID.

#### Scenario: Single subscription receives matching update
- **WHEN** subscription A watches appliance IDs [42, 43]
- **AND** an `update` event arrives with entries for appliances 42 and 50
- **THEN** subscription A's callback is called with an array containing only appliance 42

#### Scenario: Multiple subscriptions receive the same appliance
- **WHEN** subscription A watches [42] and subscription B watches [42, 43]
- **AND** an `update` event arrives with an entry for appliance 42
- **THEN** both subscription A's and subscription B's callbacks are called with appliance 42

#### Scenario: No matching subscription
- **WHEN** an `update` event arrives with an entry for appliance 99
- **AND** no subscription watches appliance 99
- **THEN** no callback is invoked (the entry is still cached)

### Requirement: Parse state and config before routing
The client SHALL call `overmindUtils.parseState(entry)` and `overmindUtils.parseConfig(entry)` on each entry from an `update` event before routing to callbacks. Callbacks SHALL receive appliance objects with `state` and `config` already parsed from JSON strings to objects.

#### Scenario: Parsed state delivered to callback
- **WHEN** an `update` event arrives with `state: "{\"relays\":[{\"state\":\"ON\"}]}"`
- **THEN** the callback receives an object where `entry.state` is `{ relays: [{ state: "ON" }] }` (parsed object, not a string)

### Requirement: Internal appliance cache
The client SHALL maintain a `Map<number, Appliance>` cache keyed by appliance ID, updated on every incoming `update` event entry.

#### Scenario: Cache updated on event
- **WHEN** an `update` event arrives with an entry for appliance 42
- **THEN** `cache.set(42, entry)` is called (after parsing)

#### Scenario: getLatest returns cached value
- **WHEN** a component calls `getLatest(42)` and appliance 42 has been received previously
- **THEN** the client returns the last-known appliance object

#### Scenario: getLatest returns null for unknown appliance
- **WHEN** a component calls `getLatest(99)` and appliance 99 has never been received
- **THEN** the client returns `null`

### Requirement: Automatic reconnection with re-registration
When the `EventSource` reconnects and delivers a new `connected` event, the client SHALL re-register all active local subscriptions with the new `connectionId`.

#### Scenario: Reconnect re-registers all subscriptions
- **WHEN** the SSE connection drops and reconnects
- **AND** the server sends a new `connected` event with a new `connectionId`
- **THEN** the client updates its stored `connectionId`
- **AND** calls `POST /sse/appliances/register` for each active local subscription using the new `connectionId`
- **AND** updates each subscription's `serverSubscriptionId` with the new response

#### Scenario: Cache survives reconnect
- **WHEN** the SSE connection drops and reconnects
- **THEN** the internal appliance cache is NOT cleared
- **AND** `getLatest()` continues to return previously-cached values until overwritten by fresh data

### Requirement: Connected state property
The client SHALL expose a read-only `connected` boolean property reflecting the current SSE connection state.

#### Scenario: Connected after connected event
- **WHEN** the `EventSource` receives the `connected` event
- **THEN** `sseClient.connected` is `true`

#### Scenario: Disconnected on error
- **WHEN** the `EventSource` fires an `onerror` event
- **THEN** `sseClient.connected` is `false`

### Requirement: Ignore updates for removed subscriptions
The client SHALL silently ignore `update` event entries that match appliance IDs of subscriptions that have already been removed via `unsubscribe()`.

#### Scenario: Stray update after unsubscribe
- **WHEN** a component unsubscribes from appliance 42
- **AND** a stray `update` event for appliance 42 arrives from the server (e.g., initial state from a register that completed just before the deregister)
- **THEN** no callback is invoked for appliance 42
- **AND** the entry is still written to the cache

### Requirement: REST endpoint configuration
The SSE-related endpoint paths SHALL be added to `store/rest.ts` so `AxiosUtils` can resolve them.

#### Scenario: Endpoint config entries
- **WHEN** the SSE client needs to call register or deregister
- **THEN** it uses endpoint paths `sseAppliances` (`/sse/appliances`) and `sseAppliancesRegister` (`/sse/appliances/register`) and `sseAppliancesDeregister` (`/sse/appliances/deregister`) from the store config
