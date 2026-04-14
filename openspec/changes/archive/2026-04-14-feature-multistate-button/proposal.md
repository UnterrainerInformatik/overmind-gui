## Why

Today the GUI only offers binary on/off toggles (e.g. `DebouncedOnOffButton`) for controlling plans and appliances. For devices like blinds, shading, or climate overrides, a binary toggle cannot express more than two states and makes it easy to end up in ambiguous or conflicting configurations (e.g. both "override up" and "override down" plans enabled at once). Smart-home users need a single, glanceable control that shows which mode is currently active and lets them switch between a default (automatic) mode and one or more override modes without having to reason about multiple independent toggles.

## What Changes

- Add a new reusable `KioskMultiStatePanel` component that represents a mutually exclusive state selector with exactly one active state at any time.
- Exactly one state per config is marked as the **default state** via `defaultStateId`. The default state renders in the standard "blue" kiosk color; all non-default (override) states render in "yellow/orange". Color is fully derived from `defaultStateId` — no separate `colorMode` field.
- The collapsed panel displays the currently active state (icon + label) so users can tell at a glance whether automation is in control (blue = default / auto, yellow = an override is forced).
- Tapping the panel opens a modal dialog listing all configured states; selecting one triggers the transition and closes the dialog, tapping outside cancels.
- Each state declares an **optional** `onAction` (fired when the state becomes active) and an **optional** `offAction` (fired when leaving the state). Actions are a small discriminated union — two variants in this iteration:
  - `{ kind: 'event-trigger', applianceId, sensorPath, eventPath }` — dispatched through `eventsService.trigger(...)`, same as `KioskSwitchPanel`.
  - `{ kind: 'plan-toggle', planId }` — dispatched through `plansService.execute(...)` with a `{ name: 'toggle', params: [[planId]] }` command, same as `PlanPanel.togglePlan`.
  Both `onAction` and `offAction` are optional, so states like AUTO (which has no direct backend effect — it simply means "no override is active") can be declared action-free.
- State transitions run the previous state's `offAction` (if defined) followed by the new state's `onAction` (if defined), sequentially and awaited.
- Active-state detection is driven by plan status: each override state declares a `planIdForCheckIfOn` and the panel polls `plansService.isPlanEnabled` each tick. The default state has no `planIdForCheckIfOn` and is resolved as active when no override state's plan is currently enabled.
- Provide a configuration-driven data model (`MultiStateButtonConfig`) so new multistate panels can be declared without writing new components.
- Ship an initial configuration example for a Shutters override panel (UP / AUTO / DOWN) as reference usage — both UP and DOWN use `plan-toggle` actions bound to their own override plans, AUTO has no actions.

No existing components are removed in this change; `DebouncedOnOffButton` and friends keep working for genuinely binary cases.

## Capabilities

### New Capabilities
- `multi-state-button`: a configurable kiosk-style panel that displays exactly one active state out of N, resolves the active state from `plansService.isPlanEnabled` (with the configured default state as fallback when no override plan is enabled), and on transition fires the leaving state's optional `offAction` and the entering state's optional `onAction`. Actions are a discriminated union supporting event-trigger (`eventsService.trigger`) and plan-toggle (`plansService.execute` with a `toggle` command) variants. Selection happens via a modal state-picker dialog.

### Modified Capabilities
<!-- None. No existing spec files in openspec/specs/ and no existing requirement-level behavior changes. -->

## Impact

- **New code**: `src/components/KioskMultiStatePanel.vue` (follows the `KioskSwitchPanel`/`KioskPanel` pattern — a collapsed panel + a modal state-picker dialog), plus TypeScript types for `MultiStateButtonConfig`, `MultiStateState`, and `MultiStateAction` (discriminated union of `event-trigger` and `plan-toggle`).
- **Touched code**: places that want to use the new panel (initially the shutters override use case) will import and configure it; no refactor of existing on/off buttons, `KioskSwitchPanel`, or `PlanPanel`.
- **Dependencies**: reuses existing Vuetify 2.5 primitives (`v-dialog`, `v-list`, `v-list-item`, `v-avatar`, `v-icon`) and Material Design Icons already in the project — no new npm dependencies.
- **Backend contract**: relies on the existing `plansService.isPlanEnabled(id)` (to resolve each override state's `planIdForCheckIfOn`), `plansService.execute(...)` (to execute `plan-toggle` actions, reusing the same `{applianceId, actorPath, commands:[{name:'toggle', params:[[id]]}]}` payload as `PlanPanel.togglePlan`), and `eventsService.trigger(...)` (to execute `event-trigger` actions). No backend API changes required.
- **Accessibility**: minimum 44x44 px touch target, labels + icons (no color-only signalling), high contrast between the blue default color and the yellow override color.
