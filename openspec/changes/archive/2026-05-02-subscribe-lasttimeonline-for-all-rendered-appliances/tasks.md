## 1. Edit `pathsForApplianceType` in `src/utils/overmindUtils.ts`

- [x] 1.1 Replace the body of `pathsForApplianceType` (lines 40-44) with:
  ```ts
  export function pathsForApplianceType (type: ApplianceType, usage: 'compact' | 'detail'): string[] {
    const table = usage === 'detail' ? DETAIL_PATHS : COMPACT_PATHS
    const paths = table[type]
    if (paths) {
      return paths.slice()
    }
    return usage === 'detail' ? ['**'] : ['lastTimeOnline']
  }
  ```
- [x] 1.2 Confirm `COMPACT_PATHS` and `DETAIL_PATHS` table contents are unchanged (the per-known-type paths stay exactly as they were).
- [x] 1.3 Confirm the function signature is unchanged: `(type: ApplianceType, usage: 'compact' | 'detail') => string[]`.

## 2. Confirm no other code path needs adjustment

- [x] 2.1 Confirm `Floorplan.vue:919-922` (`const paths = pathsForApplianceType(app.type, 'compact'); if (paths.length === 0) continue`) is unchanged. After this change the guard is unreachable for typical inputs but stays as defensive code.
- [x] 2.2 Confirm `Appliances.vue:88-90` (`.map(...).filter(e => e.paths.length > 0)`) is unchanged for the same reason.
- [x] 2.3 Confirm the Floorplan transport-update writer at `Floorplan.vue:884-887` already handles `path === 'lastTimeOnline'` reactively (`this.$set(targetApp, 'lastTimeOnline', value); return`). No edit required.
- [x] 2.4 Confirm the staleness gate in `overmindUtils.addOnOffStateTo:245-249` is unchanged. With `lastTimeOnline` now flowing for untyped appliances, the gate stops misfiring — no change to the gate itself.

## 3. Manual verification (browser, user-driven)

Build/test/deploy ownership lives with the user. The following are checks for the user to run on dev after the change is on `develop`.

- [ ] 3.1 User: open `/app/kioskplugs` (or whichever Kiosk view embeds the Solax inverter). Confirm appliance 177 (Solax X3-G4-15) renders its avatar normally (off-color or wattage display via `iconPos1: 'dcPower'`), NOT the red bolt.
- [ ] 3.2 User: leave the page open for >2 minutes. Confirm appliance 177's avatar does NOT flip to red after the staleness window.
- [ ] 3.3 User: in Vue DevTools, inspect `app.lastTimeOnline` for appliance 177. Confirm it advances over time, not pinned to its REST-load value.
- [ ] 3.4 User: temporarily disconnect the Solax appliance from the network (or block its backend heartbeat). Confirm that after 2+ minutes its avatar correctly flips to the red bolt — staleness gate still fires when it should.
- [ ] 3.5 User: reconnect the appliance. Confirm the avatar returns to normal once a fresh `lastTimeOnline` update arrives.
- [ ] 3.6 User: confirm appliance 145 (working 3EM, "3EM - Hauptanschluss") still renders correctly — its existing per-type paths (`relays[*].power`, `relays[0].state`, `lastTimeOnline`) are unchanged.
- [ ] 3.7 User: confirm a HT (temperature/humidity) appliance still renders its temperature-derived color over a long session — no change to its existing path list.
- [ ] 3.8 User: verify on the `/app/appliances` (Appliances list view) that any appliance with a previously-empty path list now shows live `lastTimeOnline` updates.

## 4. Cleanup and finalization

- [x] 4.1 Confirm `git diff` shows changes only in `src/utils/overmindUtils.ts` (one function body changed; table contents unchanged).
- [x] 4.2 Re-read each scenario in `openspec/changes/subscribe-lasttimeonline-for-all-rendered-appliances/specs/floorplan-live-updates/spec.md` and confirm the implementation satisfies it; manual tasks 3.1-3.8 collectively exercise the user-visible scenarios.
- [x] 4.3 Run `volta run --node 24.15.0 npx -y @fission-ai/openspec@latest validate subscribe-lasttimeonline-for-all-rendered-appliances` and confirm "valid".
