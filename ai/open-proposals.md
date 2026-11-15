# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.


---

## Hörbücher und Podcasts im Kiosk, mit gemerkter Position (MA-native)

**Date:** 2026-11-15 · **Where:** Kiosk audio (new pages + audio bar) + server (`/audio/**`)

Explored 2026-11-15. The original idea (folder → generated `.m3u` playlist, playlist grouping,
own resume storage) is **dropped**: Music Assistant 2.10.8 has native audiobook and podcast media
types that cover all of it. The data side is already done (see below); what is left is server + GUI.

### Data side — done on babylon5 (2026-11-15)

- Audiobooks moved out of `MUSIC/SONGS/AUDIOBOOKS` into three folders, each its own MA
  "Filesystem (local disk)" provider with its own content type (mounted ro into the MA container):

  | Folder (`/mnt/movies3_music/MUSIC/…`) | MA path | Content type | Items |
  |---|---|---|---|
  | `AUDIOBOOKS` | `/audiobooks` | Audiobooks | 116 books |
  | `AUDIOBOOKS-KINDER` | `/audiobooks-kinder` | Audiobooks | 165 books |
  | `PODCASTS` | `/podcasts` | Podcasts | 4 podcasts, 71 episodes |

- One folder per book, named `Autor - Titel` (kids: series as author, 3-digit episode number,
  e.g. `Die drei Fragezeichen Kids - 008 Nacht unter Wölfen`). Every CD/disc is its own book
  (user decision). Tags rewritten: album = title, albumartist = author, track n/N. Podcasts: one
  folder per podcast, album = podcast name, title = episode name.
- All 285 books have chapters in MA (multi-file → one chapter per file; single files with embedded
  chapters are used as such). **111 books have no cover** → GUI needs a placeholder.
- Plan/undo logs: `~/ab-reorg/` on babylon5. MA compose: `/home/psilo/scripts/music-assistant`.
- Adding books later: **one book per folder**. MA (audiobook mode) only takes the first file of a
  folder as the book, drops chapter files whose album tag differs from the first file, and hides a
  single file tagged track > 1.

### What MA gives us (read from the 2.10.8 code)

- `music/audiobooks/library_items`, `music/audiobooks/get` (incl. `metadata.chapters` with
  `position`, `name`, `start`, `end` in seconds, `duration`, `authors`, images),
  `music/podcasts/library_items`, `music/podcasts/podcast_episodes` (`position`, `duration`,
  per-episode resume/fully-played).
- **Resume is built in:** MA tracks `seconds_played` / `fully_played` in its `playlog` and
  `play_media` of an audiobook/episode continues at the stored position (queue loader, `-0.5 s`).
  `music/in_progress_items` (→ "Weiterhören" list), `music/mark_played`, `music/mark_unplayed`
  (→ "von vorne").
- Position is stored **per MA user**. Overmind connects as one MA user → effectively one shared
  position for all rooms, which is exactly the wish (Toniebox-like). Verify in the live test that
  playback started through Overmind is attributed to that user.
- Which library a book belongs to: by provider instance — resolve the instance ids from the provider
  **path** (`/audiobooks` vs `/audiobooks-kinder`), not hard-coded ids.

### Wish (user)

- Play audiobooks (and Hörspiele for the kids) in the kiosk; each remembers where it stopped,
  one state for all rooms.
- Jump: back/forward (±30 s) and to the previous/next chapter, plus pick a chapter from a list.
- "Weiter" vs. "von vorne".
- Adults and kids separate (two libraries/tabs); podcasts separate with per-episode resume.

### Open points for propose (needs the server session)

- Server routes, e.g. `GET /audio/audiobooks?library=adults|kids` (list: name, author, cover,
  duration, resume position, fully played), `GET /audio/audiobooks/:id` (chapters),
  `POST /audio/audiobooks/:id/reset` (mark_unplayed); same for podcasts/episodes. Playing reuses
  `playMedia {uri}` + `seek` on the existing target routes.
- Audio bar while an audiobook plays: chapter title + chapter progress instead of track; ±30 s and
  chapter prev/next (seek to chapter `start`); does MA's own next/previous move by chapter?
- How does the audio state (SSE transports / queue) expose that the current item is an audiobook
  and its current chapter? Needed for the bar.
- Kiosk pages: one "Hörbücher" page with tabs Erwachsene/Kinder/Podcasts, or separate entries;
  sort (author/title vs. recently played), search, "Weiterhören" row on top.
- Cover placeholder for the 111 books without one (title + author on a coloured tile).
- Podcast part can be a later phase; MA's "Podcast Feed" (RSS) provider could add live feeds
  (Logbuch Netzpolitik, FALTER Radio) into the same page.
- Testing: playback only on the Keller amplifier; reset any resume state touched by tests
  (`mark_unplayed`) afterwards.
