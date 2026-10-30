## 1. Plumbing

- [x] 1.1 Install `vuedraggable@2.24.3` (node 14 via volta) and verify `package.json`/lockfile list it and `npm run lint` is clean.
- [x] 1.2 In `src/utils/axiosUtils.ts` add `patchToPath` next to `putToPath` and give `deleteFromPath` an optional `dataProvider` sent as the DELETE body (default `{}`), same doc-comment style (design D6). Verify: lint clean; existing `deleteFromPath` callers unchanged in the diff.
- [x] 1.3 Add `audioPlaylist`, `audioPlaylistTracks`, `audioPlaylistTracksMove`, `audioSearch` to `src/store/rest.ts` under the existing audio comment. Verify: lint clean.
- [x] 1.4 Extend `audioService.ts` with `getPlaylistTracks`, `createPlaylist`, `renamePlaylist`, `deletePlaylist`, `addPlaylistTracks`, `removePlaylistTracks`, `movePlaylistTrack`, `search` and the `AudioSearchResult` type, reading the search answer tolerantly per design D5; update the header comment with the new routes and the guessed search shape. Verify: lint clean.

## 2. Strings

- [x] 2.1 Add `page.kiosk.audio.editor.*` (de-AT and en-US): title, edit playlists, filter, show read-only, read-only mark, new playlist, name, name required, rename, delete, delete confirm (with name), cancel, no tracks, add tracks, back, search, tracks/albums/artists, already added, not added, read-only (409, with name), not found, edit failed, load failed, retry. Verify: both files parse and have the same keys.

## 3. Components

- [x] 3.1 Create `AudioNamePrompt.vue` (text field, trim, rejects empty with hint, OK/cancel). Verify in 4.2.
- [x] 3.2 Create `AudioPlaylistList.vue`: filter, read-only toggle (default off), name-sorted list via `v-virtual-scroll` at 56 px rows, lock mark, cover, track count, create button, load-failed text with retry (design D2). Verify in 4.2.
- [x] 3.3 Create `AudioPlaylistTracks.vue`: header with back/rename/delete (hidden when read-only, read-only mark instead), `vuedraggable` list with handle-only drag, remove buttons, disabled while busy, emits `move` only when `from ≠ to` (design D3). Verify in 4.2.
- [x] 3.4 Create `AudioLibrarySearch.vue`: 400 ms debounce, ≥ 2 chars, sequence number against stale answers, grouped results (max 25 each), album add by URI, artist drill-down with a chip to leave it, already-added mark from `existingUris`, disabled while busy (design D5). Verify in 4.2.
- [x] 3.5 Create `AudioPlaylistEditor.vue`: fullscreen dialog, views list/playlist/search, two columns at `mdAndUp`, `runEdit` with busy lock, reload after every edit, 409/404/other snackbars, "not added" check by track count, create opens the answer, delete confirm and return to list (design D1, D4, D7). Verify in 4.2.
- [x] 3.6 Add the edit-playlists button to the playlist section of `AudioQueueDialog.vue`, mount the editor lazily (`() => import(...)`), reload playlists when it closes. Verify: lint clean; the queue dialog's existing scenarios still pass in `run.sh kiosk-audio-bar`.

## 4. Verification

- [x] 4.1 Extend `mocks/audio.mjs` in `~/.local/share/overmind-gui-verify`: a stateful playlist store (a few editable, ~1400 read-only), tracks per playlist, create/rename/delete/add/remove/move with `204`, a configurable delay on move, `409` on read-only, `502` with a reason on a marked playlist, `/audio/search` answering `{tracks, albums, artists}`, and an add of an existing URI that changes nothing. Capture request bodies.
- [x] 4.2 Add `suites/kiosk-playlist-editor.mjs` covering every scenario in `specs/kiosk-playlist-editor/spec.md` and the two new queue-popup scenarios of `specs/kiosk-audio-bar/spec.md`, at 390, 800 and 1280 px, with screenshots of the list, an open playlist (wide and narrow), the search and the delete confirm; drag with touch events on the handle; measure touch targets with `getBoundingClientRect`. Verify: `run.sh kiosk-playlist-editor` passes all checks.
- [x] 4.3 Run `npm run lint` and `npx vue-cli-service build --mode production` (node 14 via volta). Verify: both succeed and the editor lands in its own chunk.

## 5. Wrap-up

- [x] 5.1 Re-read the server's `audio-library` spec and, if the server is built by then, its search answer and album-URI handling; adjust `audioService.ts` and record any drift in design.md. Verify: the diff against the spec is empty or explained in the commit message.
