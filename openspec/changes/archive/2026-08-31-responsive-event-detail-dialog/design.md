## Context

The detail view is the `v-dialog` block at the bottom of
`src/views/KioskPersonenEvents.vue`: `max-width="720"`, an outlined
`v-card` with title, `v-card-text` (timestamp, `v-img` snapshot, and for
clip events a `<video>` fed from a blob URL) and a `v-card-actions` row
whose only child is the close button. Nothing caps the card's height, so
the card is as tall as its media and the actions row is simply pushed
below the fold. The `<video>` element is deliberately kept mounted across
opens (`v-show`, not `v-if`) so the decoder is reused — see the comment
on `playClipWhenReady()`; the snapshot has no such constraint.

Constraints that shape the approach: Vuetify 2, no test runner in the
repo (verification is the Puppeteer harness at
`~/.local/share/overmind-gui-verify`), and the primary target is a kiosk
tablet, i.e. touch, often landscape, where `Esc` is not available.

See proposal.md — Why for motivation, and the delta spec for the
required behavior.

## Goals / Non-Goals

**Goals:**
- Bound the dialog by the viewport and make the body the only scroll
  region.
- Keep the clip playback path (blob URL, mounted `<video>`, autoplay
  fallback) bit-for-bit unchanged.

**Non-Goals:**
- No change to the event grid, filters, paging, or services.
- No new snapshot/clip toggle UI — dropping the snapshot is automatic,
  not user-controlled.
- No redesign of the dialog's content or ordering.

## Decisions

**Flex card with a capped height, not `overflow` on the dialog.**
The `v-card` becomes `display: flex; flex-direction: column` with
`max-height: 90vh`; title and actions get `flex: 0 0 auto`, the
`v-card__text` gets `flex: 1 1 auto; overflow-y: auto`. Vuetify's own
`.v-dialog` already scrolls its whole content at `max-height: 90%`, which
is exactly the broken behavior — it scrolls the actions row out of view
too — so the dialog gets `overflow: hidden` and the card owns the
scrolling. Alternative considered: leaving Vuetify's dialog scroll and
adding a floating close button over the content; rejected because a
floating control over a `<video>` fights the native player controls.

**`:fullscreen` on `xsOnly` rather than a CSS width override.**
`v-dialog`'s `fullscreen` prop is the supported path and brings the right
border-radius/margin handling with it; a hand-written `width: 100vw`
override would have to fight `.v-dialog`'s own rules. Under
`.v-dialog--fullscreen` the card's `max-height: 90vh` is overridden to
`100%` so the flex layout still resolves.

**Snapshot dropped via `v-if` on a computed, not a CSS media query.**
`showSnapshot` is a computed: the snapshot is shown unless the event has
a playable clip *and* space is tight. "Tight" is
`$vuetify.breakpoint.xsOnly || $vuetify.breakpoint.height < 640` —
`$vuetify.breakpoint` is reactive in both dimensions, so a rotation or
resize re-evaluates it while the dialog is open. A CSS `display: none`
would leave `v-img` fetching a full snapshot the user never sees; `v-if`
skips the request. The clip's error state is part of the condition: if
the clip failed to load (`clipError`), the snapshot is kept even when
space is tight, otherwise a short viewport plus a broken clip leaves the
dialog with no media at all.

**Media fitted by `max-height` in `vh`, not by aspect ratio.**
Snapshot and video get `max-height` (roughly half the viewport when both
are present, more when alone) plus `object-fit: contain`, so the media
shrinks before the body has to scroll. Aspect-ratio sizing was rejected:
it fixes the height relative to the width, which is what lets a wide
short viewport blow the card open vertically.

**Close icon in the title, existing button kept.**
A `v-btn icon` with the `close` icon is added to the right of the title,
labeled from the existing `page.kiosk.personenEvents.close` key — no new
locale key. The actions-row button stays, so the change is additive and
the existing close path (and `closeEvent()`'s blob release) is untouched.

## Risks / Trade-offs

- **Vuetify's `.v-dialog` / `.v-card__text` rules out-specify the new
  styles and the change silently does nothing** → verify in the browser
  against computed style, not against the diff; this project has been
  bitten by inflated-specificity Vuetify selectors before. Scope the
  overrides through the card's own class (`.events-detail-card`) rather
  than bare element selectors.
- **A fixed 640px height threshold is a guess** → it only decides whether
  the snapshot is dropped; both branches are usable, and the value is a
  single constant to retune once seen on the kiosk tablet.
- **Dropping the snapshot removes information** → only for events that
  have a clip, whose first frame is essentially the snapshot; clipless
  events always keep it.
- **`max-height: 90vh` on a browser with a dynamic URL bar** → `vh` on
  mobile Chrome can exceed the visible area; acceptable, since the kiosk
  runs a fixed chrome-less viewport and the `xsOnly` case is fullscreen
  anyway.

## Migration Plan

Not applicable — a self-contained view change with no data, API, or
storage impact. Rollback is reverting the single file.
