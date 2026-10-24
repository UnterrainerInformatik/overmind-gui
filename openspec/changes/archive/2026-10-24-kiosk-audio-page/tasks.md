## 1. Runtime config

- [x] 1.1 Add `public/overmind-config.js` setting `window.overmindConfig = { musicAssistant: { url: 'https://music.unterrainer.info', token: '' } }`
- [x] 1.2 Load it in `public/index.html` with a plain `<script>` before the app bundle
- [x] 1.3 Add a `location = /overmind-config.js` block with `Cache-Control: no-cache` to `deploy/nginx.conf`
- [x] 1.4 In `deploy/docker-compose.yml`, replace the stale `cms-gui/config.js` mount with `/app/deploy/overmind-gui/overmind-config.js:/usr/share/nginx/html/overmind-config.js`

## 2. Audio page

- [x] 2.1 Create `src/views/KioskAudio.vue`: top bar with the back `KioskLinkPanel` to `/app/kioskoverview`, iframe filling the rest of the viewport, `src` built from config (`?code=` only when a token is set), notice when no URL is configured; sets kiosk mode like the other kiosk views
- [x] 2.2 Add the route `/app/kioskaudio` in `src/router/index.ts`
- [x] 2.3 Add the "Audio" `KioskLinkPanel` to the link row in `src/views/KioskOverview.vue`
- [x] 2.4 Add `page.kiosk.linkAudio` and the not-configured notice to `de-AT.json` and `en-US.json`

## 3. Verify

- [x] 3.1 `npm run lint` and `npm run build` pass; `dist/overmind-config.js` contains no token
- [x] 3.2 In the browser (local dev server): tile opens the page, Music Assistant login page shows in the frame at tablet, mobile and PC widths, the back bar does not cover it and returns to the overview after navigating inside the frame
- [x] 3.3 Without `window.overmindConfig` the page shows the notice and the back bar still works

## 4. Deployment (manual, user)

- [ ] 4.1 Create a long-lived token for the non-admin Music Assistant user (e.g. `dahoam-Netz`)
- [ ] 4.2 Check what the deploy workflow copies to `/app/deploy/overmind-gui/`, then place `overmind-config.js` with URL and token on the server where it survives deploys
- [ ] 4.3 After deploy: on a tablet, the Audio page shows Music Assistant signed in without a login form
