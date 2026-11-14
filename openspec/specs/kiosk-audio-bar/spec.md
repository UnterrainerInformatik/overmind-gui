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

### Requirement: Lower link tiles and bar height

Every kiosk link tile SHALL be 60 px high (it was 82 px before this change), with its icon placed
beside the text instead of above it, and its text still readable on one line where it fit before.
The audio bar SHALL be 41 px high, half the old link tile height.

#### Scenario: Link tile height lowered
- **WHEN** any kiosk page with link tiles is shown at the same width as before
- **THEN** each link tile is 60 px high (±2 px)
- **AND** the audio bar is 41 px high (±2 px)

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

### Requirement: Target selector opens the audio plan popup

The target selector SHALL show the colour and name of the selected target. Tapping it SHALL open
the audio plan popup (capability `kiosk-audio-plan-popup`), which lists one stream card for the
main group, one for every available solo room and one for every web player, and lets the user
pick one of them as the target. The main group SHALL have its own fixed colour that is distinct
from all room colours; each room SHALL be shown in its `color` from the server. Web players SHALL
share one fixed web player colour that is distinct from the main group colour, the room fallback
colours and the unavailable grey, and SHALL be shown with a web player icon instead of the
speaker or speaker-group icon. A web player SHALL be named by its `name` from the server (the name
MA gives it, which can be changed in MA). Only the main group, rooms that are currently solo and
available, and web players that are currently in the state and available SHALL be selectable as
target. Room volume, group membership, mute and light link SHALL be changed on the popup's floor
plan, not in a list.

A web player is a Music Assistant player that is not configured for any room and that the server
reports in the audio state's `players` list (browser tabs running the MA web UI, the MA mobile app
or the MA PWA). Web players SHALL always be solo targets; the GUI SHALL NOT offer to group them.
When the server sends no `players` list, there SHALL be no web players.

#### Scenario: Pick a solo room
- **WHEN** the room "Küche" is solo and available and the user taps its stream card in the popup
- **THEN** the bar shows "Küche" in Küche's colour
- **AND** following commands go to Küche's `targetId`

#### Scenario: Grouped room is not a target
- **WHEN** the room "Bad" is grouped
- **THEN** the popup shows no stream card for "Bad" and "Bad" is filled in the main group's colour on the plan

#### Scenario: Main group colour is distinct
- **WHEN** the selected target is the main group
- **THEN** the bar shows the main group's colour, which differs from every room colour in the state

#### Scenario: Pick a web player
- **WHEN** the state lists the web player "Web (Firefox on Linux)" and the user taps its stream card in the popup
- **THEN** the bar shows "Web (Firefox on Linux)" with the web player icon in the web player colour
- **AND** play, pause, next, previous, seek, volume, the queue popup and the playlist editor's play button act on that player's `targetId`

#### Scenario: Server without web players
- **WHEN** the server's audio state has no `players` field
- **THEN** the popup shows the main group and the solo rooms only and the bar works as before

### Requirement: Target remembered per device

The selected target SHALL be remembered on the device across page changes and reloads, and SHALL
NOT be shared with other devices. When nothing is remembered, when the remembered room no longer
exists, is grouped again or is not available, the bar SHALL control the main group. When browser
storage is unavailable the bar SHALL still work and default to the main group.

When the remembered target is a web player that is not in the state or not available, the bar
SHALL control the main group without any notice, and a queue popup open for that web player SHALL
switch to the main group's queue. Unlike a room, the remembered web player SHALL be kept: as soon
as a web player with the same `targetId` is in the state and available again, the bar SHALL
control it again. Choosing another target SHALL replace the remembered web player.

#### Scenario: Selection survives a reload
- **WHEN** the user selected the solo room "Küche" and reloads the page
- **THEN** the bar controls "Küche" again

#### Scenario: Remembered room rejoined the group
- **WHEN** the remembered room is put back into the main group (from any device)
- **THEN** the bar switches to the main group

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws
- **THEN** the bar controls the main group and selecting a target still works for the current page session

#### Scenario: Web player tab closed
- **WHEN** the bar controls the web player "Web (Firefox on Linux)" and its browser tab is closed, so the server drops it from `players`
- **THEN** the bar controls the main group and shows its name and colour, without a message
- **AND** a queue popup open at that moment shows the main group's queue

#### Scenario: Web player comes back
- **WHEN** the remembered web player was gone and a web player with the same `targetId` appears in the state again
- **THEN** the bar controls that web player again

#### Scenario: Web player gone at reload
- **WHEN** the remembered target is a web player and the page is reloaded while that player is not in the state
- **THEN** the bar controls the main group and the remembered web player is kept

#### Scenario: Another choice replaces the web player
- **WHEN** the remembered web player is gone, the bar controls the main group and the user taps the main group's card
- **THEN** the main group is remembered and the web player is not selected again when it comes back

### Requirement: Queue and playlist popup

Tapping the title area SHALL open a popup showing the selected target's current queue with the
playing entry highlighted, and a list of playlists. Tapping a queue entry SHALL play that entry
(`POST /audio/targets/{targetId}/queue/play` with its index). The playlist section SHALL have a
shuffle toggle, which is the same device-local choice as the playlist editor's shuffle toggle
(capability `kiosk-playlist-editor`). Tapping a playlist SHALL replace the queue with that
playlist (`POST /audio/targets/{targetId}/playMedia` with `{uri: <the playlist's URI>, shuffle:
<the toggle>}`). The playlist the target plays SHALL be marked in the list: the playlist whose
URI equals the target's `playback.sourceUri`; when `sourceUri` is null or matches no listed
playlist, none SHALL be marked. The popup SHALL reload the queue when the target's track,
`queueIndex` or `sourceUri` changes while it is open. The playlist section SHALL have an edit-playlists button that opens the
playlist editor; when the editor closes, the popup SHALL reload its queue and its playlist list.

While the popup is open, including while the playlist editor is open over it, it SHALL also
reload the queue when the server sends `audio-queue-changed` with the selected target's
`targetId`, when the server sends `audio-playlist-changed`, and after the SSE connection is
established again; on `audio-playlist-changed` and after a reconnect it SHALL also reload the
playlist list. Events arriving within about 300 ms of each other SHALL lead to one reload. Such a
background reload SHALL keep the shown queue and list while it runs and when it fails.
`audio-queue-changed` for another target SHALL NOT reload the queue.

#### Scenario: Jump to a queue entry
- **WHEN** the popup shows a queue of 12 entries and the user taps entry 5 (index 4)
- **THEN** the GUI sends `POST /audio/targets/{targetId}/queue/play` with `{index: 4}`

#### Scenario: Switch playlist
- **WHEN** shuffle is off and the user taps the playlist "Abendessen" in the popup
- **THEN** the GUI sends `playMedia` for the selected target with that playlist's URI and `shuffle: false`

#### Scenario: Switch playlist shuffled
- **WHEN** the user turns the popup's shuffle toggle on and taps the playlist "Abendessen"
- **THEN** the GUI sends `playMedia` with that playlist's URI and `shuffle: true`

#### Scenario: One shuffle choice
- **WHEN** the user turned shuffle on in the playlist editor and opens the queue popup
- **THEN** the popup's shuffle toggle is on

#### Scenario: Empty queue
- **WHEN** the target's queue is empty
- **THEN** the popup shows a short "queue empty" text and still lists the playlists

#### Scenario: Open the playlist editor
- **WHEN** the user taps the edit-playlists button in the popup
- **THEN** the playlist editor opens

#### Scenario: Playlists reloaded after editing
- **WHEN** the user created a playlist in the editor and closes it
- **THEN** the popup's playlist list is reloaded and contains the new playlist

#### Scenario: Queue follows an edit of the playing playlist
- **WHEN** the selected target plays playlist P, the user adds a track to P in the editor and the server sends `audio-queue-changed` for that target
- **THEN** the popup reloads the queue and, once the editor is closed, shows the added track at the end

#### Scenario: Queue reloaded when the editor closes
- **WHEN** the user closes the playlist editor
- **THEN** the popup reloads its queue as well as its playlist list

#### Scenario: Other target
- **WHEN** the server sends `audio-queue-changed` for a target other than the selected one
- **THEN** the popup does not reload its queue

#### Scenario: Burst of events
- **WHEN** `audio-playlist-changed` and `audio-queue-changed` for the selected target arrive within 300 ms
- **THEN** the popup reloads its queue once

#### Scenario: Background reload fails
- **WHEN** a reload triggered by an event fails
- **THEN** the popup keeps showing the queue it had

#### Scenario: Current playlist marked
- **WHEN** the selected target's state has `sourceUri` equal to the URI of the playlist "Abendessen"
- **THEN** "Abendessen" is marked in the popup's playlist list and no other playlist is

#### Scenario: No source
- **WHEN** the selected target's `sourceUri` is null, for example after a track was added to its queue
- **THEN** no playlist is marked

#### Scenario: Source change reloads the queue
- **WHEN** the popup is open and the target's `sourceUri` changes from null to a playlist's URI
- **THEN** the popup reloads the queue

### Requirement: Playlist filter in the queue popup

The playlist section of the queue and playlist popup SHALL have a clearable text field above the
playlist list. While it holds text, the list SHALL show only the playlists whose name contains
that text, ignoring case and leading or trailing whitespace; the filtering SHALL happen on the
client on every keystroke, without a debounce, a minimum length or a server request. An empty
field SHALL show all playlists. The field SHALL be empty every time the popup opens, and it SHALL
NOT take focus by itself when the popup opens. When the filter leaves no playlist, the section
SHALL show a "no matching playlists" text instead of the list. The filter SHALL NOT affect the
queue section.

#### Scenario: Narrow the list
- **WHEN** the popup lists the playlists "Radio", "Abendessen" and "Rock Classics" and the user types "ra" into the filter
- **THEN** only "Radio" is listed

#### Scenario: Case is ignored
- **WHEN** the user types "ROCK"
- **THEN** "Rock Classics" is listed

#### Scenario: Clearing shows all
- **WHEN** the filter holds "ra" and the user taps its clear button
- **THEN** all playlists are listed again

#### Scenario: No match
- **WHEN** the user types "xyz" and no playlist name contains it
- **THEN** the playlist section shows the "no matching playlists" text
- **AND** the queue section still shows the queue

#### Scenario: Reset on reopen
- **WHEN** the user typed "ra", closes the popup and opens it again
- **THEN** the filter is empty and all playlists are listed

#### Scenario: No keyboard on open
- **WHEN** the popup opens
- **THEN** the filter field does not have focus

#### Scenario: Filter survives a reload of the list
- **WHEN** the filter holds "ra" and the playlist list is reloaded after the playlist editor closes
- **THEN** the filter still holds "ra" and applies to the reloaded list

### Requirement: Queue popup layout

At widths of 960 px and more, the queue and playlist popup SHALL show the queue and the playlist
section side by side, the queue on the left and the playlist section on the right, each in its
own column that scrolls on its own. The playlist section's head (heading and shuffle toggle) and
its filter field SHALL stay visible at the top of their column while the playlist list scrolls.
Below 960 px, the popup SHALL show the queue first and the playlist section below it in one
scrolling list. At 390, 800 and 1280 px width the popup SHALL have no horizontal scrolling.

#### Scenario: Wide layout
- **WHEN** the popup is opened at 1280 px width with a queue of 40 entries and 20 playlists
- **THEN** the queue and the playlist list are visible next to each other, the queue on the left

#### Scenario: Columns scroll on their own
- **WHEN** the popup is open at 1280 px width and the user scrolls the queue to its end
- **THEN** the playlist column does not move

#### Scenario: Playlist head stays visible
- **WHEN** the popup is open at 1280 px width and the user scrolls the playlist list down
- **THEN** the shuffle toggle and the filter field stay visible above the list

#### Scenario: Narrow layout
- **WHEN** the popup is opened at 800 px width
- **THEN** the playlist section is shown below the queue in one scrolling list

#### Scenario: Phone width
- **WHEN** the popup is opened at 390 px width
- **THEN** it shows the queue with the playlist section below and has no horizontal scrolling

### Requirement: Radio quick select popup

Tapping the radio button SHALL open a popup with the stations from `GET /audio/radio` (at most 12,
in server order), each with its name and image when present. When the server sends more than 12
stations, the popup SHALL show the first 12 and drop the rest. On the kiosk display the popup
SHALL show twelve stations without scrolling. Tapping a station SHALL play it on the selected
target via `playMedia` with the station's URI and close the popup. When the server returns no
stations, the popup SHALL say that no stations are configured.

#### Scenario: Play a station
- **WHEN** the user opens the radio popup and taps "Ö1"
- **THEN** the GUI sends `POST /audio/targets/{targetId}/playMedia` with Ö1's URI
- **AND** the popup closes

#### Scenario: Twelve stations
- **WHEN** `GET /audio/radio` answers 13 stations
- **THEN** the popup shows the first 12 in server order
- **AND** the 13th station is not shown

#### Scenario: Twelve stations fit on the kiosk display
- **WHEN** the popup shows 12 stations on the kiosk display
- **THEN** all 12 tiles are fully visible without scrolling the popup

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
explicit close control. On widths below 1020 px the audio plan popup SHALL scale its floor plan
down to the viewport width and MAY scroll vertically, but SHALL NOT scroll the page sideways.

#### Scenario: Phone width
- **WHEN** the kiosk is shown at 390 px width
- **THEN** the bar has no horizontal scroll and shows target, title, play/pause, next, slider, volume and radio

#### Scenario: Popup on phone
- **WHEN** the audio plan popup is opened at 390 px width
- **THEN** the floor plan is 390 px wide, the page has no horizontal scroll, and the popup can be closed with its close control

### Requirement: Live volume while dragging

Every volume control of the kiosk audio UI - the bar's volume slider, the stream cards' volume
sliders and the Volume tool's room drag in the audio plan popup - SHALL change the volume while
it is being dragged, not only when it is released. While a control is dragged, the GUI SHALL
send the level under the finger to the same endpoint the control uses on release
(`PUT /audio/targets/{targetId}/volume` for the bar and the stream cards,
`PUT /audio/rooms/{roomId}/volume` for a room on the plan), at most one request every 200 ms and
with at most one request of that control in flight at a time. Levels passed over while a request
is in flight or within the 200 ms SHALL be dropped, except that the newest level SHALL be sent as
soon as both allow it. On release the GUI SHALL make sure the released level is the last level
sent for that control; it SHALL NOT send it a second time when it already was. The number shown
for a control SHALL follow the finger while dragging. After release the control SHALL keep
showing the released level until the state reports that level for the target or room, or until
3 s have passed; states reporting other levels in between (echoes of levels sent during the drag)
SHALL NOT move it. A failed request for an intermediate level SHALL NOT show a message; a failed
request for the released level SHALL show the usual short error message.

#### Scenario: Volume changes while dragging
- **WHEN** the user presses the bar's volume slider at 20 and slowly drags it to 60 over one second without releasing
- **THEN** the GUI sends several `PUT /audio/targets/{targetId}/volume` requests with rising levels during the drag
- **AND** no two of them start less than 200 ms apart
- **AND** the shown number follows the finger

#### Scenario: Released level is the last one sent
- **WHEN** the user drags a room on the plan with the Volume tool quickly from 30 to 75 and releases it at 75
- **THEN** the last `PUT /audio/rooms/{roomId}/volume` sent for that room has `{level: 75}`

#### Scenario: No duplicate on release
- **WHEN** the last level sent during the drag was 50 and the user releases the control at 50
- **THEN** the GUI sends no further volume request for that control

#### Scenario: Echo of an intermediate level
- **WHEN** the user released the bar's volume slider at 70 and a state then arrives reporting volume 55 from an earlier request of the drag
- **THEN** the slider keeps showing 70
- **AND** it shows the state's volume again once a state reports 70 or 3 s have passed

#### Scenario: Tap without dragging
- **WHEN** the user taps the bar's volume slider at 40 without dragging
- **THEN** the GUI sends one volume request with `{level: 40}`

#### Scenario: Intermediate request fails
- **WHEN** a volume request sent during a drag answers with an error and the request for the released level succeeds
- **THEN** no error message is shown

### Requirement: Size of the bar's volume slider

The vertical volume slider in the bar's volume menu SHALL be 300 px long, or as long as fits when
the viewport is less than 410 px high (viewport height minus 110 px), so the menu stays fully
visible above the bar. Its track SHALL be 3 px and its thumb 18 px wide, 1.5 times Vuetify's
default vertical slider, and the slider 36 px wide.

#### Scenario: Tablet
- **WHEN** the user opens the volume menu on a 1024 × 768 screen
- **THEN** the slider is 300 px long and 36 px wide, with a 3 px track and an 18 px thumb

#### Scenario: Phone landscape
- **WHEN** the user opens the volume menu on an 844 × 390 screen
- **THEN** the slider is 280 px long and the whole menu is visible above the bar
