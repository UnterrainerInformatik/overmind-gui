## Context

See `proposal.md` — Why. The state that shapes the approach:

- `KioskPersonenEvents.vue` holds `events[]` (one page at a time, `PAGE_SIZE`
  30, more pages on demand) and re-reads the first page every 5s through
  `refreshEvents()`, merging additively so that open dialogs and scroll position
  survive. Anything this change adds has to survive that tick just as quietly.
- `frigateService` is the seam that turns overmind's wire shapes into the
  page's model: UTC `LocalDateTime` ↔ epoch seconds, relative media paths →
  absolute URLs, `eventId` → `id`. The archive answers in the same house shapes
  and needs the same two conversions.
- `ConfirmDialog.vue` takes its `confirmText` / `cancelText` as **props of the
  component**, not as arguments of `open(message, onConfirm)`.
- The snackbar is a global component mounted in `App.vue`, fed by
  `gui/snackbar/snackbarEnqueue` with `{ color, headingTKey, descriptionTKey,
  status, message }`. `loggingUtils` — the usual path into it — is inert:
  `activated` is `false` and nothing sets it, so `log.error()` from
  `axiosUtils.appendErrorCatcher` shows nothing today. A view that wants a
  snackbar has to dispatch it itself, and a failing request produces none by
  itself.
- `axiosUtils.appendErrorCatcher` does put the server's own refusal sentence on
  the thrown error as `serverMessage`.
- `axiosUtils.postToPath()` fills a single `{id}` placeholder; `getFromPath()`
  takes a params object and fills any number.
- The backend serves none of the archive routes yet.

## Goals / Non-Goals

**Goals:**

- The two controls in the event detail dialog, with the release control's two
  meanings driven by the server's `originExpiresAt` and nothing else.
- Archive state that comes from the archive's own index, so the same join
  carries over to the archive view of the next change unchanged.
- An absent or broken archive costs the events page nothing — no error card, no
  snackbar storm from the 5s tick, no missing events.

**Non-Goals:**

- The archive view under Personen, its filters and its playback surface. In
  particular this change does **not** list archive-only items: an event whose
  original has expired is gone from this list even when it is archived, and only
  the archive view brings it back.
- Archiving a snapshot (`POST /cameras/{id}/snapshot?archive=true`) and
  recording jobs — sections A/3 and B of `ai/open-proposals.md`.
- Reviving `loggingUtils`. Whether the app should log failures to the snackbar
  globally is a decision of its own; this change dispatches its own two messages
  and leaves the switch alone.

## Decisions

### The assumed contract

Taken from `ai/open-proposals.md` section A, which mirrors the server-side
primer in `java-overmind-server`. **Nothing here is verified against a running
server** — the change is built against these shapes and they are re-checked when
the backend lands, exactly as `camera-contract-alignment` had to do for the
camera registry.

| what | route |
| --- | --- |
| save an event | `POST /cameras/{id}/events/{eventId}/archive` → `{ archiveId }` |
| the index | `GET /archive/items?cameraIds=&after=&before=&kind=&limit=` → `{ items: [...] }` |
| release | `DELETE /archive/items/{archiveId}` → 204 |

An item carries `archiveId`, `cameraId`, `cameraName`, `kind`, `sourceEventId`,
`label`, `subLabel`, `subLabelScore`, `box`, `zones`, `startTime`, `endTime`,
`state` (`pending` | `ready` | `failed`), `failureReason`, `sizeBytes`,
`originExpiresAt`, `snapshotUrl` / `thumbnailUrl` / `clipUrl`. Times are UTC
`LocalDateTime`, absent fields are omitted rather than `null`, refusals carry a
`reason`. This change reads `archiveId`, `sourceEventId`, `state`,
`failureReason`, `originExpiresAt` and the three media URLs; the rest is what
the archive view will need and is normalised anyway so that service does not
have to be rewritten then.

### `archiveService.ts`, not a corner of `frigateService`

A service of its own, mirroring `frigateService`'s conversions (`toEpochSeconds`,
`toLocalDateTime`, `absoluteUrl` — the same three, deliberately duplicated
rather than exported from there, because they are four lines each and a shared
"conversion utils" module would be a third place to look).

It exposes `archiveEvent(cameraId, eventId)`, `getItems(cameraIds, { after,
before, limit })`, `deleteItem(archiveId)` and the pure `releaseKind(item)`.
Rejected alternative: hanging the three calls off `frigateService`. The archive
is a second media store with its own routes, and the next change grows this
service considerably; folding it into the events service would have to be undone
immediately.

### The index is read for the window the list spans, once per load and per tick

`loadEvents()`, `loadEvents(false)` ("load more") and `refreshEvents()` each read
the archive index alongside the events, with `cameraIds` as the events query
uses and the window the list actually covers: `after` = the start time of the
oldest listed event (the active `from` filter when the list is empty), `before` =
the active `to` filter. The result is folded into `archiveByEventId`, a map from
`sourceEventId` to the archive item, which is the single thing the marker, the
controls and the playback source read.

Alternative considered: asking about one event when its dialog opens. Rejected —
the list marker needs the whole window anyway, and it would put a second request
in the path of every dialog open while still not answering the list.

The window is deliberately derived from what is on screen rather than from the
filter alone: an unbounded filter would otherwise ask for the whole archive on
every tick. A page just brought in by "load more" is marked as soon as that
load's own index read returns, so the widened window is never more than one
request behind.

### A failed index read is silent

`getItems()` failures are caught in the view and change nothing: the map keeps
what it has (empty, on a first load), no error card, no snackbar. This is what
lets the change ship before the backend does — every route answers 404, the
markers never appear, and the events page behaves exactly as it does today. The
save control is still offered, and its failure is reported, because a user
pressing it deserves an answer rather than a control that quietly is not there.

### `releaseKind()` reads `originExpiresAt`, and only that

```
originExpiresAt absent                    -> 'delete'
originExpiresAt - now > ORIGIN_GRACE_HOURS -> 'unsave'
otherwise                                  -> 'delete'
```

with `ORIGIN_GRACE_HOURS = 24` named in the service. The GUI knows neither the
installation's retention nor the node's clock, so the field is the only input;
the threshold is a wording threshold, not a rule about data, and the server
remains free to disagree.

`'unsave'` also puts the expiry date itself in front of the user — both as "noch
bis …" beside the control and inside the confirmation — so the wording is
supported by the fact it was derived from rather than standing on its own.

### One `ConfirmDialog`, its labels bound to the pending release

`confirmText` being a prop rather than an argument of `open()` means the two
wordings cannot both come from one static instance. The view keeps
`pendingRelease` (the archive item plus its `releaseKind`) and binds
`:confirmText="releaseConfirmText"` to a computed off it, so the single instance
carries "Nicht sichern" or "Löschen" as the case requires, and the message passed
to `open()` is the matching sentence.

Rejected: two `ConfirmDialog` instances. Same markup twice for a label.

### Optimistic marking, index-authoritative

A successful `POST` answers only `{ archiveId }`, so the view inserts
`{ archiveId, sourceEventId, state: 'pending' }` into the map itself and the
marker appears at once; the next index read replaces it with the server's own
item. A successful `DELETE` removes the entry the same way. Neither touches
`events[]` — the join is a second map, so nothing about the list, its merge or
its scroll anchoring changes.

### Playback follows the archive entry's state

- `ready` → the dialog plays the archive item's `clipUrl` / `snapshotUrl`. One
  path, and the day the original expires nothing on screen changes.
- `pending` → the source's own media keeps playing (it must still exist: the
  event was archived seconds ago) with a note that the saved copy is still being
  prepared.
- `failed` → the source's media, and `failureReason` shown as a failure rather
  than a saved marker.

### `postToPath()` takes params

`postToPath(server, path, id, dataProvider)` becomes
`postToPath(server, path, idOrParams, dataProvider)`: an object is used as the
params map, anything else keeps meaning `{ id }`. Two callers today
(`cameraTest`, `nodeTest`) are unaffected. Rejected: a second method beside it —
the pair `getFromPath` / `postToPath` should keep answering the same question.

## Risks / Trade-offs

- **Every shape is assumed.** → The service is the only place that touches them,
  the mocks state them explicitly, and the tasks end with re-verification against
  the deployed server once it serves the routes. The failure mode until then is
  a 404 that the page swallows.
- **A wrong wording near the 24h boundary** (browser clock vs. node clock) →
  the confirmation names the expiry date, so a user near the boundary sees the
  fact, not just our reading of it.
- **One more request per 5s tick.** → It is one request for the whole page, on
  the same tick as the events read rather than an interval of its own, and it is
  skipped entirely while no camera is configured. A failing archive costs one
  aborted request per tick and nothing else.
- **The index window trails "load more" by one request.** → Accepted; a marker
  arriving a moment late on a page of old events is not worth a second request
  path.
- **`state: 'pending'` has no push channel**, so a freshly saved event stays
  "being prepared" until the next tick reads the index. → The 5s tick is the
  page's existing rhythm and is fast enough for a progress note.

## Open Questions

- Whether `GET /archive/items` bounds `after` / `before` on the item's start time
  with the same exclusivity as the events route. Assumed yes; a difference costs
  at most a marker at the very edge of the window and no code beyond the service.
- Whether the archive's media URLs arrive relative like the events' do. Assumed
  yes; `absoluteUrl()` passes an absolute one through unchanged, so either works.
