---
name: build-and-deploy
description: How the project builds (vue-cli-service, Node 14), the Docker image, nginx config, and the runtime config.js override trick.
---

# Build and deploy

## Local dev

As of 2026-04-14 the user develops on **Node 20**. The README still says
"Node 14.15.0, cannot update" — that information is stale. The Dockerfile,
however, **still** uses `node:14.15.0-alpine` (see
`known-issues-and-smells.md` § 8 for the drift).

```bash
npm install
npm run serve        # vue-cli-service serve → webpack dev server, opens browser
npm run build        # vue-cli-service build → dist/
npm run lint         # ESLint
```

`vue.config.js` is minimal:

```js
{
  configureWebpack: { devServer: { open: true } },
  css: { loaderOptions: { sass: { prependData: '@import "@/styles/_colors.scss"; @import "@/styles/_fonts.scss";' } } }
}
```

A separate `webpack.config.js` exists at the root — check it only if
customizing the build beyond what vue.config.js exposes.

## Docker build

```dockerfile
FROM node:14.15.0-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++   # for fibers/sass native deps
COPY ./package.json ./
COPY . .
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

Note: `COPY ./package.json ./` before `COPY . .` is a no-op (the second
copy overwrites it). Not broken, just not doing layer caching the way it
could.

## nginx

`deploy/nginx.conf` serves `dist/` on port 80 with SPA fallback:

```
location / {
  try_files $uri $uri/ /index.html;
}
error_page 404 /index.html;
```

No gzip, no HTTPS, no API proxy — the browser talks directly to the
Overmind REST API at `overmindserver.unterrainer.info:443`.

## Runtime config trick

The README section "Runtime Environment Configuration" explains: the build
step is done before deployment, so you can't bake env vars for a specific
deploy without re-imaging. Workaround:

- **Build time**: `process.env.VUE_APP_PROTOCOL`, `VUE_APP_ADDRESS`,
  `VUE_APP_PORT` provide the defaults, baked into `src/store/rest.ts`.
- **Runtime**: `deploy/config.js` sets `window.config = { DEPLOYMENT_TARGET,
  PROTOCOL, PORT }`, loaded as a `<script>` tag by `public/index.html` (check
  index.html to confirm). Can be edited/replaced per-deployment without
  rebuilding.

**Currently `deploy/config.js` is essentially empty** (all keys commented
out). The `rest.ts` store is the source of truth. If you want per-deploy
overrides, uncomment the keys and wire them into `store/rest.ts` (the
commented-out DEV block is a hint of how it's expected to look).

## Deploy flow

**Commit to `master` → automatic build + deploy to the user's home server.**
There is no manual deploy step and no staging (master *is* production — but
production is the user's home LAN, not a public service). See
`deployment-and-environment.md` for the full posture.

The actual CI system is not visible in this repo (no `.github/workflows/`).
It lives in an external system watching the repo on push.

## `up.sh`

`deploy/up.sh` — the only deployment script committed in the repo. Likely
used for manual bootstrap / one-off restarts rather than the regular
commit-to-master flow.

## `docker-compose.yml`

`deploy/docker-compose.yml` — the compose file defining how the nginx image
runs in production. Check port mapping + volume mounts (to swap `config.js`
at runtime) before touching deployments.

## `.env` / environment

No committed `.env`. Vue CLI supports `.env.local`, `.env.production.local`,
etc. If you add one, remember to add it to `.gitignore` (check what's
already excluded first).
