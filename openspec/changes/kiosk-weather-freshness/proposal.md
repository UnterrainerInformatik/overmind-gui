## Why

The kiosk weather panel (`KioskZamgPanel`) shows whatever the last `zamg` record
held, with no hint of its age. When GeoSphere stops delivering, the panel keeps
showing old numbers as if they were current. The server change
`fix-zamg-weather-units-and-freshness` (java-overmind-server) adds an observation
timestamp to the record, converts wind from m/s to real km/h, adds global
irradiance, and starts omitting single values GeoSphere has no data for. The
panel has to use the timestamp and survive the omitted values.

## What Changes

- Turn the weather panel red (red border plus a red "Veraltet seit HH:MM" line)
  when the observation `measuredOn` is more than 30 minutes old (three missed
  10-minute slots). The check runs on its own clock tick, so a feed that stops
  updating turns red without new data arriving.
- When `measuredOn` is absent (server change not yet deployed, or field
  dropped), freshness is "unknown": the panel stays in its normal look.
- Show a small "Stand HH:MM" line (local time of `measuredOn`) while fresh.
- Render any absent value (`sun`, `rain`, `wind`, `humidity`, `radiation`, ...)
  as "–" instead of `NaN`, and keep the felt-temperature tile working when wind
  or humidity is missing.
- Clarify that `sun` (%) is sunshine duration within the 10-minute slot, not
  irradiance: the `page.kiosk.zamg.sun` label becomes "Sonnenschein" /
  "Sunshine" and is attached to the value as its title. The new `radiation`
  value is not displayed - the 230 x 140 px panel has no room for a fourth
  value - but its absence or presence never breaks rendering.
- Felt temperature uses the wind value from the record as km/h; the wind-chill
  formula already expects km/h, so the server's unit fix corrects it with no
  formula change.
- Extract the freshness decision into a pure, clock-injectable utility and add
  the project's first unit test for it (fresh, stale, missing, unparsable,
  boundary), runnable with `npm run test:unit` and no new dependency.

## Capabilities

### New Capabilities
- `kiosk-weather-panel`: freshness indication, "Stand" timestamp, tolerance of
  absent values, and value labelling of the kiosk weather (zamg) panel.

### Modified Capabilities
<!-- none: kiosk-temperature-color-scale is used unchanged -->

## Impact

- `src/components/KioskZamgPanel.vue` (template, timer, null-tolerant formatting)
- new `src/utils/weatherFreshness.ts` (pure logic)
- new `tests/unit/` runner and test; `package.json` gains a `test:unit` script
- `src/locales/de-AT.json`, `src/locales/en-US.json` (new `page.kiosk.zamg` keys)
- Consumes the `zamg` localizedData record fields `measuredOn`, `fetchedOn`,
  `radiation`, `radiationUnit` from java-overmind-server change
  `fix-zamg-weather-units-and-freshness`; works unchanged (freshness unknown)
  against the currently deployed server.
