## Why

The user runs a Frigate installation at home with a Double Take + CompreFace
face-recognition pipeline already deployed and actively matching faces on
the Keller (basement) camera, writing resolved identities back onto Frigate
as `sub_label`. None of that is surfaced anywhere in the kiosk GUI today —
there's no way to glance at a kiosk screen and see who is currently in the
basement. This change adds a dedicated kiosk page, phase 1 of a staged
feature: live view only. Browsing Frigate's historical event stream (past
detections, clip playback) is an explicit phase 2, out of scope here.

## What Changes

- New kiosk page **"Personen"** at `/app/kioskpersonen`, reachable via a
  `KioskLinkPanel` tile on `KioskOverview.vue` (alongside the existing
  `linkCamera`/`linkVideo` tiles) — a regular user-facing kiosk view, not a
  technician-only tool, so it does not use the gear-button entry point.
- The page streams the **Keller** camera live via **WebRTC**
  (`https://frig.unterrainer.info/live/webrtc/api/ws?src=keller`), not the
  MP4-over-HTTP pattern `KioskVideo.vue` uses — see design.md - Context:
  MP4-over-HTTP's fixed ~10s latency sat too far from the person-overlay's
  ~2-3s freshness (a lighter-substream attempt to fix this, `keller_live`,
  was tried and reverted first; see design.md). Uses a new
  `VideoStreamRtc.vue` component (vendored go2rtc client), kept separate
  from `KioskVideo.vue`'s existing MP4 path.
- The page overlays currently-tracked persons on top of the live video: a
  bounding box per tracked person plus a label showing the resolved name
  (Frigate `sub_label`, populated by the existing Double Take/CompreFace
  pipeline) together with the object-detection confidence (`data.score`)
  and the face-match confidence (`data.sub_label_score`). A zone indicator
  (`zones`) is included in the label when present, but Keller currently has
  no zones configured in Frigate, so it SHALL be omitted from the label
  when empty rather than shown as blank/placeholder text.
- Extends the existing `video-overlay` canvas mechanism in
  `VideoStream.vue` (currently only wired for click-to-photo) to also draw
  these bounding boxes/labels, rather than introducing a second overlay
  mechanism.
- Introduces a small dedicated Frigate client/composable for live
  tracked-object data, kept separate from the `BaseService`/`rest.ts`
  conventions used for `java-overmind-server` calls, since Frigate is a
  genuinely separate external system.

## Capabilities

### New Capabilities
- `kiosk-personen-page`: kiosk-reachable page showing the live Keller
  camera feed with a live bounding-box + name overlay for detected persons.

### Modified Capabilities
<!-- none: purely additive, no existing capability's requirements change -->

## Impact

- **New files**: `src/views/KioskPersonen.vue`, `src/utils/webservices/frigateService.ts`,
  route entry in `src/router/index.ts`, `KioskLinkPanel` tile +
  `de-AT.json`/`en-US.json` label in `KioskOverview.vue`,
  `src/components/VideoStreamRtc.vue` + vendored `src/utils/video-rtc.js`
  (WebRTC playback, added during implementation — see design.md).
- **Modified files**: `src/components/VideoStream.vue` (extend
  `video-overlay` canvas to draw bounding boxes/labels, gated so the
  existing click-to-photo behavior on other pages is unaffected — also
  fixed a pre-existing canvas sizing bug there, see design.md),
  `src/components/KioskVideoStreamPanel.vue` (additive `rtc` prop),
  `src/main.ts` (`Vue.config.ignoredElements` for the vendored player's
  custom element).
- **External infra changes made during implementation** (outside this
  repo, on `babylon5`/Traefik — see design.md - Context): a CORS
  middleware scoped to `frig.unterrainer.info`'s `/api/events` path.
- **External dependency**: home Frigate instance (`frig.unterrainer.info`,
  camera name `keller`, Frigate 0.17-0) and its already-running Double
  Take + CompreFace pipeline — no new infrastructure to stand up, but this
  feature is inert if that stack goes down or Double Take stops writing
  `sub_label`s.
- **Live data source** (exact mechanism TBD in design.md): either polling
  a Frigate REST endpoint for currently-tracked objects, or client-side
  MQTT-over-WebSocket to Frigate's broker — needs confirming against what
  Frigate 0.17's live API actually exposes.
- No changes to `java-overmind-server` or the existing SSE/transport
  pipeline; this feature talks to Frigate directly, not through the
  Overmind backend.
