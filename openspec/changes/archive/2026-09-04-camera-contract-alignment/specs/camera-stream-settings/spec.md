## ADDED Requirements

### Requirement: Retention falls back to the node's default

A camera that carries no retention of its own SHALL be shown as keeping footage
for the default its node applies, naming the number of days, rather than as an
unknown retention. Where the node reports no default either, the retention SHALL
be shown as unknown.

#### Scenario: No per-camera retention set
- **WHEN** recording is on for a camera that carries no retention of its own and
  its node reports a default retention
- **THEN** the page states that the node's default applies and names the number
  of days, rather than showing the retention as unknown or as zero

#### Scenario: The camera overrides the default
- **WHEN** the user enters a retention for the camera and saves
- **THEN** that value is stored with the camera and replaces the node's default
  for this camera, and the page shows it as the camera's own

#### Scenario: Neither camera nor node states a retention
- **WHEN** the camera carries no retention and its node reports no default
- **THEN** the retention is shown as unknown, and the page does not present a
  number it has not been told

### Requirement: The page refuses what the server refuses

Where the server rejects a value outright, the page SHALL state the problem at
the field before sending, naming the field and what is wrong with it, so a
correctable mistake is not answered by a round trip.

#### Scenario: Recording on without a retention
- **WHEN** recording is switched on and the retention is left empty, zero or
  negative, and the user saves
- **THEN** the page states that a positive retention is required while recording
  is on, keeps the dialog open, and sends nothing

#### Scenario: An unusable stream name
- **WHEN** the user adds a stream whose name is empty or contains anything
  outside lowercase letters, digits and underscores
- **THEN** the stream is not added and the page states which characters a stream
  name may contain

#### Scenario: A stream without an address
- **WHEN** the user adds or keeps a stream that has no URL and saves
- **THEN** the page states that every stream needs an address, and sends nothing

#### Scenario: A refusal that only the server can make
- **WHEN** the server refuses the write for a reason the page does not check
  itself
- **THEN** the reason the server gave is shown and the entered values are kept

## MODIFIED Requirements

### Requirement: Probing a stream

The page SHALL offer a probe control per stream that asks the node what the
stream delivers and fills the measured parameters in.

#### Scenario: A successful probe
- **WHEN** the user probes a stream and the node answers
- **THEN** the stream's resolution, frame rate, bitrate and codecs are shown as
  measured, together with when they were measured

#### Scenario: The measurement time is the node's
- **WHEN** a probe succeeds and the server states when the measurement was taken
- **THEN** that time is what the page shows, rather than the time on the
  operator's own device

#### Scenario: A measurement the camera does not report
- **WHEN** a probe succeeds but the camera reports no bitrate
- **THEN** the bitrate stays unknown and the probe still counts as successful,
  the remaining measured values being shown as measured

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
- **WHEN** continuous recording is chosen and the recording stream's bitrate is
  known
- **THEN** the page states the rough daily storage this costs, so the choice is
  made against a number rather than blind

#### Scenario: Continuous recording on a stream with no known bitrate
- **WHEN** continuous recording is chosen and the recording stream reports no
  bitrate, whether or not it has been probed
- **THEN** the page says the daily storage cannot be estimated, rather than
  showing a figure it cannot support

#### Scenario: The settings come back from the server
- **WHEN** a camera whose recording settings are stored is opened again
- **THEN** the stored values are shown as that camera's settings, and the page
  says the node does not report them only when the server actually sent none
