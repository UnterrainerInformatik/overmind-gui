## 1. Service layer

- [ ] 1.1 Read `ai/draft-cameras-for-frontend.md` from `java-overmind-server` and note any place the contract differs from this change's specs; verify the two agree before writing code, and raise the difference if they do not
- [ ] 1.2 Add the `cameras`, `nodes` and camera/node test endpoints to `src/store/rest.ts` alongside the existing `/setup/*` entries; verify the resolved URLs by logging one request against the running server
- [ ] 1.3 Add `src/utils/webservices/interfaces` types for a camera and a node matching the contract, including provisioning state and last-known status; verify `npm run build` type-checks them
- [ ] 1.4 Add `src/utils/webservices/camerasService.ts` on the `BaseService`/`rest.ts` conventions with list, get, create, update, delete and test for both cameras and nodes; verify each call against the running server

## 2. The Kameras page

- [ ] 2.1 Add `src/views/KioskCameras.vue`, a route in `src/router/index.ts` and a `KioskLinkPanel` on `KioskOverview.vue`, plus a back link on the page; verify both directions of navigation in the browser
- [ ] 2.2 Render the camera list — name, Frigate key, node, enabled, page usage, last-known status, provisioning state — in the configured order, using the density and layout idiom of `KioskPersonenVerwaltung.vue`; verify against the seeded camera
- [ ] 2.3 Add the empty state and the load-error state; verify by listing with no cameras configured and by pointing the service at an unreachable server
- [ ] 2.4 Mark cameras whose provisioning state is pending or failed and make the reason readable; verify with a camera whose node is down
- [ ] 2.5 Add all new strings to `src/locales/de-AT.json` and `en-US.json`; verify no raw key appears on the page in either language

## 3. Creating, editing, deleting

- [ ] 3.1 Add the create form — display name, Frigate key, node, source URL, credentials, page-usage flags, order — with the confirm control disabled while a required field is empty; verify a created camera appears in the list
- [ ] 3.2 Show the server's rejection reason without discarding the entered values; verify by submitting a Frigate key already used on that node
- [ ] 3.3 Point the user at the node form when no node exists yet; verify with an empty node list
- [ ] 3.4 Add the edit form, reusing the create fields, including moving a camera to another node and toggling enabled; verify a change round-trips
- [ ] 3.5 Leave the password untouched when the field is left empty on edit, and never render a stored password; verify by editing a camera with credentials and confirming the stream still works afterwards
- [ ] 3.6 Warn and require confirmation when an existing camera's Frigate key changes, stating that footage under the old key is orphaned; verify the dialog appears only for a key change
- [ ] 3.7 Add delete with a confirmation naming the camera and stating that recorded footage is not removed; verify both confirming and cancelling
- [ ] 3.8 Reload the list after each successful write; verify the list reflects a create, an edit and a delete without a manual refresh

## 4. Nodes

- [ ] 4.1 Add the node section listing name, base URL, enabled state and last-known reachability; verify against the seeded node
- [ ] 4.2 Add create, edit and delete for nodes; verify a created node becomes selectable in the camera form
- [ ] 4.3 Report the server's refusal when deleting a node that still holds cameras, and leave everything in place; verify against the seeded node

## 5. Connection test

- [ ] 5.1 Add a per-camera and per-node test control that calls the server and shows the outcome inline, including the failure reason; verify a success and at least one failure
- [ ] 5.2 Show a busy state on the triggered control only, leaving the rest of the page usable; verify while testing an unreachable node
- [ ] 5.3 Confirm the page triggers no tests on load and renders only stored status; verify that opening the page with an unreachable node is not slowed down

## 6. Switching the consumer pages over

- [ ] 6.1 Rewrite `frigateService.ts` to call the overmind camera routes instead of `https://frig.unterrainer.info`, keeping the `FrigatePastEvent` and `FrigateTrackedPerson` result shapes; verify the existing events page still lists events unchanged against the seeded camera
- [ ] 6.2 Change `KioskPersonenEvents.vue` to resolve its cameras from the registry by the events-page flag instead of `const CAMERA = 'keller'`, showing the source camera per entry and merging several cameras in time order; verify with one camera, then with two
- [ ] 6.3 Handle partial failure on the events page — list what loaded and name the cameras that could not be reached; verify by disabling one camera's node
- [ ] 6.4 Change `KioskPersonen.vue` to resolve its camera and stream handle from the registry by the live-page flag instead of the hard-coded go2rtc URL and `getTrackedPersons('keller')`; verify the live picture and the overlay boxes are unchanged against the seeded camera
- [ ] 6.5 Add the camera switch on the Personen page when several cameras are flagged for it, clearing the previous camera's boxes on switch; verify with two cameras that no stale box remains
- [ ] 6.6 Add the "no camera configured" state to both pages, pointing at the Kameras page; verify by clearing the flags
- [ ] 6.7 Remove the leftover camera constants and Frigate host from the sources and the now-obsolete `BaseService` exception comment in `frigateService.ts`; verify no occurrence of `frig.unterrainer.info` or `'keller'` remains under `src`

## 7. Verification

- [ ] 7.1 Run `npm run lint` and `npm run build`; verify both pass
- [ ] 7.2 Walk the page in the browser in both languages — add a node, add a camera, test it, edit it, delete it — and confirm the Personen and events pages still work throughout; verify with the project's browser verification harness
- [ ] 7.3 Run `openspec validate camera-connections-page --strict`; verify it passes
