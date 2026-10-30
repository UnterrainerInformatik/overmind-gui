## 1. SSE library: named-event listeners

- [x] 1.1 Add `addEventListener(name, handler)` / `removeEventListener(name, handler)` to `src/lib/sse-client/sseClient.ts` per design D2 (JSON parse in try/catch, per-handler try/catch, refresh `lastActivityTs`, attach to every new `EventSource` and to an already open one); export the handler type from `types.ts`/`index.ts` and re-export it from `src/utils/sseClient.ts`. Verify: `npm run lint` is clean and no file under `src/lib/sse-client/` gains a project import.
- [x] 1.2 Replace the `handles.size > 0` gates in `reconnectNow()`, `scheduleReconnect()` and the first-consumer path with a `hasConsumers()` that also counts listeners; the first listener calls `ensureConnection()`. Verify by reading the diff against the modified "Lazy SSE connection" and "Forced immediate reconnect on wake" requirements, and in 5.2 (a page with no transports still gets `audio-state`).

## 2. REST plumbing

- [x] 2.1 Add `putToPath(server, endpointPath, params, dataProvider)` to `src/utils/axiosUtils.ts`, next to `postToPath`, in the same doc-comment style. Verify: lint clean.
- [x] 2.2 Add the `audio*` endpoint keys from design D9 to `src/store/rest.ts` with a comment naming the server change `audio-music-assistant-bridge` as the contract source. Verify: lint clean.
- [x] 2.3 Create `src/utils/webservices/audioService.ts` (singleton like `migrationsService.ts`) with `getState`, `setRoomGrouped`, `setRoomVolume`, `command(targetId, 'play'|'pause'|'next'|'previous')`, `seek`, `setTargetVolume`, `getQueue`, `playQueueIndex`, `playMedia`, `getRadio`, `getPlaylists`; list answers accept `{items}` or a bare array; `playlistUri(p)` returns `p.uri` or `library://playlist/{id}`. Point to the server change's `audio-library` spec in a comment there. Verify: lint clean.

## 3. Shared audio state

- [x] 3.1 Create `src/utils/audioState.ts` per design D1: `Vue.observable` `{ state, available }`, `acquire()`/`release()` ref counting, `audio-state` + `connected` listeners, initial load, 30 s poll, wake reload, shape check (`mainGroup` object + `rooms` array), no snackbars. Verify: lint clean; behaviour covered in 5.2.

## 4. UI

- [x] 4.1 Before editing, measure the current `KioskLinkPanel` height in the browser (overview link row, `getBoundingClientRect().height`) and write the number into this task. **Measured 2026-10-30: 82 px at 1280, 1024, 800 and 390 px width → `--kiosk-audio-bar-height: 41px`; after the change every link tile measures 41 px.** (The tile's max width went from 180 to 220 px so "Bewegungsmelder" still fits on one line beside the icon.) Then make the tile half as high (icon inline, `renderTitle: false`) and define `--kiosk-audio-bar-height` as half the measured value in `src/styles`. Verify: measured new tile height is half the old one (±2 px).
- [x] 4.2 Add the `page.kiosk.audio.*` strings (de-AT and en-US): nothing playing, audio unavailable, main group, in group / out of group, pinned, queue, queue empty, playlists, radio, no stations, command failed, close, and the tooltips for every bar button. Verify: both files parse and have the same keys.
- [x] 4.3 Create `src/components/audio/KioskAudioBar.vue`: target resolution and persistence (D5), colours (D6), controls in spec order, position ticker and held slider/volume values (D7), commands with snackbar on failure (D8), disabled "audio unavailable" look, narrow-width layout (no ±10 s / previous, ellipsis title, dot-only selector below 600 px). Uses `audioState.acquire()`/`release()`. Verify: lint clean; behaviour covered in 5.2.
- [x] 4.4 Create `AudioTargetDialog.vue` (main group first, rooms with colour, selectable only when solo + available, per-room volume on release, group toggle, pinned toggle disabled, unavailable rooms dimmed). Verify in 5.2.
- [x] 4.5 Create `AudioQueueDialog.vue` (queue with current entry highlighted and cover thumbnails, tap → `queue/play`; playlists, tap → `playMedia` with `playlistUri`; reload when track/playlist of the target changes; empty-queue text). Verify in 5.2.
- [x] 4.6 Create `AudioRadioDialog.vue` (up to 8 station tiles in server order, tap → `playMedia` + close; empty text). Verify in 5.2.
- [x] 4.7 Mount the bar in `App.vue` as `v-footer app fixed` when `kioskMode && $route.name !== 'kioskAudio'`, and move the settings gear above it while it is shown. Verify: on the overview the last row and the gear are fully visible above the bar; on `/app/kioskaudio` there is no bar.

## 5. Verification

- [x] 5.1 Add `mocks/audio.mjs` to the browser harness (`~/.local/share/overmind-gui-verify`): an `AudioState` with a playing main group, one grouped room, one solo room, a pinned Esszimmer and an unavailable room; queue, playlists (one without `uri`) and radio answers. Stub `EventSource` via `evaluateOnNewDocument` so the suite can emit `connected` and `audio-state` events (the harness aborts real SSE). Capture POST/PUT bodies for assertions.
- [x] 5.2 Add `suites/kiosk-audio-bar.mjs` covering every scenario in `specs/kiosk-audio-bar/spec.md` and the listener scenarios of `specs/sse-transport-client/spec.md`, at 1280, 800 and 390 px widths, with screenshots of the overview, one detail page and each dialog; assert sizes/colours with computed style. Verify: `run.sh kiosk-audio-bar` passes all checks.
- [x] 5.3 Check the viewport-filling pages (`KioskCameras`, `KioskPersonen*`, `KioskLights`) for content hidden behind the bar; fix any that size to `100vh`. Verify: screenshots in the suite show nothing cut off.
- [x] 5.4 Run `npm run lint` and `npx vue-cli-service build --mode production` (node 14 via volta). Verify: both succeed.

## 6. Wrap-up

- [x] 6.1 Before committing, re-read the server change's specs for `/audio` drift since this proposal (paths, `AudioState` fields) and adjust the service. Verify: the diff against those specs is empty or explained in the commit message. **Done 2026-10-30: three gaps (no room `color`, unnamed room target-id field, unspelled enum/Track/Station fields), read tolerantly in `audioService.ts` and listed in design.md "Contract drift found during apply" - the commit message has to carry that list.**
