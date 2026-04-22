## MODIFIED Requirements

### Requirement: Detail SSE transport selection is built from the clicked cell

The panel SHALL subscribe to its detail SSE transport via `sse-transport-client` with `minInterval` `2000` ms, no aggregate, and `selection.perAppliance` built from the clicked cell's `d.appliances` such that for each appliance `a`:

- If `a.indexes` is present, `paths` is `[``relays[${i}].power`` for each `i` in `a.indexes`]`.
- Otherwise, if `a.names` is present, `paths` is a shallow copy of `a.names`.
- Appliances whose resulting `paths` list is empty SHALL be excluded from the selection.

If the resulting selection is empty, no detail subscription SHALL be created for that click.

#### Scenario: Appliance with indexes

- **WHEN** the clicked cell's `d.appliances` contains `{id:148, indexes:[0,1,2]}`
- **THEN** the subscription's selection includes `{applianceId:148, paths:['relays[0].power','relays[1].power','relays[2].power']}`

#### Scenario: Appliance with names

- **WHEN** the clicked cell's `d.appliances` contains `{id:177, names:['dcPower']}`
- **THEN** the subscription's selection includes `{applianceId:177, paths:['dcPower']}`

#### Scenario: Appliance with neither indexes nor names is excluded

- **WHEN** the clicked cell's `d.appliances` contains an entry with neither `indexes` nor `names` set
- **THEN** that entry is excluded from the subscription's `selection.perAppliance`

#### Scenario: Empty effective selection skips subscription

- **WHEN** the clicked cell's `d.appliances` is empty, missing, or yields no entries with non-empty `paths`
- **THEN** no detail SSE subscription is created for that click

### Requirement: Closing the detail view clears the list and unregisters the transport

When the user taps the back face, the panel SHALL flip the card back to its front face, close the active detail SSE subscription via `sse-transport-client` (which deregisters the server-side transport and clears the subscription's reactive state), empty the rendered detail list, and discard any per-open path-value state accumulated during the open. After close, no callback, payload, or subscription field from the closed subscription SHALL modify the rendered detail list, and no path-value delivered during the closed open SHALL influence a subsequent open.

#### Scenario: Tap to close

- **WHEN** a detail view is open for a cell
- **AND** the user taps the back face
- **THEN** the card flips to the front face
- **AND** the detail subscription is closed and the server-side transport is deregistered
- **AND** the rendered detail list is empty
- **AND** the per-open path-value state is empty

#### Scenario: Late update after close is ignored

- **WHEN** the detail view has been closed
- **AND** a `transport-update` for the (now-closed) detail subscription arrives before the server has processed the deregister
- **THEN** the rendered detail list is not modified
- **AND** the per-open path-value state is not populated by that late update

### Requirement: The most recent click is authoritative; superseded opens cannot leak

When the user opens a detail view while a previous detail open's subscription is still in flight (i.e. its server-side registration has not yet completed, or the user has clicked-close-and-click-new within that window), the panel SHALL treat the most recently clicked cell as authoritative. No `transport-update` derived from a superseded detail subscription SHALL modify the rendered detail list, and every superseded subscription SHALL be closed via `sse-transport-client` (which deregisters the server-side transport once its in-flight registration has completed).

#### Scenario: Click A, flip back, click B before A's subscription has completed registration

- **WHEN** the user taps cell A while the card is on its front
- **AND** before A's subscription has completed its server-side registration, the user taps the back face and then taps cell B
- **THEN** the rendered detail list reflects only cell B's appliances
- **AND** the subscription for A is closed once its registration completes, causing the server-side transport to be deregistered
- **AND** any `transport-update` events delivered for A's transport do not modify the rendered detail list at any point

#### Scenario: Close while a subscription is still registering

- **WHEN** the user taps a cell and then taps the back to close before that cell's subscription has completed its server-side registration
- **THEN** once the registration completes, the returned server-side transport is deregistered
- **AND** no `transport-update` for that subscription modifies the rendered detail list

### Requirement: Component destruction cleans up in-flight and active detail transports

When `KioskPowerPanel` is destroyed, any active or in-flight detail SSE subscription SHALL be closed via `sse-transport-client` (which deregisters the server-side transport, either immediately for a completed registration or upon completion for an in-flight one), and no `transport-update` payload from such a subscription SHALL modify component state after destruction. Any per-open path-value state held by the component or its detail subscription SHALL be discarded as part of destruction.

#### Scenario: Destroy with detail subscription active

- **WHEN** `KioskPowerPanel` is destroyed while an active detail subscription exists
- **THEN** that subscription's `close()` is called before the component is gone, causing the server-side transport to be deregistered
- **AND** the per-open path-value state is discarded

#### Scenario: Destroy with detail subscription still registering

- **WHEN** `KioskPowerPanel` is destroyed while a detail subscription's server-side registration has not yet completed
- **THEN** once that registration completes, the returned server-side transport is deregistered
- **AND** no write to component state occurs as a result of that registration completion or any subsequent `transport-update`
