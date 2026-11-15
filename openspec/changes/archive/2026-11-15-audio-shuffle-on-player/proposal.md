## Why

The "Zufällig: aus/an" button on the playlist page and in the queue popup's playlist column looks
like a property of the playlist, but shuffle is a setting of the player's queue. Today the button
is only a device-local preference (`utils/audioShuffle.ts`, `localStorage`) that is sent along
when a playlist is started. It does not show the player's real shuffle mode (`playback.shuffle`
is already in the audio state), so it can say "aus" while the player shuffles (set by another
device, the MA UI or an earlier start), and tapping it changes nothing until the next playlist
start.

## What Changes

- New shuffle toggle **per target**: it shows the selected target's `playback.shuffle` and
  switches the player's shuffle mode **at once**, also for the queue that is playing, through a
  new server route `PUT /audio/targets/{targetId}/shuffle {enabled}`.
- The toggle is placed on the **player bar** (next to "next track", from 600 px width up) and in
  the **queue column of the queue popup** (on every width, so phones reach it via the title).
- The queue popup reloads its queue when the target's shuffle mode changes, because MA reorders
  the upcoming entries.
- **BREAKING (behaviour)**: the shuffle toggle is removed from the open playlist's action bar and
  from the playlist column of the queue popup. Starting a playlist (`playMedia`) no longer sends
  `shuffle`; the player's current mode applies. The device preference `audioShuffle`
  (`localStorage` key `kioskAudioShuffle`) is dropped.
- Server work (java-overmind-server): the `shuffle` route, built on the existing
  `MaApi.shuffle` (`player_queues/shuffle`). Contract written down here and in the service
  header; the server session builds it.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `kiosk-audio-bar`: "Bar controls" gains the shuffle toggle; "Usable on tablet, mobile and PC
  widths" omits it below 600 px; "Queue and playlist popup" moves the toggle from the playlist
  section to the queue, binds it to the target and reloads the queue on a shuffle change, and
  playlist starts no longer send `shuffle`; "Queue popup layout" no longer names the toggle in
  the playlist head.
- `kiosk-playlist-editor`: "Actions above the track list" drops the shuffle toggle (a read-only
  playlist then has no actions, so its action bar is not shown); "Play the open playlist with optional
  shuffle" is renamed to "Play the open playlist from a track", sends no `shuffle` and loses the
  device-local choice.

## Impact

- Code: `src/components/audio/KioskAudioBar.vue`, `AudioQueueDialog.vue`,
  `AudioPlaylistTracks.vue`, `AudioPlaylistEditor.vue`, `src/utils/webservices/audioService.ts`
  (new `setShuffle`, `playMedia` without `shuffle`, contract header), `src/store/rest.ts` (route
  `audioTargetShuffle`), locales (`shuffleOn`/`shuffleOff` move out of the editor namespace);
  `src/utils/audioShuffle.ts` is deleted.
- API: new `PUT /audio/targets/{targetId}/shuffle` on java-overmind-server. Until it is built the
  toggle shows the state correctly but switching answers 404 (snackbar).
- Other devices and the MA UI see the change immediately, since it is the player's state.
