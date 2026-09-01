## 1. Merge logic for arriving events

- [x] 1.1 Add a `mergeEvents(page)` method to `KioskPersonenEvents.vue`
  that keeps every existing entry object untouched and inserts only ids
  not yet present, each at the position its `startTime` gives it in the
  most-recent-first order, leaving `hasMore` alone; verify by calling it
  with a page that overlaps the current list that the array gains exactly
  the unseen ids, that the objects for known ids are the same references
  as before, and that an event whose `startTime` falls between two shown
  events lands between them rather than at the front
- [x] 1.2 Add a `refreshEvents()` method that captures `this.requestId`
  without incrementing it, requests `frigateService.getPastEvents(CAMERA,
  this.buildFilters(), null, PAGE_SIZE)`, drops the result if
  `this.requestId` has moved on, and otherwise merges it; verify it never
  writes `loading`, `loadingMore` or `loadMoreError`, and that it clears
  `fetchError` on a successful response so a page stranded on the error
  card recovers by itself
- [x] 1.3 Swallow refresh errors in `refreshEvents()` without touching
  `events`, `fetchError` or `hasMore`; verify with the Frigate endpoint
  answering 500 that the list keeps its entries and the error card does
  not appear, and that a later successful refresh adds the events that
  completed meanwhile

## 2. Scroll position preserved

- [x] 2.1 Determine in the running app which element actually scrolls the
  events page (document scrolling element vs. an inner container) by
  reading it back in the browser, not from the stylesheet; record the
  answer in a code comment next to the compensation code
- [x] 2.2 In `refreshEvents()`, record an anchor tile before the merge
  and, after `$nextTick`, shift that element's scroll offset by however
  far the anchor actually moved, when the offset was greater than 0;
  verify with the harness that a tile arriving while the user is scrolled
  into the list leaves the tiles on screen in place, and that at offset 0
  nothing is adjusted so the new tile is simply visible at the top
  (revised from "add the content-height delta back": the harness measured
  that a single arrival into the 4-wide wrapping grid grows the document
  by a row while moving nothing above the fold, so the height delta is
  the wrong quantity - see design.md)

## 3. Refresh loop bound to the page

- [x] 3.1 Add a `Debouncer` and a 5s `setInterval` calling
  `refreshEvents()` in `mounted()` (after the existing initial
  `loadEvents(true)`), following the `KioskMigrations.vue` /
  `KioskPersonen.vue` shape, and clear the interval in `beforeDestroy()`
  alongside `releaseClipBlob()`; verify by navigating away from the page
  that no further `/api/events` requests are issued
- [x] 3.2 Verify a filter change during an in-flight refresh: with the
  refresh response delayed, change the name filter and confirm the list
  ends up showing the new filter's result only - the stale refresh is
  discarded by the `requestId` guard and adds nothing

## 4. Browser verification

- [x] 4.1 Extend `mocks/frigate.mjs` in the browser harness
  (`~/.local/share/overmind-gui-verify/`, run node from there - see its
  README) so the events endpoint can grow its list between requests, and
  add a `suites/events-live-updates.mjs` suite covering: a new event
  appearing on its own within one interval, an event excluded by an
  active name filter staying out, no duplicate tiles across several
  ticks, and an out-of-order completion landing at its start-time
  position
- [x] 4.2 Extend that suite with the do-not-disturb cases: an event
  arriving while a detail dialog is open leaves the dialog open with its
  snapshot/clip intact and the tile added behind it, and an event
  arriving after "load more" keeps the paged-in older tiles in the list;
  capture screenshots into `out/` for both
- [x] 4.3 Run `npm run lint` and the harness suite, and confirm the
  existing `events-detail-responsive.mjs` suite still passes unchanged
