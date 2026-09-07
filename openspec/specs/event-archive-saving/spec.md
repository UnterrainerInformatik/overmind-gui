# event-archive-saving Specification

## Purpose

Lets a kiosk user keep a person event beyond the node's own retention by saving
it to the long-term archive from the event's detail view, see at a glance which
events are already saved, and release a saved event again — under the two
distinct meanings that releasing carries depending on whether the original still
exists.

## Requirements

### Requirement: Saving an event from its detail view

The event detail view SHALL offer a control that saves the event to the archive.
Activating it SHALL request the save from the server and SHALL report the outcome
to the user: a confirmation when the server accepted it, and a failure message
naming that the event was not saved when it did not.

A save SHALL NOT close the detail view, and SHALL NOT remove the event from the
list or change its position in it.

While a save is in flight the control SHALL indicate that it is working and SHALL
NOT be activatable a second time, so one event cannot be saved twice by an
impatient second tap.

#### Scenario: Saving an event
- **WHEN** the user activates the save control on an event that is not yet saved
- **THEN** the event is saved on the server, the user is told it was saved, and
  the detail view stays open showing the same event

#### Scenario: The save is refused
- **WHEN** the server refuses or fails to save the event
- **THEN** the user is told that the event was not saved, and the event keeps
  being offered for saving rather than being marked as saved

#### Scenario: Second activation while the save runs
- **WHEN** the user activates the save control again while the first save is
  still in flight
- **THEN** no second save is requested

### Requirement: An already saved event is recognisable

An event that is already in the archive SHALL be marked as saved in its detail
view, and SHALL NOT offer the save control there. The list entry of such an event
SHALL carry the same marking.

Whether an event is saved SHALL be determined from the archive's own contents —
the archive entry naming the event it was made from — and not from a flag on the
event itself. An event that exists both in the archive and at its source SHALL be
shown once, as the saved one.

An archive entry that the server reports as still being prepared SHALL count as
saved and be marked as such; an entry the server reports as failed SHALL be
visibly distinguished from a completed one rather than silently counting as
saved.

#### Scenario: Opening an event that is already saved
- **WHEN** the user opens the detail view of an event that is in the archive
- **THEN** the view marks it as saved and offers no save control

#### Scenario: A saved event in the list
- **WHEN** the list shows an event that is in the archive
- **THEN** its entry carries the saved marking, and the event appears exactly
  once rather than twice

#### Scenario: An archive entry still being prepared
- **WHEN** an event was saved a moment ago and the archive reports its entry as
  still being prepared
- **THEN** the event counts and is marked as saved

#### Scenario: An archive entry that failed
- **WHEN** the archive reports an entry as failed
- **THEN** the event is not presented as safely saved, and the failure is
  visible to the user

### Requirement: Releasing a saved event

The detail view of a saved event SHALL offer a control that releases it from the
archive, and SHALL require an explicit confirmation before doing so. Cancelling
the confirmation SHALL leave the archive entry untouched.

The control SHALL carry one of two meanings, and SHALL say in its own wording and
in its confirmation which one applies:

- when the original is still held at its source for **more than one day**, the
  control SHALL present the action as no longer keeping the event — the copy goes,
  the event itself remains available until its ordinary retention passes;
- when the original is **already gone, or is held for one day or less**, the
  control SHALL present the action as a final deletion, in wording distinct from
  the first case.

Releasing SHALL report its outcome to the user, and a failed release SHALL leave
the event marked as saved.

#### Scenario: Original still held for several days
- **WHEN** the user opens a saved event whose original is still held at its
  source for more than one day
- **THEN** the control offers to no longer keep the event, and its confirmation
  says that the event itself remains available

#### Scenario: Original about to expire
- **WHEN** the user opens a saved event whose original expires within one day
- **THEN** the control offers a deletion, and its confirmation says that the
  event is gone for good

#### Scenario: Original already gone
- **WHEN** the user opens a saved event whose original is no longer held at its
  source
- **THEN** the control offers a deletion, exactly as in the expiring case

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
treated as one whose original is gone.

When the server does state how much longer the original is held, the detail view
SHALL show that remaining time alongside the release control.

#### Scenario: The server states no remaining time
- **WHEN** an archive entry carries no statement about its original
- **THEN** the release control presents a deletion, on the assumption that the
  original is gone

#### Scenario: Remaining time shown
- **WHEN** an archive entry states that its original is still held for a period
- **THEN** the detail view shows how much longer the event remains available at
  its source

### Requirement: Playback of a saved event comes from the archive

Once an event is saved, its detail view SHALL play the archived copy, including
while the original is still available at its source. The user SHALL NOT have to
choose a source, and nothing in the view SHALL change when the original later
expires.

#### Scenario: Playing a freshly saved event
- **WHEN** the user plays a saved event whose original still exists
- **THEN** the archived copy is played

#### Scenario: Playing a saved event after its original expired
- **WHEN** the user plays a saved event whose original has since expired
- **THEN** the archived copy is played, exactly as before, with no change in the
  view

#### Scenario: The archived copy is not ready yet
- **WHEN** the user plays an event whose archive entry is still being prepared
- **THEN** the view states that the saved copy is not ready yet instead of
  failing silently

### Requirement: The archive is not required for the events page

The events page SHALL remain fully usable when the archive cannot be read. In
that case no saved markings SHALL be shown, the event list, its filters and its
automatic refresh SHALL behave exactly as they do without the archive, and the
page SHALL NOT show its own error state on account of the archive.

An attempt to save while the archive cannot be reached SHALL report its failure
rather than appear to have succeeded.

#### Scenario: Archive unreachable while the page loads
- **WHEN** the archive cannot be read as the events page loads
- **THEN** the page shows its events as usual, without saved markings and
  without an error state of its own

#### Scenario: Archive unreachable during a refresh
- **WHEN** the archive cannot be read during an automatic refresh
- **THEN** the markings already shown are left as they are and the list keeps
  updating

#### Scenario: Saving while the archive is unreachable
- **WHEN** the user activates the save control and the archive cannot be reached
- **THEN** the user is told that the event was not saved
