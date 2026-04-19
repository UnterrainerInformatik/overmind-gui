## ADDED Requirements

### Requirement: Singleton transport client service
The system SHALL provide a singleton `SseClient` class in `src/utils/sseClient.ts` following the existing `getInstance()` pattern. All components SHALL share this single instance for SSE transport communication.

#### Scenario: Singleton access
- **WHEN** multiple components import and call `SseClient.getInstance()`
- **THEN** they all receive the same instance

### Requirement: Lazy SSE connection
The `SseClient` SHALL NOT open an `EventSource` connection on instantiation. It SHALL open the connection only when the first `registerTransport()` call is made.

#### Scenario: No connection before first register
- **WHEN** `SseClient.getInstance()` is called but no `registerTransport()` has been called
- **THEN** no `EventSource` connection exists

#### Scenario: Connection opens on first register
- **WHEN** a component calls `registerTransport()` for the first time
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

### Requirement: Register a transport
The `SseClient` SHALL expose a `registerTransport(spec, callback)` method returning `Promise<Handle>`. The Promise SHALL resolve only after the initial `transport-update` event for that transport has been delivered to the callback and applied to the internal cache. The `spec` parameter SHALL have shape `{ minInterval: number, selection: SelectionShape, aggregate?: { op: 'sum' | 'avg' } }` where `SelectionShape` is either `{ applianceIds: number[], paths: string[] }` or `{ perAppliance: Array<{ applianceId: number, paths: string[] }> }`.

#### Scenario: Register with non-aggregate selection
- **WHEN** a component calls `registerTransport({ minInterval: 1000, selection: { applianceIds: [42], paths: ['relays[0].power'] } }, cb)`
- **THEN** the client calls `POST /sse/transports/register` with that body plus the current `connectionId`
- **AND** stores the returned `transportId` against the handle
- **AND** awaits the initial `transport-update` event for that `transportId`
- **AND** invokes `cb` with the initial values payload
- **AND** writes each `(applianceId, path, value)` triple to the path-keyed cache
- **AND** resolves the Promise with the handle

#### Scenario: Register with aggregate
- **WHEN** a component calls `registerTransport({ minInterval: 3000, selection: {...}, aggregate: { op: 'sum' } }, cb)`
- **THEN** the initial `transport-update` event carries an `aggregate` payload
- **AND** `cb` is invoked with `{ aggregate: {...}, ts }` (no values list)

#### Scenario: Register before connected event
- **WHEN** a component calls `registerTransport()` before the SSE `connected` event has arrived
- **THEN** the client awaits the `connected` event
- **AND** then calls `POST /sse/transports/register` with the received `connectionId`

### Requirement: Unregister a transport
The `SseClient` SHALL expose an `unregisterTransport(handle)` method that deregisters the transport on the server and stops further callback invocations for it.

#### Scenario: Successful unregister
- **WHEN** a component calls `unregisterTransport(handle)`
- **THEN** the client calls `POST /sse/transports/deregister` with `{ connectionId, transportId }`
- **AND** removes the handle from its local registry
- **AND** invokes the callback no further for that handle

#### Scenario: Unregister with unknown handle
- **WHEN** a component calls `unregisterTransport()` with a handle that does not exist
- **THEN** the client does nothing (no error thrown)

### Requirement: Transport-update event dispatch
When the SSE stream delivers a `transport-update` event, the client SHALL route the payload to the callback of the matching `transportId` only, passing the payload through with its `transportId` field stripped.

#### Scenario: Values payload routed by transportId
- **WHEN** handle A has transportId `t-1` and a `transport-update` arrives with `{ transportId: "t-1", values: [...], ts: "..." }`
- **THEN** A's callback is invoked with `{ values: [...], ts: "..." }`

#### Scenario: Aggregate payload routed by transportId
- **WHEN** handle A has transportId `t-2` and a `transport-update` arrives with `{ transportId: "t-2", aggregate: {...}, ts: "..." }`
- **THEN** A's callback is invoked with `{ aggregate: {...}, ts: "..." }`

#### Scenario: No matching transport
- **WHEN** a `transport-update` event arrives with a transportId not in the local registry
- **THEN** no callback is invoked

### Requirement: Path-keyed internal cache
The client SHALL maintain an internal cache keyed by `${applianceId}:${path}` updated from every non-aggregate `transport-update` payload. It SHALL expose a `getLatestPath(applianceId, path)` accessor for components that need to read the cache outside of callback flow.

#### Scenario: Cache updated on values event
- **WHEN** a `transport-update` arrives with `{ values: [{ applianceId: 42, path: 'relays[0].power', value: 12.5 }] }`
- **THEN** `getLatestPath(42, 'relays[0].power')` returns `12.5`

#### Scenario: getLatestPath returns null for unknown path
- **WHEN** a component calls `getLatestPath(99, 'relays[0].power')` and that path has never been received
- **THEN** the client returns `null`

### Requirement: Aggregate payloads bypass the path-keyed cache
Aggregate `transport-update` payloads SHALL NOT mutate the path-keyed cache (they carry no `(applianceId, path)` triples). Components receiving aggregate payloads own the scalar in their own state.

#### Scenario: Aggregate does not populate cache
- **WHEN** a `transport-update` arrives with `{ aggregate: { op: 'sum', value: 847.3, sampleCount: 47, totalCount: 50 } }` for handle A
- **THEN** the path-keyed cache is not mutated
- **AND** A's callback receives the aggregate payload

### Requirement: Automatic reconnection with transport re-registration
When the `EventSource` reconnects and delivers a new `connected` event, the client SHALL re-register every active transport with the new `connectionId`. The local handle identity SHALL be preserved; only the server-side `transportId` rotates.

#### Scenario: Reconnect re-registers all transports
- **WHEN** the SSE connection drops and reconnects
- **AND** the server sends a new `connected` event with a new `connectionId`
- **THEN** the client updates its stored `connectionId`
- **AND** calls `POST /sse/transports/register` for each active handle using the new `connectionId` and the handle's original spec
- **AND** updates each handle's recorded `transportId` with the new response

#### Scenario: Cache survives reconnect
- **WHEN** the SSE connection drops and reconnects
- **THEN** the path-keyed cache is NOT cleared
- **AND** `getLatestPath()` continues to return previously-cached values until overwritten by fresh data

### Requirement: Connected state property
The client SHALL expose a read-only `connected` boolean property reflecting the current SSE connection state, usable by the `sse-connection-indicator`.

#### Scenario: Connected after connected event
- **WHEN** the `EventSource` receives the `connected` event
- **THEN** `sseClient.connected` is `true`

#### Scenario: Disconnected on error
- **WHEN** the `EventSource` fires an `onerror` event
- **THEN** `sseClient.connected` is `false`

### Requirement: Transport REST endpoint configuration
The SSE-related endpoint paths SHALL be configured in `store/rest.ts` so `AxiosUtils` can resolve them.

#### Scenario: Endpoint config entries
- **WHEN** the SSE client needs to register or deregister a transport
- **THEN** it uses endpoint paths `sseAppliances` (`/sse/appliances`), `sseTransportsRegister` (`/sse/transports/register`), and `sseTransportsDeregister` (`/sse/transports/deregister`) from the store config

### Requirement: Ignore transport-update events for unknown handles
The client SHALL silently ignore `transport-update` events whose `transportId` does not match any active handle in the local registry (races with in-flight `unregisterTransport`).

#### Scenario: Stray transport-update after unregister
- **WHEN** a component unregisters a transport
- **AND** a stray `transport-update` for that transport's former `transportId` arrives from the server before deregistration completes
- **THEN** no callback is invoked

### Requirement: pathsForApplianceType helper
The system SHALL provide a `pathsForApplianceType(type, usage)` function in `src/utils/overmindUtils.ts` that returns the scalar paths a view of that usage renders for that appliance type. `usage` SHALL be either `'compact'` (list / floorplan compact view) or `'detail'` (detail dialog). The return value SHALL be an array of path strings suitable for a transport's `paths` list.

#### Scenario: Compact paths for HT appliance
- **WHEN** `pathsForApplianceType('HT', 'compact')` is called
- **THEN** the return value includes `'temperatures[0].temperature'`
- **AND** includes `'humidities[0].humidity'`
- **AND** includes `'batteries[0].batteryLevel'`

#### Scenario: Compact paths for DIMMER appliance
- **WHEN** `pathsForApplianceType('DIMMER', 'compact')` is called
- **THEN** the return value includes `'relays[*].power'`

#### Scenario: Compact paths for MOTION_SENSOR
- **WHEN** `pathsForApplianceType('MOTION_SENSOR', 'compact')` is called
- **THEN** the return value includes `'motions[0].motion'`

#### Scenario: Unknown type returns empty
- **WHEN** `pathsForApplianceType` is called with a type not in the lookup
- **THEN** the return value is an empty array
