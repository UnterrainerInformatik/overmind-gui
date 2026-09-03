## Why

The Personen page draws a box over the live picture for every person the camera
is tracking. Since the page went through overmind instead of reaching a node's
Frigate directly it drew nothing: overmind's event payload carried neither the
geometry nor the face confidence, and `frigateService.ts` dropped every
box-less detection rather than draw at an undefined position. The overlay has
been blank ever since.

The server side is done. `box`, `subLabelScore` and `zones` are on every event,
and both event routes now take an `inProgress` and a `subLabel` filter — all
deployed and verified against the live instance on 2026-09-02
(`ai/draft-live-overlay-for-frontend.md` in java-overmind-server). The GUI can
read what it was written to read, and hand two filters it does today back to
the node that holds the events.

## What Changes

- The live overlay draws again: `getTrackedPersons()` reads `box` and
  `subLabelScore` off the event and hands them to the overlay in the shape it
  already expects.
- A face confidence the source did not report stays unknown rather than being
  drawn as "0 %". The field is absent, never zero, on an event that names
  nobody.
- A detection that carries no position is still not drawn, and the live picture
  keeps playing without it — the existing behaviour, now stated in the spec
  rather than only in the code.
- The name filter is the node's work: the page passes `subLabel=` instead of
  comparing names after the fact. This widens what the filter matches — an
  event that recognised several faces at once ("alexander, marlene") matches a
  search for either of them, where the client-side equality check excluded it.
- Completed-only is the node's work too: `inProgress=false` for the events
  page, `inProgress=true` for the live poll, instead of sieving on a missing
  `endTime` here.
- The events page stops asking for 300 events to show 30. That ten-times-wider
  slice existed only to have something for the client-side name filter to cut
  down.

No breaking changes. Every server-side addition is an optional field or an
optional parameter, so nothing has to be deployed in step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `kiosk-personen-page`: the live person overlay gains the rule that a face
  confidence the source does not report is omitted rather than shown as zero,
  and the rule that a detection without a position is not drawn.
- `kiosk-personen-events-page`: filtering by person name matches an event that
  names several recognised persons including the selected one, and such an
  event keeps the label the source reported.

## Impact

- `src/utils/webservices/frigateService.ts` — `getTrackedPersons()`,
  `getPastEvents()`, the `FrigateEventsPage` shape (its `returned` count goes
  with the client-side filter it existed for).
- `src/views/KioskPersonenEvents.vue` — the widened page size for the name
  filter goes, and a full page is decided on what the server sent.
- `src/components/VideoStream.vue`, `src/components/VideoStreamRtc.vue` — read
  only; they already handle a missing face confidence and empty zones.
- Requires the overmind server of 2026-09-02 or later. An older server answers
  the unknown parameters by ignoring them, which for `subLabel` would show
  unfiltered events — the server is already deployed, so this is a note, not a
  risk to manage.
