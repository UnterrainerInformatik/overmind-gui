# Design notes — `add-sse-transport-min-value-delta`

## Scope of the design decision

The library change is mechanical: one optional field on `TransportSpec`, forwarded verbatim into the register body. The interesting decisions are at the consumer-wiring layer — picking values that suppress jitter without losing semantically meaningful updates — and the call-site policy of "skip the field where 0–1.0 fractional paths are in the selection."

## Why a single value (`1.0`) almost everywhere

`minValueDelta` is per-transport, not per-path. Every existing transport selection mixes paths of similar display resolution:

- **Compact list / floorplan views** observe `relays[*].power` (W, integer display), `temperatures[0].temperature` (°C, one-decimal display but rounded to ~1° for tiles), `humidities[0].humidity` (%, integer display), `batteries[0].batteryLevel` (%, integer display). All four "round" to ≥1 unit on screen. A single `1.0` threshold matches their common display resolution.
- **Aggregate sums** in the kiosk power panel reduce to one scalar; sub-1 W or sub-1% movement of a 50-light sum is below the user's threshold of attention. The server applies the threshold to the *recomputed* aggregate, so the rule is consistent with the per-path case.
- **Plug/HT/Contact/Motion detail dialogs** subscribe with `paths: ['**']`, but the underlying state for these appliance types contains no 0–1.0 fractional paths. Same rule applies as for compact views.

A finer threshold (e.g. `0.5`) was considered for HT detail and rejected: the user explicitly chose `1° for temps, 1W for power`, and the anchor-based suppression (anchor = last *emitted*, per server spec) means slow drift below 1° will still cross the threshold and emit at every full-degree step — so a 1° threshold gives full-degree resolution without losing any displayable transition.

## Why Dimmer and Bulb detail dialogs are deliberately exempt

`paths: ['**']` on a DIMMER or BULB_RGB appliance pulls fractional 0–1.0 values:

- `dimmers[0].brightness` (0–1.0)
- `rgbws[0].brightness` (0–1.0)
- `rgbws[0].colorTemperature` (0–1.0)
- `rgbws[0].{red,green,blue,white}` (0–1.0)

`DebouncedBwPicker.vue:75,89` confirms the wire scale — the picker reads `brightness * 100` and writes `brightness / 100`. A `minValueDelta: 1.0` on a 0–1.0 path would suppress every brightness/RGB update for the life of the dialog, leaving sliders permanently at their initial value.

Three options were weighed:

1. **`0.01` threshold** — passes ~1% brightness movements but kills float noise. Acceptable but adds a magic number; users dragging a slider expect every step to land, even sub-1% ones.
2. **Per-path thresholds (server-side)** — not in the current server contract. Would be the principled fix but is out of scope.
3. **No threshold for these two dialogs** — simplest, matches their short-lived interactive nature. Wire chatter on a single appliance for a few seconds is not a real cost.

Chose (3). The dialog is open for seconds, not hours; the user is the source of most state changes during that window; the panel they came from continues to filter with `1.0` so the long-running view is still de-noised.

## Why no client-side validation

The server validates: `null` and `0.0` accepted, negative / `NaN` / `±Infinity` → 400 (per the server's `add-sse-transport-min-value-delta` change). Adding client-side validation would (a) duplicate truth — when the server's rules evolve, the client lags; (b) need its own error-surfacing path; (c) re-invent the wheel for a field with one realistic failure mode (a typo'd negative). The existing register-error pathway (`record.initialReject` → `subscribe()` sets `sub.error`, `registerTransport()` rejects the Promise) handles HTTP 400 cleanly already.

## Why `0` is forwarded rather than collapsed to `undefined`

The server documents `minValueDelta: 0` as **identical to absent** — the field is inert. The client could collapse `0 → undefined` to save a byte on the wire, but that would couple the client to a server semantics it doesn't own. If the server later changes "0 means inert" to "0 means strict equality dedup", a collapsing client silently breaks. Strict `!== undefined` keeps the client honest: the caller passed `0`, the wire carries `0`, the server decides what `0` does.

## Reconnect preservation

`SseClient.onConnected()` re-registers every active handle using `record.spec` — the same spec object the caller passed at register time. Since `minValueDelta` lives on the spec, it travels through reconnect re-registration without any explicit code path. The added spec scenario "`minValueDelta` is forwarded on reconnect re-registration" is a regression guard, not new logic.

## Ordering with the server

The server's `add-sse-transport-min-value-delta` change shipped first. Sending the field to a server that didn't know it would be a 400 from a strict DTO (Jackson would normally ignore unknown fields, but if `FAIL_ON_UNKNOWN_PROPERTIES` is enabled it 400s). The current order — server accepts the field, then GUI starts sending it — is the safe one.

Reverting only the GUI is safe: the server tolerates the field's absence per its own contract. Reverting only the server would 400 every GUI register call; do not do that without reverting this change first.

## What's NOT in this change

- Per-path thresholds — not in the server contract.
- Configurable thresholds via Vuex / settings — current values are hard-coded constants at the call site. If thresholds need user tuning, a follow-up change introduces a settings layer; that decision is intentionally deferred.
- `Floorplan.vue` aggregate-style detection or any reactive recalculation when `minValueDelta` changes mid-life — `minValueDelta` is set once at register time and survives the life of the transport (including reconnect). Changing it requires unregister + re-register, same as any other spec change.
