## Why

An unwanted video currently cannot be got rid of. The events page can save an
event to the archive and release that copy again, but the original clip stays on
the node until the installation's retention passes it — there is no way to take a
recording out of the system on purpose. An operator who has to remove a specific
video (a person who must not be kept, a recording made in error) has no control
that does it, and nothing in the GUI even claims to.

The archive made this sharper rather than softer: a saved event now exists in two
places, so "delete it" means two removals, and today the user can only ever
perform one of them.

## What Changes

- A **permanent delete** control wherever a clip, video or recording is offered
  for playback: the event detail view of the events page today, the archive view
  and any later recordings list by the same requirement.
- Deleting removes the event **everywhere** — the clip, snapshot and thumbnail at
  its source and every archive copy made from it — in one user action, not two.
- An explicit confirmation that names what goes and says it cannot be undone,
  clearly distinct in wording from the existing "no longer keep" release.
- On a saved event the two controls stay apart: releasing the copy keeps the
  original, deleting takes both. Where the original is already gone, the delete
  control replaces the release control instead of standing next to a second
  control that does the same thing.
- A deleted event leaves the list at once rather than at the next refresh, and
  the open detail view closes with it.
- **No role check anywhere.** The control is offered to every user of the page;
  the confirmation is the whole protection. The GUI carries no working
  authentication to check against — `store.getters['keycloak/token']` resolves
  against a Vuex module that does not exist — and the role check that sat in
  `NavDrawer.vue` was dead code reading a `role` field that was `null` on every
  menu entry. Both the check and those fields are **removed**: a check that never
  ran only reads as a protection that is there.
- **Assumed server contract**, in the manner of the save button before it:
  `DELETE /cameras/{cameraId}/events/{eventId}` → 204. The route does not exist
  yet; the shape is written down here and in the service so the server can be
  built against it, and the GUI additionally releases a known archive copy so
  "everywhere" holds whether or not the server cascades.

## Capabilities

### New Capabilities
- `event-permanent-delete`: deleting a clip, video or recording for good — the
  control and where it has to appear, the confirmation, what "everywhere" covers,
  what the list and the detail view do afterwards, and how failure and a
  partially completed delete are reported.

### Modified Capabilities
- `event-archive-saving`: the release control is bounded to the archive copy and
  set apart from the new delete. Where the original is already gone, the detail
  view offers the permanent delete instead of a release that presents itself as a
  final deletion, so one meaning has one control.

## Impact

- `src/utils/webservices/frigateService.ts` — a delete for a past event, plus the
  assumed route in the contract comment that service carries.
- `src/utils/webservices/archiveService.ts` — `deleteItem` is reused as-is; the
  header comment records that it is now also the second half of a delete.
- `src/components/NavDrawer.vue` — the dead role check and the `role` fields it
  read are gone; the menu renders its entries unconditionally.
- `src/views/KioskPersonenEvents.vue` — the delete control next to save/release,
  a second `ConfirmDialog` wording, removal from `events` and from
  `archiveByEventId`, closing the detail dialog.
- `src/locales/de-AT.json`, `src/locales/en-US.json` — the control, the
  confirmation and the outcome messages.
- `java-overmind-server` — needs `DELETE /cameras/{id}/events/{eventId}`; until
  it answers, the control reports a failure and deletes nothing. The contract is
  written into that repo's `ai/open-proposals.md` as section F, together with the
  reminder that the customer-facing `docs/video-capabilities.md` has to name the
  deletion as well.
- The archive view (`ai/open-proposals.md`, section A) inherits the requirement
  and implements the control when that view is built.
