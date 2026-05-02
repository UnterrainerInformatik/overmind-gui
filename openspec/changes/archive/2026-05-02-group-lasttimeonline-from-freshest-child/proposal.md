## Why

A `GROUP_PARALLEL` / `GROUP_SERIAL` appliance on the Floorplan inherits its `lastTimeOnline` from the **first child only**, in two places:

1. Initial REST resolve (`Floorplan.vue:707-723`): the loop over `appliance.config.applianceIds` does `appliance.lastTimeOnline = subApp.lastTimeOnline` and then `break` after the first child.
2. SSE mirror (`Floorplan.vue:998-1003`): non-aggregate paths (including `lastTimeOnline`) mirror from `primaryChildToGroupIds` only — i.e. only when the **primary child** sends a heartbeat.

In a group like the Schlafzimmer Eltern lights — multiple physical relays grouped under one floorplan icon — the first child often has the oldest `lastTimeOnline` (e.g. it hasn't been switched in a while). The group inherits that stale timestamp, the staleness gate (`overmindUtils.ts:245-249`, 2-minute threshold for non-battery devices) trips, `addOnOffStateTo` paints `'error'`, and the group renders as a red bolt on every fresh page open. Then a few seconds later — when the primary child happens to send its next heartbeat via SSE — the mirror updates the group's `lastTimeOnline` and the avatar flips back to normal. The visible symptom is a red flash on every page load.

The semantically correct rule is: a group is "online" if **any** of its children are online. That means the group's `lastTimeOnline` should be the **maximum** across all children, not the first child's.

## What Changes

- **Initial REST resolve**: in `Floorplan.vue` `getAppliances` (around line 707-723), iterate **all** `config.applianceIds` (not just the first), and set the group's `lastTimeOnline` to the maximum across all children's `lastTimeOnline`. Other inherited fields (`state`, `type`, `classFqn`, `lastTimeSetup`) continue to come from the first child only — that part of the existing display-uniformity contract is preserved.
- **SSE mirror for `lastTimeOnline`**: in the transport-update callback (`Floorplan.vue:998-1003`), route `lastTimeOnline` updates from **any** child to the containing groups via `anyChildToGroupIds` (instead of only the primary child via `primaryChildToGroupIds`). The mirror MUST only advance the group's stored value when the incoming timestamp is **newer** than the current — never regress to an older heartbeat that arrived later from a less-recent child.
- **Other non-aggregate paths** (e.g. `relays[0].state`) continue to mirror from the **primary child only**, unchanged. The display-state inheritance contract for "this group looks like its first child" stays intact; only the `lastTimeOnline` field gets the freshest-wins semantic.
- **`lastTimeOnline` SSE writes never regress to a falsy value.** `Floorplan.vue` `writePath` skips the assignment when the incoming `value` is null / undefined / empty string. Groups in particular have a NULL stored `lastTimeOnline` that the backend re-emits on the initial transport-update batch — without this guard it wipes the value derived from children at register-time and flips the group to `'error'` for several seconds until a real child heartbeat arrives.
- **No backend changes.** Whether the backend marks `lastTimeOnline` heartbeats with `representsGroups` for all parent groups or none is irrelevant — the `representsGroups` mirror at `Floorplan.vue:971-975` continues to work as today, but the `anyChildToGroupIds` path here covers the gap when the backend does not include the parent group in `representsGroups` for non-primary-child heartbeats.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `floorplan-live-updates`: rewrites the existing "Group inherits keep-alive from its primary child" scenario inside the "Transport selection includes the staleness keep-alive path" requirement to a "freshest child" scenario, and adds a new requirement governing how a group's `lastTimeOnline` is derived (initial-REST max + SSE-newer-wins).

## Impact

- **Code touched**: `src/components/floorplan/Floorplan.vue` only — `getAppliances` group-resolve loop, plus the SSE-mirror branch for `lastTimeOnline` inside the transport-update callback.
- **No changes to** `overmindUtils.ts`, `SseClient`, `pathsForApplianceType`, `addOnOffStateTo`, the staleness gate, or any per-vendor dialog component.
- **No new dependencies, no migrations, no backend impact.**
- **Behavior change**: groups whose first child is stale but whose other children are online now render correctly on initial load — no red flash on every fresh page open. Groups where ALL children are genuinely stale still flip to `'error'` (unchanged correctness).
- **Forward compatibility**: any future group composition (more children, different child types) inherits the freshest-wins semantic without per-group configuration.
