## Context

See `proposal.md` — Why. What matters for the approach:

- `KioskCameras.vue` (862 lines, options API, Vuetify 2) holds both lists, both
  form dialogs, both connection tests and the confirm dialog. It is at the size
  where the next dialog has to move out rather than in.
- `camerasService.ts` already carries a two-to-three adaptation: the deployed
  server knows `sourceUrl` and one optional `subStreamUrl`, this GUI's model has
  three URLs, and `normalizeCamera` / `toWire` translate in one place. That
  precedent is the template for this change.
- **No part of the new contract is deployed.** `/setup/cameras`, `/setup/nodes`
  and the two `/test` endpoints exist; streams, roles, probing, recording and
  detect settings do not. Per the house rule for unbuilt backend routes, this
  change picks the shapes, writes them down here, and keeps moving.

## Goals / Non-Goals

**Goals:**

- One place in the frontend — `camerasService` plus the camera interfaces —
  where the assumed contract lives, so a differing backend costs one file.
- The page keeps working against today's two-URL server for the whole time the
  backend work takes.
- The Kameras page gets smaller, not larger, despite three new surfaces.

**Non-Goals:**

- No node page and no node route: the detail view is a dialog over the Kameras
  page (`camera-connections-page` delta).
- No zone or object-class editing — motion sensitivity is the only detection
  tuning in scope.
- No live preview inside the assistant; the connection test and the probe are
  what verify a stream. A picture would mean a second player and a second
  transport decision.
- Nothing in this change touches the Personen or Events pages: they read cameras
  through `getCamerasForLivePage()` / `getCamerasForEventsPage()`, and those keep
  their signatures.

## Decisions

### The camera carries its streams; the roles are a map onto them

```ts
export type StreamRole = 'live' | 'detect' | 'record'

export interface CameraStream {
  name: string;            // 'main', 'sub', or whatever the node reports
  url: string;
  // measured by a probe; all null until one has run
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrateKbps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;   // null = no audio track found
  probedAt: string | null;     // UTC LocalDateTime
  // which of the above the node will actually write back to the camera;
  // absent or empty = everything is read-only
  settableFields: string[];
}

export interface Camera extends LastKnownStatus {
  // ... unchanged fields ...
  streams: CameraStream[];
  roles: Record<StreamRole, string>;    // role -> stream name
  recording: CameraRecordingSettings;
  detect: CameraDetectSettings;
}

export interface CameraRecordingSettings {
  enabled: boolean;
  mode: 'continuous' | 'events';
  retentionDays: number;
}

export interface CameraDetectSettings {
  width: number | null;
  height: number | null;
  fps: number | null;
  audioEnabled: boolean;
  motionThreshold: number;   // 0-100, higher = less sensitive
}
```

Alternative considered: keeping the three URL fields and hanging parameters off
each. Rejected because "which stream serves which purpose" then stays implicit in
field names, a fourth stream is impossible, and the detect warning has no stream
to point at. A named list plus a role map says the same thing once and survives a
camera with four streams.

`roles` is a name map, not an index or an id: names survive reordering, and a
role pointing at a name that no longer exists is a visible, correctable error
rather than a silently wrong stream.

### The whole camera is written in one PUT

Stream settings are saved as part of the camera resource
(`PUT /setup/cameras/{id}`), not through a settings endpoint of their own.
`BaseService.put` already does it, the server owns the camera as one aggregate,
and a partially-saved camera — new roles stored, recording settings not — is
the failure mode worth designing out.

### One probe endpoint, addressed at the node, taking a URL

```
POST /setup/nodes/{id}/streamProbe   { url, username?, password? }
  -> { width, height, fps, bitrateKbps, videoCodec, audioCodec,
       settableFields: [...] }
  or { reason }  on failure
```

The assistant probes a camera that does not exist yet, so a route hanging off a
camera id cannot serve it. Addressing the node instead serves both callers with
one endpoint: the node is the machine that can reach the camera, and the stored
camera's settings dialog simply passes the URL it already has. New `rest.ts`
entry `nodeStreamProbe: '/setup/nodes/{id}/streamProbe'`, called through
`axiosUtils.postToPath` like the two existing test endpoints.

Failure follows the house shape of the test endpoints — not an HTTP error, but
an answer carrying a `reason` — so `camerasService` reads it with the same
helper.

### Reading and writing against today's server

`normalizeCamera` gains a step: when the server sends no `streams`, one is
derived from the URLs it does send.

| server sends | derived streams | derived roles |
| --- | --- | --- |
| `sourceUrl` only | `main` | live, detect, record → `main` |
| `sourceUrl` + `subStreamUrl`/`liveSourceUrl` | `main`, `sub` | record → `main`; live, detect → `sub` |
| all three URLs | `main`, `sub`, `detect` | record → `main`; live → `sub`; detect → `detect` |

`toWire` does the reverse: the stream a role points at is written back into the
URL field the deployed server knows (`sourceUrl` from `record`, `subStreamUrl`
and `liveSourceUrl` from `live`, `detectSourceUrl` from `detect`), alongside the
new fields. A server that ignores the new fields still stores a correct camera; a
server that understands them wins on read, exactly as `liveSourceUrl` already
beats `subStreamUrl` today.

Recording and detect settings have no equivalent on today's server. They are sent
and, when they come back absent, shown as unknown with a line saying the node
does not report them yet — the spec's "not measured yet" treatment, applied to
settings.

### Three components out of the page

- `CameraSetupAssistant.vue` — a `v-stepper` with the four steps, owning the
  whole draft camera. It creates nothing until the final confirm; the one
  exception is a node created in step 1, which is a real resource of its own and
  is `POST`ed immediately (the spec says it appears in the node list right away).
  It emits `created` with the stored camera, and the page reloads its lists.
- `CameraStreamSettings.vue` — the streams, the role assignment, recording and
  detect for one existing camera. Takes the camera, emits `saved`.
- `CameraNodeDialog.vue` — the node detail view, taking the node and the cameras
  of that node, emitting `edit`, `test` and `delete` back to the page so the
  existing handlers stay the single implementation.

The page keeps both lists, both test flows, the node form and the confirm dialog,
and loses its camera create dialog. The camera edit form stays on the page (spec:
editing stays a form) minus the URL fields, which move into the stream settings.

Alternative considered: one component for both the assistant and the edit form.
Rejected — the shared part is the field set, not the behaviour, and a component
that is a wizard or a form depending on a prop is the harder thing to read.

### Where the advisory numbers come from

- **Detect warning**: the assigned detect stream is wider than 1280 px or faster
  than 10 fps. Frigate's own guidance, and the two numbers most often got wrong.
- **Storage estimate** for continuous recording: `bitrateKbps / 8 / 1024 / 1024`
  GB per second × 86400, shown as a rounded "≈ N GB/day". Only shown when the
  record stream has been probed; without a bitrate there is no honest number, so
  the line says "probe the stream to see this" instead of guessing.

Both are advisory. Neither blocks a save — the installation is allowed to know
better than the page.

### Sensitivity is one number

`motionThreshold` 0–100 on a slider, high = less sensitive, with the semantics
stated on the label. Frigate has several motion knobs; exposing them all makes the
dialog a config file. One number that the backend maps is the useful surface here,
and the field can grow later without breaking the stored shape.

## Risks / Trade-offs

- **The whole contract is assumed.** → It lives in `camerasService.ts` and the
  two interface files, and every consumer reads the model, not the wire. A
  different backend shape is a change to `normalizeCamera` / `toWire` and the
  probe reader.
- **Recording and detect settings cannot be verified end to end until the
  backend ships.** → They are stored and re-read through the same round trip as
  everything else, so what can be checked is checked; the change is not
  verifiable beyond that and says so.
- **The assistant holds a camera that does not exist yet**, so a browser reload
  mid-assistant loses the entry. → Accepted: four short steps, and the
  alternative (a draft camera on the server) means half-provisioned cameras in
  the list, which is worse than retyping a URL.
- **A node created in step 1 outlives a cancelled assistant.** → Stated on the
  step, and the node list is right there to delete it.
- **`v-stepper` and the settings dialog on a phone**: the Kameras page is
  reachable from the kiosk, and Vuetify's stepper header does not wrap well. →
  `vertical` stepper on `xsOnly`, and the dialogs fullscreen on `xsOnly` like the
  existing camera dialog. Vuetify overrides are verified through computed style,
  never by reading the stylesheet.
- **Three new dialogs' worth of translation keys.** → One `page.kiosk.cameras.*`
  subtree per component (`assistant.*`, `streams.*`, `nodeDetail.*`), so a
  missing key is obvious rather than scattered.

## Migration Plan

No data migration and no server-side change is required for this to ship: a
camera with no `streams` gets its streams derived on read, and writing sends both
shapes. The order is therefore GUI first, backend after, with the derivation
table above as the seam. When the backend does ship the real fields, the
derivation stays as the fallback for cameras that predate it.

Rollback is a revert of the change: the stored cameras are untouched in the
fields today's server reads.

## Open Questions

- Which parameters a node will report as settable in practice — possibly none at
  first, in which case the whole parameter block is read-only and the change is
  still worth having for the assignment, the probe and the recording settings.
  This does not affect the specs: they already say the page follows what the
  server reports.
- Whether the retention is per camera or per node on the backend. The GUI asks
  per camera, which degrades correctly if the server applies it per node — but
  the label would then be wrong, so this needs an answer before the backend
  work starts.
