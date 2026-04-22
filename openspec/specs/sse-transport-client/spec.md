# sse-transport-client

## Purpose

The singleton SSE transport client service that powers live UI updates in the overmind GUI. One `EventSource` per app session, lazy connection on first `registerTransport()` call, `connectionId` tracking, per-path scalar subscriptions with optional server-side `sum`/`avg` aggregates, `transport-update` dispatch demultiplexed by `transportId` supporting both value-list and aggregate payload shapes, path-keyed internal cache, automatic reconnect with re-registration of every active transport. Implemented in `src/utils/sseClient.ts`. Replaces the former `sse-client` capability (appliance-level subscription model).

## Requirements

### Requirement: Singleton transport client service

The system SHALL provide a portable, instantiable `SseClient` class in `src/lib/sse-client/sseClient.ts`, and SHALL expose a module-level singleton of it from `src/utils/sseClient.ts` via a `SseClient.getInstance()` static accessor. The library class SHALL have no hard-coded dependency on Vue, axios, or a Vuex store; instead, it SHALL accept all framework-specific and project-specific integration points through its constructor-supplied `SseClientConfig` object (URL builders, auth header provider, HTTP POST adapter, reactivity adapter, debug flag, reconnect delay). The overmind-gui wrapper at `src/utils/sseClient.ts` SHALL construct exactly one instance using this project's Vue 2 reactivity, its `Vue.axios` HTTP client, and its Vuex `rest/config` / `keycloak/token` getters, and SHALL re-export that instance as the singleton that every component consumes via `SseClient.getInstance()`. The wrapper SHALL also re-export the public type surface of the library (e.g. `Subscription`, `SubscriptionSpec`, `TransportSpec`, `ValueTriple`, `Handle`) so existing consumer imports from `@/utils/sseClient` continue to resolve.

#### Scenario: Singleton access

- **WHEN** multiple components import and call `SseClient.getInstance()` from `@/utils/sseClient`
- **THEN** they all receive the same instance
- **AND** that instance is an instance of the core class defined in `src/lib/sse-client/sseClient.ts`

#### Scenario: Library class is instantiable independently of the wrapper

- **WHEN** a consumer imports the core class from `@/lib/sse-client` and calls `new SseClient(config)` with a valid `SseClientConfig`
- **THEN** the returned object is a fully-functional `SseClient` that honors every requirement of this capability when exercised through its public methods
- **AND** no reference to `Vue`, `axios`, or the Vuex store is required at the call site

#### Scenario: Library has no hard framework imports

- **WHEN** the files under `src/lib/sse-client/` are examined for top-level `import` statements
- **THEN** no file imports from `vue`, `axios`, `@/store`, `@/utils/objectUtils`, or any other project-specific module
- **AND** the only imports permitted are from TypeScript standard lib types and from sibling files inside `src/lib/sse-client/`

#### Scenario: Wrapper provides overmind-gui-specific integration

- **WHEN** `src/utils/sseClient.ts` constructs its singleton
- **THEN** the `SseClientConfig` it passes uses `Vue.axios.post` as its `httpPost` adapter
- **AND** its `buildSseUrl` / `buildRegisterUrl` / `buildDeregisterUrl` read from Vuex `rest/config` getters
- **AND** its `authHeader` reads from the Vuex `keycloak/token` getter
- **AND** its `reactivity` is the Vue 2 adapter produced by `createVue2Adapter(Vue)` from `@/lib/sse-client/reactivity`

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

When the SSE stream delivers a `transport-update` event, the client SHALL route the event's payload to the callback of the transport matching the event's `transportId`, passing the payload through with its `transportId` field stripped. Matching uses the client's local `byTransportId` registry, which is populated in `registerOnServer` after the `POST /sse/transports/register` response lands.

If the event's `transportId` is not yet in `byTransportId` because its `registerOnServer` round-trip has not yet completed, the client SHALL retain the event's data in a `pendingInitialUpdates` map keyed by `transportId` and SHALL NOT invoke any callback for the event at that moment. Once `registerOnServer` runs `byTransportId.set(transportId, record)` for that `transportId`, the client SHALL immediately check `pendingInitialUpdates` for that id, and if an entry is present, SHALL remove it from the map, reconstruct the payload from the retained data through the same values/aggregate/pathCache logic that a natively matched dispatch would use, and SHALL invoke the transport's callback with that payload exactly once — and SHALL resolve `record.initialResolve(record.handle)` if still set, so that the corresponding `registerTransport` Promise resolves exactly as it would have on a natively matched initial dispatch.

An arrival whose `transportId` matches a transport already in `byTransportId` SHALL dispatch through the normal path with no involvement of `pendingInitialUpdates`. An arrival whose `transportId` does not match any `byTransportId` entry and does not correspond to any in-flight `registerOnServer` call retains today's behavior: the entry stays in `pendingInitialUpdates` and no callback is invoked (see the "Ignore transport-update events for unknown handles" requirement for the related stray-after-unregister case).

#### Scenario: Values payload routed by transportId

- **WHEN** handle A has transportId `t-1` and a `transport-update` arrives with `{ transportId: "t-1", values: [...], ts: "..." }`
- **THEN** A's callback is invoked with `{ values: [...], ts: "..." }`

#### Scenario: Aggregate payload routed by transportId

- **WHEN** handle A has transportId `t-2` and a `transport-update` arrives with `{ transportId: "t-2", aggregate: {...}, ts: "..." }`
- **THEN** A's callback is invoked with `{ aggregate: {...}, ts: "..." }`

#### Scenario: Initial update arrives before register completes

- **WHEN** a `transport-update` arrives with `{ transportId: "t-3", aggregate: {...}, ts: "..." }`
- **AND** the client has not yet executed `byTransportId.set("t-3", record)` for that transport because `POST /sse/transports/register` has not yet resolved
- **THEN** no callback is invoked at the time of arrival
- **AND** the event's `{ aggregate, ts }` (or `{ values, ts }`, whichever was sent) is retained under key `"t-3"` in `pendingInitialUpdates`
- **AND** `registerTransport`'s Promise is NOT yet resolved
- **WHEN** the `POST /sse/transports/register` response lands and `byTransportId.set("t-3", record)` runs
- **THEN** the retained entry is removed from `pendingInitialUpdates`
- **AND** the corresponding callback is invoked exactly once with the reconstructed payload (`{ aggregate, ts }` or `{ values, ts }` as originally sent)
- **AND** the path-keyed cache is populated from the `values` triples in the same way as a natively matched values arrival (if the payload was `values`-shaped)
- **AND** `registerTransport`'s Promise for that handle resolves with the handle
- **AND** a later real-time `transport-update` for the same `transportId` dispatches through the normal path with no involvement of `pendingInitialUpdates`

#### Scenario: No matching transport and no in-flight registration

- **WHEN** a `transport-update` event arrives with a `transportId` not in `byTransportId` and not corresponding to any in-flight `registerOnServer` call
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

### Requirement: Subscribe method returns a reactive subscription synchronously

The `SseClient` SHALL expose a `subscribe(spec) → Subscription` method alongside the existing `registerTransport` method. The `spec` parameter SHALL have the same shape accepted by `registerTransport`: `{ minInterval: number, selection: SelectionShape, aggregate?: { op: 'sum' | 'avg' } }`. The method SHALL return the `Subscription` object synchronously — the caller does not `await` a Promise to receive it. The returned `Subscription` is immediately usable: it exposes Vue-reactive fields that template bindings and `watch` clauses can attach to, and a `close()` method that is safe to call at any point in the subscription's life.

Server-side registration (the `POST /sse/transports/register` call) SHALL be initiated in the background from within `subscribe()`. The `Subscription` SHALL reflect the registration lifecycle through its reactive status fields (`sub.connected`, `sub.ts`, `sub.error`) rather than by gating availability of the returned object.

#### Scenario: Synchronous return

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 2000, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power']}] } })`
- **THEN** the return value is a `Subscription` object, not a `Promise`
- **AND** the `Subscription` is usable immediately for reading `.values`, `.connected`, `.ts`, `.stale`, `.error`, and calling `.close()`

#### Scenario: Subscribe starts server registration in the background

- **WHEN** a consumer calls `sseClient.subscribe(spec)`
- **THEN** the client initiates `POST /sse/transports/register` using the current `connectionId` (awaiting the `connected` event if not yet received)
- **AND** the `Subscription` is returned before that registration completes

### Requirement: Non-aggregate subscriptions expose reactive per-path values

For a `spec` with no `aggregate` field, the returned `Subscription` SHALL expose `sub.values`, a Vue-reactive plain object whose keys are the strings `` `${applianceId}:${path}` `` for every `(applianceId, path)` pair in the spec's `selection`, with the following rule for wildcard entries:

- For any `(applianceId, paths)` entry in the selection whose `paths` array does NOT contain the wildcard string `'**'`, every one of that entry's `(applianceId, path)` keys SHALL be present in `sub.values` immediately upon return from `subscribe()` (initial value `undefined`). These keys are pre-declared and do not change for the life of the subscription.
- For any `(applianceId, paths)` entry whose `paths` array contains the wildcard string `'**'`, no key for that applianceId SHALL be pre-declared at subscribe time on the basis of the wildcard. (Any explicit sibling paths in the same entry's `paths` array are still pre-declared per the preceding rule.) Keys for that applianceId's wildcard-covered paths SHALL be added reactively the first time a `transport-update` delivers a triple for that `(applianceId, path)` combination, via the same mechanism Vue 2 requires for reactive dynamic-key addition (i.e. `Vue.set` or equivalent). After being added, such keys behave exactly like pre-declared keys for all subsequent updates, close-time clearing, and reconnect preservation.

Consumers SHALL be able to bind `sub.values['<id>:<path>']` in templates and `watch` it as-is, with Vue reactivity firing on value changes, regardless of whether the key was pre-declared or added dynamically. For non-aggregate subscriptions, `sub.aggregate` SHALL be `null`. The `values` field is typed `Record<string, unknown> | null` — per-key value types are whatever the server sent.

Each `transport-update` payload for the subscription's transport SHALL update `sub.values` by the following rule, for each triple `{applianceId, path, value, representsGroups?}` in `payload.values`:

1. Compute the set of **target ids** for this triple as the deduplicated union of `applianceId` and every id in `representsGroups` when `representsGroups` is present and is an array. When `representsGroups` is absent, the target-id set is just `[applianceId]`.
2. Let the **subscription's selected id set** be the set of `applianceId`s that appear in `spec.selection` (via either `perAppliance[*].applianceId` or `applianceIds[*]`), computed once at subscribe time.
3. For each target id that is also in the selected id set, write the triple's value into `sub.values[``${id}:${path}``]` **as-is** — the triple's raw `value` is stored verbatim without type coercion. Use `Vue.set` for the write so newly-arriving dynamic keys become reactive. The library does not know a priori whether a given path carries a number, boolean, string, array, or other shape, so any consumer that needs a specific type (e.g. the kiosk-energy-panel-details detail view summing power values) SHALL coerce at its read site.
4. Target ids that are not in the selected id set SHALL NOT be written. A triple whose `applianceId` itself is not in the selected id set (the server delivered it because a `representsGroups` member matched the selection) SHALL NOT cause a write under `${applianceId}:${path}` — only the matching represented ids receive writes.

Paths not present in a given payload SHALL be left untouched in `sub.values` for every key — their previous latest-known value survives. The same `(applianceId, path, value)` triple SHALL ALSO continue to populate the shared `pathCache` keyed by `${applianceId}:${path}` (using the triple's own `applianceId`, not the represented ids) so `getLatestPath` behavior is unchanged.

#### Scenario: Subscription pre-populates explicit keys at subscribe time

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 2000, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power','relays[1].power']}] } })`
- **THEN** immediately upon return, `'148:relays[0].power' in sub.values` is `true` and `'148:relays[1].power' in sub.values` is `true`
- **AND** `sub.values['148:relays[0].power']` is `undefined`
- **AND** `sub.values['148:relays[1].power']` is `undefined`
- **AND** `sub.aggregate` is `null`

#### Scenario: Wildcard-path entry does not pre-declare keys

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 300, selection: { perAppliance: [{applianceId: 177, paths: ['**']}] } })`
- **THEN** immediately upon return, no `'177:<path>'` key for this appliance is present in `sub.values` on the basis of the wildcard
- **AND** `Object.keys(sub.values).filter(k => k.startsWith('177:')).length` is `0`
- **AND** `sub.aggregate` is `null`

#### Scenario: Wildcard key is added reactively on first delivery

- **WHEN** a wildcard subscription for appliance `177` is active
- **AND** a `transport-update` arrives with `values: [{applianceId: 177, path: 'relays[0].power', value: 42}]`
- **THEN** `'177:relays[0].power' in sub.values` becomes `true`
- **AND** `sub.values['177:relays[0].power']` is `42`
- **AND** Vue templates and watchers bound to that key re-render / fire on this update exactly as they would for a pre-declared key

#### Scenario: Wildcard-discovered keys retain across delta updates

- **WHEN** a wildcard subscription for appliance `177` has received `'177:relays[0].power' → 42` and `'177:brightness' → 80` in prior `transport-update` events
- **AND** a subsequent `transport-update` arrives with only `{applianceId: 177, path: 'brightness', value: 85}`
- **THEN** `sub.values['177:brightness']` becomes `85`
- **AND** `sub.values['177:relays[0].power']` remains `42`

#### Scenario: Mixed selection — explicit keys pre-declared, wildcard keys dynamic

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 300, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power']}, {applianceId: 177, paths: ['**']}] } })`
- **THEN** immediately upon return, `'148:relays[0].power' in sub.values` is `true` with value `undefined`
- **AND** no `'177:<path>'` key for the wildcard appliance is present
- **WHEN** a `transport-update` arrives with `values: [{applianceId: 177, path: 'brightness', value: 70}]`
- **THEN** `'177:brightness' in sub.values` becomes `true` with value `70`
- **AND** `'148:relays[0].power'` remains `undefined`

#### Scenario: First payload populates selected keys (explicit selection, unchanged)

- **WHEN** a non-aggregate subscription with explicit paths is active
- **AND** a `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 42}, {applianceId: 148, path: 'relays[1].power', value: 30}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `42`
- **AND** `sub.values['148:relays[1].power']` becomes `30`

#### Scenario: Delta payload updates only the paths it carries (unchanged)

- **WHEN** a non-aggregate subscription is active
- **AND** a prior `transport-update` set `sub.values['148:relays[0].power']` to `42` and `sub.values['148:relays[1].power']` to `30`
- **AND** a subsequent `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 45}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `45`
- **AND** `sub.values['148:relays[1].power']` remains `30`

#### Scenario: Value types are preserved as-is

- **WHEN** a `transport-update` arrives with a triple whose value is a boolean (e.g. `{applianceId: 148, path: 'closures[0].open', value: true}`)
- **THEN** `sub.values['148:closures[0].open']` becomes `true` (not coerced to a number)
- **WHEN** a `transport-update` arrives with a triple whose value is a string (e.g. `{applianceId: 148, path: 'rgbws[0].mode', value: 'WHITE'}`)
- **THEN** `sub.values['148:rgbws[0].mode']` becomes `'WHITE'` (not coerced)
- **WHEN** a `transport-update` arrives with a triple whose value is a number
- **THEN** `sub.values[key]` becomes that number value verbatim

#### Scenario: Close clears all currently-present keys including dynamically-added wildcard keys

- **WHEN** a wildcard subscription has accumulated `'177:relays[0].power' → 42` and `'177:brightness' → 85` in `sub.values`
- **AND** the consumer calls `sub.close()`
- **THEN** `sub.values['177:relays[0].power']` becomes `undefined`
- **AND** `sub.values['177:brightness']` becomes `undefined`
- **AND** the keys remain present in `sub.values` (set to `undefined`), consistent with the clearing behavior for pre-declared keys

#### Scenario: representsGroups mirrors writes onto each represented id that is selected

- **WHEN** a wildcard subscription for appliance `148` is active (selection: `{ perAppliance: [{applianceId: 148, paths: ['**']}] }`)
- **AND** a `transport-update` arrives with `values: [{applianceId: 200, path: 'relays[0].power', value: 42, representsGroups: [148, 149]}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `42`
- **AND** `sub.values['200:relays[0].power']` is NOT present (appliance `200` is not in the selection)
- **AND** `sub.values['149:relays[0].power']` is NOT present (appliance `149` is not in the selection)

#### Scenario: representsGroups writes under both the group's id and member ids when both are in the selection

- **WHEN** a subscription is active for both the group and one member (selection: `{ perAppliance: [{applianceId: 200, paths: ['**']}, {applianceId: 148, paths: ['**']}] }`)
- **AND** a `transport-update` arrives with `values: [{applianceId: 200, path: 'relays[0].power', value: 42, representsGroups: [148, 149]}]`
- **THEN** `sub.values['200:relays[0].power']` becomes `42`
- **AND** `sub.values['148:relays[0].power']` becomes `42`
- **AND** `sub.values['149:relays[0].power']` is NOT present (appliance `149` is not in the selection)

#### Scenario: Triple without representsGroups writes only under its applianceId

- **WHEN** a subscription is active for appliance `148`
- **AND** a `transport-update` arrives with `values: [{applianceId: 148, path: 'brightness', value: 70}]` (no `representsGroups` field)
- **THEN** `sub.values['148:brightness']` becomes `70`
- **AND** no other key in `sub.values` is written as a consequence of this triple

### Requirement: Aggregate subscriptions expose reactive aggregate state

For a `spec` that includes `aggregate: { op: 'sum' | 'avg' }`, the returned `Subscription` SHALL expose `sub.aggregate`, a Vue-reactive object of shape `{ value: number | null, sampleCount: number, totalCount: number }`, pre-populated at subscribe time with `{ value: null, sampleCount: 0, totalCount: 0 }`. For aggregate subscriptions, `sub.values` SHALL be `null`. Each `transport-update` carrying an `aggregate` payload SHALL update `sub.aggregate.value`, `sub.aggregate.sampleCount`, and `sub.aggregate.totalCount` from the payload in place. Aggregate payloads SHALL NOT mutate `pathCache` (unchanged behavior).

#### Scenario: Aggregate subscription pre-populates

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 3000, selection: {...}, aggregate: { op: 'sum' } })`
- **THEN** `sub.aggregate` is an object equal to `{ value: null, sampleCount: 0, totalCount: 0 }`
- **AND** `sub.values` is `null`

#### Scenario: Aggregate payload updates reactive aggregate

- **WHEN** an aggregate subscription receives a `transport-update` with `aggregate: { op: 'sum', value: 847.3, sampleCount: 47, totalCount: 50 }`
- **THEN** `sub.aggregate.value` becomes `847.3`
- **AND** `sub.aggregate.sampleCount` becomes `47`
- **AND** `sub.aggregate.totalCount` becomes `50`

### Requirement: Subscription exposes reactive connection, timestamp, and staleness status

Every `Subscription` SHALL expose three reactive status fields usable by consumers:

- `sub.connected: boolean` — `true` while the subscription has an active server-side transport registration and the underlying `EventSource` is `connected`; `false` before initial registration completes, after `close()`, and during an `EventSource` reconnect window until the re-registration has landed.
- `sub.ts: string | null` — the `ts` string of the most recent `transport-update` delivered to this subscription; `null` before any payload has been delivered.
- `sub.stale: boolean` — `true` when `sub.connected === true` and more than `2 × spec.minInterval` milliseconds have elapsed since the last payload was delivered; `false` otherwise. The staleness timer SHALL reset on every delivered payload and on reconnect, and SHALL be cleared by `close()`.

#### Scenario: Connected flips true after first registration

- **WHEN** a new subscription completes server-side registration and receives its first `transport-update`
- **THEN** `sub.connected` is `true`
- **AND** `sub.ts` equals the payload's `ts`

#### Scenario: Stale flips true after 2× minInterval without a payload

- **WHEN** a subscription with `minInterval: 2000` receives a payload at time `t0`
- **AND** no further payload arrives for more than `4000` ms while `sub.connected` remains `true`
- **THEN** `sub.stale` becomes `true`

#### Scenario: Stale resets on a fresh payload

- **WHEN** `sub.stale` is `true`
- **AND** a `transport-update` arrives for the subscription
- **THEN** `sub.stale` becomes `false`
- **AND** `sub.ts` is updated to the new payload's `ts`

### Requirement: Subscription error is surfaced via a reactive field

If server-side registration for a subscription fails (HTTP error from `POST /sse/transports/register`, network error, or any other rejection inside the registration path), the subscription SHALL NOT throw and SHALL NOT reject any Promise (it returned none). Instead, the error SHALL be captured into `sub.error: Error | null`. `sub.connected` SHALL remain `false` and `sub.ts` SHALL remain `null`.

`sub.error` SHALL be `null` before any error, and SHALL retain its value until `close()` is called (which clears it by marking the subscription terminal).

#### Scenario: Failed registration surfaces as sub.error

- **WHEN** a consumer calls `subscribe(spec)` and `POST /sse/transports/register` rejects with HTTP 500
- **THEN** `sub.error` becomes a non-null `Error` reflecting the failure
- **AND** `sub.connected` is `false`
- **AND** `sub.ts` is `null`
- **AND** no exception propagates out of `subscribe()`

### Requirement: Close is terminal, race-safe, and idempotent

Every `Subscription` SHALL expose a `close()` method. Calling `close()` SHALL:

1. Mark the subscription terminal so that no further `transport-update` event SHALL mutate `sub.values` / `sub.aggregate` / `sub.ts` / `sub.stale`, even if a payload arrives in the narrow window between `close()` and the underlying `unregisterTransport` taking effect on the server.
2. If server-side registration has completed for this subscription, deregister the corresponding transport via the existing `unregisterTransport` machinery.
3. If server-side registration is still in flight, cause the returned handle to be deregistered as soon as the registration promise resolves; no dispatch to `sub.values` / `sub.aggregate` SHALL occur for this subscription at any point after `close()` is called.
4. Flip `sub.connected` to `false` and `sub.stale` to `false`, clear the staleness timer, and reset the reactive data fields to their initial empty shape (for non-aggregate: every pre-declared key set to `undefined`; for aggregate: `{ value: null, sampleCount: 0, totalCount: 0 }`). `sub.ts` SHALL be preserved as `null` after close.
5. Be safely callable multiple times. The second and subsequent `close()` calls on the same `Subscription` SHALL be no-ops.

#### Scenario: Close after successful registration deregisters the server-side transport

- **WHEN** a subscription's registration has completed and at least one payload has been delivered
- **AND** the consumer calls `sub.close()`
- **THEN** `POST /sse/transports/deregister` is invoked for this subscription's `transportId`
- **AND** `sub.connected` becomes `false`
- **AND** subsequent `transport-update` events for the (now-deregistered) `transportId` do not mutate `sub.values` / `sub.aggregate`

#### Scenario: Close before registration completes cancels in-flight registration

- **WHEN** a consumer calls `subscribe(spec)`
- **AND** calls `sub.close()` before `POST /sse/transports/register` has resolved
- **THEN** no `transport-update` event for this subscription (whether arriving via `pendingInitialUpdates` buffering or a normal dispatch) mutates `sub.values` / `sub.aggregate`
- **AND** once the registration response lands, the returned `transportId` is deregistered via `POST /sse/transports/deregister`

#### Scenario: Close is idempotent

- **WHEN** `sub.close()` has been called on a subscription
- **AND** the consumer calls `sub.close()` a second time
- **THEN** no additional `POST /sse/transports/deregister` is sent
- **AND** no error is thrown

### Requirement: Subscriptions survive EventSource reconnect

When the underlying `EventSource` reconnects and the `SseClient` re-registers all active transports with the new `connectionId` (existing behavior), any live `Subscription` SHALL have its server-side transport re-registered as part of that sweep. During the reconnect window, `sub.connected` SHALL be `false`; after the new `connected` event and re-registration, `sub.connected` SHALL return to `true`. `sub.values` / `sub.aggregate` / `sub.ts` SHALL NOT be cleared by the reconnect; previously-seen values SHALL persist until overwritten by fresh payloads on the new registration.

#### Scenario: Reconnect preserves per-path values

- **WHEN** a non-aggregate subscription has received values and `sub.values['148:relays[0].power']` is `42`
- **AND** the underlying `EventSource` disconnects and reconnects
- **THEN** while disconnected, `sub.connected` is `false`
- **AND** `sub.values['148:relays[0].power']` remains `42`
- **AND** after re-registration completes, `sub.connected` is `true`
- **AND** the next `transport-update` for the new `transportId` updates `sub.values` normally

#### Scenario: Reconnect resets the staleness timer

- **WHEN** a subscription's reconnect completes and a fresh `transport-update` arrives
- **THEN** `sub.stale` is `false` regardless of its value before the reconnect
