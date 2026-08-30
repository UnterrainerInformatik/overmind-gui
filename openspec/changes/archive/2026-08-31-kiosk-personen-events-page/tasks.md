## 1. Frigate events API groundwork

- [x] 1.1 Confirm the exact `GET /api/events` query parameters for
      completed events against the running Frigate instance: camera,
      label=person, sub_label (name) filter, before/after (date/time
      range), sort order, limit/cursor pagination (see design.md - Open
      Questions).
- [x] 1.2 Confirm the exact snapshot and clip URL shapes for a given
      event id, and whether either requires auth.

## 2. frigateService extension

- [x] 2.1 Add `getPastEvents(camera, filters, cursor)` to
      `src/utils/webservices/frigateService.ts`, returning completed
      (`end_time !== null`) person events for the given camera, applying
      name and date/time-range filters, ordered most recent first,
      supporting a `before`-cursor for loading older events.
- [x] 2.2 Add `getEventSnapshotUrl(id)` and `getEventClipUrl(id)` (or
      equivalent) to build the confirmed snapshot/clip URLs for an event
      id.

## 3. Events list UI

- [x] 3.1 Create the events page view
      (`src/views/KioskPersonenEvents.vue`), following the `Kiosk*` view
      conventions and the management page's link-only reachability
      pattern (no `kioskMode(true)` call on mount).
- [x] 3.2 Add its router entry in `src/router/index.ts`.
- [x] 3.3 Load and display the event list on mount: thumbnail, resolved
      name (or "unknown"), timestamp, zone(s) when present, most recent
      first; show an empty state when there are none and an error state
      if loading fails.
- [x] 3.4 Add "load more" (older events) using the `before`-cursor from
      `getPastEvents`.
- [x] 3.5 Add a back link returning to `KioskPersonen`.

## 4. Filtering UI

- [x] 4.1 Add a person-name filter control, populated from
      `doubleTakeService.getPeople()`, wired to `getPastEvents`'s name
      filter.
- [x] 4.2 Add a date/time range filter control, wired to
      `getPastEvents`'s before/after filter.
- [x] 4.3 Ensure both filters combine and update the list in place
      (re-fetching from the start, resetting the "load more" cursor).
- [x] 4.4 Add a way to clear an active filter, returning to the
      unfiltered (or remaining-filter) list.

## 5. Event detail view

- [x] 5.1 Add a detail view (e.g. `v-dialog`) opened by selecting an
      event, showing the full snapshot via `getEventSnapshotUrl`.
- [x] 5.2 When the event has a clip, show an HTML5 `<video>` player
      using `getEventClipUrl`; when it doesn't, show the snapshot alone
      with no playback control or error.
- [x] 5.3 Add a close control returning to the events list.

## 6. KioskPersonen entry point

- [x] 6.1 Add an "Events" `KioskLinkPanel` button below the existing
      "Personen" (management) button on `src/views/KioskPersonen.vue`,
      matching its width, routed to the new events page.
- [x] 6.2 Add the new UI strings (button label, empty/error states,
      filter labels, "unknown" indicator, etc.) to
      `src/locales/de-AT.json` and `src/locales/en-US.json`.

## 7. Verification

- [x] 7.1 Manually verify in the browser: the events list loads and
      shows real past Keller events, the name and date/time filters
      (individually and combined) narrow the list correctly, "load
      more" fetches older events, and the empty/error states render
      when applicable.
- [x] 7.2 Manually verify the event detail view for both an event with a
      clip and one without, and that closing it returns to the list.
- [x] 7.3 Manually verify the new "Events" button's width matches the
      other buttons in the column at different viewport sizes, and that
      it opens the new page and its back link returns to
      `KioskPersonen`.
