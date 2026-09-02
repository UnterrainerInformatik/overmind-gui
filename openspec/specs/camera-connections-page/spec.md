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
enabled, on which pages it is used, its last-known reachability, and its
provisioning state.

#### Scenario: Cameras are listed
- **WHEN** the page is open and cameras are configured
- **THEN** each camera is listed with name, Frigate key, node, enabled state, page
  usage, last-known reachability and provisioning state

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

The page SHALL let the user create a camera connection by entering its display
name, its Frigate key, the node it belongs to, its source stream URL, optionally
a separate live stream URL and a separate detection stream URL, optional
credentials, the pages it is used on, and its position in the order.

#### Scenario: Creating a camera
- **WHEN** the user fills in the required fields and confirms
- **THEN** the camera is created on the server and appears in the list

#### Scenario: Live or detection pulled from a separate stream
- **WHEN** the user enters a live stream URL, a detection stream URL, or both,
  alongside the source stream URL
- **THEN** each is stored with the camera, so the node can pull a different
  stream — or a different device — for watching and for detection

#### Scenario: Only the source stream is entered
- **WHEN** the live and detection stream URLs are left empty
- **THEN** the camera is created with the source stream alone, and the page
  states that the other purposes fall back to it, rather than requiring the
  fields

#### Scenario: Required fields missing
- **WHEN** display name, Frigate key, node or source URL is empty
- **THEN** the confirm control is unavailable and the missing fields are marked

#### Scenario: The server rejects the camera
- **WHEN** the server refuses the camera — for example a Frigate key already used on
  that node, or a malformed key
- **THEN** the page shows the reason and keeps the entered values so they can be
  corrected, rather than discarding the form

#### Scenario: No node exists yet
- **WHEN** the user opens the create form while no node is configured
- **THEN** the page says a node must be added first and offers the node form

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
