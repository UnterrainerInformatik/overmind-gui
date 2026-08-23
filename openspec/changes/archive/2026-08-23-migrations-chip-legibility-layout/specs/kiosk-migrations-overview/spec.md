## MODIFIED Requirements

### Requirement: Per-node retry count is visible at a glance

For each node rendered in a migration's pending, done, or error list, the system SHALL display that node's retry/attempt count as part of the row itself, right-aligned within the row, without requiring the operator to open the node's detail dialog. Each node row SHALL be rendered as an outlined chip that spans the full width of its table column with a transparent background. The node name and retry count SHALL be rendered in a text color that contrasts against the kiosk theme's background, so the row is legible and not reduced to its status icon. If a node's retry/attempt count is not available from the backend, the count SHALL be omitted for that row rather than shown as a placeholder or zero.

#### Scenario: Node with retries shows its count in the row

- **WHEN** a pending or error node with a known attempt count is rendered in its migration's list
- **THEN** the row is an outlined, full-width, transparent-background chip showing the node name and its retry count, with the retry count right-aligned at the chip's trailing edge

#### Scenario: Chip text is legible

- **WHEN** any node chip is rendered on the kiosk tablet
- **THEN** the node's name is readable next to its status icon, and the chip's text is not rendered in a transparent or background-matching color

#### Scenario: Scanning a migration for nodes with high retry counts

- **WHEN** an operator views a migration entry with several pending or error nodes
- **THEN** the operator can identify which nodes have high retry counts by looking at the row chips alone, without opening any node's detail dialog

#### Scenario: Node with no retry-count data

- **WHEN** a node's retry/attempt count is not present in the backend response
- **THEN** the node's row is still rendered as a chip with the node's name, and no retry-count value is shown for that row

### Requirement: Node lists remain reachable by scroll when they overflow

When a migration's node list (pending, done, or error) is taller than the space available on screen, the system SHALL allow the operator to scroll to reach nodes below the fold, including via touch input on a tablet, and SHALL show a scrollbar at the right edge of that column's scrollable area, inside the column's own bounds, in a color that is visible against the kiosk theme.

#### Scenario: Long node list on a tablet

- **GIVEN** the Migrations Overview page is open on a tablet and a migration's node list is taller than the available viewport space
- **WHEN** the operator performs a touch scroll gesture over the node list
- **THEN** the list scrolls and previously out-of-view nodes become reachable

#### Scenario: Scrollbar hidden when content fits

- **WHEN** a migration's node list content does not exceed the available viewport space
- **THEN** no scrollbar thumb is shown for that list

#### Scenario: Scrollbar stays inside its column

- **WHEN** a migration's node list content exceeds the available viewport space
- **THEN** the scrollbar is visible at the right edge of that column's list, within the column, and not beside or outside the table

#### Scenario: Column width does not change when a list starts scrolling

- **WHEN** a column's node list grows long enough to become scrollable
- **THEN** the node rows in that column keep their width instead of shifting to make room for the scrollbar

## ADDED Requirements

### Requirement: Overview fills the kiosk screen with equal columns

On the kiosk tablet's screen (1024x600), the Migrations Overview SHALL use the full available width, and the pending, done and error columns SHALL be equally wide regardless of how much content each holds. A single migration entry SHALL fit within the screen height without page-level scrolling, with its node lists sized to the remaining height below the page and card titles. The fixed back button SHALL NOT permanently obscure any node row: the column it overlaps SHALL allow its last entries to be scrolled clear of it.

#### Scenario: Single migration entry on the kiosk tablet

- **GIVEN** the backend reports one active migration
- **WHEN** the Migrations Overview is displayed on the 1024x600 kiosk screen
- **THEN** the entry's card spans the screen width, its three columns are equally wide, and the page itself does not scroll

#### Scenario: Column widths stay stable across refreshes

- **GIVEN** a migration whose pending, done and error lists differ in length
- **WHEN** an automatic refresh changes how many nodes each list holds
- **THEN** the three columns keep the same width as before

#### Scenario: Back button does not hide node rows

- **WHEN** the column overlapped by the fixed back button holds more nodes than fit above it
- **THEN** the operator can scroll that column so its last node rows appear clear of the button

### Requirement: Bulk retry action sits in the error column heading

The action that retries all errored nodes of a migration SHALL be rendered next to the error column's heading label, inside that column's header cell, so it reads as belonging to the error column rather than floating at the edge of the entry. It SHALL be disabled while the migration has no errored nodes.

#### Scenario: Retry-all button placement

- **WHEN** a migration entry is rendered
- **THEN** its retry-all-errors button appears immediately next to the error column's heading label

#### Scenario: No errors to retry

- **WHEN** a migration's error count is zero
- **THEN** the retry-all-errors button is shown disabled
