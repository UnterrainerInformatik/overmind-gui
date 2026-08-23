# kiosk-migrations-overview Specification

## Purpose
Gives operators a kiosk-reachable view of every fleet-wide backend "migration" (field-reconciliation target, e.g. the DNS-nameserver rollout) so they can see progress and spot stuck/errored nodes without SSHing into the backend.

## Requirements

### Requirement: Gear button reachable from any kiosk view

While kiosk mode is active, the system SHALL render a small, icon-only, frameless button fixed to the bottom-right corner of the screen, regardless of which kiosk view is currently displayed. Tapping it SHALL navigate to the Migrations Overview page. The button SHALL NOT be rendered when kiosk mode is inactive.

#### Scenario: Button present on any kiosk view
- **WHEN** kiosk mode is active, on any kiosk view (overview, lights, plugs, movement, contact, camera, video, …)
- **THEN** the gear button is visible in the bottom-right corner

#### Scenario: Button absent outside kiosk mode
- **WHEN** kiosk mode is not active
- **THEN** the gear button is not rendered

#### Scenario: Tapping the button opens the overview
- **WHEN** the operator taps the gear button
- **THEN** the Migrations Overview page opens

### Requirement: Overview lists every active migration

The Migrations Overview page SHALL render one entry per active backend migration, each showing at minimum: a name/type identifying the migration (e.g. "DNS nameserver → 10.10.196.3"), the count of nodes completed, the count of nodes still pending, and the count of nodes in error.

#### Scenario: Multiple active migrations
- **WHEN** the backend reports more than one active migration
- **THEN** the page renders a separate entry for each, with its own name/type and counts

#### Scenario: No active migrations
- **WHEN** the backend reports zero active migrations
- **THEN** the page shows an explicit empty state instead of a blank area

### Requirement: Error nodes are individually identifiable per migration

For a migration with one or more nodes in error, the operator SHALL be able to see which specific nodes are in error (by name), not just the error count.

#### Scenario: Migration with errors
- **WHEN** a migration entry has an error count greater than zero
- **THEN** the operator can view the list of the specific nodes currently in error for that migration

#### Scenario: Migration with no errors
- **WHEN** a migration entry has an error count of zero
- **THEN** no error-node list is shown (or it is shown empty) for that migration

### Requirement: Overview refreshes automatically while open

While the Migrations Overview page is open, the system SHALL periodically re-fetch migration status so that counts and error nodes reflect ongoing backend progress without requiring a manual page reload.

#### Scenario: Counts update without manual reload
- **GIVEN** the Migrations Overview page is open and a migration's pending count decreases on the backend
- **WHEN** the next automatic refresh occurs
- **THEN** the displayed pending/done counts for that migration update to match, without the operator reloading the page

#### Scenario: Refresh stops when the page is left
- **WHEN** the operator navigates away from the Migrations Overview page
- **THEN** no further automatic refreshes are performed for that page instance

### Requirement: Data-fetch failures are shown, not hidden

If a status refresh fails (e.g. the backend is unreachable), the page SHALL show a clear error state rather than a blank or stale-looking screen, and SHALL continue attempting subsequent scheduled refreshes.

#### Scenario: Backend unreachable
- **WHEN** a status refresh request fails
- **THEN** the page shows a visible error indication

#### Scenario: Recovery
- **WHEN** a subsequent scheduled refresh succeeds after a prior failure
- **THEN** the error indication is cleared and current data is shown

### Requirement: Non-interference with existing kiosk panels

The gear button and the Migrations Overview page SHALL NOT alter the behavior or layout of existing kiosk panels. The overview is reached only by an explicit tap on the gear button; it SHALL NOT be shown automatically.

#### Scenario: Existing kiosk panels unaffected
- **WHEN** the gear button is added to a kiosk view
- **THEN** all other panels on that view continue to render and behave exactly as before

#### Scenario: No automatic navigation
- **WHEN** a kiosk view is loaded or refreshed
- **THEN** the Migrations Overview page is not opened automatically

### Requirement: Per-node retry count is visible at a glance

For each node rendered in a migration's pending, done, or error list, the system SHALL display that node's retry/attempt count as part of the row itself, right-aligned within the row, without requiring the operator to open the node's detail dialog. Each node row SHALL be rendered as an outlined chip that spans the full width of its table column with a transparent background. If a node's retry/attempt count is not available from the backend, the count SHALL be omitted for that row rather than shown as a placeholder or zero.

#### Scenario: Node with retries shows its count in the row

- **WHEN** a pending or error node with a known attempt count is rendered in its migration's list
- **THEN** the row is an outlined, full-width, transparent-background chip showing the node name and its retry count, with the retry count right-aligned within the chip

#### Scenario: Scanning a migration for nodes with high retry counts

- **WHEN** an operator views a migration entry with several pending or error nodes
- **THEN** the operator can identify which nodes have high retry counts by looking at the row chips alone, without opening any node's detail dialog

#### Scenario: Node with no retry-count data

- **WHEN** a node's retry/attempt count is not present in the backend response
- **THEN** the node's row is still rendered as a chip with the node's name, and no retry-count value is shown for that row

### Requirement: Node lists remain reachable by scroll when they overflow

When a migration's node list (pending, done, or error) is taller than the space available on screen, the system SHALL allow the operator to scroll to reach nodes below the fold, including via touch input on a tablet, and SHALL show a visible scrollbar on the right edge of the scrollable area while it is scrollable.

#### Scenario: Long node list on a tablet

- **GIVEN** the Migrations Overview page is open on a tablet and a migration's node list is taller than the available viewport space
- **WHEN** the operator performs a touch scroll gesture over the node list
- **THEN** the list scrolls and previously out-of-view nodes become reachable

#### Scenario: Scrollbar hidden when content fits

- **WHEN** a migration's node list content does not exceed the available viewport space
- **THEN** no scrollbar is shown for that list

#### Scenario: Scrollbar shown when content overflows

- **WHEN** a migration's node list content exceeds the available viewport space
- **THEN** a scrollbar is visible on the right edge of the scrollable area
