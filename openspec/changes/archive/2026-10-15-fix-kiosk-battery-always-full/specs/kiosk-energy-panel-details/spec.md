## ADDED Requirements

### Requirement: Battery cell fill reflects the battery's state of charge

For a front-face cell that declares `batteryAppliances`, the panel SHALL render the battery fill as `100 / batteryMax * value`, clamped to the range 0..100, where `value` is the summed live value of the cell's battery paths. The kiosk overview SHALL configure `batteryMax` in the same unit as the battery path it selects, so the fill is proportional to the state of charge across the battery's whole range. For the Solax inverter's `battery` path, which is a percentage, `batteryMax` SHALL be `100`.

#### Scenario: Partially charged battery is shown partially filled
- **WHEN** the Solax inverter reports `battery` = `12`
- **THEN** the battery cell's fill is 12 %, not full

#### Scenario: Fully charged battery is shown full
- **WHEN** the Solax inverter reports `battery` = `100`
- **THEN** the battery cell's fill is 100 %

#### Scenario: Empty battery is shown empty
- **WHEN** the Solax inverter reports `battery` = `0`
- **THEN** the battery cell's fill is 0 %
