---
name: utils-modules
description: What each file under src/utils/ provides — look here when you need a helper and want to check whether one already exists.
---

# src/utils/

All `*Utils.ts` files follow the same singleton convention as webservices
(`public static getInstance()` + `export const singleton`).

## axiosUtils.ts

The single HTTP engine. Wraps axios. Builds URLs from `rest/config`, attaches
the Keycloak bearer token, and routes errors to `loggingUtils`. Public methods:
`getResponse`, `getById`, `getList`, `del`, `put`, `post`, and the shared
`appendErrorCatcher`. See `webservices-layer.md`.

## overmindUtils.ts

Domain helpers — the biggest utils file.

- **Temperature colors**: `tempRawColorsLerpable` (9 RGBA tuples) mapped to
  `tempBoundaries = [-10, 0, 10, 22, 24, 26, 30, 36]`. `getTempColorFor(temp)`
  returns a CSS rgba() string interpolated between the two nearest stops.
- **Battery**: `getBatteryIcon(level)`, `getBatteryColor(level)` (Vuetify
  `red/teal/green darken-N`).
- **Appliance icons**: `getIconFor(item)` — map of appliance type →
  Material icon name (`SHUTTERS → camera`, `BULB_RGB → emoji_objects`, etc.).
- **State extraction**: `addOnOffStateTo(item, index)` walks `item.state`
  and sets `item.onOffState` to `on|off|middle|error|none`. Handles PLUG,
  RELAY, RELAY_DUAL, DIMMER, BULB_RGB, MOTION_SENSOR, CONTACT_SENSOR, HT.
  If `lastTimeOnline` is > 24h old, the state is forced to `error`.
- **Contact sensor**: `opened/tilted/closed` predicates based on
  `state.closures[0].{open,tilt}` (tilt threshold = 2).
- **Power formatting**: `formatPower(value, cap)` → `'1.5 kW'`, `'1 W'` when
  `cap` is true (instead of `'0 W'`).
- **Number formatting**: `formatNumber(n, precision=2, omitZero=false)`.
- **Temp parsing**: `getTemperature(item)`, `getHumidity(item)`.
- **Misc**: `openInNewTab`, `setTimeoutChain`, `parseConfig`, `parseState`
  (last two JSON.parse the `element.config`/`state` fields in-place,
  silently dropping them on parse error).

## jsUtils.ts

Language-level helpers. `lerp`, `clampTo`, `groupBy(arr, keyOrFn)`, `gcd`,
`resolveCollection(coll, fn)` (Promise.allSettled + filter fulfilled),
`toggleItem`, `removeItem`, `containsItem`, `sanitize` (null/undef → '').

## loggingUtils.ts

**Activated = false by default.** Every call is a no-op until someone flips
`log.activated = true` (nothing currently does this). See `known-issues.md`.
Intended to dispatch `gui/snackbar/snackbarEnqueue` with group/level/status
metadata that resolves to i18n keys `message.${level}.${group}`.

## objectUtils.ts

`getProperty(name, o)` and `getDeepProperty('a.b.c', o)`. Warns on
missing props via `log.warning`. Used by `axiosUtils` to resolve server and
endpoint paths out of the rest config.

## observableMap.ts / doubleBufferedObservableMap.ts

A Vue-reactive `Map<K,V>` wrapper. Vue 2 doesn't track native ES6 Map
mutations, so every read goes through `this.binding()` which returns a
`changeTracker` counter — touching it in a template triggers re-render.
Mutations call `changed()` to bump the counter. The double-buffered variant
has `backup()` and `swap()` for safe replace-while-iterating use cases.

**Read-paths return `number | V`** because they do `this.binding() && …` —
so a false-y tracker would short-circuit the call and return 0/1. This is
intentional but will confuse a type-checker; callers treat the return as the
value.

## debouncer.ts

See `polling-and-debouncing.md`.

## dateUtils.ts / vueUtils.ts

Small, domain-specific date formatters and Vue helpers. Check these before
introducing new date logic or Vue component utilities.
