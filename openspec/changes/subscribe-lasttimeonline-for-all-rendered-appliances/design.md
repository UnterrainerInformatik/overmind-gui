## Context

`pathsForApplianceType` is a tiny helper in `src/utils/overmindUtils.ts:40-44`:

```ts
export function pathsForApplianceType (type: ApplianceType, usage: 'compact' | 'detail'): string[] {
  const table = usage === 'detail' ? DETAIL_PATHS : COMPACT_PATHS
  const paths = table[type]
  return paths ? paths.slice() : []
}
```

`COMPACT_PATHS` and `DETAIL_PATHS` are dictionaries keyed by appliance type (`PLUG`, `RELAY`, `RELAY_DUAL`, `DIMMER`, `BULB_RGB`, `HT`, `MOTION_SENSOR`, `CONTACT_SENSOR`, `OCCUPANCY_SENSOR`). For an appliance whose `type` is anything else — including `NULL` (the case for the Solax inverter appliance 177) — the table lookup returns `undefined`, so the function returns `[]`.

Two consumers gate on the empty array:

- `src/components/floorplan/Floorplan.vue:919-922` — inside the mounted block that builds `perAppliance` for `SseClient.registerTransport`. An empty `paths` causes `continue`, dropping the appliance from the subscription.
- `src/views/Appliances.vue:88-90` — `.map(...).filter(e => e.paths.length > 0)` for the Appliances list view's subscription.

The `floorplan-live-updates` spec already requires `lastTimeOnline` to be in the per-appliance paths for every type currently enumerated in `COMPACT_PATHS`, *because* the Floorplan's `addOnOffStateTo` paints `'error'` based on the staleness gate. The gap is appliances with a type the table doesn't enumerate — which today silently fall through this protection.

The gap shows up most visibly on the Solax inverter, but it's structural: any new vendor / device class added to the backend without a corresponding `COMPACT_PATHS` entry will render on the Floorplan, get dropped from SSE, and flip to `'error'` after the 2-minute staleness threshold. There's no signal to the developer that the bug exists; the only evidence is the user report ("the icon turns red after a while").

## Goals / Non-Goals

**Goals:**
- Every appliance the Floorplan (or Appliances list) renders SHALL receive `lastTimeOnline` keep-alive updates via SSE — regardless of whether its `type` is in the `COMPACT_PATHS` table.
- The fix MUST be a strict superset of today's behaviour for known types: PLUG, RELAY, RELAY_DUAL, DIMMER, BULB_RGB, HT, MOTION_SENSOR, CONTACT_SENSOR, OCCUPANCY_SENSOR receive their existing path lists unchanged.
- The fix MUST be transparent to callers. `Floorplan.vue` and `Appliances.vue` need no behavioural edit.
- The fix MUST keep `pathsForApplianceType`'s signature, return type, and naming.

**Non-Goals:**
- Adding type-specific `COMPACT_PATHS` entries for Solax (or any other unknown class). That's an additive optimisation worth doing later if the inverter wants its `dcPower` / `acPower` / `battery` reactively streamed; it's not needed for staleness correctness.
- Changing the staleness threshold (`2 min` for non-battery, `24h` for battery). Out of scope.
- Changing the Floorplan's transport-update writer (it already routes `lastTimeOnline` correctly).
- Touching `addOnOffStateTo`'s switch. The `'none'` fallback for unknown types stays as-is — the Solax inverter, with `type: NULL`, will continue to land on `'none'` (not `'on'`/`'off'`/`'error'`) once the staleness gate stops firing. `isError` returns false for `'none'`, so the avatar renders normally.
- Changing the `iconPos1`-as-state-key overload (`Floorplan.getColor`/`isOn`/`getPowerOf`) that lets the Solax inverter display its `dcPower` reading. That's a separate concern.

## Decisions

### D1: Fall back to `['lastTimeOnline']` for unknown compact types

Replace the empty-array fallback in `pathsForApplianceType`'s `'compact'` branch with `['lastTimeOnline']`. After this change, any appliance — whether enabled, untyped, or with a vendor-specific class — gets at minimum the staleness keep-alive when used in compact mode.

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

The `'**'` fallback for `'detail'` matches the path that every known type already maps to in `DETAIL_PATHS`. Detail-mode is broad-subscription by design, and the unknown-type case shouldn't be more conservative than the known-type case.

**Alternatives considered:**
- *Keep `pathsForApplianceType` returning `[]`; instead, make `Floorplan.vue` append `'lastTimeOnline'` when `paths.length === 0` (and similarly for `Appliances.vue`).* Two call sites need to change, both in the same way. Easier to forget on a third caller (which would inherit the bug). Centralising the floor in `pathsForApplianceType` keeps the contract in one place.
- *Introduce a separate `staleProtectionPathsFor(type)` helper.* More plumbing for no extra benefit. The existing helper's contract — "give me the paths to subscribe for compact rendering of this appliance" — already implies including the staleness keep-alive. We're tightening the contract, not splitting it.
- *Change the `if (paths.length === 0) continue` guard at the call site to "always subscribe with at minimum `['lastTimeOnline']`".* Equivalent runtime behaviour but pushes the decision out of the typed helper. Worse separation of concerns.

### D2: Keep the `if (paths.length === 0)` defensive guards in callers

The two call sites (`Floorplan.vue:920-922`, `Appliances.vue:90`) currently filter out entries with empty paths. After D1, `pathsForApplianceType` no longer returns `[]` for any input — but the guards stay as defensive code. They become unreachable for typical inputs, but a future caller could pass a type that triggers a hypothetical edge case. Cheap insurance, no behaviour change.

**Alternatives considered:**
- *Remove the empty-paths guard in both call sites.* Defensible — the helper now guarantees non-empty output. But the guards are a single line each and don't impose a meaningful cost. Leaving them keeps the diff minimal and easier to reason about during review.

### D3: `addOnOffStateTo` is unchanged for unknown types

For an appliance with `type: NULL` (or any unrecognised value), `addOnOffStateTo`'s switch falls through to `Vue.set(item, 'onOffState', 'none')` at line 337. With the staleness gate now passing reliably (because `lastTimeOnline` flows via SSE), the appliance renders with `onOffState === 'none'` indefinitely — `isError` returns false, the avatar renders normally, the `iconPos1`-as-state-key overload (`getColor` / `isOn`) kicks in to derive the displayed color/wattage from `state[iconPos1]`.

This is the desired behaviour for the Solax inverter: it lacks a relay state and lacks a switchable on/off action, but its `state.dcPower` (referenced by `iconPos1: 'dcPower'`) drives the displayed wattage and color via the existing fallback in `Floorplan.vue:809-815`/`:830`. No new derivation logic is needed in this change.

## Risks / Trade-offs

- **[Risk] Subscribing every untyped appliance to `lastTimeOnline` increases SSE traffic if many such appliances are rendered.**
  → Mitigation: `lastTimeOnline` is a single small string field, emitted as a heartbeat (not on every state change). The increase per appliance is bounded by the heartbeat cadence times the number of appliances. For typical installations (tens of devices) this is negligible. If a future installation has hundreds of untyped appliances, batching is the SSE layer's concern, not this helper's.

- **[Risk] An appliance whose backend emit cadence for `lastTimeOnline` is slower than 2 minutes will still flip to `'error'`.**
  → Acceptable: that's not a frontend bug. The staleness threshold is by design — if the backend can't keep up, the device is genuinely (per the contract) "stale". The fix scope here is "ensure the frontend gets the heartbeat when the backend sends one", not "make the threshold longer".

- **[Trade-off] Future authors writing per-type-specific paths will see a "default fallback" in the helper and may forget to add their type to `COMPACT_PATHS` when adding richer fields.**
  → Acceptable: the fallback degrades gracefully (no `'error'` painted), so missing a type entry is no longer a correctness bug — it's a missing optimisation. Worth it; the risk is the inverse of what we're fixing.

- **[Risk] Unrelated downstream code might depend on `pathsForApplianceType` returning `[]` as a sentinel for "this type isn't supported".**
  → Verified: only `Floorplan.vue:919-922` and `Appliances.vue:88-90` consume the helper's output, both checking `paths.length === 0` to drop the appliance from the subscription. After this change those guards are unreachable for typical inputs. No other consumer.

## Migration Plan

Single PR. Reverts cleanly. No persistent state, no migrations, no backend changes.

## Open Questions

- Whether to also add `'enabled'` (or any other appliance-level keep-alive field) to the universal floor. None today; revisit if a use case appears.
- Whether to expose a public `STALE_PROTECTION_PATHS = ['lastTimeOnline']` constant for tests/docs to reference. Out of scope; the literal is mentioned exactly once in the implementation and once in the spec's "uniform floor" requirement.
