## 1. Plumbing

- [x] 1.1 Create `src/utils/audioShuffle.ts` (observable `{ on }` from `localStorage['kioskAudioShuffle']`, `setShuffle(on)`, storage errors swallowed) (design D2). Verify: lint clean.
- [x] 1.2 Move the target storage and resolution out of `KioskAudioBar.vue` into `src/utils/audioTarget.ts` (`readStoredTarget`, `writeStoredTarget`, `resolveTarget(state, selection, mainGroupName)`) and use it from the bar (design D3). Verify: lint clean; the bar's behaviour is unchanged (4.3).
- [x] 1.3 Give `audioService.playMedia` an optional `shuffle` that is sent only when given (`{uri, shuffle}`); document the field and the `audio-playlist-changed` event in the service's header comment as backend contract per design D1. Verify: lint clean; radio play still sends `{uri}` only.
- [x] 1.4 Create `src/utils/dragAutoScroll.ts` with `createAutoScroller(scrollEl)` (`start`, `stop`, pointer tracking, rAF loop, quadratic curve, dt cap 0.2 s, fractional carry, synthetic move event after a scrolled frame) with the backup's constants (design D6). Verify: lint clean.

## 2. Strings

- [x] 2.1 Add to `page.kiosk.audio.editor.*` (de-AT and en-US): play, shuffle on, shuffle off, play failed, playlist removed elsewhere; and `page.kiosk.audioPlaylists` for the audio page button. Verify: both files parse and have the same keys.

## 3. Components

- [x] 3.1 `AudioPlaylistTracks.vue`: action bar between header and scroll area (play, shuffle toggle, rename, delete, narrow "add tracks"; read-only shows play and shuffle only), remove the bottom add block, move rename/delete out of the header (design D4); emit `play`, `drag-start`, `drag-end`. Verify in 4.2.
- [x] 3.2 `AudioPlaylistTracks.vue`: draggable options `scroll: false`, `forceFallback: true`, `fallbackOnBody: true`, `fallbackTolerance: 3`, a `fallbackClass`; start/stop the auto-scroller on draggable `start`/`end` (design D6). Verify in 4.2.
- [x] 3.3 `AudioPlaylistEditor.vue`: optional `target` prop; without it acquire the audio store while open and resolve the stored target (design D3); `play` via the `audioCommand` mixin with the shared shuffle choice, disabled without target. Verify in 4.2.
- [x] 3.4 `AudioPlaylistEditor.vue`: live updates — `audio-playlist-changed` and `connected` listeners while open, pending flags, `flushPending` after `runEdit` and drag end, 300 ms trailing debounce, 404 path when the open playlist vanished (design D5). Verify in 4.2.
- [x] 3.5 `AudioQueueDialog.vue`: shuffle toggle in the playlist section bound to the shared choice; `playPlaylist` sends `shuffle`; pass `target` to the editor. Verify in 4.2.
- [x] 3.6 `KioskAudio.vue`: "Playlists" button in the top bar next to the back panel, editor mounted lazily with `v-model`, no `target` prop, iframe untouched (design D7). Verify in 4.2.

## 4. Verification

- [x] 4.1 Set up a headless Puppeteer harness (claude-in-chrome if connected) against `npm run serve` with all `/audio/*` routes and the SSE stream mocked by request interception — never the live backend: stateful playlists (editable and read-only, one with 300 tracks), audio state with main group and a solo room, captured request bodies, and a way to push `audio-playlist-changed` and a reconnect.
- [x] 4.2 Check every scenario in this change's three delta specs at 390, 800 and 1280 px, with screenshots (action bar wide and narrow, read-only, queue popup with shuffle, audio page button). Drag with touch and mouse; auto-scroll: slow near the zone border, end of 300 tracks in under ten seconds, stop at once when leaving the zone, drop target follows the scroll, distance per second equal with rAF throttled to 60 and 120 Hz. Measure action bar buttons ≥ 44 px.
- [x] 4.3 Re-check the bar's target scenarios (remembered room, fallback to main group, storage blocked) after 1.2.
- [x] 4.4 Run `npm run lint` and `npm run build` (node 14 via volta). Verify: no errors; the editor stays in its own chunk.

## 5. Wrap-up

- [x] 5.1 Write the backend brief (design D1: `playMedia` `shuffle`, SSE `audio-playlist-changed`) as a short note for the user to start the matching change in `java-overmind-server`. Verify: the note names routes, payloads and MA commands.
