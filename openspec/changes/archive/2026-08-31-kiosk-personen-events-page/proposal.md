## Why

The Kiosk Personen page shows only the live Keller camera feed with a
person-detection overlay; there is no way to look back at what happened
earlier without opening Frigate's own UI separately, which kiosk users
should not need to do (same reasoning that drove the Double Take
management page: kiosk-only, no separate app). Users want to review past
person events (who was detected, when, with a snapshot/clip) from within
the kiosk.

## What Changes

- Add a new Kiosk Personen Events page listing past person-detection
  events for the Keller camera, styled after Frigate's own events UI
  (thumbnail-first list/timeline, most recent first).
- Each event entry shows its snapshot thumbnail, resolved person name
  (or "unknown"), timestamp, and zone(s) when present.
- Selecting an event opens a detail view with the full snapshot and the
  recorded clip (if available) for that event.
- Support filtering the list by matched person name and by date/time
  range, mirroring Frigate's filter affordances.
- Extend `frigateService` with methods to list past (`end_time !==
  null`) person events and to build snapshot/clip URLs.
- Add a "Events" `KioskLinkPanel` button on `KioskPersonen`, below the
  existing "Personen" (management) button, matching its width, routed to
  the new page — same pattern as the existing management-page link,
  reachable only by direct link (no separate `KioskOverview` tile).

## Capabilities

### New Capabilities
- `kiosk-personen-events-page`: The events list/detail page itself —
  browsing, filtering, and reviewing past Keller person-detection events
  with snapshots and clips.

### Modified Capabilities
- `kiosk-personen-page`: Adds the "Events" navigation button on
  `KioskPersonen`, below the management button.

## Impact

- `src/views/KioskPersonen.vue`: add the new "Events" link panel.
- `src/router/index.ts`: add the route for the new page.
- `src/utils/webservices/frigateService.ts`: add methods for listing past
  events and building snapshot/clip URLs (`GET /api/events` with
  `end_time` filtering, `GET /api/events/<id>/snapshot.jpg`, `GET
  /api/events/<id>/clip.mp4`, per the Frigate HTTP API).
- New view: `src/views/KioskPersonenEvents.vue` (name to be finalized in
  design.md).
- `src/locales/de-AT.json`, `src/locales/en-US.json`: new UI strings.
