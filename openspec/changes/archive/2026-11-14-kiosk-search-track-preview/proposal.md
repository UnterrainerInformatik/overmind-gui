## Why

In the playlist editor's search, a track can only be added blind. People want to hear a track
before adding it. This part needs no server change, so it goes ahead of the rest of the
playlist editor wish in `ai/open-proposals.md` (play per playlist track, open albums), which
waits for the server.

## What Changes

- Every track in the library search gets a **play/stop button**. Play sends
  `playMedia {uri: <track uri>}` to the device's audio target (the same target as the editor's
  play button). This replaces that target's queue with the single track, so nothing follows
  when it ends. Stop pauses the target.
- The track the target is currently on is **marked** in the results. While it is the current
  track, its row shows a **song-position slider** that seeks the target.
- Tapping the row itself still adds the track. The buttons and the slider do not add.
- The bar's seek slider (drag, hold-after-release, interpolated position) moves into a shared
  component, used by the audio bar and the search. The bar behaves as before.
- `ai/open-proposals.md`: the search-preview part is removed from the playlist editor entry. The
  rest of the entry stays there.

## Capabilities

### New Capabilities

_none_

### Modified Capabilities

- `kiosk-playlist-editor`: adds a requirement for previewing search tracks (play/stop, marking,
  position slider).

## Impact

- `src/components/audio/AudioLibrarySearch.vue`: preview buttons, marking, slider; new prop
  for the play target.
- `src/components/audio/AudioPlaylistEditor.vue`: passes `playTarget` to the search.
- New `src/components/audio/AudioSeekSlider.vue`, extracted from
  `src/components/audio/KioskAudioBar.vue`, which then uses it.
- No new server API: uses the existing `playMedia`, `audioTargetCommand` (`pause`/`play`) and
  `audioTargetSeek`.
- Side effect, by design: previewing replaces whatever the target room was playing.
