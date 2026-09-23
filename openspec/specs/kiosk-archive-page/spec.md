# kiosk-archive-page Specification

## Purpose

Gives kiosk users the archive's own view: what was kept out of the cameras'
recordings, including entries whose original has long since expired and which
therefore appear nowhere else, with the same browsing, playback and deletion the
events page offers for what is still live.

## Requirements

### Requirement: Archive page reachable from Kiosk Personen

The archive page SHALL be reachable from the `KioskPersonen` page and SHALL show
a back link returning to it, consistent with the other `Kiosk*` pages. It SHALL
NOT be reachable from the kiosk overview.

#### Scenario: Opening the archive page
- **WHEN** the user taps the "Archiv" button on the `KioskPersonen` page
- **THEN** the archive page opens

#### Scenario: Returning to Kiosk Personen
- **WHEN** the user taps the back link on the archive page
- **THEN** the `KioskPersonen` page opens

### Requirement: The kept entries are listed

The archive page SHALL load and display the archive's entries for the cameras
configured for the events page, most recent first, each shown with its
thumbnail, the person name it carries (or an "unknown" indicator when it names
nobody), its timestamp, its zone(s) where it has any, and — when more than one
camera is configured — which camera it was kept from.

An entry SHALL be listed whether or not its original still exists at its source.
An entry whose original has expired SHALL be listed exactly like any other, and
SHALL NOT be marked as diminished for having outlived it.

Each entry SHALL be listed once.

The page SHALL show an empty state when the archive holds nothing for the
current filters.

#### Scenario: Entries listed most recent first
- **WHEN** the archive holds entries for a configured camera
- **THEN** they are shown from most recent to oldest, each with its thumbnail,
  name (or "unknown"), timestamp and zone(s) where present

#### Scenario: An entry whose original is gone
- **WHEN** the archive holds an entry whose original has expired at its source
- **THEN** it is listed like every other entry, and playing it plays the kept
  copy

#### Scenario: Several cameras configured
- **WHEN** more than one camera is flagged for the events page
- **THEN** the archive's entries for all of them appear in one list ordered by
  time, each entry showing which camera it came from

#### Scenario: Nothing kept in the chosen range
- **WHEN** the archive holds no entry matching the active filters
- **THEN** the page states that nothing is kept for them, rather than showing an
  error

### Requirement: An entry's preparation state is visible

An entry the server reports as still being prepared SHALL be listed and SHALL be
marked as not yet playable. An entry the server reports as failed SHALL be
marked as failed, together with the reason the server gave for it where it gave
one, and SHALL NOT be presented as safely kept.

#### Scenario: An entry still being prepared
- **WHEN** an entry is still being prepared
- **THEN** it appears in the list, marked as not yet playable

#### Scenario: A failed entry
- **WHEN** the server reports an entry as failed
- **THEN** it is marked as failed with the server's reason where one was given,
  and is not presented as kept

#### Scenario: A prepared entry
- **WHEN** an entry has finished being prepared
- **THEN** it carries no state marking of its own and is playable

### Requirement: Filtering the archive list

The archive page SHALL let the user filter its list by camera, by matched person
name, by a date/time range and by the kind of entry. The filters SHALL be
combinable and SHALL update the list without navigating away from the page.

The page SHALL open with a bounded date/time range already selected, so that its
first read is bounded regardless of how much the archive holds, and SHALL offer
the same quick ranges the events page offers. The range SHALL remain editable
and clearable through its controls afterwards, and clearing it SHALL leave the
list unbounded in time.

Filtering by a person name SHALL show an entry when the chosen name is among the
ones it names, and the entry SHALL keep the label it carries rather than being
relabelled with the name that was searched for.

The kind filter SHALL offer the kinds the archive can hold, and SHALL default to
showing every kind, so that kinds the archive gains later reach the list without
the user having to ask for them.

#### Scenario: Filtering by camera
- **WHEN** the user selects one camera in the filter
- **THEN** the list shows only that camera's entries

#### Scenario: Filtering by person name
- **WHEN** the user selects a person name in the filter
- **THEN** the list shows only entries matched to that person

#### Scenario: Filtering by date/time range
- **WHEN** the user sets a date/time range
- **THEN** the list shows only entries whose timestamp falls within it

#### Scenario: Filtering by kind
- **WHEN** the user selects one kind of entry
- **THEN** the list shows only entries of that kind

#### Scenario: Combining filters
- **WHEN** the user sets several filters at once
- **THEN** the list shows only entries satisfying all of them

#### Scenario: Opening the page
- **WHEN** the user opens the archive page
- **THEN** a bounded date/time range is already selected, the range controls
  show it, every kind is included, and the list shows what the archive holds
  for that period

#### Scenario: Clearing the preselected range
- **WHEN** the user clears the date/time range the page opened with
- **THEN** the list is no longer bounded in time and shows kept entries
  irrespective of age

### Requirement: Playing a kept entry

Selecting an entry SHALL open a detail view that plays the archived copy — its
still and its clip — together with the entry's name, timestamp, camera and
zones. The user SHALL NOT have to choose a source, and an entry whose original
still exists SHALL play no differently from one whose original is gone.

An entry that is not yet playable SHALL say so in place of its media rather than
failing silently, and a failed entry SHALL show why it failed.

The detail view SHALL fit the viewport it is opened on, SHALL keep its closing
control reachable, and SHALL stop and release its clip when it is closed — by
any of the ways it can be closed — as the event detail view does.

#### Scenario: Playing an entry
- **WHEN** the user selects a prepared entry
- **THEN** a detail view opens playing the archived still and clip

#### Scenario: Playing an entry whose original is gone
- **WHEN** the user selects an entry whose original has expired
- **THEN** the archived copy plays exactly as any other entry's does

#### Scenario: Selecting an entry that is not ready
- **WHEN** the user selects an entry that is still being prepared
- **THEN** the view states that the copy is not ready yet instead of showing a
  broken or empty player

#### Scenario: Closing the detail view
- **WHEN** the user closes the detail view, by its control, by the Escape key or
  by tapping outside it
- **THEN** the clip stops and its resources are released

### Requirement: Deleting from the archive view

The archive page's detail view SHALL offer the permanent delete required of
every view that plays a recording, and the list SHALL follow the deletion: a
deleted entry SHALL disappear from it without the page being reloaded by hand.

The archive view SHALL NOT offer a control that only releases the copy: in this
view the copy is the recording, and a control that read as "release" would
promise a distinction the user cannot act on here.

#### Scenario: Deleting an entry
- **WHEN** the user deletes an entry from its detail view and confirms it
- **THEN** the entry is removed, the detail view closes, and the list no longer
  shows it

#### Scenario: A refused deletion
- **WHEN** the server refuses the deletion
- **THEN** the user is told that nothing was deleted, and the entry stays in the
  list

### Requirement: The list follows entries that are still being prepared

While the list holds an entry that is still being prepared, the page SHALL keep
re-reading the archive on its own so that the entry becomes playable without the
user reloading the page. Once no listed entry is being prepared, the page SHALL
stop re-reading on its own.

Re-reading SHALL NOT disturb the user: an open detail view SHALL stay open on
the same entry, and the scroll position SHALL be kept.

Re-reading SHALL stop when the page is left.

#### Scenario: An entry finishes being prepared
- **WHEN** an entry that was being prepared has finished
- **THEN** the list shows it as playable without the user reloading the page

#### Scenario: Nothing is being prepared
- **WHEN** no listed entry is still being prepared
- **THEN** the page stops re-reading the archive by itself

#### Scenario: Re-reading while a detail view is open
- **WHEN** the archive is re-read while a detail view is open
- **THEN** the detail view stays open on the same entry and the list keeps its
  scroll position

#### Scenario: Leaving the page
- **WHEN** the user leaves the archive page
- **THEN** no further reads of the archive are made

### Requirement: An unreachable archive is this page's error state

When the archive cannot be read, the archive page SHALL show an error state
saying that the archive could not be read. It SHALL NOT show an empty list as
though the archive held nothing.

A failure while re-reading SHALL leave the entries already listed standing.

#### Scenario: The archive cannot be read on load
- **WHEN** the archive cannot be read as the page loads
- **THEN** the page states that the archive could not be read, rather than
  showing an empty archive

#### Scenario: The archive cannot be read on a re-read
- **WHEN** the archive cannot be read while the page re-reads it
- **THEN** the entries already listed stay on screen

### Requirement: Timeline beside the archive list

The archive page SHALL show the same vertical timeline the events page shows,
spanning the active range with one mark per listed entry, and activating a mark
SHALL reveal that entry's tile. The timeline SHALL give way to the list on a
viewport too narrow to carry both, as it does on the events page.

#### Scenario: Timeline beside the grid
- **WHEN** the archive page shows entries on a wide enough viewport
- **THEN** a vertical timeline is shown beside the grid with one mark per listed
  entry

#### Scenario: Activating a mark
- **WHEN** the user activates a mark on the timeline
- **THEN** the tile of that entry is revealed and highlighted

#### Scenario: Narrow viewport
- **WHEN** the viewport is too narrow to carry both
- **THEN** the timeline is not shown and the grid uses the whole width

### Requirement: The archive's fill level is visible

The archive page SHALL show how full the archive is: the space its entries occupy
against its configured size, as a proportion and in gigabytes, and how far back
it currently reaches, as the date of its oldest entry. It SHALL state that a full
archive makes room for new entries by dropping its oldest ones.

A full archive SHALL be shown as the normal state of a ring buffer, not as an
error.

#### Scenario: A partly filled archive
- **WHEN** the server reports an archive size of 100 GB with 35 GB in use and an
  oldest entry from 2026-03-02
- **THEN** the page shows the archive 35 % full, with 35 GB of 100 GB, reaching
  back to 2026-03-02

#### Scenario: A full archive
- **WHEN** the entries occupy the archive's whole size
- **THEN** the page shows the archive as full and says that each new entry
  displaces the oldest ones, in the gauge's neutral colour

#### Scenario: An empty archive
- **WHEN** the archive holds no entries
- **THEN** the page shows it empty, with its size, and no oldest date

#### Scenario: Usage cannot be read
- **WHEN** the archive's usage cannot be read but its entries can
- **THEN** the page lists the entries as usual and shows the fill level as
  unknown, rather than hiding the list or showing zero
