## Why

The events page covers every camera flagged for it and merges their events into
one list. With more than one camera that list is the only view there is: a user
who wants to see what one camera saw has to read the camera name off each tile
and skip the rest. The archive page — the same list, over kept copies — already
offers a camera filter, so the events page is the odd one out, and the page the
user reaches first.

## What Changes

- The events page gains a camera filter beside its existing person-name and
  date/time filters: a select offering "all cameras" plus each camera configured
  for the page, shown only when more than one is configured.
- The filter defaults to "all cameras", so the page opens exactly as it does
  today.
- Choosing a camera narrows what the page asks the event source for, rather than
  hiding tiles after the fact: the filter is combinable with the existing ones,
  it bounds the automatic 5s refresh, the archive index read and "load more"
  alike, and the timeline follows the filtered list.
- The partial-failure notice names only cameras the page actually asked about.
- Two new i18n keys under `page.kiosk.personenEvents` in both locales, matching
  the archive's wording (`filterCamera`, `allCameras`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `kiosk-personen-events-page`: "Filtering the event list" gains the camera
  filter; "Event list keeps itself current" states that the automatic refresh
  honours it like the other filters.

## Impact

- `src/views/KioskPersonenEvents.vue`: filter control and its style, one data
  property and watcher, a `filteredCameraIds()` used by `fetchPage()` and
  `loadArchive()`.
- `src/locales/de-AT.json`, `src/locales/en-US.json`: two keys each.
- No service, contract or backend change: `frigateService.getPastEvents()` and
  `archiveService.getItems()` already take the camera ids as an argument.
