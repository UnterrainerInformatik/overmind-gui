## ADDED Requirements

### Requirement: Events button below the management button

The `KioskPersonen` page SHALL show a third navigation button, labeled
"Events", positioned directly below the "Personen" (management) button
and matching its width. Tapping it SHALL open the events page.

#### Scenario: Button shown below the management button
- **WHEN** the user views the `KioskPersonen` page
- **THEN** an "Events" button is shown directly below the "Personen"
  button, the same width as the other buttons in that column

#### Scenario: Opening the events page
- **WHEN** the user taps the "Events" button
- **THEN** the events page opens
