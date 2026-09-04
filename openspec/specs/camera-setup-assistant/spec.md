# camera-setup-assistant Specification

## Purpose

Turns adding a camera into a guided sequence that verifies the node, the
connection and the streams before anything is stored, so a camera is either
entered correctly or the reason it cannot be is on screen — instead of a long
form whose result only shows up afterwards as a failed provisioning state.

## Requirements

### Requirement: Adding a camera runs as a guided sequence

Adding a camera SHALL run as a sequence of steps — the node, the camera's address
and connection, its streams and their assignment, and finally its name and
usage — with the current step, the completed steps and the remaining steps
visible throughout.

#### Scenario: Starting the assistant
- **WHEN** the user selects the control for adding a camera
- **THEN** the assistant opens at its first step, showing which steps follow

#### Scenario: Moving on
- **WHEN** the user completes a step and continues
- **THEN** the next step is shown and the completed one stays reachable

#### Scenario: Going back
- **WHEN** the user returns to an earlier step
- **THEN** the values entered there are still present and can be changed, and the
  later steps keep what was already entered where it is still valid

#### Scenario: An incomplete step
- **WHEN** a step's required entries are missing
- **THEN** the control to continue is unavailable and the missing entries are
  marked

#### Scenario: Leaving the assistant
- **WHEN** the user cancels the assistant
- **THEN** nothing has been created on the server and the page is unchanged

### Requirement: The node step

The first step SHALL let the user choose one of the configured nodes or create a
new one without leaving the assistant, and SHALL show the chosen node's
last-known reachability.

#### Scenario: Choosing an existing node
- **WHEN** the user selects a configured node
- **THEN** its last-known reachability is shown and the assistant can continue

#### Scenario: No node exists yet
- **WHEN** the assistant is started while no node is configured
- **THEN** the step offers to create one instead of showing an empty selection

#### Scenario: Creating a node in the assistant
- **WHEN** the user enters a node's name and base URL and confirms
- **THEN** the node is created, selected for this camera, and appears in the
  page's node list

#### Scenario: A node that cannot be reached
- **WHEN** the chosen node's last-known status is an error
- **THEN** the step says so and offers to test it, without preventing the user
  from continuing

### Requirement: The connection step

The second step SHALL take the camera's address and its optional credentials and
SHALL let the connection be tested before anything is stored.

#### Scenario: A successful test
- **WHEN** the user enters the address and triggers the test and the node reaches
  the camera
- **THEN** the step reports success and the assistant can continue

#### Scenario: A failed test
- **WHEN** the test fails
- **THEN** the reason the server gave is shown, the entered values are kept, and
  the user may correct them and test again

#### Scenario: Continuing without a successful test
- **WHEN** the user continues although the test failed or was not run
- **THEN** the assistant states that the camera will be stored unverified and
  continues, rather than blocking

#### Scenario: A password entered in the assistant
- **WHEN** the user enters a password
- **THEN** it is sent with the camera and never shown back afterwards

### Requirement: The stream step

The third step SHALL probe the camera's streams and let the user assign live,
detection and recording to them before the camera is stored.

#### Scenario: Probing during setup
- **WHEN** the step is reached
- **THEN** the user can probe the entered address and see what it delivers —
  resolution, frame rate, bitrate and codecs

#### Scenario: A second stream
- **WHEN** the user adds a further stream with its own name and URL
- **THEN** it can be probed and assigned in the same step

#### Scenario: A default assignment is proposed
- **WHEN** the step is reached
- **THEN** the assistant proposes an assignment — recording and live on the main
  stream, detection on the lower-resolution stream where one was entered — which
  the user may change

#### Scenario: Continuing without probing
- **WHEN** no stream was probed
- **THEN** the assignment can still be made and the assistant continues, with the
  parameters left unknown

### Requirement: The naming step and creation

The final step SHALL take the camera's display name, its Frigate key, the pages
it is used on and its position in the order, SHALL show a summary of what the
earlier steps produced, and SHALL create the camera on confirmation.

#### Scenario: Creating the camera
- **WHEN** the user confirms the final step
- **THEN** the camera is created on the server with the node, address,
  credentials, streams, assignment and usage collected in the steps, and appears
  in the camera list

#### Scenario: The summary
- **WHEN** the final step is shown
- **THEN** it names the chosen node, the connection test result and the stream
  assignment, so the user confirms against what was actually verified

#### Scenario: The server rejects the camera
- **WHEN** the server refuses the camera — for example a Frigate key already used
  on that node
- **THEN** the reason is shown on the step that owns the offending value,
  everything entered is kept, and the assistant stays open

#### Scenario: Creation while the node is unreachable
- **WHEN** the camera is created and the server reports it as not yet provisioned
- **THEN** the assistant closes and the camera appears in the list marked with
  its provisioning state, rather than reporting an outright failure

### Requirement: Editing stays a form

Editing an existing camera SHALL remain a single form and SHALL NOT run through
the assistant.

#### Scenario: Editing a camera
- **WHEN** the user edits an existing camera
- **THEN** the fields are shown together in one form, not as a sequence of steps
