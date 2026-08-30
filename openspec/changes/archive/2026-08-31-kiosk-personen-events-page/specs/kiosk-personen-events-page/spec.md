## Purpose

Lets kiosk users browse and review past Keller person-detection events —
who was seen, when, with a snapshot and clip — without leaving the kiosk
UI or opening Frigate's own interface.

## ADDED Requirements

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

#### Scenario: Selecting an event with a clip
- **WHEN** the user selects an event that has a recorded clip
- **THEN** the detail view shows the full snapshot and lets the user play
  the clip

#### Scenario: Selecting an event without a clip
- **WHEN** the user selects an event that has no recorded clip
- **THEN** the detail view shows the full snapshot without a playback
  control or error

#### Scenario: Closing the detail view
- **WHEN** the user closes the detail view
- **THEN** the events list is shown again
