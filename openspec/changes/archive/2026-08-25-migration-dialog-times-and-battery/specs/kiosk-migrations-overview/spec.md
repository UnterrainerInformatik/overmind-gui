## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: The information block is visually separated from the failure-reason list

The node detail dialog SHALL group all of the node's facts — the appliance information, the battery line, the migration time and the node's attempt count — into a single information block directly under the dialog title, and SHALL draw a visual separator between that block and the list of failure reasons below it. The attempt count SHALL sit inside the information block rather than below the separator, because it describes the node rather than any one failure. When a node has no failure-reason list at all (a done node), no separator SHALL be drawn, so the dialog does not end on a rule with nothing after it.

#### Scenario: Error node's dialog

- **WHEN** the operator opens the dialog for a node with one or more recorded failure reasons
- **THEN** the appliance information, battery line and attempt count appear as one block under the title, a visual separator follows, and the failure reasons appear below that separator

#### Scenario: Attempt count sits above the separator

- **WHEN** a dialog shows both an attempt count and a failure-reason list
- **THEN** the attempt count is rendered above the separator, together with the appliance information

#### Scenario: Done node's dialog has no dangling separator

- **WHEN** the operator opens the dialog for a done node, which has no failure-reason list
- **THEN** no separator is drawn

#### Scenario: Node with no recorded failure reasons

- **WHEN** the operator opens the dialog for a pending or error node that has recorded no failure reason yet
- **THEN** the separator is drawn and the existing "no failure reasons available" text appears below it, in place of the list

### Requirement: Each failure reason is shown with the time it was recorded

For a node in the pending or error column, the dialog SHALL show, for each recorded failure reason the backend supplies a time for, the time at which that reason was recorded, so the failure history reads as a chronological record rather than an unordered set of strings. That time SHALL be rendered in the dialog's localized date-and-time format — not ISO-8601 — and SHALL include seconds, since a retry cycle can record several failures within one minute. A failure reason the backend supplies without a time SHALL still be shown, with its time omitted.

#### Scenario: Failure reasons carry their times

- **WHEN** the operator opens the dialog for an error node whose recorded failure reasons carry times
- **THEN** each reason is shown together with the time it was recorded, in the dialog's localized format and including seconds

#### Scenario: Distinguishing a long-stuck node from a fast retry burst

- **GIVEN** two error nodes, one whose failures were recorded seconds apart and one whose failures span two days
- **WHEN** the operator opens each node's dialog
- **THEN** the times shown make the difference apparent without consulting the server logs

#### Scenario: Failure reason without a time

- **WHEN** the backend supplies a recorded failure reason with no time (for example a reason recorded before times were kept)
- **THEN** that reason is still shown in full, with no time and no placeholder in its place

#### Scenario: Times are never shown in ISO-8601

- **WHEN** any time is rendered anywhere in the node detail dialog
- **THEN** it uses the view's localized date-and-time format, not an ISO-8601 string
