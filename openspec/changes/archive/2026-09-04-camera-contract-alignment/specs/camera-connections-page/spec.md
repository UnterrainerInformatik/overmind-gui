## MODIFIED Requirements

### Requirement: Node detail dialog

The node section SHALL offer a detail view per node, opened from its entry and
shown without leaving the Kameras page, listing the cameras bound to that node
with their stream assignment, its last-known reachability, and what the server
reports about the node itself — its Frigate version, its storage use and the
retention it applies to cameras that state none of their own — with the node's
edit, test and delete controls reachable from within it.

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
