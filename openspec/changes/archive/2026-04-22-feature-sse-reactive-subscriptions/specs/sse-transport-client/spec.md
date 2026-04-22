## ADDED Requirements

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

For a `spec` with no `aggregate` field, the returned `Subscription` SHALL expose `sub.values`, a Vue-reactive plain object whose keys are the strings `` `${applianceId}:${path}` `` for every `(applianceId, path)` pair in the spec's `selection`. The set of keys in `sub.values` SHALL be fixed at subscribe time: every selected path's key is present immediately (initial value `undefined`), no key is added later, no key is removed until `close()`. Consumers SHALL be able to bind `sub.values['<id>:<path>']` in templates and `watch` it as-is, with Vue reactivity firing on value changes. For non-aggregate subscriptions, `sub.aggregate` SHALL be `null`.

Each `transport-update` payload for the subscription's transport SHALL update `sub.values` by writing each triple `{applianceId, path, value}` into `sub.values[``${applianceId}:${path}``]` as a number (coerced via `Number.parseFloat` when not already a number; NaN normalized to `0`). Paths not present in a given payload SHALL be left untouched in `sub.values` — their previous latest-known value survives. The same `(applianceId, path, value)` triple SHALL ALSO continue to populate the shared `pathCache` as today, so `getLatestPath` behavior is unchanged.

#### Scenario: Subscription pre-populates keys at subscribe time

- **WHEN** a consumer calls `sseClient.subscribe({ minInterval: 2000, selection: { perAppliance: [{applianceId: 148, paths: ['relays[0].power','relays[1].power']}] } })`
- **THEN** immediately upon return, `'148:relays[0].power' in sub.values` is `true` and `'148:relays[1].power' in sub.values` is `true`
- **AND** `sub.values['148:relays[0].power']` is `undefined`
- **AND** `sub.values['148:relays[1].power']` is `undefined`
- **AND** `sub.aggregate` is `null`

#### Scenario: First payload populates selected keys

- **WHEN** a non-aggregate subscription is active
- **AND** a `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 42}, {applianceId: 148, path: 'relays[1].power', value: 30}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `42`
- **AND** `sub.values['148:relays[1].power']` becomes `30`
- **AND** Vue templates bound to those keys re-render

#### Scenario: Delta payload updates only the paths it carries

- **WHEN** a non-aggregate subscription is active
- **AND** a prior `transport-update` set `sub.values['148:relays[0].power']` to `42` and `sub.values['148:relays[1].power']` to `30`
- **AND** a subsequent `transport-update` arrives with `values: [{applianceId: 148, path: 'relays[0].power', value: 45}]`
- **THEN** `sub.values['148:relays[0].power']` becomes `45`
- **AND** `sub.values['148:relays[1].power']` remains `30`

#### Scenario: Non-numeric or NaN values coerce to 0

- **WHEN** a `transport-update` arrives with a triple whose value is a string that does not parse as a number (or is explicitly NaN)
- **THEN** `sub.values` is updated with `0` for that key

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
