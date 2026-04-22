## 1. Create the extracted library folder

- [x] 1.1 Create directory `src/lib/sse-client/`.
- [x] 1.2 Create `src/lib/sse-client/types.ts` containing every existing exported type from `src/utils/sseClient.ts` — `AggregateOp`, `PerApplianceSelection`, `SelectionShape`, `TransportSpec`, `ValueTriple` (with the optional `representsGroups?: number[]` field), `ValuesPayload`, `AggregatePayload`, `TransportUpdate`, `TransportCallback`, `Handle`, `SubscriptionSpec`, `SubscriptionAggregate`, `Subscription` (with `values: Record<string, unknown> | null`) — plus three new exported types: `HttpPost` (the POST adapter signature), `ReactivityAdapter`, and `SseClientConfig`.
- [x] 1.3 Create `src/lib/sse-client/reactivity.ts` with `plainAdapter` (no-op), `createVue2Adapter(Vue)` factory, and `createVue3Adapter({ reactive })` factory. None of these import `vue` at module scope — they accept the caller's Vue module as an argument.

## 2. Move the core class into the library

- [x] 2.1 Create `src/lib/sse-client/sseClient.ts` and paste the current `SseClient` class body from `src/utils/sseClient.ts` into it, including the private helper functions (`flatKeysForSelection`, `selectedIdsForSelection`, `nextHandleId`) and the internal interfaces (`HandleRecord`, `SubscriptionRecord`).
- [x] 2.2 Remove the `getInstance()` static accessor, the private constructor, and the `singleton` export. Add a public `constructor (private readonly config: SseClientConfig) {}` signature.
- [x] 2.3 Replace every `Vue.axios.post(this.buildUrl('<key>'), body, { headers: this.authHeader() })` call with `await this.config.httpPost(this.config.buildRegisterUrl() /* or buildDeregisterUrl */, body, this.config.authHeader?.() ?? {})`.
- [x] 2.4 Replace `this.buildSseUrl()` with `this.config.buildSseUrl()` and remove the `buildSseUrl`/`buildUrl` private helpers (they are no longer needed once URL construction is delegated to the config).
- [x] 2.5 Replace `Vue.observable(shell)` in `buildSubscriptionShell` with `this.config.reactivity.observable(shell)`.
- [x] 2.6 Replace `Vue.set(sub.values, key, value)` in `dispatchToSubscription` with `this.config.reactivity.set(sub.values, key, value)`.
- [x] 2.7 Replace the top-level `const DEBUG_SSE = false` with per-call checks of `this.config.debug === true`.
- [x] 2.8 Replace the hard-coded `3000` ms reconnect delay in `scheduleReconnect` with `this.config.reconnectDelayMs ?? 3000`.
- [x] 2.9 Drop the `import Vue from 'vue'`, `import store from '@/store'`, and `import { singleton as objectUtils } from '@/utils/objectUtils'` lines from the library file. Add imports from sibling `./types` and `./reactivity` as needed.
- [x] 2.10 Make `SseClientConfig.reactivity` optional in the type; within the constructor, default it to `plainAdapter` if not provided (`this.config = { ...config, reactivity: config.reactivity ?? plainAdapter }`).

## 3. Create the library entry point

- [x] 3.1 Create `src/lib/sse-client/index.ts` that re-exports the public surface: `SseClient` from `./sseClient`; every exported type from `./types`; `plainAdapter`, `createVue2Adapter`, `createVue3Adapter`, `ReactivityAdapter` from `./reactivity`.

## 4. Write the README

- [x] 4.1 Create `src/lib/sse-client/README.md` with:
  - **Overview** — what an SSE transport is (server-side `EventSource` + per-subscription `transportId` routing), what a Subscription is (a reactive, long-lived view of a live selection), what `representsGroups` means (server-side group-mirroring for member appliances), what aggregate payloads are (server-computed sums/averages).
  - **Install** — "Copy `src/lib/sse-client/` into your project; provide a `SseClientConfig` to the constructor".
  - **Configuration** — each `SseClientConfig` field, what it does, example adapter for axios and for fetch.
  - **Reactivity** — `plainAdapter`, `createVue2Adapter(Vue)`, `createVue3Adapter({ reactive })`, when to pick which.
- [x] 4.2 Add PlantUML diagram: **Connection lifecycle** — sequence diagram covering first connect, `connected` event, `onerror`, reconnect timer, new `connected` event, re-register sweep. Fenced with ```` ```plantuml ```` / ```` ``` ```` so PlantUML-aware renderers render it.
- [x] 4.3 Add PlantUML diagram: **Transport register + `pendingInitialUpdates` dispatch** — sequence diagram showing a caller's `registerTransport` POST, an arrival of a `transport-update` event before the POST response lands (buffered into `pendingInitialUpdates`), the POST response landing, the buffered update replayed, the Promise resolving.
- [x] 4.4 Add PlantUML diagram: **Subscription lifecycle** — sequence diagram covering `subscribe(spec)` synchronous return, background `registerTransport` fire-and-forget, first `transport-update` arriving, `dispatchToSubscription` mirroring via `representsGroups` into `sub.values`, subsequent deltas, `sub.close()` invalidating generation, server deregister.
- [x] 4.5 Add PlantUML diagram: **Class overview** — component diagram with `SseClient` at the center; inputs `SseClientConfig` (with `httpPost`, `buildSseUrl`, `buildRegisterUrl`, `buildDeregisterUrl`, `authHeader`, `reactivity`, `debug`, `reconnectDelayMs`); outputs `Subscription` and `Handle`; neighbors `HandleRecord` / `SubscriptionRecord` / `pathCache` / `pendingInitialUpdates`.
- [x] 4.6 Add **Examples** section:
  - **Vue 2 example** — `import Vue from 'vue'; import axios from 'axios'; import { SseClient, createVue2Adapter } from './sse-client'; const sse = new SseClient({ buildSseUrl: () => '...', buildRegisterUrl: () => '...', buildDeregisterUrl: () => '...', httpPost: (url, body, headers) => axios.post(url, body, { headers }), reactivity: createVue2Adapter(Vue), authHeader: () => ({ Authorization: 'Bearer ...' }) });` — then a minimal `.vue` component using `subscribe()` with `<template>{{ sub.values['148:relays[0].power'] }}</template>`.
  - **Vue 3 example** — same but `createVue3Adapter({ reactive })` and a `<script setup>` component.
  - **Framework-neutral example** — `plainAdapter` (no reactivity), a `setInterval` that reads `sub.values` and renders to the DOM directly.
  - **Aggregate example** — show `sub.aggregate.value` reactive binding.
  - **Close-before-register example** — show that calling `sub.close()` before the first payload is safe.
- [x] 4.7 Add **Migration from the old callback API** — a short note showing that `registerTransport(spec, cb)` is still available for consumers that prefer message-style dispatch, and a pointer to `subscribe(spec)` for new code.

## 5. Rewrite `src/utils/sseClient.ts` as a wrapper

- [x] 5.1 Replace the content of `src/utils/sseClient.ts` with a ~30-line wrapper that: imports `Vue`, `store`, `objectUtils`, and `SseClient as CoreSseClient` + `createVue2Adapter` + relevant types from `@/lib/sse-client`; defines helper functions `buildSseUrl()`, `buildRegisterUrl()`, `buildDeregisterUrl()`, `authHeader()` that read from `store.getters['rest/config']` and `store.getters['keycloak/token']` (moving the existing logic verbatim); constructs a single module-level `singleton = new CoreSseClient({ ... })`; exports a facade `SseClient` with a `getInstance(): CoreSseClient` static method that returns the singleton; re-exports every public type (`Handle`, `Subscription`, `SubscriptionSpec`, `TransportSpec`, `ValueTriple`, `ValuesPayload`, `AggregatePayload`, `TransportUpdate`, `TransportCallback`, `SelectionShape`, `PerApplianceSelection`, `SubscriptionAggregate`, `AggregateOp`) from `@/lib/sse-client`.
- [x] 5.2 Keep the `export const singleton = ...` export (separately from the `SseClient.getInstance()` shim) so any code using `import { singleton } from '@/utils/sseClient'` continues to resolve.

## 6. Lint and build

- [x] 6.1 Run `npx eslint src/lib/sse-client src/utils/sseClient.ts` and confirm no new warnings. Pre-existing warnings in other files are acceptable.
- [x] 6.2 Run `npm run build` under Node 14 and confirm clean compilation. All current consumers (`Appliances.vue`, `KioskPowerPanel.vue`, `Floorplan.vue`, the six detail dialogs, `App.vue`, any `sse-connection-indicator` code) SHALL continue to compile without any source edits outside the library + wrapper.

## 7. Manual verification (dev server)

- [x] 7.1 Run `npm run serve` and smoke-test the main flows with the wrapper-backed singleton: Appliances tiles updating, floorplan tiles live and not flashing disconnected, a floorplan detail dialog open + live + close + reopen, a kiosk front-face cell bar animating, a kiosk detail view opening with correct per-appliance power values.
- [x] 7.2 Simulate a brief SSE reconnect (stop/start the server). Confirm the wrapper's singleton recovers: `EventSource` re-opens, all live handles + subscriptions re-register, per-path values persist across the gap and update on reconnect.
- [x] 7.3 With the Network tab open, confirm paired `POST /sse/transports/register` + `POST /sse/transports/deregister` calls still fire per consumer open/close cycle — no regression from the HTTP adapter swap.

## 8. Cross-check against spec

- [x] 8.1 Walk every scenario in `openspec/specs/sse-transport-client/spec.md` (post-sync, including the subscribe/representsGroups/wildcard/close-clearing/reconnect-preservation scenarios) against the wrapper-backed singleton. Every scenario MUST continue to hold because the wrapper preserves every observable behavior.
- [x] 8.2 Walk the four new scenarios under "Singleton transport client service" in this change's spec delta (Singleton access, Library class is instantiable independently of the wrapper, Library has no hard framework imports, Wrapper provides overmind-gui-specific integration). Confirm each holds via a grep for forbidden imports in `src/lib/sse-client/` and a construction-site check of the wrapper.
