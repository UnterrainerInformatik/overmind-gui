## MODIFIED Requirements

### Requirement: Register a transport
The `SseClient` SHALL expose a `registerTransport(spec, callback)` method returning `Promise<Handle>`. The Promise SHALL resolve only after the initial `transport-update` event for that transport has been delivered to the callback and applied to the internal cache. The `spec` parameter SHALL have shape `{ minInterval: number, selection: SelectionShape, aggregate?: { op: 'sum' | 'avg' }, minValueDelta?: number }` where `SelectionShape` is either `{ applianceIds: number[], paths: string[] }` or `{ perAppliance: Array<{ applianceId: number, paths: string[] }> }`. The `minValueDelta` field, when defined, SHALL be forwarded verbatim to the server in the `POST /sse/transports/register` body; when `undefined`, the field SHALL be omitted from the body entirely. The client SHALL NOT validate the numeric value — the server is authoritative for what counts as a legal threshold, and any invalid value surfaces through the existing register-error path (HTTP 400 → `record.initialReject` / `sub.error`).

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

#### Scenario: Register with `minValueDelta` forwards the field on the wire
- **WHEN** a component calls `registerTransport({ minInterval: 1000, minValueDelta: 1.0, selection: { applianceIds: [42], paths: ['relays[0].power'] } }, cb)`
- **THEN** the JSON body of the `POST /sse/transports/register` request contains `"minValueDelta": 1` (numeric, not stringified)
- **AND** the same `connectionId`, `minInterval`, and `selection` fields are present as for any other register call

#### Scenario: Register without `minValueDelta` omits the field from the wire body
- **WHEN** a component calls `registerTransport({ minInterval: 1000, selection: { applianceIds: [42], paths: ['relays[0].power'] } }, cb)` (no `minValueDelta` field)
- **THEN** the JSON body of the `POST /sse/transports/register` request does NOT contain a `minValueDelta` key
- **AND** the server's "absent = no suppression" semantics apply

#### Scenario: Register with `minValueDelta: 0` still sends the field
- **WHEN** a component calls `registerTransport({ minInterval: 1000, minValueDelta: 0, selection: {...} }, cb)`
- **THEN** the JSON body contains `"minValueDelta": 0`
- **AND** the client does NOT collapse `0` to absent — the server is authoritative for the inert-vs-omitted distinction

#### Scenario: Server rejects an invalid `minValueDelta`
- **WHEN** a component calls `registerTransport({ minInterval: 1000, minValueDelta: -1, selection: {...} }, cb)`
- **AND** the server responds with HTTP 400 because the value is negative
- **THEN** the client does NOT retry
- **AND** the returned Promise from `registerTransport` rejects with the surfaced error (or, for `subscribe`, `sub.error` becomes a non-null `Error` and `sub.connected` remains `false`)
- **AND** no `transport-update` events are dispatched for this would-be transport

#### Scenario: `minValueDelta` is forwarded on reconnect re-registration
- **WHEN** a subscription was originally created with `minValueDelta: 1.0`
- **AND** the underlying `EventSource` reconnects and triggers re-registration of every active transport
- **THEN** each re-registration `POST /sse/transports/register` body includes the original `minValueDelta` value
- **AND** the per-handle spec is unchanged across reconnects
