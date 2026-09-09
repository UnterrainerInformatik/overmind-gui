## 0. The dead role check

- [x] 0.1 Removed the role condition and the `role` fields it read from
      `src/components/NavDrawer.vue` — it never ran (`role` was `null` on every
      entry) and read a `keycloakClientRoles` the component never defined, so it
      claimed a gate this GUI does not have. `npm run lint` passes and the menu
      renders its entries unchanged.

## 1. The transport for a delete that carries ids in its path

- [x] 1.1 Add `deleteFromPath(server, endpointPath, params)` to
      `src/utils/axiosUtils.ts` next to `getFromPath` / `postToPath`, reusing
      `resolveEndpoint` and `internalDelete`, with the same JSDoc shape as its
      neighbours; verify by calling it against `archiveItems` in a scratch snippet
      or by the service call in 2.2 reaching the right URL in the network tab.
- [x] 1.2 Add the assumed route to `src/store/rest.ts` beside the archive block —
      `cameraEvents` already exists as `/cameras/{id}/events`, so add the entry
      and extend that comment with `DELETE cameraEvent/{eventId} -> 204`, stating
      as the archive entries do that the server does not serve it yet; verify by
      reading the file back and seeing one comment that covers both assumed
      contracts rather than two disconnected ones.

## 2. Services

- [x] 2.1 Extend the contract comment of `src/utils/webservices/frigateService.ts`
      with `DELETE /cameras/{id}/events/{eventId}` — 204 deletes the event and its
      media at the source, 404 means it is already gone, a refusal carries
      `reason`, dated and marked as *assumed, not yet served*; verify the comment
      names the same shape design.md does.
- [x] 2.2 Implement `deleteEvent(cameraId, eventId): Promise<void>` in
      `frigateService`, resolving on 204 **and** on 404 and rejecting on anything
      else; verify by calling it for a non-existent event id against the running
      server and seeing it resolve rather than throw.
- [x] 2.3 Note in `src/utils/webservices/archiveService.ts` that `deleteItem` is
      now also the second half of a permanent delete and must stay tolerant of a
      404 for the same reason; verify `deleteItem` resolves on a 404 and adjust it
      if it does not.

## 3. The control in the event detail dialog

- [x] 3.1 Replace `pendingRelease` in `src/views/KioskPersonenEvents.vue` with
      `pendingAction = { kind, item, event }` and rename `releaseConfirmText` to
      `confirmActionText` computed off it, leaving the release behaviour
      unchanged; verify the existing release still asks with the wording it asked
      with before, in both the `unsave` and the expiring case.
- [x] 3.2 Add the delete control to the dialog's action row — `color="error"`, its
      own `deleting` flag, the same second-tap guard the save has — offered on
      every playable event; verify it appears on an unsaved event, next to the
      release on a saved one with time left, and alone on one without.
- [x] 3.3 Apply the spec delta of `event-archive-saving`: no release control when
      `archiveService.releaseKind()` says `delete`, the permanent delete standing
      in its place; verify with an archive entry whose `originExpiresAt` is absent
      that exactly one destructive control is offered.
- [x] 3.4 Implement `deleteEverywhere(event)` — source first, then the archive
      entry when `archiveByEventId` names one, archive-only entries skipping the
      first step; verify a saved event issues both requests and an unsaved one
      issues a single request.
- [x] 3.5 Report the three outcomes through `notify()` — deleted, not deleted,
      partly deleted (naming what is still kept) — and remove the event from
      `events` and `archiveByEventId` and close the dialog only on the outcomes
      where the original actually went; verify each of the three by making the
      matching request fail in the network tab.

## 4. Wording

- [x] 4.1 Add the control label, the confirmation, and the three outcome messages
      under `page.kiosk.personenEvents` in `src/locales/de-AT.json` and
      `src/locales/en-US.json`, the confirmation naming the clip and the saved copy
      and stating that it cannot be undone; verify both files carry the same keys
      and that no key renders as its own path in the running GUI.
- [x] 4.2 Read the delete confirmation and the release confirmation side by side
      and verify they cannot be mistaken for one another — different sentence, not
      the same sentence with a stronger adjective.

## 5. Checks

- [x] 5.1 `npm run lint` passes with no new warnings.
- [x] 5.2 `npm run build` passes — the dev server does not type-check, so this is
      the check that a production build survives the change.
- [x] 5.3 Run the browser suite at `~/.local/share/overmind-gui-verify` against the
      events page and extend it with the delete: open an event, cancel the
      confirmation and verify nothing changed, then confirm it and verify the
      dialog closes and the entry is gone from the list.
- [x] 5.4 Verify the events page is untouched where it should be: the 5s refresh,
      the filters and the timeline behave as before after a deletion, and the
      remaining entries do not move.

## 6. Handover

- [x] 6.1 Entry written in `java-overmind-server/ai/open-proposals.md`, section F:
      the assumed route and its answers, the 404-is-success rule, the GUI's
      two-call sequence and why a redundant archive delete is not an error, the
      archive-only case, the open questions, and the reminder that
      `docs/video-capabilities.md` has to name the deletion once the route stands.
      Uncommitted in that repo.
