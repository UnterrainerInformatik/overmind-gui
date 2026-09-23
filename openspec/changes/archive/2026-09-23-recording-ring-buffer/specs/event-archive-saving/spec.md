## ADDED Requirements

### Requirement: Saving into a full archive displaces the oldest entries

A full archive SHALL NOT be a reason for a save to fail. The server makes room by
dropping the archive's oldest entries, and the events page SHALL treat such a save
as any other accepted save.

The confirmation of a save SHALL NOT promise that the entry is kept forever. An
event whose archive entry has been displaced SHALL again be shown as not saved,
exactly as after a release.

#### Scenario: Saving while the archive is full
- **WHEN** the user saves an event while the archive is full
- **THEN** the save is confirmed like any other, and the event is shown as saved

#### Scenario: A saved event has been displaced
- **WHEN** an event's archive entry was dropped to make room for newer entries
- **THEN** the event, while its original still exists, is shown as not saved and
  is offered for saving again
