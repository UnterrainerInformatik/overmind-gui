## Why

Closing an event's detail view on the kiosk events page does not stop the clip
that was playing in it. The dialog disappears, the events list comes back — and
the clip keeps running with its audio, behind a UI that no longer shows it and
offers no way to stop it short of leaving the page. On a kiosk left standing in
the Keller this is the worst possible failure mode: a voice or a noise from a
recording nobody can see and nobody can silence.

The same gap leaks the clip's Blob: the object URL is only revoked on the
explicit close buttons, so closing with Escape or a click outside the dialog
keeps a multi-megabyte clip alive in memory for the rest of the session, once
per event opened.

## What Changes

- Closing an event's detail view stops its clip: playback halts and the audio
  stops the moment the view closes, not when the user leaves the page.
- This holds for every way the view can be closed — the title-bar close button,
  the actions-row close button, the Escape key, and a click on the backdrop
  outside the dialog — which today behave differently from one another.
- The clip's buffered data is released on close as well, so opening many events
  over a kiosk session does not accumulate them in memory.
- Leaving the events page while a clip is playing stops it too.
- Re-opening the same or another event still plays its clip from the start, as
  it does today: stopping on close must not cost the automatic playback the
  view already has.

## Capabilities

### New Capabilities

(none — this corrects behavior of the existing events page capability)

### Modified Capabilities

- `kiosk-personen-events-page`: adds requirements covering what closing the
  detail view does to a playing clip. The existing closing requirements stay
  as they are — "the events list is shown again" remains true — and the new
  ones add that playback stops and the clip's data is released, for every
  closing path including Escape and backdrop click and when the page itself
  is left, without costing the view its playback on the next open.

## Impact

- `src/views/KioskPersonenEvents.vue` — the `closeEvent` / `releaseClipBlob` /
  `beforeDestroy` handling around the `<video ref="clipVideo">` element, which
  stays mounted across opens by design (a `v-show`, not a `v-if`, so the
  decoder is not respun on every click).
- No API, service, dependency or server-side changes: the fix is local to the
  view's own teardown of a media element it already owns.
