# Kiosk "Personen" Page — Live Camera + Person Overlay (Draft Primer)

**Date:** 2026-08-30
**Scope:** A new kiosk-reachable page showing the live Keller (basement) camera feed from the home Frigate installation, with overlays identifying detected persons by name.
**Out of scope (phase 2, separate proposal later):** Fetching/browsing Frigate's historical event stream (past events, review timeline, clip playback).

This is a rough primer for feeding into `/opsx:propose` (or asking Claude in
this repo to draft a proposal from it) — not a proposal itself. Section 7
lists open questions that should be resolved (or explicitly punted with an
assumption) before/while running the propose step.

---

## 1. Why

The user has a Frigate installation running at home
(`https://frig.unterrainer.info`, go2rtc bundled — already referenced by
`src/views/KioskVideo.vue`). They want a dedicated kiosk wall-display page,
**"Personen"**, that shows the Keller camera live and overlays who is
currently in frame — not just a bare video feed. This is explicitly staged:
first get the live view + overlay working end-to-end; historical event-data
retrieval (browsing past events/clips) is a deliberate next step, not part
of this proposal.

## 2. What was asked for (verbatim intent, translated)

- New kiosk page, working title **"Personen"** (de-AT display label —
  belongs in `de-AT.json` per `ai/memory/conventions.md`).
- Shows the **Keller** camera, live.
- The page itself draws the overlays (bounding boxes / labels), not just a
  raw Frigate stream.
- Phase 1: everything **live** — no historical event-stream retrieval yet.
- The overlay must show event data **together with** the recognized
  person's **name**, live.

## 3. Relevant existing code (repo state as of 2026-08-30)

- **Frigate/go2rtc precedent** — `src/views/KioskVideo.vue` already streams
  from Frigate via go2rtc's MP4-over-HTTP endpoint:
  ```
  https://frig.unterrainer.info/live/webrtc/api/stream.mp4?src=birdseye
  ```
  For "Personen" the `src` query param needs to be the Keller camera's
  Frigate camera name (**not confirmed** — see open questions).
- **Overlay anchor point already exists** — `src/components/VideoStream.vue`
  renders an absolutely-positioned `<canvas class="video-overlay">` on top
  of the `<video>` element, sized/positioned off
  `$refs.video.offsetTop/offsetLeft/videoWidth/videoHeight`. Today it's only
  wired for click-to-photo. This is the natural place to draw bounding
  boxes + name labels — extend it (or a sibling copy) rather than building a
  new overlay mechanism from scratch.
- `src/components/KioskVideoStreamPanel.vue` wraps `VideoStream` in a
  `KioskPanel` frame — likely the right wrapper for this page too.
- **Router** — flat array in `src/router/index.ts`, pattern
  `/app/kiosk<name>` → `views/Kiosk<Name>.vue` (e.g. `kioskCamera`,
  `kioskVideo`, `kioskMovement`). Add the new route alongside the other
  `Kiosk*` entries; something like `/app/kioskpersonen` / `kioskPersonen`.
- **Kiosk mode activation convention** —
  `mounted () { this.kioskMode(true) }` via
  `mapActions('gui', { kioskMode: 'kioskMode' })`; see
  `ai/memory/kiosk-mode.md`. `KioskLinkPanel` is the standard "back to
  overview" tile used by every `Kiosk*` view.
- **No existing service layer for Frigate.** Everything under
  `src/utils/webservices/` talks to `java-overmind-server`
  (`ai/memory/webservices-layer.md`, `ai/memory/backend-api-contract.md`) —
  the Frigate URL in `KioskVideo.vue` is a raw hardcoded string in the
  template, not routed through `BaseService`/`rest.ts`. A new Frigate
  integration (live overlay data, and later the event stream) is a
  genuinely separate system and probably should stay separate from the
  Overmind REST/service conventions — likely a small dedicated
  client/composable. Worth an explicit design decision in the real
  proposal rather than defaulting to the `BaseService` pattern.

## 4. Home Frigate setup — known facts and open questions

- Reachable at `https://frig.unterrainer.info`; the Frigate/Double
  Take/CompreFace stack runs as Docker containers on host `babylon5`
  (also `comp.unterrainer.info` for CompreFace, `doubletake.unterrainer.info`
  for Double Take).
- Per prior work on the unrelated ILL Kameras client job (130-camera
  install, see `projects/ill-kameras/` in the psilo/scripts tree, not this
  repo), the user's home Frigate instance was used as a private testbed for
  that project's chosen face-recognition stack: **Frigate → MQTT →
  Double Take → CompreFace**, where Double Take resolves a detected face
  against a known-faces collection and writes the identity back onto
  Frigate as a `sub_label` on the tracked object/event. **Confirmed
  2026-08-30** (live check on `babylon5`): the full stack is deployed and
  actively running — see resolved question 2 in section 7 for details.
- Frigate camera name for the Keller camera: **`keller`** (confirmed from
  the live config — see resolved question 1 in section 7).
- Frigate version running at home: **0.17-0** (from `config.yml`) — recent
  enough to have the newer live API surface; exact live-endpoint shape
  still to be checked (see question 4 in section 7).

## 5. Proposed approach for phase 1 (live only)

- **Video**: reuse the go2rtc MP4-stream pattern already proven in
  `KioskVideo.vue`, pointed at the Keller camera instead of `birdseye`.
- **Overlay data source (live, no history)**: Frigate exposes *currently
  tracked* objects without needing the historical events API — e.g. via
  MQTT topics such as `frigate/<camera>/tracked_object_update` (or Frigate's
  WebSocket, depending on version). Two candidate approaches:
  1. **Client-side MQTT over WebSocket**, straight from the SPA to Frigate's
     broker — no backend involvement, in keeping with this repo's habit of
     talking to external services directly.
  2. **Polling a live Frigate REST endpoint** (if one exists for "current
     objects per camera", as opposed to only historical `/api/events`) —
     fits this repo's existing `setInterval` + `Debouncer` pattern
     (`ai/memory/polling-and-debouncing.md`).

  Recommendation for the real proposal: pick whichever needs the least new
  infrastructure once Frigate's actual version/API surface is confirmed —
  probably (2) for consistency with the rest of this codebase, falling back
  to (1) if Frigate doesn't offer a live per-camera snapshot endpoint.
- **Rendering**: extend the `video-overlay` canvas pattern to draw, per
  currently-tracked person: a bounding box, plus a label combining the
  resolved name (Frigate's `sub_label`, via Double Take/CompreFace) with a
  small amount of live event context (exact fields TBD — see open question
  3 below).
- **Reading of "event data together with the name"**: this primer assumes
  it means the on-screen label attached to each live bounding box shows
  both the person's name *and* a bit of live context about that detection
  (e.g. confidence, zone) — not that phase 1 requires the full historical
  event-stream API. Confirm this reading with the user before locking the
  proposal.

## 6. Explicitly out of scope for this proposal (phase 2 candidate)

- Fetching/browsing Frigate's historical event stream (`/api/events`,
  review timeline, clip playback, "who was here today/this week").
- Any `java-overmind-server` backend persistence of Frigate events.
- Multi-camera support beyond Keller (natural phase-3 generalization once
  the pattern works for one camera).

## 7. Open questions to resolve before/while running `/opsx:propose`

1. ~~Frigate camera name configured for the Keller camera.~~ **Resolved
   2026-08-30**: `keller` (lowercase). Confirmed from the live config on
   `babylon5` (`docker exec frigate cat /config/config.yml`). Also grouped
   under `camera_groups.Keller` in that config. go2rtc stream name matches
   (`keller`), so the existing `KioskVideo.vue` pattern needs
   `?src=keller`.
2. ~~Is Double Take + CompreFace already deployed and running against the
   home Frigate instance?~~ **Resolved 2026-08-30**: yes, fully wired, not
   just running. Confirmed on `babylon5`:
   - Containers `frigate`, `double-take`, and the `compreface-*` stack
     (`compreface-ui`/`admin`/`api`/`core`/`postgres-db`) are all up.
   - Double Take subscribes to Frigate's `frigate/events` MQTT topic
     (broker `10.10.196.2:1883`, same broker Frigate itself uses).
   - Double Take's `frigate.update_sub_labels: true`, so matched identities
     are written back onto Frigate as the object's `sub_label` — this repo
     can read `sub_label` directly off Frigate's own MQTT/API without
     talking to Double Take or CompreFace itself.
   - `keller` is explicitly listed under Double Take's `cameras:` (crop
     enabled, quality 100), so face crops for Keller detections are
     actively being submitted to CompreFace for matching today.
   - CompreFace endpoint is `https://comp.unterrainer.info` (per-camera
     matching only — the GUI shouldn't need to call it directly given the
     sub_label writeback).
3. ~~Which exact "event data" fields should appear in the overlay label
   besides the name?~~ **Resolved 2026-08-30** (user decision, informed by
   the real event shape pulled from `babylon5`'s Frigate API
   `/api/events?camera=keller`): show all three —
   - Face-match confidence — `data.sub_label_score` (e.g. `0.8389`).
   - Object-detection confidence — `data.score` (independent of whether a
     name was matched at all).
   - Zone — `zones` field. **Caveat**: currently always `[]` for `keller`
     in the live config (no zones defined for that camera in Frigate).
     This field will be empty/absent in practice until zones are
     configured on the Keller camera in Frigate — the proposal should
     treat it as optional/hidden-when-empty rather than assuming it's
     always populated.
4. Live overlay data source: client-side MQTT-over-WebSocket vs. polling a
   REST endpoint. Partially resolved: Frigate version confirmed as
   **0.17-0** (from `config.yml`'s `version:` key), which has the newer
   live API surface — still need to confirm exactly which live endpoint
   (WebSocket vs. REST snapshot) 0.17 exposes before picking (1) vs. (2).
5. ~~Where does the new "Personen" kiosk entry point live?~~ **Resolved
   2026-08-30**: a `KioskLinkPanel` tile on `KioskOverview.vue`, alongside
   the existing `linkCamera`/`linkVideo` tiles. The gear-button flow
   (`App.vue`, `.kiosk-migrations-btn`) is hardcoded to
   `/app/kioskmigrations` specifically — a technician shortcut to the
   migrations diagnostic tool, not a general secondary-navigation
   mechanism — so it's not the right fit for a regular user-facing feature
   like this one.

Note: credentials seen while inspecting the live configs (RTSP creds,
CompreFace API key) are deliberately **not** recorded here — this is a
repo file. If the eventual implementation needs them, they belong in
whatever secrets mechanism this repo already uses, not in `ai/`.
