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

The node detail dialog SHALL be reachable by tapping a node chip in any of the three columns (pending, done, error). Under its title, the dialog SHALL show an information section for the node's appliance listing: the appliance ID, its IP address, its MAC address, the last time it was online, and whether it is currently online. For an appliance the backend reports as battery-driven, the section SHALL additionally show the appliance's battery charge level as a percentage. The level SHALL NOT carry a time of its own: the last-time-online line already in the section is the time through which the level is valid — a device that makes contact without posting a new battery level is thereby stating that the stored level still stands — and repeating that same value on the battery line would show one timestamp twice. For a node in the done column, the section SHALL additionally show the time at which the migration was carried out for that node. Every time shown in the dialog SHALL be rendered in the same localized date-and-time format the dialog already uses for the last-time-online line; times SHALL NOT be rendered in ISO-8601.

Each field SHALL be shown as a labeled line; a field whose value is not available from the backend SHALL be omitted rather than rendered empty or as a placeholder. An appliance that is not battery-driven SHALL show no battery line at all, as opposed to an empty or zero one. An appliance the backend reports as battery-driven but for which no charge level is available SHALL likewise show no battery line, rather than a line with an empty or zero level.

The appliance information SHALL be loaded when the dialog opens; while loading, the dialog SHALL indicate that it is loading, and if the load fails, the dialog SHALL show a visible failure indication for the info section while the rest of the dialog stays usable.

#### Scenario: Opening a done node's dialog

- **WHEN** the operator taps a chip in the done column
- **THEN** the node detail dialog opens showing the appliance information section and the time the migration was carried out for that node, without a retry action and without a failure-reason section

#### Scenario: Appliance info in a pending or error node's dialog

- **WHEN** the operator taps a chip in the pending or error column
- **THEN** the dialog shows the appliance information section in addition to the existing attempt count, failure reasons and retry action

#### Scenario: Battery-driven appliance

- **WHEN** the dialog is opened for a node whose appliance the backend reports as battery-driven and for which a charge level is available
- **THEN** the information section shows that charge level as a percentage

#### Scenario: The battery line carries no time of its own

- **WHEN** the dialog shows a battery charge level
- **THEN** no timestamp is rendered on the battery line, the last-time-online line in the same section being the time through which that level is valid

#### Scenario: Battery-driven appliance with no charge level

- **WHEN** the dialog is opened for a battery-driven appliance whose stored state holds no battery reading
- **THEN** no battery line is shown, rather than a line with an empty or zero level

#### Scenario: Mains-powered appliance

- **WHEN** the dialog is opened for a node whose appliance the backend does not report as battery-driven
- **THEN** no battery line is shown at all

#### Scenario: Done node whose migration time is unknown

- **WHEN** a done node predates the recording of migration times and the backend supplies none for it
- **THEN** the dialog omits the migration-time line and still shows the rest of the information section

#### Scenario: Field not available

- **WHEN** the backend provides no value for one of the info fields (e.g. no MAC address) for the selected appliance
- **THEN** that line is omitted from the info section and the remaining fields are still shown

#### Scenario: Appliance info fails to load

- **WHEN** fetching the appliance details fails after the dialog opened
- **THEN** the dialog shows a failure indication in place of the info section, and the dialog's other content and actions still work

### Requirement: The information block is visually separated from the failure-reason list

The node detail dialog SHALL group all of the node's facts — the appliance information, the battery line, the migration time and the node's attempt count — into a single information block directly under the dialog title, and SHALL draw a visual separator between that block and the list of failure reasons below it. The attempt count SHALL sit inside the information block rather than below the separator, because it describes the node rather than any one failure. When a node has no failure-reason list at all (a done node), no separator SHALL be drawn, so the dialog does not end on a rule with nothing after it.

The attempt count SHALL be shown for a node in any of the three columns, the done column included: how many attempts a migration consumed before it converged is a fact about that node, and the count the backend reports for a done node includes the attempt that succeeded — a node that converged on its first try reports one. A done node for which the backend reports no count SHALL omit the line, as any other node with no count does, rather than show a zero or a placeholder.

#### Scenario: Error node's dialog

- **WHEN** the operator opens the dialog for a node with one or more recorded failure reasons
- **THEN** the appliance information, battery line and attempt count appear as one block under the title, a visual separator follows, and the failure reasons appear below that separator

#### Scenario: Attempt count sits above the separator

- **WHEN** a dialog shows both an attempt count and a failure-reason list
- **THEN** the attempt count is rendered above the separator, together with the appliance information

#### Scenario: Done node's attempt count is shown

- **WHEN** the operator opens the dialog for a done node whose attempt count the backend reports
- **THEN** the information block shows that count, alongside the migration time

#### Scenario: Done node whose attempt count is unknown

- **WHEN** the operator opens the dialog for a done node that converged before attempt counts were recorded, so the backend reports none
- **THEN** no attempt-count line is shown, and the rest of the information block still renders

#### Scenario: Done node's dialog has no dangling separator

- **WHEN** the operator opens the dialog for a done node, which has no failure-reason list
- **THEN** no separator is drawn

#### Scenario: Node with no recorded failure reasons

- **WHEN** the operator opens the dialog for a pending or error node that has recorded no failure reason yet
- **THEN** the separator is drawn and the existing "no failure reasons available" text appears below it, in place of the list

### Requirement: Each failure reason is shown with the time it was recorded

For a node in the pending or error column, the dialog SHALL show, for each recorded failure reason the backend supplies a time for, the time at which that reason was recorded, so the failure history reads as a chronological record rather than an unordered set of strings. That time SHALL be rendered in the dialog's localized date-and-time format — not ISO-8601 — and SHALL include seconds, since a retry cycle can record several failures within one minute. A failure reason the backend supplies without a time SHALL still be shown, with its time omitted.

The dialog SHALL read that time regardless of how the backend attaches it to the reason: carried inside the reason's own entry, or supplied in a list positioned alongside the reasons, as the occurrence count already is. A time the backend supplies SHALL NOT go unshown because it arrived in one of those forms rather than the other. Where the backend supplies both a first and a most recent occurrence time for one reason, the dialog SHALL show the most recent one, because that is what says whether the node is still failing.

#### Scenario: Failure reasons carry their times

- **WHEN** the operator opens the dialog for an error node whose recorded failure reasons carry times
- **THEN** each reason is shown together with the time it was recorded, in the dialog's localized format and including seconds

#### Scenario: Times supplied alongside the reasons rather than inside them

- **WHEN** the backend supplies the reasons as plain text and their times in a separate list positioned alongside them
- **THEN** each reason is still shown with its own time, matched to that reason and not to another

#### Scenario: Distinguishing a long-stuck node from a fast retry burst

- **GIVEN** two error nodes, one whose failures were recorded seconds apart and one whose failures span two days
- **WHEN** the operator opens each node's dialog
- **THEN** the times shown make the difference apparent without consulting the server logs

#### Scenario: Failure reason without a time

- **WHEN** the backend supplies a recorded failure reason with no time (for example a reason recorded before times were kept)
- **THEN** that reason is still shown in full, with no time and no placeholder in its place

#### Scenario: Some reasons timed, some not

- **GIVEN** a node whose recorded reasons include one from before times were kept and one recorded since
- **WHEN** the operator opens its dialog
- **THEN** the newer reason is shown with its time and the older one without, each reason keeping its own text

#### Scenario: Times are never shown in ISO-8601

- **WHEN** any time is rendered anywhere in the node detail dialog
- **THEN** it uses the view's localized date-and-time format, not an ISO-8601 string

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
