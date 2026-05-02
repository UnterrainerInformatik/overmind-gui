## ADDED Requirements

### Requirement: Transport selection includes the staleness keep-alive path

When the Floorplan builds the `selection.perAppliance` for `SseClient.getInstance().registerTransport(...)`, the `paths` array for every appliance whose `addOnOffStateTo` branch can paint `'error'` from a stale or missing `lastTimeOnline` (i.e., every appliance type currently handled by `overmindUtils.addOnOffStateTo`: `PLUG`, `RELAY`, `RELAY_DUAL`, `DIMMER`, `BULB_RGB`, `HT`, `MOTION_SENSOR`, `CONTACT_SENSOR`, `OCCUPANCY_SENSOR`) MUST include `'lastTimeOnline'`. This ensures the backend emits keep-alive transport-updates for the appliance-level `lastTimeOnline` field, so the frontend's staleness check (`overmindUtils.ts:245-249`, threshold = `2 min` for `batteryDriven !== 1`, `24h` otherwise) does not trip while the appliance is in fact online.

The Floorplan's `transport-update` writer (`Floorplan.vue:864-880`) already handles `path === 'lastTimeOnline'` by reactively setting `targetApp.lastTimeOnline` (it is an appliance-level field, not nested under `state`). Group routing (`Floorplan.vue:931-940`) already mirrors non-power paths from primary children to the containing groups, so a group's own `lastTimeOnline` is kept fresh through the same mechanism that mirrors `relays[0].state`.

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

#### Scenario: Appliance whose type has no other compact paths today
- **WHEN** the COMPACT_PATHS table is amended so an entry would otherwise be empty if `lastTimeOnline` were the only path
- **THEN** the entry MUST still include `'lastTimeOnline'` and any other behavior-driving paths the type needs
- **AND** the existing Floorplan guard `if (paths.length === 0) continue` (`Floorplan.vue:856-858`) MUST NOT cause that appliance to be skipped from the subscription on account of `'lastTimeOnline'` being its only path

#### Scenario: DETAIL_PATHS coverage is unchanged
- **WHEN** a consumer requests `pathsForApplianceType(type, 'detail')` for any of the listed appliance types
- **THEN** the returned paths still cover `lastTimeOnline` (today via `'**'`), so detail-mode consumers continue to receive keep-alives without further change
