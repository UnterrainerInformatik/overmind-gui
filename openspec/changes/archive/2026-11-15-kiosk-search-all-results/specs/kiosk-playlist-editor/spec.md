## MODIFIED Requirements

### Requirement: Search the library and add results

An editable playlist SHALL offer a search field that queries `GET /audio/search` with the
trimmed text, `types=track,album,artist` and `limit=500`, at the earliest 400 ms after the last
keystroke and only for at least 2 characters. The GUI SHALL NOT drop hits from the answer beyond
those without a `uri`. Results SHALL be shown grouped in the order albums, artists, tracks.

The albums group and the artists group SHALL each show their first 5 hits. When a group has more
than 5 hits, a row below them SHALL offer to show all of them and SHALL name the total count;
tapping it SHALL show every hit of that group and remove the row. A new search, an artist
drill-in and leaving an album or artist SHALL show the groups collapsed again.

The tracks group SHALL show its first 50 hits. When the end of the shown tracks scrolls into
view and more hits are left, the next 50 SHALL be added below, until all hits are shown. A new
answer SHALL start again at the first 50.

Tapping a track or an album SHALL append it (`POST /audio/playlists/{id}/tracks` with
`{uris: [uri]}`, no position). Tapping an artist SHALL replace the results with a track search
(`types=track`, `limit=500`) for that artist's name, shown with the same track paging. A track
that is already in the playlist SHALL be marked and SHALL NOT be addable, because the server
cannot hold a track twice in a playlist. Only the latest search's answer SHALL be shown.

#### Scenario: Add a track from the search
- **WHEN** the user searches "yesterday" and taps the track "Yesterday"
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks` with `{uris: [<that track's uri>]}` and the track appears at the end of the list after the reload

#### Scenario: Add a whole album
- **WHEN** the user taps an album in the results
- **THEN** the GUI sends `POST /audio/playlists/{id}/tracks` with `{uris: [<the album's uri>]}`

#### Scenario: Drill into an artist
- **WHEN** the user taps the artist "The Beatles" in the results
- **THEN** the GUI searches `q=The Beatles&types=track&limit=500` and shows those tracks

#### Scenario: Group order
- **WHEN** a search answers with tracks, albums and artists
- **THEN** the albums are shown first, then the artists, then the tracks

#### Scenario: Search asks for up to 500 hits
- **WHEN** the user searches "love"
- **THEN** the request carries `q=love&types=track,album,artist&limit=500`

#### Scenario: Long album group collapsed
- **WHEN** a search answers with 40 albums
- **THEN** the first 5 albums are shown, followed by a row offering to show all 40 albums, and then the artists group

#### Scenario: Show all albums
- **WHEN** the user taps the row offering to show all 40 albums
- **THEN** all 40 albums are shown and the row is gone

#### Scenario: Short group not collapsed
- **WHEN** a search answers with 3 artists
- **THEN** the 3 artists are shown and no show-all row is shown for them

#### Scenario: Groups collapse again on a new search
- **WHEN** the user has expanded the albums group and then types another query
- **THEN** the new answer shows at most 5 albums and the show-all row when there are more

#### Scenario: All tracks reachable
- **WHEN** a search answers with 300 tracks, sorted by name, and the user scrolls down the results
- **THEN** 50 tracks are shown at first, and each time the end of the list comes into view 50 more are added, until the 300th track is shown

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
