## ADDED Requirements

### Requirement: Single transport subscription on mount

When the Floorplan view (`src/components/floorplan/Floorplan.vue`) mounts, it SHALL first load appliances via REST (`getAppliances`) and then register exactly one SSE transport through `SseClient.getInstance().registerTransport(...)`. The selection MUST be shaped as `{ perAppliance: [{ applianceId, paths }, ...] }` where each entry's `paths` are derived from `pathsForApplianceType(appliance.type, 'compact')`. Appliances with no compact paths MUST be skipped, and each `applianceId` MUST appear at most once in the selection. The Floorplan MUST store the returned `Handle` for later deregistration.

#### Scenario: Mount with one PLUG and one DIMMER on the floorplan
- **WHEN** the Floorplan mounts with a PLUG (id 42) and a DIMMER (id 77) in `this.areas`
- **THEN** exactly one call to `SseClient.getInstance().registerTransport(...)` is made
- **AND** the selection contains `{ applianceId: 42, paths: ['relays[*].power', 'relays[0].state'] }` and `{ applianceId: 77, paths: ['relays[*].power', 'relays[0].state'] }`
- **AND** `this.sseHandle` is assigned the returned `Handle`

#### Scenario: Duplicate area entries for one appliance
- **WHEN** `this.areas` contains two entries for the same `appId` (e.g., a `RELAY_DUAL` with two relay icons)
- **THEN** the selection includes exactly one `perAppliance` entry for that `applianceId`

#### Scenario: Appliance type with no compact paths
- **WHEN** an area's appliance has a type whose `pathsForApplianceType(type, 'compact')` returns an empty array
- **THEN** that appliance is not included in the selection
- **AND** if no appliances remain with non-empty paths, no transport is registered and `this.sseHandle` stays `null`

### Requirement: Initial render uses REST-loaded state

The Floorplan SHALL render the initial on/off icon, avatar color, and power reading for each appliance using the state returned by the REST `getAppliances` load, **before** any transport-update arrives. The initial render MUST NOT require or wait for any SSE event.

#### Scenario: Plain appliance with state from REST
- **WHEN** `getAppliances` returns a PLUG with `state.relays[0].state = 'off'` and `state.relays[0].power = 12`
- **THEN** the PLUG's avatar renders in the "off" color
- **AND** the power reading renders as `12 W` (or the formatted equivalent) if `isOn` gates allow it

### Requirement: Live state updates for plain appliances reflect on every transport-update

For every `transport-update` payload delivered by `SseClient` to the Floorplan callback containing a `(applianceId, path, value)` triple where `applianceId` corresponds to a plain (non-group) appliance tracked by the Floorplan, the appliance's reactive state at `app.state.<path>` SHALL be updated **and** every DOM element that reads that state (or derived state such as `onOffState`, avatar color, or power reading) SHALL reflect the new value within the same render flush as the update. This MUST hold for the first, second, third, … N-th update within a single session, without degradation. The UI MUST NOT become unresponsive to updates after the first one.

#### Scenario: First toggle of a PLUG from off to on
- **WHEN** the user clicks a PLUG (id 42) that is off, the REST command succeeds, and the backend emits a transport-update with `(42, 'relays[0].state', 'on')`
- **THEN** the PLUG's avatar switches to the "on" color within the next render flush
- **AND** `app.state.relays[0].state === 'on'` on the reactive appliance object

#### Scenario: Second toggle of the same PLUG from on to off
- **WHEN** the user then clicks the same PLUG to turn it off, and the backend emits a transport-update with `(42, 'relays[0].state', 'off')`
- **THEN** the PLUG's avatar switches back to the "off" color within the next render flush
- **AND** `app.state.relays[0].state === 'off'` on the reactive appliance object

#### Scenario: Toggling a different plain appliance after a first toggle
- **WHEN** after toggling PLUG 42, the user clicks DIMMER 77 to turn it on, and the backend emits a transport-update with `(77, 'relays[0].state', 'on')`
- **THEN** DIMMER 77's avatar switches to the "on" color within the next render flush
- **AND** PLUG 42's displayed state remains whatever its last update set (not reset)

### Requirement: Live power readings for plain appliances reflect on every transport-update

For every transport-update triple where `path` matches `relays[*].power` and `applianceId` corresponds to a plain appliance tracked by the Floorplan, the appliance's reactive `app.state.relays[i].power` SHALL be updated and the rendered power reading SHALL reflect the new value within the same render flush, even if `relays[i].power` was not present in the REST-loaded initial state (i.e., when the key is being added for the first time).

#### Scenario: Power arrives for a PLUG that had no initial power key
- **WHEN** the REST-loaded state for PLUG 42 had `state.relays[0]` with no `power` property, and the backend emits a transport-update with `(42, 'relays[0].power', 18)`
- **THEN** `app.state.relays[0].power === 18` on the reactive appliance object
- **AND** the power reading on the PLUG's avatar renders `18 W` (or the formatted equivalent), assuming the appliance's on/off gates allow it

#### Scenario: Power updates on each subsequent transport-update
- **WHEN** the backend emits successive transport-updates `(42, 'relays[0].power', 25)` then `(42, 'relays[0].power', 30)` for the same PLUG within one session
- **THEN** the rendered power reading transitions to `25 W` and then to `30 W` on each corresponding render flush

### Requirement: Repeated-update reliability across the session

The Floorplan SHALL process every transport-update for the lifetime of `this.sseHandle` (i.e., until `beforeDestroy`). There SHALL be no per-session state (counter, cache, flag, or closure capture) that causes the first update to be handled one way and subsequent updates another way for the same appliance and path. In particular, no update MUST be silently dropped, coalesced, or suppressed by the Floorplan consumer.

#### Scenario: Ten successive toggles of the same plain appliance
- **WHEN** the user toggles the same PLUG ten times in quick succession and the backend emits ten corresponding transport-updates
- **THEN** each of the ten updates is reflected in the UI (visible on/off transitions)
- **AND** the final rendered state matches the tenth update's value

#### Scenario: Mixed updates across many appliances
- **WHEN** transport-updates arrive for five different plain appliances, each toggled twice in a scattered order
- **THEN** every appliance's final rendered state matches its most recent transport-update's value

### Requirement: Non-interference with group routing

Live updates for plain (non-group) appliances SHALL NOT depend on or interact with the Floorplan's group-routing logic (`primaryChildToGroupIds`, `anyChildToGroupIds`, `groupChildPower`). A transport-update for an appliance that is neither a group primary child nor any group's child MUST be applied **only** to that appliance's own state. Conversely, group routing for `GROUP_PARALLEL` / `GROUP_SERIAL` appliances SHALL continue to work exactly as defined today (primary-child state mirrored to non-power paths; relay power summed across group children per relay index).

#### Scenario: Plain appliance not in any group
- **WHEN** a transport-update arrives for a plain PLUG that is not listed in any group's `config.applianceIds`
- **THEN** only `app.state.<path>` for that PLUG is mutated
- **AND** no other appliance's state is mutated as a side effect

#### Scenario: Group primary child receives a non-power update
- **WHEN** a transport-update arrives for a child appliance that is the primary child of one or more groups with a non-power path
- **THEN** the child's own state is updated **and** each containing group's state at the same path is updated to the same value

#### Scenario: Group child receives a power update
- **WHEN** a transport-update arrives for a child appliance (primary or not) with path `relays[i].power`
- **THEN** the child's own `relays[i].power` is updated
- **AND** each containing group's `relays[i].power` is updated to the sum of all its tracked children's `relays[i].power` values

### Requirement: Reactive property creation via Vue.set

Whenever the Floorplan applies a transport-update triple to an appliance's reactive state along a path that requires creating a property (a property of `state`, an element of a `relays` / `temperatures` / `humidities` / `batteries` / `motions` / `closures` array that didn't exist, or a leaf scalar like `power` that was absent from the REST-loaded JSON), it SHALL use `Vue.set` at each hop that creates a new property or array index, so that the newly-created property participates in Vue's reactivity system. Plain assignment (`obj.foo = value`) MUST NOT be used for property creation on appliance state.

#### Scenario: First-ever power value for a relay
- **WHEN** the REST-loaded `state.relays[0]` has no `power` key and the first `(id, 'relays[0].power', 18)` transport-update arrives
- **THEN** `power` is installed via `Vue.set` so subsequent reads track reactively
- **AND** changing `power` later (e.g., to 25) fires reactive dependencies and causes a re-render

#### Scenario: Terminal scalar assignment
- **WHEN** a transport-update writes to an already-existing terminal scalar on appliance state
- **THEN** the write uses `Vue.set` (or equivalent reactive write) — never a plain `=` assignment — so that reactivity cannot regress in the presence of prototype-level properties or accessor overrides

### Requirement: Derived on/off state is reactive

The Floorplan's rendered on/off indicator (avatar color, icon vs. watts choice) SHALL be derived from the appliance's reactive state at read time, such that every transport-update that changes `state.relays[0].state` (or the analogous field for the appliance type) causes the indicator to re-render within the same flush. Any intermediate cache of the on/off state (e.g., an `onOffState` property set on the appliance object by a canvas-redraw step) MUST be written reactively so that template readers re-render when it changes.

#### Scenario: onOffState is set during canvas redraw
- **WHEN** the Floorplan's `redraw` sets `item.onOffState` based on the current `state.relays[0].state`
- **THEN** the write uses `Vue.set(item, 'onOffState', value)` (or an equivalent reactive write) so template expressions that read `app.onOffState` update on the next flush

#### Scenario: Template reflects new on/off without a full canvas redraw
- **WHEN** a transport-update changes `state.relays[0].state` but the canvas redraw path is not executed
- **THEN** the avatar color, icon, and power readout still reflect the new state on the next render flush (via reactive reads of `state` directly, not via stale `onOffState`)

### Requirement: Teardown deregisters the transport

Upon the Floorplan's `beforeDestroy`, if `this.sseHandle` is non-null, the Floorplan SHALL call `SseClient.getInstance().unregisterTransport(this.sseHandle)` and set `this.sseHandle = null`. The Floorplan MUST NOT leak transports across route changes or component destruction.

#### Scenario: Route change away from Floorplan
- **WHEN** the user navigates away from the Floorplan and the component is destroyed
- **THEN** `unregisterTransport` is called with the stored handle
- **AND** `this.sseHandle` becomes `null`

#### Scenario: Destroy before initial transport handle resolves
- **WHEN** the component is destroyed before the `registerTransport` Promise has resolved (i.e., `this.sseHandle` is still `null`)
- **THEN** no `unregisterTransport` call is attempted and no error is thrown

### Requirement: Diagnostic logging for live updates (opt-in)

The Floorplan MUST include a module-local, opt-in debug flag (e.g., `DEBUG_TRANSPORTS`) that, when enabled, logs per-transport-update at `console.debug` level with at least: the incoming batch's triple count, each triple's `(applianceId, path, value, representsGroups)`, whether `appMap.get(applianceId)` resolved to an appliance, and the `sseHandle.id`. The flag MUST default to `false`. When the flag is `false` there MUST be no runtime logging overhead beyond a single boolean check.

#### Scenario: Flag off (default)
- **WHEN** `DEBUG_TRANSPORTS === false` and transport-updates arrive
- **THEN** no `console.debug` lines are emitted

#### Scenario: Flag on during diagnosis
- **WHEN** a developer flips `DEBUG_TRANSPORTS` to `true` and a transport-update arrives
- **THEN** one `console.debug` line is emitted per batch summarizing the payload and handle
- **AND** each triple's resolution (matched appliance vs. unknown `applianceId`) is visible in the log
