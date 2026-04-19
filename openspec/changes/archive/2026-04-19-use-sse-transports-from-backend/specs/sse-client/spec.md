## REMOVED Requirements

### Requirement: Singleton SSE client service
**Reason**: Capability replaced by `sse-transport-client`. The singleton class and `getInstance()` pattern are retained in the new capability.
**Migration**: See `sse-transport-client` → Requirement: Singleton transport client service.

### Requirement: Lazy SSE connection
**Reason**: Capability replaced by `sse-transport-client`. Lazy-connection behavior is retained; the trigger is now the first `registerTransport()` call instead of `subscribe()`.
**Migration**: See `sse-transport-client` → Requirement: Lazy SSE connection.

### Requirement: SSE endpoint URL from store config
**Reason**: Capability replaced by `sse-transport-client`. URL construction is unchanged.
**Migration**: See `sse-transport-client` → Requirement: SSE endpoint URL from store config.

### Requirement: Subscribe to appliance updates
**Reason**: The appliance-level subscription model (subscribe by applianceId list, receive full `ApplianceJson` on every change) is replaced by per-value transports. The backend has removed `POST /sse/appliances/register` in favor of `POST /sse/transports/register`.
**Migration**: See `sse-transport-client` → Requirement: Register a transport. Call sites using `subscribe(ids, cb, minInterval)` migrate to `await registerTransport({ minInterval, selection: { applianceIds: ids, paths: pathsForApplianceType(type, 'compact') } }, cb)`.

### Requirement: Unsubscribe from appliance updates
**Reason**: Paired with the removed `subscribe` method.
**Migration**: See `sse-transport-client` → Requirement: Unregister a transport. `unsubscribe(handle)` becomes `unregisterTransport(handle)`.

### Requirement: Event routing by appliance ID
**Reason**: The `update` event is gone. Routing now happens by `transportId`, not by appliance id, because multiple transports may observe the same appliance at different cadences.
**Migration**: See `sse-transport-client` → Requirement: Transport-update event dispatch.

### Requirement: Parse state and config before routing
**Reason**: The `update` event shipped full `ApplianceJson` entries with `state` and `config` as JSON-encoded strings requiring parsing. `transport-update` payloads carry already-typed scalar values; no string parsing is needed at this layer.
**Migration**: None. Callbacks now receive `{ values: [...] }` or `{ aggregate: {...} }` directly — no appliance object, no stringified JSON.

### Requirement: Internal appliance cache
**Reason**: The `Map<number, Appliance>` cache keyed by appliance id cannot be rebuilt from transport payloads without re-synthesising partial appliance objects, reintroducing the fan-out this change removes.
**Migration**: See `sse-transport-client` → Requirement: Path-keyed internal cache. `getLatest(applianceId)` is replaced by `getLatestPath(applianceId, path)`. The sole current caller (`KioskPowerPanel.vue:330-335`, used to seed initial values) is replaced by the synchronous initial snapshot delivered by `registerTransport`.

### Requirement: Automatic reconnection with re-registration
**Reason**: Reconnection is retained; what it re-registers changes from appliance-level subscriptions to transports.
**Migration**: See `sse-transport-client` → Requirement: Automatic reconnection with transport re-registration.

### Requirement: Connected state property
**Reason**: Retained in the new capability unchanged.
**Migration**: See `sse-transport-client` → Requirement: Connected state property. `sse-connection-indicator` reads the same boolean from the same singleton; no change needed there.

### Requirement: Ignore updates for removed subscriptions
**Reason**: Equivalent race-condition guard is retained in the new capability, keyed by `transportId` instead of appliance id.
**Migration**: See `sse-transport-client` → Requirement: Ignore transport-update events for unknown handles.

### Requirement: REST endpoint configuration
**Reason**: Endpoint paths change: `sseAppliancesRegister` / `sseAppliancesDeregister` are replaced by `sseTransportsRegister` / `sseTransportsDeregister`. `sseAppliances` (the SSE stream endpoint) is unchanged.
**Migration**: See `sse-transport-client` → Requirement: Transport REST endpoint configuration. Update `store/rest.ts` accordingly.
