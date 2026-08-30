## Context

`frigateService.ts` already talks directly to the Frigate host
(`https://frig.unterrainer.info`) from the browser, kept outside
`BaseService`/`rest.ts` (see the archived `kiosk-personen-face-images`
design.md - Context, same rationale). It already calls `GET /api/events`
for the in-progress case (`end_time === null`); this change adds the
completed-event case (`end_time !== null`) to the same endpoint family.

`doubleTakeService.ts` (from the archived `kiosk-personen-face-images`
change) already exposes `getPeople()`, the authoritative list of known
person names managed for face recognition. See proposal.md - Why/Impact.

## Goals / Non-Goals

**Goals:**
- Browse, filter, and review past Keller person-detection events
  (snapshot, timestamp, zone, matched name) from inside the kiosk.
- Reuse existing conventions: `Kiosk*` link-only page pattern, extending
  `frigateService.ts` rather than adding a new service, component-local
  state.

**Non-Goals:**
- Multi-camera support — fixed to the Keller camera, matching the
  existing live-overlay scope on `KioskPersonen`.
- Any write/delete operations on Frigate events — this page is read-only;
  Frigate remains the system of record for event data.
- Covering in-progress ("currently detected") events — that's the
  existing live overlay on `KioskPersonen`; this page only shows
  completed events (`end_time !== null`).
- Changes to Double Take/CompreFace — this only reads
  `doubleTakeService.getPeople()` for the name filter's option list.

## Decisions

**New page follows the `KioskMigrations`/management-page reachability
pattern.** Reached only via the new button on `KioskPersonen`, not from
the kiosk overview, per proposal.md and the `kiosk-personen-page` delta.
Kiosk mode is already sticky by the time a user reaches it, so no
`kioskMode(true)` call on mount — same as the management page.

**Extend `frigateService.ts` rather than adding a new service.** Past
events, snapshots, and clips are the same Frigate host and the same
`/api/events` family the service already calls for in-progress events;
splitting them into a separate service would duplicate the base URL and
diverge from the one-service-per-external-system convention
(`frigateService.ts` for Frigate, `doubleTakeService.ts` for Double
Take).

**Name filter is populated from `doubleTakeService.getPeople()`, not
from distinct `sub_label` values seen in loaded events.** Double Take is
already the authoritative source of known people (per the archived
`kiosk-personen-face-images` change); deriving the filter's options from
whatever names happen to appear in the currently-loaded page of events
would omit people with no recent events and could surface stale/deleted
names still attached to old events. Alternative considered and rejected:
derive from event data directly — simpler (one less cross-service call)
but inconsistent with what "known people" means elsewhere in the app.

**Date/time range filter maps directly to Frigate's own
`before`/`after` event-query parameters** (epoch seconds, matching
Frigate's event timestamps), rather than fetching everything and
filtering client-side — keeps the kiosk device from pulling a
potentially large full event history over the network. Exact parameter
names/semantics to confirm against the running instance (see Open
Questions).

**List loads a bounded page and supports loading further/older events
on demand ("load more"), rather than fetching the full history at
once.** Mirrors Frigate's own events UI (per proposal.md) and keeps
initial load fast on kiosk hardware. Implemented as a `before`-cursor
(the oldest loaded event's timestamp) passed to the next fetch, the same
pagination style Frigate's own dashboard uses.

**Clip playback uses a plain HTML5 `<video>` element pointed at the
clip's URL**, not the go2rtc/WebRTC mechanism `KioskVideoStreamPanel`
uses for the live feed — a recorded clip is a static `clip.mp4` file, not
a live stream, so no new dependency or streaming setup is needed.

**Component-local state, no new Vuex module.** Matches
`KioskPersonen.vue` and the management page: the event list, active
filters, and selected-event detail state aren't needed anywhere else in
the app.

## Risks / Trade-offs

- [Loading the full event history at once could be slow or overwhelm
  kiosk hardware] → Mitigated by the bounded initial page + "load more"
  cursor pagination and the date-range filter.
- [Older events may have no retained clip (Frigate retention settings)]
  → Covered by the spec's "Selecting an event without a clip" scenario:
  show the snapshot alone, no error.
- [Exact Frigate query-parameter names/semantics for filtering completed
  events, and the exact snapshot/clip URL shapes, aren't yet confirmed
  against the running instance] → Resolved the same way the archived
  `kiosk-personen-face-images` change resolved Double Take's API surface:
  verify against the live instance during implementation (tasks.md).

## Open Questions

None outstanding for the approach or specs. To confirm against the
running Frigate instance during implementation (tasks.md), without
changing the approach above:
- Exact query parameters for listing completed events with camera,
  label, sub_label (name), and before/after filters on
  `GET /api/events`.
- Exact snapshot and clip URL paths for a given event id.
- Whether any auth is required for these endpoints (the in-progress
  `getTrackedPersons()` call sends none today).
