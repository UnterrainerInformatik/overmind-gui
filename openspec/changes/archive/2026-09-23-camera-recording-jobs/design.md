## Context

- The server side exists and runs in production (java-overmind-server change
  `continuous-recording-alert-archive`, archived 2026-09-10). It was
  smoke-tested live on node `haus`: a 3-minute LOCAL window went ACTIVE and
  reverted itself on time. Unlike earlier camera and archive changes, this GUI
  change builds against a **known** contract, not a guessed one. The server
  calls a job a *window*. The GUI says *Auftrag* / *job* to the user and keeps
  *window* in the wire-facing code.
- Routes. All three go through the server's `cameraRoute(...)` wrapper, so a
  refusal carries `{ reason }`, which `axiosUtils` surfaces as
  `err.serverMessage`.
  - `POST /cameras/{id}/continuousRecording`, body `{ endTime, storageChoice }`
    → one window
  - `GET /cameras/{id}/continuousRecording` → `{ windows: [...] }`, past and
    present
  - `POST /cameras/{id}/continuousRecording/{windowId}/end` → the ended window
- Window: `{ id, cameraId, endTime, storageChoice: LOCAL|CENTRAL, state:
  ACTIVE|ENDED }`. `endTime` is a UTC `LocalDateTime` without zone, the same as
  the archive. A window has **no start time**.
- Start refusals:
  - 404: unknown camera.
  - 409: disabled camera or node, or an ACTIVE window already exists.
  - 400: `endTime` absent or not in the future.
- On start, the server raises the camera's retention to cover at least the
  window, rounded up to whole days, and never lowers it. On the end, it restores
  the camera's prior recording configuration.
- Under CENTRAL, the server copies finished ranges into the archive as
  `kind: RECORDING` entries. These carry no label, subLabel, zones or
  `sourceEventId`. The server **does not** free anything on the node, because
  Frigate cannot delete a time slice.
- `KioskCameras.vue` lists cameras with row actions (test, streams, edit,
  delete). It loads once on mount and has no polling.
- `RecordingStorageGauge.vue` already turns hours into "minutes / hours / days"
  with plural strings.
- The project has no unit-test runner. Behaviour is checked through the browser
  harness at `~/.local/share/overmind-gui-verify` with mocked routes.

## Goals / Non-Goals

**Goals:**
- One dialog per camera that either starts a job or shows and ends the running
  one.
- The running jobs visible at a glance on the Kameras page, without opening
  anything.
- A storage choice the user makes knowing its cost, worded so that it never
  promises what the server does not do.

**Non-Goals:**
- A job history view. The server returns past windows, and the GUI ignores
  ENDED ones apart from noticing that a job has ended.
- Stream choice. There is no field for it on the server, so there is none in
  the GUI.
- Editing a running job's end moment. There is no server route for it. The
  user ends the job and starts a new one.
- Server-side changes of any kind.
- Jobs on pages other than Kameras, such as the live view.

## Decisions

### D1: A service of its own, `recordingJobsService.ts`

It is a singleton in the shape of `archiveService.ts`: route keys in `rest.ts`,
calls through `axiosUtils`, and normalisation in the service. It has three
methods:
- `getWindows(cameraId)` returns every window.
- `start(cameraId, endEpochSeconds, storageChoice)`.
- `end(cameraId, windowId)`.

The service does the wire conversion both ways:
- Enums are lowered (`local` / `central`, `active` / `ended`) and raised again
  on the way out.
- `endTime` is converted between the UTC `LocalDateTime` and epoch seconds.
  The conversion reuses `archiveService`'s existing pair. It is moved into
  `dateUtils` if a second copy would otherwise appear.

The JSDoc header records the contract and states that it was checked against
the server source and its 2026-09-10 smoke test.

*Alternative:* adding the methods to `camerasService`. Rejected because that
service is about camera setup (`/setup/cameras`), while these routes sit on the
media side (`/cameras/{id}/...`) next to events and the archive.

### D2: Reading every camera's jobs, once on load and after each action

The server offers no route across cameras, so the page reads
`GET /cameras/{id}/continuousRecording` once per camera, in parallel, after the
camera list has loaded. The result is kept as a map from camera id to either
the active window, `null` (no job), or `undefined` (could not be read). A
failed read is therefore "unknown", never "none".

Each camera's jobs are re-read in three cases:
- after a start or an end on that camera;
- after a refusal, so that a job started elsewhere appears;
- when a job's end moment passes.

There is no general polling. A job started from another kiosk while this page
is open appears on the next load. That is accepted, because jobs are rare,
deliberate actions.

*Alternative:* polling every minute. Rejected because it multiplies requests by
the number of cameras for an event that happens a few times a month.

### D3: One ticking `now`, for countdown and end detection

The page holds a `now` that a 30-second interval refreshes while jobs are
running. It is started when the first active job is seen and cleared when none
remains and on `beforeDestroy`.
- The time remaining is `endTime − now`, formatted in minutes, hours or days
  (spec).
- The duration formatter moves out of `RecordingStorageGauge.vue` into a shared
  helper, so that both use the same thresholds and strings.
- When `endTime ≤ now` for an active window, the page re-reads that camera once.
  The server's own timer ends the window at the same moment. The page therefore
  re-reads once, and if the server still reports the window ACTIVE, it re-reads
  once more on the next tick, then relies on the next action or page load. It
  does not keep polling.

### D4: The dialog, `CameraRecordingJobDialog.vue`

- **Props:** `camera` and `window`, where `window` is the active window, `null`
  or `undefined`. It emits `changed`.
- **Layout:** it follows the page's existing dialog pattern (`v-dialog`
  max-width 560, fullscreen on xs, scrollable).
- **Without an active window:** the form has quick-duration buttons
  (1 Stunde / 1 Tag / 1 Woche), which fill a native `datetime-local` input. This
  input is the same one the archive and events pages use, with `colorScheme`
  following the theme. Below it is a radio group local/central with the
  consequence text for each, and the volume estimate. The start button is
  disabled while the end moment is not in the future, with the reason shown.
- **With an active window:** it shows the end moment in local time, the time
  remaining and the storage choice, plus an "Auftrag beenden" button. That
  button opens `ConfirmDialog`.
- **With an unknown state:** it states that the job state could not be read, and
  offers a retry. The form is not offered, because starting blind would only
  be refused with a 409 if a job exists.
- **Refusals:** `err.serverMessage` is shown in an in-dialog `v-alert`, verbatim,
  or a general message when it is empty. The form keeps its values, and the
  dialog asks the page to re-read.

The row action is an icon button placed before `tune`. Its icon is
`fiber_manual_record`, tinted `error` while a job runs, which reads as "REC".
The row also gains a subtitle line: "Zeichnet auf · noch 5 Stunden".

### D5: The running-jobs list sits above the camera list

A compact `v-list` headed "Laufende Aufzeichnungs-Aufträge" is shown only when
at least one job is active. Each row shows the camera name, "bis <local end>",
the time remaining and a chip `am Standort` / `zentral`. Tapping a row opens the
dialog for that camera. It goes above the cameras, because a running job is
state the user must not overlook. It is also a short list, usually empty and
then absent.

### D6: The volume estimate

`bytes = bitrate × duration`. The bitrate comes from the camera's `record`
stream (`roles.record` → `streams[].bitrateKbps`), exactly as
`CameraStreamSettings.storageEstimate` reads it. Without a bitrate, the
estimate is 30 GB × days and is labelled "Richtwert". The figure is rounded to
whole GB, or one decimal below 10 GB. It is a pure function in `cameraUtils.ts`
next to the storage arithmetic. The stream settings' per-day estimate is then
rewritten to call it, so the two cannot drift apart.

### D7: Recording entries in the archive tile

`KioskPersonenArchiv.mapItem` passes a `title` when the item's kind is not
`event`, taken from the existing `kindLabel()`, so a recording reads
"Aufzeichnung". `EventTile` shows `entry.title || entry.subLabel || unknown`.
Nothing else changes. Deletion already handles a missing `sourceEventId`
(`recordingDeletion` skips the origin), and playback uses `clipUrl` as it does
for events.

### D8: The customer doc is corrected in the same change

`java-overmind-server/docs/video-capabilities.md` section 9 changes from
🕓 Geplant to ✅ Verfügbar. "Variante B … gibt es am Standort wieder frei" is
rewritten to what the server does: it copies to the central archive and keeps
the footage on site under the node's retention. The note that freeing on site
is planned is marked 🕓.

## Risks / Trade-offs

- **The server and the browser disagree on "now"**, so a quick "1 hour" end
  could be refused as not in the future, or a countdown could be off by the
  clock skew. → The quick durations are far from the boundary. The start button
  blocks only an end moment in the past by the browser's clock, and the server's
  400 reason is shown if it disagrees.
- **Editing the stream settings during a job.** The server switched the camera
  to continuous recording and restores the prior config at the end. A user who
  saves the stream settings mid-job changes what the job restores to, or is
  overwritten by the restore, depending on the server. → Out of scope for the
  first version. It is noted as an open question for the server, and the stream
  settings dialog is not changed.
- **N parallel reads on page load**, one per camera. → Installations have a
  handful of cameras, and each read stays on the server without contacting a
  node (server spec: "without contacting the camera's node").
- **The central variant uses node disk as well as uplink.** The wording could
  lead the user to believe otherwise. → The spec forbids claiming the node is
  freed, and D8 fixes the customer doc.

## Open Questions

- What happens to stream-settings edits made during a running job when the job
  ends and restores the prior configuration? This is a server question. It does
  not change this GUI change, and it is taken to `java-overmind-server` if it
  shows up in practice.
