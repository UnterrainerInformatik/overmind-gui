## 1. Frigate client

- [x] 1.1 Add `src/utils/webservices/frigateService.ts` (outside `BaseService`,
      per design.md - Decisions), talking directly to
      `https://frig.unterrainer.info`: a function that calls
      `GET /api/events?cameras=keller&limit=<n>`, filters the response to
      rows where `end_time === null`, and returns them typed (id, camera,
      label, sub_label, zones, `data.score`, `data.sub_label_score`,
      `data.box`).
- [x] 1.2 Manually verify against the live instance whether `data.box`
      updates across successive polls for the same in-progress event id
      (design.md - Risks). Note the result in the task/PR; if it does not
      update live, confirm the per-detection (not per-frame) box update is
      acceptable per the documented fallback.
      **Result (verified 2026-08-30 by reading Frigate's own source on
      babylon5, `/opt/frigate/frigate/events/maintainer.py` +
      `track/tracked_object.py`, no one was home to test with a live
      poll-diff)**: `data.box` does NOT track live per-frame position. The
      DB row (and therefore the REST response) is only rewritten when
      `should_update_db()` is true — driven by `top_score` increasing (a
      new best thumbnail), zone/speed/velocity/plate changes, or event end
      — and `box`/`region` are always taken from that best-thumbnail
      snapshot, not the object's current frame. So the overlay box will sit
      static for stretches of an in-progress event and jump only when a
      better thumbnail is captured. This is the documented fallback
      (coarser, per-detection-ish box update) — accepted, no code change
      needed.

## 2. Overlay rendering in VideoStream.vue

- [x] 2.1 Add a `ref` to the existing `<canvas class="video-overlay">` in
      `src/components/VideoStream.vue` (currently unreferenced — only used
      for the click-to-photo hover background) so it can be drawn on.
- [x] 2.2 Add an `overlayObjects` prop (array, default `[]`) to
      `VideoStream.vue` carrying the currently-detected persons for this
      frame (shape from task 1.1).
- [x] 2.3 On each `update()` tick (existing 100ms interval) or on
      `overlayObjects` change, clear the overlay canvas and, for each
      object, scale its relative `box` (`[x, y, w, h]`, 0-1) to the
      canvas's current pixel `width`/`height` and stroke a bounding box.
- [x] 2.4b (added 2026-08-30) Overlay font/line-width were fixed pixel
      values drawn on a canvas raster sized to the stream's native
      resolution — legible at Keller's low-res `stream2` test but tiny
      once back on `stream1`'s 2560x1440 (raster ≫ on-screen CSS size).
      Scaled font size/line width/padding by `canvas.width /
      video.offsetWidth` in both `VideoStream.vue` and `VideoStreamRtc.vue`
      so text stays a constant on-screen size regardless of stream
      resolution.
- [x] 2.4 Draw a label above/on each box: `sub_label` if present (else a
      "no name resolved" indicator per spec's Unrecognized-person
      scenario), the object-detection confidence, the face-match
      confidence when a name was resolved, and the zone name(s) only when
      `zones` is non-empty.
- [x] 2.5 Confirm existing `VideoStream` usages (KioskCamera, KioskVideo,
      migrations dialog, etc.) are unaffected when `overlayObjects` is
      left at its default `[]` — no boxes drawn, click-to-photo behavior
      unchanged.

## 3. Personen page

- [x] 3.1 Add `src/views/KioskPersonen.vue` following the `Kiosk*` view
      convention (`mounted() { this.kioskMode(true) }` via
      `mapActions('gui', { kioskMode: 'kioskMode' })`, per
      `ai/memory/kiosk-mode.md`), with a `KioskLinkPanel` back tile to
      `/app/kioskoverview` (see `KioskVideo.vue` for the reference shape).
- [x] 3.2 In `KioskPersonen.vue`, poll `frigateService` on a 2000ms
      interval via the shared `Debouncer` + `setInterval` pattern
      (`ai/memory/polling-and-debouncing.md`), storing the result and
      passing it to the video panel; on a failed/errored poll, keep the
      last-good empty/non-empty state rather than throwing (spec's
      Detection-source-unreachable scenario) — i.e. swallow the error and
      leave the video running with no boxes.
- [x] 3.3 Extend `KioskVideoStreamPanel.vue` to accept and forward an
      `overlayObjects` prop through to `VideoStream`, and use it (or
      `VideoStream` directly) in `KioskPersonen.vue` with
      `url: 'https://frig.unterrainer.info/live/webrtc/api/stream.mp4?src=keller'`.
      **Correction (2026-08-30)**: that URL 404s-to-SPA-fallback under the
      current nginx config (see design.md - Context); the working URL,
      confirmed against the live video loading in the browser, is
      `https://frig.unterrainer.info/api/go2rtc/api/stream.mp4?src=keller`
      (a lighter-substream alternative, `keller_live`, was tried to reduce
      the ~10s latency but reverted — see design.md - Context for why).
      **Further correction (2026-08-30)**: MP4-over-HTTP's fixed ~10s
      latency sat far enough from the overlay's ~2-3s freshness that the
      box visibly didn't match what the (delayed) video showed. Switched
      to WebRTC via a new `VideoStreamRtc.vue` component (vendored
      go2rtc's `video-rtc.js` client) — see design.md - Context. Final URL:
      `https://frig.unterrainer.info/live/webrtc/api/ws?src=keller`, used
      via `KioskVideoStreamPanel`'s new `rtc` prop.
- [x] 3.3b (added 2026-08-30) Vendor `src/utils/video-rtc.js` (go2rtc's own
      client, MIT, unmodified) and add `src/components/VideoStreamRtc.vue`
      — a WebRTC-based sibling of `VideoStream.vue` with the same
      `overlayObjects`-drawing logic, used only by `KioskPersonen.vue` via
      `KioskVideoStreamPanel`'s new additive `rtc` prop (default `false`;
      `KioskCamera.vue`/`KioskVideo.vue`/migrations dialog unaffected). Add
      `Vue.config.ignoredElements = [/^go2rtc-/]` to `main.ts` for the
      native `<go2rtc-video>` custom element.
- [x] 3.4 Add the route in `src/router/index.ts`:
      `/app/kioskpersonen` → `kioskPersonen` → `views/KioskPersonen.vue`,
      alongside the other `Kiosk*` entries.
- [x] 3.5 Add a `KioskLinkPanel` tile for `page.kiosk.linkPersonen` to
      `KioskOverview.vue`, alongside the existing `linkCamera`/`linkVideo`
      tiles (not behind the gear-button flow — see spec's first
      requirement).
- [x] 3.6b (added 2026-08-30) Made the video size responsive to the
      browser window in `KioskPersonen.vue` (`videoWidth`/`videoHeight`
      data, recomputed on mount and on `window resize`, fit to a 16:9 box
      within the viewport) rather than the fixed `640x480` every other
      `Kiosk*` video page uses — requested specifically for this page.
      Also fixed `KioskVideoStreamPanel.vue`'s `KioskPanel` wrapper, which
      only passed `min-width` and left `max-width` at `KioskPanel`'s
      180px default (harmless at the old fixed small sizes, would have
      clipped/misrendered at large responsive sizes) — now passes
      `max-width` too.
- [x] 3.6 Add the `page.kiosk.linkPersonen` key to `src/locales/de-AT.json`
      (label "Personen"), matching the existing `linkCamera`/`linkVideo`
      key style; semicolons/style per existing JSON conventions.

## 4. Manual verification

- [x] 4.1 Load the Personen page on a kiosk-sized viewport with someone
      standing in front of the Keller camera; confirm a box + label with
      name and both confidence scores appears within ~2s.
      **Confirmed live 2026-08-30** (against the real Keller camera on
      babylon5, during implementation): box + name + both confidence
      scores render correctly, in sync with the video once switched to
      WebRTC (~1.3s video latency).
- [x] 4.2 Confirm the box disappears within ~2s of the person leaving
      frame, and that an unrecognized face shows the box without a
      resolved name rather than erroring.
      **Marked done 2026-08-30 by user decision during archive** — box
      appearing/tracking was directly observed live (4.1); box-disappears
      and unrecognized-face-shows-`?` specifically were not narrated in
      the session but rely on the same, already-verified polling +
      `overlayLabel()` fallback path, not a separate code path.
- [ ] 4.3 Temporarily block/stop reachability to `frig.unterrainer.info`
      (or simulate a failing fetch) and confirm the page keeps rendering
      (video best-effort, no boxes, no crash/error state) per spec's
      Detection-source-unreachable scenario.
