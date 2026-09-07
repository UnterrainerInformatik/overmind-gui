## Why

An event on the events page lives exactly as long as the node's Frigate
retention lets it. Anything worth keeping — the delivery that never arrived, the
person at the gate at 3am — is gone once that window passes, and the kiosk offers
no way to say "keep this one". The archive that holds such events is being built
on the server side; the GUI needs the one control that puts an event into it, and
the one that takes it back out again, before the archive is worth anything to a
user.

The full archive view (its own page under Personen, with its own filters and
playback) is deliberately **not** part of this change — see `ai/open-proposals.md`
section A, third construction site. This change is the pair of buttons in the
event detail dialog, and the knowledge of archive state that both of them need.

## What Changes

- The event detail dialog gains a **save control**. Activating it archives the
  event on the server and reports the outcome through the existing snackbar.
  A save that fails says so and leaves the event unarchived.
- An event that is **already archived** shows a marker instead of the save
  control — both in the detail dialog and on its tile in the list.
- An archived event gains a **release control whose meaning changes with the
  state of the original**, which is the point of this change rather than a
  detail of it:
  - the node still holds the original for **more than a day** → the control reads
    *"Nicht sichern"* and confirms in ordinary terms: only the copy goes, the
    event stays on the page until its normal retention passes.
  - the original is **already gone or expires within a day** → the control reads
    *"Löschen"* and confirms in the terms of a final deletion, because that is
    what it is.
  Which of the two applies is read from the archive entry's `originExpiresAt`,
  never computed here: the GUI does not know the installation's retention.
- The events page **loads the archive index for the range it is showing** and
  joins it onto the events by `sourceEventId`. That join is what answers "is this
  one already saved?", and it is the same join the later archive view needs.
- When the archive is **unreachable or not yet served**, the page keeps working:
  the events list stands unchanged, no archive markers are shown, and a save
  attempt reports its failure rather than pretending to have succeeded.

## Capabilities

### New Capabilities
- `event-archive-saving`: saving a person event to the long-term archive from
  its detail view, seeing that an event is already saved, and releasing a saved
  event again — under the two distinct meanings that release carries depending on
  whether the original still exists.

### Modified Capabilities
- `kiosk-personen-events-page`: the event detail view gains the save and release
  controls and the archived marker; list tiles mark an archived event; a failing
  archive index leaves the page's own behaviour untouched.

## Impact

- `src/views/KioskPersonenEvents.vue`: detail dialog actions, the archive index
  load alongside `loadEvents`/`refreshEvents`, a `ConfirmDialog` with two text
  variants, snackbar feedback.
- New `src/utils/webservices/archiveService.ts` for the archive routes and the
  `LocalDateTime` ↔ epoch conversion the other camera services already do.
- `src/store/rest.ts`: entries for `/cameras/{id}/events/{eventId}/archive`,
  `/archive/items` and `/archive/items/{archiveId}`.
- `src/utils/axiosUtils.ts`: `postToPath()` currently fills a single `{id}`; the
  archive POST carries two placeholders.
- New translation keys in `src/locales/de-AT.json` and `src/locales/en-US.json`,
  including the two release-control variants and their confirmation texts.
- **The backend does not serve any of this yet.** The routes and shapes are the
  ones stated in `ai/open-proposals.md` section A, which mirror the server-side
  primer in `java-overmind-server`; `design.md` records them as assumptions. The
  page is built so that their absence is a missing marker, not a broken events
  page.
- **Unverified against a real server (as of 2026-09-07).** Everything here was
  built and checked against the mocked archive in
  `~/.local/share/overmind-gui-verify/mocks/archive.mjs`; no call has ever
  reached a running overmind. `archiveService.ts` says the same at the top of
  the file and carries no verification date, unlike `frigateService.ts` - task
  7.4 is what puts one there, and it stays open until the archive routes are
  deployed. Until then the feature is invisible in production: every route
  answers 404, which the events page swallows.
- The customer-facing `java-overmind-server/docs/video-capabilities.md` describes
  this feature and stays that repository's to update.
