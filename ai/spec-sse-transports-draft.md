---
name: SSE Transports — Backend Specification (Draft)
description: Per-value, per-interval subscription model for the SSE appliance stream, with optional server-side aggregates. Supersedes the whole-appliance subscription model.
type: spec-draft
date: 2026-04-18
status: superseded — authoritative contract is now `../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md`; GUI migration implemented by openspec change `use-sse-transports-from-backend`.
supersedes: ai/spec-sse-draft.md
---

> **Note (2026-04-19):** This draft has been superseded. The authoritative backend contract lives in `../../JAVA/java-overmind-server/ai/draft-sse-transports-for-frontend.md`, and the GUI-side migration is captured by the openspec change `use-sse-transports-from-backend`. Kept here for historical context only.


# SSE Transports — Backend Specification (Draft)

**Date:** 2026-04-18
**Scope:** Define **transports** — the subscription model for the `/sse/appliances` SSE stream. A transport is a client-registered subscription to specific *values* within specific appliances, at a client-chosen `minInterval`, optionally reduced by a server-side aggregate operator (sum / avg). Transports replace the whole-appliance subscription model described in the predecessor spec; there is exactly one subscription concept now.
**Out of scope:** Commands (`POST /execute`) and all non-appliance polled resources (plans, switches, window contacts, weather) are unchanged.
**Relationship to the existing spec:** This **supersedes** `ai/spec-sse-draft.md`. The `/sse/appliances/register` endpoint, the appliance-level `subscriptionId`, and the full-appliance `update` event in that draft are all replaced by the transport model below. The SSE connection, `connected` handshake with server-assigned `connectionId`, `:keepalive` comments, and reconnect semantics (§5.1) carry over unchanged.

---

## 1. Why this exists

Tablets on weak WiFi are piling up SSE update events because the appliance-level subscription model ships the **full appliance object** on every state change — the 40+ fields of `state` JSON plus name, config, timestamps, etc. For most views, the client reads one or two scalars out of that payload and discards the rest. Two specific pain points:

1. **Kiosk energy panel → lights card.** `KioskPowerPanel.vue` subscribes to ~50 light appliances at `minInterval: 3000` and sums `state.relays[0].power` across them to display one aggregate W value. The client receives 50 full appliance payloads every 3 seconds just to produce one scalar. See `src/views/KioskOverview.vue` and `src/components/kiosk/KioskPowerPanel.vue:420–445`.
2. **Floorplan compact → detail.** Compact view only reads `relays[i].power`, or `closures[0].open`, or `temperatures[0].temperature + humidities[0].humidity` depending on type. Detail dialog needs the full state. Today both receive the same payload (the full appliance) at the same interval.

A transport lets the client say *"for this card, I need these specific paths at this rate — and if it's an aggregate card, do the math server-side."* This is the only subscription shape the backend needs to support — no parallel "whole appliance" endpoint. Views that genuinely want every scalar use the `**` wildcard (see §3); the rest declare only what they render.

---

## 2. The transport concept

A **transport** is a named subscription on an SSE connection with:

- A **`minInterval`** in milliseconds (debounce semantics defined in §5.5).
- An optional **`aggregate`** operator applied server-side across all selected values (see §4).
- A **selection**: which appliance values this transport observes. Two selection shapes are supported:
  - **Per-appliance paths** — one or more `{applianceId, paths: [...]}` entries, where each path identifies a scalar inside that appliance's parsed `state` (see §3 for syntax).
  - **Path template across appliances** — a single `paths: [...]` list applied uniformly to a list of `applianceIds`. This is shorthand for the per-appliance form when all appliances use the same path shape (typical for the lights-sum card).

A single connection may hold many transports. Transports are created and destroyed independently (e.g. a floorplan detail dialog creates a transport on open and destroys it on close).

---

## 3. Value-path syntax

Appliance state is a nested structure of category arrays (`relays`, `dimmers`, `rgbws`, `temperatures`, `humidities`, `batteries`, `motions`, `closures`, `luminosities`) whose elements each contain a small number of scalar fields. The per-type table in the predecessor spec (`ai/spec-sse-draft.md §2.2`) remains the authoritative shape — this transport spec supersedes only the subscription model, not the data model.

**Path syntax:** dotted notation with bracket-indexed array access.

Examples:
- `relays[0].power` — power of the first relay
- `relays[0].state` — ON/OFF of the first relay
- `dimmers[0].brightness`
- `rgbws[0].brightness`, `rgbws[0].colorTemperature`, `rgbws[0].red`
- `temperatures[0].temperature`
- `humidities[0].humidity`
- `batteries[0].batteryLevel`
- `closures[0].open`, `closures[0].tilt`
- `motions[0].motion`
- `hasExternalPower` — top-level scalar on HT state

**Wildcards:**

- `[*]` — matches all array elements of a category. Examples:
  - `relays[*].power` — all relay powers of this appliance (useful for DIMMER / RELAY_DUAL where the client doesn't want to know the relay count)
  - `rgbws[*].brightness`
- `**` — matches **every scalar** reachable inside the appliance's parsed `state`, plus top-level appliance scalars per below. This is the escape hatch for views that want everything; the payload scales accordingly. Prefer explicit paths where you can.

**Out-of-range indices and missing categories** never produce errors at registration. They simply never emit values. (An appliance that has no `temperatures` category just contributes nothing for `temperatures[0].temperature`.)

**Top-level fields on the appliance object itself** (not inside parsed `state`) are addressed by name without any prefix: `enabled`, `pingable`, `lastTimeOnline`. These change rarely but are legitimate subscription targets. Whether to expose them in transports at all is an open question — see §9.

---

## 4. Aggregate operators

When a transport has an `aggregate` field, the server reduces the full set of selected values across all selected appliances into a single scalar per tick.

Supported operators (minimum viable set):

| Operator | Semantics | Initial driver |
|---|---|---|
| `sum` | Sum of all non-null numeric values. | Kiosk energy panel lights W sum. |
| `avg` | Arithmetic mean of non-null numeric values. Returns `null` if no values contribute. | Any "average temperature across rooms" card. |

**Treatment of missing / offline values:**
- Values that are `null`, `undefined`, or come from an appliance whose `state` does not contain the requested path: **excluded** from the aggregate. They do not count as zero for `sum`, and they do not count in the denominator for `avg`.
- Values whose appliance is `enabled: false` or has not been seen since startup: also excluded.

**Payload for an aggregate transport:**
```json
{
  "transportId": "t-a1b2c3",
  "aggregate": {
    "op": "sum",
    "value": 847.3,
    "sampleCount": 47,
    "totalCount": 50
  },
  "ts": "2026-04-18T14:23:00.123Z"
}
```
- `sampleCount` — number of values that contributed (useful so the client can render "47/50 lights reporting").
- `totalCount` — number of values the transport *expects* based on its selection (for wildcards, this is resolved at tick time, not at registration).

**Unit safety:** the server SHOULD NOT sum values with incompatible units (e.g. `relays[0].power` in watts + `temperatures[0].temperature` in °C). If a transport selection references fields with heterogeneous units, the server should either (a) reject the registration with `400`, or (b) log a warning and aggregate anyway. Preferred behavior is TBD — see §9.

**How the server computes the aggregate.** Values in the selection do not all change together. At any given moment most observed appliances have *not* changed this tick — but they still must contribute their last-known value to the aggregate. The server therefore maintains an **in-memory last-known-value cache** per observed `(applianceId, path)` for each aggregate transport (see §5.8 for the cache contract, which applies to non-aggregate transports too). On each emission tick the aggregate is recomputed from the full cache — **not** from just the paths that changed since the last tick.

Seeding at registration: read each value once from whatever source the backend already has (the existing "last value of appliance X" DB lookup is fine for a one-shot seed). Thereafter, update the cache from the live state change stream that the backend already produces for appliance mutations. Do **not** re-query the DB on every emission tick — that turns an O(changed) live stream into an O(selection × tickRate) query load, which is exactly the pileup behavior this spec is designed to eliminate.

**Aggregate scope — per-appliance vs. cross-appliance:** the aggregate always reduces across the entire selection (all appliances + all paths). There is no "per-appliance aggregate" variant in this version. If the client wants per-appliance `sum` (e.g. sum a RELAY_DUAL's two relays into one W for that appliance), it registers a non-aggregate transport and sums client-side — the payload is still tiny because it's just two scalars per appliance, not the whole state.

**Future operators (out of scope for v1 but keep the schema open):** `min`, `max`, `count`, `last`, `any` (boolean OR), `all` (boolean AND). Schema note: `aggregate.op` is a string enum — adding new ops later must not break clients that only know `sum` / `avg`.

---

## 5. Protocol

### 5.1 SSE stream

The SSE connection shape carries over from the predecessor spec: `GET /sse/appliances`, `connected` handshake with a server-assigned `connectionId`, `:keepalive` SSE comment every ~15s, `retry: 3000` for reconnection. On reconnect the server issues a new `connectionId` and the client must re-register all active transports.

The only event type emitted on the stream (beyond `connected` and `:keepalive`) is:

```
event: transport-update
data: { ...payload... }
```

**Non-aggregate transport payload** (one event per tick per transport, containing fresh values for all paths that changed since last tick):

```json
{
  "transportId": "t-a1b2c3",
  "values": [
    { "applianceId": 42, "path": "relays[0].power", "value": 12.5 },
    { "applianceId": 42, "path": "dimmers[0].brightness", "value": 0.75 },
    { "applianceId": 43, "path": "relays[0].power", "value": 0 }
  ],
  "ts": "2026-04-18T14:23:00.123Z"
}
```

**Aggregate transport payload:** see §4.

**Only changed values are emitted.** After the initial snapshot (see §5.4), a `transport-update` event contains only the paths whose values changed since the last emission for that transport.

### 5.2 Register a transport

```
POST /sse/transports/register
Content-Type: application/json

{
  "connectionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "minInterval": 3000,
  "selection": {
    "applianceIds": [101, 102, 103, ..., 150],
    "paths": ["relays[0].power"]
  },
  "aggregate": { "op": "sum" }
}
```

**Alternate `selection` shape — per-appliance paths** (when different appliances need different paths):

```json
{
  "connectionId": "...",
  "minInterval": 1000,
  "selection": {
    "perAppliance": [
      { "applianceId": 42, "paths": ["relays[0].power", "dimmers[0].brightness"] },
      { "applianceId": 73, "paths": ["temperatures[0].temperature", "humidities[0].humidity"] }
    ]
  }
}
```

Either `selection.applianceIds + selection.paths`, or `selection.perAppliance`, must be present — not both.

**Fields:**
- `connectionId` — from SSE `connected` event.
- `minInterval` — ms, per-transport debounce. Detailed semantics in §5.5. In brief: first change emits immediately, subsequent changes within the interval are coalesced, the latest state emits on timer expiry if it differs. A value of `0` means no debounce — every change emits immediately.
- `selection` — what values this transport observes (see above).
- `aggregate` — optional; omit for a non-aggregate transport.

**Response:**
```json
{ "transportId": "t-a1b2c3" }
```

**Behavior on success:**
1. Returns `transportId`.
2. Immediately pushes a `transport-update` on the SSE stream with **all currently-known values** for the selection (the initial snapshot). For aggregates, this is a single aggregate payload. For non-aggregate, it's a `values` list covering every path whose current value is known.
3. Thereafter, pushes `transport-update` events per `minInterval`, containing only changed paths (or the aggregate, if it changed).

**Error responses:**
- `400` — missing/invalid fields; heterogeneous units under `aggregate` (if that's the chosen policy — see §9); `selection` has both forms or neither.
- `404` — unknown `connectionId`.

**Unknown appliance IDs and unknown paths:** accepted silently. They simply don't contribute values. This avoids errors when appliances are disabled, not yet loaded, or renamed, and matches the behavior of the predecessor subscription model.

**Group appliances:** groups (parallel groups, sequential groups, etc.) carry no state of their own — their UI display is derived from their children. When a group ID is registered in a transport's selection, the server silently expands the selection to include all (transitive) child appliance IDs. The transport's `paths` then apply per child. Expansion is recursive; circular memberships are handled safely. Whether expansion should be controllable via a flag is an open question — see §9.

### 5.3 Deregister a transport

```
POST /sse/transports/deregister
Content-Type: application/json

{
  "connectionId": "...",
  "transportId": "t-a1b2c3"
}
```

**Response:** `200` on success; `404` if unknown.

**Behavior:** transport is destroyed immediately. Any pending debounce timer for it is cleared. No further `transport-update` events for that `transportId` are emitted.

### 5.4 Initial snapshot

Every transport receives an initial `transport-update` event synchronously with the `POST /register` response (or at least before the client reasonably expects the first real update). The GUI's per-component mount logic relies on this to populate initial values without a separate REST call — see `src/utils/sseClient.ts:197–199` for the current read-through-cache idiom.

The initial snapshot is mandatory for both aggregate and non-aggregate transports: for aggregates the client has no other way to know the starting value; for non-aggregates the client needs the baseline to render first paint and to diff subsequent deltas against.

### 5.5 Debounce and emission model

Per-transport, not per-appliance.

- When any observed value changes and the transport's debounce timer is not running → emit a `transport-update` with just the changed path(s) / recomputed aggregate, and start the timer.
- When further changes arrive while the timer is running → coalesce into a pending payload. On timer expiry, emit the coalesced payload (if non-empty / if aggregate changed) and restart.
- If the timer expires with nothing pending → let it lapse.

This is the "emit first change immediately, coalesce the tail, emit the latest at interval" model that the predecessor spec applied per-appliance, now applied at the transport level.

### 5.6 Deduplication across transports

Two transports on the same or different connections may reference the same appliance + path. The server should:

- Observe the underlying appliance state **once** (single source of truth).
- Fan out to each transport independently, each respecting its own `minInterval`.
- Not compute aggregates redundantly across overlapping transports — each transport is its own computation.

A client with two transports over the same appliance+path at different `minInterval` values (e.g. 2000ms and 500ms) should see two independent `transport-update` streams at their respective rates. Neither transport accelerates or slows the other.

### 5.7 Cleanup on disconnect

When the SSE connection closes — browser refresh, tab close, network drop, navigation away — the server must clean up automatically:

1. Detect the closed connection (write to the stream fails with a broken pipe / write error, or the SSE framework fires a disconnect event).
2. Look up all transports for that `connectionId`.
3. Stop all debounce timers for those transports.
4. Release their entries in the last-known-value cache (§5.8).
5. Delete the transports and the connection record.

No heartbeat pinging, TTLs, or garbage collection sweeps are needed. The SSE connection *is* the session. When it's gone, everything attached to it is gone.

### 5.8 Last-known-value cache contract

The server keeps an in-memory cache of the most recent value for each `(applianceId, path)` that is currently observed by at least one transport. The cache is:

- **Seeded at transport registration** from the backend's existing "last value of appliance X" lookup. This is a one-shot per new `(applianceId, path)` pair — not per tick.
- **Updated from the live state-change stream** the backend already produces for appliance mutations. Whenever the backend sees an appliance state change that touches an observed path, the cache entry is updated.
- **Read at every emission tick** to compute the outgoing payload:
  - Non-aggregate transport → emit only paths whose current cache value differs from the value last emitted for this transport (dedup against per-transport "last emitted" state).
  - Aggregate transport → recompute the aggregate across the full selection from the cache, emit if it differs from the last-emitted aggregate.
- **Reference-counted across transports.** A `(applianceId, path)` entry is created when the first transport observes it and released when the last transport observing it deregisters or its connection closes.
- **Not a persistence layer.** The cache is memory-only and transient. Crash / restart discards it; new transports reseed from the DB lookup.

The cache's purpose is to absorb the mismatch between the change stream (sparse, event-driven) and emission ticks (regular, interval-driven), without round-tripping the DB per tick.

---

## 6. Use-case walkthrough

### 6.1 Kiosk energy panel — lights card (aggregate)

**Today:** `KioskPowerPanel.vue` subscribes to `[101..150]` at `minInterval: 3000`. Every 3s, receives 50 full appliance payloads, sums `state.relays[0].power` client-side. ~50 × full appliance JSON per tick.

**With transports (front of card — aggregate):**
```json
POST /sse/transports/register
{
  "connectionId": "...",
  "minInterval": 3000,
  "selection": { "applianceIds": [101, ..., 150], "paths": ["relays[0].power"] },
  "aggregate": { "op": "sum" }
}
```
Payload per tick: one scalar. ~3 orders of magnitude less data.

**When the user flips the card (back of card — per-appliance detail):** register a second transport at a modest interval with the full set of appliances but just the power path, no aggregate:
```json
POST /sse/transports/register
{
  "connectionId": "...",
  "minInterval": 2000,
  "selection": { "applianceIds": [101, ..., 150], "paths": ["relays[0].power"] }
}
```
Payload per tick: only the powers that changed since last tick, one number each. On flip-back, deregister.

The aggregate transport on the front stays registered the whole time; the detail transport is added and removed with the flip.

### 6.2 Floorplan compact view

Typical floor: ~40 visible appliances of mixed types. The compact view reads:
- Lights / plugs / dimmers → `relays[*].power`
- HT sensors → `temperatures[0].temperature`, `humidities[0].humidity`
- Contact sensors → `closures[0].open`
- Motion sensors → `motions[0].motion`
- Battery-driven appliances of any type → `batteries[0].batteryLevel`

A `perAppliance` transport registered on `Floorplan.vue` mount gives the component exactly what it renders, nothing more:
```json
POST /sse/transports/register
{
  "connectionId": "...",
  "minInterval": 1000,
  "selection": {
    "perAppliance": [
      { "applianceId": 42, "paths": ["relays[*].power"] },
      { "applianceId": 73, "paths": ["temperatures[0].temperature", "humidities[0].humidity", "batteries[0].batteryLevel"] },
      { "applianceId": 88, "paths": ["closures[0].open", "batteries[0].batteryLevel"] },
      ...
    ]
  }
}
```

### 6.3 Floorplan detail dialog

On dialog open: register a transport for that **single appliance**, broad path selection (everything its dialog reads), tight interval (300–500ms) so sliders feel live. On dialog close: deregister. No aggregate.

```json
POST /sse/transports/register
{
  "connectionId": "...",
  "minInterval": 300,
  "selection": {
    "perAppliance": [
      { "applianceId": 42, "paths": [
          "relays[*].state", "relays[*].power",
          "dimmers[0].brightness",
          "rgbws[0].brightness", "rgbws[0].colorTemperature", "rgbws[0].red", "rgbws[0].green", "rgbws[0].blue", "rgbws[0].white", "rgbws[0].mode"
      ]}
    ]
  }
}
```

The compact-view transport for the same appliance continues running independently at its own (slower) interval — see §5.6.

---

## 7. Frontend impact (informational — not binding on backend)

For context only. The backend Claude does not need to implement anything on the frontend, but knowing the shape of the client helps design a protocol that doesn't fight it.

- `src/utils/sseClient.ts` replaces its `subscribe / unsubscribe` API with `registerTransport(spec, callback) → handle` / `unregisterTransport(handle)`. The appliance-level `subscribe` path goes away.
- `KioskPowerPanel.vue` switches the front of the card to an aggregate transport; adds a per-appliance transport on flip and removes it on flip-back.
- `Floorplan.vue` switches its compact-view subscription to a per-appliance transport; dialog components register a tight per-dialog transport on `mounted` and deregister on `beforeDestroy`.
- All other call sites of the current `subscribe` migrate to `registerTransport` with explicit `paths` (preferred) or the `**` wildcard (pragmatic escape hatch when reproducing the old "full appliance" behavior).
- `spec-sse-client.md` will be rewritten to document the new client API. (Out of scope for the backend Claude.)

---

## 8. What changes, what stays

| Endpoint / event | Purpose | Status |
|---|---|---|
| `GET /sse/appliances` | SSE stream | **Unchanged** — transports ride on the same stream |
| `POST /sse/appliances/register` | Appliance-level subscription | **Removed** — replaced by `POST /sse/transports/register` |
| `POST /sse/appliances/deregister` | Appliance-level unsubscribe | **Removed** — replaced by `POST /sse/transports/deregister` |
| `update` SSE event | Full-appliance delta | **Removed** — replaced by `transport-update` |
| `POST /execute` | Commands | **Unchanged** |
| `GET /setup/appliances` | REST initial list + bootstrap state | **Unchanged** |

This is a breaking change for any client using the old endpoints. The frontend migration lands together with the backend rollout — see §7.

---

## 9. Open questions — please confirm with the human before implementing

1. **Path syntax confirmation.** The spec proposes `relays[0].power` with `[*]` as a wildcard. Acceptable, or prefer JSON-pointer (`/relays/0/power`) or a structured form (`{category, index, field}`)?

2. **Unit-safety policy for aggregates.** Reject registration (`400`) on heterogeneous units, or log + aggregate anyway? Requires the backend to know the unit of each field — does it already?

3. **Top-level appliance fields in transports.** Should paths like `enabled`, `pingable`, `lastTimeOnline` be valid transport targets, or are transports strictly for `state` contents? (Leaning toward: yes, allow them — they're cheap and useful. But not essential for v1.)

4. **Group appliance expansion in transports.** Expand automatically (the §5.2 default — consistent with how the predecessor subscription model handled groups), or require the client to pass child IDs explicitly (more predictable, less magic)?

5. **Appliance-added / appliance-removed discovery.** With the old full-appliance stream gone, the client no longer learns about newly created or deleted appliances as a side-effect of the state stream. Options: (a) client re-polls `/setup/appliances` on a slow interval (~30s); (b) server emits a separate `appliance-list-changed` SSE event with the delta; (c) do nothing — treat the appliance list as a page-load snapshot that refreshes on navigation; (d) expose a dedicated meta-transport that observes the list itself. Preference? My lean is (c) for now — cheapest, and new/removed appliances are rare relative to state changes.

6. **Max paths or max appliances per transport.** Any hard limit to prevent a buggy client from registering a single transport covering all 300 appliances × 10 paths? Probably yes — what values?

7. **Wildcard on `perAppliance` form.** If `perAppliance[i].paths` uses `[*]` wildcards, we're fine since the wildcard is per-appliance. No ambiguity, noted for completeness.

8. **Aggregate `sampleCount` / `totalCount` semantics with wildcards.** For `relays[*].power` over 50 DIMMER_DUALs, `totalCount` is 100 (2 relays each) once resolved. Does the backend resolve this at registration, or recompute per tick (in case an appliance's relay count changes)? Leaning toward per tick — cheap and robust.

9. **Do we need `min` / `max` / `count` operators for v1?** Not required for the two driving use cases but would unblock other cards. Easy to add if the engine is built for `sum`+`avg`.

10. **Payload size guarantees.** Should `transport-update` events guarantee a max size, and if a tick's payload would exceed it, fragment across multiple events? Or let SSE handle it (SSE has no intrinsic size limit but network buffers do). Likely: don't bother unless someone hits it.

---

## 10. Summary of the contract

```
SSE stream:
  GET /sse/appliances
  Events:
    connected         -> { connectionId: "<uuid>" }
    transport-update  -> { transportId, values: [...] }         (non-aggregate transport)
                      -> { transportId, aggregate: {...} }      (aggregate transport)
  Comments: :keepalive every ~15s
  Fields:   retry: 3000

Transport REST:
  POST /sse/transports/register    { connectionId, minInterval, selection, aggregate? } -> { transportId }
  POST /sse/transports/deregister  { connectionId, transportId }

Selection shapes:
  { applianceIds: number[], paths: string[] }
  { perAppliance: [{ applianceId, paths: string[] }, ...] }

Aggregate:
  { op: "sum" | "avg" }
  -> payload: { op, value, sampleCount, totalCount }

Path syntax:
  "relays[0].power", "dimmers[0].brightness", "temperatures[0].temperature", ...
  "[*]"  wildcard for all array elements of a category
  "**"   wildcard for every scalar in the appliance (full-state escape hatch)
  Top-level appliance fields: "enabled", "pingable", "lastTimeOnline" (TBD, §9.3)

Server architecture note:
  In-memory last-known-value cache keyed by (applianceId, path), seeded
  once from the backend's "last value of X" lookup at transport register,
  updated live from appliance state changes, read at every emission tick.
  Never re-queried from the DB per tick. See §5.8.
```
