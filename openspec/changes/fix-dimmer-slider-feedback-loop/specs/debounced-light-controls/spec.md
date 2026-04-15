## ADDED Requirements

### Requirement: Terminology

This specification uses the following terms.

- **Control**: a Vue component that lets the user edit one or more **controlled fields** of a light appliance (e.g. brightness, color channels, white level, color temperature, on/off) and sends those values to the appliance via `appliancesService`. The components in scope are `DebouncedBrightnessSlider`, `DebouncedRgbwPicker`, `DebouncedBwPicker`, and `DebouncedOnOffButton`.
- **App state**: the `app` prop passed into a control, which carries the eventually-consistent device state mirror that the GUI polls from the backend (e.g. `app.state.dimmers[0].brightness`, `app.state.rgbws[0].red`, `app.state.relays[0].state`).
- **Controlled fields**: the specific fields inside `app.state` that the control both writes (by sending commands) and reads (by reflecting device state). A control's controlled fields are a static subset of `app.state` fixed by the control type.
- **Local model**: the control's own reactive state bound to input widgets (e.g. the `v-slider`'s `v-model`).
- **Echo**: an incoming `app` update whose controlled fields reflect values that were previously sent by this control.
- **In-flight**: the period between the user starting an interaction (or the component sending a command) and the control observing an echo or the gate timeout elapsing.

#### Scenario: Terminology reference
- **WHEN** any other requirement in this spec uses the terms above
- **THEN** they refer to the definitions in this requirement

### Requirement: Local model is authoritative during interaction

While the user is actively interacting with a control (pointer down, slider drag, color picker drag, or any equivalent touch gesture), incoming `app` state MUST NOT overwrite the control's local model. This rule applies regardless of how the incoming state was delivered (polling interval, deep watcher, manual reload) and regardless of whether the incoming values differ from the local model.

The interaction begins at pointer-down / touch-start and ends at pointer-up / touch-end. Both mouse and touch input MUST trigger the same begin/end transitions; touch-only and mouse-only event bindings are forbidden.

#### Scenario: Drag with inbound update on mouse
- **WHEN** the user mouse-downs on a brightness slider, drags to a new value, and during the drag a poller tick delivers a stale `app` state
- **THEN** the slider remains at the user's dragged value and does not snap to the stale value

#### Scenario: Drag with inbound update on touch
- **WHEN** the user touches and drags a brightness slider on a touch device, and during the drag a poller tick delivers a stale `app` state
- **THEN** the slider remains at the user's dragged value and does not snap to the stale value

#### Scenario: Color picker drag with inbound update
- **WHEN** the user drags inside an RGBW color picker and during the drag a poller tick delivers a stale `app` state
- **THEN** the picker's color model remains at the user's current pick and does not snap to the stale value

### Requirement: Echo-matched gate after send

When a control sends a command, it SHALL enter an **in-flight** state in which incoming `app` updates do not overwrite its local model. The control SHALL exit the in-flight state only when one of the following occurs, whichever comes first:

1. An incoming `app` update exposes values for the control's controlled fields that match the last values it sent, within a numerical tolerance appropriate for the backend's float round-tripping (tolerance is fixed per field type and SHALL be documented in design).
2. A bounded gate timeout elapses since the last send (the timeout is fixed per control type, MUST be at least 2× the polling interval, and SHALL be documented in design).

Unrelated changes to `app` (fields that are not the control's controlled fields) MUST NOT exit the in-flight state.

#### Scenario: Matching echo releases the gate
- **WHEN** a brightness control sends `brightness = 0.42` and a subsequent `app` update exposes `app.state.dimmers[0].brightness ≈ 0.42` within tolerance
- **THEN** the control exits the in-flight state and the next poll may refresh the local model

#### Scenario: Unrelated app change does not release the gate
- **WHEN** a brightness control is in-flight after sending `brightness = 0.42` and an `app` update arrives that changes only `app.state.relays[1].state` (a field not controlled by this component)
- **THEN** the control remains in-flight and the local model is not overwritten

#### Scenario: Stale echo does not release the gate
- **WHEN** a brightness control sends `brightness = 0.42` and the next `app` update still shows `brightness = 0.10` (the pre-send value)
- **THEN** the control remains in-flight and the local model keeps showing `0.42`

#### Scenario: Gate timeout releases after lost echo
- **WHEN** a brightness control sends `brightness = 0.42` and no matching echo arrives within the bounded gate timeout
- **THEN** the control exits the in-flight state, the next poll refreshes the local model from whatever `app` currently shows, and the control becomes interactive again

#### Scenario: Numerical tolerance on float echo
- **WHEN** a control sends `white = 0.80` and the echoed value is `0.7999998` due to float round-trip through the backend
- **THEN** the echo matches within tolerance and the control exits the in-flight state

### Requirement: Targeted field observation

Each control SHALL observe only its controlled fields when deciding whether an incoming `app` update constitutes an echo, a stale value to reject, or a legitimate external update to reflect. Controls MUST NOT use a deep watcher on the whole `app` prop to drive gate-release, echo-matching, or poller-gate logic.

A control MAY still receive the full `app` prop for rendering convenience, but any watcher or reaction that governs in-flight state MUST be scoped to the controlled fields.

#### Scenario: Brightness control ignores color mutations
- **WHEN** a brightness-only control receives an `app` update in which only `app.state.rgbws[0].red` has changed
- **THEN** the control's in-flight state and local model are both unaffected

#### Scenario: Color picker ignores brightness mutations from another appliance
- **WHEN** a color picker bound to appliance A receives an `app` update in which only unrelated appliance-level counters have changed
- **THEN** the color picker's in-flight state and local model are both unaffected

### Requirement: Gate set before network await

A control SHALL enter the in-flight state synchronously (before any `await`) at the moment the user releases the input or the debouncer forwards a send, and MUST NOT rely on the resolution of the network call to enter the in-flight state.

#### Scenario: app update during network await
- **WHEN** a brightness control begins a send with `brightness = 0.42`, and between the synchronous send call and its resolution an unrelated `app` update arrives that would otherwise clear a lazily-set in-flight flag
- **THEN** the control is already in-flight at the moment the send begins, so the in-flight flag cannot be cleared before it is set, and the control's local model remains `0.42`

### Requirement: External updates still reflected when idle

When a control is **not** in-flight and **not** being interacted with, incoming `app` updates on the control's controlled fields SHALL be reflected in the local model on the next polling tick (or immediately, if the control subscribes to targeted field updates rather than polling). This rule preserves the existing behavior of the dialog reflecting changes made to the light from other sources (wall switch, another client, automation).

#### Scenario: External on/off while dialog is idle
- **WHEN** an on/off control is displayed, the user is not interacting with it, and the backend reports the relay changing from `off` to `on` from an external source
- **THEN** the on/off button's displayed state updates to reflect `on` within one polling interval

#### Scenario: External brightness change while dialog is idle
- **WHEN** a brightness control is displayed, the user is not interacting, no send is in-flight, and the backend reports the dimmer brightness changing from `0.10` to `0.80` from an external source
- **THEN** the brightness slider updates to `0.80` within one polling interval

### Requirement: Container gating for composite dialogs

When a container (for example a dialog that hosts multiple controls and also drives tab selection from the same `app` state, as `FloorplanBulbDialog` does for color-vs-white mode) reads controlled fields to change its own UI, it SHALL honor the same in-flight gate as the controls it contains. A container MUST NOT switch the active child view (e.g. change tab) based on `app` state while the child control that reflects that state is in-flight or under interaction.

#### Scenario: Tab does not snap mid-drag
- **WHEN** the user is dragging a slider inside the BW tab of `FloorplanBulbDialog`, the backend has not yet echoed a mode change to `WHITE`, and an unrelated `app` update arrives
- **THEN** the dialog does not switch back to the color tab mid-drag; it remains on BW until the child control exits the in-flight state

#### Scenario: Tab follows external mode change when idle
- **WHEN** no child control is in-flight or under interaction, and the backend reports `app.state.rgbws[0].mode` changing to `WHITE`
- **THEN** the dialog switches to the BW tab on the next polling tick

### Requirement: Debounced sends interoperate with gate

Controls that use `Debouncer` to collapse rapid successive edits (RGBW picker, BW picker temperature + brightness) SHALL remain in-flight continuously from the first enqueued send until either the final send's echo arrives (matched against the final values only) or the gate timeout elapses. Intermediate debounce ticks MUST NOT clear the in-flight state on their own; only a matched echo of the most recently sent values or the timeout may clear it.

#### Scenario: Rapid color drag collapses to final echo
- **WHEN** the user drags inside the color picker, causing the debouncer to enqueue several sends in quick succession
- **THEN** the control is in-flight from the first enqueue, stays in-flight across all intermediate debounce runs, and exits in-flight only when an echo of the final sent values arrives or the gate timeout elapses

#### Scenario: Debouncer cleanup does not strand the gate
- **WHEN** the user stops interacting and the debouncer's cleanup run sends the last enqueued values
- **THEN** the in-flight state persists only until that last send is echoed or the timeout elapses; no subsequent debounce tick re-arms the gate indefinitely

### Requirement: Teardown clears timers and gates

On component destroy, a control SHALL clear any polling interval, pending debounce timer, and pending gate timeout so that no callback runs after teardown.

#### Scenario: Unmount during in-flight
- **WHEN** a control is unmounted while it is in the in-flight state with a gate timeout pending
- **THEN** the gate timeout is cleared and does not fire on the destroyed component, and no `setTimeout` / `setInterval` callbacks reference the destroyed instance

### Requirement: Control types in scope

This specification governs the following controls and their controlled fields. Each control's controlled fields are the complete set of `app.state` fields that the control both reads (to display) and writes (via `appliancesService`).

- `DebouncedBrightnessSlider`: `app.state.dimmers[0].brightness`, and optionally `app.state.relays[0].state` for color theming only (display-only, not gate-relevant).
- `DebouncedRgbwPicker`: `app.state.rgbws[0].{red,green,blue,white,gain}`.
- `DebouncedBwPicker`: `app.state.rgbws[0].{brightness,colorTemperature}`, and `app.state.relays[0].state` for color theming only (display-only, not gate-relevant).
- `DebouncedOnOffButton`: `app.state.relays[0].state` (or the relay addressed by `getActorPathOf(app, item.index)` for multi-relay appliances, which may include `app.state.relays[1].state`).

Fields marked "display-only, not gate-relevant" MAY be read for rendering without engaging the in-flight gate, because they are never written by the control.

#### Scenario: Brightness slider theming does not trigger gate
- **WHEN** only `app.state.relays[0].state` changes on an appliance driving a brightness slider
- **THEN** the slider's displayed color theme updates to reflect the new relay state, but the brightness local model and in-flight gate are unaffected

### Requirement: Shared gate helper

All four controls SHALL obtain their gate behavior from a single shared helper module (working name `echoGate`), so that any future control that sends commands and reflects echoed state inherits the correct semantics by using the same helper. Divergent ad-hoc per-component implementations of the gate are forbidden.

The helper's public surface MUST at minimum:

1. Accept a list of **field selectors** identifying the controlled fields of a given appliance.
2. Accept a **tolerance** (or per-field tolerance map) for echo matching.
3. Accept a **gate timeout** in milliseconds.
4. Expose a method to register "values just sent" and enter the in-flight state synchronously.
5. Expose a method to feed incoming `app` updates and return whether the gate should now release.
6. Expose a cleanup method that clears any pending timeout, for use in `beforeDestroy`.

#### Scenario: Two controls share the helper
- **WHEN** `DebouncedBrightnessSlider` and `DebouncedRgbwPicker` are both mounted on the same floorplan
- **THEN** both instances obtain their in-flight gate from the same `echoGate` module (no duplicated per-component re-implementation), and each instance's state is isolated from the other

#### Scenario: New future control
- **WHEN** a new `Debounced*` control is added later that sends a new kind of command
- **THEN** it can reuse `echoGate` directly by passing its own field selectors, tolerance, and timeout, without re-implementing the gate
