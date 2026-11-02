## MODIFIED Requirements

### Requirement: Queue and playlist popup

Tapping the title area SHALL open a popup showing the selected target's current queue with the
playing entry highlighted, and a list of playlists. Tapping a queue entry SHALL play that entry
(`POST /audio/targets/{targetId}/queue/play` with its index). The playlist section SHALL have a
shuffle toggle, which is the same device-local choice as the playlist editor's shuffle toggle
(capability `kiosk-playlist-editor`). Tapping a playlist SHALL replace the queue with that
playlist (`POST /audio/targets/{targetId}/playMedia` with `{uri: <the playlist's URI>, shuffle:
<the toggle>}`). The popup SHALL reload the queue when the target's track or playlist changes
while it is open. The playlist section SHALL have an edit-playlists button that opens the
playlist editor; when the editor closes, the popup SHALL reload its playlist list.

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
