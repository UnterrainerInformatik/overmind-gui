## 1. The mocks first, so every assumed shape is written down once

- [x] 1.1 Add `~/.local/share/overmind-gui-verify/mocks/archive.mjs` with the three
      routes of `design.md` — an `items()` handler that honours `cameraIds`,
      `after`, `before` and `limit` the way `frigate.mjs`'s `eventsResponse()`
      does, an `archivePost()` write answering `{ archiveId }`, and a delete
      answering 204 — and verify by driving the handlers from a scratch node
      script that a window query returns only the items inside it
- [x] 1.2 Give the fixture items the four cases the wording depends on: an
      `originExpiresAt` several days out, one inside 24h, one omitted entirely,
      and one with `state: 'failed'` plus a `failureReason`; verify each fixture
      names exactly one of the four and that they are stamped relative to `now`,
      not fixed dates
- [x] 1.3 Add refusal variants (`{"reason": "…"}` for the POST and the DELETE) and
      an `unreachable` mode that answers 500 for the index; verify both are
      selectable per suite run the way `growableEvents().state.fail` is

## 2. The service seam

- [x] 2.1 Add `archiveItems: '/archive/items'`, `archiveItem` handling and
      `eventArchive: '/cameras/{id}/events/{eventId}/archive'` to `src/store/rest.ts`
      with a comment naming `ai/open-proposals.md` section A as the source and the
      shapes as assumed; verify the paths match the table in `design.md` character
      for character
- [x] 2.2 Generalise `axiosUtils.postToPath()` to take an object of path params
      beside the bare id, leaving `{ id }` as the meaning of anything else; verify
      the two existing callers (`cameraTest`, `nodeTest`) still resolve to their
      old URLs and that a two-placeholder path resolves with both filled
- [x] 2.3 Write `src/utils/webservices/archiveService.ts` with `archiveEvent()`,
      `getItems()`, `deleteItem()` and a normaliser that converts `LocalDateTime`
      to epoch seconds and the media paths to absolute URLs, mirroring
      `frigateService`; verify against the mocked index that `startTime`,
      `endTime` and `originExpiresAt` come back as numbers and the URLs absolute
- [x] 2.4 Add the pure `releaseKind(item)` and `ORIGIN_GRACE_HOURS = 24` to the
      service, following the three-line rule in `design.md`; verify it returns
      `delete` / `unsave` / `delete` for the three `originExpiresAt` fixtures of
      task 1.2

## 3. The join in the events page

- [x] 3.1 Hold `archiveByEventId` in `KioskPersonenEvents.vue` and fill it from one
      `getItems()` call issued alongside the events read in `loadEvents(true)`,
      keyed by `sourceEventId`; verify a mocked archived event is in the map after
      the first load
- [x] 3.2 Derive the index window from what the list spans — `after` from the
      oldest listed event (the `from` filter when the list is empty), `before` from
      the `to` filter — and re-read it on "load more" and on every `refreshEvents()`
      tick; verify by capturing the request URLs that the window widens with a
      paged-in older event and that exactly one index request goes out per tick
- [x] 3.3 Swallow an index failure: keep the map as it is, show no error card and
      dispatch no snackbar; verify against the `unreachable` mock that the events
      list, its filters and its 5s refresh behave exactly as with the archive
      absent, and that a 5s run produces no snackbar at all

## 4. The controls in the detail dialog

- [x] 4.1 Add the save control to the dialog's actions for an event with no
      archive entry, calling `archiveEvent()` and inserting
      `{ archiveId, state: 'pending' }` into the map on success; verify the marker
      appears without waiting for the next tick and the dialog stays open on the
      same event
- [x] 4.2 Guard the in-flight save — a loading state on the control and no second
      request on a second tap; verify by counting the POSTs the mock received
- [x] 4.3 Dispatch the outcome to `gui/snackbar/snackbarEnqueue` directly (a
      success message, and an error one carrying `err.serverMessage`), since
      `loggingUtils` is inert; verify both appear over the dialog against the
      accepting and the refusing mock
- [x] 4.4 Show the saved marker instead of the save control for an event that has
      an entry, and distinguish a `failed` entry from a saved one, showing its
      `failureReason`; verify against the `failed` fixture of task 1.2
- [x] 4.5 Add the release control bound to `releaseKind()`: `pendingRelease` in the
      view, `:confirmText` and the message computed off it, one `ConfirmDialog`
      instance; verify the same event shows "Nicht sichern" with its
      remaining-time note under the far-out fixture and "Löschen" with the final
      wording under the expiring and the missing one
- [x] 4.6 Delete on confirm and remove the map entry on success, leave everything
      untouched on cancel and on refusal (with the server's sentence in the
      snackbar); verify all three paths against the mocks

## 5. Playback and the list marker

- [x] 5.1 Play the archive item's `clipUrl` / `snapshotUrl` for a `ready` entry
      instead of the event's own; verify the video element's source is the archive
      URL for an archived event and the event URL for an unarchived one
- [x] 5.2 Keep the source media with a "still being prepared" note for `pending`
      and with the failure for `failed`; verify both notes appear against their
      fixtures and that neither leaves the dialog without media
- [x] 5.3 Mark an archived event on its tile in the grid; verify the marked tile
      is the one whose id the mocked index names, and that the event appears once

## 6. Translations

- [x] 6.1 Add every new key to `src/locales/de-AT.json` and `src/locales/en-US.json`
      — the save control, the saved and failed markers, both release wordings,
      both confirmation texts, the remaining-time note, the preparing note and the
      four snackbar messages — and verify neither file is missing a key the other
      has

## 7. Verification

- [x] 7.1 Run `npm run lint` and `npm run build` and verify both are clean (the dev
      server type-checks nothing, so the build is the only place a type error
      shows)
- [x] 7.2 Write `~/.local/share/overmind-gui-verify/suites/events-archive-save.mjs`
      covering the scenarios of `specs/event-archive-saving/spec.md` — save,
      refusal, double tap, both release wordings, cancel, failed entry, archive
      unreachable, playback source — and verify every check passes
- [x] 7.3 Run `events-live-updates`, `events-detail-responsive`,
      `events-clip-stops-on-close` and `events-timeline` and verify they still pass
      unchanged: the join must not have disturbed the merge, the anchoring or the
      clip teardown
- [ ] 7.4 Re-check the assumed shapes against `java-overmind-server` once it serves
      the archive routes, and record the verification date in `archiveService.ts`
      the way `frigateService.ts` does; until then note in the change that the
      feature is unverified against a real server
- [x] 7.5 Update the feature's row in `java-overmind-server/docs/video-capabilities.md`
      to state that saving and releasing exist in the GUI and what is still
      missing (the archive view); verify the ✅ / 🕓 markers match what is built.
      **Other repo — commit there separately.**
