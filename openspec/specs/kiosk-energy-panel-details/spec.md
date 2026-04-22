# kiosk-energy-panel-details Specification

## Purpose

The flip-to-details behavior of the kiosk energy panel (`src/components/KioskPowerPanel.vue`, consumed by `src/views/KioskOverview.vue`). Tapping a front-face cell flips the `FlipCard` and reveals a detail sub-list of the clicked cell's group: per-appliance summed power, resolved name (fallback to id), filtered to entries with `|powerRaw| > 1 W`, sorted descending by raw power, capped at 12 rows. Uses the `sse-transport-client` capability for the live feed. Introduced by the `bug-energy-panel-details` change on 2026-04-21 to close a race across the asynchronous `registerTransport` await that let a superseded transport's callback write into the rendered detail list.

## Requirements

### Requirement: Flip-to-details binds to the clicked cell's group

When a user taps a cell on the energy panel's front face while the card is showing the front, the panel SHALL flip to its back face and render a detail sub-list whose entries are drawn exclusively from that cell's `d.appliances` array. No appliance from any other cell, and no appliance absent from the clicked cell's `d.appliances`, SHALL appear in the detail sub-list for that open.

#### Scenario: Clicking a multi-appliance cell

- **WHEN** the user taps the energy-panel cell whose `d.appliances` is `[{id:148,indexes:[0,1,2]}, {id:54,indexes:[0]}, {id:55,indexes:[0]}, {id:56,indexes:[0]}, {id:38,indexes:[0]}]`
- **THEN** the card flips to the back face
- **AND** every rendered detail entry's `id` is an element of `{148, 54, 55, 56, 38}`
- **AND** the rendered detail list contains at most 5 entries

#### Scenario: Clicking a single-appliance cell

- **WHEN** the user taps the cell whose `d.appliances` is `[{id:145, indexes:[0,1,2]}]`
- **THEN** the rendered detail list contains at most 1 entry
- **AND** that entry's `id` is `145`

### Requirement: Detail SSE transport selection is built from the clicked cell

The panel SHALL register its detail SSE transport via `sse-transport-client` with `minInterval` `2000` ms, no aggregate, and `selection.perAppliance` built from the clicked cell's `d.appliances` such that for each appliance `a`:

- If `a.indexes` is present, `paths` is `[``relays[${i}].power`` for each `i` in `a.indexes`]`.
- Otherwise, if `a.names` is present, `paths` is a shallow copy of `a.names`.
- Appliances whose resulting `paths` list is empty SHALL be excluded from the selection.

If the resulting selection is empty, no transport SHALL be registered for that click.

#### Scenario: Appliance with indexes

- **WHEN** the clicked cell's `d.appliances` contains `{id:148, indexes:[0,1,2]}`
- **THEN** the transport's selection includes `{applianceId:148, paths:['relays[0].power','relays[1].power','relays[2].power']}`

#### Scenario: Appliance with names

- **WHEN** the clicked cell's `d.appliances` contains `{id:177, names:['dcPower']}`
- **THEN** the transport's selection includes `{applianceId:177, paths:['dcPower']}`

#### Scenario: Appliance with neither indexes nor names is excluded

- **WHEN** the clicked cell's `d.appliances` contains an entry with neither `indexes` nor `names` set
- **THEN** that entry is excluded from the transport's `selection.perAppliance`

#### Scenario: Empty effective selection skips registration

- **WHEN** the clicked cell's `d.appliances` is empty, missing, or yields no entries with non-empty `paths`
- **THEN** no detail SSE transport is registered for that click

### Requirement: Detail entries display per-appliance summed power and name

For each appliance in the clicked cell's `d.appliances`, the panel SHALL compute `powerRaw` as the sum, over that appliance's selected paths, of the latest-known numeric value delivered on the current detail transport since the open began. A non-numeric or NaN delivered value SHALL be treated as `0`. A path for which no value has been delivered on the current detail transport since the open began SHALL contribute `0` to the sum.

A `transport-update` that carries values for only a subset of the open's selected paths (i.e. a delta update) SHALL refresh those paths' latest-known values in place and SHALL NOT reset, zero, or discard the latest-known values of any paths it does not carry. The latest-known values used for this computation SHALL be scoped to the current open: they SHALL start empty at the beginning of the open and SHALL NOT be influenced by values delivered in any previous or superseded detail open, nor by values delivered on any other transport.

The panel SHALL render each entry as the appliance's resolved name — falling back to its `id` as a string when no name has been resolved via the appliances service — together with `powerRaw` formatted through the project's power-formatting utility.

#### Scenario: Multiple paths for one appliance are summed

- **WHEN** an appliance has `indexes:[0,1,2]` selected
- **AND** the `transport-update` delivers values `10`, `20`, `30` for its three `relays[i].power` paths
- **THEN** that appliance's rendered power is the utility-formatted representation of `60`

#### Scenario: Appliance with no delivered values across the open

- **WHEN** an appliance is in the clicked cell's `d.appliances`
- **AND** no `transport-update` since the current detail open began has delivered a value for any of that appliance's selected paths
- **THEN** its `powerRaw` is `0`

#### Scenario: Delta update retains unchanged paths from prior updates

- **WHEN** a detail open is active for a cell whose `d.appliances` is `[{id:148, indexes:[0,1,2]}, {id:54, indexes:[0]}, {id:55, indexes:[0]}]`
- **AND** the first `transport-update` after open delivers values `10`, `20`, `30` for appliance `148`'s three `relays[i].power` paths and value `500` for appliance `54`'s `relays[0].power` and value `200` for appliance `55`'s `relays[0].power`
- **AND** a subsequent `transport-update` delivers value `550` only for appliance `54`'s `relays[0].power`
- **THEN** after the subsequent update, appliance `148`'s `powerRaw` is still `60`, appliance `54`'s `powerRaw` is `550`, and appliance `55`'s `powerRaw` is still `200`
- **AND** all three appliances remain rendered in the detail sub-list (subject to the ±1 W idle filter, sort, and 12-row cap)

#### Scenario: Delta update updates only the paths it carries for a multi-path appliance

- **WHEN** a detail open is active for a cell whose `d.appliances` contains `{id:148, indexes:[0,1,2]}`
- **AND** a prior `transport-update` delivered `10`, `20`, `30` for `relays[0].power`, `relays[1].power`, `relays[2].power`
- **AND** a subsequent `transport-update` delivers only `15` for `relays[1].power`
- **THEN** appliance `148`'s `powerRaw` is `10 + 15 + 30 = 55`

#### Scenario: Name fallback before the appliances service has resolved

- **WHEN** an appliance's name has not yet been loaded into the name cache
- **THEN** its entry's rendered name is its `id` coerced to string

#### Scenario: Reopening the same cell starts from an empty cache

- **WHEN** a detail open for cell A was active and then closed (via back-tap)
- **AND** during the first open, appliance `54`'s latest-known `powerRaw` was `500`
- **AND** the user opens cell A again
- **AND** the first `transport-update` of the new open delivers values for appliance `148` but not for appliance `54`
- **THEN** appliance `54`'s `powerRaw` in the new open is `0`, not `500`

### Requirement: Detail list is threshold-filtered, sorted descending, and capped

The rendered detail sub-list SHALL exclude entries whose `powerRaw` satisfies `-1 ≤ powerRaw ≤ 1`, SHALL be ordered by `powerRaw` in descending numeric order (highest positive first, most-negative last), and SHALL contain at most 12 entries after filtering.

#### Scenario: Idle appliance is hidden

- **WHEN** an appliance in the clicked cell has `powerRaw` equal to `0.4`
- **THEN** it is not rendered in the detail sub-list

#### Scenario: Boundary at exactly ±1 W is hidden

- **WHEN** an appliance in the clicked cell has `powerRaw` equal to `1` or `-1`
- **THEN** it is not rendered in the detail sub-list

#### Scenario: Negative (export / negated) appliance is shown

- **WHEN** an appliance in the clicked cell has `powerRaw` equal to `-150`
- **THEN** it is rendered in the detail sub-list

#### Scenario: Descending sort by raw power

- **WHEN** the post-filter entries have `powerRaw` values `50`, `200`, `10`, `-300`
- **THEN** the rendered order is `200`, `50`, `10`, `-300`

#### Scenario: Cap at 12 entries

- **WHEN** the clicked cell's group has more than 12 appliances with `|powerRaw| > 1`
- **THEN** at most 12 entries are rendered
- **AND** the rendered entries are the 12 with the greatest `powerRaw` (per the descending sort)

### Requirement: Closing the detail view clears the list and unregisters the transport

When the user taps the back face, the panel SHALL flip the card back to its front face, deregister the active detail SSE transport via `sse-transport-client`, empty the rendered detail list, and discard any per-open path-value state accumulated from `transport-update` events during the open. After close, no callback from the closed transport SHALL modify the rendered detail list, and no path-value delivered during the closed open SHALL influence a subsequent open.

#### Scenario: Tap to close

- **WHEN** a detail view is open for a cell
- **AND** the user taps the back face
- **THEN** the card flips to the front face
- **AND** the detail transport is deregistered
- **AND** the rendered detail list is empty
- **AND** the per-open path-value cache is empty

#### Scenario: Late update after close is ignored

- **WHEN** the detail view has been closed
- **AND** a `transport-update` for the now-closed transport arrives before the server has processed the deregister
- **THEN** the rendered detail list is not modified
- **AND** the per-open path-value cache is not populated by that late update

### Requirement: The most recent click is authoritative; superseded opens cannot leak

When the user opens a detail view while a previous detail open is still in flight (i.e. its `registerTransport` promise has not yet resolved, or the user has clicked-close-and-click-new within that window), the panel SHALL treat the most recently clicked cell as authoritative. No callback derived from a superseded detail registration SHALL write into the rendered detail list, and every superseded handle SHALL be deregistered via `sse-transport-client` upon its registration resolving.

#### Scenario: Click A, flip back, click B before A's register has resolved

- **WHEN** the user taps cell A while the card is on its front
- **AND** before A's `registerTransport` promise resolves, the user taps the back face and then taps cell B
- **THEN** the rendered detail list reflects only cell B's appliances
- **AND** the transport registered for A is deregistered once its promise resolves
- **AND** any `transport-update` events delivered for A's transport do not modify the rendered detail list at any point

#### Scenario: Close while a registration is in flight

- **WHEN** the user taps a cell and then taps the back to close before the `registerTransport` promise has resolved
- **THEN** once the promise resolves, the returned handle is deregistered
- **AND** no `transport-update` for that handle modifies the rendered detail list

### Requirement: Component destruction cleans up in-flight and active detail transports

When `KioskPowerPanel` is destroyed, any active or in-flight detail SSE transport SHALL be deregistered via `sse-transport-client`, and no callback from such a transport SHALL modify component state after destruction. Any per-open path-value state held by the component SHALL be discarded as part of destruction.

#### Scenario: Destroy with detail transport active

- **WHEN** `KioskPowerPanel` is destroyed while a detail transport handle is stored
- **THEN** that handle is passed to `unregisterTransport` before the component is gone
- **AND** the per-open path-value cache is discarded

#### Scenario: Destroy with detail registration in flight

- **WHEN** `KioskPowerPanel` is destroyed while a detail `registerTransport` promise has not yet resolved
- **THEN** once that promise resolves, the returned handle is deregistered
- **AND** no write to component state occurs as a result of that resolve or any subsequent `transport-update`
