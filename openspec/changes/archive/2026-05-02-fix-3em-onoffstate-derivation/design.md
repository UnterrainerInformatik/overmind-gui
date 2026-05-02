## Context

`overmindUtils.addOnOffStateTo(item, index)` (`src/utils/overmindUtils.ts:240-338`) decides what value the Floorplan paints for a given appliance: `'on'`, `'off'`, `'middle'`, `'error'`, or `'none'`. It runs every `redraw()` (`Floorplan.vue:650`), which is triggered by every transport-update batch. The Floorplan's avatar template branches on this value: `isError(area)` hides the normal avatar (`Floorplan.vue:128`) and renders a small red bolt (`:171`); `displayWatts(area)` requires `isOn(area)`, which itself reads `onOffState`.

For an appliance with `type` in `{PLUG, RELAY, DIMMER, BULB_RGB}`, the function (lines 256-268) requires `state.relays[0].state` to be present. If it's missing, the current code:

```ts
if (!item || !item.state || !item.state.relays || !item.state.relays[0] || !item.state.relays[0].state) {
  if (item && item.state && item.iconPos1) {
    return item.state[item.iconPos1] > 0   // (a) bug: stray boolean from a void function
  }
  Vue.set(item, 'onOffState', 'error')     // (b)
  return
}
```

Branch (a) silently leaves `onOffState` at its previous value (initially `undefined`). Branch (b) forces `'error'`.

Two real-world cases break:

- **Shelly 3EM (`type: 'RELAY'`, `usageType: NULL`)**: a 3-phase energy meter that doesn't switch anything. `state.relays[0].state` is genuinely absent on the backend record. `state.relays[*].power` is reported and flowing via SSE. With `iconPos1` NULL the appliance falls into branch (b) → permanent `'error'`. With `iconPos1` set, branch (a) accidentally suppresses the error and the appliance renders correctly — by accident.
- **Any future `RELAY`-typed power-only device**: same failure mode, dependent on whether `iconPos1` is configured.

The accidental-success path is brittle and the deliberate path produces a visibly wrong "error" indicator on a healthy device.

## Goals / Non-Goals

**Goals:**
- A `RELAY`-family appliance that reports relay power but no relay state SHALL be classified as on/off based on its summed power, not as `'error'`.
- Remove the `iconPos1`-gated early-return — it's a bug and must not silently mask the error path.
- Preserve all existing classifications: relay state present → `'on'`/`'off'` from state; appliance stale by `lastTimeOnline` → `'error'`; truly missing data (no relay state AND no power readings) → `'error'`.
- No change to the staleness gate, the SSE selection / paths, the redraw flow, the `Vue.set` reactivity contract from `floorplan-live-updates`, or any other appliance-type branch.

**Non-Goals:**
- Cleaning up the second overload of `iconPos1` in `getPowerOf` (`overmindUtils.ts:374-376`), `Floorplan.getColor` (`:809-815`), and `Floorplan.isOn` (`:830`). That's a separate latent confusion (`iconPos1` doubling as a state-field-name string vs. coordinate pair) and out of scope here.
- Distinguishing 3EMs from other power-only devices via `classFqn`. The fix is type-driven; if a device reports power data but no relay state, it's classifiable from power alone regardless of vendor.
- Any new template-side fix for the small-hitbox issue when an appliance is genuinely in error. Once the spurious `'error'` is gone for healthy 3EMs, the hitbox concern recedes.
- Backend changes. The user verified the data shape (`type: 'RELAY'`, no `relays[0].state`); the frontend must handle it.

## Decisions

### D1: Derive on/off from summed relay power when relay state is absent

In the `PLUG` / `RELAY` / `DIMMER` / `BULB_RGB` branch of `addOnOffStateTo`, when `state.relays[0].state` is absent, attempt to compute total power from `state.relays[*].power`. If any relay reports a numeric `power`, sum them and classify: `> 0` → `'on'`, otherwise `'off'`. Only when no relay power is reported either does the branch fall through to `'error'`.

We sum across phases (consistent with `getPowerOf` in `overmindUtils.ts:380-386`, which iterates `relays[i].power` while present). For a 3-phase 3EM this naturally aggregates all three phases; for a single-relay device with only a power reading and no state, it still works (just one term).

**Threshold**: `> 0`. Real-world solar / mains 3EMs never sit at exactly 0 W during operation (microcurrents, leakage, inverter idle draw); at night a solar 3EM genuinely produces zero. If `> 0` proves too sensitive in practice (e.g., flicker between on/off at very low power), swap to `> 1` or another small epsilon. Defer that until evidence demands it.

**Alternatives considered:**
- *Special-case `classFqn === 'Shelly3EmAppliance'`*: works for the immediate report, doesn't generalise. Any future power-only RELAY-typed device hits the same bug.
- *Always classify any `RELAY`-typed appliance as `'on'` if `lastTimeOnline` is fresh*: loses the on/off semantics that the avatar's color depends on; produces wrong colours for switched devices that briefly lose `relays[0].state` mid-flight.
- *Treat power-only RELAYs as `'none'`*: the avatar then fills `colorTransparent` and the wattage is hidden (`displayWatts` requires `isOn`). Equivalent to "doesn't show up correctly" — defeats the purpose.

### D2: Remove the `iconPos1`-gated early-return

Lines 257-259 read:

```ts
if (item && item.state && item.iconPos1) {
  return item.state[item.iconPos1] > 0
}
```

This is unambiguously a bug:
- `addOnOffStateTo` is a `void` method. The returned boolean is discarded by the only caller (`Floorplan.redraw`).
- The early-return causes `onOffState` to keep its previous value, which on first call is `undefined` — making `isError` return false coincidentally.
- The behaviour depends on whether `iconPos1` is configured, a field whose primary documented purpose is the second-icon position for `RELAY_DUAL`. Two appliances of the same type behave differently based on an unrelated config field.

Once D1 lands, the appliance shape that previously fell into this branch (no `relays[0].state`, no `iconPos1` set, no power reading either) is the only remaining case — and that case really is an error: nothing to display, nothing to derive. Falling through to `Vue.set(item, 'onOffState', 'error')` is correct.

**Alternatives considered:**
- *Keep the early-return but make it write `onOffState` correctly*: the read of `item.state[item.iconPos1]` only makes sense if `iconPos1` is being used as a state-field-name string (not coords). That overload exists elsewhere (`getPowerOf`, `getColor`, `isOn`) but is undocumented and confusing. Codifying it here would deepen the overload. Prefer to leave the second meaning of `iconPos1` alone (out of scope) and remove the buggy reference here.
- *Replace with an explicit "derive from `state[iconPos1]` if set" rule*: would make `iconPos1` a load-bearing string-key for power-only devices. D1 already handles power-only via summed `relays[*].power`, which doesn't need an extra config field — strictly better.

### D3: Order of evaluation

The new branch order inside the `PLUG` / `RELAY` / `DIMMER` / `BULB_RGB` case becomes:

1. If `state.relays[0].state` is present → use it (`'on'` / `'off'`). Unchanged.
2. Else if any `state.relays[i].power` is reported → sum and classify (`> 0` → `'on'`, else `'off'`). New.
3. Else → `'error'`. Existing fall-through, no early-return.

Step 1 wins when the device is a real switch (preserves existing behaviour). Step 2 is the new path for energy-meters and any other power-only RELAY device. Step 3 is the genuine "no information" case.

The staleness gate (lines 245-249) runs before the switch and still wins over all of the above when `lastTimeOnline` is missing or > 2 min stale (24 h for `batteryDriven === 1`). That ordering is unchanged.

## Risks / Trade-offs

- **[Risk] A real switched RELAY appliance that briefly loses `relays[0].state` mid-update could now report `'on'`/`'off'` from power alone instead of going to `'error'`.**
  → Mitigation: this is arguably the desired behaviour. The current `'error'` paint on a transient missing-field is itself wrong (the device is online and reporting power). If the field is permanently missing on a switched device, that's a backend bug in its serializer — and the new behaviour gracefully degrades to a power-derived display rather than a red bolt.

- **[Risk] A device with stale relay-power data (e.g., last reported 30 min ago) but fresh `lastTimeOnline` could report a misleading `'on'`/`'off'`.**
  → Mitigation: SSE pushes power changes whenever they change. A device whose power genuinely hasn't changed in 30 min is correctly described as "still at that power level". A device whose backend isn't pushing power at all is a backend issue, not addressable here.

- **[Risk] The `'> 0'` threshold could flicker at very low power readings.**
  → Mitigation: if the symptom appears, raise the threshold to `> 1` or a configurable epsilon. Defer until observed; don't over-design.

- **[Risk] A 3EM that today renders correctly *because of* the buggy `iconPos1` early-return could behave differently after the fix.**
  → Mitigation: with D1 in place, those appliances are classified by power directly — same visible result, deliberately. The only behaviour change is for an appliance that has `iconPos1` set AND no relay state AND no power reading, which would now correctly paint as `'error'`. That state means there is genuinely nothing to display, so flipping it to `'error'` is the right call — and inspection of `iconPos1`-as-state-key (`item.state[item.iconPos1]`) usage in `getPowerOf` already covers the "iconPos1 is a state-field name" overload for the actual power read.

## Migration Plan

Single PR. No persistent state, no migrations, no backend changes. Rollback by reverting the PR.

## Open Questions

- Threshold for the new power-derived classification: `> 0` vs. `> 1` vs. `>= some epsilon`. Going with `> 0` until evidence demands more. Trivial to tweak.
- Should `Floorplan.getColor` / `Floorplan.isOn` likewise be relaxed to read from power when `relays[0].state` is missing? They already read `app.onOffState`, so once `addOnOffStateTo` paints it correctly, those routes inherit the fix automatically. No further change needed in this proposal.
