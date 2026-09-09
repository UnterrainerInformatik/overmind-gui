## Context

See `proposal.md` — Why. The state that shapes the approach:

- `KioskPersonenEvents.vue` is 1564 lines and already contains everything this
  page needs except the archive itself: the filter bar with its quick ranges,
  the tile grid, `EventsTimeline` beside it, the detail dialog with the
  snapshot/clip pair and the whole hls.js lifecycle, the `ConfirmDialog` whose
  labels are bound to a `pendingAction`, the snackbar dispatch, and the
  two-call permanent delete.
- Its clip machinery is subtle in ways that were paid for once: the teardown
  hangs off the dialog's open flag rather than off the close buttons (Escape and
  the backdrop go only through the v-model), `startClip()` re-checks the
  selected event after `$nextTick()` so a close/reopen cannot attach a clip to
  the wrong dialog, the player is an instance property so Vue does not make a
  running media pipeline reactive, and `playClipWhenReady()` falls back to muted
  playback when Chrome no longer counts the open as gesture-initiated.
- `revealEvent()` finds a tile by `querySelectorAll('.events-card')` and the
  index of the event in the list — the timeline's reveal depends on that class
  and on tile order matching list order.
- `archiveService.getItems(cameraIds, { after, before, kind, limit })` exists
  and normalises the whole item, including the fields only this view needs
  (`kind`, `label`, `subLabel`, `zones`, `sizeBytes`, the three media URLs). It
  has no `label` / `subLabel` filter and no cursor.
- The archive routes are **still not served by any backend**; the shapes were
  checked against `java-overmind-server`'s source on 2026-09-07, not against a
  running server.
- The browser harness at `~/.local/share/overmind-gui-verify` already has
  `mocks/archive.mjs` and five suites over the events page.

## Goals / Non-Goals

**Goals:**

- One implementation of the tile and of the detail dialog, used by both pages,
  with the events page's behaviour unchanged to the letter.
- A page that is honest about an archive it cannot read, unlike the events page
  where the archive is an optional garnish.
- An entry that is still being prepared becomes playable by itself, without the
  page polling for the sake of polling.

**Non-Goals:**

- Changing anything the events page does. The extraction is a move, not a
  rewrite; every requirement of `kiosk-personen-events-page`,
  `event-archive-saving` and `event-permanent-delete` holds unchanged
  afterwards, and the existing browser suites are what says so.
- A second `archiveService`-shaped seam. The service stays the only place that
  knows the wire.
- Snapshots, alarms and recording jobs — further `kind`s in the same list, none
  of which changes this page.

## Decisions

### Two components come out of the events page, and only two

`EventTile.vue` and `EventMediaDialog.vue`. Everything else stays where it is:
the filter bar reads differently on the two pages (the archive filters by camera
and kind, the events page by neither), the delete reporting differs in what it
may remove, and a shared filter component would be a wrapper around two
divergent sets of controls.

**`EventTile.vue`** takes an entry, whether it is highlighted, the camera name to
show (empty for "do not show one"), and an optional `marker` —
`{ icon, tone, title }` — drawn over the thumbnail. It emits its selection and
owns no state. The archive-specific wordings ("Gesichert", "wird vorbereitet",
"fehlgeschlagen") stay with the page that means them and arrive as the marker's
`title`; the component knows only that there is a marker.

The root element keeps the class `events-card`. `revealEvent()` finds tiles by
that class and by list index, so renaming it would break the timeline's reveal
silently — the one thing about this move that is not cosmetic.

**`EventMediaDialog.vue`** takes the open flag (`v-model`), the entry, and the
`media` to play — `{ hasClip, clipUrl, snapshotUrl }` — plus a note to show under
the media. It owns the dialog, the fullscreen breakpoint, `showSnapshot` /
`mediaSolo`, the whole hls.js lifecycle including the teardown on every closing
path and on unmount, and the close control. It offers two slots: `state` for the
block on the left of the actions row and `actions` for the page's own buttons.

It deliberately does **not** know about the archive. Which media an entry plays
is the page's decision — the events page keeps `mediaOf()` and its
"archived copy once it is ready, the source's own otherwise" rule, the archive
page passes the entry's own media — so the component has no branch that only one
of its two callers ever takes.

Rejected: a mixin. Vue 2 mixins put the clip's state on the page's own instance,
which is exactly the coupling being removed. Rejected: extracting the filter bar
and the list container as well — see above.

### One listing shape, and the archive is mapped onto it

`EventTile` and `EventsTimeline` read `{ id, startTime, subLabel, zones, camera,
thumbnailUrl }`. A Frigate event already is that. An archive item is mapped to it
in the archive view — `id` from `archiveId`, `camera` from `cameraId` — and the
item itself is kept beside the entry for what only it carries (`state`,
`failureReason`, `sourceEventId`, the media URLs).

Mapping in the view rather than in the service: the service answers what the wire
says, and a service that also answered a GUI-shaped model would have two shapes
to keep in step. `EventsTimeline` then needs no change at all, which is what the
primer asked for.

### Paging by walking `before` back

The index route has `limit` but no cursor, so "load more" re-asks the same query
with `before` set to the oldest listed entry's `startTime` **plus one second**
and appends what is new, de-duplicated by `archiveId`. Plus one rather than
minus: the bound is assumed exclusive, and an inclusive re-read of one entry is
free while a skipped one would be a hole.

`hasMore` is "the last page came back full". A page that adds nothing new stops
the offer regardless — the guard against a run of entries sharing one
`startTime`, where the window would otherwise never move.

Rejected: asking for the whole range at once. The archive is the store that
grows without bound; an unbounded read is the one thing it must never be asked
for.

### Filters

- **Camera**: a subset of the cameras configured for the events page, passed as
  `cameraIds`. The page reads the registry the same way the events page does.
- **Person**: a new `subLabel` filter on `ArchiveItemFilters`, from the same
  `doubleTakeService` list the events page offers.
- **Kind**: the kinds the contract names, plus "all" as the default. "All" sends
  no `kind` at all, so a kind the archive gains later reaches the list without
  this page being touched, and an unknown kind is labelled with its own raw
  value rather than being hidden.
- **Range**: the events page's controls and quick ranges, but opening on
  **seven days** rather than two hours. The events page opens on two hours
  because it is a page about what just happened; the archive is a page about
  what was kept, where two hours would almost always be empty. Bounded on open
  either way, which is what the requirement is actually for.

### The page reads again only while something is being prepared

Nothing in the archive changes by itself except a `pending` entry becoming
`ready` or `failed`. So the 5s interval — the `Debouncer` + `setInterval` shape
the events page and `KioskMigrations` share — is started when the list holds a
pending entry and cleared when it does not, plus on `beforeDestroy`.

Rejected: polling always, as the events page does. There it earns its keep
because new events arrive; here it would be a request every five seconds for a
list that only the user changes.

Rejected: no polling at all. A user who saves an event and walks over to the
archive would be left with an entry that stays "being prepared" until they
reload by hand.

### "Delete everywhere" becomes one function both pages call

The two-call sequence in `deleteEverywhere()` — source first, then the copy,
each 404 counting as gone — moves into `src/utils/recordingDeletion.ts` as a
plain async function taking `{ cameraId, eventId, archiveId }` and answering
`{ originGone, copyGone, hadCopy, reason }`. Each page keeps its own reporting
and its own list update, which is where the two genuinely differ: the events
page removes the event when the original went, the archive page removes the
entry when the copy went.

The archive page calls it with the source event whenever the entry names one,
even when `originExpiresAt` says the original is long gone. A `DELETE` on an
event that no longer exists answers 404, which `frigateService.deleteEvent()`
already counts as success — one wasted round trip against the certainty of not
leaving a recording behind, the same trade the events page already made.

Rejected: leaving the sequence on the events page and having the archive page
call into it. A page is not an API.

### No release control on this page

`event-archive-saving`'s release control distinguishes "drop the copy, the event
survives at its source" from "this is the last one". On the archive page the copy
is what the list shows, so a release would empty the row the user is looking at —
the same visible outcome as the delete, under a word that promises otherwise.
Only the permanent delete is offered here, which is also what
`event-permanent-delete` asks for.

### The shared components get their own translation namespace

The three strings both components need — `close`, `unknown`, `clipError` — move
from `page.kiosk.personenEvents` into a new top-level `component.events.*`, and
the archive page's own strings live under `page.kiosk.personenArchiv`. A
component that reached into one page's namespace while being used by another
would leave the next reader looking for the events page in the archive.

Rejected: passing the three as props. Text through props is how a component ends
up with a prop per label.

### Route and reachability

`/app/kioskpersonenarchiv`, route name `kioskPersonenArchiv`, a third
`KioskLinkPanel` in `KioskPersonen.vue` below "Events", and the page's own back
link to `KioskPersonen` — the shape every other `Kiosk*` page has. Not on the
kiosk overview, for the same reason the events page is not.

## Risks / Trade-offs

- **The extraction is the risk of this change, not the new page.** The events
  page's clip behaviour is exact and was verified by measurement. → The move
  is verbatim, and the five existing browser suites over the events page
  (`events-clip-stops-on-close`, `events-detail-responsive`, `events-timeline`,
  `events-archive-save`, `events-permanent-delete`) are run before and after and
  must both times pass unchanged. They are the gate; the new page's suite comes
  on top of them.
- **Every archive shape is still assumed.** → Unchanged from
  `archive-save-button`: the service is the only place that touches them. What
  is new is that a wrong shape is now visible rather than silent, because this
  page shows its error state instead of swallowing the failure — which is the
  better failure mode for the page whose whole subject is the archive.
- **A `subLabel` filter the server may not honour** would silently show
  unfiltered results. → It is one of the two things the deployed run has to
  check; the fallback, if it is not offered, is to drop the person filter rather
  than to filter a page of results client-side and call it a filter.
- **Paging by `before` re-reads one entry per page.** → Cheap, and the dedupe by
  `archiveId` is needed for concurrent saves anyway.
- **The dev server type-checks nothing**, so a broken prop type in the extracted
  components would run fine and fail the production build. → `npm run build` is
  a task of its own, not something left to the commit.

## Open Questions

- Which `kind`s the server will actually report once the archive is deployed.
  The filter is built from the kinds the contract names and passes an unknown
  one through, so a surprise costs a label, not the page.
- Whether the index route honours `label` / `subLabel` as the primer states.
  Assumed yes; see the risk above for what happens if it does not.
