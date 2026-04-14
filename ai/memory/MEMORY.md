# MEMORY

Index of project-memory files under `ai/memory/`. Each entry is one line;
load the specific file(s) relevant to the task at hand.

## How to use

- Read this file first to see which memories exist.
- Load individual files (`Read ai/memory/<name>.md`) when their topic is
  relevant to the current task — don't load everything up-front.
- Each memory file has frontmatter (`name`, `description`); the description
  is repeated here as the one-line hook.

## Files

- [conventions](conventions.md) — Hard rules: English-only identifiers/comments; tests welcome but no framework yet.
- [deployment-and-environment](deployment-and-environment.md) — Posture: private home LAN, VPN, no staging, commit-to-master auto-deploys, backend is java-overmind-server, locked on Vue 2 / Vuetify 2 / Vuex.
- [overview](overview.md) — High-level "what is this project": purpose, tech stack, backend, deployment target. Load first when working on unfamiliar parts.
- [architecture](architecture.md) — Source-tree layout and how the pieces fit together: main.ts, App.vue, router, views, components, store, utils, plugins.
- [webservices-layer](webservices-layer.md) — How REST calls are structured: BaseService, axiosUtils, endpoint resolution via store, singleton convention.
- [state-management](state-management.md) — Vuex store shape, what is in the store vs. what intentionally isn't (domain data), accessor conventions.
- [views-and-components](views-and-components.md) — Map of views/ and components/, the kiosk/regular split, floorplan dialog factory pattern.
- [polling-and-debouncing](polling-and-debouncing.md) — The project-wide pattern for keeping UI fresh (setInterval + Debouncer) and custom Debouncer semantics.
- [utils-modules](utils-modules.md) — What each file under src/utils/ provides; check before adding new helpers.
- [kiosk-mode](kiosk-mode.md) — What kiosk mode is, how it is toggled, why there is a parallel Kiosk* set of views/components.
- [i18n-and-theming](i18n-and-theming.md) — vue-i18n setup (en-US + de-AT fallback), Vuetify theme colors, dark/light mode, iconfont, localStorage persistence.
- [build-and-deploy](build-and-deploy.md) — How the project builds (vue-cli-service, Node 14), Docker image, nginx config, runtime config.js override trick.
- [backend-api-contract](backend-api-contract.md) — What the Overmind REST API looks like from the client: endpoint list, list/paging shape, appliance command format.
- [known-issues-and-smells](known-issues-and-smells.md) — Architectural rough edges and latent bugs found during review; read before changing related code.
