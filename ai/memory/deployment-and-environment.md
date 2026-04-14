---
name: deployment-and-environment
description: Environment posture — private home network, no staging, master auto-deploys, backend is java-overmind-server, VPN for external access.
---

# Deployment and environment posture

## Network: private, home-only, VPN for external access

- The repository is **private**.
- Both the GUI and the backend run **only on the user's home LAN**.
- External access requires the user to **dial in via VPN**.
- Threat model is "just me" — no public exposure.

**How to apply**:
- Don't obsess over secret management. Real values in `deploy/config.js`
  or committed URLs are acceptable for this deployment.
- Don't design elaborate auth hardening. The dead-code Keycloak
  references in `axiosUtils.ts` and `NavDrawer.vue` (see
  `known-issues-and-smells.md` § 1) are low-priority for this reason.
- Debug logs with internal hostnames / IDs / appliance state are fine.
- This is **not** a license for sloppy code in general — just for
  pragmatic tradeoffs where the textbook answer would add complexity
  for a threat that doesn't exist here.

## No staging — master is production

There is **no staging, preview, or test environment**. "Staging" and
"production" are the same thing, and that thing is the user's home.

**How to apply**:
- Small, reversible commits are fine; elaborate migration strategies
  are not required.
- But: a broken commit to `master` does break the user's actual
  kiosk display. Prefer the `develop` branch for in-progress work and
  merge/PR into `master` when ready.

## CI/CD: commit to master → build + deploy

Committing to `master` triggers a build of the project and a deploy
to the user's home server. There is no manual deploy step.

**How to apply**:
- Treat `master` commits as deploys. Do not push to `master` casually.
- The current working branch at the time of this memo is `develop`;
  that is the safe place for iteration.
- The exact CI system is **not visible in this repo** — no
  `.github/workflows/` directory exists. The pipeline likely lives in
  an external system (Jenkins/Drone/server-side hook). If you need to
  know details, ask the user rather than guessing.

## Backend: java-overmind-server

The REST backend this GUI talks to is the **java-overmind-server**
project — a separate Java repository. Default endpoint is
`overmindserver.unterrainer.info:443` (see `src/store/rest.ts`).

**How to apply**: if you hit a question about response shapes, missing
endpoints, or server-side behavior, the answer lives in the Java
repo, not here. Don't invent endpoint semantics; ask or read that
codebase instead.

## Tech stack is locked at Vue 2 / Vuetify 2

The user explicitly wants to stay on **Vue 2** and **Vuetify 2 (latest
in the v2 line)** — no Vue 3 / Vuetify 3 migration yet.

**How to apply**:
- Do not suggest or start a Vue-3 / Composition-API / Pinia migration
  as a side effect of another task.
- Patch-level upgrades inside Vue 2.x / Vuetify 2.x are fine.
- Vuex 3 stays; don't propose Pinia.
- If you hit a limitation that only Vue 3 can solve, flag it and let
  the user decide — don't work around it by starting a migration.

## Runtime version

The user stated on 2026-04-14: "npm currently is 20". Interpreted as
**the current dev environment runs Node 20** (npm 20 does not exist as
a version number). This updates the stale README instructions that
still say "Node 14.15.0 (we cannot update it)".

**⚠ Dockerfile drift**: at time of writing, `Dockerfile` still pins
`FROM node:14.15.0-alpine`. If the build image is out of sync with the
dev environment, the deploy will either fail or use a different Node
from what was developed against. Check the Dockerfile before relying
on Node 20 features in code that ships.
