## MODIFIED Requirements

### Requirement: Filtering the event list

The events page SHALL let the user filter the event list by matched
person name and by a date/time range. Filters SHALL be combinable and
SHALL update the displayed list without navigating away from the page.

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
- **WHEN** the user sets both a person-name filter and a date/time range
- **THEN** the list shows only events that satisfy both filters

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
