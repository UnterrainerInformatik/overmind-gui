## Why

The audiobooks popup shows every book and podcast as a 100-120 px cover tile, and the
"Weiterhören" row adds another row of 110 px tiles above it. On the kiosk tablets (about
1020x590 px usable) the title, tabs, filter and the "Weiterhören" row leave room for barely one
row of the grid. The grid also hides the sort order: books are sorted by author and name, but a
grid wraps that order across rows, so a series or an author's books do not read as one run.

## What Changes

- The cover grid in the "Erwachsene", "Kinder" and "Podcasts" tabs becomes a one-column list.
  Each row has a small square thumbnail (40 px) at its start, the name, and the author (books)
  or the episode count (podcasts) under it. At the end of the row it shows the duration of a
  book, a progress bar for a started book and a check mark for a fully played one.
- The list keeps today's sort order and filter. Read top to bottom, a series and an author's
  books now stay together on screen.
- The "Weiterhören" row stays a horizontal row but uses compact entries instead of tall cover
  tiles: a 40 px thumbnail, the name, the author or podcast name, and a progress bar. Each entry
  is about 56 px tall instead of about 150 px.
- A thumbnail without a cover shows the entry's initials on its placeholder colour. The large
  cover in the book detail keeps today's placeholder with name and author.
- Taps work as before: a list row opens the detail, and a "Weiterhören" entry resumes playback.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `kiosk-audiobooks`: the "Tab content" requirement replaces the cover grid with a list and makes
  the "Weiterhören" entries compact; the "Placeholder cover" requirement adds the initials
  placeholder for small thumbnails; "Book detail" and "Podcast detail" say "list" instead of
  "grid" for the tap that opens them.

## Impact

- `src/components/audio/AudioBooksDialog.vue`: grid and "Weiterhören" markup and styles.
- New `src/components/audio/AudioListRow.vue` (list row) and a compact "Weiterhören" entry,
  both using one small thumbnail component.
- `src/components/audio/AudioCoverTile.vue` stays and is used only by the book detail cover.
- `src/utils/audiobooks.ts`: an initials helper next to `placeholderColor`.
- Browser harness: a new suite for the audiobooks popup at tablet and phone width.
- No server or API change.
