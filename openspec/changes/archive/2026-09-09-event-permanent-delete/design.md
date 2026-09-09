## Context

See proposal.md — Why. What shapes the approach here is what already exists
around a person event:

- `KioskPersonenEvents.vue` holds the list, the detail dialog, the save control
  and the release control, plus one `ConfirmDialog` instance whose confirm label
  is computed off `pendingRelease` because `ConfirmDialog` takes `confirmText` as
  a **prop**, not as an argument of `open()`.
- Two services answer for the two places a recording lives: `frigateService` for
  the event at its source, `archiveService` for the copy. `archiveService`
  already has `deleteItem(archiveId)` against `DELETE /archive/items/{archiveId}`,
  which the release uses.
- The server has **no** route that removes an event at its source. The archive
  routes in `store/rest.ts` are already documented as assumed-and-not-yet-served;
  this change adds a second such entry rather than inventing a new practice.
- `axiosUtils` has `getFromPath` and `postToPath` for endpoints that carry ids
  *inside* the path, but no delete counterpart — `del()` can only append an id to
  a collection path.
- Outcomes are reported by `notify()` in the view, straight to the snackbar
  store, because `loggingUtils` is inert.

## Goals / Non-Goals

**Goals:**

- One user action removes a recording from both places it can live.
- The delete and the release stay visibly and verbally apart, including in their
  confirmations.
- The GUI is honest when only half of a deletion went through.
- The spec is written surface-agnostically, so the archive view and any later
  recordings list inherit the control without a second proposal.

**Non-Goals:**

- Any role or permission check (proposal.md — What Changes). The confirmation is
  the only barrier, and the reason is recorded in the spec so it reads as a
  decision rather than an oversight. The dead check in `NavDrawer.vue` goes with
  it — see Decisions.
- An undo, a wastebasket or a grace period. "Endgültig" is the feature.
- A bulk delete over a selection. One recording at a time; a multi-select is a
  separate design with a separate confirmation problem.
- Building the archive view or a recordings list. Those surfaces get the control
  when they are built.

## Decisions

### The assumed contract: `DELETE /cameras/{cameraId}/events/{eventId}` → 204

Written down here, in `frigateService`'s header comment and in `store/rest.ts`
next to the archive entries, so the server can be built against a stated shape
rather than against a guess that lives only in a diff. The house shapes hold:
times UTC, absent fields omitted, a refusal carrying `reason`.

- `204` — deleted.
- `404` — counted as **success**. Deleting what is already gone is the state the
  user asked for, and a node that dropped the event by retention a second earlier
  must not produce an error message.
- Anything else — a failure, reported with the server's own `reason`.

*Alternative considered:* `DELETE /cameras/{id}/events/{eventId}?includeArchive=true`,
one call that cascades. Rejected because the GUI would then depend on a server
behaviour it cannot observe: if the cascade silently did nothing, the copy would
stay and the GUI would report a full success. The two-call sequence below holds
whether or not the server cascades.

*Alternative considered:* reusing `POST .../archive`'s neighbourhood with a
`POST .../delete`. Rejected — a deletion is a DELETE, and the route with the
event in it is the one the server already resolves camera → node for.

### Two calls, source first, and the second one is not skipped

`deleteEverywhere(event)`:

1. `frigateService.deleteEvent(cameraId, eventId)` — the original.
2. if `archiveByEventId[eventId]` names an entry:
   `archiveService.deleteItem(archiveId)` — the copy.

Source first, because it is the one that keeps producing a playable recording
while it exists; the archive copy is the one the user can still get rid of by
hand through the release control if step 2 fails.

Step 2 runs even when the server may already have cascaded: `DELETE` on an
absent archive entry is a 404, and 404 counts as success. The cost of the
redundant call is one request; the cost of skipping it is a copy left behind on
an assumption.

An archive-only entry (no original, `originExpiresAt` unknown or gone) skips step
1 and runs step 2 alone — the same control, the same wording, as the spec
requires.

### Partial failure is its own outcome

Three results, three messages: deleted, not deleted, partly deleted. The third
names what is still kept ("the saved copy is still there"), because that is the
one the user can act on — and because reporting it as a plain success would leave
the recording playable after the GUI said it was gone.

The optimistic list removal only happens on the full success and on the partial
one where the original went; if only the copy went, the event stays listed and
loses its saved marking, which is exactly what the release already does.

### One `ConfirmDialog`, one pending action

`pendingRelease` becomes `pendingAction = { kind: 'unsave' | 'delete-copy' |
'delete-everywhere', item, event }`, and `releaseConfirmText` becomes
`confirmActionText` computed off it. The alternative — a second `ConfirmDialog`
instance for the delete — was rejected because the file already carries the
comment explaining why there is one instance, and two would invite a third.

The delete confirmation is a different sentence from the release's, not a
stronger adjective on the same one: it names the clip and the saved copy
explicitly and ends with the statement that this cannot be undone.

### `axiosUtils.deleteFromPath(server, endpointPath, params)`

The missing counterpart to `getFromPath`/`postToPath`, four lines, reusing
`resolveEndpoint` and `internalDelete`. Putting the path together in
`frigateService` instead would be the first place in the codebase where a service
builds a URL by hand.

### The dead role check leaves with this change

`NavDrawer.vue` carried `subItem.role == null || keycloakClientRoles.includes(subItem.role)`
over a `role` that was `null` on every menu entry, against a
`keycloakClientRoles` the component never defined. It therefore never ran — the
`role == null` half short-circuited every time — and would have thrown had a
single entry ever named a role.

It is removed together with the `role` fields it read, rather than left in place
while this change ships a deliberately ungated deletion. Leaving it would make
the codebase claim a gating mechanism it does not have, in the one release where
that claim matters most.

*Alternative considered:* fixing it — wiring a real Keycloak module and gating
the delete on a role. That is a change of its own about identity, not about
deleting a video, and it cannot be done honestly as a side effect of this one.

### Where the control sits

In the detail dialog's action row, after save/release, `color="error"`, with its
own loading state (`deleting`) and the same "guard, not just the disabled state"
double-tap check the save has.

`v-if`: offered on every event the dialog can play. On a saved event whose
original still has more than `ORIGIN_GRACE_HOURS` left it stands **next to** the
release; below that threshold, and on an archive-only entry, it stands **instead
of** it (spec delta, `event-archive-saving`).

## Risks / Trade-offs

- **The route does not exist yet, so the button fails on today's server** → the
  failure path is honest and specific (the server's own `reason`, no optimistic
  removal), the assumed shape is recorded in three places, and the archive-only
  case works from day one because it uses the route that is already served.
- **No role check: anyone who reaches the page can delete a recording for good**
  → accepted deliberately and written into the spec, with the confirmation naming
  the irreversibility. Whoever reaches this GUI reaches every page in it; the
  deletion adds no new question of access that the live view and the person
  management do not already pose.
- **Two calls are not a transaction** → the partial outcome is a first-class
  result rather than an edge case, and both calls are idempotent, so repeating
  the action after a partial failure converges.
- **Deleting an in-progress event** (no `endTime` yet) → the node may keep
  writing to it. The control is offered anyway and the server's answer decides;
  the GUI states no rule of its own about it.
- **A partly deleted recording could reappear on the next 5s refresh** → that is
  correct behaviour, not a bug: what the server still has is what the list shows.

## Migration Plan

No data migration, no flag. The control ships dark in the sense that its main
route answers 404 until the server change lands; the archive-only path works
immediately. Rollback is removing the control — nothing persists GUI-side.

Order: this change first, server route second. The server has the contract in
its own backlog (`java-overmind-server/ai/open-proposals.md`, section F),
including the reminder that the customer-facing `docs/video-capabilities.md`
there gains the deletion once the route answers.

## Open Questions

- Does the server cascade into the archive when it deletes an event? The
  sequence above works either way, so this can be answered when the route lands —
  and if it does cascade, step 2 becomes a 404 and nothing changes.
- Should a delete also be offered on an event still in progress? Left to the
  server's answer for now (see Risks).
