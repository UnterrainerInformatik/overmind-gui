## ADDED Requirements

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
