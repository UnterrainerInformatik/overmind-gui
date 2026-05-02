## Why

When a Floorplan / Kiosk view is open for a long session on a tablet, mobile, or PC, there is no visible signal of how busy the SSE channel is or whether the device is keeping up with the stream of `transport-update` payloads. If the tablet falls behind (event-loop saturation), the only symptom today is sluggish UI — root cause is invisible. A small in-detail-mode activity indicator gives operators and developers a continuous, at-a-glance health reading without opening DevTools.

## What Changes

- Add a small activity indicator rendered at the **top-right** corner of the Floorplan, gated by the existing `displayEnhancedDialog` prop (the "Show details" toggle). Hidden in non-detail mode; non-interactive (display-only).
- The indicator shows two numbers:
  - **Messages in last 60 s**: the number of `transport-update` payloads delivered to the Floorplan's transport callback during a rolling 60-second window. Counts batches (one per backend emit), not triples.
  - **Event-loop lag (ms)**: the average extra delay seen by a `setInterval(_, 100 ms)` probe over the same window. Lag close to 0 ms means the tablet is keeping up; lag growing past ~100 ms means the tablet is falling behind.
- Color: text and border use the same blue as an off-mode appliance avatar — `rgba(60, 60, 255, 0.6)` (passed today as the `colorOff` prop into Floorplan from each Kiosk view). The indicator reads this same prop so it stays in sync with any future theme change.
- The indicator must be readable on tablet, mobile, and PC layouts (small but legible — fixed font size in CSS pixels, not viewport-relative).
- Internal: Floorplan maintains a small circular buffer of receipt timestamps and a lag-probe `setInterval` only while `displayEnhancedDialog === true`, so there is **zero** runtime overhead when detail mode is off.

## Capabilities

### New Capabilities
- `sse-activity-indicator`: a Floorplan-embedded UI affordance that surfaces SSE transport-update throughput and event-loop saturation in detail mode.

### Modified Capabilities
<!-- None. The new feature is additive and does not alter any existing requirement of `floorplan-live-updates`, `sse-transport-client`, or `sse-connection-indicator`. -->

## Impact

- **Code touched**: `src/components/floorplan/Floorplan.vue` (new template element, new `data()` fields for the rolling window + lag samples, lifecycle hooks for the lag probe, callback hook to count batches). One small read-only computed for the displayed strings. No new component file needed; if reuse becomes desired later, extracting `<SseActivityIndicator>` is mechanical.
- **No SseClient changes**: counting happens inside the existing Floorplan transport callback (line ~884 of `Floorplan.vue`). No new public API on `SseClient`.
- **No new dependencies**, no migrations, no backend impact.
- **Performance**: a single `setInterval` (100 ms cadence) and one `Date.now()` push per transport-update batch, only while detail mode is on. Bounded memory: rolling buffer ≤ 600 entries (lag samples at 100 ms over 60 s).
- **Coverage**: every Floorplan-embedding view (`KioskLights`, `KioskPlugs`, `KioskContact`, `KioskMovement`, `KioskPresence`) inherits the indicator automatically — no per-view edits needed.
