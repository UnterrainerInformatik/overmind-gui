## Why

The kiosk volume sliders send the new level only when the finger is lifted, so while dragging
nothing changes audibly and finding the right loudness takes several drag-release-listen rounds
(requested 2026-11-11). Both sliders - the volume control in the audio bar and every room's
slider in the target popup - should change the volume while they are being dragged.

## What Changes

- While a volume slider is dragged, the GUI sends the level under the finger to the server
  continuously, throttled to at most one request every ~200 ms and never more than one request
  in flight per slider; the level reached when the finger stops is always sent last.
- Releasing the slider still sends the released level (unless it was already the last level
  sent), so the final volume is exactly where the slider was let go.
- The number shown next to a slider follows the finger while dragging (the room sliders in the
  popup currently update it only on release).
- After release, a slider keeps showing the released level until the state reports that level
  (or the existing ~3 s hold expires). Echoes of the intermediate levels sent during the drag
  no longer make the slider jump back.
- A failed intermediate request shows no message; only a failure of the final level puts the
  usual error message on screen.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-bar`: gains a requirement "Live volume while dragging" that covers the bar's
  volume control and the room sliders in the target popup. The existing "Bar controls" and
  "Target selector …" requirements stay valid as written (they say what the sliders set, not
  when), so they are not modified.

## Impact

- `src/components/audio/KioskAudioBar.vue` - volume slider handlers and hold logic.
- `src/components/audio/AudioTargetDialog.vue` - room volume sliders get drag handling and the
  same live sending and hold logic.
- Probably a small shared helper (e.g. in `src/utils/`) for the throttled live sender, used by
  both components.
- Server: no API change; `PUT /audio/targets/{id}/volume` and `PUT /audio/rooms/{id}/volume`
  are called more often (≤ ~5/s per slider while dragging).
- The progress (seek) slider is not affected and still seeks on release.
