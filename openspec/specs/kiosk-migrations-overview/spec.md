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

The Migrations Overview page SHALL render one expansion panel per active backend migration. Each panel's header SHALL identify the migration by name/type (e.g. "DNS nameserver → 10.10.196.3") and SHALL show the count of nodes completed, the count of nodes still pending, and the count of nodes in error, so a collapsed migration remains scannable. Expanding a panel SHALL reveal that migration's full detail view (the pending/done/error node columns). The panels SHALL behave as an accordion: expanding one panel SHALL collapse any other. All panel headers SHALL be visible on screen at the same time for any realistic number of concurrent migrations, so the operator can see that more than one migration exists without scrolling.

#### Scenario: Multiple active migrations
- **WHEN** the backend reports more than one active migration
- **THEN** the page renders a separate expansion panel for each, every panel header showing that migration's name/type and its done/pending/error counts, with all headers visible at once

#### Scenario: Expanding a migration
- **WHEN** the operator taps a collapsed migration's panel header
- **THEN** that panel expands to show the migration's pending/done/error node columns, and any previously expanded panel collapses

#### Scenario: Single active migration starts expanded
- **WHEN** the backend reports exactly one active migration
- **THEN** that migration's panel is expanded without requiring a tap

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

### Requirement: Overview fills the kiosk screen with equal columns

On the kiosk tablet's screen (1024x600), the Migrations Overview SHALL use the full available width, and the expanded migration's pending, done and error columns SHALL be equally wide regardless of how much content each holds. The expanded panel SHALL fit within the screen height without page-level scrolling, with its node lists sized to the height remaining below the page title, the collapsed panel headers, and the expanded panel's own header and column headings. The fixed back button SHALL NOT permanently obscure any node row: the column it overlaps SHALL allow its last entries to be scrolled clear of it.

#### Scenario: Single migration entry on the kiosk tablet
- **GIVEN** the backend reports one active migration
- **WHEN** a migration's panel is expanded on the 1024x600 kiosk screen
- **THEN** the expanded panel spans the screen width, its three columns are equally wide, and the page itself does not scroll

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

### Requirement: Node detail dialog shows appliance information

The node detail dialog SHALL be reachable by tapping a node chip in any of the three columns (pending, done, error). Under its title, the dialog SHALL show an information section for the node's appliance listing: the appliance ID, its IP address, its MAC address, the last time it was online, and whether it is currently online. Each field SHALL be shown as a labeled line; a field whose value is not available from the backend SHALL be omitted rather than rendered empty or as a placeholder. The appliance information SHALL be loaded when the dialog opens; while loading, the dialog SHALL indicate that it is loading, and if the load fails, the dialog SHALL show a visible failure indication for the info section while the rest of the dialog stays usable.

#### Scenario: Opening a done node's dialog

- **WHEN** the operator taps a chip in the done column
- **THEN** the node detail dialog opens showing the appliance information section, without a retry action and without an error-message section

#### Scenario: Appliance info in a pending or error node's dialog

- **WHEN** the operator taps a chip in the pending or error column
- **THEN** the dialog shows the appliance information section in addition to the existing attempt count, error messages and retry action

#### Scenario: Field not available

- **WHEN** the backend provides no value for one of the info fields (e.g. no MAC address) for the selected appliance
- **THEN** that line is omitted from the info section and the remaining fields are still shown

#### Scenario: Appliance info fails to load

- **WHEN** fetching the appliance details fails after the dialog opened
- **THEN** the dialog shows a failure indication in place of the info section, and the dialog's other content and actions still work

### Requirement: Pointer hover highlights the individual node chip

When the operator points at a node chip with a pointing device, the system SHALL visually highlight that chip alone. Hovering SHALL NOT change the background of the migration entry's table, of a status column, or of any node chip other than the one under the pointer. All node chips (pending, done, and error) open the node's detail dialog when clicked and SHALL therefore all receive the hover highlight.

#### Scenario: Hovering a clickable node chip

- **WHEN** the operator moves a pointing device over a pending, done, or error node chip
- **THEN** that chip's background changes to indicate it is under the pointer, and no other chip and no part of the surrounding table changes appearance

#### Scenario: Hovering a non-clickable node chip

- **WHEN** every rendered node chip opens a detail dialog
- **THEN** no chip is exempt from the hover highlight

#### Scenario: Hovering the table outside any chip

- **WHEN** the operator moves a pointing device over a column heading, over the space between two node chips, or over a column with no nodes
- **THEN** the migration entry's table keeps its normal background and no highlight is shown

#### Scenario: Touch interaction leaves no chip highlighted

- **GIVEN** the overview is displayed on the kiosk touch tablet
- **WHEN** the operator taps any node chip and closes the detail dialog
- **THEN** no chip remains in a highlighted state
