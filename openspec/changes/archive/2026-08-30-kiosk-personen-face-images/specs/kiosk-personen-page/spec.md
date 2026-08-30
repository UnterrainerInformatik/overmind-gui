## ADDED Requirements

### Requirement: Personen management button below the back button

The `KioskPersonen` page SHALL show a second navigation button, labeled
"Personen", positioned directly below the existing back button and
matching the back button's width. Tapping it SHALL open the person/face
management page.

#### Scenario: Button shown below the back button
- **WHEN** the user views the `KioskPersonen` page
- **THEN** a "Personen" button is shown directly below the back button,
  the same width as the back button

#### Scenario: Opening the management page
- **WHEN** the user taps the "Personen" button
- **THEN** the person/face management page opens
