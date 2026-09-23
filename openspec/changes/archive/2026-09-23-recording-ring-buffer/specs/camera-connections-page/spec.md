## MODIFIED Requirements

### Requirement: Manage the nodes cameras live on

The page SHALL let the user list, add, edit and delete the nodes that host cameras,
each with its name, its Frigate base URL, its optional stream base URL and its
enabled state. Each node's list entry SHALL carry a compact recording-storage
gauge showing the ring buffer's fill level and the disk headroom's colour, so a
node running out of disk is visible without opening its details.

#### Scenario: Listing nodes
- **WHEN** the page is open
- **THEN** the configured nodes are shown with their name, base URL, enabled state,
  last-known reachability and compact recording-storage gauge

#### Scenario: A node running out of disk in the list
- **WHEN** a node's disk headroom is below one hour of recording and the disk
  would run out before its ring fills
- **THEN** that node's list entry shows its compact gauge in red without the
  detail view being opened

#### Scenario: Adding a node
- **WHEN** the user enters a name and a valid base URL and confirms
- **THEN** the node is created and becomes selectable when adding a camera

#### Scenario: Deleting a node that still holds cameras
- **WHEN** the user tries to delete a node that cameras are still bound to
- **THEN** the page reports that its cameras must be moved or removed first, and
  nothing is deleted

### Requirement: Node detail dialog

The node section SHALL offer a detail view per node, opened from its entry and
shown without leaving the Kameras page, listing the cameras bound to that node
with their stream assignment, its last-known reachability, and what the server
reports about the node itself: its Frigate version, its full recording-storage
gauge (ring buffer fill level and disk headroom) and the retention it applies to
cameras that state none of their own. The node's edit, test and delete controls
SHALL be reachable from within it.

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

#### Scenario: The node's recording storage
- **WHEN** the detail view is open
- **THEN** it shows the node's full recording-storage gauge in place of a bare
  "used / total" figure

#### Scenario: The node's default retention
- **WHEN** the server reports the retention the node applies by default
- **THEN** it is shown among the node's reported facts, in days, and identified
  as what applies to a camera that sets none of its own

#### Scenario: Reported node facts are missing
- **WHEN** the server reports no version, no storage figures or no default
  retention for a node
- **THEN** those entries are shown as unknown rather than as zero or empty

#### Scenario: Acting on the node from its details
- **WHEN** the user edits, tests or deletes the node from the detail view
- **THEN** the same behaviour applies as from the node list, and the detail view
  reflects the outcome

#### Scenario: Closing the detail view
- **WHEN** the user closes the detail view
- **THEN** the Kameras page is shown unchanged, with any edits made in the view
  reflected in the lists
