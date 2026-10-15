## Why

The battery tile on the kiosk energy panel renders as full whenever the home battery holds 10 % or more. The Solax inverter (appliance 177) reports `battery` as a state-of-charge percentage (0..100), but the tile is configured with `batteryMax: 10`, so the panel computes `100 / 10 * value` and clamps the result to 100. This regressed with the SSE rewrite (`52fcfd8`, 2026-04-19), which re-introduced the `batteryMax` scaling. The code before that (`3ac4029`) used the raw percentage and ignored `batteryMax`. The bug went unnoticed over the summer while the battery stayed near full, and it became visible in October when the battery started draining to 10-20 % overnight.

## What Changes

- Set `batteryMax` of the battery cell in `src/views/KioskOverview.vue` from `10` to `100`, matching the 0..100 percentage unit of the Solax `battery` field.
- No change to `KioskPowerPanel.vue`. Its scaling (`100 / batteryMax * value`, clamped to 0..100) is correct once `batteryMax` matches the unit of the source field.

## Capabilities

### New Capabilities

### Modified Capabilities
- `kiosk-energy-panel-details`: adds a requirement that a battery cell's fill level reflects the configured battery appliance's state of charge proportionally rather than saturating.

## Impact

- `src/views/KioskOverview.vue`: one configuration value.
- No backend, API, or SSE contract changes. The overmind server already delivers `battery` correctly as a percentage.
