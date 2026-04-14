## Context

The GUI today only offers binary on/off and event-trigger panels (`DebouncedOnOffButton`, `KioskSwitchPanel`, `KioskTogglePanel`). For smart-home controls that are fundamentally mode selectors — blinds (AUTO / UP / DOWN), shading, climate overrides — a single binary toggle can't express "exactly one of N" and lets users enter conflicting plan states.

This change adds a **`KioskMultiStatePanel`** that looks and behaves like the other kiosk panels but represents a mutually exclusive state selector with a dedicated default state. It reuses the existing patterns:

- **Visual shell**: `KioskPanel` (the same card used by `KioskSwitchPanel` and `KioskTogglePanel`), so colors, borders, and dark-mode handling stay consistent.
- **Active-state polling**: `KioskPanel` already calls an `isEnabled()` function every 500ms; we reuse that loop to resolve the current state via `plansService.isPlanEnabled(planId)`.
- **Action dispatch**: two existing services — `eventsService.trigger({ applianceId, sensorPath, eventPath })` (as used by `KioskSwitchPanel`) and `plansService.execute(...)` with a `toggle` command (as used by `PlanPanel.togglePlan`). No new services or payload shapes.

No backend changes are required. Everything runs against services already in `src/utils/webservices/`.

## Goals / Non-Goals

**Goals:**
- Present exactly one active state at any time, derived from backend plan status (no local "UI-only" state that can drift from reality).
- Let a non-power user change mode with one tap → pick from a short list → done.
- Make adding a new multistate panel a config-only change (no new Vue components per use case).
- Cleanly distinguish "default mode" (system is automating) from "override mode" (user forced something) visually, without relying on color alone.
- Reuse existing services and Vuetify primitives — no new npm dependencies, no backend API changes.

**Non-Goals:**
- Not replacing `DebouncedOnOffButton`, `KioskSwitchPanel`, or `KioskTogglePanel` for genuinely binary use cases.
- Not introducing a new backend action registry or generic "button dispatcher". On/off actions are concrete `eventsService.trigger` payloads, nothing more.
- Not supporting non-plan-based active detection in this iteration (e.g. reading raw appliance state or sensor values). Every state must map to a plan whose enabled status is authoritative.
- Not animating the transition, long-press shortcuts, or inline (non-modal) state switching. Listed in Future Extensions.
- The default state intentionally has **no** `planIdForCheckIfOn` and usually no actions at all — it represents "nothing is overridden". When no override state's plan is enabled, the default state is resolved as active. This is a normal (expected) condition, not an error.

## Decisions

### 1. Follow the `Kiosk*Panel` pattern, not a standalone `v-btn`

**Decision**: Build `KioskMultiStatePanel.vue` on top of `KioskPanel` — the same wrapper `KioskSwitchPanel` and `KioskTogglePanel` use — instead of a bespoke `v-btn`-based component in `src/components/input/`.

**Why**: The button will live on kiosk screens next to other panels. Visually it must match their sizing, borders, dark-mode colors, and 500ms `isEnabled()` polling loop. Using `KioskPanel` gets all of that for free, including the `on/off/disabled` color logic in `KioskPanel.getBgColor()`.

**Alternatives considered**:
- *Build from scratch under `src/components/input/`* — rejected: would duplicate `KioskPanel`'s polling + color logic, risking drift.
- *Extend `KioskSwitchPanel`* — rejected: `KioskSwitchPanel` fires one event on click; its contract is binary. Adding multistate behavior to it would muddy an already-used component.

### 2. Active state is resolved from `plansService.isPlanEnabled`, polled via `KioskPanel.isEnabled`

**Decision**: Each **override** state declares `planIdForCheckIfOn: number`. The **default** state (the one whose id equals `config.defaultStateId`) has no `planIdForCheckIfOn`. The panel implements a single async `resolveActiveState()` that, on each poll tick, walks the override states in order and picks the first one whose plan is enabled. If none are enabled, the default state is the active state. `KioskPanel.isEnabled` then returns `activeStateId !== config.defaultStateId` to drive the border/background color (yellow override vs blue default — see Decision #6).

**Why**: The existing panel infrastructure already polls `isEnabled()` every 500ms (`KioskPanel.mounted → setInterval`). Reusing that loop avoids inventing new reactivity plumbing and keeps the panel backend-of-truth. Plans are the single source of truth for override states; the default state is simply "no override is active", which needs no plan of its own.

**Alternatives considered**:
- *Use `plansService.getOrderedPlans(enabledOnly=true)` once per poll and intersect with `states[].planIdForCheckIfOn`* — would save N HTTP calls per poll (one request vs. up-to-N), but the existing `plansService.isPlanEnabled(id)` is a single GET per plan and the panel typically has 2–4 states. Batch fetch is listed as a future optimization if polling load becomes a concern.
- *Event-driven updates (websocket)* — rejected: the rest of the kiosk UI polls; introducing a push channel just for this panel is inconsistent.

### 3. Action model: discriminated union (`event-trigger` | `plan-toggle`), both `onAction` and `offAction` optional

**Decision**: Each state has:

```ts
type MultiStateAction =
  | { kind: 'event-trigger'; applianceId: number; sensorPath: string; eventPath: string }
  | { kind: 'plan-toggle'; planId: number }

type MultiStateState = {
  id: string
  label: string
  icon?: string
  planIdForCheckIfOn?: number   // omitted on the default state
  onAction?: MultiStateAction   // omitted means "no action on activate"
  offAction?: MultiStateAction  // omitted means "no action on deactivate"
  description?: string
}
```

The panel has an internal `dispatch(action)` helper:

- `kind: 'event-trigger'` → `eventsService.trigger(() => ({ applianceId, sensorPath, eventPath }))` (identical to `KioskSwitchPanel`).
- `kind: 'plan-toggle'` → `plansService.execute(() => ({ applianceId: 20, actorPath: 'actor', commands: [{ name: 'toggle', params: [[planId]] }] }))` (identical to `PlanPanel.togglePlan`, including the hardcoded `applianceId: 20` / `actorPath: 'actor'` constants that already exist there).

Both `onAction` and `offAction` are fully optional. Transition runs `prev.offAction` (if any) → `new.onAction` (if any), sequentially and awaited. A state with neither (like AUTO in the shutters example) is declared as a plain `{ id, label }` and the transition loop becomes a no-op on both sides — the backend then naturally settles into "no override enabled" and the next poll tick resolves the default state as active.

**Why two action variants specifically**:
- **Event-trigger** covers the existing KioskSwitchPanel use cases where an appliance needs to receive a discrete event (e.g. "button pressed" on a specific sensor path).
- **Plan-toggle** covers the shutters use case concretely. Both UP and DOWN map to override plans; `toggle` is the only command the plans appliance currently exposes, and it flips the plan state. Using the *same* plan id for both `onAction` and `offAction` of a given state works because the plan is off when the state is inactive and on when it's active — so toggling on entry turns it on, toggling on exit turns it off. No `enable`/`disable` commands are needed even though the semantics are "set to on" / "set to off".

**Why `onAction` is also optional (not just `offAction`)**:
- AUTO has no direct backend effect. It means "no override plan is enabled". The user moves *into* AUTO by leaving an override (which runs that override's `offAction: plan-toggle` to disable its plan). Forcing a synthetic `onAction` on AUTO would either be a no-op stub or would risk firing an unwanted "disable-all" sweep. Letting it be omitted models reality.

**Alternatives considered**:
- *Opaque `{ buttonId }` with a backend action registry* — rejected: requires a backend change, no such registry exists.
- *Single `action` field that handles both directions* — rejected: would force every action shape to be idempotent/toggle-aware, which `eventsService.trigger` is not.
- *Require `onAction` everywhere, add an explicit `kind: 'noop'` variant for AUTO* — rejected: pure noise. Omission is clearer than a `noop` sentinel.
- *Extend the union now with `appliance-on/off` (from `DebouncedOnOffButton`) or `plan-enable`/`plan-disable` variants* — deferred. The two variants above cover every known use case in the repo today; a third can be added in one place (`dispatch()`) without changing the state/component API.

**Plan-toggle shorthand note**: For states like shutters-UP where `planIdForCheckIfOn === onAction.planId === offAction.planId`, the config does repeat the plan id three times. This is intentional for the first iteration — keeps the schema flat and greppable. A `{ kind: 'plan-bound', planId }` sugar that fans out into all three fields can be added later if configs start to feel noisy.

### 4. Transition semantics: sequential, awaited, best-effort

**Decision**: On selection of a new state:

1. Read the currently resolved active state from the panel's cache.
2. If `new.id === current.id`, close dialog — no action dispatched.
3. Otherwise `await dispatch(current.offAction)` (if defined), then `await dispatch(new.onAction)` (if defined). Either or both may be absent — skip whichever is absent.
4. Close dialog unconditionally after step 3.
5. Rely on the next 500ms poll tick to repaint the new active state — do **not** optimistically set local state.

**Why**: Not optimistically updating keeps the UI honest. If the backend rejects the event, the panel simply won't change color on the next tick, and the user sees the truth rather than a lying UI. 500ms latency is acceptable for the kiosk use case.

**Trade-off**: Up to 500ms "nothing visibly happens" after tapping. Acceptable because the modal closes immediately on tap, which is itself strong feedback.

### 5. Dialog implementation

**Decision**: Use `v-dialog` with `v-list` of `v-list-item`, each rendering the state icon + label, with a Vuetify radio indicator (`v-icon` `radio_button_checked`/`radio_button_unchecked`) bound to `stateId === activeStateId`. Tap-outside behavior comes free with `v-dialog`'s `persistent=false` default; no close button needed.

**Why**: Matches existing dialogs under `src/components/floorplan/dialogs/` in style; no new primitives.

### 6. Color semantics: derived from `defaultStateId`, no per-state field

**Decision**: There is no `colorMode` field on individual states. Color is a pure function of `activeStateId`:

- `activeStateId === config.defaultStateId` → render **blue** ("default / automatic" — the standard kiosk "info" tone).
- `activeStateId !== config.defaultStateId` → render **yellow/orange** ("override active" — the standard kiosk warn tone).

Implementation: the panel passes `isEnabled = (activeStateId !== defaultStateId)` to `KioskPanel`. `KioskPanel.getBgColor` already maps `enabled → 'on'` and `!enabled → 'off'` against Vuetify theme tokens. We bind the existing `on` token to the project's yellow/orange and the existing `off` (or a dedicated blue) token so the mapping Just Works without modifying `KioskPanel`. If the current theme's `off` token is too muted for the "default / auto" case, we override `borderColor` on `KioskPanel` instead — still no fork of the shared component.

**Why**: A single source of truth (`defaultStateId`) is simpler than a per-state color field, and it makes illegal states unrepresentable — you can't configure a panel where two states both claim to be the "default blue". It also matches the user's stated rule: *"if auto, color is std-blue, otherwise yellow (one state has to be default-state… the blue one)"*. Color continues to be a secondary hint — state icon and label remain the primary signal, satisfying the accessibility requirement.

**Alternatives considered**:
- *Per-state `colorMode` field* — rejected: lets configs declare contradictions (two "defaults"), and adds a field users have to think about on every state.
- *Three colors (blue / yellow / grey)* — the original spec mentioned grey for "inactive". Deferred: there is currently no "inactive" condition in the resolver (every panel always has exactly one active state). If a disabled/unavailable mode is added later, grey can be wired through `KioskPanel`'s existing `disabled` branch in `getBgColor`.

## Risks / Trade-offs

- **Polling load** → Mitigation: 500ms × N plan checks per panel. For typical 2–4 states this is small, but multiple panels on one screen multiply it. If it becomes a problem, batch via `plansService.getOrderedPlans(enabledOnly=true)` (Decision #2, alternative).
- **Race between transition and poll** → a user picks a new state; the `onAction` fires; the next poll arrives before the backend has applied the plan change, so the panel briefly still shows the old state. Mitigation: 500ms tick is short, and `onAction` is awaited, so the worst case is one stale tick. Acceptable for a kiosk.
- **Two overrides' plans both enabled simultaneously** → "first wins" per the resolver walk order in Decision #2. This can happen transiently during a transition (old override's `offAction` hasn't landed yet when the next poll tick runs) or persistently if two overrides get enabled out-of-band. Mitigation: the transition loop always runs `prev.offAction` *before* `new.onAction`, so the in-flight case is covered. For the out-of-band case, configurations should ensure overrides have mutually exclusive plans and rely on the resolver's deterministic order. Spec to document resolver order as part of the contract.
- **`offAction` failure leaves target in undefined state** → Mitigation: `dispatch(offAction)` and `dispatch(onAction)` run in an awaited sequence; if `offAction` rejects, `onAction` still runs (catch → console.log → continue). The next poll shows the actual state regardless, so the UI never lies about what the backend believes. Spec to make this explicit.
- **Plan-toggle assumes current plan state matches last-known UI state** → `plan-toggle` flips the plan; it does not set it. If the plan was already on when the panel thinks it's off (e.g. another client enabled it), the activation `toggle` turns it *off*. Mitigation: this is an accepted limitation of the existing `togglePlan` mechanism already used by `PlanPanel`; it's not worse here than it is there. If it becomes a problem, we can add explicit `plan-enable` / `plan-disable` action variants later — they'd need a new backend command, though.
- **No backend registry → config-driven Vue components** → Mitigation: configs live in the same place appliances/plans are declared today (see existing kiosk view files under `src/views/Kiosk*.vue`). No new config pipeline is introduced.

## Migration Plan

No migration. This is additive — a new component file + types, used in exactly one new place (blinds override example). Rolling back is `git revert`. No data model, no backend, no stored state touched.

## Open Questions

1. **Where exactly does the shutters override panel get mounted?** The proposal calls out a "reference usage" but doesn't pin the view. Likely `src/views/KioskOverview.vue` or a new kiosk view. To be resolved in the `tasks` artifact.
2. **Batch polling later?** Whether to replace N×`isPlanEnabled` calls with one `getOrderedPlans(enabledOnly=true)` — noted as a follow-up; not blocking.
3. **Icon lib parity** — the spec mentions `Tune`, `AutoMode`, `KeyboardArrowUp`, `KeyboardArrowDown` (Material Symbols names). The project uses `material-design-icons-iconfont` which exposes classic MDI names (`tune`, `auto_mode`, `keyboard_arrow_up/down`). Need to confirm the exact icon strings during implementation.
4. **`applianceId: 20` / `actorPath: 'actor'` constants in the plan-toggle dispatch** — these are copied verbatim from `PlanPanel.togglePlan` and appear to be hardcoded references to a central "plans appliance". If that's a deployment assumption rather than an invariant, we should either pull them from config or document the coupling in the spec. Flag for review during implementation.
5. **Concrete Vuetify color tokens for "blue default" and "yellow override"** — the project has existing `on`/`off`/theme classes; need to verify which tokens map to the desired kiosk blue and kiosk yellow, or whether a new `borderColor` override is needed on `KioskPanel`. Resolve during implementation.
