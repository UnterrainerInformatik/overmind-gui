---
name: overview
description: High-level "what is this project" — purpose, tech stack, backend, deployment target. Load first when working on unfamiliar parts.
---

# overmind-gui

Vue 2 SPA that acts as the GUI front-end for **Overmind**, a home-automation
system. The backend is the **java-overmind-server** project (separate repo,
Java) served from `overmindserver.unterrainer.info` by default
(see `src/store/rest.ts`). The GUI is the only way end-users interact with
the system, and the whole stack runs on a private home LAN accessed via VPN
from outside — see `deployment-and-environment.md`.

## Purpose

Control and observe a personal smart-home: switches, lights, plugs, motion
sensors, window contacts, cameras, temperature/humidity sensors, power meters,
solar/battery, "plans" (automation scenes/rules), floorplans, and kiosk wall
displays.

## Tech stack (locked on Vue 2 / Vuetify 2 — no Vue 3 migration yet)

- **Node runtime**: user develops on **Node 20** (as of 2026-04-14).
  The README still says "Node 14.15.0, cannot update" and the `Dockerfile`
  still pins `node:14.15.0-alpine` — **potential drift**, see
  `deployment-and-environment.md`.
- **Vue 2.6.14** + **vue-class-component** + **vue-property-decorator**
  — user wants to stay on Vue 2; do not propose Vue 3 migrations.
- **Vuetify 2.5.x** (Material Design components, `md` iconfont) — latest
  in the 2.x line; no Vuetify 3 migration.
- **Vuex 3** (classic, not Pinia) — stays Vuex.
- **Vue Router 3** (history mode)
- **TypeScript 3.9** (loose: `noImplicitAny: false`, `allowJs: true`)
- **axios 0.27** via `vue-axios`
- **vue-i18n 8** (en-US + de-AT locales)
- **vue-google-charts 0.3** (kiosk power/water panels)
- **FontAwesome 5** (brands/regular/solid)

## Build & run

```
npm run serve     # dev server with hot reload
npm run build     # production build → dist/
npm run lint      # ESLint (@vue/eslint-config-standard + typescript)
```

No test command, no Jest dependencies in `package.json` currently (though the
README mentions jest install steps historically). **There are no tests**,
but the user does like tests in general — see `conventions.md`.

## Deployment

`Dockerfile` is a two-stage build: `node:14.15.0-alpine` → `nginx:stable-alpine`.
`deploy/nginx.conf` serves `dist/` on port 80 with SPA fallback
(`try_files $uri $uri/ /index.html`). `deploy/config.js` is a **runtime** config
file (window.config) designed to be swappable after build without rebaking the
image — see README "Runtime Environment Configuration" section for the rationale.

## Entry point

`src/main.ts` wires: typeface-roboto, Vue, App.vue, router, VueI18n (default
locale `'en'`), vuetify, store, vue-axios, VueGoogleCharts.
