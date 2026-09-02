## MODIFIED Requirements

### Requirement: Past event list

The events page SHALL load and display past (completed) person-detection
events for the cameras configured for the events page, most recent first, each
shown with its snapshot thumbnail, resolved person name (or an "unknown"
indicator when no name was matched), timestamp, and zone(s) when the event
carries any. When more than one camera is configured, the list SHALL cover all
of them merged in time order and SHALL show which camera each event came from.
The cameras SHALL be resolved from the camera registry rather than from a
compiled-in camera name. The page SHALL show an empty state when there are no
events and an error state if loading fails.

#### Scenario: Events listed most recent first
- **WHEN** past events exist for a configured camera
- **THEN** they are shown in the list ordered from most recent to oldest,
  each with its thumbnail, name (or "unknown"), timestamp, and zone(s)
  when present

#### Scenario: Several cameras configured
- **WHEN** more than one camera is flagged for the events page
- **THEN** their events appear in one list ordered by time, each entry showing which
  camera it came from

#### Scenario: One camera unavailable
- **WHEN** events can be loaded for some configured cameras but not for others
- **THEN** the page lists the events it could load and indicates which cameras could
  not be reached, rather than showing an error for the whole list

#### Scenario: No camera configured for the events page
- **WHEN** no camera is flagged for the events page
- **THEN** the page states that no camera is configured and points to the Kameras
  page

#### Scenario: No zone data on an event
- **WHEN** a listed event carries no zone information
- **THEN** its entry omits any zone text rather than showing an empty or
  placeholder value

#### Scenario: No past events
- **WHEN** there are no past events for the configured cameras
- **THEN** the page shows an empty state instead of a list

#### Scenario: Event source unreachable
- **WHEN** loading past events fails (e.g. the detection source is
  unreachable)
- **THEN** the page shows an error state rather than an empty or stale
  list
