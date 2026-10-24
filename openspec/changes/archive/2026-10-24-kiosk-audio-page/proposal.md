## Why

Music is controlled through Music Assistant (`https://music.unterrainer.info`), which today means
leaving the kiosk for a separate app or browser tab -- and on the wall tablets there is no way back
into the kiosk once you are there. Nobody logs in anywhere at home, so whatever we embed has to come
up already signed in.

## What Changes

- New kiosk page `/app/kioskaudio` that shows the Music Assistant web UI full-screen in an iframe,
  below a slim bar with a "back" button to `/app/kioskoverview`. Because Music Assistant runs inside
  the iframe, the bar stays visible whatever the user does in Music Assistant.
- New "Audio" link tile in the link row of `KioskOverview`.
- Music Assistant is opened already signed in: the page passes a Music Assistant long-lived access
  token via its `?code=` URL parameter, which the Music Assistant frontend accepts as its session
  token. No login form on the tablets.
- New runtime config file `overmind-config.js`, loaded by `index.html` before the app, carrying the
  Music Assistant URL and token. The repo and the public Docker image ship a version without a
  token; production mounts the real one from the server. The token never enters git or the image.

## Capabilities

### New Capabilities

- `kiosk-audio-page`: the kiosk audio page -- entry tile, embedded Music Assistant UI, signed-in
  start via a runtime-configured token, and the way back to the overview.

### Modified Capabilities

(none)

## Impact

- `src/views/KioskAudio.vue` (new), `src/router/index.ts`, `src/views/KioskOverview.vue`,
  `src/locales/de-AT.json`, `src/locales/en-US.json`.
- `public/index.html` loads `overmind-config.js`; `public/overmind-config.js` (new, token-free
  default).
- `deploy/docker-compose.yml`: mount `/app/deploy/overmind-gui/overmind-config.js` over the default
  (and drop the stale mount of `cms-gui/config.js`, which nothing in this app loads).
- Server: one-time manual creation of `/app/deploy/overmind-gui/overmind-config.js` with the token.
- No backend changes. Music Assistant already allows framing (no `X-Frame-Options`/CSP, checked
  2026-10-24) and is served over HTTPS, so no Traefik changes are needed.
