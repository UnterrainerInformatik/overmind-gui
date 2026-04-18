# SSE Appliance State Stream — Backend Specification

**Date:** 2026-04-18
**Scope:** Replace polling of `GET /setup/appliances` with a subscription-based Server-Sent Events stream for real-time appliance state updates.
**Out of scope:** Commands (`POST /execute`) remain REST. Other polled resources (plans, switches, window contacts, weather, etc.) are unchanged for now.

---

## 1. Why

The frontend currently polls `GET /setup/appliances` every 2–3 seconds from multiple views (Appliances list, Floorplan, Kiosk panels). There are ~300 appliances, each potentially changing state every second. On slow clients (tablets on weak WiFi), responses arrive after the next poll fires, causing request pileup and stale-state races. We built an `EchoGate` mechanism to suppress UI flicker — this becomes unnecessary with server-push.

Streaming all 300 appliances to every client is not viable. The frontend only needs a subset at any given time (the appliances visible on the current view). A subscription model lets the server send only what each client has asked for, at a rate the client can handle.

---

## 2. Appliance data shape (reference)

### 2.1 Current REST response

```
GET /setup/appliances
```

```json
{
  "entries": [
    {
      "id": 42,
      "name": "Living Room Dimmer",
      "enabled": true,
      "lastTimeOnline": "2026-04-18T14:23:00Z",
      "pingable": true,
      "type": "DIMMER",
      "usageType": "...",
      "batteryDriven": false,
      "classFqn": "...",
      "state": "{\"relays\":[{\"state\":\"ON\",\"power\":12.5}],\"dimmers\":[{\"brightness\":0.75}]}",
      "config": "{\"address\":\"192.168.1.100\"}"
    }
  ]
}
```

**Important:** `state` and `config` are **JSON-encoded strings** inside the JSON response.

### 2.2 Known appliance types and their state shapes

After `JSON.parse()` on the `state` string:

| Type | `state` shape |
|------|--------------|
| `PLUG`, `RELAY` | `{ relays: [{ state: "ON"\|"OFF", power?: number }] }` |
| `DIMMER` | `{ relays: [...], dimmers: [{ brightness: 0-1 }], rgbws: [{ brightness: 0-1, colorTemperature: 0-1 }] }` |
| `BULB_RGB` | `{ relays: [...], rgbws: [{ red: 0-1, green: 0-1, blue: 0-1, white: 0-1, gain: number, brightness?: 0-1, colorTemperature?: 0-1, mode?: "WHITE"\|"RGB" }] }` |
| `RELAY_DUAL` | `{ relays: [{ state, power? }, { state, power? }] }` |
| `HT` | `{ batteries: [{ batteryLevel: 0-1 }], temperatures: [{ temperature: number }], humidities: [{ humidity: number }], hasExternalPower: boolean, luminosities?: [...] }` |
| `MOTION_SENSOR` | `{ motions: [{ motion: boolean }] }` |
| `CONTACT_SENSOR` | `{ closures: [{ open: boolean, tilt: number }] }` |

---

## 3. SSE connection

### 3.1 Endpoint

```
GET /sse/appliances
Accept: text/event-stream
```

No authentication. Opens a persistent SSE stream. The server assigns a connection ID and sends it as the first event.

### 3.2 Initial event

```
event: connected
data: {"connectionId":"f47ac10b-58cc-4372-a567-0e02b2c3d479"}
```

The `connectionId` is a server-generated UUID. The frontend stores it and passes it to all register/deregister REST calls.

### 3.3 Update events

All appliance data — whether from initial registration or subsequent state changes — arrives as `update` events. There is no distinction between "snapshot" and "patch"; it's always the same format:

```
event: update
data: {"entries":[{"id":42,"name":"Living Room Dimmer","enabled":true,"lastTimeOnline":"...","type":"DIMMER",...,"state":"{...}","config":"{...}"}]}
```

The `entries` array uses the exact same object shape as the existing `GET /setup/appliances` response. Each entry is the full appliance object (not a diff).

An `update` event contains one or more appliances. The server may batch multiple appliance changes into a single event.

### 3.4 Keepalive

```
:keepalive
```

SSE comment sent every ~15 seconds to keep the connection alive through proxies.

### 3.5 Reconnection

```
retry: 3000
```

Sent once after `connected`. On reconnect, the server issues a new `connectionId` and the frontend must re-register all active subscriptions (see section 5.3 of the client spec).

---

## 4. Subscription management (REST)

### 4.1 Register

```
POST /sse/appliances/register
Content-Type: application/json

{
  "connectionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "applianceIds": [42, 43, 44],
  "minInterval": 1000
}
```

**Fields:**
- `connectionId` — from the SSE `connected` event
- `applianceIds` — which appliances to subscribe to
- `minInterval` — minimum milliseconds between updates **per appliance** for this subscription. The server will not send updates for a given appliance more frequently than this. (Server-side debounce.) A value of `0` means no debounce — every state mutation is sent immediately.

**Response:**

```json
{
  "subscriptionId": "a1b2c3d4"
}
```

**Behavior on success:**
1. Returns the `subscriptionId`.
2. Immediately pushes the current state of all requested appliances as an `update` event on the SSE stream. This gives the frontend the initial values without a separate REST call.
3. Subsequently pushes `update` events whenever a subscribed appliance's state changes, respecting `minInterval`.

**Unknown appliance IDs:** If `applianceIds` contains IDs that do not match any appliance on the server, the subscription is accepted without error. Those IDs simply never produce update events. This avoids errors when appliances are disabled or not yet loaded.

**Group appliance auto-expansion:** Group appliances (parallel groups, sequential groups, etc.) carry no state of their own — their UI display is derived from their children. When a group ID is registered, the server silently expands the subscription to include all (transitive) child appliance IDs. The frontend therefore:
- Receives an initial `update` event containing entries for the group AND all its children
- Receives subsequent `update` events whenever any child's state changes
- Does NOT need to look up child IDs from the group's config and subscribe to them separately — the backend handles this

If a group contains another group, expansion is recursive. Circular memberships are handled safely.

**Error responses:**
- `400` — missing/invalid fields (missing `connectionId`, missing or empty `applianceIds`)
- `404` — unknown `connectionId` (connection dropped or never existed)

### 4.2 Deregister

```
POST /sse/appliances/deregister
Content-Type: application/json

{
  "connectionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "subscriptionId": "a1b2c3d4"
}
```

**Response:** HTTP 200 on success. HTTP 404 if `subscriptionId` is unknown.

**Behavior:** Stops sending updates for this subscription. If no other subscription on this connection covers the same appliance IDs, those appliances are no longer tracked for this connection.

### 4.3 Subscription overlap

Multiple subscriptions on the same connection may include the same appliance ID with different `minInterval` values. The server should use the **tightest (smallest) `minInterval`** across all active subscriptions for that appliance on that connection.

Example:
- Subscription A: applianceIds [42, 43], minInterval 3000
- Subscription B: applianceIds [42, 50], minInterval 1000
- Result: appliance 42 streams at 1000ms, appliance 43 at 3000ms, appliance 50 at 1000ms

When subscription B is deregistered, appliance 42 falls back to 3000ms and appliance 50 stops entirely.

### 4.4 Server-side debounce per appliance

For each appliance on each connection, the server maintains a debounce timer based on the effective `minInterval`:

- When an appliance's state changes and the timer is not running, send an `update` immediately and start the timer.
- When the state changes while the timer is running, save the latest state. When the timer fires, send the saved state (if it differs from what was last sent) and restart the timer.
- When the timer fires and nothing changed, let the timer expire (don't send).

This ensures the client receives the first change immediately and the latest state at the end of a burst, without intermediate noise.

### 4.5 Stale subscription cleanup

Subscriptions are tied to their SSE connection. When the connection closes — whether from a browser refresh, tab close, network drop, or navigating away — the server must clean up automatically:

1. Detect the closed connection (writing to the stream fails with a broken pipe / write error, or the SSE framework fires a disconnect event).
2. Look up all subscriptions for that `connectionId`.
3. Stop all debounce timers for those subscriptions.
4. Delete the subscriptions and the connection record.

No heartbeat pinging, TTLs, or garbage collection sweeps are needed. The SSE connection *is* the session. When it's gone, everything attached to it is gone.

This also makes reconnect clean: the old connection's subscriptions are already destroyed by the time the client opens a new stream and gets a fresh `connectionId`. The client re-registers from scratch.

---

## 5. What stays the same

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/execute` | POST | Send commands (on, off, brightness, setRgb, setWhite) |
| `/setupappliance` | GET | Initialize an appliance |
| `/restartappliance` | GET | Reboot an appliance |
| `/setup/appliances` | GET | **Keep available** as fallback |

Commands remain REST `POST /execute`. The resulting state change arrives via the SSE `update` event — no polling needed.

---

## 6. Summary of the contract

```
SSE stream:
  GET /sse/appliances
  Content-Type:  text/event-stream
  Cache-Control: no-cache
  Connection:    keep-alive

  Events:
    connected  -> { connectionId: "<uuid>" }
    update     -> { entries: [<full appliance>, ...] }

  Comments:
    :keepalive -> every ~15s

  Fields:
    retry: 3000

REST:
  POST   /sse/appliances/register
           { connectionId, applianceIds: number[], minInterval: number }
         -> { subscriptionId: "<id>" }
         + triggers immediate update event on SSE stream

  POST   /sse/appliances/deregister
           { connectionId, subscriptionId }
         -> 200 on success, 404 if unknown subscriptionId
```
