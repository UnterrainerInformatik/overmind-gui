## Why

The queue popup, from which the playlist editor is opened, keeps showing the old songs after
the playing playlist was edited (reported 2026-11-04). It reloads its queue only when the
target's track or playlist changes, never when the queue's items change, and after the editor
closes it reloads only the playlist list. The server change `audio-queue-follows-playlist-edits`
(java-overmind-server) makes MA's queue follow the edit and adds the SSE event
`audio-queue-changed`; the popup has to pick that up. The editor's own track list was checked
the same day and does update.

## What Changes

- While the queue popup is open it reloads the selected target's queue on the SSE event
  `audio-queue-changed` for that target, on `audio-playlist-changed`, and after every SSE
  reconnect. Reloads are debounced (~300 ms) and the shown queue is kept while a reload runs
  or when it fails.
- On `audio-playlist-changed` and after reconnects it also reloads its playlist list, so the
  track counts stay current, including while the editor is open over it.
- When the editor closes, the popup reloads its queue as well as its playlist list.
- `audio-queue-changed` is documented in `audioService.ts` next to the other server events.
- Added on request (2026-11-11): the bar's volume slider (the vertical slider in the volume
  menu) becomes twice as long (150 → 300 px) and 1.5 times as wide (track, thumb and touch
  area), shortened on low screens so the menu still fits above the bar.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-bar`: the "Queue and playlist popup" requirement gains the live reloads; a new
  requirement sets the size of the bar's volume slider.

## Impact

- Code: `src/components/audio/AudioQueueDialog.vue` (SSE listeners, debounce, quiet reloads),
  doc comment in `src/utils/webservices/audioService.ts`, volume slider CSS in
  `src/components/audio/KioskAudioBar.vue`.
- No new dependencies. Works before the server change ships: `audio-playlist-changed` already
  exists, and an unknown event is simply never received.
- Depends on `audio-queue-follows-playlist-edits` for the queue to actually change in MA.
