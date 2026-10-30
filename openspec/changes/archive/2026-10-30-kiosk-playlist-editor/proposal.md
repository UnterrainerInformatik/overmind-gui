## Why

The kiosk audio bar (change `kiosk-audio-bar`) can play a playlist but cannot change one. Today
every edit means opening the Music Assistant UI, which on the wall tablet is the hidden setup
route and is not touch-friendly. The backend already offers fully editable playlists that are
saved on every edit (`java-overmind-server` change `audio-music-assistant-bridge`, spec
`audio-library`). This is the last of the three planned frontend changes (A bar, B light & sound,
C playlist editor).

## What Changes

- New full-screen **playlist editor** popup, opened from the queue popup of the audio bar.
- Playlist list: filter by name, open, **create**, **rename**, **delete** (with confirm).
  Music Assistant reports about 1450 playlists on the house install, almost all read-only m3u
  files, so the list shows only editable playlists by default and can show the read-only ones
  too.
- Inside a playlist: track list, **remove** a track, **reorder** by dragging, and a **search**
  (tracks, albums, artists) to pick results and **add** them.
- **No save button**: every action is written immediately, the list is reloaded from the
  server answer, and errors are shown in a snackbar followed by a reload.
- Playlists the server reports as `editable: false` open read-only: no edit controls, but the
  tracks can be seen.
- Touch-first layout that works on tablet, mobile and PC widths.
- The queue popup gets an entry point into the editor and reloads its playlist list when the
  editor closes.
- Plumbing: playlist and search routes in `audioService`, a PATCH-by-path helper and a request
  body on DELETE-by-path in `axiosUtils`, and a new dependency `vuedraggable@2` (SortableJS)
  for touch drag.

## Capabilities

### New Capabilities
- `kiosk-playlist-editor`: the full-screen playlist editor: list, create, rename, delete,
  track removal, drag reorder, search and add, read-only playlists, immediate saving with
  error handling, and layout across widths.

### Modified Capabilities
- `kiosk-audio-bar`: the "Queue and playlist popup" requirement gains the editor entry point
  and a reload of its playlist list after the editor closes.

## Impact

- New: `src/components/audio/AudioPlaylistEditor.vue` (and small sub-components if it gets
  large), `page.kiosk.audio.editor.*` strings (de-AT, en-US).
- Changed: `AudioQueueDialog.vue`, `src/utils/webservices/audioService.ts`,
  `src/utils/axiosUtils.ts`, `src/store/rest.ts`.
- Dependency: `vuedraggable@2.24.3` (Vue 2 build, pulls in `sortablejs`).
- Backend contract: `GET/POST /audio/playlists`, `PATCH/DELETE /audio/playlists/{id}`,
  `GET/POST/DELETE /audio/playlists/{id}/tracks`, `POST /audio/playlists/{id}/tracks/move`,
  `GET /audio/search`, all as defined in the server's `audio-library` spec. No backend change
  is needed. The search answer shape and adding album/artist URIs are guessed and written down
  in design.md.
- Browser harness (`~/.local/share/overmind-gui-verify`): the audio mock grows playlist editing
  and search, plus a new suite.
