## MODIFIED Requirements

### Requirement: Personen page reachable from the kiosk overview

The kiosk overview page SHALL show a `KioskLinkPanel` tile, alongside the
existing camera/video tiles, that navigates to the Personen page. The
Personen page SHALL show a back link returning to the kiosk overview,
consistent with the other `Kiosk*` pages. The Personen page SHALL NOT be
reachable only via the kiosk gear-button/settings shortcut.

The back link on the Personen page SHALL always be laid out as a column
spanning the full height of the page's content row, positioned to the
left of the video, at any window or viewport size. The back link SHALL
NOT wrap onto its own row above the video at any size.

#### Scenario: Tile visible on the kiosk overview
- **WHEN** a user views the kiosk overview page
- **THEN** a "Personen" tile is shown alongside the other kiosk link tiles

#### Scenario: Navigating to the Personen page
- **WHEN** the user taps the "Personen" tile
- **THEN** the Personen page opens, showing the Keller live feed

#### Scenario: Returning to the overview
- **WHEN** the user taps the back link on the Personen page
- **THEN** the kiosk overview page opens

#### Scenario: Back link stays a left column while resizing
- **WHEN** the Personen page is open and the window/viewport is resized to
  any width or height
- **THEN** the back link remains a full-height column positioned to the
  left of the video, and never appears as a bar stacked above the video

#### Scenario: Back link on a narrow viewport
- **WHEN** the Personen page is open on a viewport too narrow to show the
  video at its usual size
- **THEN** the video shrinks to make room, but the back link still
  renders as a full-height left column rather than wrapping above it
