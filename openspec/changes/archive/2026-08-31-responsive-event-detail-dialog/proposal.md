## Why

The event detail dialog on the Kiosk Personen Events page has a fixed
`max-width` and an uncapped height: the snapshot and the clip video are
stacked at full width with no height budget, so on a small or short
viewport the card grows past the screen and the `v-card-actions` row —
which holds the only close control — is pushed out of reach. The dialog
is the one place where a user reviews an event, and on the kiosk tablet
in landscape it can currently be impossible to close without a keyboard
`Esc` or a click on the overlay.

## What Changes

- The detail dialog is height-capped to the viewport instead of growing
  with its content; only the body between the title and the actions
  scrolls, so the title and the actions row stay on screen at every
  viewport size.
- A close affordance is always reachable: an icon button in the dialog
  title in addition to the existing text button in the actions row.
- Media inside the dialog is fitted to the space that is left rather than
  sized at intrinsic aspect ratio only — snapshot and clip get a
  max-height so neither can push the actions row off screen.
- When vertical space is tight and the event has a playable clip, the
  still snapshot is dropped rather than shrinking both media elements to
  unusable size; an event without a clip always keeps its snapshot.
- The dialog goes full-screen on the smallest breakpoint so the available
  space is used instead of wasted on overlay margins.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `kiosk-personen-events-page`: the "Event detail view" requirement gains
  responsive behavior — a viewport-capped dialog with a permanently
  visible close control, fitted media, and the snapshot dropped in favor
  of the clip when space is tight.

## Impact

- `src/views/KioskPersonenEvents.vue` — the `v-dialog`/`v-card` block in
  the template, its `events-detail-*` styles, and a small amount of
  breakpoint state in the script.
- No locale change needed: the existing
  `page.kiosk.personenEvents.close` key labels the added close icon.
- No API, service, or data-flow change: `frigateService` /
  `doubleTakeService` usage, clip fetching and blob lifecycle are
  untouched.
