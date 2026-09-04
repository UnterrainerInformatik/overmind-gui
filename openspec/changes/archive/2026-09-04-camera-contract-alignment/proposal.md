## Why

The Kameras page's stream, recording and detection settings were built against an
assumed contract, because at the time the server had none. The server side is now
deployed (`java-overmind-server`, change `camera-stream-settings-backend`) and it
differs from the assumption in four places — enough that the settings never come
back from a read, the dialog permanently says the node "does not report this yet",
saving writes into nothing, and every refusal the server explains falls back to a
generic error text. The page looks finished and does nothing.

## What Changes

- Read and write the recording and detection settings where the server actually
  carries them: flat on the camera (`recordingEnabled`, `recordingMode`,
  `retentionDays`, `detectWidth`, `detectHeight`, `detectFps`,
  `detectAudioEnabled`, `motionThreshold`) instead of nested `recording{}` /
  `detect{}` objects. The nested model stays in front of the components; the
  service flattens it on the wire, the way it already does for `subStreamUrl`.
- Treat `recordingMode` as the uppercase enum it is (`CONTINUOUS` / `EVENTS`),
  like every other enum on this contract.
- Read a refused write's reason from `reason` as well as `message`, so the
  reasons the server writes for exactly this purpose reach the dialog that has to
  show them — cameras, nodes, and every future route that answers this way.
- Stop sending `liveSourceUrl` and `detectSourceUrl`, which the server does not
  have; keep deriving the live stream from `subStreamUrl`, which it does, and let
  the server keep the two URL fields in step with the `record` / `live` roles.
- Take `probedAt` from the server's answer instead of stamping the browser's own
  clock on a measurement the node made.
- Refuse locally what the server refuses anyway, naming the field: a stream name
  outside `[a-z0-9_]`, a stream without a URL, and a missing or non-positive
  retention while recording is on.
- Show the node's `defaultRetentionDays` as the fallback behind an unset per-camera
  retention, so "not set" reads as "the node's default of N days applies" rather
  than as "unknown".
- Turn the browser suite's camera mocks into the real shapes — flat fields,
  uppercase enum, `{"reason": …}` refusals, always-empty `settableFields`, no
  `bitrateKbps` — so a green suite says something about the deployed server.

No component is rewritten and the archived specs stay valid: this moves the seam
in `camerasService` and `axiosUtils` onto the contract that exists.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `camera-stream-settings`: retention gains the node's default as a named
  fallback instead of reading as unknown; the page states what a probe's
  measurement time is and refuses the values the server would refuse, naming the
  field, before sending them.
- `camera-connections-page`: the node detail dialog reports the node's default
  retention alongside its Frigate version and storage.

## Impact

- `src/utils/webservices/camerasService.ts` — `normalizeCamera`, `normalizeNode`,
  `toWire`, `toProbeResult`; the flattening and the enum casing live here.
- `src/utils/axiosUtils.ts` — `appendErrorCatcher` reads `reason` as well as
  `message`. Affects every service, which is the point.
- `src/utils/webservices/interfaces/Camera.ts`, `CameraNode.ts` — `probedAt`
  source, `defaultRetentionDays`, the dead URL fields.
- `src/components/CameraStreamSettings.vue`, `CameraSetupAssistant.vue` —
  validation before save, the probe's own timestamp, the retention hint.
- `src/components/CameraNodeDialog.vue` — the default retention among node facts.
- `~/.local/share/overmind-gui-verify/mocks/cameras.mjs` and the camera suites —
  the assumed shapes are replaced by the deployed ones.
- Customer-facing: `java-overmind-server/docs/video-capabilities.md` describes the
  storage estimate as available once a stream is measured; in practice no live
  source here reports a bitrate, so the sentence overpromises.
