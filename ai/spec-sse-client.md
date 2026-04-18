# SSE Client — Frontend Specification

**Date:** 2026-04-18
**Scope:** A singleton client service that manages the SSE connection, subscriptions, and routes appliance updates to Vue components.
**Depends on:** `spec-sse-draft.md` (backend contract)

---

## 1. Purpose

Components currently poll `GET /setup/appliances` independently on their own `setInterval` timers (2–3s in most views). Each component fetches **all** appliances, parses them, and keeps a local copy. This creates redundant requests, request pileup on slow clients, and timing bugs that required the `EchoGate` workaround.

The SSE client replaces all of that with:
- One shared SSE connection
- Server-side subscriptions scoped to the appliance IDs each component actually needs
- Server-side debounce so slow clients only receive updates at a rate they requested
- Client-side routing of incoming appliance data to the components that asked for it

---

## 2. Public API

The client is a singleton, following the project's existing pattern (`AppliancesService.getInstance()`).

```typescript
import { SseClient } from '@/utils/sseClient'

const sseClient = SseClient.getInstance()
```

### 2.1 `subscribe(applianceIds, callback, minInterval?): string`

Register interest in one or more appliances. Returns a local subscription handle (string).

```typescript
const handle = sseClient.subscribe(
  [42, 43, 44],
  (appliances: Appliance[]) => {
    // called with updated appliance objects
    // only contains appliances from YOUR subscription that changed
  },
  1000  // optional, default 1000ms
)
```

**Parameters:**
- `applianceIds: number[]` — which appliances to watch
- `callback: (appliances: Appliance[]) => void` — called whenever any of the subscribed appliances receive an update from the server. The array contains only the appliances that were updated in this event, not the full subscribed set.
- `minInterval?: number` — minimum ms between server-side updates per appliance. Default `1000`. Pass a higher value for components that don't need real-time updates (e.g., 10000 for a temperature overview).

**Returns:** a handle string used to unsubscribe.

**Behavior:**
1. Records the local subscription (applianceIds, callback, minInterval).
2. Calls `POST /sse/appliances/register` with the connection's `connectionId`.
3. The server immediately pushes the current state of the requested appliances as an `update` event on the SSE stream.
4. The client routes incoming `update` events to this callback whenever they contain appliances matching the subscribed IDs.

### 2.2 `unsubscribe(handle): void`

```typescript
sseClient.unsubscribe(handle)
```

Removes the local subscription and calls `DELETE /sse/appliances/register/{serverSubscriptionId}` to stop server-side updates. If another local subscription still covers the same appliance IDs, those appliances continue streaming (the server handles overlap — see spec-sse-draft.md section 4.3).

### 2.3 `getLatest(applianceId): Appliance | null`

```typescript
const app = sseClient.getLatest(42)
```

Returns the last known state of an appliance from the client's internal cache, or `null` if never received. Useful for synchronous reads without waiting for the next update event (e.g., initializing a component's `data()` from already-cached values).

### 2.4 Connection state

```typescript
sseClient.connected   // boolean, read-only
```

Components can read this to show a connection indicator. The client emits no events for connection state changes — components that care should poll this on their existing render cycle, or the client can be extended with a `onConnectionChange` callback later if needed.

---

## 3. Internal architecture

### 3.1 Connection lifecycle

```
SseClient.getInstance()
         |
         |  (lazy — connection opens on first subscribe() call)
         v
  new EventSource('/sse/appliances')
         |
         |  event: connected
         |  -> store connectionId
         |
         |  event: update
         |  -> route entries to matching callbacks
         |
         |  onerror
         |  -> EventSource auto-reconnects
         |  -> on next 'connected' event: re-register all active subscriptions
```

The connection is **lazy** — it opens when the first `subscribe()` is called, not on `getInstance()`. This avoids opening a stream if no component needs it.

### 3.2 Internal data structures

```typescript
// The SSE connection ID assigned by the server
private connectionId: string | null

// Local subscription tracking
private subscriptions: Map<string, LocalSubscription>

interface LocalSubscription {
  handle: string              // client-generated UUID
  serverSubscriptionId: string | null  // from POST /register response
  applianceIds: number[]
  minInterval: number
  callback: (appliances: Appliance[]) => void
}

// Cache of last-known appliance state
private cache: Map<number, Appliance>  // keyed by appliance ID
```

### 3.3 Event routing

When an `update` event arrives:

```
SSE event: { entries: [app42, app43, app50] }
                |
                v
  For each entry in entries:
    1. Update cache (cache.set(entry.id, entry))
    2. For each local subscription:
       - if subscription.applianceIds includes entry.id
       - collect this entry for this subscription's batch
    3. For each subscription that matched at least one entry:
       - call subscription.callback(matchedEntries)
```

Callbacks are invoked synchronously in the `EventSource.onmessage` handler. Since Vue's reactivity handles the actual DOM update asynchronously, this is fine. The entries passed to the callback already have `state` and `config` parsed (via `overmindUtils.parseState` / `parseConfig`) — the component receives ready-to-use objects.

### 3.4 Reconnection

When `EventSource` reconnects (fires `onerror` then re-opens):
1. The stream delivers a new `connected` event with a new `connectionId`.
2. The client updates its stored `connectionId`.
3. The client re-registers every entry in `this.subscriptions` by calling `POST /sse/appliances/register` for each.
4. Each registration triggers immediate `update` events from the server, so the UI refreshes without a gap.

The client does **not** clear its cache on reconnect. Stale cache entries are overwritten when fresh data arrives from the re-registration. This means `getLatest()` returns slightly stale data during the brief reconnect window rather than `null`.

### 3.5 Lifecycle cleanup

If all subscriptions are removed (every component has unsubscribed), the client **may** close the `EventSource` connection to free resources. On the next `subscribe()` call, it re-opens. This is optional — keeping the connection open with zero subscriptions is harmless (the server sends nothing if there are no registrations, just keepalives).

---

## 4. Component usage pattern

### 4.1 Before (polling)

```javascript
// Appliances.vue — current implementation
mounted () {
  this.debouncer.debounce(async () => this.getAppliances(true))
  this.interval = setInterval(
    () => this.debouncer.debounce(async () => this.getAppliances(false)),
    3000
  )
},
beforeDestroy () {
  clearInterval(this.interval)
}
```

### 4.2 After (SSE)

```javascript
// Appliances.vue — with SSE client
import { SseClient } from '@/utils/sseClient'

mounted () {
  // Subscribe to the appliances this view cares about.
  // For the Appliances list view, this is all of them — get IDs from
  // a lightweight REST call or from a known set.
  this.sseHandle = SseClient.getInstance().subscribe(
    this.applianceIds,
    (updated) => {
      updated.forEach(app => {
        const idx = this.appliances.findIndex(a => a.id === app.id)
        if (idx >= 0) {
          this.$set(this.appliances, idx, app)
        } else {
          this.appliances.push(app)
        }
      })
      this.appliances.sort((a, b) => (a.name > b.name) ? 1 : -1)
    },
    3000  // this view doesn't need sub-second updates
  )
},

beforeDestroy () {
  SseClient.getInstance().unsubscribe(this.sseHandle)
}
```

### 4.3 Debounced controls (dimmer, color picker)

The `EchoGate` is no longer needed. With SSE, the flow becomes:

1. User drags brightness slider.
2. Component debounces locally (existing `Debouncer`), then calls `appliancesService.setBrightness(id, path, value)` via REST.
3. The server processes the command, updates the appliance state.
4. The server pushes the new state via SSE `update`.
5. The component's SSE callback receives the confirmed value.

During the drag, the component ignores incoming SSE updates for the field being edited (standard local-priority pattern). Once the user releases the slider and the REST command completes, the next SSE update confirms the final value.

This is simpler than EchoGate because:
- No timeout-based guessing about whether the echo arrived
- No float-tolerance matching to distinguish "is this my echo or someone else's change"
- The server is the single source of truth; the component just has a brief "I'm dragging, ignore incoming" flag

---

## 5. What this replaces

| Current | Replaced by |
|---------|-------------|
| `setInterval` + `appliancesService.getList()` in every view | `sseClient.subscribe()` in `mounted`, `unsubscribe()` in `beforeDestroy` |
| `Debouncer` around poll calls | Not needed for polling (still used for user input debouncing on controls) |
| `EchoGate` + `floatEchoMatcher` | Simple "is-dragging" flag in each debounced control |
| Full appliance list fetched every 2-3s | Only subscribed appliances, at the rate each component requested |

---

## 6. Open question: getting the appliance ID list

For views like Appliances (shows all) or Floorplan (shows a filtered subset), the component needs to know **which IDs to subscribe to** before it can call `subscribe()`.

Options:
1. **Lightweight REST endpoint** — `GET /setup/appliances/ids` that returns just `[42, 43, 44, ...]` (or `[{id, type, usageType}]` for filtering). The component calls this once on mount, then subscribes.
2. **Subscribe with a filter** — extend the register endpoint to accept `{ filter: { usageType: "..." } }` instead of explicit IDs. More flexible but more complex on the backend.
3. **Use existing REST endpoint** — call `GET /setup/appliances` once on mount to get the full list and extract IDs, then switch to SSE for updates. Simple but defeats some of the purpose.

Recommendation: option 1 is the cleanest. A thin IDs-only endpoint is trivial to implement and avoids shipping 300 full appliance objects just to learn the IDs.
