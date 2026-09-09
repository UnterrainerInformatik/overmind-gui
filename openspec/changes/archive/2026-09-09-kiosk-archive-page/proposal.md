## Why

Since `archive-save-button` a kiosk user can save a person event to the
long-term archive, but nothing in the GUI can show them what is in there. The
save control marks the event on the events page and that is the end of it: the
moment the node's retention passes, the original drops out of the events list
and the saved copy — the very thing the user pressed the button to keep — goes
with it off the screen. The archive is write-only from where the user stands.

This change is the missing half: the view that lists what was kept, plays it,
and lets it go again. It is section A of `ai/open-proposals.md`, the part that
was deliberately left out of `archive-save-button`.

## What Changes

- A new **Archiv page under Personen**, reachable by a `KioskLinkPanel` button
  directly below the existing "Events" button, with its own route and its own
  back link — the same shape every other `Kiosk*` page has.
- The page **lists the archive's entries** for the cameras configured for the
  events page, most recent first, with thumbnail, person name, timestamp,
  camera and zones — the same tile the events page shows.
- It shows what the events page structurally cannot: an **archive-only entry**,
  one whose original has already expired. That is the reason this view exists
  and not a detail of it.
- An entry's **state is visible**: an entry still being prepared (`pending`) is
  listed and marked as not yet playable, and a `failed` one is marked as failed
  with the server's own reason rather than silently listed as kept.
- **Filters** over camera, time range, person and kind, in the same controls
  and the same quick ranges the events page uses.
- **Playback of the archived copy** in the same detail dialog the events page
  opens, and the **permanent delete** the `event-permanent-delete` capability
  already requires of "the archive's own view of a saved entry".
- The tile and the detail dialog are **extracted from `KioskPersonenEvents.vue`
  into shared components** used by both pages, so there is one implementation of
  the grid, the snapshot/clip pair and the HLS teardown rather than two. The
  events page keeps its behaviour to the letter; only where its markup lives
  changes.
- `EventsTimeline` is **reused unchanged**, with archive entries mapped onto the
  event shape it already reads.

Not part of this change, and stated so the boundary is not read into it later:
archiving a **snapshot** (`POST /cameras/{id}/snapshot?archive=true`), alarms,
and the **recording jobs** of section B. All three land as further `kind`s in
the same list and none of them changes the view built here.

## Capabilities

### New Capabilities
- `kiosk-archive-page`: the archive's own view under Personen — listing what was
  kept for the configured cameras including entries whose original is gone,
  filtering it, seeing an entry's preparation state, playing the archived copy,
  and deleting an entry.

### Modified Capabilities
- `kiosk-personen-page`: gains an "Archiv" navigation button below the existing
  "Events" button, matching its width.

## Impact

- New `src/views/KioskPersonenArchiv.vue` and its route in
  `src/router/index.ts`; a third `KioskLinkPanel` in `src/views/KioskPersonen.vue`.
- New `src/components/EventTile.vue` and `src/components/EventMediaDialog.vue`,
  both lifted out of `src/views/KioskPersonenEvents.vue` — which loses that
  markup and the clip machinery and keeps everything else, its own actions
  included.
- `src/utils/webservices/archiveService.ts`: the index call gains the `label` /
  `subLabel` filters the contract already offers and which only this view needs.
- New translation keys in `src/locales/de-AT.json` and `src/locales/en-US.json`.
- **The backend still serves none of the archive routes.** The shapes are the
  ones `archiveService.ts` was checked against on 2026-09-07 — against
  `java-overmind-server`'s source, not against a running server. This page is
  built on the same assumption and is the second half of that bet; the run
  against a deployed node with a real archive behind it is still open and is
  carried in `ai/open-proposals.md` section A.
- Unlike the events page, this page has nothing to fall back to when the archive
  is unreachable: there it was a missing marker, here it is the page's error
  state. That difference is deliberate and is specified rather than left to the
  implementation.
- The customer-facing `java-overmind-server/docs/video-capabilities.md` describes
  this feature to the customer and stays that repository's to update.
