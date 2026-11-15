## RENAMED Requirements

- FROM: `### Requirement: Play the open playlist with optional shuffle`
- TO: `### Requirement: Play the open playlist from a track`

## MODIFIED Requirements

### Requirement: Actions above the track list

An editable open playlist SHALL show its actions in a bar between the header and the track list:
rename, delete and, below 960 px width, "add tracks". The bar SHALL have no shuffle toggle,
because shuffle is a setting of the player (capability `kiosk-audio-bar`), not of the playlist.
The bar SHALL have no button that plays the whole playlist; playing starts from a track
(requirement "Play the open playlist from a track"). The bar SHALL stay visible while the track
list scrolls. No playlist action SHALL be placed only below the track list. A read-only playlist
has no actions, so its action bar SHALL NOT be shown.

#### Scenario: Long playlist
- **WHEN** the open editable playlist has more tracks than fit on screen and the user scrolls to the middle of the list
- **THEN** the action bar is still visible above the list without scrolling back up

#### Scenario: Read-only playlist
- **WHEN** the user opens a playlist the server reports as `editable: false`
- **THEN** no action bar is shown and the track list follows the header

#### Scenario: No shuffle toggle
- **WHEN** the user opens any playlist
- **THEN** the page shows no shuffle toggle

#### Scenario: No whole-playlist play button
- **WHEN** the user opens any playlist
- **THEN** the page shows no button that plays the whole playlist

### Requirement: Play the open playlist from a track

Every track of an open playlist, editable or read-only, SHALL have a play/stop button for the
device's audio target, which is the target the audio bar would control on this device (the
remembered target, else the main group).

- Play on a track that is not the marked playing track (requirement "Playing track in the open
  playlist") SHALL send `POST /audio/targets/{targetId}/playMedia` with `{uri: <the playlist's
  uri>, startIndex: <the track's 0-based row>}`, without a `shuffle` field, so the target's
  current shuffle mode applies. The whole playlist then plays from that track on, and the
  following tracks play by themselves without the GUI.
- Play on the marked track while the target is not playing SHALL resume it
  (`POST /audio/targets/{targetId}/play`).
- On the marked track while the target plays, the button SHALL show stop, and stop SHALL pause the
  target (`POST /audio/targets/{targetId}/pause`).

When no target is known (audio state not loaded) the buttons SHALL be disabled. They SHALL work
while an edit is in flight, because playing does not change the playlist. The track list SHALL
always show the playlist's stored order, also while the target shuffles. A failed play SHALL show
a snackbar with the server's reason when one is given. The editor SHALL stay open after play.

#### Scenario: Play in order
- **WHEN** the device's target reports `shuffle: false` and the user taps play on the fourth track of the open playlist "Abendessen"
- **THEN** the GUI sends `playMedia` for the device's target with `{uri: <Abendessen's uri>, startIndex: 3}` and no `shuffle` field

#### Scenario: Play shuffled
- **WHEN** the device's target reports `shuffle: true` and the user taps play on the first track
- **THEN** the GUI sends `playMedia` with `startIndex: 0` and no `shuffle` field, and the track list still shows the stored order

#### Scenario: Stop the playing track
- **WHEN** the target plays the open playlist's marked track and the user taps its stop button
- **THEN** the GUI sends `pause` for the target and no `playMedia`

#### Scenario: Resume the paused track
- **WHEN** the marked track is paused and the user taps its play button
- **THEN** the GUI sends `play` for the target, not `playMedia`

#### Scenario: Play in a read-only playlist
- **WHEN** the open playlist is `editable: false` and the user taps play on a track
- **THEN** the GUI sends `playMedia` with that track's row as `startIndex`

#### Scenario: Server rejects the start
- **WHEN** `playMedia` answers `400` because the track at that row is unavailable
- **THEN** a snackbar shows the server's reason and the editor stays open

#### Scenario: Choice survives a reload
- **WHEN** this browser still holds a shuffle choice stored by an earlier version and the user reloads the page and plays a track
- **THEN** the stored choice is ignored and `playMedia` carries no `shuffle` field

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws and the user plays a track
- **THEN** the play works as without storage and sends no `shuffle` field

#### Scenario: No target yet
- **WHEN** the audio state has not been loaded
- **THEN** the tracks' play buttons are disabled
