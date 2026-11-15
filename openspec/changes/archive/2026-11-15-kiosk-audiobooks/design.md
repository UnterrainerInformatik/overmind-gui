## Context

See proposal.md (Why). Current state:

- **MA 2.10.8 (on babylon5)** has three "Filesystem (local disk)" providers:
  - `/audiobooks` and `/audiobooks-kinder`, content type Audiobooks;
  - `/podcasts`, content type Podcasts.

  MA offers:
  - `music/audiobooks/library_items` and `music/audiobooks/get`, the latter with
    `metadata.chapters`, each chapter `{position, name, start, end}` in seconds;
  - `music/podcasts/library_items` and `music/podcasts/podcast_episodes`;
  - `music/in_progress_items`;
  - `music/mark_played` and `music/mark_unplayed`.

  MA keeps `seconds_played` and `fully_played` per MA user in its `playlog`. `play_media` of an
  audiobook or episode resumes at the stored position minus 0.5 s. Overmind talks to MA as one
  MA user, so there is one position for all rooms.
- 111 of the 281 books have no cover.
- **GUI:**
  - `KioskAudioBar` (mounted in `App.vue` on kiosk pages) has: target, title, previous, −10 s,
    play/pause, +10 s, next, shuffle, `AudioSeekSlider`, volume, and the radio button that
    opens `AudioRadioDialog`.
  - The position is interpolated from `elapsed`/`elapsedAt`.
  - `audioService.playMedia(targetId, uri, startIndex?)` posts to `audioTargetPlayMedia`.
  - `AudioPlayback.track` carries `{title, artist, album, uri, imageUrl}`.
- **Server:** the `/audio/**` routes live in java-overmind-server and have no audiobook support
  yet. The contract below is handed over through that repo's `ai/open-proposals.md`.

## Goals / Non-Goals

**Goals:**
- Find, start and resume audiobooks and podcast episodes from every kiosk page.
- Chapter-aware bar controls without any GUI-side position storage.

**Non-Goals:**
- No live RSS podcast feeds. MA's "Podcast Feed" provider can be added later and would appear
  in the same tab.
- No SSE push for library or progress changes. Lists are refreshed when the popup opens.
- No per-room or per-person positions.
- No changes to the embedded MA page (`KioskAudio.vue`).
- No server code in this repo.

## Decisions

### D1: Server contract

**Audiobooks**

- `GET /audio/audiobooks?library=adults|kids` → `{items: [Audiobook]}`, the complete list
  without paging (at most a few hundred entries).
  - `Audiobook` = `{id, uri, name, authors: [string], imageUrl|null, duration, resumePosition,
    fullyPlayed, recentRank|null}`.
  - `duration` and `resumePosition` are in seconds; `resumePosition` is 0 when not started.
  - `recentRank` is MA's play order: `1` = heard most recently, `null` = never. It is global
    per kind and may have gaps. (MA keeps no playlog timestamp, so the drafted `lastPlayed`
    became `recentRank`; agreed with the server 2026-11-15.)
  - `library` is resolved by the provider instance whose path is `/audiobooks` (adults) or
    `/audiobooks-kinder` (kids), never by hard-coded instance ids.
  - A missing or unknown `library` → `400`.
- `GET /audio/audiobooks/{id}` → `Audiobook` plus `chapters: [{position, name, start, end}]`,
  sorted by `start`. `404` for an unknown id.

**Podcasts**

- `GET /audio/podcasts` → `{items: [Podcast]}`, with `Podcast` =
  `{id, uri, name, imageUrl|null, episodeCount, recentRank|null}`.
- `GET /audio/podcasts/{id}/episodes` → `{items: [Episode]}`, sorted by `position`. `Episode` =
  `{id, uri, name, position, duration, resumePosition, fullyPlayed, recentRank|null,
  imageUrl|null}`. `404` for an unknown podcast.

**Played marking and playback**

- `PUT /audio/played` `{uri, played: boolean}` → `204`.
  - It maps to `music/mark_played` / `music/mark_unplayed`.
  - `400` when `uri` is not an audiobook or podcast episode URI, or `played` is missing or not
    a boolean.
- `POST /audio/targets/{targetId}/playMedia` accepts an optional `position` (seconds, ≥ 0)
  for audiobooks and episodes.
  - With `position`, playback starts there, overriding MA's resume point.
  - Without it, MA resumes as usual.
  - A negative `position` → `400`.
- Errors from MA → `502` with `reason`, as for the other audio routes.

**Audio state**

The audio state needs nothing new, but the server has to guarantee three things:
- `Playback.track.uri` is the audiobook's URI (`library://audiobook/<id>`) or the episode's
  URI. Episode `id` and `uri` are opaque provider strings
  (`filesystem_local--<x>://podcast_episode/<folder>/<file>`), passed on as they are;
- `elapsed` is the position within the whole book;
- `duration` is the book's total duration.

*Alternative considered:* a `chapter` field in the audio state. Rejected. The GUI can work out
the chapter from `elapsed` and the chapter list, and the server would have to recompute it on
every position tick.

### D2: Detecting an audiobook in the bar

- The bar treats the current item as an audiobook when `track.uri` starts with
  `library://audiobook/`, and as an episode when its scheme is followed by `podcast_episode/`
  (`<provider>://podcast_episode/…`, the URIs are opaque).
- For an audiobook it loads `GET /audio/audiobooks/{id}` once per book id and caches it for
  the session. The current chapter is the last one with `start <= position`.
- Until the chapters are loaded, or when the request fails (including a 404 before the server
  is deployed), the bar falls back to its normal behaviour with ±30 s.

### D3: Chapter controls

- The progress slider spans `chapter.start..chapter.end`; releasing it seeks to
  `chapter.start + value`.
- ±30 s seek within the whole book, clamped to `0..duration`.
- Previous: more than 3 s into the chapter → seek to the chapter's start, otherwise to the
  previous chapter's start. Next: seek to the next chapter's start; disabled on the last
  chapter.
- These go through the existing `seek` route, not MA's next/previous, which would move to
  another queue item.
- A book with one chapter (or none), or whose chapters could not be loaded, behaves like a
  plain track with ±30 s, except that previous seeks to 0: MA's `previous` on a book resumes
  instead of restarting.

### D4: Entry point and popup

- A button with the `menu_book` icon, right of the radio button, opens `AudioBooksDialog`. It
  is the same kind of popup as the queue and radio popups (closable, fits every width), and
  commands go to the bar's selected target.
- The last open tab is remembered per device in `localStorage` (`kioskAudiobooksTab`). Access
  is wrapped in try/catch and falls back to "Erwachsene".
- Each tab shows:
  - a "Weiterhören" row: entries with `resumePosition > 0 && !fullyPlayed`, sorted by
    `recentRank` ascending (most recent first, unranked last), at most 12, hidden when empty;
  - the grid: books (adults and kids) sorted by first author, then name; podcasts by name.
    Kids' books carry the series as author and the episode number in front of the name
    ("001 Im Tal der Dinosaurier", author "Die drei Fragezeichen Kids"), so this keeps each
    series together and in episode order.
- The filter field matches name and authors, ignores case, is not focused on open, and is
  reset when the popup reopens. This is the same behaviour as the playlist filter.
- Tapping a book opens its detail in place, with a back arrow to the list.
- Tapping an entry in the "Weiterhören" row resumes it at once (`playMedia` without
  `position`), so resuming takes one tap.

*Alternatives considered:*
- A separate kiosk page. Rejected: the bar is on every kiosk page, and its popups are already
  the pattern for radio and queue.
- A tile on the overview. Can be added later.

### D5: Placeholder cover

The placeholder is a square tile in a colour taken from a fixed 8-colour palette, chosen by a
hash of the name, with title and author on it in white. The palette is chosen for readable
white text in light and dark theme.

### D6: Loading and caching

- Lists are loaded when a tab is first shown in the popup, and loaded again each time the popup
  opens. While a reload runs, the shown list stays.
- Book details are cached by id. A book's detail is loaded again when it is opened, so its
  progress is fresh.
- After play, restart or played marking, the open tab's list and the open detail are reloaded
  once, about 1.5 s later, so MA has written the play log by then.

### D7: Played marking

The book detail has a menu with "Als gehört markieren" and "Als ungehört markieren", both
`PUT /audio/played`. The same menu exists per episode. "Von vorne" plays with `position: 0` and
does not reset the play log first, so there is no gap in which the old position could win.

## Risks / Trade-offs

- [The play log is attributed to the user of whoever started playback; MA web players may log
  under another MA user] → Verify in the live test that playback started through Overmind
  updates the positions the routes report. The server owns that check.
- [MA's `play_media` with a seek right after start can race] → The server owns `position` and
  seeks only once the queue reports the item playing. The GUI never does play-then-seek itself.
- [Chapter lists for books with embedded chapters may have `end` null for the last chapter] →
  The GUI treats a missing `end` as the book's `duration`.
- [Large cover grids on tablets] → Lazy images (`loading="lazy"`), small thumbnails as the
  server delivers them.

## Migration Plan

GUI and server can be deployed in either order.

- Before the server routes exist, the popup shows "Hörbücher sind am Server noch nicht
  verfügbar" (any 404 from a list route), and the bar keeps its present controls plus ±30 s
  for `library://audiobook/` items.
- Rollback: revert the GUI commit. The server routes stay harmless without the GUI.

## Open Questions

- Resolved by the server (change `audio-audiobooks-podcasts`): resume state comes from MA's
  per-user playlog. Further facts from its frontend brief: MA ignores less than 5 s of
  playback; `seek {position: 0}` on a book lands at second 1; MA's `previous` on a book
  resumes instead of restarting, so the bar never sends it for a book (D3).
