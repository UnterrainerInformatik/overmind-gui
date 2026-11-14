## MODIFIED Requirements

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
