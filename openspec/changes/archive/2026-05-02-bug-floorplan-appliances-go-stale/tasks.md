## 1. Subscribe to the staleness keep-alive

- [x] 1.1 In `src/utils/overmindUtils.ts`, append `'lastTimeOnline'` to each of the `COMPACT_PATHS` entries that does not already include it: `PLUG`, `RELAY`, `RELAY_DUAL`, `DIMMER`, `BULB_RGB`, `HT`, `MOTION_SENSOR`, `CONTACT_SENSOR`. Leave `OCCUPANCY_SENSOR` exactly as-is — it already has the path.
- [x] 1.2 Confirm `DETAIL_PATHS` is unchanged — every entry is already `['**']`, which covers `lastTimeOnline` and any future appliance-level path.
- [x] 1.3 Confirm the existing path-token regex in `setPathValue` (`overmindUtils.ts:52`) accepts a bare `'lastTimeOnline'` as a single-token path (`re = /([^.[\]]+)|\[(\d+)\]/g` — yes, single identifier matches the first capture group). No code change.

## 2. Symmetric writer guard in `Appliances.vue`

- [x] 2.1 In `src/views/Appliances.vue` `applySubValuesToAppliances` (around lines 50-66), before the `setPathValue(app.state, path, v)` call, add the same guard the Floorplan uses: `if (path === 'lastTimeOnline') { this.$set(app, 'lastTimeOnline', v); continue }`. This keeps the field at appliance level so `AppliancePanel.vue:44-45` ("Last Time Online" timestamp) reflects the keep-alive instead of silently building up a bogus `state.lastTimeOnline`.
- [x] 2.2 Confirm no other COMPACT_PATHS consumer exists by re-running `grep -rn "pathsForApplianceType" src/` — today only `Floorplan.vue:855` and `Appliances.vue:85` call it; if a third consumer appears, it needs the same guard.

## 3. Floorplan side — verify, don't change

- [x] 3.1 Read `src/components/floorplan/Floorplan.vue:864-880` and confirm the `if (path === 'lastTimeOnline')` branch in `writePath` is in place; no edit needed. The branch was added with the `OCCUPANCY_SENSOR` work and applies uniformly to every appliance type.
- [x] 3.2 Read `src/components/floorplan/Floorplan.vue:931-940` and confirm the primary-child-to-group mirror covers non-power paths (it does — only the `relays[\d+].power` branch at lines 909-930 is special-cased), so a `lastTimeOnline` triple will mirror onto each containing group through this branch.
- [x] 3.3 Read `src/utils/overmindUtils.ts:240-249` and confirm the staleness check still uses `item.lastTimeOnline` (not `item.state.lastTimeOnline`); no edit needed.

## 4. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on the dev environment after the change is on `develop`.

- [ ] 4.1 User: open `/floorplan` in the dev server and confirm initial render shows correct on/off / power readings for all plain non-batteryDriven appliances (PLUG, RELAY, DIMMER, BULB_RGB, HT). Note the time.
- [ ] 4.2 User: leave the page open for **at least 5 minutes** without interacting. Confirm none of the plain appliances flips to red ("error") during that window.
- [ ] 4.3 User: with DevTools → Network → EventStream → the `/sse/...` connection open, confirm at least one `transport-update` payload arriving during the 5-minute window contains a triple with `path === 'lastTimeOnline'` for one of the lights appliances.
- [ ] 4.4 User: in Vue DevTools, inspect a PLUG / DIMMER appliance's reactive `lastTimeOnline` field and confirm the value advances over the 5-minute window (compare to its REST-loaded value).
- [ ] 4.5 User: navigate to `/appliances` (the Appliances panel) and confirm the per-row "Last Time Online" timestamp is recent and continues to update without a page reload (validates Task 2.1).
- [ ] 4.6 User: open a `GROUP_PARALLEL` / `GROUP_SERIAL` on the Floorplan and confirm it stays green over the 5-minute window (validates the group primary-child mirror via Task 3.2).
- [ ] 4.7 User: confirm an `OCCUPANCY_SENSOR` on the Floorplan still behaves identically to before (no regression to the existing keep-alive flow).
- [ ] 4.8 User: repeat 4.1-4.4 in Kiosk views (`/app/kiosklights`, `/app/kioskenergy`, etc.) on tablet, mobile, and PC layouts to confirm cross-form-factor correctness.

## 5. Cleanup and finalization

- [x] 5.1 Confirm `git diff src/utils/overmindUtils.ts src/views/Appliances.vue` is the entire diff — no other files should be touched. (`Floorplan.vue` is read-only for this change.)
- [x] 5.2 Re-read the delta spec at `openspec/changes/bug-floorplan-appliances-go-stale/specs/floorplan-live-updates/spec.md` and confirm each scenario is exercised by tasks 4.1-4.8.
- [ ] 5.3 Run `openspec validate bug-floorplan-appliances-go-stale` (via `volta run --node 24.15.0 npx -y -p @fission-ai/openspec openspec validate ...` per `project_node_version` memory — openspec needs a newer Node than the project's pinned v14).
