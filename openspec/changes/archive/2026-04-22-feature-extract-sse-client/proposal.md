## Why

`src/utils/sseClient.ts` has evolved into a full-featured reactive-subscription SSE client: transport register/deregister, `pendingInitialUpdates` buffering, path-keyed cache, automatic reconnect, a `subscribe()` surface with wildcard paths, `representsGroups` mirroring, staleness detection, and error surfacing. It's ~550 lines of behavior most overmind projects would want, but it's hard-wired to this repo: it imports `Vue` for `Vue.observable`/`Vue.set`/`Vue.axios`, pulls URLs and auth tokens from the Vuex store, and is exposed as a static singleton with a private constructor. Lifting it into another project today means copy-paste plus hand-editing half the file.

The user wants to reuse this client in a sibling project and keep it in sync with this codebase. The extraction should produce a self-contained folder that can be copied into any TypeScript project, has no hard dependency on axios, Vuex, or a specific framework, and picks up its endpoints/auth/HTTP/reactivity through constructor-provided seams. The overmind-gui codebase becomes the first consumer of the extracted library; its `src/utils/sseClient.ts` shrinks to a thin wrapper that instantiates the library with Vue 2 + axios + Vuex providers, preserving every existing call site without changes.

Alongside the code extraction, the change produces a human-facing `README.md` with PlantUML diagrams covering the connection lifecycle, transport dispatch (including `pendingInitialUpdates`), subscription merge/close/reconnect, and end-to-end examples for Vue 2, Vue 3, and framework-neutral consumers.

## What Changes

- Extract the SSE client into a new, self-contained folder `src/lib/sse-client/` comprising:
  - `sseClient.ts` — the core `SseClient` class (instantiable; no singleton; no hard framework imports).
  - `types.ts` — exported types: `SelectionShape`, `TransportSpec`, `ValueTriple`, `ValuesPayload`, `AggregatePayload`, `TransportUpdate`, `Handle`, `SubscriptionSpec`, `SubscriptionAggregate`, `Subscription`, `SseClientConfig`, `ReactivityAdapter`, `HttpPost`.
  - `reactivity.ts` — a `ReactivityAdapter` interface and three factory helpers: `plainAdapter` (no-op), `createVue2Adapter(Vue)`, `createVue3Adapter({ reactive, set })`. Each factory accepts the caller's imported framework module by value — the library itself does not import `vue`.
  - `index.ts` — re-exports the public surface.
  - `README.md` — how-to documentation with embedded PlantUML diagrams and runnable examples for Vue 2, Vue 3, and plain-JS consumers.
- Change the `SseClient` class to be instantiable via `new SseClient(config)`, where `config: SseClientConfig` carries:
  - `buildSseUrl(): string` — called on each connect to produce the `EventSource` URL.
  - `buildRegisterUrl(): string` / `buildDeregisterUrl(): string` — endpoint URL providers.
  - `authHeader?(): Record<string, string>` — optional auth-header provider called before each request.
  - `httpPost: (url: string, body: unknown, headers: Record<string, string>) => Promise<{ data: any }>` — injected HTTP adapter; consumers can pass axios, fetch, or any other client.
  - `reactivity?: ReactivityAdapter` — optional; defaults to `plainAdapter` (writes survive, but no framework-specific change tracking).
  - `debug?: boolean`, `reconnectDelayMs?: number` — optional tuning.
- Remove the `getInstance()` static singleton and the private constructor from the extracted class. The class becomes a plain exported class with a public constructor. Singleton-ness becomes a concern of the consumer.
- Replace `src/utils/sseClient.ts` with a thin wrapper (~30 lines) that:
  1. Imports `SseClient`, `createVue2Adapter`, types, etc. from `@/lib/sse-client`.
  2. Builds the config object from the existing Vuex getters (`rest/config`, `keycloak/token`).
  3. Uses `Vue.axios` as the `httpPost` adapter via a thin `async (url, body, headers) => Vue.axios.post(url, body, { headers })` wrapper.
  4. Uses `createVue2Adapter(Vue)` as the reactivity adapter.
  5. Exports a module-level singleton instance (`export const singleton = ...`) plus a compatibility `SseClient.getInstance()` static that returns the same singleton, so every existing import site (`import { SseClient } from '@/utils/sseClient'` and its `.getInstance()` / `.registerTransport` / `.subscribe` / etc. calls) keeps working with zero behavioral change.
  6. Re-exports the public types from the library so consumers can keep their current `import { Subscription, ... } from '@/utils/sseClient'` statements.
- Do NOT change any consumer code in `src/components/` or `src/views/`. Every current call site (Appliances, KioskPowerPanel, Floorplan, the six detail dialogs, App.vue, sse-connection-indicator) continues to compile and run exactly as today.
- Produce `README.md` inside the extracted folder with:
  - A short conceptual overview of transports, subscriptions, `representsGroups`, and aggregate payloads.
  - A minimal "installation" note (copy the folder, no npm install needed if your host provides Vue / axios / fetch).
  - PlantUML diagrams for: (a) connection + reconnect lifecycle, (b) `registerTransport` + `pendingInitialUpdates` dispatch, (c) `subscribe()` open/update/close including `representsGroups` mirroring, (d) class-level component diagram.
  - Code examples: Vue 2 reactive binding, Vue 3 reactive binding, plain-JS polling the `Subscription` fields, close-before-register race, aggregate subscription.

## Capabilities

### New Capabilities
<!-- None. The extraction preserves the existing sse-transport-client behavior; consumer-observable surface is identical. -->

### Modified Capabilities
- `sse-transport-client`: the "Singleton transport client service" requirement is updated to reflect the new file layout — the portable class lives at `src/lib/sse-client/sseClient.ts` and the overmind-gui singleton is provided by the wrapper at `src/utils/sseClient.ts`. All other requirements (endpoint URL build, register/unregister, transport dispatch, pathCache, reconnect, connected state, stray-update ignore, subscribe()/Subscription, close semantics, pendingInitialUpdates buffering) remain unchanged — the wrapper preserves every observable behavior, so every scenario in the main spec continues to hold.

## Impact

- Code:
  - New folder `src/lib/sse-client/` with 4 `.ts` files + `README.md`.
  - `src/utils/sseClient.ts` rewritten as a ~30-line wrapper (existing ~540-line file shrinks by ~500 lines; content moves into `src/lib/sse-client/sseClient.ts` with the framework couplings replaced by injected seams).
  - No changes to `src/components/*`, `src/views/*`, `src/store/*`. All existing import paths keep working.
- Dependencies: no new npm packages. The library has zero `import` statements from `vue`, `axios`, or `@/store`; all of those live in the wrapper.
- Backwards compatibility: every existing consumer continues to use `SseClient.getInstance()` and the same method signatures. The library's class signature (`new SseClient(config)`) is additive; the wrapper collapses it back to the singleton the rest of the app expects.
- Testing surface: the library can be unit-tested in isolation (no Vue / axios / Vuex setup needed). None of that test harness is introduced in this change — flagged as a follow-up.
- Documentation: `README.md` in the extracted folder is the new hand-off surface for someone porting to a sibling project. PlantUML diagrams are embedded as fenced code blocks; they render on GitHub when the user has a PlantUML renderer installed or can be copied into [plantuml.com](https://plantuml.com) for preview.
- Rollback: revert the commit. The wrapper's behavior is byte-equivalent to today's implementation, so partial revert (e.g., keep `src/lib/sse-client/` but restore the old `src/utils/sseClient.ts`) is also possible and leaves consumers unaffected.
