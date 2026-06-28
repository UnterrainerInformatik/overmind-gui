## ADDED Requirements

### Requirement: Temperature color scale upper range

The temperature color scale used by kiosk temperature readouts SHALL map temperatures up to and beyond 50 °C to distinct colors. The scale SHALL anchor hot-red at 40 °C, interpolate linearly from red to white across the 40–50 °C band, and render any temperature above 50 °C as black.

#### Scenario: Hot-red at 40 degrees
- **WHEN** a temperature of 40 °C is mapped to a color
- **THEN** the resulting color is hot-red (`rgba(200, 0, 0, 0.6)`)

#### Scenario: Interpolation between 40 and 50 degrees
- **WHEN** a temperature of 45 °C is mapped to a color
- **THEN** the resulting color is a linear blend halfway between red and white

#### Scenario: White at 50 degrees
- **WHEN** a temperature approaching 50 °C (e.g. 49.9 °C) is mapped to a color
- **THEN** the resulting color is white (`rgba(255, 255, 255, 0.6)`)

#### Scenario: Black above 50 degrees
- **WHEN** a temperature greater than 50 °C is mapped to a color
- **THEN** the resulting color is black (`rgba(0, 0, 0, 0.6)`)

### Requirement: Temperature index stays within color and description bounds

The temperature-to-index calculation SHALL never return an index that exceeds the bounds of the color arrays or the `tempDesc<n>` localization keys. Temperatures above the highest boundary SHALL clamp to the final bucket.

#### Scenario: Off-scale temperature clamps to final bucket
- **WHEN** a temperature far above the highest boundary (e.g. 80 °C) is indexed
- **THEN** the index equals the number of boundaries (the final bucket) and resolves to a valid color and a valid `tempDesc` key without overflowing either array

### Requirement: Localized description for the above-50 band

Each temperature bucket SHALL have a corresponding localized description key. The above-50 °C bucket SHALL be described by `tempDesc9` in every supported locale.

#### Scenario: Above-50 description resolves
- **WHEN** the panel renders the description for a temperature above 50 °C
- **THEN** it uses the `tempDesc9` key, which is defined in both `de-AT` and `en-US`
