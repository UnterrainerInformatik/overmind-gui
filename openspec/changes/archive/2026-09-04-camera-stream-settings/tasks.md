## 1. The contract in the interfaces

- [x] 1.1 Add `StreamRole`, `CameraStream`, `CameraRecordingSettings` and
  `CameraDetectSettings` to `src/utils/webservices/interfaces/Camera.ts` exactly
  as design.md spells them, and extend `Camera` and `CameraWrite` with `streams`,
  `roles`, `recording` and `detect`. Carry the design's reasoning into the
  doc comments — why `roles` maps role → stream *name* rather than an index, and
  that `settableFields` empty means read-only — since that is the part a later
  reader cannot recover from the types. Verify with `npm run build` that the file
  compiles (the dev server does not type-check, so a build is the only check that
  counts)
- [x] 1.2 Extend `CameraNode` with the facts the detail dialog shows —
  `frigateVersion: string | null`, `storageTotalBytes: number | null`,
  `storageUsedBytes: number | null` — documented as absent until the server
  reports them. Verify the build still passes

## 2. `camerasService`: derivation, write-back and the probe

- [x] 2.1 Add the stream derivation from design.md's table to
  `normalizeCamera`: a camera the server sends without `streams` gets `main`
  from `sourceUrl`, `sub` from `liveSourceUrl`/`subStreamUrl` and `detect` from
  `detectSourceUrl`, with the roles pointed at whichever of those exist, all
  parameters null and `settableFields` empty. A camera that *does* carry
  `streams` is taken as sent. Verify against the three rows of the table by
  feeding the three payload shapes through the service and checking the derived
  names and role map, including that a source-only camera has all three roles on
  `main`
- [x] 2.2 Add the reverse in `toWire`: the stream each role points at is written
  back into `sourceUrl` (record), `liveSourceUrl` *and* `subStreamUrl` (live) and
  `detectSourceUrl` (detect), alongside the new fields. Verify that a camera
  read from a two-URL payload and written straight back produces the same
  `sourceUrl` and `subStreamUrl` it came in with — the round trip must not move a
  camera onto a different stream just by being opened
- [x] 2.3 Add `recording` and `detect` defaults for a server that omits them —
  recording off, mode `events`, retention null, detect all null, audio off — and
  a way for the page to tell "off" from "not reported", since the spec shows the
  second as unknown rather than as a setting. Verify both shapes through the
  service
- [x] 2.4 Add `probeStream(nodeId, url, username?, password?)` calling
  `nodeStreamProbe` through `axiosUtils.postToPath`, reading a failure the way
  `toTestResult` reads one — an answer carrying a `reason`, not an HTTP error —
  and returning either the measured parameters or the reason. Verify with a
  mocked success and a mocked `{ reason }` answer that both come back as results
  rather than as a thrown error
- [x] 2.5 Add `nodeStreamProbe: '/setup/nodes/{id}/streamProbe'` to
  `src/store/rest.ts` next to `nodeTest`, with a comment saying why the probe
  hangs off the node and not the camera (the assistant probes a camera that does
  not exist yet). Verify the call reaches that path in the browser harness's
  network log

## 3. `CameraStreamSettings.vue`

- [x] 3.1 New component taking one camera, listing its streams with name, URL and
  parameters, and emitting `saved` with the updated camera. Parameters that were
  never probed read as unknown, not as zeros. Verify in the harness against a
  mocked camera with one probed and one unprobed stream that the unprobed one
  shows the unknown treatment and offers the probe
- [x] 3.2 Add stream add and remove, refusing removal of `main` and of a stream a
  role still points at — naming the roles in the refusal. Verify both refusals
  fire and leave the stream list unchanged
- [x] 3.3 Add the role assignment: three selects over the camera's stream names,
  several roles on one stream allowed. Verify a camera with a single stream shows
  all three roles on it without a warning, and that reassigning a role and saving
  sends the new map
- [x] 3.4 Add the detect advisory from design.md — assigned detect stream wider
  than 1280 px or faster than 10 fps — naming the lower-resolution stream when
  the camera has one. Verify it appears for a 1920×1080/25fps detect assignment,
  disappears when the assignment moves to the sub stream, and never blocks the
  save
- [x] 3.5 Add the probe control per stream: busy state on that stream only, the
  measured values and the measurement time on success, the server's reason plus
  the previously known values on failure, and nothing probed on open. Verify all
  four, the last one by asserting no probe request leaves the page on open
- [x] 3.6 Render each parameter as an input only when the stream's
  `settableFields` names it, and read-only otherwise with the note that the value
  comes from the camera. Verify with a mocked stream that lists `fps` as settable
  and nothing else that exactly one field is editable
- [x] 3.7 Add the recording block — on/off, continuous vs. events, retention in
  days — with the retention and mode shown as not applicable while recording is
  off, a confirmation when the retention is lowered, and the ≈GB/day estimate
  from design.md on continuous, shown only when the record stream has a probed
  bitrate. Verify each of the four behaviours, and that the estimate is replaced
  by the invitation to probe when the bitrate is unknown
- [x] 3.8 Add the detect block — resolution, frame rate, audio, motion
  sensitivity slider — with the advisory when the entered resolution exceeds what
  the assigned stream delivers and when audio is switched on for a stream whose
  probe found no audio track. Verify both advisories and that neither blocks the
  save
- [x] 3.9 Wire save and cancel: cancel sends nothing, a failed save keeps the
  dialog open with the values and the reason. Verify with a mocked rejecting
  server that the dialog stays open and nothing is lost

## 4. `CameraSetupAssistant.vue`

- [x] 4.1 New component: a `v-stepper` with the four steps from the spec, the
  completed ones reachable, the draft held in the component, nothing created on
  the server until the final confirm. Vertical on `xsOnly`, fullscreen dialog on
  `xsOnly` like the existing camera dialog. Verify in the harness at a phone
  viewport that the header does not overflow, measuring computed style rather
  than reading the stylesheet
- [x] 4.2 Step 1 — node: select an existing node with its last-known
  reachability, offer creation when none is configured, create one inline through
  `createNode` and select it, say so when the chosen node's last status is an
  error while still allowing the step to continue, and state that a node created
  here stays if the assistant is cancelled. Verify the empty-node case opens on
  the creation offer rather than an empty select
- [x] 4.3 Step 2 — connection: address plus optional credentials, an on-demand
  test showing success or the server's reason, values kept on failure, and
  continuing after a failed or skipped test allowed but announced as unverified.
  Verify all three outcomes against mocked `OK` and `ERROR` answers
- [x] 4.4 Step 3 — streams: probe the entered address, add a second stream with
  its own name and URL, propose the default assignment from the spec (record and
  live on main, detect on the second stream when one exists), let the user change
  it, and allow continuing with nothing probed. Verify the proposal appears for a
  two-stream draft and that an unprobed draft still reaches step 4
- [x] 4.5 Step 4 — name, Frigate key, page usage, sort order, plus the summary
  naming the node, the test outcome and the assignment; confirm creates the
  camera through `createCamera` with everything the steps collected. Verify the
  created payload carries the node, credentials, streams and roles from the
  earlier steps, not just the last step's fields
- [x] 4.6 Handle the two server answers on confirm: a rejection shows its reason
  on the step that owns the offending value and keeps the assistant open; a
  camera created as not-yet-provisioned closes the assistant and lands in the
  list with its provisioning state. Verify both against mocked answers
- [x] 4.7 Verify cancelling at every step leaves the server untouched except for
  a node deliberately created in step 1 — assert on the harness's request log,
  not on the screen

## 5. `CameraNodeDialog.vue`

- [x] 5.1 New component showing one node over the Kameras page: its cameras with
  name, enabled state and stream assignment, its last-known reachability, its
  Frigate version and its storage, with unknown shown as unknown when the server
  reports neither. Verify against a mocked node with and without those fields
- [x] 5.2 Show the empty case — no cameras on this node — with an offer to add
  one for that node, which opens the assistant with the node preselected. Verify
  the assistant opens on step 2 with the node already chosen
- [x] 5.3 Emit `edit`, `test` and `delete` to the page so the existing handlers
  stay the only implementation, and reflect the outcome in the dialog. Verify a
  test triggered from the dialog updates the status line shown there and in the
  node list

## 6. The Kameras page

- [x] 6.1 Replace the raw URL lines in a camera's list entry with its stream
  assignment, collapsed to a single statement when the camera has only one
  stream. Verify both entry shapes in the harness
- [x] 6.2 Remove the create dialog and point the add control at the assistant;
  keep the edit dialog as a form, minus the three URL fields, which now live in
  the stream settings. Verify that the add control opens the assistant and the
  edit control still opens the form
- [x] 6.3 Add the stream-settings control to each camera entry, opening
  `CameraStreamSettings` for that camera and reloading the list on `saved`.
  Verify the reload happens after a save and not after a cancel
- [x] 6.4 Make a node entry open `CameraNodeDialog`, passing the cameras of that
  node, without disturbing the row's existing test, edit and delete buttons.
  Verify a click on the row opens the dialog while a click on a button does not
- [x] 6.5 Verify the page has not grown: `KioskCameras.vue` is smaller than the
  862 lines it starts at, with the three new surfaces in their own components

## 7. Translations

- [x] 7.1 Add the `page.kiosk.cameras.assistant.*`, `.streams.*` and
  `.nodeDetail.*` subtrees to `src/locales/de-AT.json` and
  `src/locales/en-US.json`, including the advisory and confirmation texts, which
  carry the actual meaning (what "less sensitive" means, that lowering the
  retention discards footage, that a stored password stays). Verify both files
  parse and have the same key set, and that no `$t` call in the new components
  is missing from either

## 8. Verification

- [x] 8.1 Extend `~/.local/share/overmind-gui-verify/mocks/cameras.mjs` with the
  new payload shapes — a camera carrying `streams`/`roles`/`recording`/`detect`,
  a camera in the old two-URL shape, a node with and without version and storage,
  and probe success and failure answers. Extend the existing
  `suites/cameras-page.mjs` and add `suites/camera-stream-settings.mjs` rather
  than starting a new harness
- [x] 8.2 Run `npm run lint` and `npm run build` clean — the build in particular,
  since the dev server the harness drives does not type-check and a green suite
  says nothing about the production build
- [x] 8.3 Run the camera suites and confirm the derivation seam end to end: the
  page renders a camera that arrives in the old two-URL shape with a sensible
  assignment, and saving it back does not change the URLs the deployed server
  reads
