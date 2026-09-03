## MODIFIED Requirements

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
