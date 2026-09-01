# kiosk-personen-events-page Specification

## Purpose

Lets kiosk users browse and review past Keller person-detection events —
who was seen, when, with a snapshot and clip — without leaving the kiosk
UI or opening Frigate's own interface.

## Requirements

### Requirement: Events page reachable from Kiosk Personen

The `KioskPersonen` page SHALL show an "Events" `KioskLinkPanel` button,
positioned directly below the existing "Personen" (management) button,
matching its width. Tapping it SHALL open the events page. The events
page SHALL show a back link returning to `KioskPersonen`. The events page
SHALL NOT be reachable from the kiosk overview.

#### Scenario: Events button shown on Kiosk Personen
- **WHEN** the user views the `KioskPersonen` page
- **THEN** an "Events" button is shown directly below the "Personen"
  button, the same width as the other buttons in that column

#### Scenario: Opening the events page
- **WHEN** the user taps the "Events" button
- **THEN** the events page opens

#### Scenario: Returning to Kiosk Personen
- **WHEN** the user taps the back link on the events page
- **THEN** the `KioskPersonen` page opens

### Requirement: Past event list

The events page SHALL load and display past (completed) person-detection
events for the Keller camera, most recent first, each shown with its
snapshot thumbnail, resolved person name (or an "unknown" indicator when
no name was matched), timestamp, and zone(s) when the event carries any.
The page SHALL show an empty state when there are no events and an error
state if loading fails.

#### Scenario: Events listed most recent first
- **WHEN** past events exist for the Keller camera
- **THEN** they are shown in the list ordered from most recent to oldest,
  each with its thumbnail, name (or "unknown"), timestamp, and zone(s)
  when present

#### Scenario: No zone data on an event
- **WHEN** a listed event carries no zone information
- **THEN** its entry omits any zone text rather than showing an empty or
  placeholder value

#### Scenario: No past events
- **WHEN** there are no past events for the Keller camera
- **THEN** the page shows an empty state instead of a list

#### Scenario: Event source unreachable
- **WHEN** loading past events fails (e.g. the detection source is
  unreachable)
- **THEN** the page shows an error state rather than an empty or stale
  list

### Requirement: Filtering the event list

The events page SHALL let the user filter the event list by matched
person name and by a date/time range. Filters SHALL be combinable and
SHALL update the displayed list without navigating away from the page.

#### Scenario: Filtering by person name
- **WHEN** the user selects a specific person name in the filter
- **THEN** the list shows only events matched to that person

#### Scenario: Filtering by date/time range
- **WHEN** the user sets a date/time range in the filter
- **THEN** the list shows only events whose timestamp falls within that
  range

#### Scenario: Combining filters
- **WHEN** the user sets both a person-name filter and a date/time range
- **THEN** the list shows only events that satisfy both filters

#### Scenario: Clearing filters
- **WHEN** the user clears an active filter
- **THEN** the list returns to showing all past events (subject to any
  remaining active filter)

### Requirement: Event detail view

Selecting an event from the list SHALL open a detail view showing the
event's full snapshot and, when a recorded clip is available for that
event, playback of the clip. When no clip is available, the detail view
SHALL show the snapshot alone rather than an error.

When the space available to the detail view is too small to show both
media elements at a usable size, the detail view SHALL drop the still
snapshot in favor of the clip. An event without a clip SHALL keep its
snapshot at every viewport size.

#### Scenario: Selecting an event with a clip
- **WHEN** the user selects an event that has a recorded clip
- **THEN** the detail view shows the full snapshot and lets the user play
  the clip

#### Scenario: Selecting an event without a clip
- **WHEN** the user selects an event that has no recorded clip
- **THEN** the detail view shows the full snapshot without a playback
  control or error

#### Scenario: Clip event on a viewport too small for both media
- **WHEN** the user selects an event that has a recorded clip and the
  viewport is too small to show snapshot and clip together at a usable
  size
- **THEN** the detail view shows the clip and omits the snapshot, rather
  than shrinking both

#### Scenario: Clipless event on a small viewport
- **WHEN** the user selects an event that has no recorded clip on a
  viewport too small to show it at full size
- **THEN** the snapshot is still shown, scaled down to fit the available
  space

#### Scenario: Closing the detail view
- **WHEN** the user closes the detail view
- **THEN** the events list is shown again

### Requirement: Detail view fits the viewport

The event detail view SHALL fit within the viewport at every viewport
size instead of extending beyond it. Its content SHALL never displace the
event title or the closing controls out of view: when the content does
not fit, only the content area SHALL scroll while title and controls
remain in place.

The detail view SHALL make use of the full viewport on the smallest
viewports rather than leaving unusable margins around a fixed-width
panel.

#### Scenario: Detail view taller than the viewport
- **WHEN** an event's detail content is taller than the available
  viewport height
- **THEN** the detail view stays within the viewport and its content area
  scrolls, with the event title and the closing controls remaining
  visible

#### Scenario: Narrow viewport
- **WHEN** the detail view is opened on a viewport narrower than its
  preferred width
- **THEN** it occupies the available width instead of overflowing it
  horizontally

#### Scenario: Short landscape viewport
- **WHEN** the detail view is opened on a short landscape viewport (for
  example a kiosk tablet in landscape)
- **THEN** the closing controls are visible without scrolling and the
  media is fitted to the remaining height

### Requirement: Closing control always reachable

The event detail view SHALL offer a closing control that is visible
without scrolling at every viewport size, independently of how much
content the event carries. Activating any of the view's closing controls
SHALL return to the events list.

#### Scenario: Close control visible on a small viewport
- **WHEN** the detail view is opened on any supported viewport size
- **THEN** at least one closing control is visible without scrolling the
  detail view

#### Scenario: Closing from the always-visible control
- **WHEN** the user activates the always-visible closing control
- **THEN** the detail view closes and the events list is shown again,
  identically to closing from the actions row

### Requirement: Event list keeps itself current

While the events page is open, it SHALL keep its event list current
without user interaction: a person event that completes after the list was
loaded SHALL appear in the list on its own, in the same
most-recent-first order as the events already shown, and SHALL be shown
with the same thumbnail, name, timestamp and zone information as any
other entry.

The refresh SHALL honour the filters currently active on the page: an
event excluded by the active person-name filter or date/time range SHALL
NOT appear. An event already shown SHALL NOT be added a second time.

#### Scenario: New event while the page is open
- **WHEN** a new person event completes for the Keller camera while the
  user has the events page open
- **THEN** its tile appears at the top of the list without the user
  reloading, filtering or navigating

#### Scenario: New event excluded by the active filter
- **WHEN** a new person event completes while a person-name filter or a
  date/time range is active and the new event does not satisfy it
- **THEN** the event is not added to the displayed list

#### Scenario: Event already shown
- **WHEN** a refresh returns events that are already in the displayed
  list
- **THEN** each event remains present exactly once, without duplicate
  tiles

#### Scenario: Event completing out of order
- **WHEN** an event whose start time precedes the newest event on screen
  only completes later
- **THEN** it is inserted at the position its start time gives it in the
  most-recent-first order, rather than being skipped

### Requirement: Refreshing does not disturb the user

The automatic refresh SHALL be invisible except for the arriving events.
It SHALL NOT show the initial loading state, SHALL NOT reload or
re-render the tiles already on screen, and SHALL NOT discard older pages
the user has paged in with "load more". The user's viewing position SHALL
be preserved: arriving events SHALL NOT push the content the user is
currently looking at out from under them.

#### Scenario: Refresh with a detail view open
- **WHEN** an event arrives while the user has an event's detail view
  open
- **THEN** the detail view stays open and keeps showing its event's
  snapshot and clip, with the new tile added to the list behind it

#### Scenario: Refresh after paging in older events
- **WHEN** the user has loaded additional pages of older events and a new
  event arrives
- **THEN** the older pages stay in the list and the new event is added to
  it, rather than the list falling back to its first page

#### Scenario: Refresh while scrolled into the list
- **WHEN** an event arrives while the user has scrolled away from the top
  of the list
- **THEN** the events the user is looking at stay where they are on
  screen

### Requirement: Refresh failures leave the list standing

A failed automatic refresh SHALL leave the currently displayed list, its
filters and any open detail view untouched, and SHALL NOT replace the
list with the error or empty state. The page SHALL resume updating on its
own once refreshing succeeds again. The error state SHALL remain reserved
for a failed initial load, and the empty state for a successful load that
returned no events.

#### Scenario: Detection source unreachable during a refresh
- **WHEN** an automatic refresh fails because the detection source is
  unreachable
- **THEN** the list keeps showing the events it already has instead of
  switching to the error or empty state

#### Scenario: Detection source reachable again
- **WHEN** refreshing succeeds again after one or more failed refreshes
- **THEN** events that completed in the meantime appear in the list

### Requirement: Refreshing is bound to the page

The page SHALL refresh only while it is open. Leaving the events page
SHALL stop the refreshing, and no refresh started before leaving SHALL
write into the page afterwards. Changing a filter SHALL leave the page
refreshing under the new filter, with no result of the previous filter
arriving late into the new list.

#### Scenario: Leaving the page
- **WHEN** the user leaves the events page
- **THEN** no further refreshing takes place

#### Scenario: Filter changed while a refresh is in flight
- **WHEN** the user changes a filter while an automatic refresh is still
  in flight
- **THEN** the list shows the result of the new filter, unaffected by the
  in-flight refresh of the previous one

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
