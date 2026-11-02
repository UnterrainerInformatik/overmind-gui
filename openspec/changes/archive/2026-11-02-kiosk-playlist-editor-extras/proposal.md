## Why

Two playlist editors were built in parallel for the kiosk. The one on master (change
`2026-10-30-kiosk-playlist-editor`, full-screen `AudioPlaylistEditor` on the backend `/audio`
API) is the base. The other one was never pushed (branch `backup/kiosk-playlist-editor-2026-11-02`,
its own page `/app/kioskplaylists` talking to Music Assistant directly). It has five features
the master editor lacks and that matter on the wall tablet: actions on top, play with optional
shuffle, live updates from other devices, a calm auto-scroll while dragging, and a way into the
editor from the audio page. This change ports those features into the master editor; the
backup's own page and its direct Music Assistant client are dropped.

## What Changes

- **Actions above the track list**: the open playlist's actions (play, shuffle toggle, add
  tracks, rename, delete) sit in a bar above the tracks that stays visible while the list
  scrolls. The narrow layout's "add tracks" button moves from below the list into that bar.
- **Play with optional shuffle**: the open playlist gets a play button and a shuffle toggle (off
  by default, remembered per device). Play replaces the queue of the device's audio target with
  the playlist. The queue popup's playlist tap uses the same toggle, so both places play the
  same way.
- **Backend contract, shuffle** (`java-overmind-server`, not implemented here):
  `POST /audio/targets/{targetId}/playMedia` accepts an optional `shuffle` boolean. Until the
  server knows it, it ignores the field and plays in order.
- **Live updates**: the editor reloads the open playlist and the playlist list when the server
  reports a playlist change, also changes made in the Music Assistant UI or on another device.
  A reload that arrives during a drag or a running edit is held back until it is over.
- **Backend contract, events** (`java-overmind-server`, not implemented here): a new SSE event
  `audio-playlist-changed` `{playlistId}` on every playlist change (tracks, name, created,
  deleted), whoever made it. Without the event the editor behaves as today.
- **Controlled auto-scroll while dragging**: SortableJS's built-in auto-scroll is replaced by
  an edge-zone scroller whose speed grows with the depth into the zone, does not depend on the
  frame rate, and stops without gliding.
- **Way in from the audio page**: the kiosk audio page (`/app/kioskaudio`) gets a "Playlists"
  button in its top bar that opens the full-screen editor.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `kiosk-playlist-editor`: actions bar on top, play with shuffle, live updates from the
  server, controlled auto-scroll while dragging; the editor can also be opened from the audio
  page and closes back there; the narrow-layout requirement now places "add tracks" on top.
- `kiosk-audio-bar`: the queue popup plays a playlist with the device's shuffle choice.
- `kiosk-audio-page`: a "Playlists" button in the top bar opens the playlist editor.

## Impact

- Changed: `AudioPlaylistEditor.vue`, `AudioPlaylistTracks.vue`, `AudioQueueDialog.vue`,
  `KioskAudio.vue`, `audioService.ts` (`playMedia` with `shuffle`), `page.kiosk.audio.editor.*`
  strings (de-AT, en-US).
- New: a small helper for the shuffle choice and for resolving the device's audio target
  outside the bar (shared with `KioskAudioBar`), and the auto-scroll helper.
- Backend: two additions in `java-overmind-server` (`shuffle` on `playMedia`, SSE event
  `audio-playlist-changed`), to be done as a change there. The GUI works without them.
- No new dependency. The never-pushed `KioskPlaylists.vue` and `musicAssistant.ts` stay only in
  the backup branch.
