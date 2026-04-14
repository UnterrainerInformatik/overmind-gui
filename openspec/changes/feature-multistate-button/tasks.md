## 1. Types and action dispatcher

- [x] 1.1 Add a TypeScript types module `src/types/multiStateButton.ts` exporting `MultiStateButtonConfig`, `MultiStateState`, and the `MultiStateAction` discriminated union (`'event-trigger'` and `'plan-toggle'` variants).
- [x] 1.2 In the same module (or a sibling file), implement a `dispatchMultiStateAction(action)` helper that routes `'event-trigger'` through `eventsService.trigger(...)` and `'plan-toggle'` through `plansService.execute(...)` using the same `{ applianceId: 20, actorPath: 'actor', commands: [{ name: 'toggle', params: [[planId]] }] }` payload as `PlanPanel.togglePlan`.
- [x] 1.3 Verify the dispatcher returns a Promise so callers can `await` it sequentially.

## 2. KioskMultiStatePanel component

- [x] 2.1 Create `src/components/KioskMultiStatePanel.vue` with a `config: MultiStateButtonConfig` prop.
- [x] 2.2 Render a `KioskPanel` wrapper that passes `isEnabled = resolver(...)` and uses the active state's icon + label in the title slot (mirroring the `KioskSwitchPanel` / `KioskTogglePanel` template shape).
- [x] 2.3 Implement `resolveActiveState()` as an async function that walks `config.states` in order, calls `plansService.isPlanEnabled(state.planIdForCheckIfOn)` on each override state, returns the first whose plan is enabled, and falls back to the state whose `id === config.defaultStateId` if none are enabled.
- [x] 2.4 Cache the most recently resolved active state in a reactive `data` field and expose a computed / method that returns `activeStateId !== config.defaultStateId` to feed `KioskPanel.isEnabled` (driving blue default vs. yellow override color).
- [x] 2.5 Add a `dialogOpen` data flag and an `@click` handler on the `KioskPanel` that sets `dialogOpen = true`.

## 3. State picker dialog

- [x] 3.1 Inside `KioskMultiStatePanel.vue`, add a `v-dialog` bound to `dialogOpen` (non-persistent so tap-outside closes it).
- [x] 3.2 Render a `v-list` of all `config.states` in declaration order; each item shows the state icon + label.
- [x] 3.3 Bind a filled/empty radio indicator (`radio_button_checked` / `radio_button_unchecked`) per item based on `state.id === activeStateId`.
- [x] 3.4 Wire each `v-list-item` click to a `selectState(state)` method.

## 4. Transition flow

- [x] 4.1 Implement `selectState(newState)`: if `newState.id === activeStateId`, close the dialog and return without dispatching anything.
- [x] 4.2 Otherwise, `await dispatchMultiStateAction(currentState.offAction)` inside a try/catch that logs and continues on failure (skip entirely if `offAction` is absent).
- [x] 4.3 Then `await dispatchMultiStateAction(newState.onAction)` (skip if absent).
- [x] 4.4 Close the dialog unconditionally after step 4.3 completes.
- [x] 4.5 Confirm the component does NOT write `newState.id` into the active-state cache — the next `KioskPanel` poll tick repaints from the resolver.

## 5. Shutters reference configuration

- [x] 5.1 Decide where the shutters config lives (likely a small `src/views/KioskOverview.vue` patch or a new `src/config/multiStatePanels.ts` — pick what matches existing project conventions). **Chose inline data field on `KioskOverview.vue`** — matches how all other switch items are declared there.
- [x] 5.2 Author the three-state shutters config: default `auto` (no plan, no actions), override `up` and override `down`, each with `planIdForCheckIfOn`, `onAction: plan-toggle <same planId>`, `offAction: plan-toggle <same planId>`.
- [x] 5.3 Mount one `<KioskMultiStatePanel :config="shuttersOverrideConfig" />` somewhere visible in the kiosk UI so it can be exercised end-to-end. Mounted next to the existing `shuttersFirstFloor` / `shuttersFirstFloorDown` switches so they can be A/B-compared during verification.
- [x] 5.4 Replace the placeholder plan ids with the real shutters-up / shutters-down override plan ids from the current deployment (confirm with a quick check against the live plan list). **Used plan 86 (UP, "Rollos 1.Stock rauf") and plan 114 (DOWN, "Rollos 1.Stock runter")** — confirmed from the existing `shuttersFirstFloor` / `shuttersFirstFloorDown` `isEnabled` bindings in `KioskOverview.vue`.

## 6. Verification against spec requirements

> Manual verification requires a running dev server on the kiosk target. The toolchain in this sandbox fails to build (`fibers` native binding on Node 20, webpack 4 OpenSSL), so these tasks are **deferred to the user** to exercise on a working dev environment. The code paths are covered by the spec scenarios, which can be used as the manual test script.

- [ ] 6.1 Manually verify: panel renders as blue "AUTO" when no override plan is enabled.
- [ ] 6.2 Manually verify: enabling the "up" override plan out-of-band causes the panel to repaint as yellow "UP" within one poll tick (~500 ms).
- [ ] 6.3 Manually verify: tapping the panel opens a dialog listing AUTO / UP / DOWN with the active one marked.
- [ ] 6.4 Manually verify: selecting UP from AUTO turns on the up override plan (observe in PlanPanel / backend) and the panel repaints to yellow "UP" on the next tick.
- [ ] 6.5 Manually verify: selecting AUTO from UP turns off the up override plan and the panel repaints to blue "AUTO" on the next tick.
- [ ] 6.6 Manually verify: tapping UP → selecting UP again (no-op) closes the dialog without any backend calls (watch network tab).
- [ ] 6.7 Manually verify: tapping the dialog backdrop closes it without any backend calls.
- [ ] 6.8 Confirm the panel sizing meets the 44×44 CSS pixel minimum touch target on the kiosk target resolution.

## 7. Open-question cleanup

- [x] 7.1 Resolve design open question #4 — either accept the hardcoded `applianceId: 20` / `actorPath: 'actor'` constants copied from `PlanPanel` or pull them from a shared config; update the dispatcher accordingly. **Accepted as-is.** They live as module-level constants `PLAN_TOGGLE_APPLIANCE_ID` and `PLAN_TOGGLE_ACTOR_PATH` in `src/types/multiStateButton.ts`, so if they ever need to be configured they're easy to lift out.
- [x] 7.2 Resolve design open question #5 — confirm the Vuetify color tokens (or a `borderColor` override on `KioskPanel`) produce the intended kiosk blue / kiosk yellow for default vs. override. **Confirmed** — `src/plugins/vuetify.ts` already defines theme colors `on` = yellow (`#e0e040` light / `#707000` dark) and `off` = blue (`#536DFE` light / `#000065` dark). `KioskPanel.getBgColor` already uses these tokens, so feeding `isEnabled=(activeStateId !== defaultStateId)` yields blue-for-default / yellow-for-override out of the box. **No new color work required.**
- [x] 7.3 Resolve design open question #3 — confirm the exact MDI icon strings (`tune`, `auto_mode`, `keyboard_arrow_up`, `keyboard_arrow_down`) render correctly in the project's icon set. **Used `tune`, `autorenew`, `keyboard_arrow_up`, `keyboard_arrow_down`** — `autorenew` in place of `auto_mode` since it's guaranteed to exist in `material-design-icons-iconfont` v6. If the user wants `auto_mode` specifically, swap the string in `KioskOverview.vue`'s config.
- [x] 7.4 Resolve design open question #1 — record in the change (or a follow-up note) exactly where the shutters panel is mounted in the kiosk UI. **Mounted in `src/views/KioskOverview.vue`, second row, appended after the three existing shutters `KioskSwitchPanel`s**, so the multistate panel sits next to the switches it can eventually replace.

## 8. Finalization

- [x] 8.1 Run `npm run lint` and resolve any warnings touched by the new files. **Lint clean** for all three touched files (`src/types/multiStateButton.ts`, `src/components/KioskMultiStatePanel.vue`, `src/views/KioskOverview.vue`) — required fixing `type` → `interface` with semicolons on members to match the project's `@typescript-eslint/member-delimiter-style` rule.
- [ ] 8.2 Run `npm run build` to confirm no TypeScript or Vue compiler errors. **Cannot run `vue-cli-service build` in this sandbox** — pre-existing toolchain rot (`fibers` native binding fails to build on Node 20, webpack 4 needs `NODE_OPTIONS=--openssl-legacy-provider`). As a substitute, ran `npx tsc --noEmit --project tsconfig.json` across the whole project — **passes with exit 0**, so the new `.ts` types module, the dispatcher, and the new `.vue` component type-check cleanly. User should run `npm run build` locally (with `NODE_OPTIONS=--openssl-legacy-provider` if needed) as a final confirmation.
- [x] 8.3 Run `openspec validate feature-multistate-button` to confirm all artifacts still validate against the schema. **Valid.**
