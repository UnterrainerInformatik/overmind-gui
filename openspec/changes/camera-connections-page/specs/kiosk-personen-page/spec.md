## MODIFIED Requirements

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
