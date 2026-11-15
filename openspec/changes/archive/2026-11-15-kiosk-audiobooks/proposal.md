## Why

There are now 281 audiobooks (116 for adults, 165 for kids) and 4 podcasts in Music Assistant
(MA), each in its own MA provider. MA already records how far each book and episode has been
played. The kiosk has no way to find them or resume them, and no audiobook controls: ±10 s and
track skip do nothing useful in a single long file with chapters. The family wants something
like a Toniebox: tap a book in any room, and it carries on where it stopped.

## What Changes

- New **audiobooks popup**, opened from a new button in the kiosk audio bar, with three tabs:
  **Erwachsene**, **Kinder** and **Podcasts**.
  - Each tab has a "Weiterhören" row at the top (books and episodes in progress, most recently
    played first), then all entries as a cover grid with a filter field.
  - Covers that are missing show a coloured placeholder tile with title and author.
- **Book detail** inside the popup:
  - Cover, title, author, total duration and progress, plus the chapter list with the current
    chapter marked.
  - "Weiterhören" (or "Abspielen" when not started), "Von vorne", and tapping a chapter to start
    there.
  - Marking a book as played or unplayed.
- **Podcast detail**: the episode list with per-episode progress, the same play and restart
  actions, and marking an episode as played or unplayed.
- **Audio bar while an audiobook plays**:
  - The title shows the chapter name, the subtitle shows book and author, and the progress
    slider covers the current chapter.
  - Skipping is ±30 s instead of ±10 s.
  - Previous/next move by chapter.
  - Podcast episodes also get ±30 s.
- **Server contract** (implemented in java-overmind-server; handed over through its
  `ai/open-proposals.md`):
  - `GET /audio/audiobooks?library=adults|kids` and `GET /audio/audiobooks/{id}` (with
    chapters).
  - `GET /audio/podcasts` and `GET /audio/podcasts/{id}/episodes`.
  - `PUT /audio/played {uri, played}`.
  - An optional `position` on `playMedia`.
- Resume uses MA's own play log, so one position is shared by all rooms. The GUI stores no
  playback positions of its own.

## Capabilities

### New Capabilities
- `kiosk-audiobooks`: the audiobooks/podcasts popup (tabs, Weiterhören row, grid, filter,
  placeholder covers, book and podcast detail, play/resume/restart/chapter start, played
  marking) and the server routes it relies on.

### Modified Capabilities
- `kiosk-audio-bar`:
  - The bar gets the audiobooks button.
  - While an audiobook plays, the bar controls work per chapter (chapter title and progress,
    ±30 s, chapter previous/next); podcast episodes get ±30 s.
  - Narrow widths keep the audiobooks button.

## Impact

- GUI:
  - `KioskAudioBar.vue` gets the new button and the chapter-aware controls.
  - New components under `src/components/audio/` (popup, grid tile, book detail, podcast
    detail).
  - `audioService.ts` gets the new routes and types, and `rest.ts` the new keys.
  - New i18n keys (de/en).
- Server (java-overmind-server): new `/audio/audiobooks`, `/audio/podcasts` and `/audio/played`
  routes on top of MA's `music/audiobooks/*`, `music/podcasts/*` and
  `music/mark_played`/`mark_unplayed`; `playMedia` accepts a start `position`. GUI and server
  can be deployed in either order. While the routes are missing, the popup shows a "not
  available" notice and the bar behaves as today.
- Testing plays only on the Keller amplifier. Any played state that tests touch is reset
  afterwards.
