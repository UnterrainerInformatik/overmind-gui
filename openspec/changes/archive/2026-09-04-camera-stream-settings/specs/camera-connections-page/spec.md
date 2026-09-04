## MODIFIED Requirements

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

## ADDED Requirements

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
