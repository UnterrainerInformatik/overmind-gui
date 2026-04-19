## Context

The Floorplan (`src/components/floorplan/Floorplan.vue`) is the primary live control surface on tablet, mobile, and PC (including Kiosk mode). It fetches the full appliance list once at mount via REST, then subscribes to a single SSE transport that carries `(applianceId, path, value)` triples for all appliance paths it cares about. The consumer-side application of those triples is the scope of this change.

### Current click → state → render flow

1. **Initial load** (`getAppliances`, Floorplan.vue:487–560):
   - REST `/appliances` response → each element's `state` and `config` are JSON-parsed into plain objects.
   - Groups (`GROUP_PARALLEL`, `GROUP_SERIAL`) inherit the **primary child's** `state`/`type`/`classFqn` by reference.
   - `this.appliances = appliances` (line 517) — Vue 2 walks the array and deeply wraps each appliance's own enumerable properties with reactive getters/setters, **including already-present nested paths like `state.relays[0].state` and `state.relays[0].power`**.
   - `appMap.backingMap.set(id, element)` puts the same reactive refs into the observable map, then `appMap.swap()` promotes the backing buffer.

2. **Subscribe** (`mounted`, Floorplan.vue:628–727):
   - Builds `perAppliance = [{applianceId, paths}]` using `pathsForApplianceType(type, 'compact')` — e.g. `['relays[*].power', 'relays[0].state']` for PLUG/RELAY/DIMMER/BULB_RGB.
   - Builds `primaryChildToGroupIds`, `anyChildToGroupIds`, `groupChildPower` for group routing.
   - `SseClient.registerTransport({minInterval: 1000, selection: {perAppliance}}, callback)`.

3. **Click** (`areaClicked` → `FloorplanDialogFactory.defaultAction` → `appliancesService.turnOn/turnOff`):
   - Pure REST command, **no optimistic UI update**. The UI is expected to react solely to the subsequent SSE transport-update.

4. **Live update** (transport-update callback, Floorplan.vue:681–727):
   - For each triple: `writePath(appMap.get(triple.applianceId), triple.path, triple.value)` mutates `app.state.<path>` in place via `setPathValue` (`overmindUtils.ts:44–73`), which uses `Vue.set` at every hop.
   - Group routing: mirror primary-child non-power paths; aggregate (sum) power across group children.
   - `appMap.changed()` increments the `ObservableMap.changeTracker` (a counter Vue tracks via the `binding()` read inside `get()`), which forces every template expression that went through `appMap.get(...)` to re-evaluate.
   - `redraw(false)` re-renders the canvas by re-computing `onOffState` for every area and repainting.

### Reported symptoms (bug surface)

- **Initial render**: correct for all plain appliances.
- **First click** in a session: the clicked appliance's on/off icon flips, but its power reading remains `0`.
- **Subsequent clicks** on any plain appliance: no UI change at all, even though backend relays do switch.
- **Groups**: unaffected, as far as the user has observed.

### Prior-art change that bracketed this

The new transport-update flow landed in commit `52fcfd8` (replacing an earlier `subscribe(ids, cb)` model in which the backend pushed whole updated appliance objects and the client called `appMap.map.set(app.id, app)` — effectively bypassing deep reactivity). Commit `877e6dd` (today, `2026-04-19`) added the group-routing branch to the new flow but left the plain-appliance branch at its line `686` write. Both commits sit on `develop` (current branch).

### Confirmed scope (post-initial-triage)

The user has independently confirmed:
- The server is correct (tests green on the emitting side).
- **The same `setPathValue` pattern works correctly in `src/views/Appliances.vue`** (and elsewhere), whose transport-update callback does exactly `setPathValue(app.state, triple.path, triple.value)` against appliances held in a plain `Map` that mirrors a reactive `this.appliances` array.
- In the Floorplan, the **first** transport-update following a click IS applied correctly; it is the **second and later** updates that fail to reach the UI.

This eliminates the backend-payload hypothesis (D3) and the reconnect-re-registration hypothesis; the bug is localized to what differs between `Floorplan.vue` and the working `Appliances.vue` consumer. The diffing surface is small:

| Concern | `Appliances.vue` (works) | `Floorplan.vue` (broken) |
| --- | --- | --- |
| Storage | plain `Map` (`applianceIndex`), references mirror `this.appliances` | `DoubleBufferedObservableMap` (`appMap`) |
| Template reactivity hook | `v-for="item in appliances"` — direct array iteration | `appMap.get(area.appId)` — goes through `ObservableMap.binding()` → `changeTracker` |
| Per-update side effects | none | `appMap.changed()` + `redraw(false)` (imperative canvas paint + `addOnOffStateTo` mutation of `onOffState`) |
| Group routing | none | primary-child mirror + power aggregation |
| Transport cadence | `minInterval: 3000` | `minInterval: 1000` |

## Goals / Non-Goals

**Goals:**
- Guarantee that every SSE transport-update for a plain (non-group) appliance is reflected in the Floorplan UI — both `relays[*].state` (on/off icon, color) and `relays[*].power` (watts readout) — on every click, not just the first.
- Keep the per-click latency within the SSE `minInterval` budget (currently `1000ms`); no additional round-trips.
- Preserve the existing group-routing behavior (primary-child mirroring, power aggregation).
- Land narrow fix(es) with enough diagnostic instrumentation baked into the change that a recurrence is easy to pinpoint.

**Non-Goals:**
- Reintroducing an optimistic UI update on click. The SSE-driven model is intentional; adding optimism would reintroduce the old race conditions we just migrated away from (see `fix-dimmer-slider-feedback-loop`).
- Reworking group routing. Groups are reported as working.
- Reworking the SSE client (`sseClient.ts`). Its contract (deliver triples to the registered callback) appears intact; the bug is at the consumer.
- Reworking `DoubleBufferedObservableMap` / `ObservableMap`. The manual `changeTracker` reactivity hack is load-bearing and out of scope.
- Changing backend payload shape or the transport registration API.

## Decisions

### D1. Investigation-first, then narrow fix

**Decision:** Gate the code change on a confirmed root cause. Add temporary structured logging (one `console.debug` line per transport-update batch: `transportId`, triple count, first two triples, matched-app flag) plus one-time logging per appliance of the `state` shape as observed in `writePath`. Reproduce the bug, collect logs, then implement the fix whose hypothesis the logs support.

**Why over alternative:** The symptoms are unusual (first-click half-works, others don't work at all). Guessing invites a "fix" that silently addresses the wrong hypothesis and leaves the real bug latent. A 15-minute instrumentation pass is cheap compared to a second round of user-reported regressions.

**Alternative considered:** Ship a shotgun fix (re-assign `app.state` via `Vue.set` on every update + `this.$forceUpdate()` at the end of each batch). Rejected because (a) it papers over a misunderstood bug, (b) `$forceUpdate` masks future reactivity bugs, and (c) re-assigning `state` would break the group/primary-child shared-reference relationship established at line 509.

### D2. Leading hypothesis: the `changeTracker`-driven re-render fires only once reliably, then stops being observed

**Hypothesis.** `ObservableMap.changed()` does `this.changeTracker++`, a setter-write on a reactive number property on `appMap.map`. The template's render function subscribes to that dep via `appMap.get(...)` → `ObservableMap.get()` → `this.binding()`. The first post-mount `changed()` fires the dep and re-renders. During that re-render the template re-evaluates `appMap.get(...)` and, because `ObservableMap.binding()` is a method call (not a getter), **there is a window between (a) the Vue watcher being marked for re-run and (b) the watcher actually collecting fresh deps where repeated writes can coalesce — and worse, if the Vue-2 scheduler's batched flush runs the watcher between `writePath` (state write) and `appMap.changed()` (tracker write), the tracker bump lands *without* a subscriber and the second render is never triggered.**

In plain English: two reactive writes per update (nested-state + `changeTracker`) contend in Vue 2's batched scheduler; only the first cycle wins, and on subsequent cycles the tracker dep is effectively dormant while deep-state writes are suppressed by Vue's value-equality short-circuit (setting `state` to `'on'` when it's already `'on'` because of canvas-redraw stale echo, etc.).

**What makes this plausible:**
- The reference implementation (`Appliances.vue`) works with the *same* `setPathValue` using a **plain** `Map`. It has no `changed()`, no `redraw()`, and its template subscribes directly via `v-for="item in appliances"`. That single architectural difference is where the bug lives.
- "First update works, later updates don't" is a classic symptom of a manual reactivity hook whose dep-subscription lifetime doesn't match the writes.
- Power specifically staying at `0` on the first click is consistent with the `displayWatts` / `getPowerOf` template expression re-running once, then being stuck on `0` because `power` was `undefined` at initial render and Vue's subsequent reactive path didn't re-register the dep for the newly-Vue.set-ed property.

**Candidate fix A (minimally invasive, Floorplan-local).** Stop relying on `ObservableMap.changeTracker` in the Floorplan. Keep the `DoubleBufferedObservableMap` for the double-buffered `swap()` at load, but in the transport-update callback **also mutate a plain reactive counter on the component** (`this.updateSeq++`), and make the template expressions that matter depend on it via a computed (`computed.appFor(id) { this.updateSeq; return this.appMap.get(id) }`). This forces a clean Vue-native dep on a property the template actually subscribes to, bypassing the ObservableMap's manual dep.

**Candidate fix B (align with working pattern).** Mirror `Appliances.vue`: hold the appliances in a reactive array (`this.appliances`), use a plain `Map` for O(1) lookup, and iterate/lookup from those in the template. Keep DBOM only for the one place that needs atomic swap (`getAppliances`). This is a larger but more principled refactor.

**Candidate fix C (one-liner safety net).** Add `await this.$nextTick()` before `this.redraw(false)`, and call `this.$forceUpdate()` inside the callback. This is the "turn the key harder" option — ugly, but useful as a diagnostic to confirm D2: if forceUpdate makes the bug go away, the mechanism is a missed reactive dep, not a missing write.

**What will falsify D2:** instrumented logging (see D1) shows `writePath` IS called with the correct `(applianceId, path, value)` for every post-first update AND the written value on `app.state.relays[0].power`/`state` is correct when inspected from `$refs` / DevTools, but the rendered DOM still shows the stale value. If the write isn't happening, D2 is wrong and we look upstream (but the user's evidence rules that out). If the write IS happening and DOM shows it, we have no bug — rules out the scenario.

### D3. Secondary hypothesis: `addOnOffStateTo` + imperative `onOffState` assignment interferes

`redraw` calls `addOnOffStateTo(item, area.index)` which does `item.onOffState = 'on'|'off'|'error'` via plain assignment. On the first call for each item, `onOffState` is a new property and Vue 2 does **not** auto-reactivate new properties added after `defineReactive`. Subsequent assignments land non-reactively. The template reads `app.onOffState` via `isOn`/`getColor`, but because those reads happen inside a render triggered by `changeTracker`, they see the synchronously-assigned (non-reactive) value just fine — *until* the `changeTracker` dep stops firing (D2), at which point no re-render occurs and the non-reactive `onOffState` is invisible.

So D3 is not an independent root cause but an **amplifier** of D2: fixing D2 also fixes the visible effect of D3. A defense-in-depth change is to replace `item.onOffState = x` with `Vue.set(item, 'onOffState', x)` (or better, make `onOffState` a computed on the template side), ensuring reactivity regardless of D2's fate.

### D4. Tertiary hypothesis (kept, now de-prioritized): callback-closure staleness on re-mount

`mounted` registers a callback closure. If Floorplan ever re-mounts without `beforeDestroy` firing cleanly (Vue Router navigation + keep-alive), two callbacks could be alive. Given the user reports the bug on a single session (not after navigation), this is unlikely to be the root cause but could be incidental in the repro. Covered by the same D1 instrumentation (log `sseHandle.id` on mount/unmount).

### D5. Fix scope: `Floorplan.vue`, with a very small safety change in `overmindUtils.ts`

- Primary change: candidate fix **A** (per D2) — add a component-local reactive `updateSeq` and force the template through a computed that depends on it. Removes reliance on the ObservableMap's private `changeTracker` for per-update reactivity without touching DBOM/ObservableMap.
- Secondary change: switch `addOnOffStateTo`'s `item.onOffState = x` to `Vue.set(item, 'onOffState', x)` (per D3). Small, defensive, covers any future consumer.
- Explicitly **not** changing: `DoubleBufferedObservableMap`, `ObservableMap`, `sseClient.ts`, or any backend contract. If D2 proves wrong after instrumentation, we re-scope.

### D6. Specs live under a new `floorplan-live-updates` capability

**Decision:** Create `openspec/specs/floorplan-live-updates/spec.md` rather than amend `sse-transport-client`. The transport client's contract is "deliver triples to registered callback"; how the Floorplan binds those triples into the reactive appliance state is orthogonal and currently undocumented.

**Alternative considered:** Adding scenarios to `sse-transport-client`. Rejected because the transport client is appliance-agnostic — it shouldn't know about `relays[*].power` semantics, group routing, or Vue reactivity.

## Risks / Trade-offs

- **[Risk]** The leading hypothesis (D2) is wrong, and we ship an instrumentation-only first pass that doesn't fix the bug. → **Mitigation:** D1 scopes the PR to *land instrumentation in a dev build*, reproduce locally, and ship the actual fix in a second commit before merging. A single PR carries both.
- **[Risk]** Instrumentation logs become permanent noise. → **Mitigation:** gate logs behind a `console.debug` call + a module-local `DEBUG_TRANSPORTS` constant set to `false` by default; leave it in the codebase so future recurrences need only a one-line flip to diagnose.
- **[Risk]** The fix involves a `$nextTick` + `redraw` reordering that changes the visual cadence (e.g., a one-frame delay between SSE arrival and canvas repaint). → **Mitigation:** canvas redraw already runs on every RAF-like cadence driven by `minInterval: 1000ms`; one extra microtask is invisible to users.
- **[Risk]** Root cause is in the backend (D3) but we still need to render gracefully in the meantime. → **Mitigation:** unchanged — if no update arrives, current UI is a zero-reading, which is what the user already sees.
- **[Trade-off]** Keeping the `DoubleBufferedObservableMap` manual-reactivity hack rather than migrating to a Vue.observable / Pinia store. That's a larger refactor with its own risk; deferred.

## Migration Plan

No user migration. Rollout:
1. Land the change on `develop`.
2. Verify on the dev floorplan with a Shelly PLUG and a Shelly DIMMER: click each, confirm on/off icon and power reading both update on every click.
3. Merge `develop` → `master` following the usual cadence.

Rollback: revert the PR; the previous commit (`877e6dd`) will be restored and the bug will re-appear but nothing worse.

## Open Questions

- **OQ1.** (Confirm by reproduction + DevTools.) With D1 instrumentation live, is the **write** definitely happening on the second update (`app.state.relays[0].state` reflects the new value in Vue DevTools) while the **DOM** still shows the old value? A "yes" confirms D2 (missed reactive dep); a "no" means the write itself is lost.
- **OQ2.** Is `addOnOffStateTo` (in `redraw`) ever called between a `writePath` write and the template's re-render in a way that assigns a *stale* `onOffState` (e.g., because `state.relays[0].state` hasn't been flushed yet)? Answer by logging `(applianceId, relays[0].state, onOffState)` inside `addOnOffStateTo`.
- **OQ3.** Does Candidate Fix A (component-local `updateSeq`) alone resolve the bug, or is the secondary D3 change (`Vue.set(item, 'onOffState', x)`) also needed in practice? Test A first; only add the D3 change if the first candidate doesn't fully resolve power-reading updates.
- **OQ4.** Is there any case where two Floorplan instances are alive simultaneously (tab switch, keep-alive)? If so, D4 needs to be treated as first-class. Unlikely per user but cheap to check with one `console.debug` in `mounted`/`beforeDestroy`.
