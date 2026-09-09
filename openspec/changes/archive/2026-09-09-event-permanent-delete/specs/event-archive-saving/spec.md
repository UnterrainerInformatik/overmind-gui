## MODIFIED Requirements

### Requirement: Releasing a saved event

The detail view of a saved event whose original is still held at its source SHALL
offer a control that releases it from the archive, and SHALL require an explicit
confirmation before doing so. Cancelling the confirmation SHALL leave the archive
entry untouched.

Releasing SHALL only ever remove the archive copy. It SHALL present the action as
no longer keeping the event — the copy goes, the event itself remains available
until its ordinary retention passes — and its confirmation SHALL say so.

Where the original is **already gone, or is held for one day or less**, the detail
view SHALL NOT offer the release control at all: with no original to fall back on
there is only one meaning left, and it belongs to the permanent delete control,
which SHALL be offered there in its place.

Releasing SHALL report its outcome to the user, and a failed release SHALL leave
the event marked as saved.

#### Scenario: Original still held for several days
- **WHEN** the user opens a saved event whose original is still held at its
  source for more than one day
- **THEN** the control offers to no longer keep the event, and its confirmation
  says that the event itself remains available

#### Scenario: Original about to expire
- **WHEN** the user opens a saved event whose original expires within one day
- **THEN** no release control is offered, and the permanent delete control is
  offered in its place

#### Scenario: Original already gone
- **WHEN** the user opens a saved event whose original is no longer held at its
  source
- **THEN** no release control is offered, and the permanent delete control is
  offered in its place, exactly as in the expiring case

#### Scenario: Confirming a release
- **WHEN** the user confirms the release
- **THEN** the archive entry is removed on the server, the user is told so, and
  the event no longer shows as saved

#### Scenario: Cancelling a release
- **WHEN** the user cancels the confirmation
- **THEN** nothing is removed and the event stays marked as saved

#### Scenario: The release is refused
- **WHEN** the server refuses or fails to remove the archive entry
- **THEN** the user is told that it was not removed, and the event stays marked
  as saved

### Requirement: The state of the original is read, not computed

How long the original of a saved event is still held SHALL be taken from what the
server states for that archive entry. The GUI SHALL NOT derive it from the event's
own timestamp, a configured retention, or any other local assumption, as the
installation's retention is not known to it.

An archive entry for which the server states nothing about the original SHALL be
treated as one whose original is gone, and its detail view SHALL therefore offer
the permanent delete rather than a release.

When the server does state how much longer the original is held, the detail view
SHALL show that remaining time alongside the control it offers.

#### Scenario: The server states no remaining time
- **WHEN** an archive entry carries no statement about its original
- **THEN** the view treats the original as gone and offers the permanent delete
  instead of a release

#### Scenario: Remaining time shown
- **WHEN** an archive entry states that its original is still held for a period
- **THEN** the detail view shows how much longer the event remains available at
  its source
