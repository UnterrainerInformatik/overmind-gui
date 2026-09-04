## Context

See `proposal.md` — Why. The state that shapes the approach:

- The GUI's camera model is nested (`recording{}`, `detect{}`, `streams[]`,
  `roles{}`) and every component reads it that way. `camerasService` is already
  the single seam that adapts wire to model: it lowers the enums, derives streams
  from URLs and maps the live source onto `subStreamUrl`.
- The deployed contract (`java-overmind-server`, `ai/primer/endpoints.md`,
  `CameraJson` / `NodeJson` / `CameraStreamDefinitionJson` /
  `StreamProbeResultJson`) is flat for recording and detection, uppercase for
  `recordingMode`, has `sourceUrl` + `subStreamUrl` and no third URL field, always
  answers `streams` and `roles`, and refuses a write with `{"reason": "…"}`.
- `axiosUtils.appendErrorCatcher` puts `err.response.data.message` on the thrown
  error as `serverMessage`; `cameraDisplay.errorMessage` and both camera dialogs
  read only that. Every camera and node refusal now arrives as `reason`, so all of
  them show the generic fallback text.

The archived specs for `camera-stream-settings` and `camera-setup-assistant`
describe behaviour that is still wanted; nothing here changes what the page is
supposed to do, only what it sends and reads.

## Goals / Non-Goals

**Goals:**

- Every setting the stream dialog offers survives a save and comes back on the
  next read, against the deployed server.
- A refused write shows the server's own sentence, everywhere, for every route
  that answers `{"reason": …}`.
- The browser suite's mocks describe the deployed contract, so the suite can fail
  when the GUI drifts from it again.

**Non-Goals:**

- Changing the nested model the components edit. The wire shape is the server's
  business, not the dialog's.
- Making stream parameters writable. `settableFields` is empty server-side and
  stays empty; the read-only path is the only live one.
- Anything from sections A and B of `ai/open-proposals.md` (archive, recording
  jobs). This change touches only the camera and node registry seam.

## Decisions

### The nested model stays; `camerasService` flattens

`normalizeCamera` reads the flat fields into `recording{}` / `detect{}`, and
`toWire` writes them back out flat. This mirrors what the service already does
for `subStreamUrl` and keeps the grouping the dialog is laid out around.

Wire → model, on read:

| wire (flat)           | model                    |
| --------------------- | ------------------------ |
| `recordingEnabled`    | `recording.enabled`      |
| `recordingMode`       | `recording.mode` (lowered) |
| `retentionDays`       | `recording.retentionDays` |
| `detectWidth/Height/Fps` | `detect.width/height/fps` |
| `detectAudioEnabled`  | `detect.audioEnabled`    |
| `motionThreshold`     | `detect.motionThreshold` |

Alternative considered: flatten the model too, so service and wire agree. Rejected
— it spreads eight loose fields through three components and a form, and the two
blocks are exactly how the dialog is organised.

`toWire` is rewritten to build the payload field by field rather than spreading
the write object, so the nested keys cannot leak onto the wire beside their flat
counterparts.

### `settingsReported` keys on `recordingEnabled`

The flag exists so the dialog can say "the node does not report this yet" rather
than showing a default as a setting. With the nested objects gone, its source
becomes the presence of `recordingEnabled` on the payload — which the deployed
server always sends, so the notice disappears in practice, which is the correct
outcome: the settings *are* reported now. The flag is kept rather than deleted
because a server that predates the field would otherwise show `false` as a
decision somebody made.

### `reason` first, `message` second

`appendErrorCatcher` reads `data.reason || data.message`. `reason` first because a
route that sends both means the reason to be the specific one; `message` stays so
the framework's own text still reaches the log and the generic dialogs. The
property on the error keeps the name `serverMessage` — every reader already uses
it, and renaming it would touch call sites for nothing.

Alternative considered: handling this per service. Rejected — the shape is the
house convention across `/setup/nodes`, `/setup/cameras` and the routes sections A
and B will add, so the one place that unwraps errors is where it belongs.

### The two dead URL fields go off the wire, and the live one stays derived

`liveSourceUrl` and `detectSourceUrl` are dropped from `CameraWrite` and from
every payload builder. On read, `liveSourceUrl` stays as a derived convenience
(`subStreamUrl`), because the fallback derivation of `main` / `sub` streams is
still what a camera stored before named streams gets; `detectSourceUrl` is
removed, since a separate detection source is now expressed as a third named
stream with `roles.detect` pointing at it, which the server stores and provisions.
Both fields are carried invisibly through the edit form today, so nothing on
screen changes.

### `probedAt` comes from the answer

`StreamProbeResultJson` carries `probedAt`, so `toProbeResult` passes it into
`measured` and both probe call sites stop stamping `new Date()`. Where the server
omits it, the browser's time is used as before — a stream that was just measured
must not read as never probed.

### Validation lives with the fields, in the mixin

The three checks the server makes and the page does not — retention positive while
recording is on, stream name `[a-z0-9_]` and non-empty, every stream has a URL —
go into `cameraDisplay` alongside `errorMessage`, so the stream dialog and the
assistant apply the same rule and quote the same sentence. Duplicate stream names
are already checked and stay where they are.

### The node's default retention

`NodeJson.defaultRetentionDays` is added to `CameraNode` and shown in two places:
among the node's reported facts in `CameraNodeDialog`, and as the hint under the
retention field when the camera sets none. The stream dialog needs its camera's
node for this, which it already has by `camera.nodeId` — the node list is loaded
on the page and passed in rather than fetched per dialog.

## Risks / Trade-offs

- **A field renamed here but not there leaves the dialog silently empty again.** →
  The mocks are rewritten to the deployed shapes first, and the suite asserts a
  saved setting comes back — the failure mode that shipped is exactly the one the
  suite could not see.
- **`fps` is a `Double` server-side and an integer in the inputs.** → It is read
  and written as a plain number; `25` and `25.0` are the same value to both sides.
  Nothing rounds it.
- **Dropping `detectSourceUrl` from the write.** A camera stored with a detect URL
  by an older GUI keeps it server-side only if the server still carries the column;
  the deployed one does not, so there is nothing to lose. The role map covers the
  case going forward.
- **The storage estimate will almost always say "please measure".** → Accepted,
  and stated: no live source in this installation reports a bitrate. The
  customer-facing wording is corrected rather than the feature dropped, since a
  camera that does report one still gets a number.
