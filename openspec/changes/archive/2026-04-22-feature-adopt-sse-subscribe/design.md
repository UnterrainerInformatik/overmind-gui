## Context

After `feature-sse-reactive-subscriptions`, `SseClient` has two public surfaces: the callback-shaped `registerTransport(spec, cb)` and the reactive-shaped `subscribe(spec)`. Only `KioskPowerPanel`'s detail transport uses the latter; the rest of the codebase (10 call sites across 8 files) still calls `registerTransport`. A complete audit of those call sites shows:

- **7 values-shaped consumers doing trivial copy-to-state** — `Appliances.vue` (one multi-appliance subscription for compact tiles) and six floorplan detail dialogs (one single-appliance subscription each, all using wildcard paths `'**'`). Each callback iterates `payload.values` and calls `setPathValue(app.state, path, value)` for every triple. No custom computation; no side-effects beyond state mutation.
- **2 aggregate-shaped consumers with arithmetic** — `KioskPowerPanel`'s `registerCellPower` and `registerCellBattery`. Each callback reads `payload.aggregate`, derives `power` via `overmindUtils.formatPower(value)` and `percent` via `value / max` with a sign-based max switch, and writes those into the per-cell data object.
- **1 values-shaped consumer with complex callback logic** — `Floorplan.vue`. Its callback does group-appliance routing (mirror a representative child's values into the group), relay-power aggregation across group children, non-power-path mirroring from the primary child, and bumps an `updateSeq` that re-triggers the canvas renderer via a Vue watcher.
- **1 connection-status reader** — `App.vue` polls `sseClient.connected` every 2 s. Not a transport consumer.

The first two buckets map cleanly onto the subscription model and are migrated here. The wildcard dialogs require a small extension to `subscribe()`. The third bucket (Floorplan) is excluded (see Non-Goals). The fourth bucket is irrelevant to this change.

## Goals / Non-Goals

**Goals:**

- Migrate every consumer that maps cleanly onto `Subscription` from `registerTransport` to `subscribe()`, producing a net reduction in boilerplate (handle tracking, await-in-mounted, explicit unregister, per-payload iteration).
- Extend `subscribe()` to accept selections whose `paths` contain the `'**'` wildcard: no pre-declaration for that appliance's keys; `Vue.set` on first arrival so keys become reactive. Non-wildcard selections keep their existing pre-declaration semantics.
- Preserve every migrated component's user-visible behavior: template bindings, reactivity timing, lifecycle on mount/destroy, values after reconnect.
- Keep the wildcard change in `subscribe()` strictly additive — non-wildcard selections behave exactly as today.

**Non-Goals:**

- Not migrating the six floorplan detail dialogs (`FloorplanBulbDialog`, `ContactDialog`, `DimmerDialog`, `HTDialog`, `MotionDialog`, `PlugDialog`). During implementation we confirmed every dialog's callback branches on `triple.representsGroups`: the server sends group-routed triples where `triple.applianceId` is a group and `triple.representsGroups` enumerates member ids whose state should mirror the value. The current `Subscription` dispatch keys by `triple.applianceId` only, so group-routed triples land under the group's key, not any member's — a watcher that filters by `id === app.id` would lose those updates. Migrating these consumers requires a `Subscription`-shape extension (either: on dispatch, also write the value under each `${representedId}:${path}` key; or: expose a raw per-payload triples accessor for consumers that need the metadata). That is a distinct design question and is deferred to a separate follow-up change.
- Not migrating `Floorplan.vue` — its callback is not a "write latest values to a shared object" loop. Migrating it would require restructuring its group-routing, relay-aggregation, and canvas-redraw triggering around a reactive model. That is a real refactor, deserves its own change, and is out of scope here. Note: Floorplan's use of `representsGroups` is part of the same family of issues as the dialogs and should be considered alongside the dialog-migration follow-up.
- Not migrating `App.vue` — it reads `sseClient.connected` out-of-band. The migration of `sse-connection-indicator` to use any reactive status field is orthogonal.
- Not changing any component's template bindings or Vuex store shape. Template-side cleanups ("read directly from `sub.values` instead of mirroring into `app.state`") are deferred; this change keeps the `app.state` mirror and simply updates how it's populated.
- Not changing any server-side contract. Wildcard path handling on the client interprets `'**'` exactly as the server already does (send every path); the server contract is unchanged.
- Not removing or deprecating `registerTransport`. Both APIs remain first-class. This change just reduces the number of callers of the callback shape.

## Decisions

### Decision 1: Wildcard detection is a string-equality check against `'**'`

Inside `flatKeysForSelection` and `buildSubscriptionShell`, for each `(applianceId, paths)` entry, we check `path === '**'` and skip pre-declaration for that specific path. If every path for an entry is wildcard, that entry contributes zero pre-declared keys. If some paths are wildcard and some are explicit, only the explicit paths are pre-declared for that entry; the wildcard's matches are added dynamically on first delivery.

Rationale:

- The existing server API treats `'**'` as a convention for "emit every path of this appliance". There's no other syntax in use in the codebase.
- `startsWith('*')` or regex-matching is tempting as a generalization, but no other pattern appears in any current caller. Widening the detection grows the contract unnecessarily; `'**'` is the literal token callers pass.
- Consumers with mixed selections (explicit paths AND `'**'`) keep the explicit keys pre-declared — `'specificPath' in sub.values` is `true` immediately — while wildcard-discovered keys appear on first delivery. No surprise.

**Alternatives considered:**

- *Prefix-match against `'*'` (accept any path containing an asterisk)*: rejected. No caller uses a single-`*` form; adding partial-wildcard semantics invents a contract.
- *A separate `dynamic: true` flag on the spec*: rejected. Adds API surface for zero callers; the information is already in `paths`.

### Decision 2: Write via `Vue.set(sub.values, key, number)`, always

`dispatchToSubscription` currently writes via `sub.values[key] = number`. For pre-declared keys, that's fine because the reactive getter/setter was set up at observable time. For dynamically-arriving keys (wildcard case), direct assignment would add a non-reactive property in Vue 2 — templates watching that key wouldn't re-render.

We switch to `Vue.set(sub.values, key, n)` unconditionally. For pre-declared keys, `Vue.set` is functionally equivalent to direct assignment (triggers the existing reactive setter). For dynamic keys, `Vue.set` adds a reactive property. Single code path; no type-dispatch on "is this key pre-declared".

This is the standard Vue 2 pattern for adding reactive properties to observable objects after initial observation. Migration to Vue 3 would swap `Vue.set(obj, k, v)` for `obj[k] = v` at the same site (Vue 3's `reactive` supports dynamic keys natively); the one-site swap matches the existing Vue 2/3 migration story.

### Decision 3: `close()` iterates the actual key set on `sub.values`

Current `armCloseForSubscription` sets every pre-declared key to `undefined` using `record.allKeys`. With dynamic keys now possible, that list is incomplete — keys added after subscribe are NOT in `allKeys`. If close only clears `allKeys`, dynamically-added keys would retain their last values on a closed subscription.

Fix: iterate `Object.keys(sub.values)` and set each to `undefined`. Covers both pre-declared and dynamic keys. The dynamic keys remain in the object (with `undefined` value), consistent with the pre-declared behavior.

Closed subscriptions are terminal and single-use — consumers should not re-subscribe the same object. Leaving undefined placeholders on a closed sub is a harmless memory artifact, not a correctness concern.

**Alternatives considered:**

- *`Vue.delete` for dynamic keys, `undefined` for pre-declared*: rejected. More code to track the distinction; the distinction has no observable benefit.
- *Replace the whole `values` object reference*: rejected. Would break consumer bindings that already captured `sub.values` (unlikely but possible).

### Decision 4: Consumer migration pattern — subscribe + `$watch` on payload arrival

Each migrated consumer keeps its existing local state (e.g. `app.state` in dialogs, `cell.power`/`cell.percent` in `KioskPowerPanel`) and its existing template bindings. We do not rewrite templates in this change.

What changes per consumer:

- **Values subscriptions (Appliances + 6 dialogs)**:
  - `mounted()` (or equivalent lifecycle step): `this.sub = SseClient.getInstance().subscribe(spec)`.
  - A Vue `$watch` on `sub.ts` (a simple monotonic trigger — fires once per delivered payload) iterates `sub.values` and calls the existing `setPathValue(app.state, path, value)` for each `(applianceId, path)` entry whose appliance matches. For multi-appliance subscriptions (`Appliances.vue`), we index appliances by id and dispatch to the matching one. For single-appliance subscriptions (dialogs), we filter by id equality and skip the rest.
  - `beforeDestroy()`: `this.sub.close()`. The `$watch` auto-unregisters when the component destroys.
- **Aggregate subscriptions (`KioskPowerPanel` front-face)**:
  - `registerCellPower(cell)` / `registerCellBattery(cell)` build `cell.powerSub` / `cell.batterySub` via `subscribe()`.
  - A `this.$watch` on the subscription's aggregate (via `() => cell.powerSub?.aggregate?.value` + the sampleCount) runs the existing cell-derivation logic when it fires: set `cell.sampleCount`, `cell.power`, `cell.percent`. The unwatch function is stored on the cell (`cell.unwatchPower`, `cell.unwatchBattery`) so `beforeDestroy` can stop the watcher cleanly.
  - `beforeDestroy()`: for each cell, call the stored unwatch function, then `cell.powerSub.close()` / `cell.batterySub.close()`.

Why this pattern (watcher over payload arrival) and not, say, computed properties:

- Computed properties require the derived state to be read from a reactive source owned by a Vue component instance. `cell` is a plain JS object inside a data-array, not a component. A computed on `this` that indexes into a cell is awkward to pre-compute per cell. The `$watch`-per-cell pattern is the minimum-diff way to preserve existing template bindings.
- For dialogs, a computed on the component that projects `sub.values` into `app.state` would work, but it would have to re-execute `setPathValue` for every key on every access, which is exactly what the `$watch` does on every payload. Equivalent cost; the watcher's single-fire-per-payload semantic is easier to reason about.
- For `Appliances.vue`, the same logic holds, and in addition the component indexes appliances by id — a watcher loop with a lookup once per payload is O(paths) per payload, identical to today's callback.

**Alternatives considered:**

- *Rewrite templates to read directly from `sub.values`*: rejected here, not rejected forever. It's a cleaner end state but requires touching each template and each rendering path (v-bind, v-for, computed helpers). Out of scope for a migration change; a follow-up can do this cleanup.
- *Shared mixin that implements the watcher pattern*: overkill for seven call sites with small differences. Open-coded watchers are clearer at this scale.

### Decision 5: Do not touch `Floorplan.vue`

The callback in `Floorplan.vue` does four things that do not belong in a "write latest-value to reactive object" loop:

1. Group-appliance routing — an appliance id in the payload may be a group, requiring the update to be mirrored to each child's state.
2. Power aggregation across group children — multi-child relay powers are summed for the group's displayed value.
3. Non-power-path mirroring — non-power fields from the primary child are mirrored onto the group.
4. A canvas redraw trigger via `updateSeq++`.

Migrating this to `subscribe()` would either (a) replicate all four behaviors inside a single watcher on `sub.values` — re-creating the callback shape verbatim, no simplification gained — or (b) restructure the group-routing layer to read the latest-known values from `sub.values` directly. Option (b) is a real refactor and deserves its own change where the group-routing / redraw-trigger pipeline can be designed properly. Out of scope here.

## Risks / Trade-offs

- **`$watch` on `sub.ts` fires even when the sub is freshly opened and the first payload populates many keys at once** → acceptable; a single watch-fire iterates `Object.keys(sub.values)` once, identical to today's callback cost. No perf regression.
- **`Vue.set` vs direct assignment cost for pre-declared keys** → negligible. Both go through the reactive setter; `Vue.set` adds one branch-check (`key in obj`). Not measurable against network / JSON-parse cost.
- **Dynamic keys accumulate in `sub.values` over the life of a dialog subscription** → bounded by the appliance's path set (tens at most). Not a memory concern. Cleared on `close()`.
- **Migration diff is broad (8 files)** → yes; mitigated by the mechanical, copy-paste nature of the change. Each migration follows the same pattern from Decision 4. A pre-commit browser-sanity check of each of the 7 dialogs on representative appliance types is the required verification.
- **`Floorplan.vue` continues to use `registerTransport`** → two API styles coexist in the codebase, as they already do post-`feature-sse-reactive-subscriptions`. No new inconsistency introduced; the mixture narrows from "1 new + 9 old" to "8 new + 2 old" (the 2 old being Floorplan and any future `registerTransport` caller). Acceptable.
- **Archive ordering with `feature-sse-reactive-subscriptions`** → this change's delta modifies a requirement introduced by the prior change. The prior change must be archived first so its specs sync into the main spec; otherwise this delta's MODIFIED header won't match anything. Documented in `proposal.md` Impact.

## Migration Plan

Client-only. No data migration, no feature flag. Rollback is reverting the commit; every migrated consumer's diff is independent of the others, so partial rollbacks (e.g. if one dialog's migration regresses) can be done file-by-file without touching `sseClient.ts`.

Implementation order (each step should be a logical unit, lintable and buildable on its own):

1. Extend `subscribe()` (wildcard support) in `sseClient.ts`.
2. Migrate `Appliances.vue`.
3. Migrate the 6 floorplan dialogs (order doesn't matter; they are independent).
4. Migrate `KioskPowerPanel` front-face aggregate transports.
5. Lint + build.
6. Manual verification per migrated consumer on the dev server.

Archive this change only after `feature-sse-reactive-subscriptions` is archived (so the MODIFIED requirement's target exists in the main spec).
