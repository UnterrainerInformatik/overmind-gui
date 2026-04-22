## Context

`KioskPowerPanel.vue` registers a per-detail-open SSE transport with `selection.perAppliance` derived from the clicked cell's `d.appliances` (see `openspec/specs/kiosk-energy-panel-details/spec.md`, Requirement *"Detail SSE transport selection is built from the clicked cell"*). On each `transport-update`, the current `onDetailUpdate` implementation rebuilds a fresh `sums` `Map` from `payload.values` alone, then projects through `cell.d.appliances` to produce the rendered list.

That works only if each `transport-update` is a full snapshot of every `(applianceId, path)` in the registered selection. In practice, the `sse-transport-client` delivers `values` payloads that can carry only a subset of the selected paths on a given tick — the subset whose server-side values changed relative to the server's own last-emitted value for this transport. The first update after `registerTransport` carries a fuller set (effectively a snapshot because the server has no prior emission for this transport), but subsequent updates inside the same open are delta-shaped.

The rebuild-from-scratch logic turns that delta shape into a bug: an appliance whose paths are not in the latest `values` array lands at `powerRaw = 0`, fails the idle filter `|powerRaw| > 1 W`, and is dropped from the rendered list. The reporter observes this as "the appropriate appliances initially pop up, but vanish after a second and only one stays there" — the one that keeps appearing in the delta (typically the largest, most-dynamic draw in the group, e.g. a stove element cycling).

Adjacent context:

- The race/epoch fix from `bug-energy-panel-details` (archived 2026-04-21) already gates `onDetailUpdate` so it only runs for the current open (`epoch === this.detailEpoch`); that machinery is unaffected by this change and must continue to hold.
- `SseClient` exposes a shared `pathCache` populated by *every* `values` payload across every transport. It is keyed `${applianceId}:${path}` and is used by `getLatestPath` for out-of-band reads (e.g. dimmer initial values). Using it from the detail panel is tempting but cross-couples the panel to state written by unrelated transports and makes it impossible to reset state on detail-open; see Decisions below.
- The front-face aggregate transports (`registerCellPower`, `registerCellBattery`) use `aggregate: { op: 'sum' }`. Their payload is a single aggregate value, not a multi-path `values` array, so the delta-omission problem does not arise there and is out of scope.

## Goals / Non-Goals

**Goals:**

- An appliance that is rendered at some point during a detail open SHALL remain rendered (with its latest known `powerRaw`) across subsequent `transport-update` events that omit its paths, as long as its accumulated `powerRaw` still passes `|powerRaw| > 1 W`.
- A delta `transport-update` SHALL update only the `(applianceId, path)` entries it carries. Entries it does not carry SHALL be left at their previously-seen value.
- State used to achieve the above SHALL be scoped to a single detail open: initialized empty on open, cleared on close, cleared on destruction, and invalidated alongside `detailEpoch` when the open is superseded.
- All other locked-in behavior from `kiosk-energy-panel-details` is preserved: group-only projection through `cell.d.appliances`, the ±1 W idle filter, descending `powerRaw` sort, 12-row cap, name-fallback-to-id, epoch-based supersession gating, empty-selection skip, close/destroy cleanup.

**Non-Goals:**

- Not changing the `sse-transport-client` API, its payload shape, its selection shape, or its dispatch contract. Neither full-snapshot mode nor a "resend all" server flag is introduced.
- Not changing `KioskPowerPanel`'s prop shape, the `KioskOverview.vue` data passed in, or any other component's contract.
- Not redesigning the flip/detail UX (still one detail view at a time, still driven by the most recent click, still a 12-row cap, still a ±1 W idle filter).
- Not touching the aggregate front-face transports.
- Not using `SseClient.getLatestPath` / `SseClient.pathCache` to power the fix — see Decision 3.
- Not adding a per-path staleness timeout ("drop a path's last-known value if no update in N seconds"). The open is bounded by the user's own close/navigate; stale-within-open risk is accepted and documented under Risks.

## Decisions

### Decision 1: Root cause is delta payloads interpreted as full snapshots

`onDetailUpdate` builds the display list by summing `payload.values` per `applianceId`, then reading that sum via `sums.get(a.id) || 0` for each appliance in `cell.d.appliances`. This treats each `transport-update` as if it carried every selected `(applianceId, path)`. The `sse-transport-client` does not guarantee that; subsequent updates within the same transport can and do carry only the paths that moved. Any appliance whose paths are all unchanged since the prior tick falls to `0` and is filtered out by the idle threshold.

**Alternatives considered:**

- *First-update-only behavior*: rule out that only the first update matters and subsequent updates should be ignored — no; the whole point of the live panel is that `powerRaw` continues to reflect current draw.
- *Server-side snapshot mode*: ask the backend to always emit full payloads for this transport — deferred; the client is where the fix is cheapest and avoids protocol churn that would regress bandwidth for other consumers.

### Decision 2: Introduce a per-open `Map<string, number>` keyed by `${applianceId}:${path}`

Add a single new component field, `detailPathValues: Map<string, number>`, that holds the latest-known numeric value per selected path for the current detail open. `onDetailUpdate` writes each incoming `triple` into the map (NaN/non-numeric normalized to 0 on write), then recomputes the rendered list by iterating `cell.d.appliances` and, for each appliance, summing the map entries for the paths that were computed by `buildPerAppliance(cell.d.appliances)` for this open.

Storing this requires persisting the `perAppliance` selection (or an equivalent `Map<applianceId, string[]>` of paths) for the lifetime of the open, since `cell.d.appliances` alone does not encode the `a.indexes` → `relays[i].power` expansion at the display site. The simplest option is a second field, `detailPaths: Map<number, string[]>`, populated in `openDetailTransport` after `buildPerAppliance` and read in `onDetailUpdate`.

Why this shape:

- Keying by `${applianceId}:${path}` exactly matches `SseClient.pathCache`'s key shape, so we can debug by comparison and can later migrate to or from the shared cache cheaply.
- Summing per-appliance on each update (vs. also caching per-appliance sums and patching them) keeps the computation self-evidently correct: each render recomputes from the authoritative per-path cache. At 12-row cap and typical cell sizes (≤ ~25 appliances × ≤ ~3 paths), this is negligible work.
- The map is component-local, scoped to the open, and cleared aggressively (see Decision 4). It cannot leak into a future open.

**Alternatives considered:**

- *Per-appliance cache only (Map<applianceId, number>)*: simpler, but an appliance with multiple paths would merge all its paths into one number. An update that carries only one of that appliance's paths cannot correctly replace just that path's contribution — it would either double-count or wipe unrelated paths. Per-path keying avoids the ambiguity.
- *Patch `this.detailApps` in place*: mutate only the entries in `detailApps` that were in the latest update and leave the rest alone. Rejected — the idle filter and 12-row cap mean the list is not a stable index into all appliances; an appliance that crosses the threshold or leaves the top-12 has to be added/removed, and that bookkeeping is harder than just recomputing from the cache.
- *Hybrid with a debounce*: ignore "missing" values for a short window and only drop after N seconds. Rejected — delta semantics is the actual signal we want to honor; a timer adds a new failure mode (late-drop flicker) for no gain.

### Decision 3: Do not use `SseClient.pathCache` / `getLatestPath`

`SseClient.pathCache` is a tempting fallback because it already tracks the latest value for every `(applianceId, path)` ever delivered on any transport. Using it would remove the need for the new field.

Rejected, because:

- Cross-transport coupling: the pathCache is populated by unrelated transports (e.g. floorplan-live-updates). The detail panel would display values computed partly from transports whose selection it does not control, and staleness would depend on whether any other transport happens to include the same paths.
- No reset semantics: `pathCache` is process-lifetime and shared. We cannot clear it on close/destroy without affecting other consumers. The whole point of scoping to a single open is that reopening a cell gets a fresh accounting, not a possibly-stale read from whatever last happened to flow through.
- Reasoning isolation: a bug in the panel should be diagnosable from panel state alone. A shared global cache muddies that.

### Decision 4: Clear the new cache on close, on destroy, and when an open is superseded

Symmetric with `detailApps`:

- `closeDetailTransport()` empties `detailPathValues` (and `detailPaths`) immediately after bumping `detailEpoch`. A reopen starts with a fresh accounting.
- `beforeDestroy()` empties both as part of its existing cleanup so a late `await` resolve (which will in any case be blocked by the epoch mismatch) has nothing stale to interact with even if a future bug regresses the epoch guard.
- When a superseded open's `registerTransport` promise resolves, the post-await epoch guard already returns early after unregistering — it does not touch `detailPathValues`, and `closeDetailTransport` (called by the newer open) has already cleared it. No additional write path needed.

This keeps the invariant tight: `detailPathValues` is non-empty only between the start of a non-superseded `openDetailTransport` and the matching `closeDetailTransport` / `beforeDestroy`.

### Decision 5: NaN/non-numeric values write as 0; truly-unseen paths contribute 0

- On write into `detailPathValues`, coerce `triple.value` via `Number.parseFloat` when it is not already a number; NaN normalizes to 0. This matches today's behavior in `onDetailUpdate`.
- When summing for the display list, a path absent from `detailPathValues` contributes 0. This preserves the existing "Appliance with no delivered values" semantics *across the open as a whole* — an appliance whose paths have never been delivered in this open still has `powerRaw = 0` and is filtered out.

## Risks / Trade-offs

- **Stale-within-open values shown for appliances that stopped drawing power** → the delta protocol does not distinguish "unchanged" from "went quiet", so an appliance that actually went to 0 but for which the server does not resend a 0 will remain visible at its last non-zero value for the rest of the open. Mitigation: accepted as preferable to the current behavior (disappearing the row); if it proves misleading in practice, a follow-up can subscribe to a server-side "everything resent every N seconds" knob once the transport client exposes one.
- **Memory bounded but not trivial** → `detailPathValues` sizes as `Σ over appliances (paths per appliance)` for the clicked cell; for the largest observed cell (~25 appliances × ~3 paths) that's ~75 entries, cleared on close. Negligible.
- **Cache and epoch can get out of sync if a future edit clears one without the other** → Decision 4's symmetry places cache clears next to the epoch bump and `detailApps = []` lines in `closeDetailTransport` and `beforeDestroy`. Spec scenarios lock this in so a future regression is caught in review.
- **Appliance removed from the cell mid-open** → `cell.d.appliances` is a readonly prop built from a literal in `KioskOverview.vue` and does not mutate during an open, so this cannot occur. If it ever starts to, `detailPathValues` would hold orphan entries (for paths no longer referenced by any appliance) — harmless, since they're only read when an appliance iterates its own paths.
- **Does not fix a hypothetical server-side bug where a transport returns values for unrequested paths** → accepted; `onDetailUpdate` still re-projects through `cell.d.appliances`, so such values are never summed into any rendered appliance. Untracked paths are simply not read.

## Migration Plan

Client-only change. No data migration, no feature flag, no rollout gate. Rollback is reverting the commit. Behavior outside the detail view is unchanged (front-face aggregate transports, group membership, SSE connection management all untouched).
