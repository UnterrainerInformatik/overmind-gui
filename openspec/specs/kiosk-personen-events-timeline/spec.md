# kiosk-personen-events-timeline Specification

## Purpose

Gives the kiosk events page a vertical time axis beside its tile grid, so the
distribution of person detections over the selected period — bursts, gaps,
clusters — is readable at a glance instead of having to be reconstructed from
individual tile timestamps, and so a point in time can be used to navigate to
the tile that belongs to it.

## Requirements

### Requirement: Vertical event timeline beside the grid

The events page SHALL show a vertical timeline along the side of the event
grid opposite the reading direction's start, occupying the full height of the
viewport. The timeline SHALL remain in place while the event grid scrolls,
so it is available without scrolling to it.

The timeline SHALL plot every event currently in the displayed list as a mark
positioned along its length according to the event's timestamp, with the axis
oriented so that the most recent end corresponds to the top of the list order.
Marks SHALL be rendered as lines or rectangles rather than as thumbnails or
text.

#### Scenario: Timeline present on the events page
- **WHEN** the user opens the events page
- **THEN** a vertical timeline is shown beside the event grid, spanning the
  full viewport height

#### Scenario: Timeline stays put while the grid scrolls
- **WHEN** the user scrolls the event grid
- **THEN** the timeline remains fully visible in place rather than scrolling
  out of view with the tiles

#### Scenario: Every listed event is marked
- **WHEN** the list holds events
- **THEN** each of them is represented by one mark on the timeline, placed
  according to its timestamp

#### Scenario: Distribution is visible
- **WHEN** several events fall close together in time and others are far
  apart
- **THEN** their marks are grouped and spaced accordingly, so the clustering
  is visible without reading any timestamp

### Requirement: Timeline spans the active time range

The timeline's extent SHALL correspond to the time range the page is
currently filtered to, so that a mark's position along the timeline is
readable as a time within that range. When the active filters leave the range
open-ended, the timeline SHALL span the timestamps of the events currently
listed instead.

When the active time range changes, the timeline SHALL rescale to the new
range.

#### Scenario: Timeline scaled to a bounded range
- **WHEN** a time range is active on the page
- **THEN** the timeline spans that range, and an event's mark sits at the
  position its timestamp holds within it

#### Scenario: Timeline with no bounded range
- **WHEN** no time range is active
- **THEN** the timeline spans the period covered by the listed events

#### Scenario: Range changed
- **WHEN** the user changes the active time range
- **THEN** the timeline rescales to the new range and the marks are
  repositioned accordingly

### Requirement: Activating a mark reveals its tile

Activating a mark on the timeline SHALL highlight the corresponding event's
tile in the grid and bring that tile into view, scrolling the grid as needed.
The highlight SHALL make clear which tile the activated mark refers to, and
SHALL be distinguishable from the tiles around it.

Activating a mark SHALL NOT open the event's detail view and SHALL NOT start
playback of its clip. Opening an event SHALL remain exclusively an activation
of the tile itself.

#### Scenario: Activating a mark scrolls to its tile
- **WHEN** the user activates a mark whose tile is outside the visible area
- **THEN** the grid scrolls so that the tile is visible, and the tile is
  highlighted

#### Scenario: Activating a mark whose tile is already visible
- **WHEN** the user activates a mark whose tile is already in view
- **THEN** the tile is highlighted without the grid jumping away from it

#### Scenario: Activation never starts playback
- **WHEN** the user activates a mark on the timeline
- **THEN** no detail view opens and no clip begins playing

#### Scenario: Opening an event after using the timeline
- **WHEN** the user activates a mark and then activates the highlighted tile
- **THEN** that event's detail view opens exactly as it does for a tile
  reached by scrolling

#### Scenario: Only one mark highlighted at a time
- **WHEN** the user activates one mark and then another
- **THEN** the highlight moves to the second event's tile and the first tile
  is no longer highlighted

### Requirement: Timeline tracks the event list

The timeline SHALL stay consistent with the displayed list at all times. An
event added to the list SHALL gain a mark, and an event no longer in the list
SHALL lose its mark, without the user reloading or navigating.

This SHALL hold for every way the list changes: events arriving on their own
while the page is open, older events paged in by the user, and events added
or removed by a filter change.

#### Scenario: Event arriving while the page is open
- **WHEN** a new person event completes and is added to the list while the
  user has the events page open
- **THEN** a mark for it appears on the timeline at its timestamp's position

#### Scenario: Older events paged in
- **WHEN** the user loads additional pages of older events
- **THEN** the timeline gains marks for them

#### Scenario: Events removed by a filter
- **WHEN** a filter change removes events from the list
- **THEN** their marks disappear from the timeline

#### Scenario: Highlighted event filtered away
- **WHEN** a filter change removes the event whose tile is highlighted
- **THEN** the highlight is dropped rather than left pointing at a tile that
  is no longer shown

#### Scenario: Empty list
- **WHEN** the list holds no events
- **THEN** the timeline is shown without marks rather than disappearing or
  showing a broken axis

### Requirement: Timeline does not crowd out the grid

The timeline SHALL take a bounded share of the page width so that the event
grid keeps a usable layout, and SHALL NOT cause the page to scroll
horizontally at any supported viewport size. On viewports too narrow to carry
both at a usable size, the timeline SHALL give way to the grid rather than
shrinking the tiles below usability.

#### Scenario: Timeline on a wide viewport
- **WHEN** the events page is shown on a wide viewport
- **THEN** the timeline sits beside the grid and the grid keeps its
  multi-column tile layout

#### Scenario: Timeline on a narrow viewport
- **WHEN** the events page is shown on a viewport too narrow to carry both at
  a usable size
- **THEN** the grid is shown without the timeline rather than with tiles
  squeezed below usability

#### Scenario: No horizontal scrolling
- **WHEN** the events page is shown at any supported viewport size
- **THEN** the page does not scroll horizontally
