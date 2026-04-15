## 1. Shared helper

- [x] 1.1 Create `src/utils/echoGate.ts` with the `EchoGate<T>` class and `EchoGateOptions<T>` interface as specified in design Decision 1 (`isInFlight`, `holdForInteraction`, `register`, `observe`, `releaseInteraction`, `destroy`).
- [x] 1.2 Implement `register` so it sets `sent`, clears any existing timer, and starts a fresh `setTimeout(forceRelease, timeout)` — all synchronously, before any `await` at the call site.
- [x] 1.3 Implement `observe(app)` to call `opts.read(app)`, short-circuit when `sent === null`, and only clear `sent` + timer when `opts.matches(sent, incoming)` returns true; return a boolean indicating whether the gate just released.
- [x] 1.4 Implement `forceRelease` (timeout path) to clear `sent` and the timer unconditionally, plus a `console.warn` naming the gate's `debugLabel` option so stuck-echo cases are visible in DevTools.
- [x] 1.5 Default `timeout` to 3000 ms; keep it overridable per-instance.
- [x] 1.6 Implement `destroy` to clear any pending timer so no callback runs after `beforeDestroy`.
- [x] 1.7 Add a small tolerance helper `floatEchoMatcher(tolerance = 0.005)` exported from the same file, returning a `(sent, incoming) => boolean` suitable for composite numeric matching (all fields within tolerance).

## 2. Helper unit tests — DROPPED

**Reason (decided during apply):** the repo has no test harness (no jest/vitest/mocha in `package.json`, no test config, no `tests/` directory; only `serve`/`build`/`lint` scripts). Adding a framework is a project-wide tooling change, out of scope for this bug fix. The gate class is still covered indirectly by manual slow-tablet verification (tasks 9.x), which is the only check that reliably catches the actual race this change fixes.

- [~] 2.1 Add a unit test harness for `echoGate.ts` — DROPPED (no harness exists).
- [~] 2.2 Test: `register` + matching `observe` releases the gate — DROPPED.
- [~] 2.3 Test: `register` + non-matching `observe` keeps the gate in-flight — DROPPED.
- [~] 2.4 Test: `register` + no `observe` within `timeout` releases via timeout — DROPPED.
- [~] 2.5 Test: composite numeric `matches` requires ALL fields within tolerance — DROPPED.
- [~] 2.6 Test: numeric tolerance accepts `0.7999998` for sent `0.80` — DROPPED.
- [~] 2.7 Test: string-enum `matches` uses exact equality — DROPPED.
- [~] 2.8 Test: `holdForInteraction` / `releaseInteraction` semantics — DROPPED.
- [~] 2.9 Test: `destroy` clears a pending timeout — DROPPED.
- [~] 2.10 Test: unrelated `observe` inputs are ignored — DROPPED.

## 3. Migrate `DebouncedBrightnessSlider`

- [x] 3.1 Replace `pause` / `waitForNextAppChange` with a single `EchoGate<number>` instance configured with `read = app => app.state?.dimmers?.[0]?.brightness ?? null`, `matches = floatEchoMatcher(0.005)`, `timeout = 3000`.
- [x] 3.2 Replace the deep `app` watcher with a targeted function watcher via `this.$watch(() => this.gate.read(this.app), () => { const released = this.gate.observe(this.app); if (released || !this.gate.isInFlight()) this.getBrightness(this.app) })`.
- [x] 3.3 Rewrite `mouseUp` so `this.gate.register(this.brightness / 100)` runs SYNCHRONOUSLY before `await appliancesService.setBrightness(...)`, and `this.gate.releaseInteraction()` runs immediately after `register`, BEFORE the `await`.
- [x] 3.4 `mouseDown` calls `this.gate.holdForInteraction()`.
- [x] 3.5 Gate the 500 ms poller on `if (this.gate.isInFlight()) return` (remove the old `pause || waitForNextAppChange` check).
- [x] 3.6 Add `this.gate.destroy()` and watcher teardown to `beforeDestroy`.
- [x] 3.7 Verify the `v-slider` bindings already use `@start` / `@end` and not `@mousedown` / `@mouseup` (they do today — confirm during migration).

## 4. Migrate `DebouncedOnOffButton`

- [x] 4.1 Add an `EchoGate<'ON' | 'OFF'>` instance configured with `read` pointing at the relay index selected by `getActorPathOf(app, item.index)` (handles single `relays[0]` and dual `relays[1]`), `matches = strict equality`, `timeout = 3000`.
- [x] 4.2 In `toggle()`, determine the target state, call `this.gate.register(target)` synchronously, then `await appliancesService.turnOn/turnOff(...)`.
- [x] 4.3 Replace the `waitForNextAppChange` flag in the `:disabled` binding with `this.gate.isInFlight()`.
- [x] 4.4 Remove the deep `app` watcher; add a targeted `this.$watch(() => this.gate.read(this.app), () => this.gate.observe(this.app))`.
- [x] 4.5 Remove the now-unused `waitForNextAppChange` and `disabled` flags from `data()` (the gate's `isInFlight` replaces both; the local `disabled = true` during the in-flight `await` is no longer needed because the button is already bound to `gate.isInFlight()`).
- [x] 4.6 Call `this.gate.destroy()` in `beforeDestroy`.

## 5. Migrate `DebouncedBwPicker`

- [x] 5.1 Change `<v-slider ... @mousedown="mouseDown" @mouseup="mouseUp">` (the brightness slider) to `@start="mouseDown" @end="mouseUp"` so touch interactions trigger the gate on tablets. The temperature slider already uses `@start`/`@end`.
- [x] 5.2 Add a single `EchoGate<{ brightness: number; colorTemperature: number }>` instance configured with `read = app => { const r = app.state?.rgbws?.[0]; return r?.brightness !== undefined && r?.colorTemperature !== undefined ? { brightness: r.brightness, colorTemperature: r.colorTemperature } : null }`, `matches` using composite `floatEchoMatcher(0.005)`, `timeout = 3000`.
- [x] 5.3 Rewrite `mouseUp` so it calls `this.gate.register({ brightness: this.brightness / 100, colorTemperature: this.temp / 100 })` synchronously, then `releaseInteraction`, then `await appliancesService.setWhite(...)`.
- [x] 5.4 `mouseDown` calls `this.gate.holdForInteraction()`.
- [x] 5.5 Replace the deep `app` watcher with `this.$watch(() => this.gate.read(this.app), () => { const released = this.gate.observe(this.app); if (released || !this.gate.isInFlight()) this.getValues(this.app) })`.
- [x] 5.6 Gate the poller on `gate.isInFlight()`; delete `pause` and `waitForNextAppChange` from `data()`.
- [x] 5.7 `immediatelySetValues()` (called by the parent dialog on tab change) must also call `this.gate.register(...)` synchronously before the network send.
- [x] 5.8 Add `gate.destroy()` to `beforeDestroy`.

## 6. Migrate `DebouncedRgbwPicker`

- [x] 6.1 Add an `EchoGate<{ red: number; green: number; blue: number; white: number; gain: number }>` instance; composite `matches` using `floatEchoMatcher(0.005)` across all five fields; `timeout = 3000`.
- [x] 6.2 ~~Wire the existing `Debouncer` hooks per design Decision 6~~ **SUPERSEDED during apply.** Discovered that `Debouncer.cleanupRun` short-circuits (`if (!this.lastFunc) return`) when only a single `debounce()` call fired, so the `enqueueing`/`ending` hook pair never runs the `ending` callback on single-fire paths (e.g. `mouseUpWhite` release, single-tap color pick). That would strand the gate in `interacting=true` indefinitely. Instead, moved `register(packValues()) + releaseInteraction()` INSIDE the debounced function itself and added `holdForInteraction()` at the call site (`setColor`, `mouseDownWhite`) before `saveValues`. This works for both rapid-fire (color drag) and single-fire (white slider release, single tap) paths without depending on Debouncer's `ending` callback. Added `packValues()` helper as originally specified.
- [x] 6.3 ~~On the white-slider's `mouseDownWhite` / `mouseUpWhite` path, call `this.gate.holdForInteraction()` on down and (on up, inside `saveValues`) let the debouncer's `ending` do the `register`~~ **SUPERSEDED.** White-slider `mouseDownWhite` still calls `holdForInteraction`, but `register`/`releaseInteraction` now come from the debounced func itself (see 6.2 correction), not from Debouncer's `ending` hook.
- [x] 6.4 `immediatelySetValues()` must call `this.gate.register(this.packValues())` synchronously before the network send, then release interaction.
- [x] 6.5 Replace the deep `app` watcher with `this.$watch(() => this.gate.read(this.app), () => { const released = this.gate.observe(this.app); if (released || !this.gate.isInFlight()) this.getValues(this.app) })`.
- [x] 6.6 Gate the poller on `gate.isInFlight()`; delete `pause` and `waitForNextAppChange` from `data()`.
- [x] 6.7 Add `gate.destroy()` to `beforeDestroy`.

## 7. Migrate `FloorplanBulbDialog`

- [x] 7.1 Delete the dialog's local `pause` and `waitForNextAppChange` flags from `data()`.
- [x] 7.2 Replace the deep `app` watcher with a targeted `this.$watch(() => this.app?.state?.rgbws?.[0]?.mode, () => this.changeTabBasedOnMode(), { immediate: true })`.
- [x] 7.3 Add a `childInFlight()` method that looks at the currently-visible child (`this.tab === 0 ? this.$refs.rgbwPicker : this.$refs.bwPicker`) and returns `!!ref?.gate?.isInFlight()`. Rename `rgbwPicker` ref / `bwPicker` ref to match the new method's expectations (they already exist with those names).
- [x] 7.4 Rewrite `changeTabBasedOnMode` to bail out via `if (this.childInFlight()) return` instead of the old `pause || waitForNextAppChange` check.
- [x] 7.5 Verify the `tab` watcher's existing call to `this.$refs.[rgbw|bw]Picker.immediatelySetValues()` still works — it delegates to the child, which now routes through its own gate (task 5.7 / 6.4).
- [x] 7.6 Remove the debug-line rendering `tab: {{ tab }}` and `mode: {{ app.state.rgbws[0].mode }}` from the template (leftover dev output).

## 8. Cleanup

- [x] 8.1 Grep the four migrated components and `FloorplanBulbDialog` for any remaining references to `pause`, `waitForNextAppChange`, or `deep: true` on the `app` prop; remove leftovers. (Verified during apply: zero matches.)
- [x] 8.2 Grep `src/components/input/Debounced*.vue` for `@mousedown` / `@mouseup` bindings on `v-slider`; there should be zero after this change. (Verified: zero matches.)
- [x] 8.3 Confirm `src/utils/debouncer.ts` is unchanged (it should be — this change does not touch the debouncer). (Verified via `git status`.)
- [x] 8.4 Confirm `FloorplanDimmerDialog.vue` is unchanged (it should be — pure wrapper). (Verified via `git status`.)

## 9. Manual verification on a slow tablet

- [ ] 9.1 Reproduce the original bug against the pre-fix build: drag the brightness slider on a slow tablet, release, confirm the slider snaps back within a few seconds. (Baseline so we know the repro is reliable.)
- [ ] 9.2 After the fix, repeat 9.1 on the same tablet: the slider must stay at the released value and the light must reach that value with no snap-back.
- [ ] 9.3 Repeat 9.2 for the RGBW color picker (drag around, release), the BW brightness slider, the BW temperature slider, the RGBW white slider, and the on/off button.
- [ ] 9.4 Verify `FloorplanBulbDialog` tab switch: open the dialog while in COLOR mode, drag a BW-tab value, release, confirm the tab does not snap back to color mid-drag or mid-echo-wait.
- [ ] 9.5 Verify external updates still reflect: change a light from another client while the dialog is open and idle; the slider / picker / button must update within ~1 polling interval.
- [ ] 9.6 Verify the 3000 ms timeout escape hatch: disconnect the appliance, drag a slider, release; after ~3 s the UI must unstick and become interactive again (it will show the stale value, that's OK — the gate is just no longer held).
- [ ] 9.7 Verify no console warnings appear on a fast machine with a good connection (baseline — timeouts should never fire on happy path).
- [ ] 9.8 Verify the `console.warn` from task 1.4 fires on the slow-tablet case of 9.6 so future stuck-echo cases are visible to developers.
