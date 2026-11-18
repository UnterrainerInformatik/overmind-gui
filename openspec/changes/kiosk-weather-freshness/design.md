## Context

`KioskZamgPanel.vue` polls every 10 s (debounced `update()`), parses the
`zamg` localizedData record (`de` or `en` field, a JSON string) into `weather`
and renders it in a fixed 230 x 140 px `KioskPanel`. It has no notion of time.
`update()` swallows each read's error separately, so a failing zamg fetch
leaves the previous `weather` in place - exactly the "silently old numbers"
case. Values go through `overmindUtils.formatNumber`, which turns
`undefined` into `NaN`.

The repo has no unit-test runner; verification so far is the Puppeteer harness
at `~/.local/share/overmind-gui-verify` (see memory). The project pins node 14
via volta and ships `typescript` 3.9 as a dev dependency.

Record contract consumed (from java-overmind-server change
`fix-zamg-weather-units-and-freshness`), all fields optional:

```json
{
  "measuredOn": "2026-11-18T06:10:00Z",
  "fetchedOn":  "2026-11-18T06:15:04Z",
  "temperature": 4.2, "temperatureUnit": "°C",
  "humidity": 81, "wind": 12.6, "windUnit": " km/h",
  "rain": 0, "rainUnit": " mm", "sun": 40, "sunUnit": "%",
  "radiation": 112.0, "radiationUnit": " W/m²"
}
```

## Goals / Non-Goals

**Goals:**
- Staleness decision as a pure function with the clock passed in, unit-tested.
- Panel turns red on its own when the feed dies, without growing in height.

**Non-Goals:**
- Displaying `radiation` (no room; see proposal).
- Using `fetchedOn` for the decision - it tells whether the server polls, not
  whether GeoSphere delivers new observations; the observation age is what the
  viewer cares about. `fetchedOn` is ignored.
- Fixing the `$i18n.locale === 'de'` record-language selection.
- Configurable threshold.

## Decisions

**Pure module `src/utils/weatherFreshness.ts`.** Exports
`STALE_AFTER_MS = 30 * 60 * 1000` and
`weatherFreshness(measuredOn: unknown, nowMs: number): { state: 'fresh' | 'stale' | 'unknown', measuredAt: Date | null }`.
`unknown` when the value is not a non-empty string or `Date.parse` yields
`NaN`; `stale` when `nowMs - measured > STALE_AFTER_MS`; else `fresh` (a
future timestamp counts as fresh). No imports, so it loads in plain node.
The "fake clock" is the `nowMs` argument - simpler and more honest than
patching `Date.now`. Alternative considered: a computed property in the
component reading `Date.now()` - untestable without mounting Vue.

**Clock tick in the component.** A `nowMs` data property, set in `mounted()`
and refreshed by its own `setInterval` every 15 s, cleared in
`beforeDestroy`. A computed `freshness` calls
`weatherFreshness(weather && weather.measuredOn, nowMs)`. Separate from the
10 s fetch interval on purpose: the fetch is debounced and may fail, the tick
must not depend on it. 15 s satisfies the "within 30 s" spec with margin.

**Stale look.** `KioskPanel` already accepts `borderColor`; pass `error`
when stale, else `secondary`. The status line uses Vuetify `error--text`.

**Space for the status line.** The value row currently has `mt-6 mb-4`. The
status line ("Stand 07:10" / "Veraltet seit 07:10", 11 px, line-height 12 px)
goes between the value row and the sun rise/set row; the margins shrink to
`mt-3 mb-2` (exact values tuned in the browser) so the inner card stays at
`height="140"` with nothing clipped. In the unknown state the line is not
rendered and the freed space stays as margin, so the panel never changes size.

**Dash rendering.** A component method `fmt(value, precision, unit)` returns
`'–'` when `typeof value !== 'number' || !isFinite(value)`, else
`formatNumber(value, precision, true) + (unit || '')`. Used for sun, rain,
wind and the inside/outside temperature tiles. `calculateFeltTemperature`
already defaults non-numeric wind/humidity to 0; its `console.log` noise is
removed since absence is now normal.

**Unit test without a new dependency.** `tests/unit/run.js` registers a
`require.extensions['.ts']` hook that compiles with
`typescript.transpileModule` (module CommonJS, target ES2019), then requires
every `tests/unit/**/*.test.js`. Tests use node's built-in `assert` and a tiny
`test(name, fn)` collector that prints results and sets a non-zero exit code
on failure. `package.json` gets `"test:unit": "node tests/unit/run.js"`.
Alternative considered: `@vue/cli-plugin-unit-jest` - pulls in jest 24/babel
config for one pure function on a node-14-pinned project; not worth it yet,
and the runner can be swapped for jest later without touching the test bodies
much. `tests/` must be excluded from neither lint nor the build (the build only
bundles what `src/` imports).

## Risks / Trade-offs

- [Kiosk clock wrong] → stale/fresh decision is wrong. Kiosk tablets sync
  NTP; a skew of a few minutes is irrelevant against a 30-minute threshold.
- [Server timestamp in local time without `Z`] → `Date.parse` interprets it
  as local, 1 h off in winter; would show stale ~30 min too late or early.
  Contract says ISO-8601 UTC with `Z`; the test pins that format.
- [Status line makes the panel taller on the real 1020 x 590 tablets] →
  verify by measuring the panel's bounding box before/after in the harness.
- [Hand-rolled test runner] → minimal and dependency-free; documented in
  `tests/unit/run.js` header.

## Migration Plan

Deployable before the server change: without `measuredOn` the panel is in the
unknown state and looks as today minus `NaN`s. Once the server change is live
the "Stand" line appears. Rollback is a plain revert.
