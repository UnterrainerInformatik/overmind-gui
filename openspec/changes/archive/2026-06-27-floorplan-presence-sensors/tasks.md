## 1. Subscription paths & type

- [x] 1.1 In `src/utils/overmindUtils.ts`: extend the `ApplianceType` union with `'OCCUPANCY_SENSOR'`.
- [x] 1.2 Add `OCCUPANCY_SENSOR: ['presences[0].presence', 'presences[0].objects']` to `COMPACT_PATHS`.
- [x] 1.3 Add `OCCUPANCY_SENSOR: ['**']` to `DETAIL_PATHS`.
- [x] 1.4 Optional but recommended (design D8 / open question 2): extend `addOnOffStateTo` with an `OCCUPANCY_SENSOR` branch that maps `state.presences[0].presence` to `'on' | 'off' | 'error'`, mirroring the `MOTION_SENSOR` branch.
- [x] 1.5 Optional: extend `getIconFor` to return `'sensor_occupied'` for `'OCCUPANCY_SENSOR'`.

## 2. Sensor orientation map

- [x] 2.1 Create `src/lib/presence/sensorOrientation.ts` exporting `SENSOR_ORIENTATION: Record<number, { yawDeg: number; pxPerMeter: number }>` (initially empty) and `DEFAULT_ORIENTATION = { yawDeg: 0, pxPerMeter: 40 }`.
- [x] 2.2 Export a small helper `orientationFor(applianceId: number)` that returns the entry or `DEFAULT_ORIENTATION` and logs a console warning the first time a fallback is taken per id (use a module-level `Set<number>` to deduplicate).

## 3. Floorplan extension — point overlay

- [x] 3.1 In `Floorplan.vue`, add a `computed` (or method) `presencePointsFor(area)` that returns an array of `{ id, leftPx, topPx }` for every entry in `appFor(area.appId)?.state?.presences?.[0]?.objects ?? []`, applying the affine transform `iconPos + Rz(yawDeg) · (sx, sy) · pxPerMeter` (see design §D5). Plan-Y orientation must match `iconPos`'s convention (verify against existing icon rendering).
- [x] 3.2 In the template, inside the existing `loaded` block, add a render loop that — only for areas whose appliance has `usageType === 'OCCUPANCY_SENSOR'` — emits one absolutely-positioned point per entry from `presencePointsFor(area)`. Position styling follows the same pattern as existing icons (`top: ${pt.topPx * scale}px; left: ${pt.leftPx * scale}px`).
- [x] 3.3 Pick a visual: small filled circle (e.g. `<v-icon size="14 * scale" color="rgba(255,80,80,0.9)">circle</v-icon>` or a styled `<div>`). Keep `pointer-events: none` so it doesn't interfere with the existing area click-handlers.
- [x] 3.4 Verify the existing transport-registration loop now picks up `OCCUPANCY_SENSOR` automatically via the new `pathsForApplianceType` entry (no code change needed here — sanity check only).

## 4. KioskPresence view (clone of KioskLights)

- [x] 4.1 Create `src/views/KioskPresence.vue` as a structural 1:1 copy of `src/views/KioskLights.vue`.
- [x] 4.2 Change `name: 'kioskLights'` → `'kioskPresence'`, `icon="lightbulb"` → `icon="sensor_occupied"`, and `:applianceTypeFilter="['LIGHT']"` → `:applianceTypeFilter="['OCCUPANCY_SENSOR']"`. Remove the `data().areas` placeholder entries (or keep them empty, mirroring `KioskMovement.vue`).
- [x] 4.3 Keep `KioskLinkPanel` and `KioskTogglePanel` exactly as in `KioskLights.vue`.

## 5. Routing & navigation

- [x] 5.1 Add route `/app/kioskpresence` (name `kioskPresence`) to `src/router/index.ts`, lazy-importing `KioskPresence.vue`.
- [x] 5.2 Add a NavDrawer entry pointing to that route, labelled via `page.kiosk.presence.title`.

## 6. i18n

- [x] 6.1 Add `page.kiosk.presence.title` to `src/locales/de/page.json` and the English equivalent.

## 7. Manual verification

- [ ] 7.1 With at least one Shelly G4 and one Apollo MTR-1 placed via the Plan-Editor (so `iconPos` and `imgMapCoords` exist) and an entry in `sensorOrientation.ts`, walk in front of each sensor and confirm a point appears in the correct room with correct lateral direction. Adjust `yawDeg` until the +y axis of the sensor matches reality.
- [ ] 7.2 Confirm that — without an entry — the point still renders (using `DEFAULT_ORIENTATION`) and a single console warning is emitted.
- [ ] 7.3 Confirm reactivity: a freshly tracked target (new `objects` index) renders without a page reload.
- [ ] 7.4 Confirm the view runs on tablet, mobile, and PC layouts (kiosk mode) — same envelope as `KioskLights`.
- [ ] 7.5 In DevTools network tab: confirm one `/sse/transports/register` POST on mount that now includes `OCCUPANCY_SENSOR` appliances with `paths: ['presences[0].presence', 'presences[0].objects']`, and zero `POST /execute` requests against any such appliance.
