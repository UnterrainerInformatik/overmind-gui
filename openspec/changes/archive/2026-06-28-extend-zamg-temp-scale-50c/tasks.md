## 1. Color scale constants

- [x] 1.1 Change `tempBoundaries` in `src/utils/overmindUtils.ts` from `[…, 30, 36]` to `[…, 30, 40, 50]`
- [x] 1.2 Append black `[0, 0, 0, 0.6]` to `tempRawColorsLerpable`
- [x] 1.3 Append `'rgba(0, 0, 0, 0.6)'` to `tempRawColors`

## 2. Localization

- [x] 2.1 Add `tempDesc9` (`glühend heiß`) to `src/locales/de-AT.json`
- [x] 2.2 Add `tempDesc9` (`scorching hot`) to `src/locales/en-US.json`

## 3. Verification

- [x] 3.1 Confirm 40 °C → red, 45 °C → red/white blend, ≥50 °C → black via the interpolation logic
- [x] 3.2 Confirm `calculateTemperatureIndex` clamps to a valid index for off-scale temps (no array/`tempDesc` overflow)
