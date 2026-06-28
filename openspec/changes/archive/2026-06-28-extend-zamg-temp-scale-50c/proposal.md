## Why

The ZAMG panel's temperature color scale topped out at 36 °C — anything hotter saturated to solid white, so it could not distinguish a hot summer reading from an extreme-heat / sensor-fault condition. Readings in the 36–50 °C range are realistic on sun-exposed outdoor sensors and need distinct, escalating colors.

## What Changes

- Extend the upper end of the temperature color scale so it stays meaningful up to 50 °C and beyond.
- Move the hot-red anchor from 36 °C to **40 °C**.
- Interpolate **red → white** across the 40–50 °C band.
- Render anything **above 50 °C as black** (off-scale / fault signal) instead of white.
- Add the `tempDesc9` description bucket for the new above-50 °C band in both locales.

## Capabilities

### New Capabilities
- `kiosk-temperature-color-scale`: Defines the temperature-to-color mapping used by the ZAMG/weather panel and other kiosk temperature readouts, including the boundary anchors, interpolation behavior, the extended 40–50 °C range, and the above-50 °C fault color.

### Modified Capabilities
<!-- None: no existing spec covers the temperature color scale. -->

## Impact

- `src/utils/overmindUtils.ts` — `tempBoundaries`, `tempRawColorsLerpable`, `tempRawColors`, and the index-clamping behavior in `calculateTemperatureIndex` / `getTempColorFor`.
- `src/locales/de-AT.json`, `src/locales/en-US.json` — new `tempDesc9` key.
- Consumers of `getTempColorFor` / `calculateTemperatureIndex`: `KioskZamgPanel.vue` and the Floorplan temperature rendering.
- Already implemented and committed as `ab8b820`; this change documents it retroactively.
