## 1. Dialog shell fits the viewport

- [x] 1.1 Give the detail `v-card` its own class (`events-detail-card`) and
  make it a capped flex column (`max-height: 90vh`, title/actions
  `flex: 0 0 auto`, `v-card__text` `flex: 1 1 auto; overflow-y: auto`),
  with `overflow: hidden` on the dialog so the card owns the scrolling;
  verify in the browser that a clip event on a 1280x600 viewport shows
  the actions row without scrolling and that only the body scrolls
- [x] 1.2 Bind `:fullscreen="$vuetify.breakpoint.xsOnly"` on the
  `v-dialog` and override the card to `height: 100%; max-height: 100%`
  under `.v-dialog--fullscreen`; verify at 360x640 that the dialog fills
  the viewport and the actions row is still visible

## 2. Close control always reachable

- [x] 2.1 Add a `v-btn icon` with the `close` icon to the right of the
  dialog title (`v-spacer` between), wired to `closeEvent`, labeled from
  the existing `page.kiosk.personenEvents.close` key; verify clicking it
  closes the dialog and returns to the list exactly like the actions-row
  button, and that the clip blob is released (no growing
  `URL.createObjectURL` leak across open/close cycles)

## 3. Media fitted to the remaining space

- [x] 3.1 Add a `showSnapshot` computed — snapshot shown unless the event
  has a clip, the clip has not errored, and space is tight
  (`$vuetify.breakpoint.xsOnly || $vuetify.breakpoint.height < 640`) —
  and drive the snapshot `v-img` with `v-if`; verify on a short viewport
  that a clip event renders no snapshot and issues no snapshot request,
  while a clipless event still shows it
- [x] 3.2 Cap snapshot and video with `max-height` in `vh` plus
  `object-fit: contain` (smaller cap while both are shown, larger when
  the media stands alone); verify a portrait-ish snapshot on a short
  viewport shrinks to fit instead of forcing the body to scroll
- [x] 3.3 Verify the clip path is unchanged: the `<video>` stays mounted
  via `v-show`, `playClipWhenReady()` still autoplays (falling back to
  muted), and reopening a second event swaps the clip without a stale
  frame

## 4. Verification

- [x] 4.1 Add a suite under `~/.local/share/overmind-gui-verify/suites/`
  (e.g. `events-detail-responsive.mjs`) with the mocks it needs, opening
  the detail dialog at 1920x1080, 1280x600 and 360x640 for both a clip
  and a clipless event; assert on **computed style** (card max-height,
  body `overflow-y`, media height) and on the close button's bounding box
  lying inside the viewport, and capture screenshots to `out/`
- [x] 4.2 Run `npm run lint` and the new suite via
  `~/.local/share/overmind-gui-verify/run.sh events-detail-responsive`;
  verify both pass and review the screenshots for layout regressions on
  the grid behind the dialog
