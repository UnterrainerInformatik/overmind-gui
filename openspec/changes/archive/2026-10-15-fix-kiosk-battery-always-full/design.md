## Context

`KioskPowerPanel.vue` derives a battery cell's fill as `100 / batteryMax * value`, clamped to 0..100. `KioskOverview.vue` configures the battery cell with `batteryAppliances: [{ id: 177, names: ['battery'] }]` and `batteryMax: 10`. The overmind server maps the Solax `batteryCapacityRemainig` (a percentage) to `battery`. See proposal.md for the regression history.

## Goals / Non-Goals

**Goals:**
- Make the battery fill track the real state of charge across 0..100 %.

**Non-Goals:**
- Showing remaining energy in kWh, or adding new state fields on the server.
- Changing the generic scaling logic in `KioskPowerPanel.vue`.

## Decisions

- **Fix the configuration, not the component.** Set `batteryMax: 100`. `batteryMax` is a per-cell unit setting, and the component's scaling is correct for any unit once the setting matches the source field. Alternatives considered:
  - Drop the scaling in the component and use the raw value, as the pre-April code did. Rejected because it would make `batteryMax` dead configuration again and break any future cell whose source is not a percentage.
  - Switch the cell to `batteryRemainingEnergy` (kWh, so `batteryMax: 10` would be right). Rejected because the server does not expose that field today, so it would need a backend change, and the usable capacity is not exactly 10 kWh.

## Risks / Trade-offs

- [The deployed GUI build may differ from the repository] → Verify on the kiosk after deploying that the fill matches the live `battery` value of appliance 177.
