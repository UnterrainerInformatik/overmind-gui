## Context

`Floorplan.vue` resolves `GROUP_PARALLEL` / `GROUP_SERIAL` appliances in two passes:

**Pass 1 — initial REST resolve (`Floorplan.vue:707-723`)**:

```js
for (const appliance of appliances) {
  if ((appliance.type === 'GROUP_PARALLEL' || appliance.type === 'GROUP_SERIAL') && appliance.config && appliance.config.applianceIds) {
    for (const id of appliance.config.applianceIds) {
      const subApp = await appliancesService.getById(id)
      overmindUtils.parseState(subApp)
      overmindUtils.parseConfig(subApp)
      appliance.lastTimeOnline = subApp.lastTimeOnline
      appliance.lastTimeSetup = subApp.lastTimeSetup
      appliance.state = subApp.state
      appliance.type = subApp.type
      appliance.classFqn = subApp.classFqn
      break
    }
  }
}
```

The group's display-relevant fields (`state`, `type`, `classFqn`) are inherited from the first child. That's the existing display-uniformity contract: a group is rendered as if it were its first child. `lastTimeOnline` and `lastTimeSetup` are also inherited from the first child by the same loop, but they aren't display-relevant in the same way — they're staleness signals, and the right semantic for a group is "any child online ⇒ group online".

**Pass 2 — SSE mirror (`Floorplan.vue:996-1006`)**:

```js
} else {
  // Non-aggregate paths mirror from the primary child only, matching
  // the initial-state copy in getAppliances().
  const groups = primaryChildToGroupIds.get(triple.applianceId)
  if (groups) {
    for (const gid of groups) {
      writePath(this.appMap.get(gid), triple.path, triple.value, gid)
    }
  }
}
```

Non-aggregate paths (everything except `relays[*].power`, which is summed across children) mirror from the primary child only. The comment says "matching the initial-state copy in getAppliances()" — and that's true for `state.relays[0].state` (the display-uniformity contract), but it bundles `lastTimeOnline` into the same rule by accident. Heartbeats from non-primary children never reach the group.

**Concrete failure** (Schlafzimmer Eltern lights): the group's first child happens to have an old `lastTimeOnline` because that specific relay hasn't been switched recently. On page load, the group's `lastTimeOnline` is the first child's stale value. `addOnOffStateTo:245-249` paints `'error'` (2-min threshold). The avatar renders red. A few seconds later, the primary child sends a heartbeat → mirror updates → group's `lastTimeOnline` advances → next redraw clears `'error'`. The user sees a red flash on every page open.

## Goals / Non-Goals

**Goals:**
- A group's `lastTimeOnline` SHALL reflect the **freshest** heartbeat across **all** its children — both at initial REST resolve and on every subsequent SSE update.
- The display-uniformity contract for `state` / `type` / `classFqn` (inherited from the first child) SHALL be preserved exactly. Only the staleness-signal field (`lastTimeOnline`) gets the freshest-wins semantic.
- A group composed entirely of genuinely-offline children SHALL still flip to `'error'` after the staleness threshold. The fix is "any child online ⇒ group online", not "group is always online".
- The fix MUST NOT regress other group-routing behaviour: relay-power aggregation, primary-child mirroring of `relays[0].state` and other non-aggregate paths, `representsGroups`-based mirroring all stay intact.

**Non-Goals:**
- Inheriting `state` / `type` / `classFqn` from anything other than the first child. That display contract is unchanged.
- Changing `lastTimeSetup` semantics. The existing first-child inherit for `lastTimeSetup` stays as-is — it's not a staleness signal that drives `addOnOffStateTo`.
- Changing the staleness gate threshold (2 min for non-battery, 24 h for battery). Out of scope.
- Reworking how the backend emits `representsGroups` for heartbeats. The fix is purely client-side.
- Adding a new spec capability — this fits as a delta inside `floorplan-live-updates`.

## Decisions

### D1: Initial REST resolve uses MAX of children's `lastTimeOnline`

Replace the `break`-after-first-child loop with one that iterates all children, captures the first child's `state` / `type` / `classFqn` / `lastTimeSetup` (display-uniformity), and computes `Math.max` (or string-max for ISO timestamps) of all children's `lastTimeOnline`.

```js
for (const appliance of appliances) {
  if ((appliance.type === 'GROUP_PARALLEL' || appliance.type === 'GROUP_SERIAL') && appliance.config && appliance.config.applianceIds) {
    let freshestLastTimeOnline = null
    let firstChildResolved = false
    for (const id of appliance.config.applianceIds) {
      const subApp = await appliancesService.getById(id)
      overmindUtils.parseState(subApp)
      overmindUtils.parseConfig(subApp)
      if (!firstChildResolved) {
        appliance.lastTimeSetup = subApp.lastTimeSetup
        appliance.state = subApp.state
        appliance.type = subApp.type
        appliance.classFqn = subApp.classFqn
        firstChildResolved = true
      }
      if (subApp.lastTimeOnline && (!freshestLastTimeOnline || subApp.lastTimeOnline > freshestLastTimeOnline)) {
        freshestLastTimeOnline = subApp.lastTimeOnline
      }
    }
    appliance.lastTimeOnline = freshestLastTimeOnline
  }
}
```

ISO-8601 timestamps without a 'Z' suffix (the backend's format, per the project memory) compare correctly as strings — lexicographic order matches chronological order for fixed-width ISO strings. No `new Date()` parsing needed for the comparison.

**Alternatives considered:**
- *Inherit `lastTimeOnline` from the first child only, and rely on SSE to fix it within seconds.* Current behaviour. Causes the red flash. Not a fix.
- *Use the average of children's `lastTimeOnline`.* Doesn't make sense — staleness is binary; "average online" isn't a meaningful concept.
- *Use the minimum (oldest) child timestamp.* Would make the group flip to error if any child is stale, even if others are online. Wrong semantic.

### D2: SSE mirror for `lastTimeOnline` uses `anyChildToGroupIds` with newer-wins

Inside the transport-update callback (`Floorplan.vue:998-1003`), branch on `triple.path === 'lastTimeOnline'` and route via `anyChildToGroupIds` instead of `primaryChildToGroupIds`. The mirror MUST only advance the group's `lastTimeOnline` if the incoming timestamp is greater than the current — preventing a stale heartbeat from a less-recent child from clobbering a freshly-recorded value.

```js
} else if (triple.path === 'lastTimeOnline') {
  const groups = anyChildToGroupIds.get(triple.applianceId)
  if (groups) {
    for (const gid of groups) {
      const groupApp = this.appMap.get(gid)
      if (groupApp && (!groupApp.lastTimeOnline || triple.value > groupApp.lastTimeOnline)) {
        writePath(groupApp, triple.path, triple.value, gid)
      }
    }
  }
} else {
  // Non-aggregate paths (other than lastTimeOnline) mirror from the primary
  // child only — this preserves the display-uniformity contract for
  // state.relays[0].state and similar fields.
  const groups = primaryChildToGroupIds.get(triple.applianceId)
  if (groups) {
    for (const gid of groups) {
      writePath(this.appMap.get(gid), triple.path, triple.value, gid)
    }
  }
}
```

`anyChildToGroupIds` is already populated in the existing mounted block (`Floorplan.vue:911-916`) — no new bookkeeping needed.

**Alternatives considered:**
- *Mirror `lastTimeOnline` to groups for every child, no newer-wins guard.* Would let an out-of-order heartbeat from an older recording regress the group's value. Cheap to guard against; worth the line.
- *Apply newer-wins to all non-aggregate paths.* Wrong: `state.relays[0].state` doesn't have a "newer" semantic — the primary child's state is canonical for the group's display by design. Newer-wins is specific to timestamp-style fields.
- *Move the `lastTimeOnline` newer-wins check into `writePath` itself.* Overgeneralises: `writePath` is also called for the primary appliance directly (where it should always advance). Keeping the guard in the group-mirror branch keeps the contract precise.

### D3: `lastTimeOnline` SSE writes never regress to a falsy value

`Floorplan.vue` `writePath` (lines 936-939) currently sets `targetApp.lastTimeOnline` unconditionally when `path === 'lastTimeOnline'`. Add a `if (value)` guard so falsy incoming values (null / undefined / empty string) are ignored:

```js
if (path === 'lastTimeOnline') {
  if (value) {
    this.$set(targetApp, 'lastTimeOnline', value)
  }
  return
}
```

**Why this is needed:** the backend re-emits each appliance's stored `lastTimeOnline` on the initial transport-update batch after SSE registration. Group rows (`GROUP_PARALLEL` / `GROUP_SERIAL`) typically have NULL stored `lastTimeOnline` (groups are virtual aggregates — the backend doesn't maintain their row's timestamp). Without this guard, that initial NULL emission wipes the freshest-child value computed at register-time (D1) and flips the group to `'error'` for several seconds until a real child heartbeat arrives via `representsGroups` or the `anyChildToGroupIds` mirror (D2).

The guard is a strict tightening: a "real" `lastTimeOnline` (any non-empty string) still writes through. There is no defensible case for a backend-emitted null timestamp to clear a frontend-side value — the staleness gate is age-based, not null-based.

**Alternatives considered:**
- *Don't subscribe groups to `lastTimeOnline` at all.* Possible — the group's value is meant to come from children, not from its own row. But that requires a per-appliance-type branch in the SSE-selection builder (skip `'lastTimeOnline'` for groups), which leaks group semantics into the path-list helper. The `writePath` guard is a one-line fix in one place and protects against any other source of falsy regressions.
- *Special-case groups in `writePath`.* Same problem as above plus more code. The "never regress to falsy" rule is broad enough to be safely universal.

### D4: `representsGroups` path remains untouched

The existing mirror at `Floorplan.vue:971-975` (which propagates updates to groups listed in `triple.representsGroups`) is unchanged. If the backend marks a heartbeat with `representsGroups: [gid]`, that path already advances the group correctly. The new `anyChildToGroupIds` mirror is a **fallback** — it covers the case where the backend doesn't include the group in `representsGroups` (which is common for heartbeats since the backend may treat them as per-appliance only).

**Alternative considered:**
- *Remove the `representsGroups` mirror and rely entirely on `anyChildToGroupIds` for `lastTimeOnline`.* Both work; keeping `representsGroups` is defensive and matches the existing pattern for other non-power paths. Not worth the diff to remove.

## Risks / Trade-offs

- **[Risk] String comparison of ISO timestamps assumes the backend always uses fixed-width ISO format.**
  → Mitigation: matches the existing project convention (per memory). If a future backend ever emits a non-ISO timestamp, this would break — but so would every other timestamp comparison in the codebase. Out of scope to harden.

- **[Risk] An offline non-primary child sending a delayed-but-still-newer-than-current heartbeat could unstale a group whose primary child is genuinely offline.**
  → Acceptable: the spec says "any child online ⇒ group online". If the non-primary child is in fact reaching the backend, the group IS online — its display might still be wrong (since `state` is mirrored from the primary), but that's a separate display-vs-staleness concern, not a regression.

- **[Risk] More SSE writes per heartbeat (one per group containing the source child).**
  → Acceptable: trivial cost. Each heartbeat is a few bytes; mirroring to N groups is N writes of the same value. The newer-wins guard short-circuits writes that don't change anything.

- **[Trade-off] The SSE callback's branching logic gains one more case (path === 'lastTimeOnline').**
  → Acceptable: single conditional, clearly commented. The `lastTimeOnline` field is special (appliance-level, not under `state`) and already gets its own branch in `writePath` (`Floorplan.vue:936-939`). One more spot of special-casing is consistent.

## Migration Plan

Single PR. No persistent state, no migrations, no backend changes. Rollback by reverting the PR.

## Open Questions

- Whether to also apply newer-wins semantics to `lastTimeSetup`. Currently inherited from the first child only at REST resolve, and that field doesn't appear in any SSE flow in `Floorplan.vue`. Skipping for now; revisit if a real use case appears.
- Whether to log when the freshest-child rule rejects an out-of-order heartbeat (under `DEBUG_TRANSPORTS`). Trivial follow-up; not in scope here.
