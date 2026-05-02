## 1. Edit `addOnOffStateTo` in `src/utils/overmindUtils.ts`

- [x] 1.1 Locate the `PLUG` / `RELAY` / `DIMMER` / `BULB_RGB` case at lines 252-268. Replace the body so that:
  - Step 1 (unchanged): if `item.state.relays[0].state` is present, classify as `'on'` (when `.toLowerCase() === 'on'`) or `'off'`.
  - Step 2 (new): else, walk `item.state.relays[i].power` (incrementing `i` while `relays[i] && relays[i].power !== undefined`), summing numeric values. If at least one numeric `power` was found, classify as `'on'` (sum `> 0`) or `'off'`.
  - Step 3 (existing fall-through, no early-return): else, `Vue.set(item, 'onOffState', 'error')`.
- [x] 1.2 Delete the `if (item && item.state && item.iconPos1) { return item.state[item.iconPos1] > 0 }` block at lines 257-259. No replacement — the new step 2 above subsumes its accidental "works" cases via summed power, and the genuinely-no-data case correctly falls through to `'error'`.
- [x] 1.3 Use `Vue.set(item, 'onOffState', value)` for every assignment in this branch (matches the existing pattern and the `floorplan-live-updates` "Derived on/off state is reactive" requirement). Do NOT use plain `=`.
- [x] 1.4 Confirm no signature change: `addOnOffStateTo(item, index)` still `void`, still mutates `item` in place. The single caller `Floorplan.redraw` (`Floorplan.vue:650`) is untouched.

## 2. Confirm no other code path needs adjustment

- [x] 2.1 Confirm `Floorplan.getColor` (`Floorplan.vue:790-817`) and `Floorplan.isOn` (`Floorplan.vue:818-832`) read from `app.onOffState` (or fall back to `iconPos1`-as-state-key independently). Both now inherit the corrected `onOffState` automatically — no edit required.
- [x] 2.2 Confirm `Floorplan.isError` (`Floorplan.vue:776-789`) is unchanged in behaviour: it still returns true when `app.onOffState === 'error'` or `appFor(area.appId)` is missing. The fix only changes WHEN `onOffState` becomes `'error'`, not how `isError` consumes it.
- [x] 2.3 Confirm the staleness gate (`overmindUtils.ts:245-249`) is untouched and still runs before the switch. A genuinely stale appliance still flips to `'error'` regardless of power.

## 3. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on dev after the change is on `develop`.

- [ ] 3.1 User: open a Kiosk view (e.g., `/app/kiosklights`) that includes the solar 3EM. Confirm it renders with its normal (off-color) avatar, NOT a red bolt, while `lastTimeOnline` is fresh.
- [ ] 3.2 User: when the solar panels are producing, confirm the avatar shows the wattage (`displayWatts` true) and the on-color.
- [ ] 3.3 User: at night (or by simulating zero power), confirm the avatar shows the off-color and the wattage hides (consistent with `displayWatts` requiring `isOn`).
- [ ] 3.4 User: with detail mode ON, confirm clicking the solar 3EM opens its dialog (the click-target is now the full normal avatar, not the small red bolt).
- [ ] 3.5 User: pull the network on the 3EM device long enough to exceed the 2-minute staleness threshold. Confirm the avatar flips to the red bolt — staleness gate still works.
- [ ] 3.6 User: confirm the OTHER (locked) 3EM still renders correctly. Its rendering must be indistinguishable from before the fix; if `iconPos1` is set on it, behaviour now does not depend on that field for `onOffState` purposes.
- [ ] 3.7 User: confirm an unrelated PLUG/RELAY appliance (one with a real switch and `relays[0].state`) is unaffected — its `'on'`/`'off'` still tracks the relay state directly and matches reality.

## 4. Cleanup and finalization

- [x] 4.1 Confirm `git diff` shows changes only in `src/utils/overmindUtils.ts`.
- [x] 4.2 Re-read each scenario in `openspec/changes/fix-3em-onoffstate-derivation/specs/floorplan-live-updates/spec.md` and confirm the implementation satisfies it; manual tasks 3.1-3.7 collectively exercise the user-visible scenarios.
- [x] 4.3 Run `volta run --node 24.15.0 npx -y @fission-ai/openspec@latest validate fix-3em-onoffstate-derivation` and confirm "valid".
