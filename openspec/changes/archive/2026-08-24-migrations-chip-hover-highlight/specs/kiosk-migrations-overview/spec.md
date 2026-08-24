## ADDED Requirements

### Requirement: Pointer hover highlights the individual node chip

When the operator points at a node chip with a pointing device, the system SHALL visually highlight that chip alone. Hovering SHALL NOT change the background of the migration entry's table, of a status column, or of any node chip other than the one under the pointer. Hover highlighting SHALL be applied only to node chips that open a node's detail dialog when clicked, so that the highlight marks what is interactive.

#### Scenario: Hovering a clickable node chip

- **WHEN** the operator moves a pointing device over a pending or error node chip
- **THEN** that chip's background changes to indicate it is under the pointer, and no other chip and no part of the surrounding table changes appearance

#### Scenario: Hovering a non-clickable node chip

- **WHEN** the operator moves a pointing device over a done node chip, which has no detail dialog
- **THEN** the chip's appearance does not change

#### Scenario: Hovering the table outside any chip

- **WHEN** the operator moves a pointing device over a column heading, over the space between two node chips, or over a column with no nodes
- **THEN** the migration entry's table keeps its normal background and no highlight is shown

#### Scenario: Touch interaction leaves no chip highlighted

- **GIVEN** the overview is displayed on the kiosk touch tablet
- **WHEN** the operator taps a pending or error node chip and closes the detail dialog
- **THEN** no chip remains in a highlighted state
