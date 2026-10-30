# kiosk-audio-bar Specification

## Purpose

Gives every kiosk page a compact music player bar at the bottom, so everyday control of the house
audio (what plays where, how loud, which track, which station) is one tap away without opening the
full Music Assistant UI.

## Requirements

### Requirement: Bar on every kiosk page except the audio page

While kiosk mode is active, the app SHALL show the audio bar fixed to the bottom edge of the
viewport on every route, except on the kiosk audio page (`/app/kioskaudio`), which keeps the full
embedded Music Assistant UI without the bar. Outside kiosk mode the bar SHALL NOT be shown. Page
content SHALL NOT be hidden behind the bar: the scrollable content area SHALL end above it, and the
kiosk settings gear SHALL sit above the bar, still tappable.

#### Scenario: Bar on the overview
- **WHEN** kiosk mode is active and the user is on `/app/kioskoverview`
- **THEN** the audio bar is visible at the bottom of the viewport

#### Scenario: Bar hidden on the audio page
- **WHEN** the user opens `/app/kioskaudio`
- **THEN** the audio bar is not shown and the embedded Music Assistant UI keeps its full area

#### Scenario: Bar hidden outside kiosk mode
- **WHEN** kiosk mode is not active
- **THEN** the audio bar is not shown

#### Scenario: Last content stays reachable
- **WHEN** a kiosk page is scrolled to its end
- **THEN** its last element is fully visible above the bar
- **AND** the settings gear is visible and tappable above the bar

### Requirement: Half-height link tiles and bar height

Every kiosk link tile SHALL be half as high as before this change, with its icon placed beside
the text instead of above it, and its text still readable on one line where it fit before. The
audio bar SHALL have the same height as one halved link tile.

#### Scenario: Link tile height halved
- **WHEN** any kiosk page with link tiles is shown at the same width as before
- **THEN** each link tile is half its previous height (±2 px)
- **AND** the audio bar is as high as a link tile (±2 px)

### Requirement: Bar controls

The bar SHALL show, in this order from left to right: the target selector, the current title and
artist, previous track, back 10 s, play/pause, forward 10 s, next track, a draggable progress
slider, a volume control and a radio button. All commands SHALL go to the currently selected
target. The ±10 s buttons SHALL seek to the current interpolated position ±10 s, clamped to
`0..duration`. Releasing the progress slider SHALL seek to the released position. The volume
control SHALL set the target's volume (the main group's volume for the main group, the room's
volume for a solo room). Play/pause SHALL show "pause" while the target is playing and "play"
otherwise. When the target has no track, the title area SHALL show a neutral "nothing playing"
text and the seek controls SHALL be disabled. When the track has no duration (e.g. a radio
stream), the progress slider and the ±10 s buttons SHALL be disabled.

#### Scenario: Pause the main group
- **WHEN** the main group is the target and is playing, and the user taps pause
- **THEN** the GUI sends `POST /audio/targets/{mainGroup.targetId}/pause`
- **AND** the button shows "play" once the next state reports `paused`

#### Scenario: Skip forward 10 seconds
- **WHEN** the interpolated position is 62 s of a 200 s track and the user taps +10 s
- **THEN** the GUI sends `POST /audio/targets/{targetId}/seek` with `{position: 72}`

#### Scenario: Skip forward near the end
- **WHEN** the interpolated position is 195 s of a 200 s track and the user taps +10 s
- **THEN** the GUI sends a seek with `{position: 200}`

#### Scenario: Seek with the slider
- **WHEN** the user drags the progress slider to 1:30 and releases it
- **THEN** the GUI sends one seek with `{position: 90}`

#### Scenario: Radio stream without duration
- **WHEN** the target plays a track whose `duration` is `null`
- **THEN** the progress slider and the ±10 s buttons are disabled
- **AND** play/pause, previous, next and volume remain usable

#### Scenario: Command fails
- **WHEN** a playback command answers with an error
- **THEN** the GUI shows a short error message and the bar keeps showing the last known state

### Requirement: Target selector with room colours, room volume and group toggle

The target selector SHALL show the colour and name of the selected target. Tapping it SHALL open
a popup listing the main group first and then every room. The main group SHALL have its own fixed
colour that is distinct from all room colours; each room SHALL be shown in its `color` from the
server. Only the main group and rooms that are currently solo (not grouped) and available SHALL be
selectable as target; grouped rooms SHALL be marked as part of the main group. Every room row SHALL
offer a volume slider (setting that room's volume) and an in/out-of-group toggle. A pinned room's
toggle SHALL be shown in the "in group" position and SHALL NOT be tappable. A room that is not
available SHALL be shown dimmed with its controls disabled.

#### Scenario: Pick a solo room
- **WHEN** the room "Küche" is solo and available and the user selects it in the popup
- **THEN** the bar shows "Küche" in Küche's colour
- **AND** following commands go to Küche's `targetId`

#### Scenario: Take a room out of the group
- **WHEN** the user switches a grouped room's toggle to "out of group"
- **THEN** the GUI sends `PUT /audio/rooms/{roomId}/grouped` with `{grouped: false}`
- **AND** the room becomes selectable as soon as the next state reports it solo

#### Scenario: Esszimmer is pinned
- **WHEN** the popup shows the room "Esszimmer", which is pinned
- **THEN** its group toggle shows "in group" and is disabled

#### Scenario: Room volume from the popup
- **WHEN** the user drags a room's volume slider to 40 and releases it
- **THEN** the GUI sends `PUT /audio/rooms/{roomId}/volume` with `{level: 40}`

#### Scenario: Main group colour is distinct
- **WHEN** the selected target is the main group
- **THEN** the bar shows the main group's colour, which differs from every room colour in the state

### Requirement: Target remembered per device

The selected target SHALL be remembered on the device across page changes and reloads, and SHALL
NOT be shared with other devices. When nothing is remembered, when the remembered room no longer
exists, is grouped again or is not available, the bar SHALL control the main group. When browser
storage is unavailable the bar SHALL still work and default to the main group.

#### Scenario: Selection survives a reload
- **WHEN** the user selected the solo room "Küche" and reloads the page
- **THEN** the bar controls "Küche" again

#### Scenario: Remembered room rejoined the group
- **WHEN** the remembered room is put back into the main group (from any device)
- **THEN** the bar switches to the main group

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws
- **THEN** the bar controls the main group and selecting a target still works for the current page session

### Requirement: Queue and playlist popup

Tapping the title area SHALL open a popup showing the selected target's current queue with the
playing entry highlighted, and a list of playlists. Tapping a queue entry SHALL play that entry
(`POST /audio/targets/{targetId}/queue/play` with its index). Tapping a playlist SHALL replace the
queue with that playlist (`POST /audio/targets/{targetId}/playMedia` with the playlist's URI). The
popup SHALL reload the queue when the target's track or playlist changes while it is open.

#### Scenario: Jump to a queue entry
- **WHEN** the popup shows a queue of 12 entries and the user taps entry 5 (index 4)
- **THEN** the GUI sends `POST /audio/targets/{targetId}/queue/play` with `{index: 4}`

#### Scenario: Switch playlist
- **WHEN** the user taps the playlist "Abendessen" in the popup
- **THEN** the GUI sends `playMedia` for the selected target with that playlist's URI

#### Scenario: Empty queue
- **WHEN** the target's queue is empty
- **THEN** the popup shows a short "queue empty" text and still lists the playlists

### Requirement: Radio quick select popup

Tapping the radio button SHALL open a popup with the stations from `GET /audio/radio` (at most 8,
in server order), each with its name and image when present. Tapping a station SHALL play it on
the selected target via `playMedia` with the station's URI and close the popup. When the server
returns no stations, the popup SHALL say that no stations are configured.

#### Scenario: Play a station
- **WHEN** the user opens the radio popup and taps "Ö1"
- **THEN** the GUI sends `POST /audio/targets/{targetId}/playMedia` with Ö1's URI
- **AND** the popup closes

#### Scenario: No stations
- **WHEN** `GET /audio/radio` answers an empty list
- **THEN** the popup shows that no radio stations are configured

### Requirement: Locally interpolated position

While the target is `playing`, the bar SHALL advance the shown position every second as
`elapsed + (now − elapsedAt)`, clamped to `0..duration`; while `paused` or `idle` it SHALL show
`elapsed` unchanged. While the user drags the progress slider, incoming state updates SHALL NOT
move the knob; after release the knob SHALL stay at the released position until a newer state
arrives or 3 seconds pass.

#### Scenario: Position advances without events
- **WHEN** the last state reported `playing`, `elapsed: 30` and no further event arrives for 5 s
- **THEN** the bar shows about 0:35

#### Scenario: Drag is not disturbed
- **WHEN** the user is dragging the slider and an `audio-state` event arrives
- **THEN** the knob stays under the user's finger

### Requirement: Live state with fallback

The bar SHALL take its state from `audio-state` SSE events and SHALL additionally load
`GET /audio/state` when it first appears, when the SSE connection is (re)established, when the
display wakes up, and periodically as a safety net. When no state can be loaded (audio backend not
reachable or not deployed), the bar SHALL stay visible in a disabled "audio unavailable" look,
without error popups on every retry, and SHALL recover by itself once state arrives.

#### Scenario: Track change from another device
- **WHEN** another device skips to the next track on the main group
- **THEN** the bar controlling the main group shows the new title within about a second, without a reload

#### Scenario: Backend not reachable
- **WHEN** `GET /audio/state` fails and no `audio-state` event has arrived
- **THEN** the bar shows its "audio unavailable" look with all controls disabled
- **AND** no error message is shown for the repeated background attempts

#### Scenario: Recovery
- **WHEN** the bar is in its "audio unavailable" look and a valid state arrives
- **THEN** the bar shows that state with its controls enabled

### Requirement: Usable on tablet, mobile and PC widths

The bar SHALL fit the viewport width without horizontal scrolling on tablet, mobile and PC
widths. On narrow widths (below 600 px) the ±10 s buttons and previous track SHALL be omitted and the title SHALL
be truncated with an ellipsis; target selector, play/pause, next, progress slider, volume and radio
SHALL remain available. The popups SHALL fit the viewport on every width and be closable with an
explicit close control.

#### Scenario: Phone width
- **WHEN** the kiosk is shown at 390 px width
- **THEN** the bar has no horizontal scroll and shows target, title, play/pause, next, slider, volume and radio

#### Scenario: Popup on phone
- **WHEN** the target popup is opened at 390 px width
- **THEN** it fits the screen and can be closed with its close control
