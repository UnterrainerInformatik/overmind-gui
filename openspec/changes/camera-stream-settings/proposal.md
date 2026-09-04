## Why

The Kameras page can enter a camera, but only as a set of URLs: `sourceUrl`,
`liveSourceUrl`, `detectSourceUrl`. Everything that decides whether the
installation actually works — which stream is watched, which one is fed to
detection, which one is recorded, at what resolution and frame rate, how long the
footage is kept — is either invisible in the GUI or has to be typed into a URL
field and hoped for. A camera that streams 4K at 25 fps into detection quietly
eats the node; nobody sees it on the page.

Two things follow from that. Adding a camera is currently one long form of
fourteen fields where nothing is verified until the user saves and the
provisioning state comes back `failed` — the fields that matter most (does this
URL even answer, and what does it deliver?) are exactly the ones the form cannot
answer. And a node is a name and a base URL in a list, although it is the thing
that runs out of CPU and disk when the stream settings are wrong.

## What Changes

- Every camera gains **named streams** (`main`, `sub`, and further ones a node
  reports) with their measured parameters — resolution, frame rate, bitrate,
  video and audio codec — instead of three bare URL fields.
- **Role assignment per purpose**: live, detect and record each point at one of
  the camera's streams. The old three-URL model becomes the default assignment
  (`main` → record and live, `sub` → detect where present), so existing cameras
  keep their behaviour without anyone touching them.
- **Recording settings per camera**: recording on or off, continuous versus
  only on events, and the retention in days.
- **Detect settings per camera**: detect resolution and frame rate, audio on or
  off, motion sensitivity.
- A **probe** control that asks the node what a stream really delivers and fills
  the measured parameters in, rather than having the user guess them. Parameters
  the node reports as settable can be changed; the rest are shown read-only.
- Adding a camera becomes a **guided four-step assistant**: pick or create the
  node → enter the camera's address and credentials and test it right there →
  probe the streams and assign the roles → name it, choose the pages it appears
  on, save. The long single form remains for editing an existing camera.
- The node list gets a **detail dialog**: the node's cameras with their assigned
  streams, its last-known reachability, its Frigate version and its storage, plus
  the node's own edit and test controls. The nodes stay a section of the Kameras
  page — no second page.

## Capabilities

### New Capabilities
- `camera-stream-settings`: naming a camera's streams, assigning them to the
  live, detect and record purposes, probing what they deliver, and setting the
  recording and detection parameters per camera.
- `camera-setup-assistant`: adding a camera through a guided sequence of steps
  that verifies the connection and the streams before the camera is stored, and
  that can create the node on the way.

### Modified Capabilities
- `camera-connections-page`: the list shows a camera's stream assignment instead
  of its raw URLs; adding a camera goes through the assistant; the node section
  gains a detail dialog.

## Impact

- `KioskCameras.vue` (862 lines today) sheds its create dialog and grows a node
  detail dialog; the new surfaces become components of their own —
  `CameraSetupAssistant.vue`, `CameraStreamSettings.vue`, `CameraNodeDialog.vue`.
- `camerasService.ts` gains the probe call and carries the new camera fields;
  `interfaces/Camera.ts` gains the stream, role, recording and detect types;
  `interfaces/CameraNode.ts` gains the node's reported version and storage.
- New endpoint entry in `src/store/rest.ts` for the probe.
- New translation keys in `src/locales/de-AT.json` and `en-US.json`.
- **The backend does not serve any of this yet.** The camera registry
  (`/setup/cameras`, `/setup/nodes`) is deployed with the two-URL schema. This
  change picks the shapes, states them in `design.md` as assumptions, and keeps
  the page working against today's server by mapping the assignment back onto
  `sourceUrl` / `subStreamUrl` — the same adaptation `camerasService` already
  makes. The corresponding backend work has to be raised in
  `java-overmind-server`.
