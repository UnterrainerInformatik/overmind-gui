---
name: state-management
description: Vuex store shape — what is in the store, what intentionally isn't (domain data), and the accessor conventions.
---

# State management

## Store shape

```
root state = { version: '0.1.4' }
modules (namespaced):
├── gui
│   state:  { kioskMode, modalLoading, drawerVisible, lastMdAndUp, floorplan }
│   submodules:
│   ├── snackbar  { visible, messages[] }        # FIFO queue, cap 10
│   └── tooltips  { tooltips, openDelay }
└── rest
    state:  { config: { servers, endpoint } }     # read-only config registry
```

## Conventions

- **Everything is namespaced.** Access via slash paths:
  `mapGetters('gui', {...})`, `store.dispatch('gui/snackbar/snackbarEnqueue', msg, { root: true })`.
- Every store module defines an action for each mutation; actions return
  `Promise.resolve()`. Components call actions, never mutations directly.
- `drawerVisible` action takes `{ value, time }` and uses `setTimeout` to delay
  the commit — used so the drawer closes after the route change animation.

## What's NOT in the store

**Domain data (appliances, plans, switches) is deliberately kept out of Vuex.**
Each view holds its own `data: { raw: {}, filtered: {} }` and re-fetches on a
timer. If you need cross-view sharing, consider whether a module makes sense
or whether a shared service singleton with an ObservableMap would fit better
— the codebase already uses `ObservableMap` for Vue-reactive Maps when Vuex
would be overkill.

## Persistence

Three settings are persisted to `localStorage` and re-read in `App.vue`
`mounted()`:

- `languageKey` → `$i18n.locale` (default `'de'`)
- `darkTheme` → `$vuetify.theme.dark` (default `'false'` — note: string!)
- `tooltips` → `gui/tooltips/tooltips`

No other persistence. There is no auth-token persistence (see known-issues.md).

## Version string

Root state `version: '0.1.4'` is used by the About view and is meant to mirror
`package.json.version`. **Bumping the package version does not auto-update
this string** — it's duplicated.
