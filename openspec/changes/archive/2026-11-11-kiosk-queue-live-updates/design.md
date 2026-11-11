## Context

`AudioQueueDialog.vue` loads the queue on open and when `queueSignature` (target id, playlist id,
queue index, track) changes, and the playlist list on open and when the editor closes. It has no
SSE listeners. `AudioPlaylistEditor.vue` already listens to `audio-playlist-changed` and
`connected` through `SseClient.getInstance().addEventListener` and debounces reloads (300 ms);
this change follows the same pattern. Server side: `audio-queue-follows-playlist-edits` updates
MA's queue and sends `audio-queue-changed {targetId}`; `audio-playlist-changed` is sent only after
the queue update (its design D3).

## Goals / Non-Goals

**Goals:**
- The popup shows the queue MA holds without the user reopening it.

**Non-Goals:**
- Changing the editor; its track list already updates (verified 2026-11-04 with headless Chrome
  against the live system, wide layout, via the tile and via the popup).
- Showing which playlist is playing (`playback.playlistId` is still not filled by the server).

## Decisions

### D1: Listen while the popup is open, also behind the editor
Listeners are added when `value` turns true and removed when it turns false and in
`beforeDestroy`, like the editor's `startLive` / `stopLive`. They stay active while the editor is
open, so the queue is current the moment the editor closes. The popup is not a reactive SSE
subscription; named events via `addEventListener` are the established way (`audio-state`,
`audio-playlist-changed`).

### D2: One debounced flush with flags
Events set `pending.queue` / `pending.playlists` and (re)start a 300 ms timer; the flush runs the
flagged loads. `audio-queue-changed` for another target sets nothing. This merges the two events a
single edit produces (`audio-queue-changed` and `audio-playlist-changed`) into one queue reload.
Reloading the queue on every `audio-playlist-changed`, not only for the playing playlist, is
deliberate: the GUI cannot tell which playlist plays (`playlistId` is null), and one queue read is
cheap.

### D3: Quiet reloads
`loadQueue(quiet)` / `loadPlaylists(quiet)`: a background reload neither clears the shown data
nor sets the failed flag on error, and it does not show the initial loading placeholder (the
popup only shows it while the queue is empty). A late answer for a target that changed meanwhile
is dropped, as today.

### D4: Bigger volume slider by CSS only
Measured before the change on all widths: the vertical slider is 150 px long (Vuetify's
`min-height`; the old `height: 160px` sat on the outer `.v-input` and had no effect), 24 px wide,
track 2 px, thumb 12 px, menu card 40 × 196 px. The slider (`.v-slider--vertical`) gets
`height: min(300px, 100vh - 110px)`, width 36 px, track 3 px, thumb 18 px with its focus ring
scaled alike (54 px). The cap keeps the menu above the bar in phone landscape (390 px high:
280 px). No change to the slider's behaviour (live volume, change `kiosk-live-volume`).

## Risks / Trade-offs

- [Reload storm while the user edits quickly] → debounce plus the server's own 500 ms coalescing;
  at most a few queue reads per second.
- [Server change not deployed yet] → the popup still reloads on `audio-playlist-changed` and on
  editor close, it just sees MA's unchanged queue; no error.
