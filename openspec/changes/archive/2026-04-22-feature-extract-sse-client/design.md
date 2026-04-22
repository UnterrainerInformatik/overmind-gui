## Context

Today's `src/utils/sseClient.ts` carries four kinds of responsibility in one file:

1. **Protocol-level transport plumbing** — the `EventSource`, `connected`/`transport-update` event handlers, `connectionId` tracking, `byTransportId` routing, `pendingInitialUpdates` buffering, `pathCache`, reconnect-and-re-register logic. This is the reusable core.
2. **Typed public API** — `registerTransport`/`unregisterTransport`/`getLatestPath`/`subscribe` + all the interfaces (`TransportSpec`, `ValueTriple`, `Subscription`, `SelectionShape`, …). Also reusable.
3. **Vue 2 reactivity wiring** — `Vue.observable(shell)`, `Vue.set(sub.values, key, v)`, plus the `reactive` field shapes on `Subscription`. Today hard-wired to Vue 2.
4. **overmind-gui–specific glue** — `import Vue from 'vue'` (pulling axios along via `Vue.axios`), Vuex getters for `rest/config` + `keycloak/token`, the endpoint key literals `'sseAppliances'`, `'sseTransportsRegister'`, `'sseTransportsDeregister'`, and the `SseClient.getInstance()` static singleton. Not reusable.

Responsibilities 1 and 2 are what a sibling project wants. 3 is wanted but in a form the sibling can opt into Vue 3 for. 4 is actively in the way.

The extraction lifts 1 + 2 out of the current file, provides seams for 3 and 4, and leaves 4 behind as a small wrapper that instantiates the library with overmind-gui's specifics. The existing `sse-transport-client` capability spec describes *observable* behavior (requirements written in terms of HTTP calls and event routing), so the refactor preserves every requirement except the one that names the file path and the singleton mechanism.

## Goals / Non-Goals

**Goals:**

- Produce a self-contained `src/lib/sse-client/` folder that any project can copy verbatim and use with its own HTTP client, its own endpoint/auth config, and its own (or no) reactivity framework.
- Preserve every observable behavior of the current client: request/response shapes, event routing, `pendingInitialUpdates` replay, pathCache semantics, reconnect + re-register, `subscribe()` cache merge + `representsGroups` mirror + wildcard dynamic keys + close-before-registered race handling.
- Keep every current call site in overmind-gui working with zero change. `SseClient.getInstance()` keeps returning a module-level singleton. All existing type imports (`Subscription`, `ValueTriple`, etc.) keep resolving from `@/utils/sseClient`.
- Ship Vue 2 + Vue 3 reactivity adapters as opt-in factories so sibling projects on either version work out of the box, without the library itself importing `vue`.
- Ship a human-readable `README.md` with PlantUML diagrams for lifecycle, dispatch, subscription, and a class-level overview, plus Vue 2 / Vue 3 / plain-JS examples.

**Non-Goals:**

- Not publishing the library as an npm package. Distribution is "copy the folder". Turning it into a package (with its own `package.json`, build, publish pipeline) is a separate concern and is deferred.
- Not adding a test harness. The repo has no Jest/Vitest/Mocha setup today (noted in `fix-dimmer-slider-feedback-loop`'s archived tasks.md); introducing one is project-wide tooling work. The library is verified through the overmind-gui consumers' existing manual test flows.
- Not changing any consumer code. This is explicitly a non-refactor for `src/components`, `src/views`, `src/store`.
- Not changing the SSE wire protocol, endpoint URLs, or the shape of any spec's requirements beyond the one that names the implementation file path.
- Not introducing ESM-vs-CommonJS output formats. The extracted `.ts` files are the source; consumers compile with their own toolchain.
- Not writing an npm-shaped `package.json` or `tsconfig.json` inside the extracted folder. The folder's files compile under the host project's TypeScript settings. If the sibling project has stricter or looser settings, minor adjustments may be needed at copy time — documented in the README.

## Decisions

### Decision 1: Four files in a folder, not one file

Although a single-file extract would be the most trivial to copy, the current implementation is ~550 lines with ~70 lines of type declarations, ~50 lines of the Vue-specific reactivity seam, and the rest being the transport/subscription logic. Splitting into `sseClient.ts` (core) + `types.ts` (interfaces) + `reactivity.ts` (adapters) + `index.ts` (re-exports) + `README.md` gives each file one reason to be modified and makes the reactivity-adapter seam grep-discoverable. Copy cost is one folder instead of one file; negligible difference for the user.

An `index.ts` barrel re-exports the public surface so consumers `import { SseClient, Subscription, createVue2Adapter, ... } from './sse-client'` without needing to know the internal file layout.

**Alternatives considered:**

- *Single flat file with a `// --- reactivity ---` comment section*: smallest copy unit, but a larger blob to navigate and a harder time keeping reactivity-adapter changes in their own commit. Rejected.
- *Split further (e.g., `pendingInitialUpdates.ts`, `subscription.ts`, `reconnect.ts`)*: over-engineered for a ~550-line codebase. Rejected.

### Decision 2: `SseClientConfig` is a plain object of callbacks, not a class hierarchy

The constructor accepts one config object with these fields:

```typescript
interface SseClientConfig {
  buildSseUrl: () => string
  buildRegisterUrl: () => string
  buildDeregisterUrl: () => string
  authHeader?: () => Record<string, string>
  httpPost: HttpPost
  reactivity?: ReactivityAdapter
  debug?: boolean
  reconnectDelayMs?: number
}

type HttpPost = (
  url: string,
  body: unknown,
  headers: Record<string, string>
) => Promise<{ data: unknown }>
```

Each URL builder is called *every time* a URL is needed, not cached. This lets consumers change connection targets at runtime (e.g., after a config reload) without reconstructing the client. `authHeader()` is called before every request for the same reason — tokens rotate, and we should always read the latest.

`httpPost` is typed as returning `Promise<{ data: unknown }>` to match both `axios.post`'s `{ data, status, ... }` envelope and a thin fetch-wrapper that returns `{ data: <parsed json> }`. Consumers that want the response body only need the `data` field; the envelope is an implementation convenience.

`reactivity` defaults to `plainAdapter` — the library still functions without a framework, just without reactivity notifications on the `Subscription` fields. Consumers that want Vue 2 or Vue 3 pass the corresponding factory result.

`debug` defaults to `false`. When `true`, the client emits `console.debug` messages tagged `[SSE]` — identical to today's `DEBUG_SSE` constant, now runtime-configurable.

`reconnectDelayMs` defaults to `3000` — matches today's hard-coded `setTimeout`.

**Alternatives considered:**

- *Pass a config object with static fields (url string, auth header string, ...)*: rejected; tokens and URLs change over the lifetime of the connection, so values-at-construction-time are too rigid.
- *Inject a full `HttpClient` interface with `get`, `post`, `delete` methods*: rejected; the client only needs `POST`, so a single `httpPost` callback is simpler and less surface to maintain.
- *Make the library discover Vue dynamically via `require('vue')` or a dynamic `import`*: rejected; implicit dependencies defeat the point of injection.

### Decision 3: `ReactivityAdapter` has exactly two operations — `observable(obj)` and `set(obj, key, value)`

```typescript
interface ReactivityAdapter {
  observable<T extends object>(obj: T): T
  set<T extends object, K extends keyof T | string>(obj: T, key: K, value: unknown): void
}
```

`observable()` wraps a plain object so framework-specific reactivity can track mutations on it. `set()` adds or updates a property in a way that the framework notices (important for Vue 2's dynamic-key case). Both operations are `<T>`-generic so the adapter doesn't widen types unnecessarily.

The three ship-ready factories are:

```typescript
export const plainAdapter: ReactivityAdapter = {
  observable: obj => obj,
  set: (obj, key, value) => { (obj as any)[key] = value }
}

export function createVue2Adapter (Vue: {
  observable: <T extends object>(o: T) => T
  set: <T extends object>(o: T, k: string, v: unknown) => void
}): ReactivityAdapter {
  return {
    observable: obj => Vue.observable(obj),
    set: (obj, key, value) => Vue.set(obj, key as string, value)
  }
}

export function createVue3Adapter (vueReactivity: {
  reactive: <T extends object>(o: T) => T
}): ReactivityAdapter {
  return {
    observable: obj => vueReactivity.reactive(obj),
    set: (obj, key, value) => { (obj as any)[key] = value } // Vue 3 reactive handles dynamic keys natively
  }
}
```

The caller passes in their Vue module (Vue 2's default export, or `{ reactive }` from Vue 3). The library itself never `import`s `vue`, keeping the copy drop-in for non-Vue projects.

**Alternatives considered:**

- *Auto-detect Vue version from the passed module*: rejected; magic detection fails in mixed environments (server-side, test doubles) and obscures what adapter is actually in use.
- *Expose a richer `ReactivityAdapter` (delete, watch, ...) so consumers can build more*: rejected; the client only mutates pre-built subscription objects and adds new wildcard keys. Two operations are enough.

### Decision 4: The core class is instantiable; singleton-ness is the wrapper's job

```typescript
// library:
export class SseClient {
  constructor (private readonly config: SseClientConfig) { ... }
  registerTransport (...) { ... }
  unregisterTransport (...) { ... }
  getLatestPath (...) { ... }
  subscribe (...) { ... }
  get connected () { return this._connected }
}

// wrapper (src/utils/sseClient.ts):
import Vue from 'vue'
import store from '@/store'
import { SseClient as CoreSseClient, createVue2Adapter } from '@/lib/sse-client'
// ... build config from store getters ...
const singleton = new CoreSseClient({ ... })
export const SseClient = {
  getInstance: () => singleton
}
export { Handle, Subscription, SubscriptionSpec, TransportSpec, ValueTriple, /* ... */ } from '@/lib/sse-client'
```

The wrapper preserves the `SseClient.getInstance()` call pattern used by every current consumer. Under the hood, the singleton is a plain module-level variable; there is no private constructor, no static field, no `if (!this.instanceField)` guard. If a future overmind-gui change wants a second instance (e.g., for testing, or to connect to a second backend), the wrapper is the only place that needs to be taught about it.

Type re-exports from the wrapper keep all of `import { Subscription } from '@/utils/sseClient'`-style statements working. Consumers can migrate to `import ... from '@/lib/sse-client'` at their convenience.

### Decision 5: `README.md` is part of the extraction; PlantUML is embedded as fenced code blocks

The README lives inside the extracted folder (`src/lib/sse-client/README.md`) so it travels with the code on copy. PlantUML is embedded as fenced code blocks with the `plantuml` language tag:

````markdown
```plantuml
@startuml
... diagram source ...
@enduml
```
````

This form renders on platforms with PlantUML support (GitHub with a plugin, VS Code PlantUML extension, plantuml.com) and is legible as raw text otherwise. The alternative — checking rendered SVGs into the repo — is larger, harder to review, and stale-prone.

Four diagrams are included:

1. **Connection lifecycle** — sequence diagram: `ensureConnection` → EventSource → `connected` event → `connectionId` bind → `onerror` → reconnect timer → `ensureConnection` again.
2. **Transport register + `pendingInitialUpdates` dispatch** — sequence diagram: caller → `registerTransport` → POST /register → Promise held → meanwhile `transport-update` arrives → buffered in `pendingInitialUpdates` → POST response lands → replay buffered update → resolve Promise with handle.
3. **Subscription lifecycle** — sequence diagram: caller → `subscribe(spec)` returns shell synchronously → background `registerTransport` → first `transport-update` → reactive merge into `sub.values` with `representsGroups` mirror → later updates → close → deregister.
4. **Class overview** — component diagram showing `SseClient` ←→ `SseClientConfig` (with injected `httpPost`, `buildSseUrl`, `authHeader`, `reactivity`) ←→ `Subscription` ←→ `HandleRecord`/`SubscriptionRecord`.

Each diagram is paired with prose explaining what the reader should take away.

Examples section covers three recipes: Vue 2, Vue 3, framework-neutral. Each recipe is ~20 lines of runnable code showing: constructing the client, opening a subscription, binding a value, closing the subscription on teardown. Plus a short "How to migrate from the old `registerTransport` callback API" aside for projects currently using that shape.

## Risks / Trade-offs

- **Wrapper vs. drift** → the overmind-gui wrapper and the extracted library will evolve together; breakage in the wrapper layer would affect overmind-gui first, which is the best early warning. A sibling project using the extracted library without the wrapper would notice changes only on next copy.
- **`getInstance()` compatibility shim** → preserving the static-method call pattern in the wrapper means the wrapper exports a `{ getInstance }` object rather than a class. TypeScript users who currently write `SseClient.prototype.something` (none today) would break; doesn't matter for the codebase as it stands.
- **`plainAdapter` means "no reactivity"** → a consumer that forgets to pass a framework adapter still gets working value writes, but templates and watchers won't fire. Documented prominently in README; the Vue 2 / Vue 3 examples show the correct setup.
- **README PlantUML not rendered inline in a default GitHub view** → rendering requires a plugin or copying into plantuml.com. Accepted; the raw source is legible and survives git history. If the sibling project needs rendered PNGs, they can generate them from the fenced blocks.
- **Library ships no tests** → verified only through overmind-gui's consumer flows. A future change can add an isolated test harness once the sibling project has its own use cases to regression-test against.
- **Breaking any behavior is a regression for every consumer** → mitigated by doing the extraction as a pure move: every line of the existing `sseClient.ts` either goes into the library verbatim, goes into the wrapper verbatim (the Vue/axios/store lines), or maps 1:1 to a library config callback. No algorithmic changes.

## Migration Plan

Client-only. No data migration, no feature flag, no server changes.

1. Create `src/lib/sse-client/` folder and its five files (`index.ts`, `types.ts`, `reactivity.ts`, `sseClient.ts`, `README.md`).
2. Populate `types.ts` by moving every `export type` / `export interface` from the current `sseClient.ts` verbatim, plus the new `SseClientConfig`, `ReactivityAdapter`, `HttpPost` types. The library's types are the single source of truth.
3. Populate `reactivity.ts` with `plainAdapter` + `createVue2Adapter` + `createVue3Adapter` as per Decision 3.
4. Populate `sseClient.ts` with the core class. Replace every `Vue.axios.post(...)` with `this.config.httpPost(...)`. Replace every `Vue.observable(...)` with `this.config.reactivity.observable(...)`. Replace every `Vue.set(...)` with `this.config.reactivity.set(...)`. Replace every `store.getters['rest/config'].servers / endpoint` read with `this.config.buildSseUrl()` / `this.config.buildRegisterUrl()` / `this.config.buildDeregisterUrl()`. Replace every `store.getters['keycloak/token']`-derived `authHeader()` with `this.config.authHeader?.() ?? {}`. Replace `DEBUG_SSE` constant with `this.config.debug === true`. Replace `3000` reconnect delay with `this.config.reconnectDelayMs ?? 3000`. Remove `SseClient.getInstance()` and the private constructor; make the class exported + plain.
5. Populate `index.ts` as a re-export barrel.
6. Populate `README.md` with overview, install, four PlantUML diagrams, three examples, migration notes.
7. Rewrite `src/utils/sseClient.ts` as a ~30-line wrapper: build config, construct singleton, export `SseClient.getInstance()` shim and the type re-exports.
8. Run `npx eslint` across the new folder + the rewritten wrapper; address any warnings introduced by the move (pre-existing warnings in unrelated files acceptable).
9. Run `npm run build`; confirm compilation clean and every consumer continues to import `SseClient.getInstance()` / `Subscription` / `ValueTriple` / etc. without edit.
10. Manual verification on the dev server: exercise Appliances tiles, a kiosk detail view, a floorplan detail dialog, and reconnect behavior. Every scenario from the post-archive `sse-transport-client` main spec continues to hold.
11. (Optional, for the sibling project) Copy `src/lib/sse-client/` to the other project. Provide its own config with its own HTTP client and (if Vue 3) `createVue3Adapter({ reactive: vue.reactive })`. Library works without any source edits.

Rollback is a git revert; the wrapper restores the file's previous content and the library folder is gone, which is harmless because no consumer imports from it yet.
