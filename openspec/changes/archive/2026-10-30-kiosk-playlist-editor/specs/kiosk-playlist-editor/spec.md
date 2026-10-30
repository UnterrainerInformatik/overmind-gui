## Purpose

Lets people on the kiosk create, rename, delete and rearrange Music Assistant playlists, and fill
them from a library search, in a touch-first full-screen editor that saves every action at once.

## ADDED Requirements

### Requirement: Full-screen editor opened from the queue popup

The playlist editor SHALL open as a full-screen popup from the audio bar's queue popup at every
screen width, with a close button in its header. It SHALL open on the playlist list. Closing it
SHALL return to the queue popup.

#### Scenario: Open the editor
- **WHEN** the user taps the edit-playlists button in the queue popup
- **THEN** a full-screen popup opens showing the playlist list

#### Scenario: Close the editor
- **WHEN** the user taps the close button in the editor header
- **THEN** the editor closes and the queue popup is visible again

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
control (playlist row, track row buttons, drag handle, search result) SHALL be at least 44 px
high. At widths of 960 px and more the open playlist's tracks and the search results SHALL be
side by side; below that the search SHALL be a separate view reached from a button and left with
a back button.

#### Scenario: Wide layout
- **WHEN** a playlist is open at 1280 px width
- **THEN** the track list and the search are visible next to each other

#### Scenario: Narrow layout
- **WHEN** a playlist is open at 390 px width and the user taps "add tracks"
- **THEN** the search fills the popup and a back button returns to the track list

#### Scenario: Touch target size
- **WHEN** the editor is shown at any of the three widths
- **THEN** each playlist row, remove button, drag handle and search result measures at least 44 px high
