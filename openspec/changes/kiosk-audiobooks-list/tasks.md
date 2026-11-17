## 1. Helpers and texts

- [ ] 1.1 Add `initialsOf(name)` to `src/utils/audiobooks.ts` per D4 and check it by hand in the harness or a node one-liner: "Tschick" → "T", "Die drei ???" → "DD", "008 Diamantenjagd" → "0D", "" → "?".
- [ ] 1.2 Add `page.kiosk.audio.books.episodeCount` to `de-AT.json` and `en-US.json` with plural forms (D6); verify both files still parse and `npm run lint` is clean.

## 2. Components

- [ ] 2.1 Create `src/components/audio/AudioThumb.vue` (D1): cover with `object-fit: cover`, placeholder colour plus initials without a cover or on an image error, `size` prop; verify in the harness that a book without cover shows its initials in light and dark theme.
- [ ] 2.2 Create `src/components/audio/AudioListRow.vue` (D2, D3): full-width button with thumbnail, name, caption, trailing duration and played mark, progress bar for a started entry, `compact` variant for "Weiterhören"; verify the row height is ≤ 64 px by computed style in the harness.

## 3. Dialog

- [ ] 3.1 In `AudioBooksDialog.vue` replace the cover grid with `.audio-books-list` of `AudioListRow`s (authors for books, `$tc` episode count for podcasts, duration for books), keeping `sortForGrid`, `matchesFilter`, `data-uri` and the `open(item)` tap; verify a tap still opens the book and podcast detail.
- [ ] 3.2 Replace the "Weiterhören" tiles with compact `AudioListRow`s in the horizontal row, keeping `resume(entry)`; verify a tap still sends `playMedia` with `{uri}` and no `position`.
- [ ] 3.3 Remove the grid styles and the 110/96 px continue tile styles; leave `AudioCoverTile.vue` used only by `AudioBookDetail.vue`, and verify with a grep that the dialog no longer imports it.

## 4. Verification

- [ ] 4.1 Run `npm run lint` and `npm run build` clean (the dev server skips type checking).
- [ ] 4.2 Add the harness suite `kiosk-audiobooks-list.mjs` with mocked `/audio/audiobooks` (adults with 30 books, kids with the "Die drei Fragezeichen Kids" and Wickie series), `/audio/podcasts` and episode lists, and check:
  - at 1020x590 with a "Weiterhören" row, at least 4 list rows are fully visible;
  - the kids' 007 row is directly above 008 and Wickie's 001 is not between them;
  - a started book shows duration and a progress bar, a played book the check mark, a podcast row its episode count;
  - a book without cover shows its initials, and its detail cover has the same background colour;
  - at 390 px there is no horizontal page scroll and long names end with an ellipsis;
  - the filter "kling" narrows the list;
  - list taps open the details and a "Weiterhören" tap sends `playMedia` without `position`.
- [ ] 4.3 Take screenshots at 1280x800, 1020x590 and 390x844 in light and dark theme and look at them.
