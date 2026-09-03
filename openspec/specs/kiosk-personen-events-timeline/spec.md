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

### Requirement: Both ends of the axis are labelled

The timeline SHALL carry a label at each end naming the moment that end
represents, with both a date and a time of day, so the period the axis covers
is readable from the timeline itself rather than from the filter fields. The
label at the start end SHALL name the axis start and the label at the end end
SHALL name the axis end, matching the axis orientation (most recent end at the
top).

The end labels SHALL be shown whenever the timeline is shown, including when
the list holds no events, and SHALL follow the axis when it changes — both
when the user changes the time range and, while the range is open at its upper
end, as that end tracks the present moment.

#### Scenario: Covered period readable from the timeline
- **WHEN** the user looks at the timeline
- **THEN** the moment the axis starts at and the moment it ends at are both
  legible as a date and a time of day, without hovering any mark

#### Scenario: End labels follow a range change
- **WHEN** the user changes the active time range
- **THEN** the end labels name the new range's bounds

#### Scenario: Open upper bound
- **WHEN** the active range is open at its upper end, so the axis ends at the
  present moment
- **THEN** the label at that end names the present moment and keeps naming it
  as time passes, rather than freezing at the moment the page was opened

#### Scenario: End labels on an empty list
- **WHEN** the list holds no events
- **THEN** the timeline is still shown with both end labels

### Requirement: Graduated scale with two tick weights

The timeline SHALL draw tick lines across its length at boundaries of a time
unit, in two visually distinct classes:

- a **minor** tick at every step of the chosen unit,
- a **major** tick at every boundary of the next larger unit.

Major ticks SHALL be distinguishable from minor ticks by length and weight, and
SHALL NOT rely on colour alone to be told apart.

Ticks SHALL sit at true boundaries of the unit in the viewer's local time — the
top of an hour, local midnight, local noon, the start of a week or month — and
SHALL stay on those boundaries across a daylight-saving change and across
months of differing length, rather than at fixed offsets counted from either
end of the axis.

#### Scenario: Two weights are visible
- **WHEN** the timeline is shown with a graduated scale
- **THEN** short light ticks and longer heavier ticks are distinguishable from
  one another, with the heavier ones on the larger unit's boundaries

#### Scenario: Ticks land on unit boundaries
- **WHEN** the axis spans a period containing local midnight and local noon
- **THEN** a major tick sits at the position of each of them, and the minor
  ticks between them sit on the intervening hour boundaries

#### Scenario: Daylight-saving change inside the axis
- **WHEN** the axis spans a day on which the local clock is put forward or
  back
- **THEN** the day and hour ticks still sit on the local boundaries they name,
  so the graduation does not drift off the hour after the change

#### Scenario: Any span is graduated
- **WHEN** the axis spans anything from minutes to years
- **THEN** a graduation appropriate to that span is drawn rather than the axis
  being left bare

### Requirement: Scale granularity follows the visible span

The unit the scale is stepped in SHALL be derived from the span the axis
currently covers, chosen so that ticks are neither closer together than they
can be told apart nor so far apart that the axis carries no usable division.
The steps SHALL be calendar-meaningful ones — such as minutes, quarter- and
half-hours, hours, quarter- and half-days, days, weeks and months — rather than
an arbitrary division of the span into equal parts.

When the span changes such that a different step becomes the appropriate one,
the scale SHALL re-graduate to it.

#### Scenario: A span of hours
- **WHEN** the axis spans a couple of hours
- **THEN** the minor ticks step in minutes and the major ticks fall on the
  hour boundaries

#### Scenario: A span of a day
- **WHEN** the axis spans about a day
- **THEN** the minor ticks step in hours and the major ticks fall on midnight
  and noon

#### Scenario: A span of a week
- **WHEN** the axis spans about a week
- **THEN** the minor ticks step in days and the major ticks fall on the week
  boundaries

#### Scenario: Re-graduating on a range change
- **WHEN** the user switches the range from a span of hours to a span of days
- **THEN** the scale is redrawn in the step appropriate to the new span, so
  the two spans are distinguishable from the timeline alone

#### Scenario: Ticks never crowd
- **WHEN** the axis spans a period in which the next finer step would put
  ticks closer together than they can be told apart
- **THEN** the coarser step is used instead, so no two neighbouring ticks are
  drawn on top of one another

### Requirement: Major ticks are labelled where they fit

Major ticks SHALL carry a short label naming the moment they mark — a time of
day, or a date where the tick is a day or larger boundary — formatted for the
active locale.

Where labelling every major tick would make labels overlap one another or the
axis-end labels, labels SHALL be thinned out or omitted while the ticks
themselves remain drawn. The two axis-end labels SHALL take precedence: a tick
label that would collide with one SHALL be dropped rather than overlapped.

#### Scenario: Labelled major ticks
- **WHEN** the axis carries major ticks with room between them
- **THEN** each is labelled with the moment it marks, in the active locale's
  date and time format

#### Scenario: Crowded axis
- **WHEN** the major ticks sit too close together to label individually
- **THEN** labels are thinned or omitted while the ticks stay drawn, and no
  two labels overlap

#### Scenario: Collision with an end label
- **WHEN** a major tick falls close to an end of the axis
- **THEN** its label is dropped rather than drawn over the axis-end label

### Requirement: The scale stays subordinate to the event marks

The scale SHALL be drawn behind the event marks and SHALL remain visually
quieter than they are, so that reading the distribution of events is not made
harder by the graduation. Event marks SHALL stay legible where they coincide
with a tick.

Ticks and their labels SHALL NOT be interactive: they SHALL NOT be focusable,
SHALL NOT respond to activation, and SHALL NOT intercept a pointer action
aimed at an event mark. Activating a mark SHALL behave exactly as it does
without the scale.

The graduated timeline SHALL continue to take a bounded share of the page
width, SHALL NOT cause horizontal scrolling at any supported viewport size,
and SHALL continue to give way to the grid on viewports too narrow to carry
both.

#### Scenario: A mark over a tick stays usable
- **WHEN** an event's mark falls at the same position as a tick
- **THEN** the mark is still legible as a mark and activating it highlights
  its tile as before

#### Scenario: Scale is not interactive
- **WHEN** the user tabs through the page or clicks on a tick or a tick label
- **THEN** nothing is focused or activated by the scale, and no tile highlight
  changes

#### Scenario: Layout unaffected
- **WHEN** the events page is shown at any supported viewport size
- **THEN** the page does not scroll horizontally, the grid keeps its usable
  tile layout, and on a viewport too narrow for both the grid is shown without
  the timeline
