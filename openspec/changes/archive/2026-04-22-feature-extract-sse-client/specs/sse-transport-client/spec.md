## MODIFIED Requirements

### Requirement: Singleton transport client service

The system SHALL provide a portable, instantiable `SseClient` class in `src/lib/sse-client/sseClient.ts`, and SHALL expose a module-level singleton of it from `src/utils/sseClient.ts` via a `SseClient.getInstance()` static accessor. The library class SHALL have no hard-coded dependency on Vue, axios, or a Vuex store; instead, it SHALL accept all framework-specific and project-specific integration points through its constructor-supplied `SseClientConfig` object (URL builders, auth header provider, HTTP POST adapter, reactivity adapter, debug flag, reconnect delay). The overmind-gui wrapper at `src/utils/sseClient.ts` SHALL construct exactly one instance using this project's Vue 2 reactivity, its `Vue.axios` HTTP client, and its Vuex `rest/config` / `keycloak/token` getters, and SHALL re-export that instance as the singleton that every component consumes via `SseClient.getInstance()`. The wrapper SHALL also re-export the public type surface of the library (e.g. `Subscription`, `SubscriptionSpec`, `TransportSpec`, `ValueTriple`, `Handle`) so existing consumer imports from `@/utils/sseClient` continue to resolve.

#### Scenario: Singleton access

- **WHEN** multiple components import and call `SseClient.getInstance()` from `@/utils/sseClient`
- **THEN** they all receive the same instance
- **AND** that instance is an instance of the core class defined in `src/lib/sse-client/sseClient.ts`

#### Scenario: Library class is instantiable independently of the wrapper

- **WHEN** a consumer imports the core class from `@/lib/sse-client` and calls `new SseClient(config)` with a valid `SseClientConfig`
- **THEN** the returned object is a fully-functional `SseClient` that honors every requirement of this capability when exercised through its public methods
- **AND** no reference to `Vue`, `axios`, or the Vuex store is required at the call site

#### Scenario: Library has no hard framework imports

- **WHEN** the files under `src/lib/sse-client/` are examined for top-level `import` statements
- **THEN** no file imports from `vue`, `axios`, `@/store`, `@/utils/objectUtils`, or any other project-specific module
- **AND** the only imports permitted are from TypeScript standard lib types and from sibling files inside `src/lib/sse-client/`

#### Scenario: Wrapper provides overmind-gui-specific integration

- **WHEN** `src/utils/sseClient.ts` constructs its singleton
- **THEN** the `SseClientConfig` it passes uses `Vue.axios.post` as its `httpPost` adapter
- **AND** its `buildSseUrl` / `buildRegisterUrl` / `buildDeregisterUrl` read from Vuex `rest/config` getters
- **AND** its `authHeader` reads from the Vuex `keycloak/token` getter
- **AND** its `reactivity` is the Vue 2 adapter produced by `createVue2Adapter(Vue)` from `@/lib/sse-client/reactivity`
