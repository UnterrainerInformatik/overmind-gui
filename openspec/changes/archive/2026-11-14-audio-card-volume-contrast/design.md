## Context

`AudioStreamCard`'s `v-slider` passes no `color` / `track-color`, so Vuetify uses the theme's
`primary` (`#3A3A3A` dark, `#505050` light, `src/plugins/vuetify.ts`) for the filled track and
thumb. The card's background is `rgba(128,128,128,0.14)` over the dialog's surface (≈ `#2f2f2f`
dark, ≈ `#ececec` light). In the dark theme that is a contrast of roughly 1.1:1. The theme can be
switched to light in the app bar menu, so one fixed colour is not enough. The plan dialog already
overrides the dark `primary` for the active tool for the same reason (`#1976D2`).

## Goals / Non-Goals

**Goals:**
- Filled track and thumb at least 3:1 against the card in both themes (WCAG 1.4.11, non-text).
- Visible unfilled track.

**Non-Goals:**
- Changing the theme's `primary` (used across the whole app).
- The audio bar's own seek and volume sliders; they sit on a different surface and were not
  reported. Can follow as a separate change if they turn out to have the same problem.

## Decisions

- **D1 Fixed accent per theme, set through the slider's `color` and `track-color` props.**
  Dark: `#4FC3F7` (Vuetify `light-blue lighten-2`, already used in the audio UI for active
  shuffle; ≈ 7:1 on `#2f2f2f`). Light: `#1976D2` (`blue darken-2`, the plan's active-tool blue;
  ≈ 4:1 on `#ececec`). The unfilled track uses a neutral `rgba` of the theme's foreground
  (white in dark at ~35 %, black in light at ~30 %). Chosen in a computed property from
  `$vuetify.theme.dark`, so a theme switch applies at once.
  - Alternative: the stream colour. Rejected: room colours are any CSS colour from the server or
    the palette, so contrast is not guaranteed, and the main group's `#ECEFF1` fails in light.
  - Alternative: CSS overrides under `.theme--dark` / `.theme--light`. Works too, but props keep
    Vuetify's own disabled styling intact without fighting `!important` rules.
- **D2 Keep thumb size.** The report is about colour; size stays as is.

## Risks / Trade-offs

- [Light blue may clash with a blue room colour on the band] → The band is a thin strip; the
  slider is visually separate. Accepted.
- [Disabled sliders] → Vuetify greys out disabled sliders regardless of `color`; that is intended.
