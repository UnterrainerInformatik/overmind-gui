## MODIFIED Requirements

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

## ADDED Requirements

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
