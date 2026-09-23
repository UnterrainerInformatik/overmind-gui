# camera-recording-jobs Specification

## Purpose
Lets a kiosk user make one camera record continuously until a chosen moment,
decide where that footage is kept, see which cameras are recording this way and
for how long, and stop such a job early.

## Requirements

### Requirement: A recording job is started from a camera's entry

The Kameras page SHALL offer, on each camera's entry, a control that opens the
camera's recording job without leaving the page. For a camera with no running
job it SHALL offer a form with:
- an end moment, entered as a local date and time, or chosen with a quick
  duration of 1 hour, 1 day or 1 week from now;
- a storage choice between "am Standort" (local) and "zentral" (central),
  with local preselected.

The form SHALL NOT offer a choice of stream.

The job SHALL be started only after the user confirms the form. The page SHALL
refuse to send an end moment that is not in the future, and SHALL say why.

#### Scenario: Starting a job with a quick duration
- **WHEN** the user opens the recording job of a camera with no running job,
  picks "1 day", keeps "am Standort" and starts it
- **THEN** a job ending 24 hours from now with local storage is started for that
  camera, and the camera is shown as recording under a job

#### Scenario: Starting a job with an explicit end
- **WHEN** the user enters 2026-10-02 14:05 local time and chooses "zentral"
- **THEN** a job ending at that local moment with central storage is started

#### Scenario: An end in the past
- **WHEN** the entered end moment is not later than now
- **THEN** the start control is unavailable and the form states that the end
  must lie in the future, and nothing is sent

#### Scenario: Closing without starting
- **WHEN** the user closes the form without starting
- **THEN** nothing is sent and the camera's recording is unchanged

### Requirement: The storage choice states what it costs

The form SHALL estimate the footage volume of the job from now until the chosen
end moment. It SHALL use the bitrate of the camera's recording stream where that
is known. Otherwise it SHALL use about 30 GB per camera-day, and it SHALL say
that the figure is a rule of thumb.

It SHALL describe the two choices in terms of their consequences:
- **Local:** the footage stays on the node, is lost if the node is lost, and is
  kept there at least until the job ends.
- **Central:** the footage is also copied into the central archive while the job
  runs, and the estimated volume travels over the site's uplink, for each
  camera. The footage also stays on the node under its retention.

The page SHALL NOT claim that the central choice frees space on the node.

#### Scenario: Estimate from a known bitrate
- **WHEN** the camera's recording stream reports 4096 kbit/s and the chosen
  duration is 1 day
- **THEN** the form shows about 42 GB for the job

#### Scenario: Estimate without a known bitrate
- **WHEN** the camera's recording stream reports no bitrate and the chosen
  duration is 1 week
- **THEN** the form shows about 210 GB and marks it as a rule-of-thumb figure

#### Scenario: Choosing central
- **WHEN** the user selects "zentral"
- **THEN** the form states that the estimated volume goes over the site's
  uplink, and that the footage also remains on the node

### Requirement: Running jobs and their time remaining are visible

A camera with a running job SHALL be marked as such in its entry on the Kameras
page, with the time remaining. The Kameras page SHALL also list every running
job across all cameras, each with its camera, its end moment in local time, its
time remaining and its storage choice. When no job is running, that list SHALL
NOT be shown.

The time remaining SHALL count down while the page is open, in minutes under an
hour, in hours under two days, and in days otherwise. When a job's end moment
passes, the page SHALL re-read that camera's jobs rather than keep showing the
job as running.

A camera whose jobs cannot be read SHALL still be listed. Its job state SHALL be
shown as unknown, not as "no job".

#### Scenario: A running job in the list
- **WHEN** camera "Einfahrt" has a central job ending in 5 hours
- **THEN** its entry shows it recording with about 5 hours left, and the list of
  running jobs names "Einfahrt", the end moment, about 5 hours and "zentral"

#### Scenario: A job reaches its end
- **WHEN** a running job's end moment passes while the page is open
- **THEN** the page re-reads that camera's jobs, and the camera is no longer
  shown as recording once the server reports the job ended

#### Scenario: Jobs cannot be read for one camera
- **WHEN** reading the jobs of one camera fails
- **THEN** the other cameras' jobs are shown as usual, and that camera's job
  state is shown as unknown

### Requirement: A running job can be ended early

The recording job of a camera with a running job SHALL show that job: its end
moment, time remaining and storage choice. It SHALL offer to end the job now.
Ending SHALL require a confirmation that says the camera returns to its previous
recording settings. A second job SHALL NOT be offered for that camera while
one is running.

#### Scenario: Ending a job early
- **WHEN** the user ends a running job and confirms
- **THEN** the job is ended, and the camera is no longer shown as recording
  under a job

#### Scenario: Cancelling the confirmation
- **WHEN** the user dismisses the confirmation
- **THEN** nothing is sent and the job keeps running

### Requirement: The server's refusals are shown as it words them

When the server refuses to start or end a job, the page SHALL show the reason
the server gives, verbatim. It SHALL keep the form's entered values after a
refused start. It SHALL then re-read the camera's jobs, so that a job started
elsewhere appears. Without a reason, the page SHALL show a general failure
message instead.

#### Scenario: The camera already has a job
- **WHEN** a start is refused because the camera already has a running job
- **THEN** the page shows the server's reason and then shows that running job

#### Scenario: A disabled camera
- **WHEN** a start is refused because the camera or its node is disabled
- **THEN** the page shows the server's reason and keeps the form as entered
