## Context

See proposal.md — Why. The design-relevant part of the current state:

`KioskPersonenEvents.vue` shows the clip in a plain `<video ref="clipVideo">`
inside a `v-dialog` bound to `detailDialog`. Two properties of that setup are
what make the bug possible, and both are deliberate:

- The `<video>` is kept mounted across opens (`v-show`, not `v-if`) so a fresh
  decoder is not spun up on every tile click. `playClipWhenReady()` calls
  `video.load()` to make the still-mounted element pick up the new `src`.
- The dialog's content likewise stays in the DOM once opened: `selectedEvent`
  is never cleared, so `<v-card v-if="selectedEvent">` stays rendered, and
  Vuetify hides a closed `v-dialog` rather than unmounting it.

So closing the dialog hides a `<video>` that is still playing. Nothing in the
close path touches the element: `closeEvent()` sets `detailDialog = false` and
calls `releaseClipBlob()`, and revoking an object URL has no effect on media
that is already loaded — the element plays on from its buffer.

The second half of the bug is that `closeEvent()` is not the only close path.
It is wired to the two close buttons only; Escape and a backdrop click are
handled by `v-dialog` itself, which just writes `false` through the `v-model`.
Those paths run no cleanup at all today, which is why they also leak the Blob.

## Goals / Non-Goals

**Goals:**

- One teardown path that every way of closing the dialog goes through, so the
  button paths and the Vuetify-internal paths cannot drift apart again.
- Teardown that actually silences the element, not just its source URL.
- Keep the existing "clip starts by itself, decoder is not respun per click"
  behavior intact.

**Non-Goals:**

- Reworking how the clip is fetched (the Blob-instead-of-streaming decision and
  its rationale stay exactly as they are).
- Replacing the raw `<video>` with `VideoStream`/`VideoStreamRtc`; those wrap a
  live stream, not a downloaded clip.
- Preserving playback position across close/open — the spec asks for a restart.

## Decisions

### Hang the teardown off a `detailDialog` watcher, not off the click handlers

`v-model="detailDialog"` is the one thing every closing path has in common:
both close buttons go through `closeEvent()`, and Escape and the backdrop click
are written straight through the model by `v-dialog`. Watching the flag for a
`true → false` transition therefore catches all four with one piece of code.

Alternative considered — binding `@click:outside` and `@keydown.esc` next to
the existing `@click="closeEvent"` handlers: rejected. It restates the same
intent in four places, and it depends on the exact set of dismiss affordances
Vuetify offers, so a fifth one (or a `persistent`/`retain-focus` change later)
silently reopens the bug. The watcher depends only on the dialog being closed
at all.

With the watcher in place `closeEvent()` collapses to setting the flag — it
stays as the button handler, but no longer carries the cleanup.

### Stop the element, then detach its source

Pausing is what satisfies the requirement, but pausing alone leaves the decoder
holding the clip's buffered data, which is the memory half of the bug. The
teardown therefore pauses, drops the `src` from the element, and calls `load()`
so the element actually lets the old media go, and only then revokes the object
URL via the existing `releaseClipBlob()`.

Order matters: revoking first (what the code does today) is what makes the
current cleanup a no-op on the element. Detaching the source while the element
still references the URL is what frees the buffer.

Alternative considered — unmounting the `<video>` with `v-if` on the dialog's
open state and letting the browser collect it: that is the smaller diff, but it
gives up the mounted-element optimisation `playClipWhenReady()` was written
around and its comment documents. Not worth trading a deliberate performance
decision for a teardown that can be written explicitly.

### Route `beforeDestroy` through the same teardown

Leaving the page is a fifth way for the clip to end up unattended, and the
route change unmounts the component without ever flipping `detailDialog`.
`beforeDestroy` already calls `releaseClipBlob()`; it calls the fuller teardown
instead, so the "leaving the page stops the clip" scenario and the close
scenarios share one implementation.

### Keep restart-on-open working via the existing `load()`

`playClipWhenReady()` already calls `video.load()` after a new `src` lands, so
an element the teardown left source-less is re-initialised on the next open
with no extra work. Re-opening the *same* event re-fetches and rebuilds the
Blob URL through the normal `openEvent → loadClipBlob` path, which assigns a
fresh `clipBlobUrl`; the restart requirement falls out of that rather than
needing its own handling.

## Risks / Trade-offs

- **Clearing `src` on a `<video>` can make Chrome log a spurious media error
  for the aborted load** → detach by removing the attribute and calling
  `load()` (the documented way to reset a media element) rather than assigning
  `''`, which is what resolves to the page URL and produces a real failed
  request.
- **The watcher fires on open as well** → it must act only on the `false`
  transition, or it would tear down the element in the same tick
  `loadClipBlob()` is preparing it.
- **Re-opening the same event costs a second fetch of the clip** → accepted:
  it is what happens today too, the clips are a few MB, and the alternative
  (caching Blobs per event) is a different change with its own eviction
  question.
- **`$refs.clipVideo` is absent when no clip-bearing event was ever opened** →
  the teardown has to tolerate a missing ref, the way `playClipWhenReady()`
  already does.

## Migration Plan

Not applicable — a behavioral fix inside one view, with no persisted state, no
API surface and no data to migrate. Rollback is reverting the commit.
