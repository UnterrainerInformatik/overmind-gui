## MODIFIED Requirements

### Requirement: Filtering the event list

The events page SHALL let the user filter the event list by camera, by matched
person name and by a date/time range. Filters SHALL be combinable and
SHALL update the displayed list without navigating away from the page.

The camera filter SHALL offer every camera configured for the events page, in
the configured order, plus a choice covering all of them. It SHALL default to
covering all of them, and SHALL be offered only when more than one camera is
configured — with a single camera there is nothing to choose between. Selecting
one camera SHALL narrow what the page reads from the event source rather than
only what it displays, so that paging back through older events under the filter
yields that camera's events rather than a page thinned by the filter. While one
camera is selected, a camera whose events cannot be read SHALL be reported only
when it is the selected one.

An event MAY name more than one recognised person at once. Filtering by a
person name SHALL show such an event when the chosen name is among the ones it
names, and the entry SHALL keep the label the event source reported rather
than being relabelled with the name that was searched for.

The page SHALL open with a bounded date/time range already selected, so that
its first read of the event source is bounded regardless of how much history
the source holds. The preselected range SHALL end at the present and SHALL
cover the preceding two hours.

The page SHALL additionally offer a set of quick ranges — two hours, twelve
hours, twenty-four hours and seven days — each of which, when chosen, SHALL
set the date/time range to that period ending at the present. Choosing a
quick range SHALL be reflected in the date/time range controls, and the
range SHALL remain editable afterwards through those controls. The range
SHALL remain clearable, and clearing it SHALL leave the list unbounded in
time.

A range that ends at the present SHALL leave its upper bound open rather
than pinning it to the moment it was chosen, so that events completing
afterwards remain within the range and continue to reach the list while the
page stays open. A range whose upper bound the user sets explicitly SHALL be
honoured as given.

#### Scenario: Filtering by camera
- **WHEN** the user selects one camera in the filter
- **THEN** the list shows only that camera's events, and paging back for older
  events keeps showing only that camera's events

#### Scenario: Covering all cameras again
- **WHEN** the user selects the choice covering all cameras
- **THEN** the list shows the events of every configured camera again, merged in
  time order

#### Scenario: Opening the page with several cameras configured
- **WHEN** the user opens the events page and more than one camera is configured
- **THEN** a camera filter is offered, set to cover all cameras, and the list
  shows every configured camera's events

#### Scenario: Only one camera configured
- **WHEN** only one camera is configured for the events page
- **THEN** no camera filter is offered and the list shows that camera's events

#### Scenario: A camera outside the filter is unavailable
- **WHEN** one camera is selected in the filter and a different configured
  camera cannot be reached
- **THEN** the page does not report that camera as unreachable, because its
  events were not asked for

#### Scenario: Filtering by person name
- **WHEN** the user selects a specific person name in the filter
- **THEN** the list shows only events matched to that person

#### Scenario: Event naming several persons
- **WHEN** an event names several recognised persons and the user filters by
  one of them
- **THEN** the event appears in the list, labeled with all the persons it
  names rather than only the one filtered for

#### Scenario: Filtering by date/time range
- **WHEN** the user sets a date/time range in the filter
- **THEN** the list shows only events whose timestamp falls within that
  range

#### Scenario: Combining filters
- **WHEN** the user selects a camera and also sets a person-name filter and a
  date/time range
- **THEN** the list shows only events that satisfy all of them

#### Scenario: Clearing filters
- **WHEN** the user clears an active filter
- **THEN** the list returns to showing all past events (subject to any
  remaining active filter)

#### Scenario: Opening the page
- **WHEN** the user opens the events page
- **THEN** the date/time range is already set to the last two hours, the
  range controls show it, and the list shows the events from that period
  rather than from the whole history

#### Scenario: Choosing a quick range
- **WHEN** the user chooses one of the quick ranges
- **THEN** the date/time range is set to that period ending at the present,
  the range controls show it, and the list updates to it

#### Scenario: Adjusting a quick range by hand
- **WHEN** the user chooses a quick range and then edits the date/time range
  controls
- **THEN** the edited range takes effect, without the quick range being
  reapplied over it

#### Scenario: Event arriving under a preselected range
- **WHEN** a person event completes while the page is showing a preselected
  or quick-chosen range that ends at the present
- **THEN** the event reaches the list rather than being excluded for lying
  past the moment the range was chosen

#### Scenario: Explicit upper bound honoured
- **WHEN** the user sets an upper bound on the date/time range by hand
- **THEN** events completing after that bound do not appear in the list

#### Scenario: Clearing the preselected range
- **WHEN** the user clears the date/time range the page opened with
- **THEN** the list is no longer bounded in time and shows past events
  irrespective of age

### Requirement: Event list keeps itself current

While the events page is open, it SHALL keep its event list current
without user interaction: a person event that completes after the list was
loaded SHALL appear in the list on its own, in the same
most-recent-first order as the events already shown, and SHALL be shown
with the same thumbnail, name, timestamp and zone information as any
other entry.

The refresh SHALL honour the filters currently active on the page: an
event excluded by the active camera filter, person-name filter or date/time
range SHALL NOT appear. An event already shown SHALL NOT be added a second time.

#### Scenario: New event while the page is open
- **WHEN** a new person event completes for the Keller camera while the
  user has the events page open
- **THEN** its tile appears at the top of the list without the user
  reloading, filtering or navigating

#### Scenario: New event on a camera outside the filter
- **WHEN** a new person event completes on a camera other than the one
  selected in the camera filter
- **THEN** the event is not added to the displayed list

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
