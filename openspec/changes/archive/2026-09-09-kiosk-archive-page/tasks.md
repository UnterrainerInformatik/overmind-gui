## 1. The mocks first, so the assumed shapes are written down before anything reads them

- [x] 1.1 Record the events page's current behaviour as the gate: run the five
      existing suites (`events-clip-stops-on-close`, `events-detail-responsive`,
      `events-timeline`, `events-archive-save`, `events-permanent-delete`)
      through `~/.local/share/overmind-gui-verify/run.sh` and verify all five
      pass and their screenshots land in `out/` — this is the "before" the
      extraction is measured against
- [x] 1.2 Extend `~/.local/share/overmind-gui-verify/mocks/archive.mjs` so its
      index answers a list worth paging: more items than one page, spread over
      several days and two cameras; verify a `limit`-bounded query returns
      exactly that many and that `before` moves the window backwards
- [x] 1.3 Give the fixtures the cases only this page can show: an **archive-only**
      entry (no `originExpiresAt`, a `sourceEventId` whose event the frigate mock
      does not have), a `pending` one, a `failed` one with a `failureReason`, and
      entries of a second `kind` beside `event`; verify each case is reachable by
      exactly one fixture and that the times are stamped relative to `now`
- [x] 1.4 Honour `kind` and `subLabel` in the index handler, and add a mode in
      which a `pending` entry flips to `ready` after the second read; verify by
      driving the handler from a scratch node script that the filters narrow the
      result and that the flip happens on the read it is meant to

## 2. The extraction, verbatim and with the events page unchanged

- [x] 2.1 Create `src/components/EventTile.vue` from the events page's tile —
      thumbnail, name, time, camera, zones, the highlight class and an optional
      `marker` prop `{ icon, tone, title }` — keeping `events-card` as the root
      class; verify by re-running `events-timeline` that `revealEvent()` still
      finds and scrolls to a tile
- [x] 2.2 Create `src/components/EventMediaDialog.vue` from the detail dialog:
      the `v-dialog` with its fullscreen breakpoint, `showSnapshot` / `mediaSolo`,
      the whole hls.js lifecycle including `startClip`'s re-check after
      `$nextTick`, the muted-playback fallback, the non-reactive player property,
      the teardown on the open flag and on unmount, the close control, and the
      `state` / `actions` slots; verify with `events-clip-stops-on-close` and
      `events-detail-responsive` that both still pass unchanged
- [x] 2.3 Move `close`, `unknown` and `clipError` from `page.kiosk.personenEvents`
      into a new `component.events.*` in both locale files and point the two
      components at them; verify no key is left without a reader and none is read
      without existing (`grep` both directions over `src/`)
- [x] 2.4 Rewrite `KioskPersonenEvents.vue` onto the two components, keeping
      `mediaOf()`, the archive marker's wording, the save / release / delete
      actions and the `pendingAction`-bound `ConfirmDialog` where they are;
      verify all five suites of task 1.1 still pass, and that the file is
      materially shorter than the 1564 lines it started at
- [x] 2.5 Move the two-call delete sequence into
      `src/utils/recordingDeletion.ts` as `deleteRecording({ cameraId, eventId,
      archiveId })` → `{ originGone, copyGone, hadCopy, reason }`, with the
      events page reporting and updating its list as before; verify
      `events-permanent-delete` passes, including its half-finished-deletion case

## 3. The service seam

- [x] 3.1 Add the `subLabel` (and `label`) filter to `ArchiveItemFilters` and
      `getItems()`, encoded like `kind` is; verify by capturing the request URL
      that the parameter is sent only when set and is URL-encoded
- [x] 3.2 Note in the service's header comment that the archive view is now its
      second caller and what it reads beyond the save button's fields; verify the
      comment still names the 2026-09-07 source check and that the deployed run
      is still open

## 4. The page and its way in

- [x] 4.1 Add the route `/app/kioskpersonenarchiv` (name `kioskPersonenArchiv`)
      and a `KioskLinkPanel` labeled "Archiv" below the "Events" button in
      `KioskPersonen.vue`, plus the back link on the new page; verify by
      navigating both ways in the browser that the button sits below "Events" at
      the same width and both links land where they should
- [x] 4.2 Build `src/views/KioskPersonenArchiv.vue` around the camera registry
      read the events page does and one `getItems()` call, mapping each item to
      the listing shape `{ id, startTime, subLabel, zones, camera, thumbnailUrl }`
      while keeping the item beside it; verify the mocked entries render as tiles
      most recent first, each shown once
- [x] 4.3 Mark an entry's state on its tile and in its detail view — not yet
      playable for `pending`, failed with the server's reason for `failed`,
      nothing for `ready`; verify each against its fixture from task 1.3
- [x] 4.4 Add the filter bar: camera, person, kind (defaulting to "all", sending
      no `kind`), and the events page's range controls and quick ranges opening
      on seven days; verify by capturing the request URLs that each control
      narrows the query and that "all" sends no `kind` parameter
- [x] 4.5 Page by walking `before` back one second past the oldest listed entry,
      de-duplicating by `archiveId`, with "load more" offered while the last page
      came back full and withdrawn when a page adds nothing new; verify against
      the multi-page fixture that every entry is reached exactly once and the
      offer ends
- [x] 4.6 Show `EventsTimeline` beside the grid with the mapped entries, the same
      reveal on activating a mark, and the same withdrawal on a narrow viewport;
      verify a mark reveals and highlights its tile and that the strip is gone
      below the width the events page drops it at
- [x] 4.7 Distinguish the empty state from the error state: nothing kept for the
      current filters says so, an unreachable archive says the archive could not
      be read; verify both against the ordinary and the `unreachable` mock

## 5. Playing and deleting

- [x] 5.1 Open `EventMediaDialog` on a selected entry with the entry's own
      archived media, showing name, time, camera and zones; verify the archived
      clip plays and that an archive-only entry plays exactly like any other
- [x] 5.2 Put the "not ready yet" statement in place of the media for a `pending`
      entry and the failure reason for a `failed` one; verify neither shows a
      broken player
- [x] 5.3 Offer the permanent delete in the dialog's actions — and no release
      control — behind the `ConfirmDialog` with the deletion wording; verify the
      confirmation names that nothing is kept and that dismissing it deletes
      nothing
- [x] 5.4 Call `deleteRecording()` with the entry's `sourceEventId` and
      `cameraId` where it names one, and with the `archiveId` alone where it does
      not; verify against the mock that both requests go out for an entry with a
      source, that a 404 on the source counts as gone, and that the entry leaves
      the list and the dialog closes
- [x] 5.5 Report a refused or half-finished deletion through the snackbar with
      the server's own sentence, leaving the entry in the list; verify against
      the refusing mock that the entry stays and the message names what is still
      there

## 6. Keeping itself current

- [x] 6.1 Start the 5s `Debouncer` + `setInterval` read only while a listed entry
      is `pending`, and clear it when none is left and on `beforeDestroy`;
      verify with the flip mock that a pending entry becomes playable without a
      reload, that the requests stop afterwards, and that leaving the page stops
      them immediately
- [x] 6.2 Keep a re-read from disturbing the user: an open detail view stays on
      its entry, the scroll position is kept, and a failed re-read leaves the
      list standing; verify by scrolling, opening a dialog and letting two reads
      pass, and against the `unreachable` mock mid-run

## 7. Verification

- [x] 7.1 Write `~/.local/share/overmind-gui-verify/suites/archive-page.mjs`
      covering the archive-only entry, the state markings, the filters, the
      paging, the pending flip and the two failure states; verify it passes and
      leaves its screenshots in `out/`
- [x] 7.2 Re-run the five events suites of task 1.1 and verify they pass exactly
      as they did before the extraction
- [x] 7.3 Run `npm run lint` and `npm run build` and verify both come back clean —
      the dev server type-checks nothing, so the build is the only thing that
      catches a wrong prop type in the extracted components
- [x] 7.4 Verify `ai/open-proposals.md` still reads right after this change:
      section A is already gone (it was deleted when this change was created,
      per the file's own rule), and what remains of it — the standing acceptance
      run against a deployed server — must still be there and still name this
      page
- [x] 7.5 Not a task of this change and deliberately left open: the run against
      a **deployed** server with a real node behind it — save an event, see it
      marked, find it in the archive view, play it, delete it. It is carried in
      `ai/open-proposals.md` as a standing open point so that archiving this
      change does not lose it; verify that entry is intact before archiving
