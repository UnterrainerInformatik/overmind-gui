## Context

`SseClient` (`src/utils/sseClient.ts`) exposes `registerTransport(spec, callback)` which returns a `Promise<Handle>`. The Promise's resolver is stored on `record.initialResolve` inside the returned `new Promise(...)` and is only called later from `onTransportUpdate` after the first `transport-update` event for the newly-registered `transportId` is dispatched. The `transportId` itself is allocated by the server and is returned in the body of the `POST /sse/transports/register` response; the client learns it by awaiting the axios POST, and only then calls `this.byTransportId.set(transportId, record)`.

`onTransportUpdate(e)` looks up `record = byTransportId.get(transportId)` and returns silently when `record` is `undefined`. No buffering, no retry, no signal back to the would-be registrant. This is the discard that creates the race.

Meanwhile the server, once it has assigned a `transportId`, emits that transport's initial `transport-update` on the SSE stream independently of the axios POST's response headers landing in the client. Depending on server warmup state, network conditions, and the axios promise microtask ordering, the SSE event can arrive **before** the axios POST has resolved client-side. When it does, the dispatch fails with `matched: false` and is lost.

Confirmed live with `DEBUG_SSE = true`:

```
[SSE] transport-update arrived {transportId: 't-12138e779267', matched: false, valuesCount: null, hasAggregate: true, knownTransportIds: Array(6)}
[SSE] registered on server {handleId: 'sse-9', transportId: 't-12138e779267', selection: {…}}
```

Downstream, `KioskPowerPanel.mounted()` awaits each `registerCellPower(cell)` sequentially. A dropped initial update means that `await` hangs; every subsequent cell in the for-loop never registers its transport; `cell.powerHandle` stays `null`; the cell sits at `initCells`'s default `0 W`. The same race can affect `openDetailTransport`'s `await`.

## Goals / Non-Goals

**Goals:**

- A `transport-update` whose `transportId` corresponds to a transport currently registering (POST in flight or just resolved) SHALL be delivered exactly once through the normal dispatch path — same callback invocation, same `initialResolve` behaviour, same pathCache population semantics — regardless of whether it arrived before or after `byTransportId.set`.
- `registerTransport`'s Promise SHALL resolve in the previously-losing ordering.
- `KioskPowerPanel.mounted()`'s sequential loop SHALL complete for every cell.
- No change to consumer code. No change to the wire protocol. No change to the server.
- Memory remains bounded.

**Non-Goals:**

- Not changing the server's emission timing or adding protocol-level ACKs.
- Not reworking `registerTransport` into a two-phase register-then-arm dance.
- Not adding a TTL or size cap to the pending-updates buffer in this change (the buffer is naturally flushed by every register completion and by every register failure path; a cap can be added later if a new class of races emerges).
- Not changing payload shapes. A `transport-update` continues to carry either `values`, `aggregate`, or neither — per the server today.

## Decisions

### Decision 1: Buffer unmatched initial updates in a `Map<transportId, rawData>`

Introduce `private pendingInitialUpdates: Map<string, any> = new Map()` on `SseClient`. Key is the server-assigned `transportId`, value is the raw `data` parsed from the SSE event (the object the server sent, retained as-is so that both `values`/`aggregate` branches can be processed later through the same code that would handle a live arrival).

`onTransportUpdate` becomes:

```ts
private onTransportUpdate (e: MessageEvent): void {
  const data = JSON.parse(e.data)
  const transportId: string | undefined = data.transportId
  if (DEBUG_SSE) { /* existing log */ }
  if (!transportId) return

  const record = this.byTransportId.get(transportId)
  if (!record) {
    // Buffer: a transport-update for a transportId we don't know yet.
    // If this is the initial update for a transport whose registerOnServer
    // POST hasn't resolved yet, we'll replay it at that moment.
    // If it's a stray update for a transportId we will never register,
    // the entry stays in the map forever (bounded by in-flight registrations
    // in practice; see Risks).
    this.pendingInitialUpdates.set(transportId, data)
    return
  }

  const payload = this.buildPayloadFromData(data)
  if (!payload) return
  record.callback(payload)
  if (record.initialResolve) {
    const resolve = record.initialResolve
    record.initialResolve = null
    record.initialReject = null
    resolve(record.handle)
  }
}
```

### Decision 2: Factor payload construction into a shared helper

To avoid divergence between live-dispatch and replay, extract the values/aggregate branch + pathCache population into one private helper:

```ts
private buildPayloadFromData (data: any): TransportUpdate | null {
  const payload: any = { ts: data.ts }
  if (data.values !== undefined) {
    payload.values = data.values
    for (const triple of data.values as ValueTriple[]) {
      this.pathCache.set(`${triple.applianceId}:${triple.path}`, triple.value)
    }
  } else if (data.aggregate !== undefined) {
    payload.aggregate = data.aggregate
  } else {
    return null
  }
  return payload as TransportUpdate
}
```

(This preserves the current mutually-exclusive shape that the server actually emits — log confirms we never see both on one event — so the earlier "combined-shape" idea stays dead. If the server ever starts sending both, the spec amendment for that would be a separate change.)

### Decision 3: Replay at the exact moment `byTransportId` becomes consistent

In `registerOnServer`, immediately after `this.byTransportId.set(transportId, record)` and the DEBUG log, check for a pending replay and run it inline:

```ts
record.transportId = transportId
this.byTransportId.set(transportId, record)
if (DEBUG_SSE) { /* existing log */ }

const pending = this.pendingInitialUpdates.get(transportId)
if (pending !== undefined) {
  this.pendingInitialUpdates.delete(transportId)
  const payload = this.buildPayloadFromData(pending)
  if (payload) {
    record.callback(payload)
    if (record.initialResolve) {
      const resolve = record.initialResolve
      record.initialResolve = null
      record.initialReject = null
      resolve(record.handle)
    }
  }
}
```

Invariants:
- Replay runs at most once per registration (the entry is deleted before callback).
- The `if (record.initialResolve)` guard matches the live-dispatch path, so a subsequent real-time arrival after replay cannot double-resolve the promise.
- `pathCache` is populated from replay's `values` branch the same as live-dispatch, so any consumer that reads the cache later gets the same state it would have gotten under a lucky race.

### Decision 4: Do nothing special on register failure

If the axios POST throws, `transportId` is never known to the client and no pending entry could ever have matched it. No cleanup is required. `initialReject` is called as today.

### Decision 5: Leave `DEBUG_SSE` helper logging in place for this change

Logging already covers the cases we care about (`registered on server`, `transport-update arrived` with `matched`). No new logging. The flag is flipped on for verification during implementation and flipped back off before commit (see tasks.md).

## Risks / Trade-offs

- *Unbounded buffer in pathological cases*: a `transport-update` whose `transportId` the client never registers would linger forever. In practice the client only registers transports it POSTed for, and the server only assigns `transportId`s it returns to POSTs. A stray id would mean either a server bug or a torn connection. Worst-case growth is a few bytes per event. If this ever becomes load-bearing we can cap by size or attach a `setTimeout`-driven TTL; out of scope for the bug fix.
- *Replay firing after a subsequent real-time arrival*: cannot happen in practice. The server emits initial-then-on-change; if a non-initial arrival beat the replay, it too would have been buffered (no record to dispatch to yet), then at register completion both would be in the map — but we key by transportId with `.set`, so later arrivals overwrite earlier. Result: we replay the most recent buffered payload, which is strictly more correct than replaying stale initial. Either way, `callback` fires at most once before steady-state.
- *Consumer assuming no callback before register's Promise resolves*: the steady-state contract is unchanged — live-dispatch still invokes callback then resolves the Promise in that order. Replay preserves the same order inside `registerOnServer`'s continuation. Callers that `await registerTransport(...)` before they care about callbacks (`KioskPowerPanel`, `Floorplan`, dialog components) continue to see one callback before their await returns.
- *Microtask ordering*: `registerOnServer` runs inside the `await` continuation of `axios.post`, which is a microtask. The replay's `record.callback(payload)` and `resolve(record.handle)` run synchronously inside that microtask. The outer `await registerTransport(...)` resumes on the next microtask tick with `handle` in hand — same as today's successful path.

## Migration Plan

- One-file edit in `src/utils/sseClient.ts`.
- One delta spec under `openspec/changes/bug-energy-panel-groups-malfunction/specs/sse-transport-client/spec.md`.
- Rollback: revert the commit.
- Verification with `DEBUG_SSE = true` on Node 14:
  - Expect to see `[SSE] transport-update arrived` lines with `matched: false` for the same `transportId` that a subsequent `[SSE] registered on server` line confirms (the race is still present on the wire — we just recover from it).
  - Every cell of the kiosk panel — specifically lights — displays correct wattage after a fresh load.
  - Toggling lights changes the displayed wattage within a few seconds.
  - Detail flip-side works on every cell (open, close, reopen the same cell, open a different cell).
- Flip `DEBUG_SSE` back to `false` before commit.

## Open Questions

- None blocking. If after applying the fix the lights cell still reads `0 W`, revisit — but the log-level evidence points squarely at the register race, and this fix removes the discard path.
