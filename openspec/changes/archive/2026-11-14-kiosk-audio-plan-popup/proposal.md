## Why

The "Licht & Sound" tile promised sound on the lights plan, but the server never got room button
coordinates, so the plan only ever shows lights. Meanwhile the audio bar's target popup is a plain
list that cannot show at a glance which of the house's 15 speakers play together, which are
muted (and why), which follow the lights, and how loud each one is. With 15 players across three
floors that overview has to be spatial, and every change has to be one tap or one drag.

## What Changes

- The overview tile goes back to "Licht" / "Lights", and the lights plan loses its audio buttons
  (`FloorplanAudioRooms`, the `buttonX`/`buttonY` reading). **BREAKING** for the guessed
  `buttonX`/`buttonY` contract, which the server never built.
- The audio bar's target selector opens a **full-screen audio plan popup** instead of the list,
  sized for the kiosk tablets' 1020 × 590 px:
  - a tool bar: Overview, Mute, Group, Light, Volume, and close;
  - the floor plan (three floors side by side) at full width, where every audio room is the set
    of its lights' areas, filled in the colour of the stream it plays (main group colour or its
    own colour when solo);
  - the room itself is the button; the active tool decides what a tap or drag does: toggle manual
    mute, toggle group membership, toggle the light link, or drag the room's volume, shown as a
    fill level so all rooms' volumes compare at a glance;
  - mute is drawn as hatching: manual mute `╱` (bottom-left to top-right), light mute `╲`
    (top-left to bottom-right), both crossed;
  - below the plan, one card per stream (main group, then every solo room) with cover, title,
    play/pause/skip and the stream's volume; tapping a card selects it as the bar's target.
- The mute tool toggles only the manual mute. A light-muted room tapped with it becomes manually
  muted as well.
- The room volume sliders and group switches of the old list popup go away; their jobs move to
  the plan's tools.
- New guessed server contract (built in `java-overmind-server`, change
  `audio-desired-state-and-manual-mute`): `manualMuted` and `lightMuted` per room,
  `PUT /audio/rooms/{roomId}/manualMuted {muted}`, and each room's configured lights in the
  audio state.

## Capabilities

### New Capabilities
- `kiosk-audio-plan-popup`: the full-screen audio plan popup - layout, room areas from lights,
  tools, hatching, volume fill and drag, stream cards, live state, errors.

### Modified Capabilities
- `kiosk-audio-bar`: the target selector requirement now opens the plan popup instead of the
  list; the live-volume requirement covers the plan's room drag and the stream cards' sliders
  instead of the list's room sliders; the phone-width popup scenario follows the new popup.
- `kiosk-light-and-sound`: the tile is named "Licht" again and the lights plan draws no audio
  controls; all audio-room requirements are removed.

## Impact

- GUI: `src/components/audio/AudioTargetDialog.vue` replaced by a new plan popup (plus small
  child components), `KioskAudioBar.vue` wiring, `FloorplanAudioRooms.vue` deleted,
  `KioskLights.vue` slot use removed, `audioService.ts` (new fields, new route, `buttonX/Y`
  dropped), `src/store/rest.ts` (new endpoint), locales.
- Reads the light appliances' `imgMapCoords`/`imgMapCoords1` through `appliancesService` and the
  plan image from the store, like `Floorplan.vue` does.
- Server: depends on `java-overmind-server` change `audio-desired-state-and-manual-mute`; until
  it ships, rooms without light data are listed beside the plan and mute shows as manual.
