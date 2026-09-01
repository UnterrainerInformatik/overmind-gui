## ADDED Requirements

### Requirement: Closing the detail view stops its clip

When an event's detail view is closed while its clip is playing, playback
SHALL stop, and any audio the clip carries SHALL stop with it. No clip
SHALL remain audible or advancing once the view that showed it is no
longer on screen.

This SHALL hold for every way the detail view can be closed, including
the closing controls, dismissing it with the keyboard, and dismissing it
by activating the area outside it — all closing paths SHALL behave
identically in this respect.

Leaving the events page entirely SHALL likewise stop a clip that is
playing.

#### Scenario: Closing from a closing control while the clip plays
- **WHEN** the user activates one of the detail view's closing controls
  while its clip is playing
- **THEN** the clip stops playing and its audio stops, and the events
  list is shown again

#### Scenario: Dismissing with the keyboard
- **WHEN** the user dismisses the detail view with the keyboard while its
  clip is playing
- **THEN** the clip stops playing and its audio stops, exactly as when a
  closing control is used

#### Scenario: Dismissing outside the detail view
- **WHEN** the user dismisses the detail view by activating the area
  outside it while its clip is playing
- **THEN** the clip stops playing and its audio stops, exactly as when a
  closing control is used

#### Scenario: Leaving the page while a clip plays
- **WHEN** the user leaves the events page while an event's clip is
  playing
- **THEN** the clip stops playing and its audio stops

#### Scenario: Clip already finished
- **WHEN** the user closes the detail view of an event whose clip has
  already played to its end
- **THEN** the view closes with no audible or visible artifact

### Requirement: Re-opening an event still plays its clip

Stopping a clip on close SHALL NOT cost the detail view its playback
behavior on the next open: opening an event that has a clip after a
previous detail view was closed SHALL play that event's clip from its
start, whether it is the same event as before or a different one.

#### Scenario: Re-opening the same event
- **WHEN** the user closes an event's detail view and opens the same
  event again
- **THEN** its clip plays from the start, not from where it was stopped
  and not frozen on a frame

#### Scenario: Opening a different event after closing
- **WHEN** the user closes one event's detail view and opens a different
  event that has a clip
- **THEN** the new event's own clip plays from its start, and no part of
  the previous event's clip is shown or heard

### Requirement: A closed detail view releases its clip

Once an event's detail view is closed, the page SHALL NOT retain the clip
data it had loaded for that event. This SHALL hold for every closing
path, and for leaving the page. Reviewing many events one after another
over an unattended kiosk session SHALL NOT accumulate the reviewed clips.

#### Scenario: Clip released on every closing path
- **WHEN** the user closes an event's detail view by any of its closing
  paths, including dismissing it with the keyboard or outside it
- **THEN** the clip data loaded for that event is released rather than
  kept for the rest of the session

#### Scenario: Many events reviewed in one session
- **WHEN** the user opens and closes many events carrying clips over a
  single kiosk session
- **THEN** the page's memory use does not grow with the number of clips
  reviewed
