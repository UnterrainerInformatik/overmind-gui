## 1. Freshness logic and unit test

- [ ] 1.1 Create `src/utils/weatherFreshness.ts` with `STALE_AFTER_MS` and `weatherFreshness(measuredOn, nowMs)` per design (no imports); verify `npm run lint` is clean.
- [ ] 1.2 Add `tests/unit/run.js` (TypeScript require hook via `typescript.transpileModule`, `test()` collector, non-zero exit on failure) and the `test:unit` script in `package.json`; verify a deliberately failing assertion makes `npm run test:unit` exit non-zero, then remove it.
- [ ] 1.3 Add `tests/unit/weatherFreshness.test.js` with a fixed `nowMs` as fake clock covering: 12 min old → fresh, exactly 30 min → fresh, 30 min + 1 s → stale, 31 min → stale, future timestamp → fresh, missing / `null` / `""` / `"garbage"` / a number → unknown, and `measuredAt` equal to the parsed instant; verify `npm run test:unit` passes.

## 2. Panel

- [ ] 2.1 In `KioskZamgPanel.vue` add `nowMs` with its own 15 s interval (cleared in `beforeDestroy`) and the `freshness` computed; pass `borderColor` `error` when stale, else `secondary`; verify in the harness that a 31-minute-old `measuredOn` gives a red computed border colour.
- [ ] 2.2 Add the status line ("Stand HH:MM" when fresh, red "Veraltet seit HH:MM" when stale, nothing when unknown) using `dateUtils.dateToShortTime`, and tighten the value-row margins so the inner card stays 140 px; verify in the harness that the panel's bounding box equals the one measured without `measuredOn` and that no child overflows the card.
- [ ] 2.3 Add `fmt(value, precision, unit)` returning "–" for absent or non-numeric values and use it for sun, rain, wind and both temperature tiles; drop the `console.log` lines in `calculateFeltTemperature`; verify in the harness that a record without `wind`, `sun` and `rain` shows three dashes, a numeric felt temperature and no `NaN` anywhere in the panel text.
- [ ] 2.4 Add `page.kiosk.zamg.asOf` ("Stand {time}" / "As of {time}"), `page.kiosk.zamg.staleSince` ("Veraltet seit {time}" / "Stale since {time}") and change `sun` to "Sonnenschein" / "Sunshine" in `de-AT.json` and `en-US.json`; set it as `title` on the sunshine value; verify both files parse and the title is present in the DOM.

## 3. Verification

- [ ] 3.1 Run `npm run lint`, `npm run test:unit` and `npm run build` clean (the dev server skips type checking).
- [ ] 3.2 Add the harness suite `kiosk-weather-freshness.mjs` mocking `/localizedData?identifier=zamg` and appliance 178, and check: fresh record → normal border and "Stand" line; old record → red border and stale line; record without `measuredOn` → normal border, no status line, same panel size; a record that starts 29 min 50 s old turns red within 30 s without a new response (advance the page clock or use a short real wait with a just-under-threshold timestamp); a later fresh response turns it back to normal.
- [ ] 3.3 Take screenshots of the kiosk overview at 1020x590 in the fresh, stale and unknown states and look at them.
