## ADDED Requirements

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
