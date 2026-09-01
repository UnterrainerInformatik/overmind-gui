## Why

Camera connections live in the frontend sources. `KioskPersonen.vue` carries the
go2rtc URL `https://frig.unterrainer.info/live/webrtc/api/ws?src=keller` and calls
`getTrackedPersons('keller')`; `KioskPersonenEvents.vue` has `const CAMERA = 'keller'`;
`frigateService.ts` has the Frigate host as a private field. Adding a camera means
editing three files and redeploying, and only one Frigate can ever be reached.

The overmind server is becoming the system of record for cameras (backend change
`camera-registry-and-node-routing` in `java-overmind-server`): a camera is entered
once, the server pushes it into the Frigate of the node it belongs to, and the
server serves stream, events and clips for it. The GUI needs the page where that
entering happens, and its existing camera pages need to read the camera from the
registry instead of from a constant.

## What Changes

- New "Kameras" page, reachable from the kiosk overview, listing every configured
  camera connection with its node, its reachability and its provisioning state.
- Create a camera on that page: display name, Frigate key, node, source stream URL
  and optional credentials, the per-page usage flags, and ordering.
- Edit and delete an existing camera, with a confirmation before deleting.
- Manage the nodes cameras are bound to (add, edit, delete), since a camera cannot
  be entered without one.
- Per-camera and per-node connection test button showing the result inline, plus the
  stored last-known status in the list.
- New `camerasService` talking to the server's `/setup/cameras`, `/setup/nodes` and
  test endpoints, and new endpoint entries in `src/store/rest.ts`.
- **BREAKING** for the two existing camera pages: the Personen page streams the
  camera(s) flagged for the live page and the events page lists events for the
  camera(s) flagged for the events page, both resolved from the registry, instead of
  the hard-coded `keller`. `frigateService.ts` stops addressing Frigate directly and
  goes through the server's camera routes.

## Capabilities

### New Capabilities
- `camera-connections-page`: seeing, creating, editing, testing and deleting camera
  connections and the nodes they live on, from a kiosk-reachable management page.

### Modified Capabilities
- `kiosk-personen-page`: the live feed comes from the camera configured for the live
  page rather than a hard-coded Keller camera.
- `kiosk-personen-events-page`: the event list covers the camera(s) configured for
  the events page rather than a hard-coded Keller camera.

## Impact

- New view `KioskCameras.vue`, a route, and a link panel on `KioskOverview.vue`.
- New `src/utils/webservices/camerasService.ts` plus interfaces; endpoint entries in
  `src/store/rest.ts`.
- `frigateService.ts` is rewritten to call the overmind server instead of Frigate, or
  replaced by the new service; `KioskPersonen.vue` and `KioskPersonenEvents.vue` lose
  their camera constants.
- New translation keys in `src/locales/de-AT.json` and `en-US.json`.
- Depends on the backend change `camera-registry-and-node-routing`; its
  `ai/draft-cameras-for-frontend.md` is the contract this change is built against.
  Until the backend ships, this change cannot be verified end to end.
