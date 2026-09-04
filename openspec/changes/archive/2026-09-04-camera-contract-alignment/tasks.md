## 1. The mocks first, so the seam can be checked against the real contract

- [x] 1.1 Rewrite the camera entries in `~/.local/share/overmind-gui-verify/mocks/cameras.mjs`
      to the deployed shape — flat `recordingEnabled` / `recordingMode` (uppercase)
      / `retentionDays` / `detectWidth` / `detectHeight` / `detectFps` /
      `detectAudioEnabled` / `motionThreshold`, `sourceUrl` + `subStreamUrl` and no
      `liveSourceUrl` / `detectSourceUrl`, `streams` and `roles` always answered —
      and verify by diffing the mock against `CameraJson` field by field
- [x] 1.2 Set `settableFields: []` on every mocked stream and on the probe answers,
      drop `bitrateKbps` from the probed streams and from `probeOk`, and add
      `probedAt` to `probeOk`; verify no mock still claims `['fps']` or a bitrate
- [x] 1.3 Add `defaultRetentionDays` to `nodesWithFacts`' first node and leave the
      second without it, so both the named default and the unknown case are on
      screen; verify the two nodes differ in exactly that field
- [x] 1.4 Change the refusal mocks to answer `{"reason": "…"}` instead of
      `{"message": "…"}`, and verify by grepping the mocks for `message`
- [x] 1.5 Run the three camera suites (`./run.sh cameras-page`,
      `./run.sh camera-stream-settings`, `./run.sh cameras-consumers`) and record
      which assertions now fail — this list is what section 2 has to turn green
      — **result:** `cameras-page` 47/48, the one failure being the `{"reason"}`
      refusal of a node deletion (§3.1). `camera-stream-settings` 71/81:
      `settingsReported` false (§2.2), the retention lost on read so lowering it
      asks nothing (§2.1), two refusals showing the axios text (§3.1), and four
      assertions that describe the *assumed* contract rather than a GUI defect —
      one settable parameter, a probed bitrate, and the storage estimate — which
      section 7.2 rewrites onto the deployed shapes. `cameras-consumers` 31/31.

## 2. The service seam

- [x] 2.1 Read the flat recording and detection fields into `recording{}` /
      `detect{}` in `normalizeCamera`, lowering `recordingMode`, and verify the
      stream dialog opens a mocked camera with its stored values filled in
- [x] 2.2 Base `settingsReported` on the presence of `recordingEnabled` rather than
      of the nested objects, and verify the "node does not report this" notice is
      gone for a mocked camera and still shown for one sent without the field
- [x] 2.3 Rewrite `toWire` to build the payload explicitly and flat, dropping
      `liveSourceUrl` / `detectSourceUrl` and uppercasing `recordingMode`; verify
      the request body captured by the mock server carries no nested block and no
      dead URL field
- [x] 2.4 Drop `detectSourceUrl` from the derivation in `normalizeCamera` and keep
      `subStreamUrl` as the live source, and verify a camera sent without `streams`
      still comes out with `main` and `sub`
- [x] 2.5 Carry `probedAt` from the probe answer into `measured` in
      `toProbeResult`, and verify a probed stream shows the server's time
- [x] 2.6 Read `defaultRetentionDays` in `normalizeNode`, null when absent, and
      verify both mocked nodes normalize as intended
- [x] 2.7 Update `Camera.ts` and `CameraNode.ts` — remove `detectSourceUrl`, remove
      the two dead fields from `CameraWrite`, add `defaultRetentionDays` — and
      verify `npm run build` type-checks (the dev server does not)

## 3. Refusals reach the dialogs

- [x] 3.1 Read `data.reason` before `data.message` in
      `axiosUtils.appendErrorCatcher`, and verify a mocked `{"reason": …}` refusal
      of a camera write shows that sentence in the stream dialog
- [x] 3.2 Verify the same for a node write and for the setup assistant's create
      step, including that the assistant still routes the reason to the step that
      owns the field

## 4. Validation before the round trip

- [x] 4.1 Add the three checks — retention positive while recording is on, stream
      name `[a-z0-9_]` and non-empty, every stream has a URL — to `cameraDisplay`
      with their messages in both locale files, and verify each rejects and accepts
      its boundary case
- [x] 4.2 Apply them in `CameraStreamSettings.vue` before `save`, and verify each
      of the three scenarios from the spec leaves the dialog open with nothing sent
- [x] 4.3 Apply the stream-name and stream-URL checks in `CameraSetupAssistant.vue`
      where a stream is added, and verify a name with a capital letter is refused
      there too
- [x] 4.4 Stop stamping `new Date()` on a probe result in both components, falling
      back to it only when the answer carries no `probedAt`; verify with a mocked
      probe answer that omits it

## 5. The node's default retention on screen

- [x] 5.1 Show `defaultRetentionDays` among the node facts in
      `CameraNodeDialog.vue`, unknown when absent, and verify against the two
      mocked nodes
- [x] 5.2 Pass the camera's node into `CameraStreamSettings.vue` and show the
      node's default as the hint under an empty retention field, naming the days;
      verify a camera with no retention on a node with a default reads as "the
      node's default of N days applies" and one on a node without as unknown
- [x] 5.3 Add both strings to `de-AT.json` and `en-US.json` and verify no key is
      missing in either

## 6. Drop the dead fields from the callers

- [x] 6.1 Remove `liveSourceUrl` / `detectSourceUrl` from the form state and both
      payload builders in `KioskCameras.vue`, and verify editing a camera round
      trips without losing its streams, roles or settings
- [x] 6.2 Remove them from `CameraStreamSettings.payload()` and
      `CameraSetupAssistant.payload()`, and verify creating a camera through the
      assistant still assigns all three purposes

## 7. Verification

- [x] 7.1 Run `npm run lint` and `npm run build` and verify both are clean
- [x] 7.2 Run all three camera suites and verify every assertion from 1.5 passes
- [x] 7.3 Extend `camera-stream-settings.mjs` with the case the shipped bug would
      have caught — save a recording setting, reload the camera, assert the value
      comes back — and verify it fails against the pre-change service
- [x] 7.4 Correct the storage-estimate sentence in
      `java-overmind-server/docs/video-capabilities.md` (a measurement alone is not
      enough; the camera has to report a bitrate, and none here do) and add the
      node's default retention to the node-facts section; verify the ✅ / 🕓
      markers still match what is built. **Other repo — commit there separately.**
      — corrected: the estimate needs a camera that *reports* a bitrate, which
      none here do, and section 7's note on the node default now matches the
      node-facts section.
