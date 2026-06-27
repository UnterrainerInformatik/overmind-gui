## ADDED Requirements

### Requirement: Reuse of existing Floorplan component

The presence-sensor visualisation SHALL be implemented by extending `src/components/floorplan/Floorplan.vue`, not by introducing a new floorplan component. No tabs, no floor selector, and no new layout type SHALL be added; floor switching continues to work via the existing `$store.state.gui.floorplan` mechanism that all `Kiosk*` views use.

#### Scenario: No new floorplan component

- **WHEN** the change is implemented
- **THEN** there is no new file under `src/components/floorplan/` that re-implements the floorplan rendering
- **AND** the presence-point rendering lives inside `Floorplan.vue`

#### Scenario: No tabs in presence view

- **WHEN** `KioskPresence.vue` is rendered
- **THEN** it contains no tab/segment control for selecting floors

### Requirement: KioskPresence view mirrors KioskLights structure

`src/views/KioskPresence.vue` SHALL be a structural 1:1 clone of `src/views/KioskLights.vue`: same `<v-container>` wrapper, same `<Floorplan>` instantiation pattern with colour props, same `KioskLinkPanel` back-link to `/app/kioskoverview`, same `KioskTogglePanel` controlling `displayEnhancedDialog`, and the same `mounted()` call to `kioskMode(true)`.

#### Scenario: Filter prop

- **WHEN** `KioskPresence.vue` instantiates `<Floorplan>`
- **THEN** it passes `:applianceTypeFilter="['OCCUPANCY_SENSOR']"`
- **AND** does not pass a `classFqnFilter`

#### Scenario: Layout parity with Lights

- **WHEN** `KioskPresence.vue` is compared structurally to `KioskLights.vue`
- **THEN** the template tree (root `<div class="home">`, `<v-container>`, child component order) matches; only the `applianceTypeFilter`, the `icon` prop, and the i18n title differ

### Requirement: Routing and navigation

A new lazy-loaded route `/app/kioskpresence` named `kioskPresence` SHALL be added to `src/router/index.ts`, and the navigation drawer SHALL link to it.

#### Scenario: Route is registered

- **WHEN** the user navigates to `/app/kioskpresence`
- **THEN** the router renders `KioskPresence.vue`

#### Scenario: Drawer entry exists

- **WHEN** the navigation drawer is opened
- **THEN** an entry labelled with `page.kiosk.presence.title` links to `/app/kioskpresence`

### Requirement: Live target points rendered by Floorplan

For every appliance whose `usageType === 'OCCUPANCY_SENSOR'` is placed on the active floor, `Floorplan.vue` SHALL render one absolutely-positioned point overlay per entry in `state.presences[0].objects[]`, transformed from sensor-local metres into plan pixels using the appliance's `iconPos` and the per-appliance `{ yawDeg, pxPerMeter }` from `src/lib/presence/sensorOrientation.ts`.

#### Scenario: Single target

- **WHEN** the SSE stream reports `objects: [{ id: 1, x: 1.0, y: 2.0 }]` for a sensor whose `iconPos = [100, 200]` and orientation entry is `{ yawDeg: 0, pxPerMeter: 40 }`
- **THEN** exactly one point overlay is rendered at plan-pixel coordinates derived from `(100 + 1.0·40, 200 + 2.0·40)` (with the project's plan-Y orientation applied consistently with `iconPos`), scaled by the floorplan's `scale` factor

#### Scenario: Multiple targets

- **WHEN** `objects` contains three entries
- **THEN** three point overlays are rendered, one per entry

#### Scenario: Target leaves

- **WHEN** an `objects` entry from the previous frame is no longer present in the next frame
- **THEN** its point overlay disappears within one render cycle

#### Scenario: Cross-vendor parity

- **WHEN** Shelly Presence Gen4 and Apollo MTR-1 appliances both have placed entries
- **THEN** their target points are rendered through the same code path, with no vendor-specific branching beyond reading the same `presences[0].objects[]` paths

#### Scenario: Z fields are ignored

- **WHEN** a Shelly target carries non-null `z`, `minZ`, `maxZ`
- **THEN** those fields do NOT influence the rendered point

### Requirement: Footprint comes from existing imgMapCoords polygon

The presence-sensor footprint on the plan SHALL be the existing `imgMapCoords` polygon that `Floorplan.vue` already draws for every placed appliance. No new coverage-cone polygon SHALL be computed or rendered.

#### Scenario: No coverage-cone module

- **WHEN** the change is implemented
- **THEN** there is no module computing footprint polygons from `(ceilingHeight, hAngle, vAngle, range)`
- **AND** ceiling-height constants are not introduced anywhere in the frontend

#### Scenario: Admin-drawn polygon is the footprint

- **WHEN** an `OCCUPANCY_SENSOR` appliance is placed with `imgMapCoords`
- **THEN** that polygon is the footprint shown in the view, identically to how Floorplan handles all other sensor types

### Requirement: SSE subscription via pathsForApplianceType

`src/utils/overmindUtils.ts` SHALL declare presence subscription paths for the new `OCCUPANCY_SENSOR` type so that `Floorplan.vue`'s existing transport-registration loop subscribes automatically without any presence-specific code in `Floorplan.vue`'s mount logic.

#### Scenario: COMPACT_PATHS entry

- **WHEN** `pathsForApplianceType('OCCUPANCY_SENSOR', 'compact')` is called
- **THEN** it returns `['presences[0].presence', 'presences[0].objects']`

#### Scenario: DETAIL_PATHS entry

- **WHEN** `pathsForApplianceType('OCCUPANCY_SENSOR', 'detail')` is called
- **THEN** it returns `['**']`

#### Scenario: ApplianceType union

- **WHEN** the `ApplianceType` type alias is inspected
- **THEN** it includes the literal `'OCCUPANCY_SENSOR'`

### Requirement: Reactive writes via setPathValue

The transport-update path-walk MUST continue to use `setPathValue` from `overmindUtils.ts` (which uses `Vue.set` for every dynamic hop) so that a freshly tracked target — i.e. a previously unseen index in `presences[0].objects` — is reactive without any additional code.

#### Scenario: New target appears

- **WHEN** a `transport-update` adds a previously unseen index to `presences[0].objects` for an `OCCUPANCY_SENSOR` appliance
- **THEN** the new entry is reactive and triggers a re-render of the point layer without a manual `Vue.set` call in `Floorplan.vue`

### Requirement: Sensor orientation map in frontend

`src/lib/presence/sensorOrientation.ts` SHALL export a `Record<number, { yawDeg: number; pxPerMeter: number }>` keyed by appliance id, plus a `DEFAULT_ORIENTATION` constant. When an `OCCUPANCY_SENSOR` appliance has no entry, the default SHALL be used and a console warning SHALL be emitted (once per appliance id per session).

#### Scenario: Known appliance

- **WHEN** appliance id 206 has an entry `{ yawDeg: 90, pxPerMeter: 50 }`
- **THEN** that orientation is used for projecting its targets

#### Scenario: Unknown appliance falls back to default

- **WHEN** appliance id 999 (`OCCUPANCY_SENSOR`) has no entry in `sensorOrientation.ts`
- **THEN** `DEFAULT_ORIENTATION` is used
- **AND** a console warning is emitted exactly once per session for that id

### Requirement: Read-only

The view and the presence overlay MUST NOT issue any write operations against `OCCUPANCY_SENSOR` appliances (no `POST /execute`, no config writes).

#### Scenario: No execute calls

- **WHEN** the user interacts with the view (clicks, taps, opens dialogs)
- **THEN** no `POST /execute` request is sent to any `OCCUPANCY_SENSOR` appliance
