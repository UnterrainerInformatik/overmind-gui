## Why

In the kiosk playlist editor, a playlist can only be played as a whole from track 1, the editor
does not show which song is playing, and an album in the search can only be added as a whole.
Users want to start a playlist at a particular song, see and control the song that is playing,
and pick single tracks from an album. The server change `audio-playlist-start-at-track` is now
live and provides what is needed (`playMedia` with `startIndex`, `playback.sourceUri` and
`playback.shuffle`, `GET /audio/albums/{id}/tracks`). It also removed `playback.playlistId`,
which the queue popup still reads to mark the current playlist.

## What Changes

- **BREAKING (GUI only):** The "Abspielen" button in the open playlist's action bar is removed.
  The shuffle toggle stays.
- Every track of an open playlist, read-only ones included, gets its own play/stop button. Play
  starts the whole playlist at that track on the device's audio target:
  `playMedia {uri: <playlist uri>, startIndex: <row>, shuffle: <toggle>}`. MA's queue then plays
  on by itself. Stop pauses the target, and play on the marked, paused track resumes it.
- The track the target is playing from the open playlist is marked. A row counts as that track
  when `playback.sourceUri` equals the playlist's URI and the row is the playing track, found by
  `queueIndex` when the URIs agree, otherwise by `track.uri`. While the target reports a
  duration, the marked row shows a position slider (seek).
- Albums in the library search get an "open album" button. It lists the album's tracks
  (`GET /audio/albums/{id}/tracks`) in the search, where each track can be previewed and added
  like any track result. Tapping the album row still adds the whole album.
- The search keeps the album's `id` from the server's answer.
- `playback.playlistId` is dropped from the GUI's audio state. `playback.sourceUri` and
  `playback.shuffle` are read instead. The queue popup marks the playlist whose URI equals the
  target's `sourceUri`, and reloads its queue when `sourceUri` changes.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `kiosk-playlist-editor`:
  - Changed: the action bar has no play button.
  - Changed: playing goes through per-track play/stop buttons that start the playlist at that
    track.
  - New: the playing track is marked and gets a seek slider.
  - New: albums can be opened in the search.
- `kiosk-audio-bar`: the queue popup marks the target's current playlist by `sourceUri` and
  reloads its queue when `sourceUri` changes.

## Impact

- Code: `src/utils/webservices/audioService.ts` (playback normalization, `playMedia` with
  `startIndex`, album tracks, album `id` in search items, contract comment),
  `src/store/rest.ts` (album tracks route), `AudioPlaylistTracks.vue`, `AudioPlaylistEditor.vue`,
  `AudioLibrarySearch.vue`, `AudioQueueDialog.vue`, i18n strings.
- API: uses the server change `audio-playlist-start-at-track` (live 2026-11-14). The GUI no longer
  sends the old playMedia-plus-queue/play workaround. It was never built in the GUI anyway.
- Writes during verification go to the live backend. Starting playback changes a real room's
  queue, so verification uses mocked routes or a web player target.
