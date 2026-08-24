## ADDED Requirements

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

## MODIFIED Requirements

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
