## Context

The Floorplan view (`src/components/floorplan/Floorplan.vue`) is the primary live control surface in Kiosk mode on tablet, mobile, and PC. After mount, it loads appliances via REST and registers a single SSE transport that delivers `(applianceId, path, value)` triples for the per-type "compact" path set returned by `pathsForApplianceType(type, 'compact')` in `src/utils/overmindUtils.ts`.

The canvas redraw step calls `overmindUtils.addOnOffStateTo(item, area.index)` for each area, and the very first thing that helper does (`overmindUtils.ts:240-249`) is a staleness check:

```ts
const staleMinutes = item.batteryDriven === 1 ? 24 * 60 : 2
if (!item.lastTimeOnline ||
    Math.abs(new Date().getTime() - new Date(item.lastTimeOnline + 'Z').getTime()) / 60000 > staleMinutes) {
  Vue.set(item, 'onOffState', 'error')
  return
}
```

If `lastTimeOnline` is older than the threshold (or absent), `onOffState` is forced to `'error'` and the Floorplan paints the appliance red regardless of any other state it might have. (`'Z'` suffix per the `project_db_times_utc` memory: backend timestamps are UTC without suffix.)

The `lastTimeOnline` field on each appliance is initially populated from the REST `/appliances` response in `getAppliances` (`Floorplan.vue:680-705`; for groups it is copied from the primary child at `Floorplan.vue:697`). After that, the only mechanism to refresh it is an incoming `transport-update` triple with `path === 'lastTimeOnline'`, which the writer at `Floorplan.vue:864-880` already handles correctly:

```ts
if (path === 'lastTimeOnline') {
  this.$set(targetApp, 'lastTimeOnline', value)
  return
}
```

So the consumer side is wired up. The bug is on the **subscription** side: `COMPACT_PATHS` in `overmindUtils.ts:16-26` lists `'lastTimeOnline'` only for `OCCUPANCY_SENSOR`. For every other type the Floorplan never asks for it, the backend never sends it, and after `staleMinutes` minutes the Floorplan flips the appliance to `'error'` (red) even though every other live signal for that appliance is still flowing.

The reason the user sees this on lights but not motion: lights are not `batteryDriven`, so their threshold is **2 minutes**. Battery-driven sensors (MOTION / CONTACT / OCCUPANCY) get **24 hours** of slack via `batteryDriven === 1`, which masks the same bug for them.

## Goals / Non-Goals

**Goals:**
- A long-running Floorplan session (hours, in Kiosk mode) does not paint live, healthy appliances as `'error'`.
- The fix is the minimum subscription delta required to land the keep-alive: change one config table, no new code paths.
- The new requirement is captured in the `floorplan-live-updates` spec so a future contributor cannot regress it by editing `COMPACT_PATHS` alone without also breaking a scenario.
- Group routing keeps working (group's `lastTimeOnline` mirrors the primary child the same way `relays[0].state` does today).

**Non-Goals:**
- Reworking the staleness check itself, the threshold, or the `batteryDriven`-vs-not branching. Out of scope.
- Reworking the SSE client (`src/lib/sse-client/`) or the transport contract.
- Reworking `DoubleBufferedObservableMap` / `ObservableMap` / `updateSeq` reactivity. Already covered by the prior `bug-updates-on-floorplan-not-working` change.
- Backend changes. The backend already supports `lastTimeOnline` as a transport path (used today by `OCCUPANCY_SENSOR`).
- Adding a "force refresh staleness when no update arrives in N seconds" client-side fallback. The keep-alive cadence is a backend concern; if the backend stops emitting them, the staleness check correctly trips.

## Decisions

### D1. Add `'lastTimeOnline'` to every `COMPACT_PATHS` entry, not just the lights ones

**Decision:** Append `'lastTimeOnline'` to all eight COMPACT_PATHS entries (PLUG, RELAY, RELAY_DUAL, DIMMER, BULB_RGB, HT, MOTION_SENSOR, CONTACT_SENSOR). `OCCUPANCY_SENSOR` already has it.

**Why over alternative:**
- Every type listed in `COMPACT_PATHS` flows through `addOnOffStateTo`, and the staleness check is at the very top of that helper — it applies uniformly to every type. There is no type for which we want to *avoid* keep-alives in compact mode.
- Even the `batteryDriven === 1` types (MOTION / CONTACT) benefit: today they only avoid the bug because their 24h tolerance is wider than the typical session. A user keeping the page open across days would see them flip to `'error'` too. Including the path closes that hole at zero extra cost.

**Alternative considered:** Only add it for non-batteryDriven types (PLUG, RELAY, RELAY_DUAL, DIMMER, BULB_RGB, HT). Rejected — leaves a latent edge case for very long sessions on battery-driven sensors and adds a fragile "remember which types are batteryDriven" coupling between two unrelated tables. The cost of the extra path on battery-driven sensors is negligible.

**Alternative considered:** Centralize via a helper, e.g. `pathsForApplianceType` always appends `'lastTimeOnline'` if the type's entry exists. Rejected for this PR — the COMPACT_PATHS table is the single source of truth and adding `'lastTimeOnline'` inline is the simpler, more obvious change. A helper-level addition would obscure that the keep-alive is part of the per-type contract and would surprise the next contributor reading the table. Defer if a future change adds many more cross-cutting paths.

### D2. Don't touch the writePath handler — the path branch already exists

`Floorplan.vue:872-873` already does `this.$set(targetApp, 'lastTimeOnline', value)` when the triple's path is `'lastTimeOnline'`. This branch was added when `OCCUPANCY_SENSOR` got the path. It is correct for every appliance type because `lastTimeOnline` is an appliance-level field (not nested under `state`). No change needed.

### D3. Group routing reuses the existing primary-child mirror

For groups (`GROUP_PARALLEL` / `GROUP_SERIAL`), the group's own `lastTimeOnline` needs to track the primary child's. Two paths handle this in `Floorplan.vue`:

1. `representsGroups` mirror (`Floorplan.vue:904-908`): if the backend marks a triple with `representsGroups: [gid, ...]`, the Floorplan writes the value to each gid as well.
2. Primary-child mirror for non-power paths (`Floorplan.vue:931-940`): if the appliance is the primary child of one or more groups (per `primaryChildToGroupIds` built at `Floorplan.vue:843-846`), the value is mirrored to those group IDs too.

`'lastTimeOnline'` is a non-power path so it routes through (2) automatically. No change needed.

This matches the initial-load behavior at `Floorplan.vue:697` (`appliance.lastTimeOnline = subApp.lastTimeOnline` from the first child only), so live and initial behavior stay consistent.

### D4. Spec lives on `floorplan-live-updates`, not on a new capability

The new requirement is about the Floorplan's transport-subscription contract — exactly what `floorplan-live-updates` already covers (see its existing "Single transport subscription on mount" requirement). Adding a new requirement under `## ADDED Requirements` is the right shape and keeps related contracts colocated.

The same requirement is *not* added to `sse-transport-client` because that capability is appliance-agnostic — it doesn't know about `lastTimeOnline` or staleness semantics. The keep-alive coverage is a Floorplan-consumer concern.

### D5. Watch out for `OCCUPANCY_SENSOR`'s existing entry

`OCCUPANCY_SENSOR` already includes `'lastTimeOnline'` (`overmindUtils.ts:25`). The change MUST NOT add it twice. Verify by reading the entry and either keeping it or making the addition conditional on it not already being there. Simplest: just leave the OCCUPANCY_SENSOR row exactly as-is.

## Risks / Trade-offs

- **[Risk]** Backend does not actually emit `lastTimeOnline` keep-alives for the new types it's now asked for. → **Mitigation:** the path is already supported for `OCCUPANCY_SENSOR` and the writer is already in place; the contract is a per-type subscription, so asking for it triggers emission. If the backend turns out not to emit for a specific type, the staleness check still trips correctly (current behavior) and we file a backend ticket — no client regression.
- **[Risk]** Slightly increased SSE traffic per appliance (one extra path per registered appliance). → **Mitigation:** the transport coalesces at `minInterval: 1000ms` (`Floorplan.vue:882`). The keep-alive cadence is whatever the backend already uses for `OCCUPANCY_SENSOR` today (typically tens of seconds, not sub-second), so the practical bandwidth delta is negligible.
- **[Risk]** Some downstream consumer (`Appliances.vue:85`) also reads compact paths and might be affected by the extra path. → **Mitigation:** `Appliances.vue` already runs `setPathValue(app.state, path, v)` and would not write to `state.lastTimeOnline` — `setPathValue` would put it under `state` incorrectly. **This is a real concern, see Open Questions OQ1.**
- **[Risk]** The `pathsForApplianceType` consumer at `Appliances.vue:85` does NOT have a special-case for `lastTimeOnline` like Floorplan does (`Floorplan.vue:872-873`), so the keep-alive triple would be written under `app.state.lastTimeOnline` instead of `app.lastTimeOnline`. → **Mitigation:** see Decisions D6 below.

### D6. Mirror the `lastTimeOnline` writer in `Appliances.vue`

**Decision:** Add the same `if (path === 'lastTimeOnline')` guard to the transport-update handler in `Appliances.vue` so the field lands on the appliance, not under `state`. This keeps the two consumers symmetric and prevents `Appliances.vue` from silently building up a bogus `state.lastTimeOnline` field.

**Why:** `Appliances.vue:85` also calls `pathsForApplianceType(a.type, 'compact')`, so once we add the path to COMPACT_PATHS, it will arrive in that consumer too. Without the guard, `setPathValue(app.state, 'lastTimeOnline', value)` would create `app.state.lastTimeOnline` instead of updating `app.lastTimeOnline` — wrong location, panel templates that read `item.lastTimeOnline` (`AppliancePanel.vue:44-45`) wouldn't pick it up, and the panel would still show a stale "Last Time Online" timestamp.

**Alternative considered:** Centralize the appliance-level vs state-level path routing inside `setPathValue` or a new helper. Rejected — it widens the change blast radius, and `lastTimeOnline` is the only known appliance-level path on transport-update right now. Two narrow guards (one per consumer) is fine.

## Migration Plan

No user migration. Pure additive subscription change.

1. Land the change on `develop`.
2. Manually verify the Floorplan stays green for >5 minutes on a non-batteryDriven appliance (PLUG / DIMMER), and the AppliancePanel keeps its "Last Time Online" timestamp moving.
3. Spot-check that the existing `OCCUPANCY_SENSOR` keep-alive behavior is unchanged.
4. Merge `develop` → `master` on the usual cadence.

Rollback: revert the COMPACT_PATHS change. The bug returns to its current behavior (lights go red after 2 minutes). The `Appliances.vue` guard is defensive and harmless to keep around even after rollback.

## Open Questions

- **OQ1.** Confirm during verification: with `'lastTimeOnline'` added to COMPACT_PATHS, does the backend actually emit `lastTimeOnline` keep-alive triples for PLUG / RELAY / DIMMER / BULB_RGB / HT? (Sniff the SSE stream in DevTools Network → EventStream.) If yes, fix is complete. If no, the COMPACT_PATHS change is necessary but not sufficient and we file a backend ticket.
- **OQ2.** Cadence: how often does the backend send `lastTimeOnline` for `OCCUPANCY_SENSOR` today? If the cadence is wider than 2 minutes (the lights-panel staleness threshold), the bug would *still* manifest on a heavily-coalesced session. The Floorplan's `minInterval: 1000ms` only sets the *minimum* gap between batches, not a maximum. Worth confirming before declaring done.
- **OQ3.** Should `addOnOffStateTo`'s 2-minute threshold be widened (e.g. to 5 minutes) as a defense-in-depth measure? Keep out of scope for this PR — a separate change if OQ2 shows the keep-alive cadence is borderline.
