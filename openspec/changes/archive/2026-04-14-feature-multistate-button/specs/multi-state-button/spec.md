## ADDED Requirements

### Requirement: Configuration shape

A multistate panel SHALL be configured by a `MultiStateButtonConfig` object containing an `id`, a human-readable `label`, an optional `icon`, a `defaultStateId`, and an ordered `states` array. Exactly one entry in `states` MUST have an `id` equal to `defaultStateId`; that entry is the **default state**. Every other entry is an **override state** and MUST declare a `planIdForCheckIfOn` referring to a plan whose enabled status determines whether that state is active. The default state MUST NOT declare a `planIdForCheckIfOn`.

#### Scenario: Valid config with one default and two overrides
- **WHEN** a config is provided with `defaultStateId: "auto"` and three states `"auto"`, `"up"`, `"down"`, where `"up"` and `"down"` each declare a distinct `planIdForCheckIfOn` and `"auto"` has none
- **THEN** the panel accepts the config and renders without error

#### Scenario: Missing default state entry
- **WHEN** a config declares `defaultStateId: "auto"` but no state in `states` has `id: "auto"`
- **THEN** the panel surfaces a configuration error and does not render actions

#### Scenario: Override state without planIdForCheckIfOn
- **WHEN** an override state (id ≠ defaultStateId) omits `planIdForCheckIfOn`
- **THEN** the panel surfaces a configuration error for that state

### Requirement: Active state resolution

The panel SHALL determine the currently active state by polling plan status. On each resolver tick the panel MUST iterate over the override states in declaration order, calling `plansService.isPlanEnabled(state.planIdForCheckIfOn)`, and select the first override whose plan is enabled as the active state. If no override state's plan is enabled, the default state SHALL be the active state. The resolver MUST NOT rely on optimistic local UI state; the backend plan status is the single source of truth.

#### Scenario: No override plans enabled
- **WHEN** the resolver runs and `isPlanEnabled` returns `false` for every override state's plan id
- **THEN** the active state is the default state

#### Scenario: One override plan enabled
- **WHEN** the resolver runs and exactly one override state's plan is enabled
- **THEN** that override state is the active state

#### Scenario: Two override plans enabled simultaneously
- **WHEN** the resolver runs and two override states' plans are both enabled
- **THEN** the active state is the override state that appears earlier in the declaration order

### Requirement: Polling cadence

The panel SHALL reuse the existing `KioskPanel.isEnabled` polling mechanism, which invokes the panel's resolver every 500 ms. The panel MUST clear its interval on teardown to avoid leaks.

#### Scenario: Panel mounts
- **WHEN** the panel is mounted in a view
- **THEN** the resolver runs once per 500 ms interval tick via the `KioskPanel` polling loop

#### Scenario: Panel unmounts
- **WHEN** the panel is destroyed
- **THEN** the resolver stops running and no further plan status calls are issued

### Requirement: Collapsed panel display

The collapsed panel SHALL display the currently active state's icon and label. The panel MUST use the `KioskPanel` shell (same card, border, and dark-mode handling used by `KioskSwitchPanel` and `KioskTogglePanel`).

#### Scenario: Active state has an icon
- **WHEN** the active state declares an `icon` field
- **THEN** the collapsed panel renders that icon alongside the state label

#### Scenario: Active state changes
- **WHEN** the resolver's next tick produces a different active state than the currently displayed one
- **THEN** the panel updates to show the new state's icon and label on that tick

### Requirement: Color semantics

The panel's color SHALL be derived solely from whether the active state equals the default state. When the active state equals `defaultStateId`, the panel MUST render in the standard kiosk "blue / default" color. When the active state is any non-default (override) state, the panel MUST render in the "yellow / override" color. There SHALL be no per-state color configuration field.

#### Scenario: Default state is active
- **WHEN** the active state id equals `defaultStateId`
- **THEN** `KioskPanel` receives `isEnabled = false` and renders in the blue/default color

#### Scenario: Override state is active
- **WHEN** the active state id is any non-default state
- **THEN** `KioskPanel` receives `isEnabled = true` and renders in the yellow/override color

### Requirement: Action model

Each state MAY declare an optional `onAction` (executed when the state becomes active) and an optional `offAction` (executed when the state stops being active). Both fields MUST be a discriminated union `MultiStateAction` and MUST support at least the following two variants in this iteration:

- `{ kind: 'event-trigger', applianceId: number, sensorPath: string, eventPath: string }` — the panel SHALL dispatch this variant through `eventsService.trigger(() => ({ applianceId, sensorPath, eventPath }))`, identical to `KioskSwitchPanel`.
- `{ kind: 'plan-toggle', planId: number }` — the panel SHALL dispatch this variant through `plansService.execute(() => ({ applianceId: 20, actorPath: 'actor', commands: [{ name: 'toggle', params: [[planId]] }] }))`, identical to `PlanPanel.togglePlan`.

A state MAY omit both actions (for example, the default "auto" state), in which case the panel MUST NOT dispatch anything on that state's activation or deactivation.

#### Scenario: Event-trigger action
- **WHEN** a state with `onAction: { kind: 'event-trigger', applianceId: 5, sensorPath: 'sens', eventPath: 'evt' }` becomes active
- **THEN** the panel calls `eventsService.trigger` with a payload containing `{ applianceId: 5, sensorPath: 'sens', eventPath: 'evt' }`

#### Scenario: Plan-toggle action
- **WHEN** a state with `onAction: { kind: 'plan-toggle', planId: 42 }` becomes active
- **THEN** the panel calls `plansService.execute` with a payload of `{ applianceId: 20, actorPath: 'actor', commands: [{ name: 'toggle', params: [[42]] }] }`

#### Scenario: Action-free state activation
- **WHEN** a state with neither `onAction` nor `offAction` becomes active
- **THEN** the panel does not dispatch any action on activation

### Requirement: State transition flow

When the user selects a new state from the dialog, the panel SHALL execute the transition as follows:

1. Read the currently resolved active state from the panel's resolver cache.
2. If the selected state's `id` equals the current active state's `id`, close the dialog and dispatch nothing.
3. Otherwise, `await dispatch(current.offAction)` (skipping if absent), then `await dispatch(selected.onAction)` (skipping if absent), in that order.
4. Close the dialog unconditionally after step 3 completes.
5. Do NOT optimistically update the panel's displayed state; the next resolver tick repaints.

If `offAction` dispatch throws, the panel MUST log the error and still dispatch the selected state's `onAction`.

#### Scenario: Transition from override to default
- **WHEN** the active state is override "up" with `offAction: plan-toggle 42`, the user selects default "auto" which has no actions
- **THEN** the panel calls `plansService.execute` to toggle plan 42, then closes the dialog, and dispatches nothing for "auto"

#### Scenario: Transition between two overrides
- **WHEN** the active state is override "up" (`offAction: plan-toggle 42`) and the user selects override "down" (`onAction: plan-toggle 43`)
- **THEN** the panel first awaits the toggle of plan 42, then awaits the toggle of plan 43, then closes the dialog

#### Scenario: Transition with failing offAction
- **WHEN** the leaving state's `offAction` dispatch throws an error
- **THEN** the panel logs the error to the console and still dispatches the entering state's `onAction`, then closes the dialog

#### Scenario: Selecting the already-active state
- **WHEN** the user selects the state that is already active
- **THEN** the panel closes the dialog and dispatches no actions

#### Scenario: No optimistic update
- **WHEN** the user selects a new state and actions are dispatched successfully
- **THEN** the panel's displayed icon/label/color does not change until the next resolver tick reflects the updated plan status

### Requirement: State picker dialog

Tapping the collapsed panel SHALL open a modal dialog listing every configured state in declaration order. Each entry MUST show the state's icon and label, and the currently active state MUST be visually marked (for example with a filled radio indicator). Tapping an entry selects it and triggers the transition flow defined in the "State transition flow" requirement. Tapping outside the dialog SHALL close it without dispatching any action.

#### Scenario: Dialog opens on tap
- **WHEN** the user taps the collapsed panel
- **THEN** a modal dialog opens listing all configured states in declaration order

#### Scenario: Active state marked in dialog
- **WHEN** the dialog is open
- **THEN** the entry whose id equals the currently resolved active state is visually marked (filled radio) and all others are unmarked

#### Scenario: Selecting an entry closes the dialog
- **WHEN** the user taps an entry in the dialog
- **THEN** the transition flow runs and the dialog closes

#### Scenario: Tap outside cancels
- **WHEN** the dialog is open and the user taps the backdrop
- **THEN** the dialog closes and no actions are dispatched

### Requirement: Accessibility

The collapsed panel SHALL have a touch target of at least 44×44 CSS pixels. State identity MUST be conveyed by icon and label together, not by color alone. The blue default color and yellow override color MUST meet the project's existing kiosk contrast requirements.

#### Scenario: Minimum touch target
- **WHEN** the panel is rendered on a kiosk screen
- **THEN** its touch-hit area measures at least 44×44 CSS pixels

#### Scenario: Color-independent state identification
- **WHEN** the panel is viewed in grayscale
- **THEN** the active state remains identifiable through the displayed icon and label

### Requirement: Shutters reference configuration

The change SHALL ship a reference configuration for a three-state shutters override panel with the following structure, usable as a copy-paste starting point for other multistate panels:

- Default state `"auto"` — label "AUTO", no `planIdForCheckIfOn`, no `onAction`, no `offAction`.
- Override state `"up"` — label "UP", `planIdForCheckIfOn` = the shutters-up override plan id, `onAction: { kind: 'plan-toggle', planId: <same id> }`, `offAction: { kind: 'plan-toggle', planId: <same id> }`.
- Override state `"down"` — label "DOWN", `planIdForCheckIfOn` = the shutters-down override plan id, `onAction` and `offAction` both `plan-toggle` of that same plan id.

#### Scenario: Reference config renders
- **WHEN** the shutters reference config is passed to the panel
- **THEN** the panel renders with "AUTO" blue when no override plan is enabled, "UP" yellow when the up override plan is enabled, and "DOWN" yellow when the down override plan is enabled

#### Scenario: User activates UP from AUTO
- **WHEN** the active state is "auto" and the user selects "up" in the dialog
- **THEN** the panel dispatches `plan-toggle` on the up override plan id and, after the next resolver tick, renders as yellow "UP"

#### Scenario: User returns to AUTO from UP
- **WHEN** the active state is "up" and the user selects "auto" in the dialog
- **THEN** the panel dispatches `plan-toggle` on the up override plan id (as "up".offAction) and, after the next resolver tick, renders as blue "AUTO"
