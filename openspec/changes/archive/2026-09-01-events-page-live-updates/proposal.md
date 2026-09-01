## Why

The kiosk events page (`KioskPersonenEvents.vue`) loads its event list once on
mount and never again. A person walking through the Keller while the page is on
screen produces a Frigate event that stays invisible until someone changes a
filter or navigates away and back — which is exactly the moment the page is
least useful, because a kiosk is normally left standing on the page it was last
opened on. Every other live-ish kiosk view in this project already refreshes
itself (`KioskPersonen` at 2s, `KioskMigrations` at 5s); the events page is the
outlier.

## What Changes

- The events page keeps its list current while it is open: newly completed
  person events for the Keller camera appear as tiles at the top of the grid
  without the user doing anything.
- Refreshing happens in the background: no loading spinner, no flicker on the
  tiles already shown, no loss of pages the user paged in via "load more", and a
  failed refresh leaves the current list standing instead of replacing it with
  the error state.
- An open event detail dialog is unaffected — it stays open, keeps its
  snapshot/clip, and the new tile simply arrives behind it.
- The refresh honours the active name and date-range filters, so an event that
  the filters exclude does not appear.
- Refreshing stops when the page is left, so no interval survives navigation.

## Capabilities

### New Capabilities

(none — this extends the existing events page capability)

### Modified Capabilities

- `kiosk-personen-events-page`: adds a requirement that the event list updates
  itself while the page is open, and constrains that update to not disturb the
  user's current state (open detail dialog, loaded pages, filters, viewing
  position).

## Impact

- `src/views/KioskPersonenEvents.vue` — refresh interval + merge logic
  alongside the existing `loadEvents`/`requestId` handling.
- `src/utils/webservices/frigateService.ts` — possibly a bounded "newest
  events" read; `getPastEvents` may already cover it unchanged.
- No server-side, API, or dependency changes: this uses the same Frigate
  `GET /api/events` endpoint and the `Debouncer` already used by the other
  self-refreshing kiosk views.
