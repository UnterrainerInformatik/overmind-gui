## Context

- `KioskLights.vue` is a thin page around `Floorplan` (`applianceTypeFilter: ['LIGHT']`).
  `Floorplan` draws everything absolutely inside a `position: relative` div, in image pixels
  times a computed `scale` (`imgWidth / fullImgWidth`), which changes on resize. It has no slot,
  so a page cannot add its own positioned elements today.
- Change A (`kiosk-audio-bar`, archived 2026-10-30) left the pieces B builds on:
  `src/utils/audioState.ts` (`acquire()`/`release()`, reactive `audioStore.state` and
  `available`), `audioService` with a tolerant `normalizeRoom`, `setRoomGrouped`, and the
  `audioCommand` mixin (one snackbar on failure). It also left the group toggle in
  `AudioTargetDialog`, which stays as it is.
- The contract is the server change's specs,
  `java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/`.
  `PUT /audio/rooms/{roomId}/grouped` and `PUT /audio/rooms/{roomId}/lightLinked` are both
  specified there. Button coordinates and the m:n room ↔ appliance model from the GUI's backlog
  note are **not**: the server room has a single `maPlayerId` and `lightApplianceIds`, and no
  position (see D5).

## Goals / Non-Goals

**Goals:**
- The overlay reuses `audioState` (no second listener or poll) and the bar's error handling.
- `Floorplan` stays unaware of audio. It only learns to host a page's overlay.

**Non-Goals:**
- Volume, playback or mute controls on the map. Volume lives in the bar's target popup, and
  mute belongs to the light link.
- Showing the muted state or what a solo room plays.
- Editing rooms or button positions from the GUI. Positions are server data, filled in by hand.
- Any audio buttons on other floor-plan pages (plugs, contacts, movement).

## Decisions

### D1 — `Floorplan` gets a scoped default slot

Inside the `position: relative` div, after the icons and before the `<img>`, `Floorplan`
renders `<slot :scale="scale" :loaded="loaded"></slot>`. A slot keeps the overlay's elements in
the plan's own coordinate box and z-order, and `scale` is passed instead of being recomputed.
The overlay only renders when `loaded` is true, as the plan's own icons do.

Alternative: a sibling overlay in `KioskLights` that measures the plan image. Rejected: it
duplicates the scale logic and drifts on resize.

### D2 — One overlay component, `src/components/audio/FloorplanAudioRooms.vue`

Props: `scale`. It calls `acquire()` on create and `release()` on destroy, and reads
`audioStore`. It draws one pair per room where `buttonX != null && buttonY != null`. Nothing is
drawn while `audioStore.state` is null, so "audio unavailable" draws nothing too. Each pair is
an absolutely positioned flex row anchored with its top-left corner at
`(buttonX * scale, buttonY * scale)`, the same anchoring the plan's light icons use
(`iconPos`). Button size follows the plan's avatars, `46 * scale` px, with a 32 px floor so the
buttons stay tappable on a narrow plan.

Alternative: put the rooms into `Floorplan`'s `additionalAreas`. Rejected: areas are bound to
appliances and their dialogs, while these buttons have their own state source and actions.

### D3 — Looks

- **Group button**: when in the group, a `speaker_group` icon on `MAIN_GROUP_COLOR`. When solo,
  a `speaker` icon on the room's `color`, the same colour the bar uses for that room, so a solo
  room looks the same in both places. When pinned, `speaker_group` with a small `push_pin`
  badge and `cursor: default`.
- **Light-link button**: when linked, `link` on a lit amber background (the plan's light-on
  family). When unlinked, `link_off` on `grey darken-3`.
- **Unavailable room**: both buttons at 40 % opacity and disabled.
- **In flight**: the tapped button shows a small `v-progress-circular` over its icon and is
  disabled.
- Each button has a tooltip/title with the room name and its action (`page.kiosk.audio.*`).
  The room name itself is not drawn on the plan, where it would compete with the light icons.

### D4 — Actions

`setGrouped(room)` sends `!room.grouped` with `audioService.setRoomGrouped`.
`setLightLinked(room)` sends `!room.lightLinked` with the new
`audioService.setRoomLightLinked(roomId, linked)` (`PUT audioRoomLightLinked {linked}`). Both run
through `runAudioCommand`. A per-room, per-button `pending` map blocks a second tap until the
request answers. The visible state always comes from `audioStore`, never from the tap.

### D5 — Guessed contract for button coordinates (server has to add it)

The server's `audioRoom` table / `AudioState` room carries no position. The GUI assumes:

```
AudioState.rooms[] += {
  buttonX: number | null,   // floor-plan image pixels, same system as the GUI's iconPos
  buttonY: number | null
}
audioRoom += buttonX INT NULL, buttonY INT NULL   // editable through the audiorooms CRUD
```

`normalizeRoom` reads `buttonX`/`buttonY`. As cheap tolerance it also reads a nested
`button: {x, y}`. Anything that is not a finite number becomes `null`. The doc comment at the top
of `audioService.ts` and the commit message carry this block for the server side.

The backlog also notes that rooms will be m:n with appliances and that speakers will be Sendspin
dummy appliances. That changes how the server builds a room, not what the GUI reads. The GUI
only ever sees the room (`id`, flags, `color`, `buttonX/Y`), so nothing here depends on it.

### D6 — Tile label

`page.kiosk.linkLights` becomes "Licht & Sound" / "Lights & Sound". The route and the
component name stay. The halved link tile from change A was widened to 220 px. Whether the
longer text still fits on one line is checked in the browser suite (task 4.2). If it does not,
the tile's max width grows rather than the text wrapping.

### Drift check against the server specs (task 5.1, 2026-10-30)

Re-read `java-overmind-server/openspec/changes/audio-music-assistant-bridge/` (still an open
change there).
- `PUT /audio/rooms/{roomId}/lightLinked` `{linked: bool}` → `204`, unknown room `404`: matches
  `setRoomLightLinked`. `grouped` answers `409` for an offline speaker and for un-grouping the
  pinned room; the overlay never sends either, and a `409` from a race shows the snackbar.
- The `AudioState` room fields (id, name, MA player id, available, grouped, pinned,
  light-linked, muted, volume, playback while solo): no drift.
- **Drift:** the room table is `audioRoom` (camelCase, server design D6), not `audio_room`. D5
  above and the `audioService.ts` comment now say `audioRoom`.
- **Drift:** the table's pin column is `pinnedToMainGroup` while the spec lists `pinned` in
  the state. `normalizeRoom` now reads `pinned`, else `pinnedToMainGroup`.
- Still missing on the server, as expected: `buttonX`/`buttonY` (D5) and `color`.

## Risks / Trade-offs

- [The server does not deliver `buttonX/buttonY` yet] → No room is drawn, and the page behaves
  exactly like today. The suite's mock supplies the fields, so the overlay is verified anyway.
- [Buttons may cover light icons or click areas] → The positions are data and get fixed by
  editing the room. The overlay's wrapper is `pointer-events: none` with `auto` only on the
  buttons, so the gaps between buttons never swallow a map click.
- [Two places toggle the group: map and bar popup] → Both read and write the same server state,
  so they cannot disagree for longer than one push.

## Migration Plan

Pure frontend, normal GUI pipeline. Rollback = revert the commit. Rooms appear on the map once
the server sends coordinates. No data migration.
