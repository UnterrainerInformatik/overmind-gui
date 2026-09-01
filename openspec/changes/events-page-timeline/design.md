## Context

See `proposal.md` — Why. The constraints that shape the approach all come out
of `KioskPersonenEvents.vue` as it stands:

- **The page has no inner scroll container.** `refreshEvents()` records the
  read-back: `#app`, `.v-main`, `.home` and `.events-content` are all
  `overflow-y: visible` and ignore a `scrollTop`; `<html>` carries
  `overflow-y: scroll` and `document.scrollingElement` is the element that
  actually moves. Anything that positions itself against the viewport, or
  scrolls a tile into view, has to go through that element.
- **The refresh already compensates scroll position.** `refreshEvents()` picks
  the topmost fully visible tile as an anchor and corrects `scrollTop` by how
  far that tile moved, so arriving events do not drag the view. A second
  mechanism that moves the scroll position has to not fight it.
- **Filter changes reload through watchers.** `nameFilter`, `fromLocal` and
  `toLocal` each watch into `loadEvents(true)`, and `mounted()` calls
  `loadEvents(true)` as well. Seeding a default range is therefore a question
  of *where* the seed is written, not just what it is.
- **`epochFromLocal()` reads the picker as local wall-clock time.** Any code
  that writes a value into those `datetime-local` inputs has to produce the
  same local wall-clock format (`YYYY-MM-DDTHH:mm`), which is not what
  `Date.toISOString()` gives. `dateUtils` has no such formatter — its
  `dateToShortDateTime()` and friends produce locale display strings.
- **`getPastEvents()` pages backwards by `before`.** `loadEvents(false)` passes
  the oldest loaded `startTime` as the cursor, which occupies the `before`
  slot; `filters.before` only applies to the first page. A default range must
  therefore live in `after`, where paging does not collide with it.
- Events reach the page as `{ id, subLabel, zones, startTime, endTime,
  hasClip, hasSnapshot }`, most-recent-first, with `startTime` in epoch
  seconds.

## Goals / Non-Goals

**Goals:**

- One source of truth for what is shown: the timeline renders from the same
  `events` array the grid renders from, so the two cannot drift.
- Keep the timeline presentational — the view keeps owning data, loading and
  filters, as it does today.
- Leave the existing live-refresh, paging and detail-dialog behavior intact;
  none of their invariants may be weakened to fit the timeline in.

**Non-Goals:**

- No server-side aggregation, no second query shape, no density/histogram
  read of events the page has not loaded. The timeline marks what the list
  holds (see the spec's "Timeline tracks the event list").
- No zooming, panning, or dragging on the timeline; activation of a mark is
  the whole interaction.
- No change to how an event is opened or played.

## Decisions

### The timeline renders from `events`, not from its own query

The timeline plots the events already in the list rather than issuing a
separate "all events in range" query.

*Why:* the two views cannot disagree, no second loading/error state is needed,
and it costs nothing at the source — which is the whole point of the change,
given the millions of events behind it. The refresh's merge already keeps
`events` correct and ordered; the timeline inherits that for free.

*Alternative considered:* a separate bounded count query per range, so the
timeline shows everything in the window while the grid still pages. Rejected
for this change: it reintroduces exactly the unbounded read the change exists
to remove, and it needs its own error handling and its own consistency story
against the merge. If the "load more" tail turns out to be the thing users
want the timeline for, this is the upgrade path — the spec is written against
"the events currently in the list", so widening it later is a spec change, not
a rewrite.

### The default range is seeded in `data()`, not in `mounted()`

`fromLocal` is initialized to *now minus two hours* in the `data()`
initializer.

*Why:* Vue does not fire watchers for a property's initial value, so seeding
there means `mounted()`'s single `loadEvents(true)` is the only load. Seeding
in `mounted()` instead would set `fromLocal`, fire its watcher into
`loadEvents(true)`, and race that against `mounted()`'s own call — two loads
for one page open, resolved only by the `requestId` guard. `data()` is
declared as an arrow-returning object literal already, so the computation fits
without restructuring.

### `toLocal` stays empty for a quick range

A range "ending at the present" is expressed as an *open* upper bound, not as
`toLocal = now`.

*Why:* `buildFilters()` feeds `toLocal` into `filters.before`, and
`refreshEvents()` calls `getPastEvents()` with those same filters every 5s. An
upper bound pinned at page-open time would filter out precisely the events the
live refresh exists to deliver, silently breaking the "Event list keeps itself
current" requirement. Leaving it open also means the range keeps meaning "the
last two hours" as time passes, with no timer re-writing the field under the
user.

*Consequence for the timeline:* the axis needs a concrete upper end, so it
uses *now* for the top of the axis when the upper bound is open, recomputed as
the component re-renders rather than held as state.

### A local `datetime-local` formatter, next to `epochFromLocal()`

A small `localFromEpoch()` (or `localFromDate()`) helper is added on the view
as the exact inverse of the existing `epochFromLocal()`, building
`YYYY-MM-DDTHH:mm` from the local getters with `dateUtils.pad()`.

*Why:* `toISOString()` is UTC and would shift the seeded range by the
timezone offset — in this project's timezone, silently seeding the wrong two
hours. Keeping the inverse beside the original is what makes the round-trip
auditable.

### Quick ranges write into the existing fields

The quick-range buttons set `fromLocal` (and clear `toLocal`); they hold no
"selected range" state of their own.

*Why:* the existing watcher then does the reload, the range controls show what
is active without a second display path, and a hand-edit afterwards is just
another write to the same field — which is what the spec's "Adjusting a quick
range by hand" scenario requires. A separate selected-range mode would have to
be invalidated on every manual edit.

### Positioning: `position: fixed`, like the existing back button

The timeline is fixed against the viewport on the right edge, with the grid
container given right padding to clear it — the same shape
`.events-back-btn` already uses for the bottom-left corner, with
`.events-content`'s bottom padding as the precedent for keeping the grid out
from under it.

*Why:* the page scrolls `<html>`, so a `position: sticky` element inside the
grid column has no scrolling ancestor to stick within and would simply scroll
away. Fixed positioning is the mechanism the page already uses for exactly
this problem.

### Scroll-into-view goes through `document.scrollingElement`

Activating a mark resolves the tile's element, measures it with
`getBoundingClientRect()` and adjusts `document.scrollingElement.scrollTop`,
rather than calling `Element.scrollIntoView()`.

*Why:* it is the same element and the same measurement the refresh's anchor
compensation uses, so the two agree about what "scroll position" means.
`scrollIntoView()` on a smooth setting would additionally still be animating
when the next 5s refresh lands and corrects `scrollTop` underneath it, which
is how the two mechanisms would visibly fight.

### The highlight is view state keyed by event id

A single `highlightedId` on the view drives a class on the matching tile.

*Why:* an id survives `mergeEvents()` (which never rebuilds an existing
entry), so the highlight is not lost to a refresh. It also makes the spec's
"Highlighted event filtered away" case a one-line consequence — a reload
resets it — rather than a dangling element reference.

## Risks / Trade-offs

- **Dense bursts collapse into one mark.** Twenty events inside a minute
  occupy a fraction of a pixel on a two-hour axis → give each mark a minimum
  height and let marks overlap; the cluster reads as a thicker band, which is
  the information wanted at that zoom. Activating an overlapped mark reaches
  one of the events, not all — acceptable, since the tile grid is the precise
  instrument.
- **The timeline only shows loaded events.** With the 2h default the first
  page usually covers the window, but a busy window means the timeline fills
  in as the user pages. → The axis spans the *range*, not the loaded events,
  so the empty part is visibly "not loaded yet" rather than "nothing
  happened"; see the deferred alternative under Decisions.
- **A seeded range hides history by default.** A user who previously landed on
  the newest events regardless of age now sees an empty list on a quiet night.
  → The empty state already exists, the range is visible in the controls the
  moment the page opens, and clearing it is one click on the existing clear
  button.
- **Fixed positioning plus grid padding is a two-place layout contract.**
  Getting the width out of sync leaves the rightmost tile column under the
  timeline. → Drive both from one SCSS variable, as
  `$events-detail-chrome` already does for the dialog.
- **Vuetify specificity.** Overrides of Vuetify-owned classes have to be
  qualified with the class they fight, or they lose the cascade silently —
  the existing `.v-dialog.events-detail-dialog` rules in this file are there
  for that reason, and computed style (not the source) is what confirms a rule
  landed.

## Open Questions

- The quick-range set (2h / 12h / 24h / 7d) and 2 hours as the opening range
  are this change's reading of a primer sentence that breaks off mid-thought
  ("Oder Du machst noch eine alternative"). Changing which periods appear, or
  which one is the default, is a constant swap and a spec wording change; it
  does not affect the approach or the task breakdown. Worth confirming with
  the user before or during implementation.
- Whether the timeline should also be suppressed in the same breakpoint the
  detail dialog uses for `xsOnly`, or at a width threshold of its own. The
  spec requires only that it give way on viewports too narrow for both; the
  exact threshold is a read-back in the running app.
