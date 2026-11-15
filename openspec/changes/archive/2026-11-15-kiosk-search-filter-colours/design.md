## Context

`AudioLibrarySearch.vue` renders the search field (`v-text-field outlined`, class
`audio-search-field`), the result rows (`audio-search-track`, `audio-search-album`,
`audio-search-artist-result`) and the drill-in chips (`audio-search-artist`,
`audio-search-album-chip`). The app's primary colour is blue (`#1976D2` light, `#4FC3F7` dark,
see `AudioBalancePanel`); a focused outlined field turns primary. Rows already use a grey tint for
the currently previewed track (`audio-search-result--current`).

## Goals / Non-Goals

**Goals:** two theme-aware colours defined once, applied with CSS only.

**Non-Goals:** colouring other lists (playlist tracks, queue), new theme entries in the Vuetify
config, any behaviour change.

## Decisions

- **Colours:** filter = teal (`#00897B` light / `#4DB6AC` dark), album = orange
  (`#EF6C00` light / `#FFB74D` dark). Both are clearly apart from the primary blue (used for
  buttons and the "current" state) and from each other; teal reads as "filter/narrowing", orange
  as "collection". Alternative: Vuetify theme colours `secondary`/`accent` — rejected, they are
  not set to meaningful values in this app and would leak into other components.
- **Defined as CSS custom properties** (`--audio-filter-color`, `--audio-album-color`) on
  `.audio-library-search`, overridden under `.theme--dark .audio-library-search`. One place to
  change; no computed JS colours.
- **Rows:** a 4 px inset left bar (`box-shadow: inset 4px 0 0 var(--…)`) plus a ~10 % tint
  background (`color-mix` is not available on the older kiosk browsers, so the tint uses
  separate `--…-tint` rgba variables). The `--current` grey stays on top for tracks only, so
  nothing conflicts. Alternative: full colour fill — rejected, covers and text lose contrast.
- **Chips:** tint background, border and icon in the colour, text in the normal text colour.
- **Search field:** CSS overrides on `.audio-search-field` for the outlined `fieldset` border,
  the label and the inner icon, for both the idle and the focused state. Vuetify sets the focused
  colour via `primary--text` (with `!important`), so the label/icon overrides need `!important`
  too. Alternative: the `color` prop — only covers the focused state and needs JS for the theme
  switch.

## Risks / Trade-offs

- [Vuetify internal class names change] → only affects styling; the Puppeteer check covers it.
- [Colour meaning not explained anywhere] → the icons (person / album) and the chevron already
  hint the role; colours only reinforce them.
