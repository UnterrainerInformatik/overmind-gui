## 1. Server handover

- [x] 1.1 Hand the contract of design D1 to java-overmind-server: an entry in its `ai/open-proposals.md` covering the routes, the `playMedia` `position`, the audio-state guarantees, the check that the play log is attributed to Overmind's MA user, and the open question about `resume_position_ms`.

## 2. Service layer

- [x] 2.1 Add rest keys `audioAudiobooks`, `audioAudiobook`, `audioPodcasts`, `audioPodcastEpisodes` and `audioPlayed` to `src/store/rest.ts`.
- [x] 2.2 Add types `AudioAudiobook`, `AudioChapter`, `AudioPodcast` and `AudioEpisode` to `audioService.ts`, with normalisers that are tolerant of missing fields (null `imageUrl`, null `end`, 0 `resumePosition`).
- [x] 2.3 Add service methods `getAudiobooks(library)`, `getAudiobook(id)`, `getPodcasts()`, `getPodcastEpisodes(id)` and `setPlayed(uri, played)`. Extend `playMedia` with an optional `position` (sent only when defined). A 404 from the list routes must be recognisable by the caller as "not available".
- [x] 2.4 Add `src/utils/audiobooks.ts` with pure helpers, each with unit tests if the project's test setup allows, otherwise checked in the browser test:
  - item kind from a track URI (`audiobook` / `episode` / null);
  - current chapter for a position, with null `end` → duration;
  - chapter previous/next target positions per D3;
  - the "Weiterhören" selection and sort;
  - grid sort per library;
  - the filter match;
  - the placeholder colour by name hash.

## 3. Audiobooks popup

- [x] 3.1 `AudioCoverTile.vue`: cover image (`loading="lazy"`) or placeholder (D5), name, author, progress bar, played mark.
- [x] 3.2 `AudioBooksDialog.vue`:
  - tabs with the tab remembered in `localStorage` `kioskAudiobooksTab` (try/catch);
  - per-tab list loading, refreshed on every open, keeping the shown list during a reload;
  - the "Weiterhören" row;
  - the filter (no autofocus, reset on open);
  - the grid;
  - the "not yet available" notice on 404;
  - layout that works on every width.
- [x] 3.3 `AudioBookDetail.vue`:
  - fresh load on open;
  - cover, meta and progress;
  - chapter list with the current chapter marked;
  - Weiterhören/Abspielen, "Von vorne", chapter tap, and the played/unplayed menu;
  - a reload about 1.5 s after each action;
  - an error snackbar through the existing `audioCommand` pattern.
- [x] 3.4 `AudioPodcastDetail.vue`:
  - episode list with progress and played marks;
  - tap to play per the spec, a per-episode menu ("Von vorne", gehört/ungehört);
  - a reload after each action.
- [x] 3.5 Add i18n keys (de + en) for the button tooltip, the tabs, "Weiterhören", "Abspielen", "Von vorne", gehört/ungehört, filter placeholder, "not yet available" and "nothing here".

## 4. Audio bar

- [x] 4.1 Add the `menu_book` button right of radio, on all widths; it opens `AudioBooksDialog` with the bar's target.
- [x] 4.2 Detect audiobook and episode items from `track.uri`, and load and cache chapters per book id (a failure falls back to normal mode).
- [x] 4.3 Make the skip buttons ±30 s for audiobooks and episodes, with matching icons (`replay_30` / `forward_30`) and tooltips.
- [x] 4.4 Chapter mode (book with ≥ 2 chapters):
  - title = chapter name, subtitle = book · authors;
  - the slider spans the chapter, and its release seeks to `start + value`;
  - previous/next seek per D3, with next disabled on the last chapter.

## 5. Verification

- [x] 5.1 Run `npm run lint` and `npm run build` clean.
- [x] 5.2 Headless Puppeteer against `npm run serve`, with writes blocked or stubbed. The checks below use stubbed list/detail responses until the server is deployed, then the live routes:
  - the popup at 1280, 800 and 390 px: tabs, the "Weiterhören" row, the filter, placeholder covers, the book detail and the podcast detail;
  - the requests that are sent (play, position, played);
  - the 404 notice;
  - the bar in chapter mode with a stubbed audio state.
- [x] 5.3 Once the server routes are live, do one real playback test on the Keller amplifier only:
  - resume, "Von vorne", chapter start, chapter previous/next, ±30 s;
  - check that the position is shared after a restart from another device.

  Afterwards, reset every touched book or episode with `PUT /audio/played {played: false}` and stop playback.

  Done 2026-11-15 on the Keller amplifier (`up80cfc7d7`), book 26 and Alternativlos episode 1,
  driven through the GUI: chapter start (637 s), ±30 s, chapter next (1693 s), previous to the
  chapter start and to the previous chapter, pause stores the position (647 s), a second
  browser resumes it from the "Weiterhören" row, "Von vorne" starts at ~0, the episode plays
  with its opaque URI and skips +30 s. MA reports the room `idle` (not `paused`) after a pause.
  Both reset with `played: false` afterwards; the Keller is idle.
