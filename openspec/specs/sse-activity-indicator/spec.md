# sse-activity-indicator Specification

## Purpose
TBD - created by archiving change add-sse-activity-indicator. Update Purpose after archive.
## Requirements
### Requirement: Indicator visibility is gated by detail mode

The Floorplan view (`src/components/floorplan/Floorplan.vue`) SHALL render an SSE activity indicator if and only if its `displayEnhancedDialog` prop is `true`. When the prop is `false`, the indicator MUST NOT be rendered, and no associated timer (lag probe, display refresh) MUST be running.

#### Scenario: Indicator hidden by default
- **WHEN** a Kiosk view embeds the Floorplan and the "Show details" toggle is off (`displayEnhancedDialog === false`)
- **THEN** the indicator element is absent from the DOM
- **AND** no `setInterval` for the lag probe or display refresh has been scheduled by the Floorplan
- **AND** no transport-update timestamps are being recorded

#### Scenario: Indicator appears when entering detail mode
- **WHEN** the user toggles "Show details" on (`displayEnhancedDialog` flips `false → true`)
- **THEN** the indicator becomes visible at the top-right of the Floorplan within the next render flush
- **AND** the lag probe and display refresh timers start
- **AND** the rolling counters start fresh (no stale samples from a previous session)

#### Scenario: Indicator disappears and timers stop when leaving detail mode
- **WHEN** the user toggles "Show details" off (`displayEnhancedDialog` flips `true → false`)
- **THEN** the indicator is removed from the DOM
- **AND** the lag probe and display refresh `setInterval`s are cleared
- **AND** the transport-update callback no longer pushes timestamps to the rolling buffer

#### Scenario: Timers do not leak across component destruction
- **WHEN** the user navigates away from the Floorplan while detail mode is on, and the component is destroyed
- **THEN** any active lag-probe and display-refresh `setInterval`s are cleared in `beforeDestroy`
- **AND** no further callbacks fire after destruction

### Requirement: Indicator displays messages-per-minute over a 60-second rolling window

While visible, the indicator SHALL display the number of `transport-update` payloads (batches, not individual triples) delivered to the Floorplan's transport callback during the most recent 60 seconds. Counting is per Floorplan mount; counters reset to zero each time detail mode is enabled.

#### Scenario: No traffic
- **WHEN** detail mode has just been enabled and no transport-update has arrived since
- **THEN** the indicator displays `0 msgs/min` (or equivalent zero-state with the `msgs/min` label)

#### Scenario: Traffic over the last minute
- **WHEN** N transport-update payloads have arrived in the last 60 seconds
- **THEN** the indicator displays `N msgs/min` within at most 1 second of the most recent batch

#### Scenario: Old samples age out
- **WHEN** a transport-update arrived 65 seconds ago and no others have arrived since
- **THEN** the indicator displays `0 msgs/min` (the 65-second-old sample is no longer in the rolling window)

#### Scenario: Counts batches, not triples
- **WHEN** a single transport-update payload arrives carrying 47 triples
- **THEN** the rolling-window counter increases by exactly 1 (not 47)

#### Scenario: Counter resets when re-entering detail mode
- **WHEN** the user disables detail mode for 30 seconds and then re-enables it
- **THEN** the indicator displays `0 msgs/min` at the moment of re-entry, not the count carried over from before disabling
- **AND** the rolling buffer contains no samples from the prior detail-mode session

### Requirement: Indicator displays event-loop lag as the saturation metric

While visible, the indicator SHALL display an event-loop lag value derived from a `setInterval(probe, 100 ms)` running for the duration of detail mode. Each tick records `max(0, actualDelay - 100)` in milliseconds. The displayed value is the **average** of all samples taken within the most recent 60 seconds, rounded to the nearest integer millisecond.

#### Scenario: Healthy device
- **WHEN** the device is idle and event-loop lag samples are mostly < 5 ms
- **THEN** the indicator's lag readout is < 10 ms

#### Scenario: Saturated device
- **WHEN** the main thread is repeatedly busy for > 100 ms (e.g. heavy work in a render flush) such that lag samples average ~50 ms over the window
- **THEN** the indicator's lag readout is ~50 ms within at most 1 second of the moment the average crosses that level

#### Scenario: Lag probe runs only in detail mode
- **WHEN** detail mode is off
- **THEN** no `setInterval` for the lag probe is scheduled by the Floorplan
- **AND** no lag samples are accumulated

#### Scenario: Lag samples age out
- **WHEN** the device was saturated for 10 seconds, then idle for the following 60 seconds
- **THEN** the indicator's lag readout returns to the idle range (< 10 ms) — the saturated samples are no longer within the rolling window

### Requirement: Indicator is positioned top-right and styled in the off-mode color

The indicator SHALL be absolutely positioned inside the Floorplan's existing relative-positioned wrapper at `top: 4px; right: 4px;`. Its text and border color SHALL be the value of the Floorplan's `colorOff` prop (today `rgba(60, 60, 255, 0.6)` from the Kiosk views). The font size SHALL be a fixed CSS-pixel value (small but legible on tablet, mobile, and PC). The element MUST set `pointer-events: none` so it cannot intercept clicks on the Floorplan.

#### Scenario: Color matches off-mode appliance avatars
- **WHEN** the indicator is visible and the embedding view passes `colorOff="rgba(60, 60, 255, 0.6)"`
- **THEN** the indicator's text and border render in `rgba(60, 60, 255, 0.6)`

#### Scenario: Color follows a non-default `colorOff` prop
- **WHEN** an embedding view passes a different `colorOff` value (e.g. a future theme override)
- **THEN** the indicator's text and border re-render in that color without code changes

#### Scenario: Indicator does not block clicks
- **WHEN** the user clicks on a Floorplan area that visually overlaps the indicator
- **THEN** the click is delivered to the underlying area (the indicator's `pointer-events: none` lets the click pass through)

#### Scenario: Legible across form factors
- **WHEN** the Floorplan is rendered on a phone-sized viewport, a tablet, and a desktop
- **THEN** the indicator's font size remains the same fixed CSS-pixel value (does not collapse on small viewports)
- **AND** the indicator's content fits within ~150 px wide on all three form factors

### Requirement: Indicator does not alter SSE transport behavior

Adding the indicator MUST NOT change `SseClient`'s public API, the Floorplan's transport selection, or the writes to per-appliance reactive state. Counting MUST happen alongside (not in place of) the existing per-triple processing in the Floorplan's transport callback.

#### Scenario: Transport selection is unchanged
- **WHEN** the Floorplan mounts with the indicator feature in place, with or without detail mode active
- **THEN** the `selection.perAppliance` passed to `SseClient.getInstance().registerTransport(...)` is identical to what it was before this change

#### Scenario: SseClient public API is unchanged
- **WHEN** the change is implemented
- **THEN** `SseClient` exposes no new public methods, callbacks, or events for the indicator
- **AND** all counting / lag-probe state lives in the `Floorplan.vue` component

#### Scenario: All triples are still applied to appliance state
- **WHEN** a transport-update payload arrives with detail mode on
- **THEN** every triple is written to its target appliance's reactive state via the existing `writePath` flow
- **AND** the indicator's batch counter increments by exactly 1 for that payload

