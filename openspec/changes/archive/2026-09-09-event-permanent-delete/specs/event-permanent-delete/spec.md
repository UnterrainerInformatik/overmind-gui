## Purpose

Lets a user remove an unwanted clip, video or recording from the system for good
— at its source and in the long-term archive alike — from the same view the
recording is watched in, under a confirmation that says plainly that nothing of
it is kept.

## ADDED Requirements

### Requirement: A delete control wherever a recording is offered

Every view that offers a clip, video or recording for playback SHALL offer a
control that deletes that recording permanently. This holds for the detail view
of a person event, for the archive's own view of a saved entry, and for any
further list of recordings the GUI gains.

The control SHALL be presented as destructive, and SHALL be worded so that it is
not mistaken for the control that only releases an archive copy.

A view that offers no playback of a recording SHALL NOT offer the control.

#### Scenario: Opening a recording
- **WHEN** the user opens a view that plays a clip, video or recording
- **THEN** that view offers a control to delete the recording permanently,
  marked as destructive

#### Scenario: The events list itself
- **WHEN** the user looks at the list of events without opening one
- **THEN** the list entries offer no delete control, the deletion being offered
  where the recording is watched

### Requirement: Deleting removes the recording everywhere

Activating the delete control and confirming it SHALL remove the recording at its
source and every archive copy made from it, as one action of the user.

A recording that exists only at its source, and a recording that exists only in
the archive because its original has expired, SHALL both be deletable by the same
control, and the user SHALL NOT have to know which of the two cases applies.

The GUI SHALL NOT leave a copy behind on the assumption that removing one of the
two removes the other; where both exist it SHALL account for both.

#### Scenario: Deleting an event that was never saved
- **WHEN** the user deletes an event that has no archive copy
- **THEN** the event and its media are removed at their source

#### Scenario: Deleting a saved event
- **WHEN** the user deletes an event that also exists in the archive
- **THEN** both the original and the archive copy are gone afterwards

#### Scenario: Deleting an archive-only entry
- **WHEN** the user deletes an entry whose original has already expired
- **THEN** the archive copy is removed, and the user is given the same control
  and the same wording as in every other case

### Requirement: Deletion is confirmed before it happens

The delete control SHALL require an explicit confirmation before anything is
removed. The confirmation SHALL name what is about to be deleted, SHALL state
that the recording is removed in every place it is kept, and SHALL state that
this cannot be undone.

Cancelling the confirmation SHALL leave everything untouched, and SHALL leave the
view exactly as it was.

The confirmation's wording SHALL differ from the confirmation of an archive
release, so that the two are not read as the same action.

#### Scenario: Confirming
- **WHEN** the user activates the delete control and confirms
- **THEN** the recording is deleted

#### Scenario: Cancelling
- **WHEN** the user activates the delete control and cancels the confirmation
- **THEN** nothing is deleted, and the view still shows the recording and its
  controls unchanged

#### Scenario: What the confirmation says
- **WHEN** the confirmation is shown
- **THEN** it says that the recording is removed everywhere it is kept and that
  the deletion cannot be undone

### Requirement: The view follows the deletion

Once a deletion has succeeded, the deleted recording SHALL disappear from the
GUI without waiting for the next automatic refresh: the detail view that showed
it SHALL close, and its entry SHALL leave the list it was listed in, including
any marking the archive gave it.

The rest of the list SHALL stay as it is — its filters, its scroll position and
its automatic refresh SHALL be unaffected, and no other entry SHALL move out of
view because one was removed.

The user SHALL be told that the recording was deleted.

#### Scenario: After a successful deletion
- **WHEN** the deletion succeeds
- **THEN** the detail view closes, the entry is gone from the list, and the user
  is told that the recording was deleted

#### Scenario: The rest of the list
- **WHEN** an entry is removed by a deletion
- **THEN** the remaining entries, the active filters and the automatic refresh
  are unchanged

### Requirement: A refused or half-finished deletion is reported honestly

A deletion that the server refuses or that fails SHALL be reported as a failure,
and the recording SHALL stay listed, playable and marked exactly as before.

Where a deletion covers two places and only one of them succeeds, the GUI SHALL
report that the recording was not fully removed and SHALL say which part is
still there, rather than reporting a plain success or a plain failure.

While a deletion is in flight the control SHALL indicate that it is working and
SHALL NOT be activatable a second time.

#### Scenario: The server refuses
- **WHEN** the server refuses or fails the deletion
- **THEN** the user is told that the recording was not deleted, and the entry
  stays in the list with its previous marking

#### Scenario: Only one of two places was cleared
- **WHEN** the original is deleted but its archive copy is not, or the reverse
- **THEN** the user is told that the recording was only partly removed, naming
  what is still kept

#### Scenario: Second activation while the deletion runs
- **WHEN** the user activates the delete control again while the deletion is
  still in flight
- **THEN** no second deletion is requested

### Requirement: Deletion is offered to every user of the view

The delete control SHALL be offered to every user who can open the view, and the
confirmation SHALL be the only barrier.

The GUI SHALL NOT check a role or permission before offering or performing the
deletion, and SHALL NOT carry code that appears to do so. It holds no identity it
could check against, and a check against an absent identity is a false assurance
rather than a protection.

#### Scenario: Any user of the page
- **WHEN** any user opens a view that plays a recording
- **THEN** the delete control is offered, guarded by the confirmation alone

#### Scenario: No role condition in the way
- **WHEN** the GUI decides whether to offer or perform the deletion
- **THEN** no role or permission is consulted
