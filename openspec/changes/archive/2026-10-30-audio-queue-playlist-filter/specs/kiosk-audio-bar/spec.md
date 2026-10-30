## ADDED Requirements

### Requirement: Playlist filter in the queue popup

The playlist section of the queue and playlist popup SHALL have a clearable text field above the
playlist list. While it holds text, the list SHALL show only the playlists whose name contains
that text, ignoring case and leading or trailing whitespace; the filtering SHALL happen on the
client on every keystroke, without a debounce, a minimum length or a server request. An empty
field SHALL show all playlists. The field SHALL be empty every time the popup opens, and it SHALL
NOT take focus by itself when the popup opens. When the filter leaves no playlist, the section
SHALL show a "no matching playlists" text instead of the list. The filter SHALL NOT affect the
queue section.

#### Scenario: Narrow the list
- **WHEN** the popup lists the playlists "Radio", "Abendessen" and "Rock Classics" and the user types "ra" into the filter
- **THEN** only "Radio" is listed

#### Scenario: Case is ignored
- **WHEN** the user types "ROCK"
- **THEN** "Rock Classics" is listed

#### Scenario: Clearing shows all
- **WHEN** the filter holds "ra" and the user taps its clear button
- **THEN** all playlists are listed again

#### Scenario: No match
- **WHEN** the user types "xyz" and no playlist name contains it
- **THEN** the playlist section shows the "no matching playlists" text
- **AND** the queue section still shows the queue

#### Scenario: Reset on reopen
- **WHEN** the user typed "ra", closes the popup and opens it again
- **THEN** the filter is empty and all playlists are listed

#### Scenario: No keyboard on open
- **WHEN** the popup opens
- **THEN** the filter field does not have focus

#### Scenario: Filter survives a reload of the list
- **WHEN** the filter holds "ra" and the playlist list is reloaded after the playlist editor closes
- **THEN** the filter still holds "ra" and applies to the reloaded list
