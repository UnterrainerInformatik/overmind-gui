# kiosk-audio-plan-popup Specification

## Purpose

Shows every house speaker on the floor plan in one full-screen kiosk popup, so which rooms play
together, which are muted and why, which follow the lights and how loud each is can be seen at a
glance and changed with one tap or one drag.

## Requirements

### Requirement: Full-screen popup sized for the kiosk tablets

Tapping the audio bar's target selector SHALL open the audio plan popup over the whole viewport.
From top to bottom it SHALL show a tool bar (the seven tools and a close control), the floor plan
at the full popup width, and a strip of stream cards filling the remaining height. At 1020 × 590
px all three SHALL be visible without vertical scrolling. The popup SHALL close only through its
close control or the device's back action; a tap elsewhere, including on an error message, SHALL
NOT close it. Each time the popup opens, the Overview tool SHALL be active.

#### Scenario: Kiosk tablet
- **WHEN** the popup is opened at 1020 × 590 px
- **THEN** the tool bar, the whole floor plan and the stream strip are visible without scrolling

#### Scenario: Error message does not close it
- **WHEN** an error message is shown while the popup is open and the user taps the message
- **THEN** the popup stays open

#### Scenario: Reopened on Overview
- **WHEN** the user closes the popup with the Volume tool active and opens it again
- **THEN** the Overview tool is active

### Requirement: Rooms are the areas of their lights

Each audio room SHALL be drawn on the floor plan as the areas of the lights configured for it in
the audio state: a whole appliance contributes all of its plan areas, a single channel of an
appliance contributes that channel's area, and an appliance group contributes its own area, or,
when it has none, the areas of its members. A room SHALL be tappable anywhere on its areas; a
room whose areas are smaller than 44 × 44 px on screen SHALL accept taps within 22 px of its
centre as well, as long as that does not cover another room's areas. A room without any area on
the plan SHALL be shown as a labelled chip beside the plan and SHALL behave like a room on the
plan for every tool. The room's name SHALL be shown on its area in the Overview tool where it
fits, and in a short label next to the finger while the room is pressed.

#### Scenario: Room of two lights
- **WHEN** the room "Wohn-Esszimmer-Küche" lists three light appliances that each have a plan area
- **THEN** the room is drawn as those three areas and tapping any of them acts on that room

#### Scenario: Small room
- **WHEN** the room "WC" is drawn 30 × 25 px on screen
- **THEN** a tap 18 px from its centre outside its area, but not on another room, acts on "WC"

#### Scenario: Room without area
- **WHEN** a room's configured lights have no plan area, or the server sends no lights for it
- **THEN** the room appears as a chip beside the plan and every tool works on the chip

### Requirement: Rooms are filled in the colour of their stream

Every room SHALL be filled in the colour of the stream it plays: the main group's colour while it
is grouped or pinned, its own colour while it is solo. A room whose speaker is unavailable SHALL
be drawn grey and dimmed and SHALL NOT send any request, whatever the tool. Changes in the audio
state SHALL be reflected without reopening the popup.

#### Scenario: Room leaves the group
- **WHEN** the state reports the grouped room "Bad" as solo
- **THEN** "Bad" changes from the main group's colour to its own colour while the popup is open

#### Scenario: Speaker offline
- **WHEN** the speaker of "Terrasse" is reported unavailable and the user taps it with any tool
- **THEN** "Terrasse" is grey and dimmed and no request is sent

### Requirement: Mute is drawn as hatching

In every tool, a room SHALL show its mute state as hatching over its fill: a manual mute as lines
from bottom left to top right, a mute by the lights as lines from top left to bottom right, and
both as crossed lines. A room that is not muted SHALL show no hatching. The hatching SHALL be
stronger while the Mute tool is active. When the audio state does not tell manual and light mute
apart, a muted room SHALL be drawn as manually muted.

#### Scenario: Muted by the lights
- **WHEN** a room is reported light-muted and not manually muted
- **THEN** it shows only top-left-to-bottom-right hatching

#### Scenario: Both
- **WHEN** a room is reported manually muted and light-muted
- **THEN** it shows crossed hatching

#### Scenario: Older server
- **WHEN** the state reports a room as muted without saying by whom
- **THEN** it shows bottom-left-to-top-right hatching

### Requirement: The active tool decides what a room does

The tool bar SHALL offer Overview, Group, Volume, Light, Mute, Balance and EQ, in that order,
exactly one active at a time and marked clearly. Tapping a room SHALL do what the active tool
does; switching tools SHALL send nothing. The tool bar SHALL fit without horizontal scrolling at
every popup width from 360 px up.

#### Scenario: Overview highlights the stream
- **WHEN** the Overview tool is active and the user taps the solo room "Kizi Alex"
- **THEN** no request is sent and the stream card of "Kizi Alex" is scrolled into view and highlighted

#### Scenario: Overview on a grouped room
- **WHEN** the Overview tool is active and the user taps a grouped room
- **THEN** the main group's stream card is scrolled into view and highlighted

#### Scenario: Seven tools on a phone
- **WHEN** the popup is open at 360 px width
- **THEN** all seven tools and the close control fit in the tool bar as icons without horizontal scrolling

#### Scenario: Seven tools on a tablet in portrait
- **WHEN** the popup is open at 768 px width
- **THEN** all seven tools and the close control fit in the tool bar without horizontal scrolling

### Requirement: Mute tool toggles the manual mute

With the Mute tool active, tapping a room SHALL ask the server to switch that room's manual mute:
on when it is not manually muted, off when it is. A light mute SHALL NOT be changed by the Mute
tool.

#### Scenario: Mute by hand
- **WHEN** the Mute tool is active and the user taps a room that is not muted
- **THEN** the GUI sends `PUT /audio/rooms/{roomId}/manualMuted` with `{muted: true}`

#### Scenario: Tap a light-muted room
- **WHEN** the Mute tool is active and the user taps a room that is only light-muted
- **THEN** the GUI sends `{muted: true}` for that room
- **AND** once the state reports it, the room shows crossed hatching

#### Scenario: Unmute by hand
- **WHEN** the Mute tool is active and the user taps a manually muted room
- **THEN** the GUI sends `{muted: false}` for that room

### Requirement: Group tool moves a room in or out of the main group

With the Group tool active, tapping a grouped room SHALL ask the server to set it solo, and
tapping a solo room SHALL ask to set it grouped (`PUT /audio/rooms/{roomId}/grouped`). The pinned
room SHALL carry a pin mark in this tool and SHALL send nothing when tapped.

#### Scenario: Take three rooms out
- **WHEN** the Group tool is active and the user taps "Kizi Alex", "Kizi Stefan" and "Schlafzimmer", all grouped
- **THEN** the GUI sends `{grouped: false}` for each of the three rooms

#### Scenario: Pinned room
- **WHEN** the Group tool is active and the user taps the pinned room
- **THEN** no request is sent

### Requirement: Light tool toggles the light link

With the Light tool active, linked rooms SHALL be marked as linked, and tapping a room SHALL ask
the server to flip its light link (`PUT /audio/rooms/{roomId}/lightLinked`). The GUI SHALL NOT
mute or unmute the speaker itself when the link changes.

#### Scenario: Unlink a dark room
- **WHEN** the Light tool is active and the user taps a linked, light-muted room
- **THEN** the GUI sends `{linked: false}` for it and sends no mute request

### Requirement: Volume tool shows and drags each room's volume

With the Volume tool active, every room with a known volume SHALL be filled from the bottom of its
area up to a height proportional to its volume (0 empty, 100 full) and SHALL show the number.
Pressing a room and dragging up or down SHALL change that room's volume, starting from its current
level, by one level per 2 px of finger travel, clamped to 0..100, independent of the room's size
on screen. While dragging, the level SHALL be shown large next to the finger and sent with the
live-volume rules of `kiosk-audio-bar` to `PUT /audio/rooms/{roomId}/volume`. A tap without
movement SHALL send nothing. A room whose volume is unknown SHALL show no fill and SHALL NOT drag.

#### Scenario: Compare at a glance
- **WHEN** the Volume tool is active, "Bad" reports 30 and "Schlafzimmer" 70
- **THEN** "Bad" is filled to 30 % of its height and "Schlafzimmer" to 70 %

#### Scenario: Drag up
- **WHEN** the user presses "Bad" at volume 30 and drags 40 px upwards and releases
- **THEN** the last volume request for "Bad" has `{level: 50}`

#### Scenario: Tap only
- **WHEN** the Volume tool is active and the user taps a room without moving
- **THEN** no request is sent

### Requirement: Balance tool sets the levels of a room's speakers

With the Balance tool active, every room whose state reports `balanceSupported: true` and at
least two speakers SHALL be marked with a balance icon; every other room SHALL be dimmed and a
tap on it SHALL send nothing. Tapping a marked, available room SHALL open a balance panel for it
inside the popup, without covering the tool bar or the close control. The panel SHALL show the
room's name and, for each speaker in the server's order, the speaker's name and a slider 0..100
at the level the state reports for it. Dragging a speaker's slider SHALL send that speaker's
level to `PUT /audio/rooms/{roomId}/speakers/{playerId}/volume` with the live-volume rules of
`kiosk-audio-bar` (throttling, released level last, echo handling, error message only for the
released level). A speaker reported unavailable, or with an unknown level, SHALL show a disabled
slider. The panel SHALL follow the state while it is open and SHALL close through its own close
control, when another tool is chosen, when another room is tapped (which opens that room's panel
instead), when the room no longer supports a balance, and when the popup closes. A state without
`speakers` or `balanceSupported` SHALL count as no balance support.

#### Scenario: Stereo pair marked
- **WHEN** the Balance tool is active and "Wohn-Esszimmer" reports `balanceSupported: true` with two speakers, and "Bad" reports `balanceSupported: false`
- **THEN** "Wohn-Esszimmer" shows the balance icon and "Bad" is dimmed

#### Scenario: Open the panel
- **WHEN** the Balance tool is active and the user taps "Wohn-Esszimmer" whose speakers report left 27 and right 30
- **THEN** a panel titled "Wohn-Esszimmer" shows two sliders named as the speakers, at 27 and 30, and no request is sent

#### Scenario: Turn one speaker down
- **WHEN** the user drags the left speaker's slider from 27 to 24 and releases it
- **THEN** the last request sent is `PUT /audio/rooms/{roomId}/speakers/{leftPlayerId}/volume` with `{level: 24}` and no request is sent for the right speaker

#### Scenario: Room without balance
- **WHEN** the Balance tool is active and the user taps "Bad"
- **THEN** no request is sent and no panel opens

#### Scenario: Older server
- **WHEN** the state carries no `speakers` and no `balanceSupported` for any room
- **THEN** every room is dimmed in the Balance tool and no panel can be opened

#### Scenario: Panel closes on tool switch
- **WHEN** the balance panel of "Wohn-Esszimmer" is open and the user chooses the Volume tool
- **THEN** the panel closes and nothing is sent

### Requirement: EQ tool sets a room's equaliser or crossover

With the EQ tool active, every room whose state reports `eq` as `bands` or `crossover` SHALL be
marked with an EQ icon. A room reporting `unavailable` SHALL be marked as unreachable and SHALL
still open its panel on a tap. Every other room, including a room whose state has no `eq` field
or an unknown value, SHALL be dimmed, and a tap on it SHALL send nothing. A group room SHALL be
one room with one panel.

Tapping a marked room SHALL open an EQ panel for it inside the popup, without covering the tool
bar or the close control, and SHALL outline the room. On opening, the panel SHALL read the
room's EQ once from `GET /audio/rooms/{roomId}/eq` and SHALL show a progress indicator until the
answer arrives. It SHALL NOT poll. It SHALL read again when an SSE `audio-eq-changed` event names
this room and the change did not come from this panel, after an SSE reconnect, after a `400`
answer, and on *retry*. Events for other rooms SHALL be ignored.

For a **bands** room the panel SHALL show one vertical slider per band the server sends, in the
server's order, with the band's range, step and unit, its current desired gain, and a frequency
label (for example `31.5`, `1.25k`, `16k`). The number of bands and their frequencies SHALL come
from the server. Releasing a slider SHALL send `PUT /audio/rooms/{roomId}/eq` with only the bands
that changed, as `{"bands": {"<frequency>": <gain>}}`. Moving a slider SHALL NOT send anything
before it is released. At most one write per room SHALL be in flight. Changes made meanwhile
SHALL be merged and sent together, with the latest value per band, once the running write ends.

For a **crossover** room the panel SHALL offer *Flat* and each frequency the server lists, with
the desired one selected (`crossover: null` is *Flat*). Choosing one SHALL send
`PUT /audio/rooms/{roomId}/eq` with `{"crossover": <frequency>}`, or `{"crossover": null}` for
*Flat*. The panel SHALL list the room's speakers with their role (satellite or sub) and the
presets each one reports now, and SHALL mark a speaker whose reported presets differ from the
desired crossover.

Both kinds SHALL offer a reset (*Hauskurve* for a bands room, *80 Hz* for a crossover room). The
reset SHALL ask for confirmation inside the panel, then send `POST /audio/rooms/{roomId}/eq/reset`
and, after a `204`, read the EQ again. The panel SHALL show each speaker's address as a detail
line and SHALL say that changes made in a speaker's own web UI are overwritten by the server.

Answers SHALL be handled as follows: `503` SHALL show the server's reason in the panel with
*retry* and disabled controls. `502` on a write SHALL keep the shown values and show a warning
with the reason. `400` SHALL show the reason and read again. `404` or `409` SHALL close the
panel. The panel SHALL close through its own close control, when another tool is chosen, when
another room is tapped (which opens that room's panel instead), when the room's `eq` changes to
anything other than `bands`, `crossover` or `unavailable`, and when the popup closes. When the
room's `eq` changes between `bands`, `crossover` and `unavailable`, an open panel SHALL read the
EQ again.

#### Scenario: Band rooms marked, Cast room dimmed
- **WHEN** the EQ tool is active and the state reports `eq: "bands"` for "Bad" and `eq: "none"` for "Keller/Hauptraum"
- **THEN** "Bad" carries the EQ icon and "Keller/Hauptraum" is dimmed, and tapping "Keller/Hauptraum" sends nothing

#### Scenario: Older server
- **WHEN** the EQ tool is active and the state's rooms carry no `eq` field
- **THEN** every room is dimmed and no tap opens a panel

#### Scenario: Bands built from the server
- **WHEN** the user taps "Bad" and `GET /audio/rooms/12/eq` answers with 15 bands from 20 Hz to 16 kHz, −15…+15 dB, step 1
- **THEN** a progress indicator shows until the answer arrives, then 15 vertical sliders labelled `20` … `16k` at the desired gains

#### Scenario: Only the released band is sent
- **WHEN** the user drags the 80 Hz slider from 3 to 5 and releases it
- **THEN** nothing is sent while dragging and one `PUT /audio/rooms/12/eq` with `{"bands": {"80": 5}}` is sent on release

#### Scenario: Changes during a running write are merged
- **WHEN** a write for 80 Hz is in flight and the user releases 125 Hz at 4 and then 200 Hz at 2
- **THEN** after the first write ends exactly one more `PUT` is sent with `{"bands": {"125": 4, "200": 2}}`

#### Scenario: Crossover room
- **WHEN** the user taps "Wohn-Esszimmer" and the EQ answers `capability: "crossover"`, `crossover: 80` and one satellite reports `HF 90Hz`
- **THEN** the panel shows *Flat* and 60 … 150 with 80 selected, lists both satellites and the sub with their roles and presets, and marks the satellite at `HF 90Hz`

#### Scenario: Choosing Flat
- **WHEN** the user chooses *Flat* in the crossover panel
- **THEN** `PUT /audio/rooms/13/eq` is sent with `{"crossover": null}`

#### Scenario: Reset asks first
- **WHEN** the user taps *Hauskurve* in the "Bad" panel
- **THEN** nothing is sent until the user confirms in the panel, then `POST /audio/rooms/12/eq/reset` is sent and the EQ is read again after the `204`

#### Scenario: Speaker does not answer
- **WHEN** `GET /audio/rooms/12/eq` answers `503` with reason `10.10.195.67 did not answer`
- **THEN** the panel shows that reason, its controls are disabled, and *retry* reads the EQ again

#### Scenario: Write partly failed
- **WHEN** a `PUT` answers `502` with a reason
- **THEN** the sliders keep the sent values and a warning with the reason is shown

#### Scenario: Change from another kiosk
- **WHEN** the "Bad" panel is open, no write of its own is running, and an SSE `audio-eq-changed` with `roomId: 12` arrives
- **THEN** the panel reads `GET /audio/rooms/12/eq` again and shows the new gains

#### Scenario: Event for another room
- **WHEN** the "Bad" panel is open and an SSE `audio-eq-changed` with `roomId: 13` arrives
- **THEN** nothing is read

#### Scenario: Tool switch closes the panel
- **WHEN** the "Bad" EQ panel is open and the user chooses the Volume tool
- **THEN** the panel closes

### Requirement: One card per stream

The stream strip SHALL show one card for the main group first, then one card for every
available solo room, and then one card for every available web player (capability
`kiosk-audio-bar`), each in its stream's colour. A web player's card SHALL show the web player
icon instead of the speaker icon and the web player's name from the server. A card SHALL show
cover, title and artist (or a "nothing playing" text), previous / play-pause / next, and a volume
slider for the stream's volume (`PUT /audio/targets/{targetId}/volume`), live while dragged as in
`kiosk-audio-bar`. A solo room's or web player's card for a target with nothing to play SHALL be
narrower, with its name and a hint that a selection can be started from the bar. The card of the
bar's current target SHALL be marked as selected. Tapping a card outside its controls SHALL
select it as the bar's target and close the popup. When the cards do not fit the width, the strip
SHALL scroll horizontally on its own, without the page scrolling sideways. A card SHALL appear
and disappear with its web player while the popup is open, as the audio state changes.

#### Scenario: Pick a solo stream
- **WHEN** the user taps the card of the solo room "Atrium" outside its controls
- **THEN** the bar controls "Atrium" and the popup closes

#### Scenario: Group volume
- **WHEN** the user drags the main group card's volume slider to 40 and releases it
- **THEN** the last request sent is `PUT /audio/targets/{mainGroup.targetId}/volume` with `{level: 40}`

#### Scenario: Pause a solo stream
- **WHEN** the solo room "Workshop" is playing and the user taps pause on its card
- **THEN** the GUI sends `POST /audio/targets/{targetId}/pause` for Workshop and the popup stays open

#### Scenario: Web player cards after the rooms
- **WHEN** the state has the solo rooms "Atrium" and "Workshop" and the web players "Web (Firefox on Linux)" and "Web (Chrome on Windows)"
- **THEN** the strip shows the main group, "Atrium", "Workshop", then the two web player cards with the web player icon in the web player colour

#### Scenario: Web player appears while open
- **WHEN** the popup is open and a browser opens the MA web UI, so the server adds a web player to the state
- **THEN** a card for that web player appears at the end of the strip

#### Scenario: Web player volume
- **WHEN** the user drags a web player card's volume slider to 30 and releases it
- **THEN** the last request sent is `PUT /audio/targets/{targetId}/volume` with `{level: 30}` for that web player's `targetId`

### Requirement: Card volume slider stands out from the card

The volume slider on every stream card SHALL be clearly visible against the card in both the dark
and the light theme: the filled part of the track and the thumb SHALL have a contrast ratio of at
least 3:1 against the card's background, and the unfilled part of the track SHALL stay visible
and distinguishable from the filled part. The slider's colour SHALL be the same on every card and
SHALL NOT depend on the stream's colour. A disabled slider (disabled card or unknown volume) MAY
stay dimmed.

#### Scenario: Dark theme
- **WHEN** the plan popup is open in the dark theme and the main group's volume is 40
- **THEN** the filled track up to 40 and the round thumb are drawn in a light colour with at least 3:1 contrast against the card, and the rest of the track is visible as a fainter line

#### Scenario: Light theme
- **WHEN** the plan popup is open in the light theme
- **THEN** the filled track and the thumb are drawn in a dark colour with at least 3:1 contrast against the card

#### Scenario: Same colour on every card
- **WHEN** the strip shows the main group card and a solo room card in a different stream colour
- **THEN** both cards' volume sliders use the same colour

### Requirement: The server's state is shown, not the tap

Rooms and cards SHALL show the state the server reports. While a request of a room for one tool
is in flight, the same tool SHALL NOT send another request for that room. When a request fails,
the GUI SHALL show one short error message, as for the audio bar's commands, and the room SHALL
keep showing the server's state.

#### Scenario: Double tap
- **WHEN** the user taps a room twice with the Group tool before the first request has answered
- **THEN** only one request is sent

#### Scenario: Request fails
- **WHEN** the server answers a manual-mute request with an error
- **THEN** one error message is shown and the room keeps its hatching as the state reports it

### Requirement: Usable without the plan

When the floor plan image or the light appliances cannot be loaded, the popup SHALL show every
room as a chip instead, with all tools working on the chips and the stream strip unchanged. When
no audio state is available, the popup SHALL show the same "audio unavailable" look as the bar,
with all controls disabled.

#### Scenario: Appliances fail to load
- **WHEN** loading the light appliances fails
- **THEN** every audio room is shown as a chip and the Mute tool still mutes a room on tap

### Requirement: Web players are not on the plan

Web players SHALL NOT be drawn on the floor plan, not be shown as room chips beside it, and not be
affected by the mute, group, light or volume tools, because they belong to no room. They SHALL be
reachable only through their stream cards.

#### Scenario: No area for a web player
- **WHEN** the state lists a web player
- **THEN** the plan shows no area and no chip for it, and the Group tool cannot put it into the main group
