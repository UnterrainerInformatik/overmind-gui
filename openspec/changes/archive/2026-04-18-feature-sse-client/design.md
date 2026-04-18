## Context

The frontend is a Vue 2 + TypeScript SPA (Vuetify) controlling ~300 home-automation appliances via a Java backend. All state fetching currently uses polling (`setInterval` + `appliancesService.getList()`) at 1–3 second intervals from multiple views independently. On slow clients (kiosk tablets), this causes request pileup and stale-state races, which led to the `EchoGate` workaround.

The backend is adding an SSE endpoint with a subscription-based model (see `ai/spec-sse-draft.md`). This design covers the frontend client that consumes it.

Key constraints:
- Vue 2.6 / TypeScript, no Composition API
- Project is pinned to Node.js v14.15.0 (build tooling only — `EventSource` is a browser API, no Node polyfill needed)
- No authentication in use — Keycloak token getter returns empty string
- Existing singleton pattern (`private static instanceField` + `getInstance()`) used throughout the codebase
- Existing `AxiosUtils` singleton handles all REST calls and resolves the server base URL from the Vuex `rest/config` store

## Goals / Non-Goals

**Goals:**
- Single shared SSE connection across the entire app
- Components subscribe to specific appliance IDs and receive only those updates
- Server-side debounce via `minInterval` so slow clients control their own update rate
- Automatic reconnection with transparent re-registration of all active subscriptions
- Visual connection-state indicator (red border when disconnected)
- Drop-in replacement for the current polling pattern — components switch from `setInterval`/`clearInterval` to `subscribe`/`unsubscribe` in `mounted`/`beforeDestroy`

**Non-Goals:**
- Replacing polling for non-appliance resources (plans, switches, window contacts, weather, waste disposal) — those stay as-is for now
- WebSocket or any bidirectional protocol — commands remain REST `POST /execute`
- Vuex store integration — the SSE client owns its own state (subscription map + cache). Pushing into Vuex would add complexity without benefit since components already receive updates via callbacks.
- Offline/queue support — if the connection drops, we show the red border and wait for reconnect

## Decisions

### 1. New file `src/utils/sseClient.ts` as a singleton service

The SSE client lives alongside the existing service singletons (`appliancesService.ts`, `axiosUtils.ts`) and follows the same `getInstance()` pattern. It is not a Vue component, not a Vuex module, and not a mixin — it's a plain TypeScript class that components import.

**Why not Vuex:** The subscription map and appliance cache are internal bookkeeping. No component needs to read "all active subscriptions" from the store. Each component gets its updates via its own callback. Vuex would add boilerplate (mutations, actions, getters) for no consumer.

**Why not a mixin:** Mixins couple lifecycle hooks to the component. The SSE client's lifecycle (connect, reconnect, re-register) is independent of any single component. A mixin would also require every consuming component to declare the same boilerplate.

### 2. Lazy connection — open on first `subscribe()`, not on app boot

The `EventSource` is created only when the first component calls `subscribe()`. If no component ever subscribes (e.g., a settings-only page), no connection is opened.

**Why:** Avoids holding an idle SSE connection on routes that don't display appliance state. Also avoids racing with the `connected` event before any subscription is ready to register.

### 3. Use `AxiosUtils` for register/deregister REST calls

The SSE client delegates `POST /sse/appliances/register` and `DELETE /sse/appliances/register/{id}` to the existing `AxiosUtils` singleton. This keeps server base-URL resolution and error handling consistent.

**Requires:** Adding the new SSE endpoint paths to `store/rest.ts` config:
```typescript
endpoint: {
  // existing...
  sseAppliances: '/sse/appliances',
  sseAppliancesRegister: '/sse/appliances/register'
}
```

The SSE `EventSource` URL is also built from the same `rest/config` server config, so it resolves correctly in both dev (`localhost:8080`) and prod (`overmindserver.unterrainer.info:443`).

### 4. One server subscription per `subscribe()` call (1:1 mapping)

Each component `subscribe()` call creates exactly one server-side subscription via `POST /register`. The server handles overlap (tightest `minInterval` wins per appliance per connection). The client does not merge or deduplicate subscriptions locally.

**Why:** Keeps the client simple. The server already implements interval merging (spec section 4.3). Client-side merging would require tracking which local handles share which server subscription, and re-splitting when one unsubscribes — complex for negligible savings (register/deregister are infrequent REST calls, not hot-path).

**Trade-off:** Slightly more register calls on mount (one per component rather than one merged call). Acceptable since mount happens once, not in a loop.

### 5. Parse `state` and `config` strings in the client, not in callbacks

The SSE client calls `overmindUtils.parseState(entry)` and `overmindUtils.parseConfig(entry)` on each incoming entry before routing to callbacks. Components receive ready-to-use objects, identical to what `getAppliances()` gives them today.

**Why:** Every consuming component currently does this parsing. Centralizing it in the client avoids duplication and ensures consistency.

### 6. Connection indicator via CSS class on `#main` / `.v-app`

The `App.vue` template wraps everything in `<div id="main"><v-app>`. The connection indicator adds a CSS class (`sse-disconnected`) to `<v-app>` when the SSE connection is down. The styling:

```css
.v-app.sse-disconnected {
  border: 3px solid red;
}
```

The existing `.v-app` style already has `border: 1px solid rgba(#000, 0.12)`. The disconnected state overrides this with a red border.

**Implementation:** `App.vue` reads `SseClient.getInstance().connected` in a computed property and binds the class. Since `connected` is not a Vue reactive property (it's a plain boolean on a singleton), `App.vue` sets up a small `setInterval` (every 2 seconds) to check and update a local `sseConnected` data property. This is the only remaining polling — and it's purely cosmetic, not data-fetching.

**Alternative considered:** Making `SseClient` extend `Vue` or use `Vue.observable()` for reactivity. Rejected because it would couple the client to Vue and make it harder to test or reuse.

### 7. `subscribe()` is synchronous, registration is fire-and-forget

`subscribe()` returns the handle immediately. The REST registration call (`POST /register`) happens asynchronously in the background. The component doesn't need to `await` it because:
- The server pushes initial state over SSE as soon as registration succeeds
- The callback receives it like any other update
- If registration fails (e.g., connection not ready yet), the client queues it and retries after the `connected` event

**Why:** Components call `subscribe()` in `mounted()`. Making it async would require `async mounted()` and error handling in every component. The synchronous API is simpler and matches the existing `setInterval` pattern (set-and-forget in mounted, clean up in beforeDestroy).

### 8. Reconnection: re-register all, don't persist subscriptions

On `EventSource` reconnect (new `connected` event with new `connectionId`):
1. Update stored `connectionId`
2. Iterate all entries in the local `subscriptions` map
3. Call `POST /register` for each with the new `connectionId`
4. Update each subscription's `serverSubscriptionId` with the new response

The server's stale-subscription cleanup (spec section 4.5) guarantees the old connection's subscriptions are already gone. The client re-registers from scratch.

**Why not persist to localStorage:** Subscriptions are tied to mounted components. If the app refreshes, components remount and re-subscribe naturally. There's nothing to persist.

### 9. Cache survives reconnect

The internal `cache: Map<number, Appliance>` is not cleared on reconnect. Stale entries are overwritten when fresh data arrives from re-registration. This means `getLatest()` returns slightly-stale data during the brief reconnect window rather than `null`.

**Why:** Components that call `getLatest()` for synchronous initialization shouldn't break just because the SSE connection hiccupped for 3 seconds.

## Risks / Trade-offs

**[Subscribe before connected]** — If a component calls `subscribe()` before the SSE connection has delivered its `connected` event (no `connectionId` yet), the register REST call can't be made.
Mitigation: The client queues pending subscriptions and processes them when `connected` fires. This is the natural path since the connection is lazy (opened on first subscribe).

**[Rapid mount/unmount]** — A component that mounts, subscribes, then immediately unmounts (e.g., fast route navigation) fires a register + deregister in quick succession. The server may push initial state after the client has already unsubscribed locally.
Mitigation: The client ignores updates for handles that no longer exist in the subscription map. Stray updates are harmless (just extra data that nobody reads).

**[EventSource on HTTP (not HTTPS)]** — In dev mode the server runs on `http://localhost:8080`. Some browsers limit the number of concurrent HTTP/1.1 connections per host (6 in Chrome). The SSE connection consumes one permanently.
Mitigation: Acceptable for dev. Production uses HTTPS. If it becomes a problem in dev, the backend can add HTTP/2 support.

**[2-second polling for connection indicator]** — `App.vue` polls `sseClient.connected` every 2 seconds, which is technically polling. But it's a single boolean read, no network call, and the worst case is a 2-second delay before the red border appears/disappears.
Mitigation: Acceptable. Can be replaced with a callback or `Vue.observable` wrapper later if the delay matters.
