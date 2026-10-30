## Why

With a speaker in several rooms, the two things people change per room are not playback but
membership: "take this room out of the music" and "let the music follow the light here". Both
belong to a room, so they belong on the floor plan next to the room's lights, not in the
bar's target popup. The server (`java-overmind-server` → `audio-music-assistant-bridge`) owns
the rooms, the group toggle and the light link, so the GUI only has to show and switch them.

This is change B of three (A bar → **B map integration** → C playlist editor).

## What Changes

- The overview tile **"Licht" becomes "Licht & Sound"** (de-AT; en-US "Lights & Sound"),
  same route `/app/kiosklights`.
- On the lights floor plan, **every audio room that has button coordinates gets two buttons**
  at that position:
  - **group toggle**: in the main group ↔ out of it (solo). The pinned room (Esszimmer) shows
    a pinned look and is not tappable.
  - **light link** ("Licht verknüpft"): on/off. When it is on, the server mutes and unmutes
    the speaker from the room's lights. The GUI only flips the flag.
- Rooms, their state and the **button coordinates come from the server's `AudioState`**
  (`rooms[].buttonX/buttonY`, in floor-plan image pixels like the existing area icons).
  Nothing about rooms is hard-coded in the view. A room without coordinates is not drawn.
- Buttons reflect the pushed `audio-state`. They do not update optimistically. A failed
  command shows the bar's snackbar, and the button stays as the server reports it.
- While audio is unavailable (backend not deployed, MA down) the map shows no audio buttons
  and the lights work exactly as today. An unavailable room's buttons are dimmed and disabled.
- `audioService` gains `setRoomLightLinked`. `Floorplan` gains an overlay slot so a page can
  place its own elements in floor-plan coordinates.

## Capabilities

### New Capabilities
- `kiosk-light-and-sound`: the renamed overview tile, the per-room group and light-link
  buttons on the lights floor plan, their placement from server coordinates, pinned and
  unavailable looks, and their behaviour when audio is unavailable.

### Modified Capabilities
<!-- none: the bar's target popup keeps its own group toggle unchanged; the Floorplan slot is
     an implementation detail with no behaviour change for existing pages -->

## Impact

- **New code**: `src/components/audio/FloorplanAudioRooms.vue` (the button overlay).
- **Changed code**: `src/views/KioskLights.vue` (mounts the overlay),
  `src/components/floorplan/Floorplan.vue` (overlay slot with the current scale),
  `src/utils/webservices/audioService.ts` (`setRoomLightLinked`, `buttonX/buttonY`),
  `src/store/rest.ts` (`audioRoomLightLinked`), de-AT/en-US strings.
- **Backend dependency**: `PUT /audio/rooms/{roomId}/lightLinked` exists in the server specs.
  **The button coordinates do not**: the server's `audioRoom` table and `AudioState` room
  need `buttonX`/`buttonY` (nullable integers). This change guesses that shape and records it
  in design.md so the server can add it. Until then no room is drawn.
- **No change** to the bar, its target popup, or `KioskAudio.vue`.
