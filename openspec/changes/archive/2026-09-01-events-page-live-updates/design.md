## Context

See proposal.md - Why. What shapes the approach:

- The page's events come straight from the home Frigate instance
  (`frigateService`, `GET /api/events`), not from java-overmind-server.
  The project's SSE stack (`src/lib/sse-client`, `sse-transport-client`)
  registers transports as `{ applianceId, paths }` selections against the
  overmind server; it has no concept of a Frigate event and cannot carry
  one.
- `getPastEvents` returns only completed events (`end_time !== null`),
  sorted most-recent-first, and takes `after`/`before`/`sub_labels`
  filters plus a `cursor` (the oldest shown `startTime`) for paging
  backwards. An event therefore enters the list at the moment it
  *completes*, not when it starts.
- `KioskPersonenEvents.vue` already carries the pieces this builds on:
  `loadEvents(reset)`, the `requestId` guard against stale responses, the
  filter watchers, and `events` as an array of plain objects that
  `selectedEvent` points into by reference.
- Every other self-refreshing view in this project (`KioskPersonen`,
  `KioskMigrations`, `WindowContacts`, `Switches`, ...) uses the same
  shape: a `Debouncer` plus a `setInterval` in `mounted`, cleared in
  `beforeDestroy`.

## Goals / Non-Goals

**Goals:**

- Additive refresh: the list only ever gains entries between user
  actions; nothing already on screen is rebuilt.
- Reuse the existing request path (`getPastEvents` with the current
  filters) rather than adding a second, differently-behaving query.
- Keep the refresh cost bounded and predictable - one first-page request
  per tick regardless of how many pages the user has loaded.

**Non-Goals:**

- Live updates for *in-progress* events (the bounding-box case
  `KioskPersonen` already covers). Only completed events are listed.
- Pushing updates from Frigate (MQTT/WebSocket) - see Decisions.
- Refreshing anything but the event list: the person list behind the name
  filter stays a one-shot load on mount.
- Auto-refresh on other pages.

## Decisions

### Poll on an interval rather than subscribe to a push stream

Frigate does publish events over MQTT and its own websocket, but reaching
either from the browser means a new transport, a new endpoint to expose
and new credentials for a single page; the app's existing SSE client
cannot be pointed at it. Polling `GET /api/events` reuses a path already
proven on this page and stays inside the project's established pattern.

Interval: **5s**, via a per-view `Debouncer` so a slow response can never
stack requests (`KioskMigrations` uses the same figure). The 2s of
`KioskPersonen` is calibrated for bounding boxes tracking a moving
person; a grid of completed events does not need it, and each tick here
costs a 30-row JSON response.

Alternative considered: an MQTT/websocket subscription - rejected as
disproportionate infrastructure for one kiosk page. It stays open as a
later option because nothing in this design leaks the polling into the
spec.

### Re-fetch the first page and merge by id, no incremental cursor

Each tick issues the same query `loadEvents(true)` issues - current
filters, no cursor, `PAGE_SIZE` rows - and merges the result into
`events` by `id`.

The cheaper-looking alternative, asking only for events `after` the
newest `startTime` on screen, is wrong here: events become listable when
they *complete*, and completion order is not start order. An event that
started before the newest shown one but ended after it would never be
returned again and would be lost for the life of the page. Re-reading the
first page is self-healing - whatever the list is missing at the head, the
next tick supplies.

Merge rules:

- An id already in `events` keeps its existing object. Nothing is
  reassigned, so `:key="event.id"` keeps the DOM node, `v-img` does not
  re-fetch a thumbnail, and `selectedEvent` - which holds a reference
  into this array - keeps pointing at a live entry while its dialog is
  open.
- An id not in `events` is inserted at the position its `startTime` gives
  it in the most-recent-first order, which for the normal case is the
  front.
- `hasMore` is left alone: it describes the tail of the list, and this
  query says nothing about it.

### Reuse `requestId` as the guard, without incrementing it

A refresh captures `this.requestId` and drops its result if the field has
moved on by the time it resolves. It does not increment the field itself.
That gives exactly the wanted asymmetry: a filter change or a "load more"
(both of which do increment) invalidates any refresh in flight, while a
refresh can never invalidate a user-initiated load. Two overlapping
refreshes are harmless because the merge is idempotent.

### A failed refresh is silent; a successful one clears the error state

The refresh path never touches `loading`, `loadingMore` or
`loadMoreError`, and swallows its errors, so a Frigate hiccup leaves the
list exactly as it was. It does clear `fetchError` on success: after a
failed *initial* load the page is sitting on the error card with an empty
list, and the first refresh that succeeds is what lets it recover on its
own instead of stranding the kiosk until someone touches it.

### Compensate the scroll position against an anchor tile, not the height delta

When the user has scrolled into the list, the refresh records one anchor
tile before the merge and, after the DOM settles, shifts the scroll
offset by however far that tile actually moved. At offset 0 there is no
anchor and nothing is adjusted - there the point is precisely that the
new tile becomes visible.

The anchor is the topmost tile still in view. Rows share a top edge, so
that lands on a row's leading tile, which is the position a prepend is
least likely to reflow. It survives the merge because `mergeEvents` never
rebuilds an existing entry's node.

This decision was originally written as "read the content height before
the merge and add the height delta back", on the assumption that tiles
inserted at the top push everything below them down by their own height.
That assumption does not hold for a *wrapping* grid, and the browser
verification caught it: at 1024px the grid is 4 tiles wide, and one
arriving event mostly slides the following tiles one column along while
leaving their vertical position alone - the document still gains a whole
row at the bottom (measured: 2479px -> 2705px), but the tile the user was
looking at had not moved at all. Adding that 226px back is what dragged
the view off it. Only an arrival that fills a row genuinely pushes the
rows below down, and an anchor reports exactly that - 0px for the single
arrival, a full row for four at once. Measuring the anchor is therefore
the general form of what the original rule got right only in the
full-row case.

Alternative considered: relying on the browser's own scroll anchoring.
Rejected as implicit - it is heuristic, suppressed by several common
layout situations, and would leave the behaviour untestable and
unexplained in code. Choosing and measuring the anchor in the view keeps
it explicit and assertable, which is what caught the error above.

## Risks / Trade-offs

- **A tick costs a full first-page request even when nothing changed** →
  Bounded and small (30 rows of JSON, no images: thumbnails are `<img>`
  URLs the browser caches per event id), and the `Debouncer` prevents
  pile-up on a slow link.
- **A burst of more than `PAGE_SIZE` new events inside one tick would
  leave a hole in the list** → Only reachable at ~6 completed events per
  second on one camera; the "load more" path still reaches everything
  older, and the next tick keeps the head correct.
- **Scroll compensation misfires if the wrong element is measured** →
  Resolve the actually-scrolling element at runtime rather than assuming
  `window`, and verify it in the running app (tasks.md) rather than from
  the stylesheet. Read back there: the page has no inner scroll container
  at all - `#app`, `.v-main`, `.home` and `.events-content` are every one
  of them `overflow-y: visible` and ignore a `scrollTop`, while `<html>`
  carries `overflow-y: scroll`, so `document.scrollingElement` is the
  element to compensate on.
- **The interval keeps running behind a hidden/backgrounded kiosk tab** →
  Accepted: browsers already throttle background timers, and the kiosk
  keeps this page in the foreground; adding visibility handling would
  diverge from every other polling view in the project.
