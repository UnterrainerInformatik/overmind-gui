## Why

On slow tablets, dragging sliders in `FloorplanDimmerDialog` and `FloorplanBulbDialog` (brightness, color, white, temperature) causes the slider to visibly revert to an earlier value a few seconds after release, and the lights then behave unpredictably with no way to recover. The problem does not reproduce on fast hardware because the backend echo of the just-sent command arrives before the race window opens.

The root cause is the synchronization gate used by every `Debounced*` input component. Each component keeps a local model, polls `this.app` every 500 ms, and uses two flags — `pause` (held while the user is interacting) and `waitForNextAppChange` (held after sending, until the echo is observed) — to block the poller from overwriting local state. `waitForNextAppChange` is cleared by a **deep watcher on the entire `app` prop**, so *any* unrelated mutation inside `app` (another appliance's state, a timer field, a counter) clears the gate. On a slow device, such an unrelated mutation routinely beats the real echo; the gate opens, the next poll copies the old (not-yet-updated) backend value into the local model, and the slider snaps back. Once the user has released, there is no further event that re-syncs them, so the lights drift.

Additional smaller races compound the problem:

- `DebouncedBwPicker`'s brightness slider binds `@mousedown`/`@mouseup` (mouse-only), while its temperature slider and every other slider bind `@start`/`@end`. On touch, the brightness `pause` flag is never set, so the poller overwrites the local value mid-drag.
- `FloorplanBulbDialog.changeTabBasedOnMode` switches tabs from the deep `app` watcher using the same fragile `pause`/`waitForNextAppChange` gate, so on slow tablets the dialog can snap back to the color tab while the user is dragging in the BW tab.
- `DebouncedBrightnessSlider.mouseUp` sets `waitForNextAppChange = true` **after** awaiting the network send; any `app` mutation arriving during that await clears the flag before it is even set.

The fix is to replace the "any app change clears the gate" model with one that only clears the gate when the echo actually reflects what we sent (or a bounded timeout elapses), and to make the event wiring and tab-switch gating consistent across all four `Debounced*` components.

## What Changes

- Replace the deep-`app` watcher gate used in `DebouncedBrightnessSlider`, `DebouncedRgbwPicker`, `DebouncedBwPicker`, and `DebouncedOnOffButton` with an **echo-matched gate**: after sending, record the values sent and only clear `waitForNextAppChange` when an incoming `app` update exposes matching values for the specific fields this component controls (within a small numerical tolerance for float round-trips). Fall back to a bounded timeout (e.g. 3 s) so a lost or malformed echo cannot strand the UI.
- Replace the deep `app` watcher in each component with a **targeted watcher on only the fields the component renders** (`dimmers[0].brightness`, `rgbws[0].{red,green,blue,white,gain,brightness,colorTemperature,mode}`, `relays[0].state`), so unrelated fields never drive gate clears or poller reloads.
- Set `waitForNextAppChange = true` **before** the network send (synchronously), not after the `await` returns, in `DebouncedBrightnessSlider.mouseUp` and the equivalent code paths in the other components.
- Unify slider event bindings: `DebouncedBwPicker`'s brightness slider currently uses `@mousedown`/`@mouseup`; switch it to `@start`/`@end` so touch interactions on tablets correctly set and clear `pause`.
- Harden `FloorplanBulbDialog.changeTabBasedOnMode` to use the same echo-matched gate so mid-drag tab switches cannot race with outbound commands on slow devices.
- Add a single shared helper for the gate logic so all four `Debounced*` components go through the same code path and future inputs inherit the fix.

None of these are breaking changes for consumers — the prop contracts of `FloorplanDimmerDialog`, `FloorplanBulbDialog`, and the four `Debounced*` components stay the same.

## Capabilities

### New Capabilities

- `debounced-light-controls`: the synchronization contract for user-editable light controls (brightness, color, white, temperature, on/off) that both send commands to a backend appliance and observe an eventually-consistent echo of device state. Defines how local UI state is guarded against being overwritten by stale polled state while a command is in flight, how echoes are matched, how bounded timeouts prevent stranded UI, and how touch and mouse events must both drive the interaction gate. This capability is currently implemented ad-hoc across four components with divergent rules; this change introduces it as an explicit, testable spec.

### Modified Capabilities

<!-- none — the four Debounced* components are not covered by an existing spec today -->

## Impact

- **Code touched:**
  - `src/components/input/DebouncedBrightnessSlider.vue`
  - `src/components/input/DebouncedRgbwPicker.vue`
  - `src/components/input/DebouncedBwPicker.vue`
  - `src/components/input/DebouncedOnOffButton.vue`
  - `src/components/floorplan/dialogs/FloorplanBulbDialog.vue` (tab-switch gate)
  - likely a new shared helper under `src/utils/` (working name `echoGate.ts`) used by all four components
- **Code not touched:**
  - `src/components/floorplan/dialogs/FloorplanDimmerDialog.vue` is a pure wrapper and needs no change.
  - `src/utils/debouncer.ts` is reused as-is.
  - `src/utils/webservices/appliancesService` is reused as-is; no new backend API is required.
- **APIs / contracts:** no public API changes. No backend changes required — the fix lives entirely in the GUI's handling of the existing echo.
- **Dependencies:** none added.
- **Risk:** the new gate must not reintroduce the opposite failure mode (gate that never clears, stranding the UI). The bounded timeout and explicit "echo matches sent values" predicate are the two guards against this; both should be exercised in tests and on a real slow tablet before shipping.
