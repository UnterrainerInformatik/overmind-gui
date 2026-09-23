## Why

A customer sometimes needs one camera to record without gaps for a known stretch
of time: a building site over a weekend, or a door until a stated date. Today the
only route is to switch the camera to continuous recording in its stream settings
and remember to switch it back. Nothing ends it by itself, and nobody can see
that it is running or for how long.

The server already offers this as a **recording job with an end date**
(java-overmind-server, capability `continuous-recording`, deployed and
smoke-tested live on 2026-09-10). The GUI has no way to reach it yet. This is
backlog item B in `ai/open-proposals.md`.

## What Changes

- **Start a recording job from a camera's entry on the Kameras page.** The user
  chooses the end moment (a date and time, or a quick duration such as
  1 hour, 1 day or 1 week) and where the footage is kept:
  - **am Standort (local):** the footage stays on the node, under the node's
    retention. The server raises that retention to cover at least the job.
  - **zentral (central):** the server also copies the footage into the central
    archive while the job runs.
- **The choice is informed by what it costs.** The form estimates the volume
  for the chosen duration: from the camera's recording stream bitrate where it
  is known, otherwise from the rule of thumb of about 30 GB per camera-day. For
  the central choice, it states that this volume goes over the site's uplink,
  for each camera.
- **Running jobs are visible.** A camera with a running job says so in its row,
  with the time remaining. The page also lists all running jobs across cameras
  in one place, each with its camera, end moment, time remaining and storage
  choice.
- **A running job can be ended early**, after a confirmation.
- **Refusals are shown as the server words them.** Examples: the camera already
  has a job, the camera or node is disabled, or the end is not in the future.
- **Recording entries read as recordings in the archive.** The central variant
  produces archive entries of kind `recording`, which carry no person. The
  archive list names them as a recording ("Aufzeichnung") rather than showing
  them as an unknown person.
- **The stream choice (main or sub) is not offered.** The server has no field
  for it, so none is added.

## Capabilities

### New Capabilities
- `camera-recording-jobs`: starting a camera's recording job with an end moment
  and a storage choice, the volume estimate and uplink note, showing running jobs
  with their time remaining, ending a job early, and showing the server's
  refusals.

### Modified Capabilities
- `kiosk-archive-page`: an entry that is a recording rather than an event is
  listed under its kind, not as an unknown person.

## Impact

- **GUI code:**
  - `src/views/KioskCameras.vue`: a row action, a row indicator, and the
    running-jobs section.
  - A new job dialog component.
  - A new webservice for the three routes.
  - Route keys in `src/store/rest.ts`.
  - Both locale files.
  - The archive tile name, in `src/views/KioskPersonenArchiv.vue` and
    `src/components/EventTile.vue`.
- **Server:** none. The three routes exist:
  - `POST /cameras/:id/continuousRecording`
  - `GET /cameras/:id/continuousRecording`
  - `POST /cameras/:id/continuousRecording/:windowId/end`
- **Docs:** `java-overmind-server/docs/video-capabilities.md` section 9 is still
  marked 🕓 Geplant, and it promises that the central variant frees the footage
  on site. The server does not do that, because Frigate cannot delete a time
  slice. The section must be flipped to ✅ and corrected.
