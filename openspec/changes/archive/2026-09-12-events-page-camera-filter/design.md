## Context

See proposal.md — Why.

`KioskPersonenEvents.vue` reads its cameras once at mount
(`camerasService.getCamerasForEventsPage()`) and then asks the event source for
one merged page across all of them: `fetchPage()` builds `ids` from
`this.cameras` and hands them to `frigateService.getPastEvents(ids, filters,
cursor, PAGE_SIZE)`. The same id list feeds `loadArchive()`, which reads the
archive index so tiles can carry their "saved" marker. Paging back is a shared
cursor over that merged stream, and a 5s tick re-reads the first page and merges
it additively.

`KioskPersonenArchiv.vue` is the same list over kept copies and already has the
control this change is about: a `cameraFilter` data property, a `cameraItems`
computed whose first entry is "all cameras" at `value: null`, and a
`filteredCameraIds()` that answers either the one chosen id or all of them.

## Goals / Non-Goals

**Goals:**

- The camera filter behaves like the page's existing filters — same control
  idiom, same reset-and-reload semantics, same staleness guard.
- The filter bounds what is *asked for*, so paging and the live refresh stay
  correct under it.
- The archive page and the events page end up with the same filter code shape,
  so the next person reading either recognises the other.

**Non-Goals:**

- Remembering the selection across page loads, or putting it in the route. The
  archive does neither; a kiosk user reaches this page for a look, not a
  session.
- Multi-select ("these two cameras"). The registry set and one camera are the
  two states worth having; anything between is a filter bar nobody reads.
- Touching the live (Personen) page, whose camera switch already exists.

## Decisions

**The filter narrows the request, not the rendered list.** `fetchPage()` and
`loadArchive()` take `filteredCameraIds()` instead of `this.cameras.map(...)`.
Filtering `this.events` after the fact was the smaller diff and the wrong one:
`PAGE_SIZE` is applied by the server across the merged stream, so a page of 30
events from four cameras would render as roughly 7 tiles under a filter, "load
more" would keep returning near-empty pages, and `hasMore` — which reads
`page.events.length >= PAGE_SIZE` — would describe the unfiltered stream rather
than what is on screen. Narrowing the ids keeps every one of those numbers
meaning what it says. The services already take the ids as an argument, so this
is an argument change, not a contract change.

**The filter is a reset-and-reload filter like the others.** A watcher on
`cameraFilter` calls `loadEvents(true)`, exactly as `nameFilter`, `fromLocal`
and `toLocal` do. That reuses the existing `requestId` asymmetry rather than
adding to it: `loadEvents(true)` increments `requestId`, so a refresh tick in
flight for the previous selection cannot write its page over the new one, while
a refresh never invalidates a user-initiated load. The list reset also drops
`highlightedId`, which is right — the highlighted tile may belong to a camera
that is no longer listed.

**Partial failure scopes itself.** `unreachableCameras` is built from the
`unavailable` entries the server returns for the ids it was asked about, so
narrowing the ids narrows the notice with no extra code. The `allFailed` test
(`page.unavailable.length >= ids.length`) likewise compares against the ids
asked for: with one camera selected and that camera unreachable, the page raises
its error card rather than a partial-failure notice — which is the honest
reading, since nothing could be loaded.

**The camera name stays on the tiles while a camera is selected**, keyed on the
configured set (`cameras.length > 1`) rather than on the selection. Hiding it
under a filter would reflow every tile on each filter change and would make the
detail dialog's subtitle appear and disappear with it, for the sake of removing
a word the user just chose. The archive keeps the name for the same reason; this
keeps the two pages agreeing.

**The control is the archive's, down to the wording.** A `v-select` first in the
filter row, `dense outlined hide-details="auto"`, `v-if="cameras.length > 1"`,
with `page.kiosk.personenEvents.filterCamera` / `.allCameras` carrying the same
two strings the archive's keys carry. Per-camera buttons or tabs were the
alternative — nicer at one tap on a tablet — but the kiosk already answers
"which camera" with a select on two pages, and buttons stop fitting the filter
row at four or five cameras.

## Risks / Trade-offs

- **A filter change costs a full reload and a scroll reset** → Accepted; it is
  what every other filter on this page already costs, and the alternative
  (keeping the loaded events and filtering them) is the client-side filtering
  rejected above.
- **The registry is read once, so a camera added while the page is open is
  missing from the filter** → Pre-existing: the same is true of the list itself
  today, and the page is a kiosk view that gets reopened rather than left for
  days.
- **Under a selection, the timeline axis falls back to the filtered list's
  oldest event when the range is open at that end** → Correct by construction:
  the axis describes the list it stands beside.

## Migration Plan

None. The filter defaults to "all cameras", which is today's behaviour, and no
stored state or server contract changes. Reverting the change is reverting the
commit.
