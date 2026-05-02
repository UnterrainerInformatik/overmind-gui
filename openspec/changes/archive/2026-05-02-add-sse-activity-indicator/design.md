## Context

The Floorplan view (`src/components/floorplan/Floorplan.vue`) registers exactly one SSE transport on mount and processes `transport-update` payloads in a synchronous callback (lines 881-944). Each payload's `values` array can contain many triples; the callback writes each triple into reactive appliance state via `Vue.set`-based helpers and triggers a `redraw`. There is presently no visibility into how many payloads are arriving, or whether the device is keeping up with them.

Detail mode is a per-view local toggle (`KioskTogglePanel.vue` → `displayEnhancedDialog: Boolean` prop on Floorplan). When on, additional avatars become clickable and dialogs open in their full form. There is no Vuex/Pinia state for this — every Floorplan-embedding Kiosk view passes the prop down. Off-mode avatar fill is `rgba(60, 60, 255, 0.6)`, supplied to Floorplan as the `colorOff` prop from each Kiosk view (`KioskLights.vue:9`, `KioskPlugs.vue:10`, etc.) — not a CSS variable.

The user wants a small, top-right indicator showing throughput (msgs/min) and saturation (event-loop lag), visible only while detail mode is on, color-matched to off-mode avatars, and legible across tablet, mobile, and PC layouts.

## Goals / Non-Goals

**Goals:**
- Show a continuous, at-a-glance indicator of SSE throughput and the device's ability to keep up.
- Zero overhead (no timers, no allocations) when detail mode is off.
- Single source of truth for the off-mode color: read the existing `colorOff` prop, do not duplicate the value.
- Coverage of every Floorplan-embedding view (5 Kiosk views today) with no per-view edits.
- Counters reset cleanly across `mounted` / `beforeDestroy` so route changes don't leak intervals or stale samples.

**Non-Goals:**
- No new public API on `SseClient`. Counting happens inside Floorplan's existing transport callback.
- No global Vuex state for the indicator. Local component state is sufficient.
- No historical persistence (no localStorage, no backend reporting).
- No alerting / coloring thresholds beyond the static blue. If lag is high, the user reads the number — we don't paint the indicator red.
- No per-triple count. We count batches, since one batch = one backend emit and one reactive write cycle. (A separate triple counter could be added later if it proves useful; out of scope here.)
- No render-flush latency or queue-depth instrumentation (rejected alternatives — see Decisions).

## Decisions

### D1: Count batches, not triples

A `transport-update` payload arrives as one event with an array of triples. The user said "messages received". One batch = one event = one backend emit, which is the most operator-meaningful unit. Triples are an implementation detail of the backend's batching and would mostly inflate the number without telling the user something different.

**Alternatives considered:**
- *Triples per minute*: closer to "reactive writes performed per minute", but the magnitude varies wildly with backend batching strategy and is harder to reason about.
- *Both*: clutters the indicator. We display only batches; if triples become important, expose them via the existing `DEBUG_TRANSPORTS` console log.

### D2: Saturation = event-loop lag via a 100 ms `setInterval` probe

Schedule `setInterval(probe, 100)`. Each tick records `Date.now() - lastTick - 100` (clamped to `0`). Average the samples over the rolling window. The displayed lag is the *average extra delay beyond the requested 100 ms* over the last 60 seconds.

Why this metric:
- Independent of SSE traffic — measures the device, not the channel.
- Trivially cheap (one timer, one subtraction per tick).
- Maps directly to "is the tablet keeping up": a healthy tablet shows ~0-10 ms; a saturated one shows 50+ ms.
- Doesn't require touching `SseClient` or the transport callback's hot path.

**Alternatives considered:**
- *Processed/received ratio*: requires marking the start and end of callback execution. SseClient dispatches synchronously, so received ≡ processed unless we add async work — which we won't. Ratio would always be 1.0. **Rejected.**
- *Render-flush latency* (timestamp on receive, again on `$nextTick`): more invasive, requires a per-batch closure, and conflates Vue's flush scheduling with device load. **Rejected as too noisy for the headline metric.**
- *Queue depth in SseClient*: there is no queue today — SseClient calls `record.callback(payload)` synchronously inside the EventSource handler. Adding one just to expose depth would change SseClient's contract. **Rejected.**

### D3: Rolling-window data structure

Two arrays in `data()`:
- `transportTimestamps: number[]` — pushed `Date.now()` per batch; pruned to entries < 60 s old on every push and on every display recompute.
- `lagSamples: number[]` — fixed-size circular buffer of length `600` (60 s × 10 Hz). Index advances with `(i + 1) % 600`. No allocation per sample after warm-up.

Display strings update via a `setInterval(updateDisplay, 1000)` that writes two `data()` strings (`displayMsgsPerMin`, `displayLagMs`) used by the template. We use a 1 s display cadence so the numbers don't flicker faster than a human can read them, and so the rolling-window prune happens at most once per second from the display path.

**Alternatives considered:**
- *Vue computed property*: would re-run on every dependency change. Since the timestamps array is mutated in place we'd need a "tick" counter dependency anyway — same complexity, less control over update cadence.
- *requestAnimationFrame for display refresh*: overkill for a 1 s readout.

### D4: Mount the timers only when detail mode is on

Watch `displayEnhancedDialog`. On `false → true`, start the lag probe and the display interval, and reset both arrays. On `true → false`, clear both intervals and let the arrays be garbage-collected on next push. On `beforeDestroy`, clear unconditionally (defensive).

This guarantees zero runtime cost when detail mode is off — the user pays only for what they see. The transport callback always increments cheaply (a single `push` + occasional `shift`-equivalent prune), so we leave the counter on the hot path; this is sub-microsecond and `transportTimestamps` is bounded anyway by the prune.

Actually — small refinement: even the `push` + prune costs something on every batch. We can make it conditional: `if (this.displayEnhancedDialog) this.transportTimestamps.push(now)`. This makes "indicator off" truly free.

### D5: Color sourcing — bind to `colorOff` prop

The indicator's text/border color is `:style="{ color: colorOff, borderColor: colorOff }"`. This stays in sync if any Kiosk view ever changes its `colorOff` prop.

**Alternative considered:** hardcoding `rgba(60, 60, 255, 0.6)` in the indicator's CSS. **Rejected** — duplicates a value that is already a prop, and would drift if a view ever passed a different off color (some niche detail view might want yellow-off, etc.).

### D6: Layout — absolute-positioned `<div>` in the existing relative-positioned wrapper

Floorplan's template root has `<div :style="position: relative; width: 100vw">` (line 8). We add a sibling `<div>` inside it with `position: absolute; top: 4px; right: 4px;` and a `v-if="displayEnhancedDialog"` guard. Width auto-sizes to content; explicit `font-size: 12px` keeps it small but legible; `pointer-events: none` so it never intercepts clicks. Format: `12 msgs/min · 8 ms` (interpunct separator). Border-radius and a thin border in `colorOff` make it feel like an avatar at a glance.

### D7: No new component file

We keep the indicator inline in `Floorplan.vue`. Reasons:
- ~15 lines of template + ~20 lines of script. A separate component is more ceremony than substance.
- The data lives in Floorplan anyway (transport callback, lifecycle). A separate component would either duplicate the SSE subscription (bad) or take everything as props (fine, but unnecessary).

If reuse is wanted later (e.g., `KioskOverview` dashboard), extracting `<SseActivityIndicator>` is mechanical.

## Risks / Trade-offs

- **[Risk] Adding a `push` in the transport callback hot path could regress performance.**
  → Mitigation: gate the push on `this.displayEnhancedDialog`. Off-mode pays nothing; on-mode pays one timestamp push per batch (microseconds), bounded by the prune at display time.

- **[Risk] `setInterval`-based lag probe drifts under heavy GC pauses or tab throttling (background tabs).**
  → Mitigation: the drift IS the signal. Background-tab throttling will show massive lag, which is correct — the tablet *is* not keeping up while backgrounded. Operators viewing the foreground tab see meaningful values.

- **[Risk] Indicator obscures top-right Floorplan content (icons, labels).**
  → Mitigation: very small footprint (~120×24 px), `pointer-events: none`, only visible in detail mode where the user is actively inspecting. If a clash surfaces in real use, swap top-right for top-left in one prop / line change.

- **[Trade-off] Counting batches not triples loses fidelity into per-event size.**
  → Acceptable: the user's framing was "messages received". Per-triple counts can be added later without breaking the spec (additive).

- **[Trade-off] Local state means the indicator resets on route change.**
  → Acceptable and expected: each Floorplan mount is its own session. A persistent dashboard counter is out of scope.

## Migration Plan

Single PR. Implementation is additive — no existing requirement of `floorplan-live-updates`, `sse-transport-client`, or `sse-connection-indicator` changes.

Rollback: revert the PR. No persistent state, no migrations, no backend changes.

## Open Questions

- Display format: `12 msgs/min · 8 ms` vs `12/min · 8ms lag` vs `12 · 8ms`. Going with the first as a reasonable default; trivial to tweak in the template if the user prefers shorter.
- Should the indicator also surface the `sseHandle.id` (or a short prefix) for support diagnostics in detail mode? Adds a few characters; out of scope for v1 but easy to add later.
