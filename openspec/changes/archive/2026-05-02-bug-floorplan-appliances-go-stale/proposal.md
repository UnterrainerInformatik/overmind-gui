## Why

On the Floorplan view, every plain (non-batteryDriven) appliance turns red ("error") on screen as soon as the page has been open longer than the staleness window — currently **2 minutes** for non-batteryDriven appliances (`src/utils/overmindUtils.ts:245-249`). This is most visible on the lights panel (PLUG / RELAY / DIMMER / BULB_RGB), which line operators in Kiosk mode keep open for hours. Motion / contact / HT panels mask the bug because those types are `batteryDriven === 1`, which gives them a 24h tolerance.

Root cause: the SSE transport subscription paths exposed by `pathsForApplianceType(type, 'compact')` (`src/utils/overmindUtils.ts:16-26`) include `lastTimeOnline` **only** for `OCCUPANCY_SENSOR`. For every other appliance type the backend therefore never emits keep-alive updates for `lastTimeOnline`, so the frontend's `item.lastTimeOnline` stays frozen at the value baked in at REST load and the staleness check trips after the first 2 minutes — even though the appliance is online and emitting normal `relays[*].state` / `relays[*].power` updates.

The frontend is otherwise ready for this: `Floorplan.vue:872-873` already special-cases `path === 'lastTimeOnline'` in the transport-update writer and writes it to the appliance via `this.$set(targetApp, 'lastTimeOnline', value)`. The fix is purely on the subscription side: ask for the path so the backend will send it.

## What Changes

- Append `'lastTimeOnline'` to every entry in `COMPACT_PATHS` in `src/utils/overmindUtils.ts` (PLUG, RELAY, RELAY_DUAL, DIMMER, BULB_RGB, HT, MOTION_SENSOR, CONTACT_SENSOR — `OCCUPANCY_SENSOR` already includes it). `DETAIL_PATHS` already covers it via `'**'`.
- No change to the existing `Floorplan.vue` transport-update handler — the `lastTimeOnline` branch (`Floorplan.vue:872-873`) already writes the field reactively and the group-routing branch already mirrors non-power paths from primary children (`Floorplan.vue:931-940`), which covers the group case.
- Update the `floorplan-live-updates` spec to require that the transport subscription includes the staleness keep-alive path for every appliance type whose `addOnOffStateTo` branch can paint `'error'` from `lastTimeOnline` — i.e., every type that flows through `overmindUtils.addOnOffStateTo`.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `floorplan-live-updates`: add a new requirement that the per-appliance `paths` selection MUST cover the staleness keep-alive (`lastTimeOnline`) so the rendered appliance does not flip to `'error'` while it is in fact online and reporting other values.

## Impact

- **Code**: `src/utils/overmindUtils.ts` — eight `COMPACT_PATHS` entries gain `'lastTimeOnline'`. No other code change. The Floorplan handler, the SSE client, and the staleness check itself stay as-is.
- **Specs**: delta on `openspec/specs/floorplan-live-updates/spec.md` (one ADDED Requirement).
- **Backend contract**: the backend already supports a `lastTimeOnline` path on transport-update (it's how `OCCUPANCY_SENSOR` works today); no backend change needed.
- **Network / runtime**: one additional path per appliance in the SSE `selection.perAppliance.paths`. The transport coalesces at `minInterval: 1000ms`, so practical traffic delta is bounded by the keep-alive cadence the backend already emits for occupancy sensors.
- **Views affected**: Floorplan on all form factors (tablet, mobile, PC, including Kiosk* views). `Appliances.vue` also uses compact paths (`src/views/Appliances.vue:85`) and benefits incidentally — its panels show "Last Time Online" too.
- **Dependencies**: none.
- **Migration**: none. Pure additive subscription change.
