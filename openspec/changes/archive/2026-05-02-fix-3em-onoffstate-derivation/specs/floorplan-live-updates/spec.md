## ADDED Requirements

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
