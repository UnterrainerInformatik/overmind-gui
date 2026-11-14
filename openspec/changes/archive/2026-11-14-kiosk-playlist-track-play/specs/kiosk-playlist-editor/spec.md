## MODIFIED Requirements

### Requirement: Actions above the track list

An open playlist SHALL show its actions in a bar between the header and the track list: the
shuffle toggle for every playlist; for editable playlists also rename, delete and, below 960 px
width, "add tracks". The bar SHALL have no button that plays the whole playlist; playing starts
from a track (requirement "Play the open playlist with optional shuffle"). The bar SHALL stay visible while
the track list scrolls. No playlist action SHALL be placed only below the track list. A read-only
playlist SHALL show only the shuffle toggle.

#### Scenario: Long playlist
- **WHEN** the open playlist has more tracks than fit on screen and the user scrolls to the middle of the list
- **THEN** the action bar is still visible above the list without scrolling back up

#### Scenario: Read-only playlist
- **WHEN** the user opens a playlist the server reports as `editable: false`
- **THEN** the action bar shows the shuffle toggle and no edit action

#### Scenario: No whole-playlist play button
- **WHEN** the user opens any playlist
- **THEN** the action bar shows no play button

### Requirement: Play the open playlist with optional shuffle

Every track of an open playlist, editable or read-only, SHALL have a play/stop button for the
device's audio target, which is the target the audio bar would control on this device (the
remembered target, else the main group). The action bar SHALL have a shuffle toggle. The shuffle
toggle SHALL be off on a device that never changed it, SHALL be remembered on the device across
reloads, SHALL NOT be shared with other devices, and SHALL be the same choice as the shuffle
toggle in the queue popup.

- Play on a track that is not the marked playing track (requirement "Playing track in the open
  playlist") SHALL send `POST /audio/targets/{targetId}/playMedia` with `{uri: <the playlist's
  uri>, startIndex: <the track's 0-based row>, shuffle: <the toggle>}`. The whole playlist then
  plays from that track on, and the following tracks play by themselves without the GUI.
- Play on the marked track while the target is not playing SHALL resume it
  (`POST /audio/targets/{targetId}/play`).
- On the marked track while the target plays, the button SHALL show stop, and stop SHALL pause the
  target (`POST /audio/targets/{targetId}/pause`).

When no target is known (audio state not loaded) the buttons SHALL be disabled. They SHALL work
while an edit is in flight, because playing does not change the playlist. Toggling shuffle SHALL
NOT change the playlist's stored order and SHALL NOT send anything by itself. A failed play SHALL
show a snackbar with the server's reason when one is given. The editor SHALL stay open after play.

#### Scenario: Play in order
- **WHEN** shuffle is off and the user taps play on the fourth track of the open playlist "Abendessen"
- **THEN** the GUI sends `playMedia` for the device's target with `{uri: <Abendessen's uri>, startIndex: 3, shuffle: false}`

#### Scenario: Play shuffled
- **WHEN** the user turns shuffle on and taps play on the first track
- **THEN** the GUI sends `playMedia` with `startIndex: 0` and `shuffle: true`, and the track list still shows the stored order

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
- **WHEN** the user turned shuffle on and reloads the page
- **THEN** the toggle is on in the editor and in the queue popup

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws
- **THEN** the toggle starts off and still works for the current page session

#### Scenario: No target yet
- **WHEN** the audio state has not been loaded
- **THEN** the tracks' play buttons are disabled

## ADDED Requirements

### Requirement: Playing track in the open playlist

The open playlist SHALL mark the track that the device's audio target is on, whether it plays or
is paused, but only while the target's `playback.sourceUri` equals the open playlist's URI. The
marked row SHALL be the row at the target's `queueIndex` when that row's URI equals the target's
`playback.track.uri`; otherwise it SHALL be the first row whose URI equals `playback.track.uri`.
When neither matches, when `sourceUri` is null or another URI, or when there is no target, no row
SHALL be marked. The marking SHALL follow the audio state without user action.

While a row is marked and the target reports a duration, that row SHALL show a position slider
that behaves like the audio bar's seek slider: the position is interpolated locally, dragging
does not move it back, and releasing seeks the target (`POST /audio/targets/{targetId}/seek`).
Using the slider SHALL NOT start a drag of the row.

#### Scenario: Track marked in order
- **WHEN** the target's state has `sourceUri` equal to the open playlist's URI, `queueIndex: 2` and `track.uri` equal to the third row's URI
- **THEN** the third row is marked and shows a position slider

#### Scenario: Shuffled queue
- **WHEN** `sourceUri` equals the open playlist's URI, `shuffle` is true, `queueIndex` is 7 and `track.uri` equals the second row's URI
- **THEN** the second row is marked

#### Scenario: Other source
- **WHEN** the target plays a track that is in the open playlist but `sourceUri` is null or another URI
- **THEN** no row is marked

#### Scenario: Marking moves on
- **WHEN** the marked track ends and the next `audio-state` reports the following track
- **THEN** the following row is marked

#### Scenario: Seek in the playing track
- **WHEN** the user drags the marked row's slider to 2:00 and releases it
- **THEN** the GUI sends `seek` with `position: 120` and the slider stays at 2:00 until the state reports the new position

### Requirement: Open an album in the search

Every album in the library search results that the server answers with an `id` SHALL have an
open button. Tapping it SHALL replace the results with the album's tracks from
`GET /audio/albums/{id}/tracks`, in the server's order, and show a closable chip with the album's
name. These tracks SHALL behave like track results: they can be previewed, are marked as already
added when they are in the playlist, and tapping one appends it. Tapping the album row outside its
open button SHALL still append the whole album. Closing the chip SHALL return to the results the
album was opened from. Typing into the search field SHALL leave the album. A failed album request
SHALL show the "could not load" text with a retry button. Only the latest answer SHALL be shown.

#### Scenario: Open an album
- **WHEN** the user taps the open button of the album "Abbey Road" (id 42) in the results
- **THEN** the GUI requests `GET /audio/albums/42/tracks`, shows its tracks in that order and a chip "Abbey Road"

#### Scenario: Add one track of the album
- **WHEN** the album is open and the user taps the track "Something"
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks` with `{uris: [<Something's uri>]}`

#### Scenario: Open button does not add
- **WHEN** the user taps an album's open button
- **THEN** no add request is sent

#### Scenario: Back from the album
- **WHEN** the album was opened from the results for "beatles" and the user closes its chip
- **THEN** the results for "beatles" are shown again

#### Scenario: Album without id
- **WHEN** the server answers an album without an `id`
- **THEN** that album has no open button and tapping it still adds the whole album

#### Scenario: Album cannot be loaded
- **WHEN** the album tracks request answers `404`
- **THEN** the search shows the "could not load" text with a retry button
