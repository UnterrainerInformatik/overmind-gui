## MODIFIED Requirements

### Requirement: Bar controls

The bar SHALL show, in this order from left to right: the target selector, the current title and
artist, previous track, back 10 s, play/pause, forward 10 s, next track, the shuffle toggle, a
draggable progress slider, a volume control and a radio button. All commands SHALL go to the
currently selected target. The ±10 s buttons SHALL seek to the current interpolated position
±10 s, clamped to `0..duration`. Releasing the progress slider SHALL seek to the released
position. The volume control SHALL set the target's volume (the main group's volume for the main
group, the room's volume for a solo room). Play/pause SHALL show "pause" while the target is
playing and "play" otherwise. When the target has no track, the title area SHALL show a neutral
"nothing playing" text and the seek controls SHALL be disabled. When the track has no duration
(e.g. a radio stream), the progress slider and the ±10 s buttons SHALL be disabled.

The shuffle toggle SHALL show the selected target's shuffle mode (`playback.shuffle` in the audio
state), not a choice stored on the device. Tapping it SHALL send
`PUT /audio/targets/{targetId}/shuffle` with `{enabled: <the opposite of the shown mode>}` at
once, whether or not the target is playing. After the tap the toggle SHALL show the requested
mode until a state reports that mode or about 3 s have passed, and then SHALL show the state's
mode again. The toggle SHALL be disabled while the audio state is unavailable. It SHALL stay
usable while a radio station plays. A failed switch SHALL show a short error message, and the
toggle SHALL show the state's mode again.

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
- **AND** play/pause, previous, next, shuffle and volume remain usable

#### Scenario: Command fails
- **WHEN** a playback command answers with an error
- **THEN** the GUI shows a short error message and the bar keeps showing the last known state

#### Scenario: Shuffle shows the player's mode
- **WHEN** the selected target's state reports `shuffle: true`, set from another device or the MA UI
- **THEN** the bar's shuffle toggle is on

#### Scenario: Turn shuffle on while playing
- **WHEN** the target plays a playlist unshuffled and the user taps the shuffle toggle
- **THEN** the GUI sends `PUT /audio/targets/{targetId}/shuffle` with `{enabled: true}`
- **AND** the toggle is on at once and stays on when the next state reports `shuffle: true`

#### Scenario: Switch not confirmed
- **WHEN** the user turned shuffle on and no state reports `shuffle: true` within about 3 s
- **THEN** the toggle shows the state's mode (off) again

#### Scenario: Switch fails
- **WHEN** the shuffle switch answers with an error
- **THEN** the GUI shows a short error message and the toggle shows the state's mode

#### Scenario: Other target selected
- **WHEN** the main group shuffles, a solo room does not, and the user selects that room as the target
- **THEN** the bar's shuffle toggle is off

### Requirement: Usable on tablet, mobile and PC widths

The bar SHALL fit the viewport width without horizontal scrolling on tablet, mobile and PC
widths. On narrow widths (below 600 px) the ±10 s buttons, previous track and the shuffle toggle
SHALL be omitted and the title SHALL be truncated with an ellipsis; target selector, play/pause,
next, progress slider, volume and radio SHALL remain available. On narrow widths shuffle SHALL
stay reachable through the queue popup (requirement "Queue and playlist popup"). The popups SHALL
fit the viewport on every width and be closable with an explicit close control. On widths below
1020 px the audio plan popup SHALL scale its floor plan down to the viewport width and MAY scroll
vertically, but SHALL NOT scroll the page sideways.

#### Scenario: Phone width
- **WHEN** the kiosk is shown at 390 px width
- **THEN** the bar has no horizontal scroll and shows target, title, play/pause, next, slider, volume and radio
- **AND** the bar shows no shuffle toggle

#### Scenario: Shuffle on the bar from tablet width
- **WHEN** the kiosk is shown at 800 px width
- **THEN** the bar shows the shuffle toggle between next track and the progress slider

#### Scenario: Popup on phone
- **WHEN** the audio plan popup is opened at 390 px width
- **THEN** the floor plan is 390 px wide, the page has no horizontal scroll, and the popup can be closed with its close control

### Requirement: Queue and playlist popup

Tapping the title area SHALL open a popup showing the selected target's current queue with the
playing entry highlighted, and a list of playlists. Tapping a queue entry SHALL play that entry
(`POST /audio/targets/{targetId}/queue/play` with its index). The queue section SHALL have a
shuffle toggle at its top, on every width, which behaves like the bar's shuffle toggle
(requirement "Bar controls"): it shows the selected target's `playback.shuffle` and switches the
target's shuffle mode at once. The playlist section SHALL have no shuffle toggle. Tapping a
playlist SHALL replace the queue with that playlist (`POST /audio/targets/{targetId}/playMedia`
with `{uri: <the playlist's URI>}`, without a `shuffle` field), so the target's current shuffle
mode applies. The playlist the target plays SHALL be marked in the list: the playlist whose URI
equals the target's `playback.sourceUri`; when `sourceUri` is null or matches no listed playlist,
none SHALL be marked. The popup SHALL reload the queue when the target's track, `queueIndex`,
`sourceUri` or `shuffle` changes while it is open. The playlist section SHALL have an
edit-playlists button that opens the playlist editor; when the editor closes, the popup SHALL
reload its queue and its playlist list.

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
- **WHEN** the user taps the playlist "Abendessen" in the popup
- **THEN** the GUI sends `playMedia` for the selected target with `{uri: <Abendessen's URI>}` and no `shuffle` field

#### Scenario: Switch playlist shuffled
- **WHEN** the selected target reports `shuffle: true` and the user taps the playlist "Abendessen"
- **THEN** the GUI sends `playMedia` with that playlist's URI and no `shuffle` field
- **AND** the popup's shuffle toggle stays on

#### Scenario: One shuffle choice
- **WHEN** the user turns shuffle on with the bar's toggle and opens the queue popup
- **THEN** the popup's shuffle toggle is on, because both show the same target's mode

#### Scenario: Shuffle in the queue section
- **WHEN** the popup is open at 390 px width and the selected target does not shuffle
- **THEN** the queue section shows the shuffle toggle off
- **AND** tapping it sends `PUT /audio/targets/{targetId}/shuffle` with `{enabled: true}`

#### Scenario: No shuffle toggle at the playlists
- **WHEN** the popup is open
- **THEN** the playlist section shows no shuffle toggle

#### Scenario: Shuffle change reloads the queue
- **WHEN** the popup is open and the target's `shuffle` changes from false to true
- **THEN** the popup reloads the queue

#### Scenario: Empty queue
- **WHEN** the target's queue is empty
- **THEN** the popup shows a short "queue empty" text, still shows the shuffle toggle and still lists the playlists

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

### Requirement: Queue popup layout

At widths of 960 px and more, the queue and playlist popup SHALL show the queue and the playlist
section side by side, the queue on the left and the playlist section on the right, each in its
own column that scrolls on its own. The playlist section's head (heading) and its filter field
SHALL stay visible at the top of their column while the playlist list scrolls. The queue
section's shuffle toggle SHALL stay visible at the top of its column while the queue scrolls.
Below 960 px, the popup SHALL show the queue first, with the shuffle toggle above it, and the
playlist section below it in one scrolling list. At 390, 800 and 1280 px width the popup SHALL
have no horizontal scrolling.

#### Scenario: Wide layout
- **WHEN** the popup is opened at 1280 px width with a queue of 40 entries and 20 playlists
- **THEN** the queue and the playlist list are visible next to each other, the queue on the left

#### Scenario: Columns scroll on their own
- **WHEN** the popup is open at 1280 px width and the user scrolls the queue to its end
- **THEN** the playlist column does not move
- **AND** the queue's shuffle toggle stays visible above the queue

#### Scenario: Playlist head stays visible
- **WHEN** the popup is open at 1280 px width and the user scrolls the playlist list down
- **THEN** the playlist heading and the filter field stay visible above the list

#### Scenario: Narrow layout
- **WHEN** the popup is opened at 800 px width
- **THEN** the shuffle toggle is shown above the queue and the playlist section below the queue, in one scrolling list

#### Scenario: Phone width
- **WHEN** the popup is opened at 390 px width
- **THEN** it shows the queue with the playlist section below and has no horizontal scrolling
