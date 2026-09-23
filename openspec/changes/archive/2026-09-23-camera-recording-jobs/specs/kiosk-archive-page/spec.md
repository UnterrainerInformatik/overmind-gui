## MODIFIED Requirements

### Requirement: The kept entries are listed

The archive page SHALL load and display the archive's entries for the cameras
configured for the events page, most recent first. Each entry SHALL be shown
with:
- its thumbnail;
- the person name it carries, or an "unknown" indicator when it names nobody;
- its timestamp;
- its zone(s), where it has any;
- which camera it was kept from, when more than one camera is configured.

An entry that is not an event, such as a recording kept by a recording job,
SHALL be named by its kind instead ("Aufzeichnung" for a recording). It SHALL
NOT be shown as an unknown person.

An entry SHALL be listed whether or not its original still exists at its source.
An entry whose original has expired SHALL be listed exactly like any other, and
SHALL NOT be marked as diminished for having outlived it.

Each entry SHALL be listed once.

The page SHALL show an empty state when the archive holds nothing for the
current filters.

#### Scenario: Entries listed most recent first
- **WHEN** the archive holds entries for a configured camera
- **THEN** they are shown from most recent to oldest, each with its thumbnail,
  name (or "unknown"), timestamp and zone(s) where present

#### Scenario: A recording among the entries
- **WHEN** the archive holds an entry of kind recording, which carries no person
- **THEN** it is listed named "Aufzeichnung" with its thumbnail, start time and
  camera, not as an unknown person

#### Scenario: An entry whose original is gone
- **WHEN** the archive holds an entry whose original has expired at its source
- **THEN** it is listed like every other entry, and playing it plays the kept
  copy

#### Scenario: Several cameras configured
- **WHEN** more than one camera is flagged for the events page
- **THEN** the archive's entries for all of them appear in one list ordered by
  time, each entry showing which camera it came from

#### Scenario: Nothing kept in the chosen range
- **WHEN** the archive holds no entry matching the active filters
- **THEN** the page states that nothing is kept for them, rather than showing an
  error
