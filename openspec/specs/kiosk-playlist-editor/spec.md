# kiosk-playlist-editor Specification

## Purpose

Lets people on the kiosk create, rename, delete and rearrange Music Assistant playlists, and fill
them from a library search, in a touch-first full-screen editor that saves every action at once.

## Requirements

### Requirement: Full-screen editor opened from the queue popup

The playlist editor SHALL open as a full-screen popup at every screen width, with a close button
in its header, from the audio bar's queue popup and from the kiosk audio page. It SHALL open on
the playlist list. Closing it SHALL return to the place it was opened from: the queue popup or
the kiosk audio page.

#### Scenario: Open the editor
- **WHEN** the user taps the edit-playlists button in the queue popup
- **THEN** a full-screen popup opens showing the playlist list

#### Scenario: Close the editor
- **WHEN** the user taps the close button in the editor header
- **THEN** the editor closes and the queue popup is visible again

#### Scenario: Open and close from the audio page
- **WHEN** the user opens the editor from the kiosk audio page and then closes it
- **THEN** the kiosk audio page is visible again, unchanged

### Requirement: Playlist list with filter and read-only toggle

The editor SHALL list the playlists from `GET /audio/playlists` sorted by name, case-insensitive,
each with its name, its track count and a cover when one is available. By default only playlists
with `editable: true` SHALL be listed; a toggle SHALL also show the read-only ones, which carry a
lock mark. A text filter SHALL narrow the list to playlists whose name contains the text,
case-insensitive. Tapping a playlist SHALL open it.

#### Scenario: Default list hides read-only playlists
- **WHEN** the server answers three editable and 1400 read-only playlists
- **THEN** the list shows the three editable ones only

#### Scenario: Show read-only playlists
- **WHEN** the user turns on the read-only toggle
- **THEN** the read-only playlists are listed too, each with a lock mark

#### Scenario: Filter by name
- **WHEN** the user types `abend` into the filter
- **THEN** only playlists whose name contains "abend" in any case are listed

#### Scenario: List cannot be loaded
- **WHEN** `GET /audio/playlists` fails
- **THEN** the list shows a "could not load" text with a retry button

### Requirement: Create, rename and delete playlists

The playlist list SHALL offer creating a playlist: a name prompt that rejects an empty or
whitespace-only name, then `POST /audio/playlists` `{name}`; on success the new playlist SHALL
open. An open editable playlist SHALL offer renaming (a name prompt prefilled with the current
name, then `PATCH /audio/playlists/{id}` `{name}`) and deleting (a confirmation naming the
playlist, then `DELETE /audio/playlists/{id}`). After a successful delete the editor SHALL return
to the playlist list. Names SHALL be sent trimmed.

#### Scenario: Create a playlist
- **WHEN** the user creates a playlist named " Sonntag "
- **THEN** the GUI sends `POST /audio/playlists` with `{name: "Sonntag"}` and opens the playlist from the answer

#### Scenario: Empty name
- **WHEN** the user confirms the name prompt with only spaces
- **THEN** nothing is sent and the prompt stays open with a hint

#### Scenario: Rename
- **WHEN** the user renames the open playlist "Party" to "Party 2026"
- **THEN** the GUI sends `PATCH /audio/playlists/{id}` with `{name: "Party 2026"}` and the header shows the new name after the reload

#### Scenario: Delete needs confirmation
- **WHEN** the user taps delete and then cancels the confirmation
- **THEN** nothing is sent

#### Scenario: Delete confirmed
- **WHEN** the user confirms deleting "Party"
- **THEN** the GUI sends `DELETE /audio/playlists/{id}` and shows the playlist list without "Party"

### Requirement: Track list of an open playlist

An open playlist SHALL show its tracks from `GET /audio/playlists/{id}/tracks` in server order,
each with cover, title and artist, and the playlist's name in the header with a way back to the
list. An empty playlist SHALL show a short "no tracks" text.

#### Scenario: Open a playlist
- **WHEN** the user opens a playlist with 20 tracks
- **THEN** the 20 tracks are shown in the order the server answers

#### Scenario: Unknown playlist
- **WHEN** the tracks request answers `404`
- **THEN** the editor shows a snackbar and returns to a reloaded playlist list

### Requirement: Remove and reorder tracks

In an editable playlist each track SHALL have a remove button and a drag handle. Remove SHALL send
`DELETE /audio/playlists/{id}/tracks` with `{positions: [index]}` (0-based). Dropping a track
dragged from index `from` to index `to` (`from ≠ to`) SHALL send
`POST /audio/playlists/{id}/tracks/move` with `{from, to}`. Dragging SHALL work with touch and
mouse and SHALL start only from the drag handle, so scrolling the list by swiping still works.

#### Scenario: Remove a track
- **WHEN** the user taps remove on the third track
- **THEN** the GUI sends `DELETE /audio/playlists/{id}/tracks` with `{positions: [2]}`

#### Scenario: Move a track up
- **WHEN** the user drags the fifth track by its handle to the top
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks/move` with `{from: 4, to: 0}`

#### Scenario: Drop at the same place
- **WHEN** the user drops a track where it was picked up
- **THEN** nothing is sent

### Requirement: Search the library and add results

An editable playlist SHALL offer a search field that queries `GET /audio/search` with the
trimmed text and `types=track,album,artist`, at the earliest 400 ms after the last keystroke and
only for at least 2 characters. Results SHALL be shown grouped as tracks, albums and artists.
Tapping a track or an album SHALL append it (`POST /audio/playlists/{id}/tracks` with
`{uris: [uri]}`, no position). Tapping an artist SHALL replace the results with a track search
for that artist's name. A track that is already in the playlist SHALL be marked and SHALL NOT be
addable, because the server cannot hold a track twice in a playlist. Only the latest search's
answer SHALL be shown.

#### Scenario: Add a track from the search
- **WHEN** the user searches "yesterday" and taps the track "Yesterday"
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks` with `{uris: [<that track's uri>]}` and the track appears at the end of the list after the reload

#### Scenario: Add a whole album
- **WHEN** the user taps an album in the results
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks` with `{uris: [<the album's uri>]}`

#### Scenario: Drill into an artist
- **WHEN** the user taps the artist "The Beatles" in the results
- **THEN** the GUI searches `q=The Beatles&types=track` and shows those tracks

#### Scenario: Track already in the playlist
- **WHEN** a search result track has the same URI as a track in the playlist
- **THEN** it is shown as already added and tapping it sends nothing

#### Scenario: Add without effect
- **WHEN** an add answers `204` but the reloaded playlist has as many tracks as before
- **THEN** a snackbar says the track was not added because it is already in the playlist

#### Scenario: Short query
- **WHEN** the search field holds one character
- **THEN** no search request is sent

#### Scenario: Out-of-order answers
- **WHEN** the answer for "bea" arrives after the answer for "beatles"
- **THEN** the results for "beatles" stay on screen

### Requirement: Every action is saved at once, one at a time

There SHALL be no save button. Each edit SHALL be sent as soon as the user performs it. While an
edit is in flight the editor SHALL show a busy indicator and SHALL NOT accept another edit on the
same playlist. After every edit, successful or not, the editor SHALL reload the affected list from
the server and show that answer. A failed edit SHALL show a snackbar with the server's reason
when one is given.

#### Scenario: Reorder takes a while
- **WHEN** a move is in flight for two seconds
- **THEN** the track list shows the busy indicator and its remove buttons and drag handles do not react

#### Scenario: Edit fails
- **WHEN** a remove answers `502` with a reason
- **THEN** a snackbar shows the reason and the track list is reloaded from the server

#### Scenario: Edit succeeds
- **WHEN** a move answers `204`
- **THEN** the track list is reloaded and shows the server's new order

### Requirement: Read-only playlists

A playlist with `editable: false` SHALL open with its tracks shown but without rename, delete,
remove, drag handles or search, and with a "read-only" mark in the header.

#### Scenario: Open a read-only playlist
- **WHEN** the user opens a playlist the server reports as `editable: false`
- **THEN** its tracks are listed and no edit control is shown

#### Scenario: Server rejects an edit as read-only
- **WHEN** an edit answers `409`
- **THEN** a snackbar names the playlist as read-only and the editor reloads the playlist list, so the playlist's flag is current

### Requirement: Usable on tablet, mobile and PC widths

The editor SHALL work at 390, 800 and 1280 px width without horizontal scrolling. Every tappable
control (playlist row, track row buttons, drag handle, search result, action bar button) SHALL be
at least 44 px high. At widths of 960 px and more the open playlist's tracks and the search
results SHALL be side by side; below that the search SHALL be a separate view reached from an
"add tracks" button in the action bar above the track list and left with a back button.

#### Scenario: Wide layout
- **WHEN** a playlist is open at 1280 px width
- **THEN** the track list and the search are visible next to each other

#### Scenario: Narrow layout
- **WHEN** a playlist is open at 390 px width and the user taps "add tracks" in the action bar above the track list
- **THEN** the search fills the popup and a back button returns to the track list

#### Scenario: Touch target size
- **WHEN** the editor is shown at any of the three widths
- **THEN** each playlist row, remove button, drag handle, search result and action bar button measures at least 44 px high

### Requirement: Actions above the track list

An open playlist SHALL show its actions in a bar between the header and the track list: play and
the shuffle toggle for every playlist; for editable playlists also rename, delete and, below
960 px width, "add tracks". The bar SHALL stay visible while the track list scrolls. No playlist
action SHALL be placed only below the track list. A read-only playlist SHALL show only play and
the shuffle toggle.

#### Scenario: Long playlist
- **WHEN** the open playlist has more tracks than fit on screen and the user scrolls to the middle of the list
- **THEN** the action bar is still visible above the list without scrolling back up

#### Scenario: Read-only playlist
- **WHEN** the user opens a playlist the server reports as `editable: false`
- **THEN** the action bar shows play and the shuffle toggle and no edit action

### Requirement: Play the open playlist with optional shuffle

The action bar SHALL have a play button and a shuffle toggle. The shuffle toggle SHALL be off on a
device that never changed it, SHALL be remembered on the device across reloads, SHALL NOT be shared
with other devices, and SHALL be the same choice as the shuffle toggle in the queue popup. Play
SHALL send `POST /audio/targets/{targetId}/playMedia` with `{uri: <the playlist's uri>, shuffle:
<the toggle>}` for the device's audio target, which is the target the audio bar would control on
this device (the remembered target, else the main group). When no target is known (audio state
not loaded) play SHALL be disabled. Toggling shuffle SHALL NOT change the playlist's stored order
and SHALL NOT send anything by itself. A failed play SHALL show a snackbar. The editor SHALL stay
open after play.

#### Scenario: Play in order
- **WHEN** shuffle is off and the user taps play on the open playlist "Abendessen"
- **THEN** the GUI sends `playMedia` for the device's target with `{uri: <Abendessen's uri>, shuffle: false}`

#### Scenario: Play shuffled
- **WHEN** the user turns shuffle on and taps play
- **THEN** the GUI sends `playMedia` with `shuffle: true` and the track list still shows the stored order

#### Scenario: Choice survives a reload
- **WHEN** the user turned shuffle on and reloads the page
- **THEN** the toggle is on in the editor and in the queue popup

#### Scenario: Storage blocked
- **WHEN** reading or writing browser storage throws
- **THEN** the toggle starts off and still works for the current page session

#### Scenario: No target yet
- **WHEN** the audio state has not been loaded
- **THEN** the play button is disabled

### Requirement: Live updates from the server

While the editor is open, a server event `audio-playlist-changed` with `{playlistId}` SHALL reload
the playlist list, and, when `playlistId` is the open playlist, also its tracks, so changes made
elsewhere (Music Assistant UI, another device) appear without user action. An event with a missing
or unknown `playlistId` SHALL reload the list and the open playlist's tracks. After the SSE
connection reconnects while the editor is open, it SHALL reload the same way, because events may
have been missed. While a drag or an edit is in progress a reload caused this way SHALL be held
back and run once when the drag or edit is over; several events in that time SHALL cause one
reload. If the open playlist no longer exists after such a reload, the editor SHALL show a
snackbar and return to the playlist list. Without such events the editor SHALL work as before.

#### Scenario: Song added elsewhere
- **WHEN** the editor shows playlist 7 and the server sends `audio-playlist-changed` `{playlistId: 7}`
- **THEN** the editor reloads the tracks of playlist 7 and shows the new song without user action

#### Scenario: Other playlist changed
- **WHEN** the editor shows playlist 7 and the server sends `audio-playlist-changed` `{playlistId: 9}`
- **THEN** the playlist list is reloaded and the tracks of playlist 7 are not

#### Scenario: Event during a drag
- **WHEN** the user is dragging a track and two `audio-playlist-changed` events for the open playlist arrive
- **THEN** the list does not change under the finger, and after the drop and its edit the tracks are reloaded once

#### Scenario: Open playlist deleted elsewhere
- **WHEN** the open playlist is deleted on another device and the event arrives
- **THEN** the editor shows a snackbar and the reloaded playlist list without that playlist

### Requirement: Controlled auto-scroll while dragging

While a track is dragged and the pointer is within an edge zone at the top or bottom of the
visible track list, the list SHALL scroll in that direction. The edge zone SHALL be 15 % of the
visible list height, at least 48 px and at most 120 px. The scroll speed SHALL grow with how deep
the pointer is in the zone, from slow at the zone's inner border to a capped maximum at the list
edge, so that a list of 300 tracks can be crossed in under ten seconds. Scrolling SHALL stop at
once, without gliding, when the pointer leaves the zone, the drag ends, or the list reaches its
start or end. The speed SHALL NOT depend on the display's frame rate. This SHALL work with touch
and mouse, and the drop target SHALL follow the scrolled list.

#### Scenario: Fine positioning near the edge
- **WHEN** the user drags a track just into the bottom edge zone
- **THEN** the list scrolls slowly enough to place the track between two specific neighbouring tracks

#### Scenario: Crossing a long list
- **WHEN** the user holds a dragged track at the very bottom of the list in a playlist of 300 tracks
- **THEN** the list reaches its end in under ten seconds

#### Scenario: No overshoot
- **WHEN** the list is auto-scrolling and the user moves the pointer out of the edge zone
- **THEN** the list stops scrolling at once and does not continue to glide

#### Scenario: Same speed on a 120 Hz display
- **WHEN** the same drag is done on a 60 Hz and on a 120 Hz display
- **THEN** the list scrolls the same distance per second on both

### Requirement: Preview search tracks

Every track in the library search results SHALL have a play/stop button for the device's audio
target, the same target that the editor's play button uses. The track that target is currently
on SHALL be marked: its `playback.track.uri` equals the result's URI, whether the target plays or
is paused. The button of the marked track SHALL show stop while the target plays, and play
otherwise. Every other result SHALL show play.

- Play on a track that is not the target's current track SHALL send
  `POST /audio/targets/{targetId}/playMedia` with `{uri: <the track's uri>}` and no `shuffle`.
  This replaces the target's queue with that one track, so nothing plays after it.
- Play on the marked, paused track SHALL resume it (`audioTargetCommand` `play`).
- Stop SHALL pause the target (`audioTargetCommand` `pause`).

While a track is marked and the target reports a duration, its row SHALL show a position slider
that behaves like the audio bar's seek slider: the position is interpolated locally, dragging
does not move it back, and releasing seeks the target (`audioTargetSeek`). Tapping the button or
the slider SHALL NOT add the track; tapping the rest of the row SHALL still add it as before.
When no target is known (audio state not loaded), the preview buttons SHALL be disabled. A failed
preview command SHALL show a snackbar.

#### Scenario: Preview a track
- **WHEN** the user taps play on the search result "Yesterday" and the device's target is the main group
- **THEN** the GUI sends `playMedia` for the main group with `{uri: <Yesterday's uri>}` and no `shuffle`, and the playlist is not changed

#### Scenario: Previewed track is marked
- **WHEN** the target's state reports `track.uri` equal to the result "Yesterday" and `state: playing`
- **THEN** that row is marked, its button shows stop, and it shows a position slider

#### Scenario: Stop a preview
- **WHEN** the user taps stop on the marked row
- **THEN** the GUI sends `pause` for the target

#### Scenario: Resume a paused preview
- **WHEN** the marked track is paused and the user taps its play button
- **THEN** the GUI sends `play` for the target, not `playMedia`

#### Scenario: Seek in a preview
- **WHEN** the user drags the marked row's slider to 1:30 and releases it
- **THEN** the GUI sends `audioTargetSeek` with `position: 90` and the slider stays at 1:30 until the state reports the new position

#### Scenario: Buttons do not add
- **WHEN** the user taps a result's play button or its slider
- **THEN** no add request is sent

#### Scenario: Nothing follows a preview
- **WHEN** the previewed track ends
- **THEN** the target stops, because its queue held only that track

#### Scenario: No target yet
- **WHEN** the audio state has not been loaded
- **THEN** the preview buttons are disabled and tapping the row still adds the track
