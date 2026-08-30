## Purpose

Gives kiosk users a dedicated page showing the live Keller camera feed with
a bounding-box overlay identifying any currently-detected person by name,
so anyone glancing at a kiosk screen can see who is in the basement right
now without opening a separate app.

## ADDED Requirements

### Requirement: Personen page reachable from the kiosk overview

The kiosk overview page SHALL show a `KioskLinkPanel` tile, alongside the
existing camera/video tiles, that navigates to the Personen page. The
Personen page SHALL show a back link returning to the kiosk overview,
consistent with the other `Kiosk*` pages. The Personen page SHALL NOT be
reachable only via the kiosk gear-button/settings shortcut.

#### Scenario: Tile visible on the kiosk overview
- **WHEN** a user views the kiosk overview page
- **THEN** a "Personen" tile is shown alongside the other kiosk link tiles

#### Scenario: Navigating to the Personen page
- **WHEN** the user taps the "Personen" tile
- **THEN** the Personen page opens, showing the Keller live feed

#### Scenario: Returning to the overview
- **WHEN** the user taps the back link on the Personen page
- **THEN** the kiosk overview page opens

### Requirement: Live Keller camera feed

The Personen page SHALL stream the Keller camera live, using the same
go2rtc live-stream mechanism already used for the existing kiosk video
page. The page SHALL activate kiosk mode on mount, consistent with the
other primary kiosk dashboards.

#### Scenario: Page shows the live feed
- **WHEN** the Personen page is open
- **THEN** the Keller camera's live video is playing on screen

### Requirement: Live person overlay on the video

While the Personen page is open, the system SHALL periodically check for
currently-detected persons on the Keller camera and draw one bounding box
per currently-detected person over the corresponding position on the live
video. Each box SHALL be labeled with the detected person's resolved name
when available, the object-detection confidence, and the face-match
confidence when a name was resolved. When the detection carries one or
more zone names, the label SHALL include the zone; when it carries none,
the label SHALL omit the zone entirely rather than showing an empty or
placeholder zone value.

#### Scenario: Named person detected
- **WHEN** a person is currently detected on the Keller camera and has been
  matched to a known name
- **THEN** a bounding box is drawn at that person's position, labeled with
  their name, the object-detection confidence, and the face-match
  confidence

#### Scenario: Unrecognized person detected
- **WHEN** a person is currently detected on the Keller camera but has not
  been matched to a known name
- **THEN** a bounding box is drawn at that person's position, labeled to
  indicate no name was resolved, showing the object-detection confidence

#### Scenario: No zone data available
- **WHEN** a currently-detected person's data carries no zone information
- **THEN** the label for that box omits any zone text

#### Scenario: Zone data available
- **WHEN** a currently-detected person's data carries one or more zone
  names
- **THEN** the label for that box includes the zone name(s)

#### Scenario: No one currently detected
- **WHEN** no person is currently detected on the Keller camera
- **THEN** no bounding boxes are drawn over the live video

#### Scenario: Detection source unreachable
- **WHEN** the periodic check for currently-detected persons fails (e.g.
  the detection source is unreachable)
- **THEN** the page continues showing the live video without bounding
  boxes, rather than showing an error state or stopping video playback
