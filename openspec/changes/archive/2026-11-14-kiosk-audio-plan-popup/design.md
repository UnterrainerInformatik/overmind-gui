## Context

- The target popup today is `src/components/audio/AudioTargetDialog.vue`: a list with a volume
  slider (live, via `createLiveSender` plus a 3 s hold) and a group switch per room. It is
  opened from `KioskAudioBar.vue`, which also owns the selected target.
- The lights plan (`Floorplan.vue`) loads all appliances through `appliancesService.getList()`
  and builds areas from `imgMapCoords` (and `imgMapCoords1` for the second relay of a
  `RELAY_DUAL`), in full image pixels of a 1276 × 464 plan image (`$store.state.gui.floorplan`).
  The image shows UG, EG and 1st floor side by side.
- `FloorplanAudioRooms.vue` draws group and light-link buttons on that plan at `buttonX/buttonY`,
  which the server never sends.
- The server (`java-overmind-server`) keeps each room's lights as `LightRef(applianceId, channel)`
  entries, a channel being the 0-based relay index; groups are not expanded. `AudioState` rooms
  carry `muted`, `lightLinked`, `grouped`, `pinned`, `volume`, `available`, no lights.
- Target device: kiosk tablets with about 1020 × 590 usable px; 15 rooms in the final setup,
  the smallest the WC on the EG.

## Goals / Non-Goals

**Goals:**
- Everything in the popup is readable at 1020 × 590 without scrolling.
- Room geometry needs no maintenance beyond the lights' existing plan areas.
- The GUI works against today's server and lights up the new parts as the server delivers them.

**Non-Goals:**
- Editing which lights belong to a room (stays in the `audiorooms` CRUD).
- Switching lights from the popup.
- Multiple groups: there is one main group, every other room is solo.
- Any change to the bar itself beyond what opens on the target selector.

## Decisions

### D1 Server contract (guessed, built by `java-overmind-server` change `audio-desired-state-and-manual-mute`)

```
AudioState.rooms[] += {
  manualMuted: boolean,                 // set by hand; the lights never touch it
  lightMuted:  boolean,                 // set by the light link only
  lights: [{ applianceId: number, channel: number | null }]   // as configured, groups not expanded
}
muted (unchanged) = manualMuted || lightMuted

PUT /audio/rooms/{roomId}/manualMuted  {muted: boolean}  -> 204, 404 unknown room, 409 speaker unavailable
```

Read tolerantly in `audioService.normalizeRoom`: `lights` may also come as `lightApplianceIds`,
either an array or the CRUD's JSON text, with entries `12`, `"12"` or `"12:1"`. When neither
`manualMuted` nor `lightMuted` is present, `manualMuted = muted` and `lightMuted = false` (spec:
older server draws as manual). `buttonX/buttonY` and the nested `button` are no longer read.
New REST key `audioRoomManualMuted` in `src/store/rest.ts`.

*Alternative:* the server sends ready-made polygons per room. Rejected: the plan geometry lives
in the appliances, which the GUI already reads; the server would only copy it.

### D2 Draw the plan as SVG over the plan image, not through `Floorplan.vue`

A new `AudioPlanMap.vue` renders the plan image and one `<svg>` on top with
`viewBox="0 0 1276 464"`, so all coordinates stay in image pixels and the browser does the
scaling. Each room is a `<g>` of `<polygon>`s. Hatching is two SVG `<pattern>`s (`╱` and `╲`,
6 screen px apart, a dark line with a light edge so it reads on the pale main-group colour as
well as on saturated room colours); a muted room gets one or both as extra fills. The volume
fill is a `<rect>` from the bottom of the room's bounding box up to the level, clipped by a
`<clipPath>` of the room's polygons, in a lighter tint of the fill colour.

*Why not `Floorplan.vue`:* it subscribes to SSE per appliance, draws icons and dialogs, and its
areas are click targets for lights. The popup needs geometry only. *Why not canvas:* SVG gives
hit testing per room, patterns, CSS transitions and Vue reactivity for free.

### D3 Room geometry from the appliance list

When the popup opens it loads `appliancesService.getList()` once (kept in module memory for the
page session, refreshed in the background on each open). For each room light entry:
- whole appliance -> `imgMapCoords` and, when present, `imgMapCoords1`;
- channel 0 -> `imgMapCoords`, channel 1 -> `imgMapCoords1`, other channels -> nothing;
- a group (`GROUP_PARALLEL` / `GROUP_SERIAL`) with its own coords -> those; without -> the
  same rules for each id in `config.applianceIds`, found in the same list.

A polygon claimed by two rooms belongs to the first room in state order. Rooms with no polygon
become chips (D8).

### D4 Hit testing and small rooms

Taps go to the room `<g>` through pointer events on its polygons. For a room whose screen bounding
box is under 44 × 44 px, an invisible circle of radius 22 screen px at the centroid of its
largest polygon is drawn **below** all room polygons, so other rooms stay on top and win where
they overlap.

### D5 Tools and gestures

State `tool` in the popup: `overview | mute | group | light | volume`, reset to `overview` on
open. One pointer handler on the room dispatches by tool. A press becomes a drag only after 6 px
of movement; below that it is a tap. Only the Volume tool uses drags (pointer capture, level =
start − Δy / 2, clamped). Per room and tool there is one in-flight flag; commands go through the
existing `audioCommand` mixin for the single error message. Overview tap emits the room's stream
key to the strip, which scrolls the card into view and pulses it for 1.5 s.

### D6 Volume: one live sender per control, hold logic moved, not copied

The live sender plus 3 s hold of the old dialog moves into a small helper
(`src/utils/heldLevel.js`, or a mixin) used by the map's room drags and the stream cards'
sliders, keyed by `room:<id>` / `target:<targetId>`. The bar keeps its own implementation for
now; unifying it is not part of this change.

### D7 Components

- `AudioPlanDialog.vue` - the full-screen `v-dialog` (`fullscreen`, `persistent`, close button,
  back action), tool bar, holds `tool` and wires state in; replaces `AudioTargetDialog.vue`,
  which is deleted. Same props/events toward `KioskAudioBar.vue` (`value`, `state`,
  `selectedKey`, `select`).
- `AudioPlanMap.vue` - D2-D5.
- `AudioStreamCard.vue` - one stream: colour band, cover, title, transport, volume slider,
  narrow form for a solo target that has nothing to play.

`persistent` is required: a fullscreen dialog has no overlay and would close on a tap on the
error snackbar.

### D8 Layout at 1020 × 590

```
tool bar     48 px   [Overview][Mute][Group][Light][Volume] ............ [x]
plan        371 px   1020 × 371 (1276 × 464 scaled by 0.8), chips overlay bottom right
stream strip 171 px  cards 280 px (narrow 140 px), horizontal scroll inside the strip
```

The plan's height is `width × 464 / 1276`; the strip takes the rest, minimum 150 px, below
which the dialog body scrolls vertically (phone). Chips for rooms without area sit in a column at
the plan's bottom-right corner, over empty plan space, 36 px high.

### D9 Visual marks per tool

- Overview: fill colour, room name where it fits (estimated text width ≤ bounding box width),
  hatching, a small bulb on linked rooms.
- Mute: hatching at full strength, other marks dimmed.
- Group: fill colour only plus a pin on the pinned room; grouped rooms get a thin outline in
  the main group's colour so the group reads as one.
- Light: linked rooms get a 3 px amber outline and a bulb at the centroid, unlinked ones are
  dimmed.
- Volume: fill level and number at the centroid; while dragging, a 48 px bubble beside the finger.

## Risks / Trade-offs

- [The plan area of one light is shared by two rooms] -> first room wins (D3); visible and
  easy to fix in the room's light list.
- [Hatching unreadable on some room colour] -> two-tone lines (D2); checked in the browser
  harness against every palette colour and the main group colour.
- [Tool modes are new to household users] -> active tool strongly marked, the plan visibly
  changes per tool, the popup always opens on Overview.
- [Server not deployed yet] -> D1 fallbacks: all rooms as chips, mute shown as manual, manual
  mute request answered 404 shows the usual error.
- [Appliance list is large] -> loaded once per session, refreshed in the background; the
  popup draws the chips first if the list is not there yet.

## Migration Plan

GUI and server deploy independently. Rollback is a revert of the GUI commit; the old list popup
works against the new server too, since all new fields are additive. The server's
`audio-desired-state-and-manual-mute` change replaces the rule "No automatic regrouping" and
"Turning the link off leaves mute as it is", which changes behaviour the old popup also sees.
