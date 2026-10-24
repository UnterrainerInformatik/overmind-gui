## Context

- The kiosk views are routes under `/app/kiosk*`; the overview links to them with `KioskLinkPanel`
  tiles, and sub-pages return via a `KioskLinkPanel` "back" (`page.kiosk.linkBack`), e.g.
  `KioskCameras.vue`.
- The app has no runtime config today: the backend address comes from `VUE_APP_*` at build time
  (`src/store/rest.ts`). `deploy/docker-compose.yml` mounts `/app/deploy/cms-gui/config.js` to
  `/usr/share/nginx/html/config.js`, but `index.html` never loads it -- a leftover.
- The image `gufalcon/overmind-gui` is built from `dist/` and pushed to Docker Hub; the repo is on
  GitHub. Anything baked into the build is effectively public.
- Music Assistant (checked 2026-10-24 against `music.unterrainer.info`): HTTPS via Traefik, no
  `X-Frame-Options`, no CSP, loads fine in an iframe on `overmind.unterrainer.info` (headless Chrome
  showed its login page). Its frontend reads `?code=<token>` from the URL on start, calls
  `setToken`, persists it in `localStorage` and strips `code` from the URL via
  `history.replaceState`. Long-lived tokens are created in the Music Assistant user profile and
  expire after 10 years.

## Goals / Non-Goals

**Goals:**
- Music Assistant inside the kiosk, signed in on every device without anyone typing a password.
- A back control that cannot be lost.

**Non-Goals:**
- Own player controls/now-playing widgets against the Music Assistant API.
- Making the token secret from people who can load the kiosk (see Risks).
- Login handling on our side (no password in our code or config, only a token).

## Decisions

**Iframe, not a new tab or own UI.** The iframe keeps our page around Music Assistant, so the back bar
always stays. A new tab loses the way back on kiosk tablets; an own UI against the Music Assistant
WebSocket API is days of work for what Music Assistant already does well.

**Back bar on top, not a floating button.** `KioskCameras` floats the back tile bottom-left; here it
would cover Music Assistant's player bar, which sits at the bottom. A slim top bar (reusing
`KioskLinkPanel` for the same look) with the iframe taking `calc(100vh - bar)` avoids any overlap.

**Token via `?code=`.** It is the frontend's own entry point for an externally supplied token, so
no proxy, cookie or header injection is needed. Alternative considered: Traefik injecting an
`Authorization` header -- does not work, the frontend authenticates over its WebSocket with the
token it holds, not over HTTP headers.

**Runtime config `overmind-config.js` instead of `VUE_APP_*`.** Build-time values would end up in
`dist/` and therefore in the public image. A plain script setting
`window.overmindConfig = { musicAssistant: { url, token } }`, loaded by `index.html` before the
bundle, can be replaced per deployment by a volume mount. The repo ships it with the URL and an
empty token. A dedicated name (not `config.js`) avoids clashing with the stale `cms-gui` mount,
which is removed. nginx serves it with `Cache-Control: no-cache` so token changes apply on reload.

**Page reads config once on mount.** The iframe `src` is built as `url + '?code=' + token` only when
a token is set; otherwise just `url`. Missing `window.overmindConfig` is treated as "not
configured".

## Risks / Trade-offs

- [Anyone who can load `overmind.unterrainer.info` can read the token from `overmind-config.js`] →
  Use a token of a dedicated **non-admin** Music Assistant user (e.g. `dahoam-Netz`), not an admin
  account, so a leaked token can play music but not change the server. If the kiosk is reachable
  from the internet, restrict `overmind-config.js` (or the whole site) to the home network in Traefik.
- [Token appears in the iframe URL for the first load] → Music Assistant removes it from the URL
  right away; it does not leave our origin except to `music.unterrainer.info` itself.
- [Deploy workflow could overwrite `/app/deploy/overmind-gui/`] → Check what the deploy workflow
  copies before relying on the file there; if it syncs the whole folder, keep the file in a path the
  workflow does not touch and mount from there.
- [Music Assistant changes its `?code=` handling in an update] → The page then falls back to Music
  Assistant's login form; it degrades, it does not break.
- [The nginx `try_files` fallback serves `index.html` for a missing `overmind-config.js`] → The
  default file is always in the image, so the request only falls through if the image is broken.

## Migration Plan

1. Create a long-lived token for the non-admin Music Assistant user in its profile.
2. Put `/app/deploy/overmind-gui/overmind-config.js` with URL and token on the server.
3. Push; the pipeline deploys the image and the new compose mount.
4. Rollback: remove the tile/route (revert); the extra config file is harmless.
