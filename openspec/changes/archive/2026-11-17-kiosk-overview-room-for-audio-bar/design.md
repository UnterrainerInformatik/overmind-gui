## Context

Measured in the browser harness at the tablets' usable 1020 × 590 px (see proposal.md - Why):

| Part | Today |
|---|---|
| Top row (clock, energy panel) | 158 px |
| Two rows of blue action tiles | 118 px + 112 px (one `.row`, 246 px incl. margins) |
| Two rows of link tiles | 60 px each (136 px incl. margins) |
| Audio bar | 41 px, content ends at 544, bar starts at 549 |
| Bar buttons | 40 × 41 px, target selector 89 px wide (`● icon Haus`) |

The blue tiles have no fixed height: `KioskPanel` stacks the `title` slot (a 38 px avatar,
`mb-4`) above the text slot (18 px / 18 px line height), and the row stretches every tile to its
tallest member. Three-line labels ("Rollos Erdgeschoß runter", "Kinderzimmer kuscheln") set the
118 px. The same three tile components are used on the lights, plugs and presence pages.

`--kiosk-audio-bar-height` in `src/styles/_kiosk.scss` drives the bar's height and, through
`--kiosk-bottom-inset`, every fixed part anchored to the bottom edge. The bar's volume slider is a
plain `v-slider` that picks up the theme's default (grey) colour on the dark menu card; the stream
card and balance panel already fixed the same problem with explicit colours (change
`audio-card-volume-contrast`, D1), duplicated in both components.

## Goals / Non-Goals

**Goals:**
- Take about 80 px from the overview's blue tiles and give part of it to the bar.
- One source for the kiosk volume slider colours.

**Non-Goals:**
- Tile changes on the lights, plugs and presence pages.
- The progress slider's colour in the bar (not asked for; it already contrasts as the primary
  filled track on the footer).
- Rearranging the bar into two rows of controls.

## Decisions

### D1: Compact tiles through a `compact` prop on `KioskPanel`, set only by the overview

`KioskPanel` gets a `compact` boolean. When set it adds `kiosk-panel--compact`, which lays the
title slot (the avatar) and the text slot side by side (`display: flex`, avatar `flex: 0 0 auto`,
text `flex: 1 1 auto; min-width: 0`), sets the height to `var(--kiosk-action-tile-height)`
(`78px`, new variable next to the link tile one) and cuts overflow. `KioskSwitchPanel`,
`KioskMultiStatePanel` and `KioskPlanPanel` accept `compact` and pass it on; they also shrink the
avatar from 38 to 32 px when compact. `KioskOverview.vue` sets `compact` on each of its action
tiles.

Why 78: 118 × 2/3 = 79; 78 keeps the 2:1 rhythm with the 60 px link tiles visible (78 vs 60 is
clearly "bigger") and three 16 px text lines with 17 px line height (51 px) plus padding fit.
The gain is (118 − 78) + (112 − 78) = 74 px.

*Alternative considered:* a page-level CSS override (`.kiosk-overview .v-card ...`). Rejected:
these selectors fight Vuetify's specificity (see the project's experience with `v-card-text`
padding classes) and break silently; a prop gives one obvious switch per tile.

*Alternative considered:* keep the icon above the text and only shrink everything. At 78 px that
leaves room for only one text line under a 32 px icon; the three-line labels would be cut.

### D2: Bar 60 px, buttons 56 / 44 / 36 px wide

Of the 74 px gained, 19 go to the bar (41 → 60 px, the link tile height), the rest stays as slack -
the tablets have none today, and the user had to trim before. Button widths follow Vuetify's
breakpoints (`mdAndUp` ≥ 960, `sm` 600-959, `xs` < 600) through modifier classes on the footer,
next to the existing `--narrow` one. Width budget at 1020 px: 10 buttons × 56 = 560, target ≤ 88,
leaving ~370 px for title and progress (today 290 + 282). At 800 px: 10 × 44 = 440 + 88 leaves
272 px. Title and progress have `flex: 1 1 0` with small minimums, so they give way first.

Icons go from 24 to 28 px (`v-icon` `size` via CSS on `.kiosk-audio-player-btn .v-icon`); the
`AudioShuffleToggle` renders its own `v-btn` and gets the same class, so it follows.

### D3: Keep the room name, on a second line

The selector becomes a two-row column: dot + icon centered on top, the name below in 11 px type,
`max-width: 88px`, ellipsis. This is narrower than today's one-line 89 px and keeps the
information of which room is being controlled, which the colour alone does not give to a guest.
On `xs` the name stays hidden as today.

*Alternative considered:* drop the name. Saves ~25 px more, but the bar already fits at 56 px
buttons with the name; the colour dot alone is ambiguous between similar room colours.

### D4: Shared volume colours in `src/utils/audioVolumeColors.js`

`volumeSliderColors(dark)` returns `{ color, trackColor }` with the existing values. The stream
card, balance panel and bar all use it. The bar passes `:color` and `:track-color` to its slider.
The value label under the slider loses any reduced opacity so it reads at full contrast on the card.

### D5: Volume menu length follows the bar

The slider length rule `min(300px, calc(100vh - 110px))` becomes
`min(300px, calc(100vh - var(--kiosk-audio-bar-height) - 69px))`, which is 129 px at a 60 px bar.
Tying it to the variable keeps the next height change from breaking it.

## Risks / Trade-offs

- [Other kiosk pages lose 19 px] → The lights, plugs and presence pages scroll already or have
  room; the apply phase measures each kiosk page at 1020 × 590 before and after and reports any
  page whose last row newly falls under the bar, instead of silently shrinking its tiles.
- [A future tile label longer than three lines is cut] → Accepted by the spec; today's labels fit.
  The harness checks the three-line label is fully inside its tile.
- [Text beside the icon is narrower] → 140 px tile − 32 px icon − padding leaves ~96 px; the
  longest word today, "Erdgeschoß" in bold 16 px, needs ~90 px. The harness asserts no word is cut
  horizontally (`scrollWidth <= clientWidth` on the text block).
- [Harness suite asserts 41 px] → `suites/kiosk-audio-bar.mjs` is updated to the new numbers in
  the same change.

## Open Questions

- Whether the remaining ~55 px slack on the overview should later go to a taller bar or bigger
  link tiles - can be decided once the user has seen it on a real tablet.
