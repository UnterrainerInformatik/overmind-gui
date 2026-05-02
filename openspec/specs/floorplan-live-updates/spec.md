# floorplan-live-updates Specification

## Purpose

How the Floorplan view (`src/components/floorplan/Floorplan.vue`) subscribes to SSE transports and applies `transport-update` payloads into the per-appliance reactive state that drives on/off icons, avatar colors, and power readings. Covers plain (non-group) appliances, group children (power aggregation + state mirroring), and repeated-toggle behavior within a single session. Introduced by the `bug-updates-on-floorplan-not-working` change on 2026-04-19.
## Requirements
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

### Requirement: Transport selection includes the staleness keep-alive path

When the Floorplan builds the `selection.perAppliance` for `SseClient.getInstance().registerTransport(...)`, the `paths` array for **every** appliance the Floorplan renders MUST include `'lastTimeOnline'` — regardless of whether the appliance's `type` has a per-type entry in `overmindUtils.COMPACT_PATHS`. This includes appliances whose `addOnOffStateTo` branch can paint `'error'` from a stale or missing `lastTimeOnline` (every appliance type currently handled by `overmindUtils.addOnOffStateTo`: `PLUG`, `RELAY`, `RELAY_DUAL`, `DIMMER`, `BULB_RGB`, `HT`, `MOTION_SENSOR`, `CONTACT_SENSOR`, `OCCUPANCY_SENSOR`), AND appliances whose `type` is `NULL`, `undefined`, or any value not enumerated by `COMPACT_PATHS`. The staleness check (`overmindUtils.ts:245-249`, threshold = `2 min` for `batteryDriven !== 1`, `24h` otherwise) MUST NOT trip while the appliance is in fact online and the backend is emitting `lastTimeOnline` heartbeats.

`overmindUtils.pathsForApplianceType(type, 'compact')` SHALL return `['lastTimeOnline']` (rather than `[]`) for any `type` not present in `COMPACT_PATHS`, so that the universal floor is enforced from the helper itself rather than relying on every call site to remember it. The `'detail'` usage SHALL similarly return `['**']` for unknown types — matching the broad-subscription pattern used for every known type in `DETAIL_PATHS`.

The Floorplan's `transport-update` writer (`Floorplan.vue:884`) already handles `path === 'lastTimeOnline'` by reactively setting `targetApp.lastTimeOnline` (it is an appliance-level field, not nested under `state`). For groups (`GROUP_PARALLEL` / `GROUP_SERIAL`), `lastTimeOnline` is special-cased: it is mirrored to a group from **any** of its children whose subscription delivers a heartbeat, with a newer-wins guard so out-of-order heartbeats from less-recent children do not regress the group's stored value. Other non-aggregate paths (e.g. `state.relays[0].state`) continue to mirror from the **primary child only**, preserving the display-uniformity contract.

#### Scenario: Plain PLUG / RELAY / DIMMER / BULB_RGB stays online over a long session
- **WHEN** the Floorplan is open for longer than the non-batteryDriven staleness window (>2 minutes), the appliance is online, and the backend keeps emitting `lastTimeOnline` keep-alives on the registered transport
- **THEN** the per-appliance `paths` for that PLUG / RELAY / DIMMER / BULB_RGB in the SSE selection includes `'lastTimeOnline'`
- **AND** the appliance's reactive `app.lastTimeOnline` advances each time a keep-alive arrives
- **AND** `overmindUtils.addOnOffStateTo` does not assign `'error'` to `app.onOffState` for that appliance during the session
- **AND** the Floorplan does not paint the appliance red (`isError(area)` keeps returning `false`)

#### Scenario: HT panel stays online over a long session
- **WHEN** an HT (temperature/humidity) appliance is on the Floorplan and the page has been open for hours
- **THEN** the per-appliance `paths` for that HT in the SSE selection includes `'lastTimeOnline'`
- **AND** the HT's avatar continues to render its temperature-derived color and does not flip to `'error'` from staleness alone

#### Scenario: Battery-driven sensor (MOTION / CONTACT / OCCUPANCY) keeps its existing 24h tolerance
- **WHEN** a battery-driven sensor is on the Floorplan
- **THEN** the per-appliance `paths` in the SSE selection includes `'lastTimeOnline'`
- **AND** the staleness threshold for this appliance remains `24 * 60` minutes (driven by `item.batteryDriven === 1`), not `2`
- **AND** the appliance is painted `'error'` only if `lastTimeOnline` is older than 24h or absent

#### Scenario: Group inherits keep-alive from its freshest child
- **WHEN** a `GROUP_PARALLEL` / `GROUP_SERIAL` is on the Floorplan with multiple children, and the backend emits a transport-update with `(childId, 'lastTimeOnline', '<iso>')` from any one of them
- **AND** the incoming `<iso>` is newer than the group's current reactive `app.lastTimeOnline`
- **THEN** the child's reactive `app.lastTimeOnline` is updated to the new value via the direct write at the transport-update writer
- **AND** the containing group's reactive `app.lastTimeOnline` is also updated to the new value via the `anyChildToGroupIds` mirror — regardless of whether `childId` is the group's primary child
- **AND** if the incoming `<iso>` is OLDER than the group's current `app.lastTimeOnline`, the group's value is NOT regressed (newer-wins guard)
- **AND** the group does not flip to `'error'` from staleness while any of its children is online

#### Scenario: Untyped appliance receives lastTimeOnline keep-alives
- **WHEN** an appliance whose `type` is `NULL`, `undefined`, or unrecognised by `COMPACT_PATHS` is rendered on the Floorplan (e.g. appliance 177 — Solax X3-G4-15 Inverter, `classFqn: SolaxX3G4Appliance`, `type: NULL`)
- **THEN** the per-appliance `paths` for that appliance in the SSE selection is `['lastTimeOnline']` (the universal floor, not `[]`)
- **AND** the appliance is included in `selection.perAppliance` rather than dropped by the empty-paths guard
- **AND** when the backend emits a transport-update with `(applianceId, 'lastTimeOnline', '<iso>')`, the appliance's reactive `app.lastTimeOnline` advances to the new value
- **AND** after >2 minutes of session time the appliance does NOT flip to `'error'` from staleness alone (the staleness gate sees fresh `lastTimeOnline` updates)

#### Scenario: pathsForApplianceType returns the universal floor for unknown compact types
- **WHEN** a caller invokes `pathsForApplianceType(type, 'compact')` with a `type` that is not a key in `COMPACT_PATHS` (including `NULL`, `undefined`, and arbitrary strings)
- **THEN** the function returns `['lastTimeOnline']` (a single-element array)
- **AND** it does NOT return `[]`

#### Scenario: pathsForApplianceType returns `['**']` for unknown detail types
- **WHEN** a caller invokes `pathsForApplianceType(type, 'detail')` with a `type` that is not a key in `DETAIL_PATHS`
- **THEN** the function returns `['**']` (matching the broad-subscription pattern every known type already uses in detail mode)
- **AND** it does NOT return `[]`

#### Scenario: Empty-paths guards in callers stay as defensive code
- **WHEN** the call sites at `Floorplan.vue:920-922` and `Appliances.vue:88-90` filter / continue on `paths.length === 0`
- **THEN** for typical inputs (any appliance type, including `NULL`), the guards no longer drop the appliance, because `pathsForApplianceType` no longer returns `[]`
- **AND** the guards are kept in place as defensive code with no behaviour change

#### Scenario: Appliance whose type has no other compact paths today
- **WHEN** the COMPACT_PATHS table is amended so an entry would otherwise be empty if `lastTimeOnline` were the only path
- **THEN** the entry MUST still include `'lastTimeOnline'` and any other behavior-driving paths the type needs
- **AND** the existing Floorplan guard `if (paths.length === 0) continue` (`Floorplan.vue:920-922`) MUST NOT cause that appliance to be skipped from the subscription on account of `'lastTimeOnline'` being its only path

#### Scenario: DETAIL_PATHS coverage is unchanged for known types
- **WHEN** a consumer requests `pathsForApplianceType(type, 'detail')` for any of the listed appliance types
- **THEN** the returned paths still cover `lastTimeOnline` (today via `'**'`), so detail-mode consumers continue to receive keep-alives without further change

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

### Requirement: onOffState derivation for RELAY-family appliances without relay state

For an appliance whose `type` is one of `PLUG`, `RELAY`, `DIMMER`, or `BULB_RGB`, the `overmindUtils.addOnOffStateTo` function SHALL classify `onOffState` as follows, in this order, after the staleness gate (`lastTimeOnline` check) has passed:

1. If `state.relays[0].state` is present (a non-empty string), `onOffState` SHALL be derived from it: `state.relays[0].state.toLowerCase() === 'on'` → `'on'`, otherwise `'off'`.
2. Else, if at least one entry in `state.relays[*].power` is a numeric value, `onOffState` SHALL be derived from the sum across all reported `power` entries: total `> 0` → `'on'`, otherwise `'off'`.
3. Else, `onOffState` SHALL be set to `'error'`.

The function MUST NOT contain any early-return that leaves `onOffState` untouched in this branch. In particular, the previous `iconPos1`-gated `return item.state[item.iconPos1] > 0` (which discarded a stray boolean from a `void` function and silently masked the error path) MUST be removed.

The staleness gate (`!item.lastTimeOnline || (now - lastTimeOnline) > staleMinutes`, with `staleMinutes = 24h` if `batteryDriven === 1` else `2min`) is unchanged and continues to win over rules 1–3 when it fires.

#### Scenario: RELAY-typed energy-meter with no relay state but flowing power

- **WHEN** an appliance has `type: 'RELAY'`, `state.relays[0].state` is absent, `state.relays[*].power` reports numeric values, and `lastTimeOnline` is fresh
- **THEN** `addOnOffStateTo` sets `onOffState` to `'on'` if the summed power is `> 0`, otherwise `'off'`
- **AND** `onOffState` is NOT set to `'error'`
- **AND** the Floorplan renders the appliance with its normal avatar (not the red bolt) and shows its wattage when on

#### Scenario: RELAY-typed switch with relay state present

- **WHEN** an appliance has `type: 'RELAY'`, `state.relays[0].state === 'on'`, and `lastTimeOnline` is fresh
- **THEN** `addOnOffStateTo` sets `onOffState` to `'on'` (relay-state takes precedence over the new power-derived rule)
- **AND** the wattage display continues to work via the existing `getPowerOf` path

#### Scenario: RELAY-typed appliance with neither relay state nor any power reading

- **WHEN** an appliance has `type: 'RELAY'`, `state.relays` is missing or empty, and no `power` value is reported on any relay
- **THEN** `addOnOffStateTo` sets `onOffState` to `'error'`
- **AND** the Floorplan renders the red bolt avatar (genuinely "no information to display" case)

#### Scenario: iconPos1 must not affect onOffState classification

- **WHEN** two appliances have identical `type`, identical `state` (no `relays[0].state`, no relay power), and differ only in whether `iconPos1` is set
- **THEN** both appliances receive the same `onOffState` (in this case, `'error'`)
- **AND** neither appliance's `onOffState` is left at its previous value due to the deleted `iconPos1`-gated early-return

#### Scenario: Stale lastTimeOnline still produces error regardless of power

- **WHEN** an appliance has `type: 'RELAY'`, `state.relays[*].power` is fresh and non-zero, but `lastTimeOnline` is older than the staleness threshold
- **THEN** `addOnOffStateTo` sets `onOffState` to `'error'` (the staleness gate runs first and is authoritative)

#### Scenario: Same rules apply to PLUG, DIMMER, and BULB_RGB types

- **WHEN** an appliance's `type` is `PLUG`, `DIMMER`, or `BULB_RGB` and its `state.relays[0].state` is absent but `state.relays[*].power` reports a numeric value
- **THEN** `onOffState` is derived from summed power exactly as for `RELAY` (the rule is type-uniform across the four PLUG/RELAY-family types)

### Requirement: lastTimeOnline writes from the SSE transport never regress to a falsy value

The Floorplan's `transport-update` writer (`Floorplan.vue:936-939`, the `writePath` helper) handles `path === 'lastTimeOnline'` as a special case. When the incoming `value` is falsy (`null`, `undefined`, `''`, or `0`), the writer MUST NOT call `Vue.set(targetApp, 'lastTimeOnline', value)`. The appliance's existing `lastTimeOnline` MUST be preserved.

This guards against the backend re-emitting an appliance's stored NULL `lastTimeOnline` on the initial transport-update batch (in particular for `GROUP_PARALLEL` / `GROUP_SERIAL` rows whose own `lastTimeOnline` column is empty), which would otherwise wipe the freshest-child value computed at register-time and flip the group to `'error'` for several seconds until a real child heartbeat arrives via `representsGroups` or the `anyChildToGroupIds` mirror.

A non-empty `lastTimeOnline` value (any truthy string) MUST continue to write through, allowing real heartbeats to advance the appliance's reactive state.

#### Scenario: Backend emits NULL lastTimeOnline for a group on the initial SSE batch
- **WHEN** the Floorplan has registered its SSE transport, the group's reactive `app.lastTimeOnline` was set to a freshest-child value at REST resolve, and the backend's initial transport-update batch includes a triple `(groupId, 'lastTimeOnline', null)`
- **THEN** `writePath` does NOT overwrite the group's `app.lastTimeOnline` to `null`
- **AND** the group's reactive `app.lastTimeOnline` retains the freshest-child value
- **AND** `addOnOffStateTo` does NOT set the group's `onOffState` to `'error'` on the next redraw
- **AND** the group avatar does not flash red on initial page load

#### Scenario: A real heartbeat with a non-null timestamp still writes through
- **WHEN** a transport-update arrives with `(applianceId, 'lastTimeOnline', '<iso-string>')` where the iso-string is a non-empty string
- **THEN** `writePath` sets `app.lastTimeOnline` to the new value via `Vue.set`
- **AND** the appliance's reactive `app.lastTimeOnline` advances normally

#### Scenario: Empty-string lastTimeOnline is treated as falsy
- **WHEN** a transport-update arrives with `(applianceId, 'lastTimeOnline', '')`
- **THEN** `writePath` does NOT overwrite `app.lastTimeOnline`
- **AND** the appliance's existing value is preserved

### Requirement: Group lastTimeOnline at initial REST resolve uses the freshest child

When the Floorplan loads appliances via REST in `getAppliances` and resolves a `GROUP_PARALLEL` / `GROUP_SERIAL` appliance via its `config.applianceIds`, the resolver SHALL iterate ALL children (not stop after the first), fetch each child via `appliancesService.getById`, and set the group's `lastTimeOnline` to the **maximum** value across all children's `lastTimeOnline` (newest wins; missing/empty values from individual children are ignored).

The other inherited fields — `state`, `type`, `classFqn`, `lastTimeSetup` — SHALL continue to come from the **first child only**, preserving the existing display-uniformity contract that "a group is rendered as if it were its first child". Only the staleness-signal field (`lastTimeOnline`) is derived from the freshest child.

ISO-8601 timestamps without a `Z` suffix (the project's backend convention) MAY be compared as strings (lexicographic order matches chronological order for fixed-width ISO strings); a `new Date(...)` parse is not required for the comparison.

#### Scenario: Group with stale first child but fresh other children renders correctly on initial load
- **WHEN** the Floorplan mounts and `getAppliances` returns a `GROUP_PARALLEL` whose `config.applianceIds` lists three children
- **AND** the first child's `lastTimeOnline` is older than the staleness threshold (e.g. 5 minutes ago)
- **AND** the second child's `lastTimeOnline` is fresh (e.g. 10 seconds ago)
- **THEN** the group's reactive `app.lastTimeOnline` after resolve is the second child's value (the freshest)
- **AND** `overmindUtils.addOnOffStateTo` does NOT assign `'error'` to `app.onOffState` for that group
- **AND** the group's avatar renders normally on the first frame — no red flash

#### Scenario: Group with all stale children correctly flips to error on initial load
- **WHEN** the Floorplan mounts and resolves a group whose every child's `lastTimeOnline` is older than the staleness threshold
- **THEN** the group's reactive `app.lastTimeOnline` after resolve is the freshest of those values (still stale)
- **AND** `overmindUtils.addOnOffStateTo` assigns `'error'` to the group's `onOffState`
- **AND** the group's avatar renders red on the first frame (the gate fires correctly when it should)

#### Scenario: Group with one child whose lastTimeOnline is missing
- **WHEN** the Floorplan resolves a group where one child's REST snapshot has `lastTimeOnline === null` or the field is absent
- **THEN** the missing child is ignored when computing the freshest value
- **AND** the group's `lastTimeOnline` is the max across the remaining children
- **AND** if every child is missing `lastTimeOnline`, the group's `lastTimeOnline` is `null` and the staleness gate fires (correct behavior — no information to derive from)

#### Scenario: Display-uniformity fields are unchanged
- **WHEN** the Floorplan resolves a group via the freshest-child rule
- **THEN** `appliance.state`, `appliance.type`, `appliance.classFqn`, and `appliance.lastTimeSetup` are still set from the FIRST child only
- **AND** the group's avatar / dialog renders using those first-child fields exactly as before this change

