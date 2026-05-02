## MODIFIED Requirements

### Requirement: Transport selection includes the staleness keep-alive path

When the Floorplan builds the `selection.perAppliance` for `SseClient.getInstance().registerTransport(...)`, the `paths` array for **every** appliance the Floorplan renders MUST include `'lastTimeOnline'` — regardless of whether the appliance's `type` has a per-type entry in `overmindUtils.COMPACT_PATHS`. This includes appliances whose `addOnOffStateTo` branch can paint `'error'` from a stale or missing `lastTimeOnline` (every appliance type currently handled by `overmindUtils.addOnOffStateTo`: `PLUG`, `RELAY`, `RELAY_DUAL`, `DIMMER`, `BULB_RGB`, `HT`, `MOTION_SENSOR`, `CONTACT_SENSOR`, `OCCUPANCY_SENSOR`), AND appliances whose `type` is `NULL`, `undefined`, or any value not enumerated by `COMPACT_PATHS`. The staleness check (`overmindUtils.ts:245-249`, threshold = `2 min` for `batteryDriven !== 1`, `24h` otherwise) MUST NOT trip while the appliance is in fact online and the backend is emitting `lastTimeOnline` heartbeats.

`overmindUtils.pathsForApplianceType(type, 'compact')` SHALL return `['lastTimeOnline']` (rather than `[]`) for any `type` not present in `COMPACT_PATHS`, so that the universal floor is enforced from the helper itself rather than relying on every call site to remember it. The `'detail'` usage SHALL similarly return `['**']` for unknown types — matching the broad-subscription pattern used for every known type in `DETAIL_PATHS`.

The Floorplan's `transport-update` writer (`Floorplan.vue:884`) already handles `path === 'lastTimeOnline'` by reactively setting `targetApp.lastTimeOnline` (it is an appliance-level field, not nested under `state`). Group routing (`Floorplan.vue:931-940`) already mirrors non-power paths from primary children to the containing groups, so a group's own `lastTimeOnline` is kept fresh through the same mechanism that mirrors `relays[0].state`.

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

#### Scenario: Group inherits keep-alive from its primary child
- **WHEN** a `GROUP_PARALLEL` / `GROUP_SERIAL` is on the Floorplan, with a primary child whose subscription includes `'lastTimeOnline'`
- **AND** the backend emits a transport-update with `(primaryChildId, 'lastTimeOnline', '<iso>')` whose `representsGroups` may or may not list the group
- **THEN** both the primary child's reactive `app.lastTimeOnline` and the containing group's reactive `app.lastTimeOnline` are updated to the new value (the child via the direct write at `Floorplan.vue:903`, the group via either the `representsGroups` mirror at `Floorplan.vue:904-908` or the primary-child mirror at `Floorplan.vue:931-940`)
- **AND** the group does not flip to `'error'` from staleness while its primary child is online

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
