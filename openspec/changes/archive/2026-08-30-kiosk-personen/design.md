## Context

See proposal.md - Why/What Changes for motivation and scope.

Constraints established while researching this change (live checks against
the running Frigate/Double Take/CompreFace stack on `babylon5`, 2026-08-30):

- Frigate 0.17.2. Its REST API (`frigate/api/event.py`) exposes only
  **historical query** endpoints for tracked objects — `/api/events`,
  `/events/explore`, `/events/search`, `/event_ids`, `/events/summary`.
  There is no dedicated "currently active tracked objects" endpoint.
  `camera.py` has no such endpoint either.
- An in-progress tracked object is still visible through `/api/events`:
  it's the row(s) where `end_time` is `null`. A real matched event pulled
  from the Keller camera has this shape (fields relevant to this design):
  ```json
  {
    "camera": "keller",
    "label": "person",
    "sub_label": "gerald",
    "zones": [],
    "data": { "box": [0.37, 0.17, 0.22, 0.45], "score": 0.80, "sub_label_score": 0.84 }
  }
  ```
  `box` is `[x, y, w, h]` relative (0-1) coordinates.
- Frigate also has an internal first-party WebSocket comms layer
  (`frigate/comms/ws.py`) that its own web UI uses for some live state, and
  a raw MQTT broker (`10.10.196.2:1883`) that Double Take subscribes to.
  Neither is a documented/stable public contract for third-party clients,
  and using either would require reverse-engineering an internal protocol
  or exposing the broker to the browser. See Decisions below for why
  neither was chosen.
- This repo has no WebSocket/SSE layer for polling external systems
  (`ai/memory/polling-and-debouncing.md`): every list view polls REST on a
  `setInterval` funneled through the shared `Debouncer` (`src/utils/debouncer.ts`).
- `VideoStream.vue` already renders an absolutely-positioned
  `<canvas class="video-overlay">` sized/positioned off
  `$refs.video.offsetTop/offsetLeft/videoWidth/videoHeight`, currently only
  driven by click-to-photo logic.
- `KioskVideo.vue` uses a go2rtc live-stream URL pattern,
  `https://frig.unterrainer.info/live/webrtc/api/stream.mp4?src=<camera>`,
  that turned out to be stale: the container's current nginx config
  (`/usr/local/nginx/conf/nginx.conf` inside the `frigate` container) only
  proxies `/live/webrtc/api/ws` (WebRTC signaling) and
  `/live/webrtc/webrtc.html` to go2rtc — `/live/webrtc/api/stream.mp4`
  matches no `location` block and falls through to the catch-all `location
  /`, which serves Frigate's own SPA `index.html` (`content-type:
  text/html`), so the `<video>` element never leaves `readyState <= 2` and
  the loading spinner never clears. The correct current path, confirmed by
  curl (`content-type: video/mp4`), is go2rtc's own API proxied under
  `/api/go2rtc/api/`:
  `https://frig.unterrainer.info/api/go2rtc/api/stream.mp4?src=<camera>`.
  This affects `KioskVideo.vue` identically (not something introduced by
  this change) but is out of this change's scope to fix.
- Frigate's own REST API (`/api/events` etc.) sends no
  `Access-Control-Allow-Origin` header at all (no CORS middleware, no
  config option for it), unlike go2rtc's own proxied paths
  (`/api/go2rtc/api/*`), which already set `Access-Control-Allow-Origin: *`
  themselves. A browser `fetch`/`axios` call to `/api/events` from the GUI
  app's own origin is therefore blocked by CORS. Fixed by adding a
  **Traefik middleware**, scoped only to `PathPrefix('/api/events')` on the
  `frig.unterrainer.info` router (`/home/psilo/scripts/frigate/docker-compose.yml`
  on babylon5), that adds `Access-Control-Allow-Origin: *`. Scoped
  narrowly rather than host-wide so it doesn't duplicate the header go2rtc
  already sets on its own paths (a response with two
  `Access-Control-Allow-Origin` headers is rejected by browsers as
  invalid).
- The `keller` go2rtc stream (and Frigate's `detect`/recording pipeline)
  uses the camera's full-resolution `stream1` (2560x1440 @ 40fps). Using
  that directly for the browser live view caused ~10s of growing playback
  latency (the browser can't decode/render as fast as data arrives, and
  MP4-over-HTTP has no "seek to live edge" mechanism to recover).
  **Tried and reverted**: the camera also exposes a much lighter `stream2`
  (640x360 @ 40fps); added a second, purely-additive go2rtc stream
  `keller_live` pointing at it (still present in config, currently
  unused). This made latency much worse (~40s, with freezing) rather than
  better — root cause, confirmed via go2rtc's own log
  (`/dev/shm/logs/go2rtc/current` in the container): `keller`/`stream1`'s
  producer stays permanently warm only because Frigate's own `detect` role
  continuously consumes it; `keller_live`/`stream2` has no such persistent
  consumer, so go2rtc cold-starts the RTSP connection on each browser
  request and tears it down again after a few seconds idle (also observed:
  an audio codec mismatch, consumer expects `MPEG4-GENERIC`, producer
  offers `PCMA`, which may stall negotiation entirely on some attempts).
  go2rtc has a `preload:` config section built exactly for this (keeps a
  stream's producer connected regardless of consumers), but it needs
  **go2rtc ≥ v1.9.11**; the version bundled with the current
  `ghcr.io/blakeblackshear/frigate:stable` image is **v1.9.10**. Reverted
  `KioskPersonen.vue` to `keller`/stream1 (accepting the ~10s latency) as
  the stable option. Once the bundled go2rtc is updated, switching to
  `keller_live` + a `preload:` entry (see
  https://github.com/AlexxIT/go2rtc/blob/master/internal/streams/README.md)
  would be the way to revisit this.
- **Switched to WebRTC instead of MP4-over-HTTP** to close the gap between
  video latency (~10s) and the overlay's freshness (~2-3s, from
  `/api/events` polling) — those being far apart (not just each being
  individually "slow") is what actually read as broken: the box reflected
  a person's position well before the delayed video caught up to showing
  them there. There's no reliable frame-level wall-clock timestamp exposed
  through MP4-over-HTTP playback to synchronize against (`video.currentTime`
  is relative to stream start, not real time), so closing the gap meant
  reducing video latency itself rather than delaying the overlay to match
  it (a delay-buffer would only be a guessed constant, liable to drift on
  other devices/networks).

  Vendored go2rtc's own `www/video-rtc.js` client
  (`src/utils/video-rtc.js`, MIT, unmodified) rather than hand-rolling
  WebRTC signaling — it already implements the offer/answer + ICE exchange
  over go2rtc's WebSocket protocol, with automatic fallback (webrtc → mse
  → hls → mp4 → mjpeg) and reconnect handling. Added as a **new, separate**
  `VideoStreamRtc.vue` component (not a mode grafted onto the shared
  `VideoStream.vue`) so `KioskCamera.vue`/`KioskVideo.vue`/the migrations
  dialog are untouched — matches this repo's existing preference for
  parallel components over one component with many special cases (see
  `ai/memory/kiosk-mode.md` on Kiosk* vs regular components). Wired in as
  an additive `rtc` prop on `KioskVideoStreamPanel.vue` (default `false`,
  existing usages unaffected) so `KioskPersonen.vue` alone opts in via
  `:rtc="true"`, pointed at
  `https://frig.unterrainer.info/live/webrtc/api/ws?src=keller` (an
  explicit, already-proxied nginx location for go2rtc's WS API — confirmed
  end-to-end with a raw WebSocket handshake, `101 Switching Protocols`,
  through Traefik → Frigate's nginx → go2rtc). `Vue.config.ignoredElements`
  gained a `go2rtc-*` entry in `main.ts` since `<go2rtc-video>` is a native
  custom element, not a Vue component.
- `VideoStream.vue`'s `video-overlay` canvas had a pre-existing sizing bug
  (not introduced by this change, just newly visible once boxes were
  actually drawn on it): its CSS `width`/`height` were bound to
  `video.videoWidth`/`videoHeight` (the stream's *native* resolution)
  instead of the video element's actual *rendered* box size, so the canvas
  and the video disagreed on where the box coordinates belonged whenever
  those differed (which was small/unnoticeable for the other camera feeds
  but large for Keller's original 2560x1440 stream). Fixed by using
  `video.offsetWidth`/`offsetHeight` instead.

## Goals / Non-Goals

**Goals:**
- Live bounding-box + name overlay on the Keller camera feed, updated on a
  short polling interval, using only Frigate's public REST API.
- Reuse existing repo patterns (Debouncer/setInterval polling,
  `video-overlay` canvas, `KioskLinkPanel` navigation) rather than
  introducing new infrastructure.

**Non-Goals:**
- Historical event browsing (phase 2, separate proposal).
- Talking to Double Take or CompreFace directly — Frigate's `sub_label` /
  `sub_label_score` on the event already carries the resolved result.
- Multi-camera support (Keller only, this phase).
- Any change to `java-overmind-server` or its SSE/transport pipeline.

## Decisions

### Live data source: poll `GET /api/events?cameras=keller&...`, filter `end_time == null`

Alternatives considered:
- **Client-side MQTT-over-WebSocket** to `10.10.196.2:1883`: rejected.
  Requires confirming/enabling a WS listener on the Mosquitto broker (not
  verified to exist), and would expose the raw broker — carrying Double
  Take's and other cameras' traffic too — directly to a kiosk-tablet
  browser with no auth boundary Frigate's own API provides.
- **Frigate's internal WebSocket comms** (`frigate/comms/ws.py`): rejected.
  It's Frigate's own frontend-internal protocol (topics like
  `modelState`, `birdseyeLayout`, `ptz` commands), not documented as a
  public API and not guaranteed stable across Frigate versions — brittle
  to build a third-party feature on.
- **Poll `/api/events` for in-progress events**: chosen. Public, documented
  REST endpoint, already proven to return exactly the fields this feature
  needs (`sub_label`, `data.score`, `data.sub_label_score`, `data.box`,
  `zones`), and fits this repo's existing polling convention exactly (same
  `Debouncer` + `setInterval` shape used everywhere else).

Poll interval: 2000ms. Faster than the slowest existing views (Switches at
5000ms) since a person moving through frame should feel responsive, but not
faster than Frigate's own detection cadence warrants. Implementation should
treat this as tunable, not load-bearing for the design.

### Overlay rendering: extend `VideoStream.vue`'s existing `video-overlay` canvas

Add an optional prop (e.g. `overlayObjects`) accepting the polled
in-progress events, drawn as boxes (`data.box`, scaled to the canvas's
current `width`/`height`) with a label per box: name (`sub_label`, or a
fallback like "?" when absent) plus the two confidence scores, and the zone
name when `zones` is non-empty. When the prop is absent/empty (all other
current usages), behavior is unchanged — this must not affect the existing
click-to-photo path.

### New Frigate client stays outside `BaseService`/`rest.ts`

Frigate is a separate external system, already accessed via a hardcoded URL
in `KioskVideo.vue` rather than the `java-overmind-server`-oriented service
layer (`ai/memory/webservices-layer.md`). A small dedicated
client/composable (e.g. `src/utils/webservices/frigateService.ts` or a
composable, naming TBD in tasks.md) wraps the `/api/events` call and the
in-progress filter, kept out of `BaseService` so it doesn't inherit
assumptions (auth headers, base path) that don't apply to Frigate.

### Entry point: `KioskLinkPanel` tile, not the gear-button flow

See proposal.md - Impact. Confirmed by reading `App.vue`: the gear button
(`.kiosk-migrations-btn`) is hardcoded to `/app/kioskmigrations` and is a
technician shortcut for the migrations diagnostic tool specifically, not a
general secondary-navigation mechanism — the wrong precedent for a regular
kiosk feature.

## Risks / Trade-offs

- **[Risk]** `/api/events` may not live-update `data.box` for an
  in-progress event as the person moves. → **Confirmed** (2026-08-30, by
  reading Frigate's own source on babylon5 rather than a live poll-diff —
  no one was home at the time): it does not. `frigate/events/maintainer.py`
  only rewrites the DB row when `should_update_db()` is true (a new
  best-thumbnail `top_score`, zone/speed/velocity/plate change, or event
  end), and `Event.data.box`/`region` are always taken from that
  best-thumbnail snapshot (`tracked_object.py`'s `thumbnail_data`), not the
  object's live current-frame box. So the overlay box sits static between
  best-thumbnail updates and jumps when a better one is captured — the
  coarser, per-detection-ish fallback already anticipated here. Accepted;
  no code change needed.
- **[Risk]** Zone labels will be empty for every detection today (Keller
  has no zones configured in Frigate). → **Mitigation**: proposal already
  specifies omitting the zone label when `zones` is empty rather than
  showing a blank/placeholder.
- **[Trade-off]** Polling REST every 2s instead of a push mechanism means
  up to ~2s latency between a face being recognized and the overlay
  showing it, and one extra HTTP round-trip's worth of load on Frigate
  every 2s while the page is open. Acceptable given this repo's existing
  polling-everywhere convention and Frigate/CompreFace's own processing
  latency (recognition itself is not sub-second) dwarfing this.
- **[Risk]** This feature is entirely dependent on external infrastructure
  (`frig.unterrainer.info` reachability, Double Take, CompreFace) that
  this repo does not own or monitor. → **Mitigation**: the page should
  degrade to "no persons detected" rather than erroring/crashing when
  `/api/events` returns nothing or the request fails, consistent with how
  `KioskVideo.vue` already treats the video stream itself as best-effort.

## Migration Plan

Purely additive — new route, new page, new files, and an additive-only
prop on `VideoStream.vue`. No existing behavior changes, no data migration,
no backend changes. Rollback is deleting the new files/route/tile.
