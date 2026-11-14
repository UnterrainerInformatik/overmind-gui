## Purpose

Shows every house speaker on the floor plan in one full-screen kiosk popup, so which rooms play
together, which are muted and why, which follow the lights and how loud each is can be seen at a
glance and changed with one tap or one drag.

## ADDED Requirements

### Requirement: Full-screen popup sized for the kiosk tablets

Tapping the audio bar's target selector SHALL open the audio plan popup over the whole viewport.
From top to bottom it SHALL show a tool bar (the five tools and a close control), the floor plan
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

### Requirement: One tool is active and decides what a room does

The tool bar SHALL offer Overview, Mute, Group, Light and Volume, exactly one active at a time and
marked clearly. Tapping a room SHALL do what the active tool does; switching tools SHALL send
nothing.

#### Scenario: Overview highlights the stream
- **WHEN** the Overview tool is active and the user taps the solo room "Kizi Alex"
- **THEN** no request is sent and the stream card of "Kizi Alex" is scrolled into view and highlighted

#### Scenario: Overview on a grouped room
- **WHEN** the Overview tool is active and the user taps a grouped room
- **THEN** the main group's stream card is scrolled into view and highlighted

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

### Requirement: One card per stream

The stream strip SHALL show one card for the main group first and then one card for every
available solo room, each in its stream's colour. A card SHALL show cover, title and artist (or a
"nothing playing" text), previous / play-pause / next, and a volume slider for the stream's
volume (`PUT /audio/targets/{targetId}/volume`), live while dragged as in `kiosk-audio-bar`. A
solo room's card for a target with nothing to play SHALL be narrower, with its name and a hint
that a selection can be started from the bar. The card of the bar's current target SHALL be
marked as selected. Tapping a card outside its controls SHALL select it as the bar's target and
close the popup. When the cards do not fit the width, the strip SHALL scroll horizontally on its
own, without the page scrolling sideways.

#### Scenario: Pick a solo stream
- **WHEN** the user taps the card of the solo room "Atrium" outside its controls
- **THEN** the bar controls "Atrium" and the popup closes

#### Scenario: Group volume
- **WHEN** the user drags the main group card's volume slider to 40 and releases it
- **THEN** the last request sent is `PUT /audio/targets/{mainGroup.targetId}/volume` with `{level: 40}`

#### Scenario: Pause a solo stream
- **WHEN** the solo room "Workshop" is playing and the user taps pause on its card
- **THEN** the GUI sends `POST /audio/targets/{targetId}/pause` for Workshop and the popup stays open

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
