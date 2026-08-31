## MODIFIED Requirements

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

## ADDED Requirements

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
