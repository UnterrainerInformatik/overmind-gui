## ADDED Requirements

### Requirement: Way to the playlist editor

The kiosk audio page SHALL show a "Playlists" button in its top bar, next to the back control,
that opens the full-screen playlist editor (capability `kiosk-playlist-editor`) on top of the page,
independent of where the user navigated inside Music Assistant. Closing the editor SHALL leave the
audio page and the embedded Music Assistant UI as they were.

#### Scenario: Open the playlist editor from the audio page
- **WHEN** the user taps the "Playlists" button on the kiosk audio page
- **THEN** the full-screen playlist editor opens on the playlist list

#### Scenario: Back to Music Assistant
- **WHEN** the user navigated to an album inside Music Assistant, opens the playlist editor and closes it again
- **THEN** the embedded Music Assistant UI still shows that album
