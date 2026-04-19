## 1. Instrumentation (D1)

- [x] 1.1 In `src/components/floorplan/Floorplan.vue`, add a module-local constant `DEBUG_TRANSPORTS = false` near the other imports in the `<script>` block
- [x] 1.2 In the transport-update callback inside `mounted()`, emit a gated `console.debug` line per batch including `sseHandle.id`, `payload.values.length`, and the first two triples with their `representsGroups`
- [x] 1.3 Inside the `writePath` helper, add a gated `console.debug` line recording `(applianceId, path, value, matched)` where `matched` is whether `appMap.get(applianceId)` resolved to an appliance
- [x] 1.4 In `mounted()` and `beforeDestroy`, add gated `console.debug` lines logging the Floorplan's lifecycle with the `sseHandle.id` so duplicate-handle scenarios become visible

## 2. Reproduction and confirmation of D2

- [x] 2.1 Reproduce in the dev floorplan with `DEBUG_TRANSPORTS = true`; toggle one plain appliance twice and one other plain appliance once; capture the browser console logs
- [x] 2.2 With Vue DevTools open, inspect the reactive `app.state.relays[0].state` and `app.state.relays[0].power` after each click; record whether the value reflects the latest transport-update even when the DOM does not
- [x] 2.3 If logs show `writePath` is called with correct values on every click **and** DevTools shows the reactive state is current while the DOM is stale, D2 is confirmed — proceed to section 3. Otherwise, STOP and revisit `design.md`

## 3. Primary fix: component-local reactive update counter (Candidate Fix A)

- [x] 3.1 In `Floorplan.vue` `data()`, add `updateSeq: 0`
- [x] 3.2 Add a method `appFor(id)` that reads `this.updateSeq` before returning `this.appMap.get(id)`, establishing a native Vue dep on `updateSeq` for every template read
- [x] 3.3 Replace every `appMap.get(area.appId)` in the template (`<template>` section) with `appFor(area.appId)`
- [x] 3.4 Replace every `this.appMap.get(...)` in script methods that compose reactive reads (`isError`, `getColor`, `isOn`, `isHT`, `displayBattery`, `allowQuickAction`, `getTemperatureOf`, `getHumidityOf`, `getBatteryLevelColor`, `getPowerOf`, `getOuterRingColor`, `getOpacity`) with `this.appFor(...)`
- [x] 3.5 Leave the transport-update callback's internal `this.appMap.get(triple.applianceId)` and `this.appMap.get(gid)` calls as-is (they write, not read reactively)
- [x] 3.6 Inside the transport-update callback, immediately before `this.redraw(false)`, add `this.updateSeq += 1` so every processed batch bumps the counter after all writes have landed
- [x] 3.7 Remove the now-redundant `this.appMap.changed()` call OR keep it for ObservableMap consumers unrelated to the Floorplan template (decide based on whether any non-template code path still depends on the `changeTracker`-based dep; prefer removing if not)

## 4. Defense-in-depth: reactive writes for derived state

- [x] 4.1 In `src/utils/overmindUtils.ts` `addOnOffStateTo`, replace every `item.onOffState = '<value>'` assignment with `Vue.set(item, 'onOffState', '<value>')` (PLUG/RELAY/DIMMER/BULB_RGB, MOTION_SENSOR, HT, CONTACT_SENSOR, and default `'none'` branches)
- [x] 4.2 In the `RELAY_DUAL` branch, where `item.onOffState` is initialized to `[]` and then indexed, use `Vue.set(item, 'onOffState', [])` for the initial array creation and `Vue.set(item.onOffState, index, '<value>')` for each per-index write
- [x] 4.3 For the `HT` branch that assigns `item.colorPalette = () => {...}`, leave unchanged — `colorPalette` is a function, and its reactivity is not at issue here
- [x] 4.4 Import `Vue from 'vue'` if not already imported at the top of `overmindUtils.ts` (it is — confirm and skip this task if already present)

## 5. Manual verification (browser)

Build/test/deploy ownership lives with the user; the tasks below are a verification checklist for the user to run in the dev environment.

- [x] 5.1 User: open `/floorplan` in the dev server and confirm initial render shows correct on/off icons, colors, and power readings for all plain appliances (PLUG, RELAY, DIMMER, BULB_RGB)
- [x] 5.2 User: click a plain PLUG that is off; confirm within ~1s that the avatar flips to the on color and the power reading reflects the new value (not 0)
- [x] 5.3 User: click the same PLUG again to turn it off; confirm the avatar flips back and the power reading drops
- [x] 5.4 User: click a different plain DIMMER to turn it on; confirm the avatar flips and the power reading updates
- [x] 5.5 User: repeat the on/off toggle on five different plain appliances in sequence; confirm every appliance reflects its new state on every click (no "only first click works" pattern)
- [x] 5.6 User: sanity-check an existing `GROUP_PARALLEL` or `GROUP_SERIAL`: toggle the group, confirm the on/off mirror and the summed-power aggregation still display correctly
- [x] 5.7 User: navigate away from the Floorplan and back; repeat task 5.5 to confirm no regression after a re-mount cycle
- [x] 5.8 User: run the same checks on tablet and mobile layouts (Kiosk mode) to confirm cross-form-factor correctness

## 6. Cleanup and finalization

- [x] 6.1 Confirm `DEBUG_TRANSPORTS` is committed as `false` (the flag stays in the code for future diagnosis per spec, but not enabled by default)
- [x] 6.2 Remove any scratch `console.log` / temporary debug code introduced during investigation that is not gated by `DEBUG_TRANSPORTS`
- [x] 6.3 Confirm no incidental edits landed in `src/utils/sseClient.ts`, `src/utils/doubleBufferedObservableMap.ts`, or `src/utils/observableMap.ts` (fix is scoped to `Floorplan.vue` + `overmindUtils.ts`)
- [x] 6.4 Re-read `openspec/changes/bug-updates-on-floorplan-not-working/specs/floorplan-live-updates/spec.md` and confirm each ADDED Requirement's scenarios are exercised by tasks 5.1–5.8
