## MODIFIED Requirements

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
