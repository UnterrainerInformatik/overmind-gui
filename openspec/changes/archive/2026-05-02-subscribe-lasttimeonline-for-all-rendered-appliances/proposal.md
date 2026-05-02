## Why

`overmindUtils.pathsForApplianceType(type, 'compact')` returns `[]` for any `type` that's not in the hard-coded `COMPACT_PATHS` table — including `null`, `undefined`, and any unrecognised string. The Floorplan's mounted block (`Floorplan.vue:919-922`) and the Appliances list view (`Appliances.vue:88-90`) both then drop such appliances from `selection.perAppliance` via `if (paths.length === 0) continue` / `.filter(e => e.paths.length > 0)`. The dropped appliance is **never subscribed via SSE** — no `lastTimeOnline` keep-alives flow to the frontend.

Concretely, appliance 177 (Solax X3-G4-15 Inverter) has `type: NULL` (and `usageType: 'PLUG'`, which gets it onto KioskPlugs through the appliance-type filter). It renders an avatar via the existing flow but is silently excluded from the SSE selection. Two minutes after page load — the non-battery staleness threshold (`overmindUtils.ts:245-249`) — the cached `lastTimeOnline` ages out, `addOnOffStateTo` paints `'error'`, and the avatar flips to the red bolt. The backend continuously updates `lastTimeOnline` in the DB; the frontend never sees those updates.

This also means any future appliance class without a `COMPACT_PATHS` entry behaves the same way: visible on the Floorplan, subscribed to nothing, broken after 2 minutes. The existing `floorplan-live-updates` requirement "Transport selection includes the staleness keep-alive path" already mandates `lastTimeOnline` for every type whose `addOnOffStateTo` branch can paint `'error'` — but the current type list bounds it to nine known types. We need to extend that to **any** appliance the Floorplan (or Appliances list) actually renders.

## What Changes

- `pathsForApplianceType(type, 'compact')` SHALL return `['lastTimeOnline']` instead of `[]` when `type` is not present in `COMPACT_PATHS` (including `null`, `undefined`, and unrecognised strings). Known types continue to return their existing path lists unchanged.
- `pathsForApplianceType(type, 'detail')` SHALL return `['**']` instead of `[]` for unknown types — broad-subscription is the safer default for the detail-mode contract, and matches the `'**'` already used for every known type.
- `Floorplan.vue:919-922` and `Appliances.vue:88-90` are unchanged structurally — they continue to filter out empty `paths` arrays. After this change those filters never strip an enabled appliance, since `pathsForApplianceType` no longer returns `[]`. They stay as defensive guards.
- The Floorplan's existing `transport-update` writer at `Floorplan.vue:884` already handles `path === 'lastTimeOnline'` reactively (`this.$set(targetApp, 'lastTimeOnline', value)`). No additional callback wiring is required.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `floorplan-live-updates`: extends "Transport selection includes the staleness keep-alive path" so it covers every appliance the Floorplan renders, not just the nine types currently enumerated. The `lastTimeOnline` staleness keep-alive is now universal across rendered appliances.

## Impact

- **Code touched**: `src/utils/overmindUtils.ts` (`pathsForApplianceType` body only — no signature change). No edits needed to `Floorplan.vue` or `Appliances.vue` call sites.
- **No SSE backend changes**. The transport client and server already handle arbitrary paths; subscribing to `lastTimeOnline` for one more appliance is the same shape as the existing subscriptions.
- **No new dependencies**, no migrations.
- **Behavior change**: appliance 177 (Solax inverter) and any other untyped / unrecognised-type appliance rendered on the Floorplan now receives `lastTimeOnline` keep-alives via SSE. After 2 minutes its `onOffState` no longer flips to `'error'` from staleness alone. Existing typed appliances are unchanged.
- **Forward compatibility**: any future appliance class added to the backend can render on the Floorplan without an entry in `COMPACT_PATHS` and still receive staleness updates. A type-specific entry can be added later when richer paths (power, state, etc.) are wanted, but it's no longer load-bearing for staleness correctness.
