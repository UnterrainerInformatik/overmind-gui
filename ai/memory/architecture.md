---
name: architecture
description: Source-tree layout and how the pieces fit together — main.ts, App.vue, router, views, components, store, utils, plugins.
---

# Source tree

```
src/
├── main.ts               # entry: wires Vue, vuetify, i18n, store, router, axios
├── App.vue               # root: v-app + v-navigation-drawer + v-app-bar + <router-view>
├── router/index.ts       # VueRouter, history mode, lazy-loaded views
├── store/
│   ├── index.ts          # new Vuex.Store, modules: { gui, rest }, version state
│   ├── rest.ts           # namespaced; servers[] + endpoint[] config only
│   └── gui/
│       ├── index.ts      # namespaced; kioskMode/modalLoading/drawerVisible/floorplan
│       ├── snackbar.ts   # message queue (FIFO, capped at 10)
│       └── toolTips.ts   # tooltip enable + openDelay
├── plugins/vuetify.ts    # explicit component imports (not auto), theme colors
├── locales/
│   ├── i18n.ts           # derives `de` from `en` via Object.assign merge
│   ├── en-US.json
│   └── de-AT.json
├── styles/               # _colors.scss, _fonts.scss, _index.scss (auto-imported)
├── router/index.ts
├── views/                # page components (one per route)
│   ├── KioskOverview.vue, KioskLights/Plugs/Movement/Contact/Camera/Video.vue
│   ├── Switches.vue, Plans.vue, Appliances.vue, WindowContacts.vue
│   ├── System.vue, About.vue, Test.vue, ColorTest.vue, page404.vue
├── components/           # reusable UI
│   ├── floorplan/        # Floorplan.vue + dialogs/ (one per device type)
│   ├── input/            # Debounced{Brightness,OnOff,Rgbw,Bw}… inputs
│   ├── Kiosk*.vue        # kiosk-mode panels (Clock, Link, Power, Switch, …)
│   ├── *Panel.vue        # regular panels (Switch, Appliance, Plan, WindowContact)
│   └── NavDrawer.vue, AppBarMenu.vue, Snackbar.vue, ModalLoading.vue
└── utils/
    ├── axiosUtils.ts             # the single HTTP layer; see webservices-layer.md
    ├── webservices/              # service wrappers (see webservices-layer.md)
    ├── observableMap.ts          # Vue-reactive Map wrapper (manual change tracking)
    ├── doubleBufferedObservableMap.ts
    ├── debouncer.ts              # rate-limit helper; see polling-pattern.md
    ├── overmindUtils.ts          # domain helpers (temp→color, icons, on/off state)
    ├── jsUtils.ts                # generic helpers (lerp, groupBy, clamp, …)
    ├── loggingUtils.ts           # routes messages to snackbar (disabled by default!)
    ├── objectUtils.ts            # getDeepProperty('a.b.c', obj)
    ├── dateUtils.ts
    └── vueUtils.ts
```

## Layer cake

1. **View** (`views/*.vue`) — subscribes to polling, passes data to components.
2. **Component** (`components/*.vue`) — renders + emits commands (turnOn, trigger).
3. **Service singleton** (`utils/webservices/*Service.ts`) — typed wrapper
   around one REST endpoint; extends `BaseService`.
4. **BaseService / axiosUtils** — resolves endpoint path from `rest/config`,
   builds URL from `rest/config/servers.uinf.{protocol,address,port}`, attaches
   Keycloak bearer token, wraps errors into the snackbar logger.
5. **Vuex** — only for UI state + REST config. **Domain data is NOT in Vuex**;
   views hold raw responses in component `data()`.

## Namespacing in the store

Accessors use slash paths because of nested namespaced modules:

- `gui/kioskMode`, `gui/drawerVisible`
- `gui/tooltips/tooltips`, `gui/tooltips/openDelay`
- `gui/snackbar/snackbarEnqueue` (action)
- `rest/config` (getter returning the whole config object)

## Alias

Webpack `@` → `src/` (used everywhere). tsconfig has the same paths mapping.
