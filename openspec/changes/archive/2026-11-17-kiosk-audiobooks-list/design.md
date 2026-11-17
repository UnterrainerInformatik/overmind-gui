## Context

`AudioBooksDialog.vue` renders the tab body as a "Weiterhören" row of `AudioCoverTile`s
(110 px wide, about 150 px tall with the two text lines) and a CSS grid of `AudioCoverTile`s
(`minmax(120px, 1fr)`, 100 px on phones). `AudioCoverTile` is also the large cover in
`AudioBookDetail.vue`. Sorting (`sortForGrid`), filtering (`matchesFilter`), progress
(`progressOf`), the placeholder colour (`placeholderColor`) and `durationText` already live in
`src/utils/audiobooks.ts`. `Podcast` carries `episodeCount`.

On the kiosk tablet the v-dialog gets at most 90 % of 590 px, about 530 px: title 64, tabs 48,
filter about 56, so about 360 px is left for the body.

## Goals / Non-Goals

**Goals:**
- One list layout shared by the three tabs, with rows small enough that the "Weiterhören" row
  and at least four list rows fit on the tablet (see spec scenario "Room on the kiosk tablet").
- Keep the data flow, sorting, filtering, reload and tap behaviour exactly as they are.

**Non-Goals:**
- No change to the book or podcast detail views, apart from the wording of their entry tap.
- No grouping headers per author or series, no new sort options, no grid/list toggle.
- No virtual scrolling; the libraries hold a few hundred entries at most.

## Decisions

**D1: A small thumbnail component used by both the row and the "Weiterhören" entry.**
`AudioThumb.vue` takes `name`, `imageUrl`, `progress`, `played` and a `size` (default 40 px).
It shows the cover with `object-fit: cover`, or the placeholder colour with the initials, and
falls back to the placeholder on an image error (as `AudioCoverTile` does today). Progress and
the played mark are NOT drawn on the thumbnail: at 40 px they would cover most of the image.
They go into the row instead (D2). Alternative: shrink `AudioCoverTile` with CSS. Rejected,
because its placeholder text (name and author, 4 lines) cannot be read at 40 px and the overlays
would hide the cover.

**D2: `AudioListRow.vue` for the list.** A `<button>` over the full width, 56 px tall, with
the thumbnail, then a text column (name in body text, authors or "n Folgen" as caption, both
`nowrap` + ellipsis), then a trailing column: the duration as `durationText` for books, and a
`check_circle` icon (green, `aria-label` "Gehört") for a fully played book. A started book gets
a 3 px progress bar under the text column, the same `v-progress-linear` look the podcast
episodes use, so a progress reads the same everywhere in the popup. Rows are separated by a
1 px divider using the theme's divider colour. Alternative: `v-list` with `v-list-item`.
Rejected: Vuetify's list item heights and paddings would need overriding (see the Vuetify
specificity notes) and a plain button keeps the existing `data-uri` and click handling simple.

**D3: Compact "Weiterhören" entries.** The row stays a horizontal flex row with sideways
scrolling. Each entry is a 220 px wide (180 px on phones), 56 px tall button: thumbnail, name,
subtitle (author or podcast name) and the progress bar under the text. This is the same
anatomy as D2 in a fixed width, so it is `AudioListRow` with a `compact` prop that sets the
width, drops the trailing column and draws the card background (rounded, the same light grey
as the cover backgrounds today). Alternative: drop the row and pin started books to the top of
the list. Rejected: the row also holds podcast episodes, which are not list entries.

**D4: Initials helper.** `initialsOf(name)` in `src/utils/audiobooks.ts`: split the name on
whitespace, take the first letter or digit of the first two words, uppercase. "Tschick" → "T",
"Die drei ???" → "DD", "008 Diamantenjagd" → "0D", an empty name → "?". The thumbnail uses
`placeholderColor(name)` so list, "Weiterhören" and detail cover share the colour.

**D5: Class names.** The list is `.audio-books-list` with `.audio-books-list-row` rows, the
"Weiterhören" entries keep `.audio-books-continue-tile`, and both keep `data-uri`. The old
`.audio-books-grid` classes go away; no harness suite uses them yet.

**D6: Text for the episode count.** New locale key `page.kiosk.audio.books.episodeCount` with
vue-i18n pluralisation: de-AT "1 Folge | {n} Folgen", en-US "1 episode | {n} episodes", used
with `$tc`. A podcast without `episodeCount` shows no caption.

## Risks / Trade-offs

- [Covers lose their visual pull; kids find their books by cover] → The thumbnail stays at the
  start of every row and is 40 px, big enough to recognise a familiar cover; the detail still
  shows the large cover.
- [56 px rows are a smaller tap target than the tiles] → They are full width and 56 px tall,
  above the 48 px touch target the rest of the kiosk uses.
- [`sortForGrid` keeps its name] → Renaming it is out of scope; the list uses it unchanged.

## Migration Plan

Pure GUI change, no data or server change. Rollback is a revert of the commit.
