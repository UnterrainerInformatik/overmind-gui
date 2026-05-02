## 1. Floorplan reactive state

- [x] 1.1 In `src/components/floorplan/Floorplan.vue`, add the following fields to `data()` next to `updateSeq` (around line 296): `transportTimestamps: []` (array of `Date.now()` numbers, rolling 60s), `lagSamples: []` (array of ms numbers, capped at 600), `lagSampleIdx: 0`, `lastLagProbeAt: 0`, `lagProbeIntervalId: null`, `displayRefreshIntervalId: null`, `displayMsgsPerMin: '0 msgs/min'`, `displayLagMs: '0 ms'`.
- [x] 1.2 Confirm the existing `displayEnhancedDialog` prop on Floorplan (line 268) — no edit. The indicator binds to it directly.

## 2. Lag probe + display refresh lifecycle

- [x] 2.1 Add a `methods` entry `startActivityIndicator()` that: sets `transportTimestamps = []`, fills `lagSamples` with zeros (length 600), sets `lagSampleIdx = 0`, sets `lastLagProbeAt = Date.now()`, schedules `lagProbeIntervalId = window.setInterval(this.probeLag, 100)`, and `displayRefreshIntervalId = window.setInterval(this.refreshActivityDisplay, 1000)`. Calls `refreshActivityDisplay()` once immediately so the indicator shows `0 msgs/min · 0 ms` instead of stale text.
- [x] 2.2 Add a `methods` entry `stopActivityIndicator()` that: clears both intervals (guard against `null`), nulls both ids. Does NOT clear `transportTimestamps` / `lagSamples` (they'll be reinitialized on next start; leaving them alone avoids racing a final tick).
- [x] 2.3 Add `methods.probeLag()`: `const now = Date.now(); const delay = Math.max(0, now - this.lastLagProbeAt - 100); this.lagSamples[this.lagSampleIdx] = delay; this.lagSampleIdx = (this.lagSampleIdx + 1) % 600; this.lastLagProbeAt = now;`. No `this.$set` needed — we only read these via `refreshActivityDisplay`, not via the template directly.
- [x] 2.4 Add `methods.refreshActivityDisplay()`: prune `transportTimestamps` of entries older than `Date.now() - 60_000` in place (loop `shift()` while front is stale). Compute `msgs = transportTimestamps.length`. Compute `lagAvg = round(mean(lagSamples))` (nonzero entries average is fine; sum/length where length is the number of populated entries — track populated count or use `min(600, ticksSinceStart)`). Set `this.displayMsgsPerMin = \`${msgs} msgs/min\``; `this.displayLagMs = \`${lagAvg} ms\``. Use `this.$set` only if either field's reactivity ever fails (it won't, since they're declared in `data()`).
- [x] 2.5 Add a `watch.displayEnhancedDialog(newVal, oldVal)` handler: if `newVal && !oldVal` call `this.startActivityIndicator()`; if `!newVal && oldVal` call `this.stopActivityIndicator()`.
- [x] 2.6 In `mounted()` (after the existing transport-register block), if `this.displayEnhancedDialog` is already `true`, call `this.startActivityIndicator()` (covers the case where the user enters a Kiosk view with detail mode pre-toggled).
- [x] 2.7 In `beforeDestroy()`, call `this.stopActivityIndicator()` unconditionally (safe — guards against `null`).

## 3. Hook the transport-update callback

- [x] 3.1 In `Floorplan.vue` around line 884 (the `(payload) => { ... }` registered with `SseClient.getInstance().registerTransport`), at the top of the callback after the `if (!payload || !payload.values) return` early-out, add: `if (this.displayEnhancedDialog) { this.transportTimestamps.push(Date.now()) }`. The push goes BEFORE the existing `DEBUG_TRANSPORTS` log block so the count tracks "received" not "successfully looped through".
- [x] 3.2 Confirm no other counter / cache / aggregator inside the callback is affected. The existing `for (const triple of payload.values)` loop, `this.updateSeq += 1`, and `this.redraw(false)` are unchanged.

## 4. Template — render the indicator

- [x] 4.1 In the `<template>` of `Floorplan.vue`, inside the existing `<div :style="position: relative; width: 100vw">` (line 8), add as a sibling of the canvas (after the canvas block, before the `<span v-if="loaded">` block):
  ```
  <div
    v-if="displayEnhancedDialog"
    class="sse-activity-indicator"
    :style="{ color: colorOff, borderColor: colorOff }"
  >{{ displayMsgsPerMin }} · {{ displayLagMs }}</div>
  ```
- [x] 4.2 Add a `<style scoped>` rule (or equivalent — match the file's existing style block convention) for `.sse-activity-indicator`: `position: absolute; top: 4px; right: 4px; padding: 2px 6px; font-size: 12px; line-height: 1.2; font-family: monospace; border: 1px solid; border-radius: 3px; background: rgba(255, 255, 255, 0.6); pointer-events: none; user-select: none; z-index: 5;`. The `background` is a soft white so the blue text stays legible over the floorplan image. Adjust if it clashes with the actual background.
- [x] 4.3 Confirm `colorOff` reaches Floorplan in every embedding Kiosk view: `KioskLights.vue:9`, `KioskPlugs.vue:10`, `KioskContact.vue:10`, `KioskMovement.vue` (search for `:color-off=`), `KioskPresence.vue` (search). All five MUST pass `colorOff` for the indicator to color correctly. If any doesn't, add it (the existing four use `rgba(60, 60, 255, 0.6)`).

## 5. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on the dev environment after the change is on `develop`.

- [ ] 5.1 User: open `/app/kiosklights` (or any Floorplan-embedding Kiosk view) with "Show details" toggle OFF. Confirm the indicator is NOT visible.
- [ ] 5.2 User: confirm via Vue DevTools that with detail mode off, the Floorplan instance has `lagProbeIntervalId === null` and `displayRefreshIntervalId === null` (no timers running).
- [ ] 5.3 User: toggle "Show details" ON. Confirm the indicator appears at the top-right corner, in blue text matching the off-mode appliance avatars, with a thin blue border.
- [ ] 5.4 User: confirm the format reads e.g. `12 msgs/min · 4 ms` — both numbers update at most once per second, never flicker faster.
- [ ] 5.5 User: leave detail mode ON for 70+ seconds. Confirm `msgs/min` rises as updates arrive, then stabilizes; samples older than 60 s should fall off.
- [ ] 5.6 User: trigger a brief CPU spike on the tablet (e.g., open a heavy panel, scroll a long list, run a synthetic loop in DevTools console: `const t = Date.now(); while (Date.now() - t < 500) {}`). Confirm the lag readout rises briefly, then recovers within ~60 s.
- [ ] 5.7 User: click on a Floorplan area that visually overlaps the indicator's footprint (top-right). Confirm the click reaches the area (indicator does NOT block clicks).
- [ ] 5.8 User: toggle "Show details" OFF. Confirm the indicator vanishes and (in Vue DevTools) both interval ids return to `null`.
- [ ] 5.9 User: navigate away from the Kiosk view while detail mode is ON. Confirm in DevTools (Performance / Timers tab, or by inspecting `setInterval` count) that no orphan timers remain.
- [ ] 5.10 User: repeat 5.1-5.6 on phone (mobile layout) and PC (desktop layout) to confirm legibility and positioning hold across form factors per the cross-form-factor memory.

## 6. Cleanup and finalization

- [x] 6.1 Confirm `git diff` shows changes only in `src/components/floorplan/Floorplan.vue` (template, data, methods, watch, lifecycle hooks, scoped style). No other files should be touched unless 4.3 found a Kiosk view missing `colorOff`.
- [x] 6.2 Re-read each scenario in `openspec/changes/add-sse-activity-indicator/specs/sse-activity-indicator/spec.md` and confirm tasks 5.1-5.10 collectively exercise it.
- [x] 6.3 Run `volta run --node 24.15.0 openspec validate add-sse-activity-indicator` and confirm "valid".
