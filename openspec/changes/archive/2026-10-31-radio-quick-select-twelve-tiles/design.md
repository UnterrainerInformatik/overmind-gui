## Context

The station list is capped in one place: `audioService.getRadio` filters entries without a URI
and then does `.slice(0, 8)`. `AudioRadioDialog.vue` renders whatever it gets in a CSS grid
(`repeat(auto-fill, minmax(120px, 1fr))`, 8 px gap, tiles at least 110 px high) inside a
640 px wide, `scrollable` `v-dialog` that becomes fullscreen on `xsOnly`. Nothing else (store,
mixins) counts stations. The verification harness mock (`mocks/audio.mjs`) currently has 9
stations and the suite asserts exactly 8 tiles.

The real kiosk tablets have less vertical room than the 1280×600 harness viewport (see the
kiosk headroom note), so "fits" has to be checked with margin.

## Goals / Non-Goals

**Goals:**
- Twelve stations visible at once on the kiosk display, no scrolling.
- Keep a client-side cap so the popup stays bounded whatever the server sends.

**Non-Goals:**
- Paging, search or a "more stations" link for lists longer than 12.
- Changing tile look (image, name, ellipsis) beyond what is needed to fit.

## Decisions

- **Cap stays in the service, raised to 12.** Keeping the slice in `getRadio` means the dialog
  stays a dumb renderer, and the limit lives next to the response mapping. A named constant
  (`RADIO_STATIONS = 12`, mirroring the server's name) replaces the magic number. Alternative:
  drop the client cap and trust the server — rejected, the spec promises "at most 12" and an
  older server build or a changed constant should not blow up the dialog.
- **Desktop/kiosk grid unchanged.** At 640 px the card text area is ~592 px wide, so
  `minmax(120px, 1fr)` gives 4 columns → 3 rows of 4. Height: 3 × 110 + 2 × 8 ≈ 346 px of tiles
  plus title and padding ≈ 450 px, which fits the dialog's 90 % max height down to a viewport of
  roughly 500 px. Shrinking tiles pre-emptively would cost tap-target size for no gain; tighten
  (tile min-height, image size, gap) only if the check at reduced height fails.
- **`xsOnly` fullscreen gets a smaller minimum column width.** At ~390 px the 120 px minimum
  allows only 2 columns → 6 rows (~700 px), which scrolls on a phone. A `100px` minimum on
  `xsOnly` gives 3 columns → 4 rows (~470 px). Done via a modifier class bound to
  `$vuetify.breakpoint.xsOnly` rather than a media query, so it switches at the same breakpoint
  as the fullscreen prop. Phones are not the kiosk, so this is a nicety, not a spec guarantee.

## Risks / Trade-offs

- [Real tablets shorter than the harness] → verify the radio popup at 1280×600 *and* at a
  reduced height (1280×500) in the harness; the dialog is an overlay, so it adds no height to
  the kiosk page itself.
- [Long station names in narrower xs tiles] → names already ellipsize; acceptable.
