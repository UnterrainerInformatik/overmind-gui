# camera-connections-page Specification

## Purpose

Gives the installation one screen for its camera connections: which cameras exist,
on which node, whether they are reachable and configured, and the ability to add,
change and remove one without touching the sources.

## Requirements

### Requirement: Cameras page reachable from the kiosk overview

The kiosk overview SHALL offer a link to the Kameras page, in the style of the
existing kiosk link panels, and the page SHALL offer a way back to the overview.

#### Scenario: Opening the page
- **WHEN** the user selects the Kameras link on the kiosk overview
- **THEN** the Kameras page opens

#### Scenario: Going back
- **WHEN** the user selects the back control on the Kameras page
- **THEN** the kiosk overview is shown again

### Requirement: List of camera connections

The page SHALL list every configured camera, in the configured order, showing per
camera its display name, its Frigate key, the node it lives on, whether it is
enabled, on which pages it is used, which of its streams serves live viewing,
detection and recording, its last-known reachability, and its provisioning state.
Raw stream URLs SHALL NOT be part of the list entry.

#### Scenario: Cameras are listed
- **WHEN** the page is open and cameras are configured
- **THEN** each camera is listed with name, Frigate key, node, enabled state, page
  usage, stream assignment, last-known reachability and provisioning state

#### Scenario: A camera with one stream
- **WHEN** a camera has only its main stream
- **THEN** the entry says so once instead of naming the same stream three times

#### Scenario: No cameras configured
- **WHEN** no cameras are configured
- **THEN** the page shows an empty state inviting the user to add one, instead of a
  blank list

#### Scenario: The server is unreachable
- **WHEN** loading the camera list fails
- **THEN** the page shows an error state rather than an empty list

#### Scenario: A camera that is not provisioned
- **WHEN** a camera's provisioning state is pending or failed
- **THEN** the list marks it visibly and makes the reason readable

### Requirement: Add a camera

The page SHALL let the user create a camera connection through the guided
assistant, which collects its node, its address and optional credentials, its
streams and their assignment to live viewing, detection and recording, its
display name, its Frigate key, the pages it is used on, and its position in the
order. The page SHALL NOT offer a single-form create dialog alongside it.

#### Scenario: Creating a camera
- **WHEN** the user completes the assistant and confirms
- **THEN** the camera is created on the server and appears in the list

#### Scenario: Live or detection pulled from a separate stream
- **WHEN** the camera has more than one stream
- **THEN** live viewing, detection and recording can each be assigned to a
  different one, so the node can pull a different stream — or a different
  device — for watching and for detection

#### Scenario: Only the source stream is entered
- **WHEN** the camera is entered with its main stream alone
- **THEN** all three purposes are assigned to it and the assistant states that,
  rather than requiring further streams

#### Scenario: Required fields missing
- **WHEN** display name, Frigate key, node or the main stream URL is empty
- **THEN** the control to continue or confirm is unavailable and the missing
  fields are marked

#### Scenario: The server rejects the camera
- **WHEN** the server refuses the camera — for example a Frigate key already used on
  that node, or a malformed key
- **THEN** the page shows the reason and keeps the entered values so they can be
  corrected, rather than discarding the form

#### Scenario: No node exists yet
- **WHEN** the user starts the assistant while no node is configured
- **THEN** its first step offers to create a node instead of showing an empty
  selection

### Requirement: Edit a camera

The page SHALL let the user change any field of an existing camera, including
moving it to a different node and enabling or disabling it.

#### Scenario: Changing a camera
- **WHEN** the user edits a camera and confirms
- **THEN** the change is stored on the server and the list reflects it

#### Scenario: Password left untouched
- **WHEN** the user edits a camera that has stored credentials without entering a new
  password
- **THEN** the stored password is left in place rather than cleared

#### Scenario: Changing the Frigate key
- **WHEN** the user changes an existing camera's Frigate key
- **THEN** the page warns that footage already recorded under the old key will no
  longer be associated with this camera, and requires confirmation

#### Scenario: Discarding an edit
- **WHEN** the user cancels an edit
- **THEN** no change is sent and the previous values remain

### Requirement: Delete a camera

The page SHALL let the user remove a camera connection, and SHALL require an
explicit confirmation naming the camera first.

#### Scenario: Deleting with confirmation
- **WHEN** the user requests deletion and confirms the prompt naming that camera
- **THEN** the camera is deleted on the server and disappears from the list

#### Scenario: Cancelling a deletion
- **WHEN** the user requests deletion and dismisses the prompt
- **THEN** nothing is deleted

#### Scenario: Recordings are not implied to be deleted
- **WHEN** the confirmation prompt is shown
- **THEN** it states that already recorded footage is not removed

### Requirement: Manage the nodes cameras live on

The page SHALL let the user list, add, edit and delete the nodes that host cameras,
each with its name, its Frigate base URL, its optional stream base URL and its
enabled state.

#### Scenario: Listing nodes
- **WHEN** the page is open
- **THEN** the configured nodes are shown with their name, base URL, enabled state
  and last-known reachability

#### Scenario: Adding a node
- **WHEN** the user enters a name and a valid base URL and confirms
- **THEN** the node is created and becomes selectable when adding a camera

#### Scenario: Deleting a node that still holds cameras
- **WHEN** the user tries to delete a node that cameras are still bound to
- **THEN** the page reports that its cameras must be moved or removed first, and
  nothing is deleted

### Requirement: Connection test

The page SHALL offer a test control per camera and per node that checks
reachability on demand and shows the outcome without leaving the page.

#### Scenario: Testing a camera successfully
- **WHEN** the user triggers the test for a camera and the server reports it reachable
- **THEN** the page shows a success result for that camera and updates its displayed
  status

#### Scenario: Testing a camera that fails
- **WHEN** the test fails
- **THEN** the page shows the failure together with the reason the server gave

#### Scenario: A test in progress
- **WHEN** a test is running
- **THEN** that camera's test control shows it is busy, and the rest of the page stays
  usable

#### Scenario: The page does not test on its own
- **WHEN** the page loads
- **THEN** it shows the stored last-known status without triggering tests, so opening
  the page never waits on unreachable nodes

### Requirement: Credentials are never displayed

The page SHALL NOT display a stored camera password.

#### Scenario: Editing a camera with credentials
- **WHEN** the edit form opens for a camera that has a stored password
- **THEN** the password field is empty or masked and indicates that a password is
  stored, rather than showing it

### Requirement: Node detail dialog

The node section SHALL offer a detail view per node, opened from its entry and
shown without leaving the Kameras page, listing the cameras bound to that node
with their stream assignment, its last-known reachability, and what the server
reports about the node itself — its Frigate version and its storage use — with
the node's edit, test and delete controls reachable from within it.

#### Scenario: Opening a node's details
- **WHEN** the user selects a node's entry
- **THEN** its details are shown over the Kameras page, without navigating away

#### Scenario: The node's cameras
- **WHEN** the detail view is open
- **THEN** the cameras bound to that node are listed with their name, enabled
  state and stream assignment

#### Scenario: A node without cameras
- **WHEN** the node has no cameras
- **THEN** the detail view says so and offers to add one for this node

#### Scenario: Reported node facts are missing
- **WHEN** the server reports no version or no storage figures for a node
- **THEN** those entries are shown as unknown rather than as zero or empty

#### Scenario: Acting on the node from its details
- **WHEN** the user edits, tests or deletes the node from the detail view
- **THEN** the same behaviour applies as from the node list, and the detail view
  reflects the outcome

#### Scenario: Closing the detail view
- **WHEN** the user closes the detail view
- **THEN** the Kameras page is shown unchanged, with any edits made in the view
  reflected in the lists
