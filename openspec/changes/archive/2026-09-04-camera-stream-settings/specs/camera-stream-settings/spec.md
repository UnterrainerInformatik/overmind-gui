## Purpose

Lets the installation decide, per camera, which of its streams is watched, which
is fed to detection and which is recorded, see what each stream actually
delivers, and set the recording and detection parameters — so a camera can be
tuned on the page instead of through hand-written URLs.

## ADDED Requirements

### Requirement: A camera has named streams

A camera SHALL carry one or more named streams, each with a name, a URL and, once
known, its measured parameters: picture width and height, frame rate, bitrate,
video codec and audio codec. The stream a camera cannot exist without SHALL be
`main`; further streams — typically a `sub` stream — are optional.

#### Scenario: Streams are shown
- **WHEN** the user opens a camera's stream settings
- **THEN** every stream of that camera is listed with its name, its URL and its
  known parameters

#### Scenario: Parameters not measured yet
- **WHEN** a stream has never been probed
- **THEN** its parameters are shown as unknown, and the page offers to probe it,
  rather than showing zeros or blanks that read as measurements

#### Scenario: Adding a stream
- **WHEN** the user adds a stream, gives it a name and a URL, and confirms
- **THEN** the stream is stored with the camera and becomes assignable to a
  purpose

#### Scenario: Removing a stream that is in use
- **WHEN** the user removes a stream that a purpose is assigned to
- **THEN** the page states which purposes use it and requires them to be
  reassigned first, and the stream is kept

#### Scenario: The main stream cannot be removed
- **WHEN** the user attempts to remove the `main` stream
- **THEN** the removal is refused with the reason that every camera needs one

### Requirement: Each purpose is assigned to a stream

Live viewing, detection and recording SHALL each be assigned to exactly one of
the camera's streams, and the page SHALL show the current assignment.

#### Scenario: Changing an assignment
- **WHEN** the user assigns a different stream to a purpose and saves
- **THEN** the assignment is stored and the camera's entry reflects it

#### Scenario: Several purposes on one stream
- **WHEN** two or more purposes are assigned to the same stream
- **THEN** this is accepted, since a camera with a single stream must still serve
  all three

#### Scenario: Detection on a high-resolution stream
- **WHEN** the stream assigned to detection is known to deliver more than
  1280 pixels wide or more than 10 frames per second
- **THEN** the page warns that this loads the node unnecessarily and names the
  lower-resolution stream if the camera has one, without preventing the choice

#### Scenario: A camera entered before streams existed
- **WHEN** a camera stored with a source, live and detect URL is opened
- **THEN** its URLs appear as named streams and the purposes are assigned
  accordingly — record and live on the source stream, detection on the detect or
  live stream where one was set — so nothing about the camera's behaviour
  changes

### Requirement: Probing a stream

The page SHALL offer a probe control per stream that asks the node what the
stream delivers and fills the measured parameters in.

#### Scenario: A successful probe
- **WHEN** the user probes a stream and the node answers
- **THEN** the stream's resolution, frame rate, bitrate and codecs are shown as
  measured, together with when they were measured

#### Scenario: A failed probe
- **WHEN** the probe fails
- **THEN** the page shows the reason the server gave and leaves the previously
  known parameters in place

#### Scenario: A probe in progress
- **WHEN** a probe is running
- **THEN** that stream's probe control shows it is busy and the rest of the page
  stays usable

#### Scenario: Nothing is probed on its own
- **WHEN** the stream settings are opened
- **THEN** the stored parameters are shown without probing, so opening the
  settings never waits on an unreachable camera

### Requirement: Stream parameters are editable only where the node allows it

The page SHALL let the user change a stream parameter only when the server
reports that parameter as settable for that stream, and SHALL otherwise show it
read-only.

#### Scenario: A settable parameter
- **WHEN** the server reports a stream's frame rate as settable
- **THEN** the page offers it as an input and sends the new value on save

#### Scenario: A parameter the camera dictates
- **WHEN** the server reports a parameter as not settable
- **THEN** the page shows the measured value read-only and states that it comes
  from the camera

#### Scenario: The server refuses a value
- **WHEN** the server rejects a parameter — out of range, or not supported by the
  camera
- **THEN** the page shows the reason and keeps the entered values so they can be
  corrected

### Requirement: Recording settings per camera

The page SHALL let the user switch recording on or off for a camera, choose
whether it records continuously or only around events, and set how many days the
footage is kept.

#### Scenario: Setting the retention
- **WHEN** the user sets the retention in days and saves
- **THEN** the value is stored with the camera and shown on its entry

#### Scenario: Recording switched off
- **WHEN** recording is off
- **THEN** the retention and the recording mode are shown as not applicable
  rather than as active settings

#### Scenario: Shortening the retention
- **WHEN** the user lowers the retention below its current value
- **THEN** the page states that footage older than the new value will be
  discarded and requires confirmation

#### Scenario: Continuous recording on a large stream
- **WHEN** continuous recording is chosen
- **THEN** the page states the rough daily storage this costs, so the choice is
  made against a number rather than blind

### Requirement: Detection settings per camera

The page SHALL let the user set the resolution and frame rate detection runs at,
whether audio is included, and the motion sensitivity.

#### Scenario: Setting detection resolution and rate
- **WHEN** the user changes the detect resolution or frame rate and saves
- **THEN** the values are stored with the camera

#### Scenario: Detect resolution above the stream
- **WHEN** the entered detect resolution is higher than the assigned stream
  delivers
- **THEN** the page marks it as not achievable and names the stream's resolution

#### Scenario: Audio on a stream without audio
- **WHEN** audio detection is switched on for a stream whose probe found no audio
  track
- **THEN** the page states that the stream carries no audio, without preventing
  the setting

### Requirement: Stream settings are reachable per camera

The stream settings SHALL be reachable from a camera's entry on the Kameras page
without leaving that page.

#### Scenario: Opening the settings
- **WHEN** the user selects the stream settings control on a camera's entry
- **THEN** that camera's streams, assignments, recording and detection settings
  are shown

#### Scenario: Discarding changes
- **WHEN** the user closes the stream settings without saving
- **THEN** nothing is sent to the server and the stored settings remain

#### Scenario: The server is not reached
- **WHEN** saving the stream settings fails
- **THEN** the page shows the reason and keeps the entered values, rather than
  closing as though it had saved
