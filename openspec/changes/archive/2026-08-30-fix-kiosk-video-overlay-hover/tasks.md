## 1. `VideoStreamRtc.vue`

- [x] 1.1 Remove the `v-hover` wrapper and inline the `v-card` (and its
      children) directly in the template.
- [x] 1.2 Remove the `hover ? transformHoverIn : transformHoverOut` style
      binding from the `go2rtc-video` element, leaving just its
      width/height/display style.
- [x] 1.3 On the `.video-overlay` canvas, replace the
      `hover ? 'background-color: ... ' + transformHoverIn : ' ' +
      transformHoverOut` piece with a `cursor: pointer` when
      `photoEnabled` is true and `cursor: default` otherwise (e.g. via a
      bound `:style="{ cursor: photoEnabled ? 'pointer' : 'default' }"`
      alongside the existing position/size style), keeping the
      `transition: background-color ...` line removed too since there's
      no longer a color to transition.
- [x] 1.4 Remove the now-unused `transformHoverOut` data property and
      `transformHoverIn` computed property.

## 2. `VideoStream.vue`

- [x] 2.1 Apply the same four changes as in section 1 (remove
      `v-hover`, drop the hover style from the `<video>` element, add
      the `photoEnabled`-gated `cursor` style to `.video-overlay`,
      remove the dead `transformHoverIn`/`transformHoverOut`).

## 3. Verify

- [x] 3.1 Run the app and open the kiosk Personen page: hovering the
      video shows a pointer cursor, with no green tint and no
      scale/zoom of the video or overlay.
- [x] 3.2 Confirm clicking the overlay still captures/downloads a still
      photo as before.
- [x] 3.3 No longer applicable: the kiosk Video page was removed (see
      section 5) rather than fixed, so there is no second
      `KioskVideoStreamPanel` consumer left to spot-check. The
      `video-overlay-hover-affordance` fix is exercised by
      `/app/kioskpersonen` only, verified in 3.1/3.2.

## 4. Fix overlay sizing (found while verifying 3.1/3.2)

- [x] 4.1 `VideoStreamRtc.vue` / `VideoStream.vue`: the `.video-overlay`
      canvas's position/size style read `videoEl`/`$refs.video`
      `offset*` properties directly in the template, which aren't
      reactive in Vue 2, so the overlay stayed stuck at whatever size it
      first rendered at (often `0x0`, before the stream had laid out) —
      hover never actually landed on the overlay and clicks never
      reached it. Added a reactive `overlayRect` data property, refreshed
      from `offset*` on each existing `update()` poll tick (100ms,
      change-checked to avoid needless re-renders), and bound the
      canvas's style to it instead. See design.md - Amendment.
- [x] 4.2 Verified live on `/app/kioskpersonen`: overlay now reports its
      real on-screen rect, hover shows `cursor: pointer`, and clicking
      produces a photo download (`data:image/octet-stream;base64,...`).

## 5. Remove the kiosk Video page (`/app/kioskvideo`)

Investigating 3.3 surfaced that `/app/kioskvideo` used a different
underlying source (Frigate's `birdseye` combined view) than
`/app/kioskpersonen` (`keller`), and that source is broken two levels
deep:
- `VideoStream.vue`'s plain `<video crossorigin>` request to
  `/live/webrtc/api/stream.mp4?src=birdseye` is blocked by CORS —
  Traefik's `frigate-events` CORS middleware only matches
  `PathPrefix('/api/events')`, not this path.
- Switching to the same go2rtc/WebSocket player `kioskpersonen` uses
  (`rtc: true`, `/live/webrtc/api/ws?src=birdseye`) gets past that CORS
  gap, but `birdseye`'s go2rtc producer reads from an empty FIFO
  (`/tmp/cache/birdseye` on babylon5) that nothing is currently writing
  to — go2rtc starts the producer, gets no frames, and stops it again
  after ~30s, every time. This is Frigate/birdseye-internal behavior,
  unrelated to this repo.

User decision (2026-08-30): don't chase the `birdseye` backend further.
A real multi-camera view will be built later if/when more cameras are
added; until then, drop `/app/kioskvideo` entirely rather than point it
at a source that doesn't work.

- [x] 5.1 Remove the `/app/kioskvideo` route (`src/router/index.ts`).
- [x] 5.2 Remove the "Video" link panel from `KioskOverview.vue`.
- [x] 5.3 Delete `src/views/KioskVideo.vue`.
- [x] 5.4 Remove the now-unused `page.kiosk.linkVideo` locale key
      (`de-AT.json`, `en-US.json`).
- [x] 5.5 Keep `VideoStream.vue` / `KioskVideoStreamPanel.vue`'s
      `rtc: false` path as-is (not deleted) — it's shared, reusable
      component infrastructure, not specific to the removed page.
