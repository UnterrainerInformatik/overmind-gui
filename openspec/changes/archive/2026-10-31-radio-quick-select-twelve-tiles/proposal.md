## Why

The server now answers up to 12 stations on `GET /audio/radio` (overmind-server commit
`93ebafe8`, `AudioLibrary.RADIO_STATIONS = 12`: the first 12 entries of the Music Assistant
playlist `Radio`, in MA's order). The kiosk radio popup still cuts the list at 8, so four
configured stations can never be picked from the kiosk.

## What Changes

- The radio quick select popup shows up to 12 stations instead of 8, still in server order.
- The client-side cap in `audioService.getRadio` moves from 8 to 12 (the client keeps a cap of
  its own so an older or misconfigured server cannot flood the popup).
- The tile grid is checked so that twelve stations fit on the kiosk display without scrolling
  (3 rows of 4 in the 640 px dialog). On the `xsOnly` fullscreen variant the minimum tile width
  shrinks so three columns fit instead of two.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-bar`: the "Radio quick select popup" requirement raises the station limit from
  8 to 12 and gains a scenario for the cap and one for the kiosk layout (twelve tiles without
  scrolling).

## Impact

- `src/utils/webservices/audioService.ts`: `getRadio` slice 8 → 12.
- `src/components/audio/AudioRadioDialog.vue`: doc comment, grid sizing for `xsOnly`.
- `openspec/specs/kiosk-audio-bar/spec.md`: updated requirement (via the delta spec).
- Verification harness (`~/.local/share/overmind-gui-verify`): the radio mock grows to 13
  stations and the suite checks for 12 tiles and no scrolling at kiosk size.
- No API change; the server already sends up to 12 stations.
