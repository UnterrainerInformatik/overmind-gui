## 1. Initial REST resolve in `Floorplan.vue` `getAppliances`

- [x] 1.1 In `src/components/floorplan/Floorplan.vue` (`getAppliances`, around lines 707-723), replace the group-resolve loop body so it iterates ALL children:
  - Remove the unconditional `break` after the first child.
  - For each child, fetch via `appliancesService.getById(id)`, parse state/config.
  - On the FIRST child only: set `appliance.state`, `appliance.type`, `appliance.classFqn`, `appliance.lastTimeSetup` (display-uniformity fields). Use a local `firstChildResolved` boolean flag.
  - Across ALL children: track the maximum `lastTimeOnline` (string compare; ignore missing/null values).
  - After the inner loop: set `appliance.lastTimeOnline` to the captured maximum.
- [x] 1.2 Confirm no other field's inheritance changes — `state`, `type`, `classFqn`, `lastTimeSetup` continue to come from the first child only. Only `lastTimeOnline` is derived from max-across-children.
- [x] 1.3 Confirm the inner loop preserves `await` ordering: each `appliancesService.getById(id)` is awaited sequentially (not parallelised) to keep behaviour identical except for the freshest-wins derivation.

## 2. SSE mirror for `lastTimeOnline` in `Floorplan.vue` transport callback

- [x] 2.1 In `Floorplan.vue` transport-update callback (around lines 998-1006, the `else` branch handling non-aggregate paths), branch on `triple.path === 'lastTimeOnline'`:
  - For `lastTimeOnline`: route via `anyChildToGroupIds.get(triple.applianceId)` (not `primaryChildToGroupIds`). For each group `gid`, look up `groupApp = this.appMap.get(gid)`. Only call `writePath(groupApp, triple.path, triple.value, gid)` if `!groupApp.lastTimeOnline || triple.value > groupApp.lastTimeOnline` (newer-wins guard).
  - For all other non-aggregate paths: keep the existing primary-child-only mirror via `primaryChildToGroupIds`. No change to `state.relays[0].state` and similar fields.
- [x] 2.2 Confirm the existing `representsGroups` mirror at `Floorplan.vue:971-975` is untouched. It continues to apply unconditionally for any group listed by the backend; the new `anyChildToGroupIds` mirror is a fallback for heartbeats not marked with `representsGroups`.
- [x] 2.3 Confirm the relay-power aggregation branch (`Floorplan.vue:976-997`, matched by the `^relays\[(\d+)\]\.power$` regex) is unchanged.

## 3. No-regression-to-falsy guard in `writePath`

- [x] 3.1 In `Floorplan.vue` `writePath` (around lines 936-939), wrap the `Vue.set(targetApp, 'lastTimeOnline', value)` call in `if (value) { ... }` so falsy incoming values (null / undefined / empty string) are ignored. Comment the change to explain that the backend re-emits NULL `lastTimeOnline` for groups on the initial transport-update batch and would otherwise wipe the freshest-child value computed in §1.

## 4. Confirm no other code path needs adjustment

- [x] 4.1 Confirm `addOnOffStateTo` (`overmindUtils.ts:240-`) is unchanged. The fix changes WHEN/HOW `app.lastTimeOnline` is set on group appliances; the staleness gate inside `addOnOffStateTo` reads `app.lastTimeOnline` exactly as before.
- [x] 4.2 Confirm `pathsForApplianceType` is unchanged. The SSE selection still subscribes children (and group inheritances) to `lastTimeOnline` via the universal floor.
- [x] 4.3 Confirm the `representsGroups` mirror and the relay-power aggregation in the SSE callback are untouched. The newer-wins guard for the `anyChildToGroupIds` mirror lives in the SSE callback's `lastTimeOnline` branch (not inside `writePath` itself); the broader no-regression-to-falsy guard now lives in `writePath` and applies to every appliance, not just groups.

## 5. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on dev after the change is on `develop`.

- [ ] 5.1 User: open the Schlafzimmer Eltern lights view (or whichever Kiosk view embeds the affected group). Confirm the group's avatar renders normally on the FIRST frame — NO red flash.
- [ ] 5.2 User: hard-reload the page multiple times. Confirm the avatar consistently renders normally on initial load (the bug was deterministic; it should now be deterministically gone).
- [ ] 5.3 User: in Vue DevTools, inspect the group appliance's reactive `app.lastTimeOnline` immediately after page load. Confirm it matches the freshest child's value, NOT the first child's stale value, and that it does NOT get wiped by the initial SSE batch.
- [ ] 5.4 User: with the page open, observe the group's `app.lastTimeOnline` over time. Confirm it advances each time ANY child sends a heartbeat (not only when the primary child sends one).
- [ ] 5.5 User: simulate a stale heartbeat by manipulating one child's value in DevTools. Confirm an out-of-order older heartbeat from a less-recent child does NOT regress the group's stored value (newer-wins guard).
- [ ] 5.6 User: disconnect ALL children of a group from the network. Confirm the group's avatar correctly flips to red after the staleness threshold (gate still works when it should — no false-online).
- [ ] 5.7 User: confirm groups with a single child still behave correctly — the rule degenerates to "use the only child's lastTimeOnline".
- [ ] 5.8 User: confirm non-group appliances (plain PLUG, RELAY, HT, etc.) are unaffected — their `lastTimeOnline` updates exactly as before.

## 6. Cleanup and finalization

- [x] 6.1 Confirm `git diff` shows changes only in `src/components/floorplan/Floorplan.vue` (three spots: `getAppliances` group-resolve loop, the transport-update callback's non-aggregate-path branch, and the `writePath` `lastTimeOnline` no-regression guard).
- [x] 6.2 Re-read each scenario in `openspec/changes/group-lasttimeonline-from-freshest-child/specs/floorplan-live-updates/spec.md` and confirm the implementation satisfies it; manual tasks 5.1-5.8 collectively exercise the user-visible scenarios.
- [x] 6.3 Run `volta run --node 24.15.0 npx -y @fission-ai/openspec@latest validate group-lasttimeonline-from-freshest-child` and confirm "valid".
