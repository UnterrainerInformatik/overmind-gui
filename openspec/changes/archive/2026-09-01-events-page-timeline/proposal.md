## Why

The kiosk events page (`KioskPersonenEvents.vue`) opens with no date range
set, so its first query asks Frigate for the newest person events across the
camera's whole history and the user then pages backwards 30 tiles at a time.
With events in the millions that opening read is the slowest thing the page
does, and the grid it produces gives no sense of *when* the events sit: 30
thumbnails carry 30 timestamps, but nothing shows that 25 of them fall in the
same two minutes and the rest are hours apart. Scanning "what happened this
evening" means reading tile captions one by one.

A vertical timeline beside the grid turns that distribution into something
visible at a glance, and a preselected time range keeps the page from asking
for the whole history just to fill one screen.

## What Changes

- The events page gains a vertical timeline down its right edge, spanning the
  full viewport height and staying in place while the tile grid scrolls. Each
  event in the list is marked on it as a line or rectangle positioned by its
  timestamp, so bursts and quiet stretches are visible without reading a
  single caption.
- Activating a mark on the timeline highlights that event's tile in the grid
  and scrolls it into view. It does **not** start playback: opening an event's
  detail view stays exclusively a click on the tile, as today.
- The page opens with a time range already selected instead of unbounded, so
  the first query is bounded no matter how much history the camera holds.
- The range is chosen from quick-range buttons (2 hours, 12 hours, 24 hours,
  7 days) that fill the existing "from"/"to" fields, with **2 hours** as the
  range the page opens on. The existing from/to inputs keep working as they do
  today and stay clearable, so an unbounded query remains reachable
  deliberately — it just stops being what the page does on its own.
  **Assumption:** the primer's closing sentence ("Oder Du machst noch eine
  alternative") breaks off mid-thought; quick-range buttons are this
  proposal's reading of it, chosen over a hard-wired 2-hour window so the
  default is adjustable without typing two datetimes. Worth confirming before
  implementation.
- The timeline and the grid stay one list: the timeline marks the events the
  page currently has loaded, the tile highlight and the timeline mark stay in
  sync, and live-arriving events (the existing 5s refresh) appear on both.

## Capabilities

### New Capabilities

- `kiosk-personen-events-timeline`: the vertical timeline beside the event
  grid — what it plots, how it is positioned and scaled over the active time
  range, what activating a mark does (highlight plus scroll, never playback),
  and how it tracks the list as events arrive, are paged in, or are filtered
  away.

### Modified Capabilities

- `kiosk-personen-events-page`: the "Filtering the event list" requirement
  gains a defined opening state — the page arrives with a bounded time range
  preselected rather than unbounded — plus quick-range selection alongside the
  existing from/to inputs, and the guarantee that clearing the range is still
  possible.

## Impact

- `src/views/KioskPersonenEvents.vue` — the timeline component alongside the
  existing grid, the tile-highlight state, the scroll-into-view handling, and
  the initial `fromLocal` seeding. The page currently has no inner scroll
  container (`document.scrollingElement` is what moves, as
  `refreshEvents()` documents), which the timeline's fixed positioning and the
  scroll-into-view both have to respect.
- `src/components/` — a new presentational timeline component; the view keeps
  owning the event data.
- `src/locales/de-AT.json`, `src/locales/en-US.json` — quick-range and
  timeline labels under the existing `page.kiosk.personenEvents` block.
- No change to `src/utils/webservices/frigateService.ts`: `getPastEvents`
  already takes `after`/`before` and the seeded range flows through the
  existing `buildFilters()`.
- No server-side, API or dependency changes.
