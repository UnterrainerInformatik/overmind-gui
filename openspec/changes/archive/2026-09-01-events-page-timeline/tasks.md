## 1. Bounded default range and quick ranges

- [x] 1.1 Add a `localFromDate(date)` helper to
  `KioskPersonenEvents.vue` beside the existing `epochFromLocal()`,
  producing the `YYYY-MM-DDTHH:mm` local wall-clock string the
  `datetime-local` inputs take, built from the local getters and
  `dateUtils.pad()`; verify the round-trip
  `epochFromLocal(localFromDate(d))` returns `d`'s epoch seconds rounded
  to the minute for a date in the current timezone, and confirm
  explicitly that `toISOString()` would *not* have — the seeded range
  would otherwise be off by the UTC offset
- [x] 1.2 Seed `fromLocal` in the `data()` initializer with
  `localFromDate(now - 2h)` and leave `toLocal` empty; verify in the
  running app that opening the page issues exactly **one**
  `GET /api/events` request (the `fromLocal` watcher must not fire for
  the initial value — a second request means the seed landed in
  `mounted()` instead), that the request carries an `after` parameter and
  no `before`, and that the "from" input shows the two-hours-ago local
  time
- [x] 1.3 Add a quick-range control offering 2 hours, 12 hours, 24 hours
  and 7 days, each writing `localFromDate(now - period)` into `fromLocal`
  and clearing `toLocal`; verify each button reloads the list through the
  existing watcher, that the "from" input visibly shows the chosen
  period's start, and that editing the input by hand afterwards takes
  effect without the quick range being reapplied over it
- [x] 1.4 Verify the range stays clearable: clearing "from" with the
  existing clear button leaves the list unbounded in time and the request
  carries no `after`; and confirm an explicitly set "to" is still honoured
  (events after it do not appear)
- [x] 1.5 Verify the seeded range does not break the live refresh: with
  the default 2h range active, an event completing while the page is open
  still reaches the list on the next 5s tick — this is what the open
  upper bound buys and it is the requirement most easily lost by setting
  `toLocal = now`

## 2. Timeline component

- [x] 2.1 Add a presentational timeline component under
  `src/components/` taking the events to plot plus the axis bounds as
  props and emitting an activation event carrying the event id; it holds
  no data-loading of its own, matching how the view already owns
  `events`, filters and paging
- [x] 2.2 Position each event as a line/rectangle at
  `(axisEnd - startTime) / (axisEnd - axisStart)` of the axis length,
  most recent at the top to match the grid's order, with a minimum mark
  height so a single event is visible and dense bursts overlap into a
  thicker band; verify with a burst of events inside one minute on a 2h
  axis that the cluster is visible rather than sub-pixel
- [x] 2.3 Derive the axis bounds in the view: `axisStart` from the active
  "from" (falling back to the oldest listed event when the range is
  open), `axisEnd` from the active "to" or, when that is open, from
  *now* recomputed on render rather than held as state; verify changing
  the range rescales the marks, and that an open-ended range still
  produces a usable axis
- [x] 2.4 Verify the timeline tracks the list on every path: an event
  arriving through the 5s refresh gains a mark, "load more" adds marks
  for the older page, a filter change removes the marks of events that
  fell out, and an empty list leaves the axis standing without marks
  rather than collapsing

## 3. Timeline-to-grid interaction

- [x] 3.1 Add a `highlightedId` to the view, set from the timeline's
  activation event, driving a highlight class on the matching
  `.events-card`; verify only one tile is highlighted at a time, that the
  highlight survives a 5s refresh (`mergeEvents()` keeps existing entry
  objects, so the id stays valid), and that a filter change which drops
  the event clears it instead of leaving it dangling
- [x] 3.2 Scroll the activated event's tile into view by measuring it
  with `getBoundingClientRect()` and adjusting
  `document.scrollingElement.scrollTop` — the same element and
  measurement `refreshEvents()`'s anchor compensation uses; do **not**
  use `Element.scrollIntoView()` with smooth behaviour, which would still
  be animating when the next refresh corrects `scrollTop` underneath it
- [x] 3.3 Verify activating a mark never starts playback: no detail
  dialog opens, no clip loads, no `GET .../clip.mp4` request is issued —
  opening an event stays exclusively a click on the tile
- [x] 3.4 Verify activating a mark whose tile is already fully visible
  highlights it without the grid jumping, and that activating a tile
  after using the timeline opens the detail view exactly as a tile
  reached by scrolling does
- [x] 3.5 Verify the two scroll mechanisms do not fight: activate a mark
  deep in the list and let at least one 5s refresh with an arriving event
  land; the tile the user was sent to stays where it is on screen

## 4. Layout

- [x] 4.1 Position the timeline `position: fixed` on the right edge over
  the full viewport height, following the `.events-back-btn` precedent —
  the page scrolls `<html>`, so a `sticky` element inside the grid column
  has no scrolling ancestor and would scroll away; verify by scrolling
  the grid that the timeline stays put
- [x] 4.2 Give `.events-content` right padding matching the timeline
  width, both driven from one SCSS variable in the same file (the
  `$events-detail-chrome` precedent); verify the rightmost tile column is
  never under the timeline and that the page never scrolls horizontally
- [x] 4.3 Suppress the timeline on viewports too narrow to carry it and
  the grid at a usable size, dropping the grid's reserved padding with
  it; determine the threshold by reading it back in the running app
  rather than picking one from the stylesheet, and record the measured
  answer in a comment — **measured: 420px.** Judged against the grid's own
  floor (unaided at a 360px viewport it already renders 156px tiles); with
  the timeline's 56px reserved the tiles measure 600px→165px, 480px→192px,
  420px→162px, 400px→152px, 360px→132px, so 420px is the width at which
  they stop clearing it. Vuetify's xs/sm boundary was the obvious candidate
  and the measurement rejected it: the tightest tile in the whole range
  (165px) sits *at* 600px, where the grid still runs three columns, while
  580–420px is roomier on two
- [x] 4.4 Verify any rule that overrides a Vuetify-owned class is
  qualified with that class and confirm it landed via computed style, not
  by reading the source — unqualified selectors lose that cascade
  silently

## 5. Localization

- [x] 5.1 Add the quick-range and timeline labels under
  `page.kiosk.personenEvents` in both `src/locales/de-AT.json` and
  `src/locales/en-US.json`, keeping the keys alphabetically ordered as
  the existing block is; verify no literal user-facing string is left in
  the template and that both locales render

## 6. Read-back and checks

- [x] 6.1 Walk the whole page in the running app with the browser
  verification harness: open (default range, one request), each quick
  range, a hand-edited range, a cleared range, "load more", a timeline
  activation, opening an event from the highlighted tile, and closing it
  — confirming the existing clip-stop and live-refresh behavior is
  unchanged throughout. **Encoded as the `events-timeline` suite in the
  browser harness (100 checks, all passing);** the three pre-existing events
  suites were re-run against the change unaltered in what they assert
  (`events-clip-stops-on-close` 31/31, `events-detail-responsive` 50/50,
  `events-live-updates` 50/50)
- [x] 6.2 Run the project's lint and type-check build and clear anything
  they report, including the camel-case rule that the Frigate query
  parameters already need an exception for
- [x] 6.3 Re-read `proposal.md`, both spec deltas and `design.md` against
  what was built, and reconcile any place the implementation diverged —
  recording the revision in the task, as task 2.2 of the live-updates
  change did. **Three reconciliations, all recorded in `design.md`:**
  (a) `localFromDate()` is a module-level function in the SFC, not a method
  as the decision wrote it — `data()` is an arrow-returning literal and has
  no `this` to reach `methods` through, which is the same property the
  "seed in `data()`" decision relies on; (b) the suppression threshold's
  open question is answered with a measured 420px, and the `xsOnly`
  candidate it offered is recorded as rejected by that measurement;
  (c) the quick-range set stays as proposed and stays open for the user to
  confirm — it is a one-line constant plus a spec wording change, and the
  labels come from two parameterised i18n keys so a changed set needs no
  new translations. Both spec deltas were re-read and match what was built;
  neither needed a change. Also outside the repo: the pre-existing
  `events-live-updates` harness suite now clears the range on open, because
  its 2024 fixtures fall outside the range the page seeds; the behavior it
  checks is unchanged and its 50 checks still pass
