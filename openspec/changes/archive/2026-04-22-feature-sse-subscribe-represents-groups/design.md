## Context

The overmind backend's `transport-update` `values` payload carries triples of shape `{applianceId, path, value}`, and — for appliances that participate in grouping — also an optional `representsGroups: number[]` field enumerating the member ids that should mirror the triple's value. The floorplan detail dialogs use this today: their callbacks accept a triple iff `triple.applianceId === this.app.id` OR `this.app.id ∈ triple.representsGroups`.

The reactive `Subscription` introduced by `feature-sse-reactive-subscriptions` (archived 2026-04-22) dispatches each triple into exactly one key, `${triple.applianceId}:${path}`. Consumers watching `sub.values['<app.id>:<path>']` never see group-routed writes. That gap was what forced the dialog migrations to be deferred from `feature-adopt-sse-subscribe`.

This change lifts the `representsGroups` handling into the library. The consumer then sees group-routed updates under its own appliance id's keys, and no consumer-side `representsGroups` branching is needed. It also keeps the `Subscription` semantic crisp: writes land under the appliance ids the consumer subscribed for, never under foreign ids.

`Floorplan.vue` is intentionally out of scope. It uses `representsGroups` too, but its callback also does power aggregation, non-power mirroring from a primary child, and canvas-redraw triggering — that is a different-shaped migration that should be designed separately.

## Goals / Non-Goals

**Goals:**

- Make `representsGroups` transparent to subscription consumers: when the server routes a triple from a group to its members, the subscription writes the value under each member's key (if the member is in the selection) exactly as if the triple had arrived with `applianceId` set to that member.
- Migrate the six floorplan detail dialogs to `subscribe()` + `close()` + a `$watch` pattern identical to `Appliances.vue` (from the prior change), with the `representsGroups` guard removed from each dialog's code.
- Preserve every existing `Subscription` invariant: pre-declared explicit keys, wildcard-dynamic keys, delta retention, close clearing, reconnect preservation, staleness, error surfacing.
- Keep the change strictly additive for existing consumers — `Appliances.vue`, `KioskPowerPanel`, or any future caller whose payloads do not carry `representsGroups` sees no behavioral change.

**Non-Goals:**

- Not migrating `Floorplan.vue` — its callback does not map onto a single "write value to state" loop; a standalone refactor will address it.
- Not changing `registerTransport`. The callback API still exposes the raw triples, `representsGroups` included. Consumers that want the metadata can stay on it.
- Not changing the server-side `transport-update` shape or selection matching. The server already sends `representsGroups`; we only change how the client's `Subscription` interprets it.
- Not introducing a `sub.lastValues` raw-triples accessor. The dispatch-level mirroring chosen here solves the motivating use case; exposing raw triples invites consumers to reach around `Subscription`'s semantics.
- Not mirroring aggregate payloads (they carry no triples).

## Decisions

### Decision 1: Mirror onto member ids at dispatch, filtered by the subscription's selection

For each non-aggregate triple `{applianceId, path, value, representsGroups?}`:

- Compute `targetIds = [applianceId, ...(representsGroups ?? [])]` (de-duplicated).
- For each `id` in `targetIds`, **if `id` is in the subscription's selection**, `Vue.set(sub.values, ``${id}:${path}``, number)`.
- If `applianceId` itself is not in the selection but an id in `representsGroups` is, writes land only under the member ids that are in the selection. The group's own id is never written unless the consumer explicitly subscribed to it.

Rationale:

- The consumer's selection is the declared contract for what keys can appear in `sub.values`. Writing outside that set would be a surprise and complicates reasoning about template bindings.
- Group-routed triples for a single subscription typically overlap with exactly one selected member (the dialogs subscribe for exactly one appliance each), so the filter collapses to a single write — cheap and predictable.
- A subscription that includes both a group and some of its members would get writes under every matching id, reflecting the fact that both are "seeing the same value". That's internally consistent.

**Alternatives considered:**

- *Mirror onto every id in `representsGroups`, regardless of selection* — rejected. Pollutes `sub.values` with keys the consumer didn't ask for. Would also reactivate Vue reactivity for those keys on every write, with no consumer benefit.
- *Only mirror onto `representsGroups` ids; never write under `applianceId` if `representsGroups` is present* — rejected. If the consumer actually subscribed to the group appliance directly, it should see its own value. The "both" semantic covers both cases uniformly.
- *Expose `sub.lastValues: ValueTriple[]` so consumers handle `representsGroups` themselves* — rejected. Consumers already moved away from message-shaped handling; re-introducing triples for one edge-case reintroduces the coupling we removed.

### Decision 2: Compute the selection's id-set once per subscription, cache on `SubscriptionRecord`

Add a `selectedIds: Set<number>` field to `SubscriptionRecord`, populated at `subscribe()` time from `spec.selection`. The dispatch filter becomes `if (!record.selectedIds.has(id)) continue` — O(1) per target, O(targetIds) per triple.

Cheaper than recomputing the set on every triple, and scoped to the record's lifetime. Cleared when the subscription is closed (the record itself is dropped).

### Decision 3a: Drop library-level numeric coercion — store raw `triple.value` in `sub.values`

The prior `dispatchToSubscription` (shipped by `feature-sse-reactive-subscriptions`) coerced every triple's value via `Number.parseFloat` + `isNaN ? 0`. That was a reasonable default when `sub.values` was typed `Record<string, number | undefined>` and the only consumers wanted numbers (the power-detail view). The wildcard-dialog consumers migrated here, however, set appliance-state fields of many types via `setPathValue(app.state, path, v)` — booleans (`closures[*].open`, `motions[*].motion`), strings (`rgbws[*].mode`), timestamps, arrays. Coercing them to numbers corrupts the shared `app.state` (the `app` prop is the same reference owned by `Floorplan.vue`), making the floorplan tile render disconnected/red after a dialog open/close cycle because, for example, `closures[0].open` transitioned `true → 0`.

The correct fix is to make the library pass values through verbatim and push numeric coercion back to the consumer that needs it:

- `Subscription.values` becomes `Record<string, unknown> | null`.
- `dispatchToSubscription` writes `triple.value` as-is via `Vue.set` — no `Number.parseFloat`, no `isNaN` handling.
- `KioskPowerPanel`'s `detailApps` computed (the only values consumer that sums raw paths as numbers) adds a `typeof v === 'number' ? v : Number.parseFloat(v)` + `isNaN` guard at its read site. All other post-migration consumers (Appliances, the six dialogs) pass the raw value through `setPathValue` to an `app.state` object that already expects the server-sent type.

This decision is a direct fix for the bug reported mid-implementation of this change — a floorplan appliance tile turning red and showing a disconnected flash after a dialog close. It is included in this change's spec delta (the MODIFIED body replaces the "coerced via Number.parseFloat" clause with "stored as-is, typed `unknown`"), because the fix is inseparable from the dialog migrations it enables.

### Decision 3: Extend the `ValueTriple` type with an optional `representsGroups` field

Update `ValueTriple` to:

```typescript
export interface ValueTriple {
  applianceId: number;
  path: string;
  value: unknown;
  representsGroups?: number[];
}
```

This is purely a type declaration that matches what the server already delivers. No runtime change; the field is already present on real payloads today (dialog callbacks rely on it). Consumers using `registerTransport` with explicit TypeScript types gain a properly-typed handle on the field.

### Decision 4: Dialog migration is mechanical — one pattern, six files

Each of the six dialogs is migrated to the same shape (identical to the `Appliances.vue` migration in `feature-adopt-sse-subscribe`):

- Replace `sseHandle: null` data field with `sub: null, unwatchSub: null`.
- Replace `onTransportUpdate(payload)` — the per-triple loop with the `representsGroups` guard — with `applySubValues()` that iterates `sub.values` keys, filters by `${this.app.id}:…` prefix, and calls `setPathValue(this.app.state, path, v)`. No `representsGroups` check in the consumer; the library already did the mirror.
- Replace the `await SseClient.getInstance().registerTransport(...)` in `mounted` with a synchronous `this.sub = SseClient.getInstance().subscribe(...)`, followed by `this.unwatchSub = this.$watch(() => this.sub && this.sub.ts, () => this.applySubValues())`.
- Replace the `unregisterTransport` in `beforeDestroy` with `this.unwatchSub()` + `this.sub.close()`.

The watch-on-`sub.ts` pattern fires once per delivered payload; `applySubValues` iterates all currently-populated keys and writes them to `app.state`. Same cost as the old per-payload callback loop.

## Risks / Trade-offs

- **Selection filter leaks a tiny semantic**: the consumer doesn't see group-routed writes for ids it didn't subscribe for, even if those ids show up in `representsGroups`. That's intentional and matches consumer expectations, but it means a consumer that subscribes for "appliance X only" can't discover "appliance Y also got updated" through this channel — they'd need a broader selection. Acceptable; this is exactly the status-quo behavior under `registerTransport` too (consumer filters by `app.id`).
- **One-to-many writes per triple**: a triple with `representsGroups: [a, b, c, d]` where three of the four are selected triggers three writes. Still cheap; Vue's reactivity dedupes re-renders at the template level.
- **Type change on `ValueTriple`**: callers that destructure or spread the type may need a lint-level update. In practice, the only consumer that references `representsGroups` is the dialogs (migrated here) and `Floorplan.vue` (explicitly untouched, already uses the field).
- **No consumer-side `representsGroups` awareness remaining**: the library centralizes it, which is the point of the change but also means a future change to group-routing semantics must be made in one place and will affect every subscription. That's a feature, not a bug.
- **Ordering with archived `feature-adopt-sse-subscribe`**: this proposal's MODIFIED requirement must point at the wildcard-aware body already synced from that earlier change. If `feature-adopt-sse-subscribe` is not archived yet, archive it first.

## Migration Plan

Client-only. No data migration, no feature flag, no server changes.

1. Extend `ValueTriple` type.
2. Add `selectedIds` to `SubscriptionRecord`, populate at subscribe time.
3. Extend `dispatchToSubscription` with the target-id enumeration and selection-filtered Vue.set loop.
4. Migrate each of the six dialogs (order doesn't matter; independent files).
5. Lint + build.
6. Manual verification on the dev server: open each dialog type on an appliance that is part of a group, confirm group-level updates still flow into the dialog's bindings; open each dialog on an appliance that is NOT in a group, confirm nothing regresses.

Rollback is a git revert; each dialog's diff is independent of the others, and the `representsGroups` dispatch logic is backwards-compatible for payloads that omit the field.
