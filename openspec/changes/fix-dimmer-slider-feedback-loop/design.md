## Context

Today, every `Debounced*` light control (`DebouncedBrightnessSlider`, `DebouncedRgbwPicker`, `DebouncedBwPicker`, `DebouncedOnOffButton`) implements an ad-hoc synchronization gate against the incoming `app` prop. The gate uses two per-component flags (`pause`, `waitForNextAppChange`), a `setInterval(500ms)` poller that copies `app.state.*` into a local model, and a deep watcher on the whole `app` prop that clears `waitForNextAppChange` on any mutation.

That design works on a fast CPU because the only `app` mutation that races the user's just-sent command is the backend's echo of that command. On slow tablets, the backend round-trip takes long enough that *unrelated* `app` mutations (other appliances, counters, timer fields, polling of the wider state tree) fire the deep watcher first, clear the gate, and let the next 500 ms poller tick overwrite the local model with the **pre-send** backend value. The slider visibly snaps back, and because the debouncer's final send has already happened, no further event recovers the correct state.

The bug is amplified by three smaller issues:

1. `DebouncedBwPicker`'s brightness slider binds `@mousedown`/`@mouseup`, not `@start`/`@end`, so on touch the `pause` flag is never set.
2. `DebouncedBrightnessSlider.mouseUp` sets `waitForNextAppChange = true` **after** the `await` on the network send, so any `app` update that arrives during that `await` clears the flag before it is ever set.
3. `FloorplanBulbDialog.changeTabBasedOnMode` switches tabs from its own deep `app` watcher, using an independent (local-to-dialog) copy of the same `pause` / `waitForNextAppChange` dance. The dialog-level gate races the child-level gate on slow tablets and can snap the active tab mid-drag.

The project is Vue 2 (`data: () => ({...})`, `beforeDestroy`, `v-slider` emitting `@start`/`@end`). The backend appliance service (`appliancesService`) is considered fixed; no backend change can be requested for this fix. The `Debouncer` class in `src/utils/debouncer.ts` is reused as-is and is correct for its narrow purpose (collapsing rapid sends); it is not the source of the race.

## Goals / Non-Goals

**Goals:**

- Fix the observed regression on slow tablets: a released slider/color-picker/white-slider no longer snaps back to its pre-send value.
- Unify the four ad-hoc gates into a single shared helper (`echoGate`) so the semantics are defined in one place and new controls inherit the fix automatically.
- Make touch and mouse input paths equivalent for all controls in scope.
- Keep `FloorplanBulbDialog`'s tab auto-switch working for genuine external mode changes, but stop it from racing mid-drag.
- Make the fix verifiable on an actual slow device (not just in theory on a dev machine).

**Non-Goals:**

- No backend / protocol changes. The backend's echo is treated as authoritative once it arrives and does not need to grow a sequence number or command id.
- No migration to Vue 3, no migration to `<script setup>`, no Composition API rewrite. The fix stays idiomatic Vue 2 Options API.
- No rewrite of `src/utils/debouncer.ts`. The Debouncer is correct; we only change how its `enqueueing` and `ending` callbacks interact with the gate.
- No changes to `FloorplanDimmerDialog.vue`. It is a thin prop forwarder; all its logic lives in child controls.
- No refactor of `appliancesService` or the wider state polling. The fix is local to the four controls + `FloorplanBulbDialog` + one new helper.
- No attempt to move to a reactive store (Vuex / Pinia). The `app` prop stays as-is.

## Decisions

### Decision 1: Introduce `EchoGate` as a shared helper class

Add `src/utils/echoGate.ts`, a class modeled on the existing `Debouncer` (which lives at `src/utils/debouncer.ts` and uses the same constructor-with-options pattern). One instance per control.

```ts
// Public surface (indicative, not final).
export interface EchoGateOptions<T> {
  // How to pull the controlled field values out of the `app` prop.
  // Returns null when the path is not yet available (e.g. before mount).
  read: (app: any) => T | null

  // Echo-match predicate: does the inbound T equal the last sent T?
  // Implementations use float tolerance for numeric fields and exact
  // equality for string enums.
  matches: (sent: T, incoming: T) => boolean

  // Bounded gate timeout in ms. Default: 3000.
  timeout?: number
}

export class EchoGate<T> {
  constructor(opts: EchoGateOptions<T>) { /* ... */ }

  // True while in-flight (interaction or awaiting echo or both).
  isInFlight(): boolean

  // Enters in-flight because the user started interacting.
  // No expected-echo values yet (user hasn't committed).
  holdForInteraction(): void

  // Enters in-flight with an expected echo to match. Synchronous —
  // callers MUST call this BEFORE `await appliancesService.set...()`.
  register(sent: T): void

  // Feed an inbound app update. Returns true if the gate just released.
  // Callers wire this to a targeted watcher on their controlled fields.
  observe(app: any): boolean

  // Releases the interaction hold without clearing an awaited echo.
  // Called on pointer-up / @end so that the gate reverts to pure
  // echo-wait mode after the user lifts their finger.
  releaseInteraction(): void

  // Teardown: cancel pending timeout. Call from beforeDestroy().
  destroy(): void
}
```

Internally the gate holds three flags:

- `interacting: boolean` — set by `holdForInteraction`, cleared by `releaseInteraction`.
- `sent: T | null` — the last value passed to `register`. `null` means nothing is expected.
- `timeoutId: number | null` — the bounded-release timer.

`isInFlight()` returns `interacting || sent !== null`.

`register(v)` sets `sent = v`, clears any existing `timeoutId`, and starts a fresh `setTimeout(() => this.forceRelease(), this.timeout)`. This runs synchronously before the caller's `await`, which is the key fix for race #2 above.

`observe(app)` reads the controlled field value via `opts.read(app)`. If `sent` is `null`, nothing to match and the function returns `false`. Otherwise it runs `opts.matches(sent, incoming)`; on a match it clears `sent` and `timeoutId` and returns `true`. Non-matching inbound updates do nothing — the gate stays armed.

`forceRelease()` (the timeout path) clears `sent` and `timeoutId` unconditionally. This is the "bounded stranding" escape hatch.

**Why a class over a composable/mixin:** matches the existing `Debouncer` pattern in the same `utils` directory, keeps the helper framework-agnostic (testable without Vue), and is explicit about lifetime (one `destroy()` call on unmount).

**Why pass `read` and `matches` as options rather than inferring:** each control has different controlled fields and different numeric semantics (float 0-1 vs string enums). Passing them explicitly is less code than a generic schema and clearer at the call site.

### Decision 2: Echo matching tolerances and predicates

| Field type | Predicate | Rationale |
|---|---|---|
| `brightness`, `white`, `gain`, `red`, `green`, `blue`, `colorTemperature` (0-1 floats) | `Math.abs(sent - incoming) <= 0.005` | 0.5% of full scale. Well above float round-trip error through JSON and backend, well below the smallest UI step (sliders are 0-100 integers, so 1 step = 0.01). |
| `relays[n].state` (`'ON'` / `'OFF'`) | `sent === incoming` | String enum. |
| `rgbws[0].mode` (`'WHITE'` / `'COLOR'` / ...) | `sent === incoming` | String enum. Used by `FloorplanBulbDialog` tab switcher. |

Each control's `matches` callback composes the appropriate predicate per field. For composite controls (color picker sends 5 numeric fields at once), the overall match is the **conjunction** of per-field matches: all must be within tolerance for the gate to release.

**Alternative considered:** use a single tolerance (e.g. 0.01). Rejected because 0.01 is the slider step; two adjacent positions would be considered echo-matches, which is wrong.

**Alternative considered:** use exact equality after rounding to 2 decimals. Rejected because rounding depends on the backend's exact float storage, which we don't control; a tolerance predicate is more forgiving without being sloppy.

### Decision 3: Gate timeout = 3000 ms

Polling interval is 500 ms, so the spec's "at least 2× polling interval" floor is 1000 ms. We go higher because:

- User reports say the snap-back happens "after a few seconds" on slow tablets — the real echo arrives within that window, so the gate timeout should be long enough to cover the slowest realistic round-trip.
- If the gate is too short, a genuinely slow echo will release the gate prematurely and re-expose the original race.
- If the gate is too long, a user who sends a command that the backend can't satisfy (e.g. the device is disconnected) sees a stuck UI. 3 seconds is annoying but not broken; 10 seconds would be.

3000 ms is the default; the helper's `timeout` option lets individual controls override if a specific control needs something different. We start with 3000 ms for all four controls and revisit only if a specific one misbehaves.

### Decision 4: Targeted watcher via `this.$watch` instead of deep `app` watcher

Each control registers a single function watcher in `mounted()`:

```js
mounted () {
  this.gate = new EchoGate({ /* ... */ })
  this.unwatchFields = this.$watch(
    () => this.gate.read(this.app),   // reuse the same reader
    (newVal /* , oldVal */) => {
      const released = this.gate.observe(this.app)
      if (released || !this.gate.isInFlight()) {
        this.copyFromApp(this.app)
      }
    }
  )
  this.copyFromApp(this.app)
  this.interval = setInterval(() => {
    if (this.gate.isInFlight()) return
    this.copyFromApp(this.app)
  }, 500)
}

beforeDestroy () {
  this.unwatchFields && this.unwatchFields()
  this.interval && clearInterval(this.interval)
  this.gate && this.gate.destroy()
}
```

**Why function watcher:** `this.$watch(() => expr, cb)` works for any path, including array indices (`app.state.dimmers[0].brightness`), which string-key watches cannot express cleanly in Vue 2.

**Why keep the 500 ms poller alongside the watcher:** the existing code leans on the poller as a safety net against Vue's deep-reactivity quirks on nested objects. Removing it is outside the scope of this bug fix and would be a separate change. The poller is harmless now because it checks `gate.isInFlight()` before each copy.

### Decision 5: Unify slider events on `@start` / `@end`

All `v-slider` bindings across the four controls MUST use `@start` / `@end`, not `@mousedown` / `@mouseup`. `DebouncedBwPicker`'s brightness slider is the only offender today and must be changed. Vuetify emits `@start` and `@end` for both mouse and touch on `v-slider`, so this gives touch parity automatically.

Slider interaction wiring becomes:

```html
<v-slider @start="onInteractionStart" @end="onInteractionEnd" ... />
```

```js
onInteractionStart () {
  this.gate.holdForInteraction()
},
async onInteractionEnd () {
  const v = this.packValues()           // snapshot local model
  this.gate.register(v)                  // SYNCHRONOUS — before await
  this.gate.releaseInteraction()         // user is no longer holding
  await appliancesService.setX(...)      // may throw; gate still armed
}
```

Note the ordering: `register` first (synchronous, enters echo-wait), `releaseInteraction` second (drops the interaction hold), `await` last. If the send throws, the gate remains in echo-wait mode and will release via the 3 s timeout.

### Decision 6: Color picker uses the Debouncer as its interaction signal

`v-color-picker` has no `@start`/`@end`; it only emits `update:color` continuously during a drag. We reuse the existing `Debouncer` callbacks:

```js
this.debouncer = new Debouncer(500, {
  enqueueing: () => { this.gate.holdForInteraction() },
  ending: () => {
    this.gate.register(this.packValues())
    this.gate.releaseInteraction()
  }
})
```

Semantics:

- First `update:color` during a drag → `debouncer.debounce(...)` → `enqueueing` fires → gate is `holdForInteraction`.
- Each subsequent `update:color` replaces the `lastFunc` inside the debouncer; no further `enqueueing` fires (the debouncer's `timer` is already set), so the gate stays held without re-arming.
- When the debouncer's `cleanupRun` sends the final values and there's no more work, `ending` fires → gate moves from interaction-hold to echo-wait with the final sent values as the match target.

This means the gate is held across the entire drag (not just after release), which is the intended behavior: no mid-drag poll can overwrite the picker.

**Alternative considered:** listen for `pointerdown` / `pointerup` on the color picker's wrapper `<div>`. Rejected because Vuetify's color picker delegates to subcomponents and catching pointer events there is fragile across Vuetify versions; the Debouncer hooks are already wired and already fire at exactly the right moments.

### Decision 7: `FloorplanBulbDialog` queries child gates instead of maintaining its own

Replace the dialog's local `pause` / `waitForNextAppChange` flags with a direct query against the active child control's gate, reached through `this.$refs`:

```js
watch: {
  'app.state.rgbws[0].mode': {
    handler () { this.changeTabBasedOnMode() },
    immediate: true
  }
},
methods: {
  changeTabBasedOnMode () {
    if (this.childInFlight()) return
    // existing mode-based tab assignment logic
  },
  childInFlight () {
    const picker = this.tab === 0 ? this.$refs.rgbwPicker : this.$refs.bwPicker
    return !!picker && picker.gate && picker.gate.isInFlight()
  }
}
```

The dialog's previous deep `app` watcher is replaced by a targeted watcher on `mode`. `immediatelySetValues()` on tab change is preserved — that path is the explicit "user committed via tab change" and already maps to `gate.register(...)` in the child (Decision 6), so no special-case needed at the dialog level.

**Alternative considered:** emit an `in-flight` event from each child upward to the dialog. Rejected because `$refs`-based polling is local, lighter, and doesn't require every future child control to opt into emitting a new event.

### Decision 8: `DebouncedOnOffButton` uses a simpler variant of the same helper

On/off is a single-field, single-shot control with no debouncer and no slider. It still needs the gate, because the existing `waitForNextAppChange` bug affects it too — an unrelated `app` mutation can un-disable the button before the backend echoes the toggle. The fix is the same helper with `read = (app) => app.state.relays[<index>].state`, `matches = strict equality`, and `timeout = 3000`.

The button's `:disabled` binding should read `gate.isInFlight()` rather than a separate flag, so the button is disabled for the full echo-wait window (same as the slider's "local model is authoritative" window, spelled out in specs).

## Risks / Trade-offs

- **Risk: Gate never releases (stuck UI).** → Mitigation: the 3000 ms bounded timeout is unconditional and always clears `sent`. Even if `matches` is buggy or the backend sends a garbage echo, the UI unsticks within 3 seconds.
- **Risk: Gate releases too early (regression of the original bug).** → Mitigation: the tolerance (0.005) is well below the smallest meaningful UI step (0.01), so intermediate values cannot be mistaken for echoes; the `matches` predicate requires ALL controlled fields to match for composite controls.
- **Risk: Touch `@end` doesn't fire on some edge case (OS-level gesture interruption).** → Mitigation: the 3000 ms timeout also covers this. The control will look stuck for up to 3 seconds and then recover.
- **Risk: Tolerance is miscalibrated against the backend's actual float round-trip error.** → Mitigation: verify on a real device during rollout; the tolerance is a single constant in `echoGate.ts`, easy to adjust. Also: if the tolerance is too tight, the fallback is the 3000 ms timeout, which degrades gracefully to "looks stuck briefly then recovers" rather than "snaps back".
- **Trade-off: Gate is held across the entire color-picker drag, blocking poller overwrites.** This means a concurrent external change to the light (e.g. automation or another client) will not be visible during a drag. Accepted: it's a narrow window, and the existing `pause`/`waitForNextAppChange` design already had this property.
- **Trade-off: The existing 500 ms poller is kept.** Pure Vue reactivity on `app.state.*` should be enough with the targeted watcher, and the poller is strictly redundant — but removing it is a separate change with its own testing burden. Keeping it is the low-risk path for this bug fix.
- **Trade-off: `FloorplanBulbDialog` still uses `$refs` to peek at child state.** Not ideal from a composition standpoint, but the dialog already does this for `immediatelySetValues()` and the alternative (upward events) is more code for no visible benefit here.

## Migration Plan

This is a self-contained GUI change.

1. Land `src/utils/echoGate.ts` with unit tests that cover: register-then-match-release, register-then-timeout-release, unrelated-inbound-ignored, multi-field composite match, teardown clears timer.
2. Migrate `DebouncedBrightnessSlider.vue` first (simplest, single numeric field). Verify on a slow tablet that the original repro no longer reproduces and that external brightness changes while the dialog is idle still reflect within one poll tick.
3. Migrate `DebouncedOnOffButton.vue` (single string enum field).
4. Migrate `DebouncedBwPicker.vue`, including the `@mousedown`/`@mouseup` → `@start`/`@end` fix on the brightness slider.
5. Migrate `DebouncedRgbwPicker.vue` (composite 5-field gate; picker via Debouncer hooks per Decision 6).
6. Migrate `FloorplanBulbDialog.vue` tab-switch logic.
7. Delete the now-unused per-component `pause`, `waitForNextAppChange`, and deep-`app` watchers.

Each step is committable on its own; the gate helper and the per-component migrations are independent commits so a bisect can pinpoint any regression.

**Rollback:** this is a local GUI change with no backend coupling. Revert the relevant commits.

## Open Questions

- **Exact tolerance against the real backend.** 0.005 is the design default; it may need to be tightened or loosened once verified on a real slow tablet + real appliance. The tolerance is a single constant in `echoGate.ts` so adjusting is cheap.
- **Should `EchoGate` log to the console when the timeout path fires?** Leaning yes (as a `console.warn` so a developer notices stuck-echo cases in DevTools), but not strictly required. Decide during implementation; either choice is reversible.
- **Does the existing `Debouncer`'s `cancel()` get called anywhere we'd need the gate to also reset?** A quick audit of callers during implementation will confirm; if so, `EchoGate` may grow a `reset()` that leaves the timer running but clears `sent`. Not required by the spec.
