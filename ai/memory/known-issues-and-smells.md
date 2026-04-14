---
name: known-issues-and-smells
description: Architectural rough edges and latent bugs found during review — things to be aware of before changing related code.
---

# Known issues and code smells

These are observations from an architectural review — not all are bugs to
fix immediately, but each is worth knowing about before touching the
related area.

## 1. Keycloak is referenced but never registered

`src/utils/axiosUtils.ts:34` reads `store.getters['keycloak/token']` but
`src/store/index.ts` only registers `{ gui, rest }`. There is no keycloak
module. Result: the getter is always `undefined`, no `Authorization`
header is ever sent. Auth currently relies on the server not checking.

`src/components/NavDrawer.vue` also filters items by
`keycloakClientRoles.includes(subItem.role)` — also undefined at runtime,
so any item with a `role` restriction silently disappears.

`package.json` does **not** list `keycloak-js` as a dependency either
(though the README mentions it existed historically).

**Implication:** either wire up Keycloak properly (add module, import the
library, populate the token/roles on login) or remove the dead code.

## 2. Logger is deactivated by default

`src/utils/loggingUtils.ts` has `private activated = false` and every
public method early-returns if not activated. Nothing in the codebase
sets `log.activated = true`. Consequence: every error caught by
`axiosUtils.appendErrorCatcher` (which calls `log.error`) is silently
swallowed — no snackbar, no console, nothing except the thrown
`'Internal Error.'` which may or may not bubble to a view handler.

**Implication:** when debugging failed REST calls, temporarily flip
`activated = true` or add a `console.error` in `appendErrorCatcher`.

## 3. KioskOverview hardcodes appliance IDs

`views/KioskOverview.vue` contains ~200 lines of hardcoded `id: N` entries
in the `KioskPowerPanel :data` prop and in `reload()` (ids 12, 22, 38, 48,
54, 55, 56, 71–73, 94–96, 102–140, 142–176, 183). Editing which appliances
appear on the wall dashboard requires a code change + rebuild + redeploy.

**Implication:** consider moving this to a backend endpoint or `config.js`.

## 4. The version string is duplicated

`package.json.version` and `src/store/index.ts` root state `version:
'0.1.4'` must be kept in sync by hand. `About.vue` likely reads the Vuex
version, not the package one. Bumping one without the other is easy to miss.

## 5. Mixed JS / TS inside a nominally-TS project

`tsconfig.json` has `allowJs: true` and `noImplicitAny: false`. Services,
router, and store are TypeScript; most views and components use
`<script lang="js">`. New files default inconsistently depending on which
file the author copied.

**Implication:** type-checking coverage is patchy. Adding strict types to
a changed area is good; wholesale conversion is a large project.

## 6. Singleton idiom is copy-pasted

Every `*Service.ts` and `*Utils.ts` has the same boilerplate:

```ts
public static getInstance () {
  if (!this.instanceField) {
    this.instanceField || (this.instanceField = new Foo())
  }
  return this.instanceField
}
```

The `instanceField || (…)` expression is a redundant no-op. A shared
`SingletonBase<T>` or a plain module-level `export const singleton = new Foo()`
would be both shorter and less error-prone.

## 7. No tests, no CI

`package.json` has no `test` script and no test framework. The README
mentions historical Jest setup steps, but the dependencies are gone.
There is no `.github/workflows/`, no CI config, no lint-on-commit hook.
Quality is entirely manual.

## 8. Dev / build Node versions are drifting apart

As of 2026-04-14 the user develops locally on **Node 20**, but the
`Dockerfile` still has `FROM node:14.15.0-alpine` and the `README.md`
still says "this project runs on NodeJS v14.15.0 and we cannot update
it". So:

- **Dev**: Node 20 (current)
- **Build/deploy image**: Node 14.15.0 (from the Dockerfile)
- **README**: says Node 14.15.0 is required

Any feature that relies on a Node 20 built-in will pass locally and
fail in the Docker build. Either bump the Dockerfile and README to
match the dev runtime, or treat Node 14 as the real lower bound when
writing code. The user wants to stay on Vue 2 / Vuetify 2 — this is
about the Node runtime, not the framework version.

## 9. Polling hammers the server on error

See `polling-and-debouncing.md`. If the REST API is down, every list
view keeps polling at its configured rate with no backoff. With the
default intervals (Plans = 1 s, Switches = 5 s) and several open views,
that's 5+ requests per second continuously until recovery.

## 10. Kiosk mode is sticky

See `kiosk-mode.md` § Exiting. Once `gui.kioskMode` is set, nothing
resets it unless you navigate to a non-kiosk view that happens to also
set it — which none currently do.

## 11. `ObservableMap` return types lie

Every read method returns `number | V` (because of
`this.binding() && this.map.get(key)`). Callers use it as `V`. Strict
TypeScript will not accept this.

## 12. `Debouncer` constructor defaults

`new Debouncer()` calls `super` with `undefined`, and the class assigns
`this.timeout = timeout` → `undefined`. `setTimeout(fn, undefined)` is
effectively 0 ms. The "no-timeout mode" actually runs as "0ms timeout",
which is fine but not what the type annotation suggests.

## 13. `package.json` version drift vs README

`package.json` says `"version": "0.1.4"`, README documents installation
steps for `ms-gui@0.8.4`. Pick one.
