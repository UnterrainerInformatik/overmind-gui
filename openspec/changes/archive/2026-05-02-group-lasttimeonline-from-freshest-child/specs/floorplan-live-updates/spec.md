## MODIFIED Requirements

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

## ADDED Requirements

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
