## 1. Service and endpoint

- [x] 1.1 Add `audioRoomLightLinked: '/audio/rooms/{roomId}/lightLinked'` to `src/store/rest.ts` next to the other `audio*` keys. Verify: lint clean.
- [x] 1.2 In `src/utils/webservices/audioService.ts` add `setRoomLightLinked(roomId, linked)` (`putToPath`, body `{linked}`), add `buttonX`/`buttonY: number | null` to `AudioRoom`, and read them in `normalizeRoom` per design D5 (`buttonX`/`buttonY`, else `button.x`/`button.y`, non-finite → `null`). Extend the header comment with the route and the guessed coordinate block. Verify: lint clean.

## 2. Floorplan overlay slot

- [x] 2.1 Add the scoped default slot `<slot :scale="scale" :loaded="loaded">` to `src/components/floorplan/Floorplan.vue` per design D1. Verify: the plugs/contacts/movement/lights pages render exactly as before (screenshots in 4.2 show no difference without audio).

## 3. UI

- [x] 3.1 Add strings (de-AT and en-US): `page.kiosk.linkLights` → "Licht & Sound" / "Lights & Sound", and under `page.kiosk.audio` the tooltips for take out of group, put back into group, pinned, light link on, light link off, speaker unavailable. Verify: both files parse and have the same keys.
- [x] 3.2 Create `src/components/audio/FloorplanAudioRooms.vue` per design D2–D4: `acquire()`/`release()`, rooms with both coordinates only, anchoring at `buttonX/Y * scale`, size `max(46 * scale, 32)`, group and light-link looks, pinned and unavailable states, per-button pending lock, `audioCommand` mixin, `pointer-events: none` wrapper. Verify: lint clean; behaviour covered in 4.2.
- [x] 3.3 Mount the overlay in `src/views/KioskLights.vue` through the Floorplan slot (`v-slot="{ scale, loaded }"`, render only when `loaded`). Verify: with the mock from 4.1 the button pairs appear on `/app/kiosklights`.

## 4. Verification

- [x] 4.1 Extend `mocks/audio.mjs` in the browser harness (`~/.local/share/overmind-gui-verify`): rooms with `buttonX/buttonY` (grouped, solo, pinned Esszimmer, unavailable), one room without coordinates, one with nested `button: {x, y}`. Add the `PUT …/lightLinked` route with body capture, and a switch to make `grouped`/`lightLinked` answer `409`/`500`.
- [x] 4.2 Add `suites/kiosk-light-and-sound.mjs` covering every scenario in `specs/kiosk-light-and-sound/spec.md` at 1280, 800 and 390 px: tile label + route (one line, computed height unchanged), button count and positions vs `coordinate * scale` (and after a resize), request bodies, pinned and unavailable taps sending nothing, double tap → one request, failure → one snackbar and unchanged look, push of a changed state moving/adding buttons, audio unavailable → no buttons and a light icon still opens its dialog. Screenshots of the plan with buttons at each width. Verify: `run.sh kiosk-light-and-sound` passes, and `run.sh kiosk-audio-bar` still passes.
- [x] 4.3 Run `npm run lint` and `npx vue-cli-service build --mode production` (node 14 via volta). Verify: both succeed.

## 5. Wrap-up

- [x] 5.1 Re-read the server change's specs (`java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/`, or `openspec/specs/` there after archive) for drift in the `rooms` shape and `lightLinked`. Record any drift in design.md and put the guessed `buttonX/buttonY` block (design D5) into the commit message. Verify: the commit message carries the block, and design.md lists any drift or states there was none.
