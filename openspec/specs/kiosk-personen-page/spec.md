# kiosk-personen-page Specification

## Purpose

Gives kiosk users a dedicated page showing the live feed of the camera
configured for the live page, with a bounding-box overlay identifying any
currently-detected person by name, so anyone glancing at a kiosk screen can
see who is there right now without opening a separate app.

## Requirements

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

### Requirement: Personen management button below the back button

The `KioskPersonen` page SHALL show a second navigation button, labeled
"Personen", positioned directly below the existing back button and
matching the back button's width. Tapping it SHALL open the person/face
management page.

#### Scenario: Button shown below the back button
- **WHEN** the user views the `KioskPersonen` page
- **THEN** a "Personen" button is shown directly below the back button,
  the same width as the back button

#### Scenario: Opening the management page
- **WHEN** the user taps the "Personen" button
- **THEN** the person/face management page opens

### Requirement: Live Keller camera feed

The Personen page SHALL stream the camera configured for the live page live,
using the same go2rtc live-stream mechanism already used for the existing kiosk
video page, and SHALL obtain both the camera and its stream handle from the
camera registry rather than from a compiled-in camera name or host. The page
SHALL activate kiosk mode on mount, consistent with the other primary kiosk
dashboards.

When more than one camera is configured for the live page, the page SHALL show
the first in the configured order and SHALL let the user switch between them.

#### Scenario: Page shows the live feed
- **WHEN** the Personen page is open
- **THEN** the live video of the camera configured for the live page is playing on
  screen

#### Scenario: Several cameras configured for the live page
- **WHEN** more than one camera is flagged for the live page
- **THEN** the first in the configured order is shown, and the user can switch to
  another one

#### Scenario: No camera configured for the live page
- **WHEN** no camera is flagged for the live page
- **THEN** the page states that no camera is configured and points to the Kameras
  page, instead of showing a broken video element

#### Scenario: The camera registry is unreachable
- **WHEN** the page cannot load the camera configuration
- **THEN** it shows an error state rather than attempting a stream it cannot resolve

### Requirement: Live person overlay on the video

While the Personen page is open, the system SHALL periodically check for
currently-detected persons on the camera being shown and draw one bounding box
per currently-detected person over the corresponding position on the live
video. Each box SHALL be labeled with the detected person's resolved name
when available, the object-detection confidence, and the face-match
confidence when a name was resolved. When the detection carries one or
more zone names, the label SHALL include the zone; when it carries none,
the label SHALL omit the zone entirely rather than showing an empty or
placeholder zone value.

A face-match confidence the detection source does not report SHALL be treated
as unknown and omitted from the label, rather than rendered as a zero
confidence. A detection that carries no position SHALL NOT be drawn: the
system SHALL leave it off the video rather than place it at a guessed
position, and the live video SHALL keep playing.

#### Scenario: Named person detected
- **WHEN** a person is currently detected on the camera being shown and has been
  matched to a known name
- **THEN** a bounding box is drawn at that person's position, labeled with
  their name, the object-detection confidence, and the face-match
  confidence

#### Scenario: Unrecognized person detected
- **WHEN** a person is currently detected on the camera being shown but has not
  been matched to a known name
- **THEN** a bounding box is drawn at that person's position, labeled to
  indicate no name was resolved, showing the object-detection confidence

#### Scenario: No face-match confidence reported
- **WHEN** a currently-detected person's data carries no face-match confidence
- **THEN** the label for that box omits the face-match confidence rather than
  showing it as zero

#### Scenario: Detection without a position
- **WHEN** a currently-detected person's data carries no position
- **THEN** no box is drawn for that detection, and the live video keeps
  playing

#### Scenario: No zone data available
- **WHEN** a currently-detected person's data carries no zone information
- **THEN** the label for that box omits any zone text

#### Scenario: Zone data available
- **WHEN** a currently-detected person's data carries one or more zone
  names
- **THEN** the label for that box includes the zone name(s)

#### Scenario: No one currently detected
- **WHEN** no person is currently detected on the camera being shown
- **THEN** no bounding boxes are drawn over the live video

#### Scenario: Switching camera
- **WHEN** the user switches to another camera configured for the live page
- **THEN** the boxes drawn are those of the newly selected camera, and none from the
  previous one remain on screen

#### Scenario: Detection source unreachable
- **WHEN** the periodic check for currently-detected persons fails (e.g.
  the detection source is unreachable)
- **THEN** the page continues showing the live video without bounding
  boxes, rather than showing an error state or stopping video playback

### Requirement: Events button below the management button

The `KioskPersonen` page SHALL show a third navigation button, labeled
"Events", positioned directly below the "Personen" (management) button
and matching its width. Tapping it SHALL open the events page.

#### Scenario: Button shown below the management button
- **WHEN** the user views the `KioskPersonen` page
- **THEN** an "Events" button is shown directly below the "Personen"
  button, the same width as the other buttons in that column

#### Scenario: Opening the events page
- **WHEN** the user taps the "Events" button
- **THEN** the events page opens
