## MODIFIED Requirements

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
