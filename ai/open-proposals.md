# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.

---

## Playlist-Editor: Play/Stop pro Lied, Vorhören in der Suche, Album aufklappen

**Date:** 2026-11-14 · **Where:** Kiosk-Playlist-Editor (`AudioPlaylistEditor`, `AudioPlaylistTracks`, `AudioLibrarySearch`)

Wish (user, translated):

- **Playlist page:** Remove the existing "Abspielen" button (`audio-tracks-play`, plays the whole
  playlist on `playTarget`). Instead every track in the playlist gets its own **play and stop
  button**. When a track ends, the **next one in the playlist plays**. The **playing track is
  marked**. Maybe also a **song-position slider** on the currently playing track (seek).
- **Search page:** The same play/stop buttons and song-position slider on **every found track**,
  to listen before adding it.
- **Albums in search:** Today a tap adds the whole album (`add(album.uri)`). Albums should also get
  an **"open album" button** that lists its tracks, so only some of them can be added (and, by the
  point above, previewed).

Decisions (user, 2026-11-14):

- Playback goes to the bar's current target (`playTarget`) and replaces that room's queue, like
  the old "Abspielen" button.
- Playlist page: play on a track = **start the playlist from that track**; MA's queue then plays on
  by itself (no GUI-driven sequence). Stop = stop/pause the target.
- Search page: a previewed track plays alone; when it ends, **nothing** follows.
- Artists already have an "open" behaviour (sub-search via pills) — nothing to do there.

Findings (checked 2026-11-14, code + read-only `GET /audio/state` on the live server):

- **Marking the playing track:** `AudioPlayback` already has `playlistId`, `queueIndex`,
  `track.uri`, `elapsed`/`elapsedAt`/`duration`. Plan: a row is "playing" when the target's
  `playback.playlistId` equals the open playlist's id **and** `queueIndex` equals the row's
  position — this also handles the same song appearing twice. **But:** on the live server
  `playlistId` was `null` even for a playing room (`Keller/Hauptraum`, `queueIndex=2`), and the
  GUI uses neither field anywhere yet. To clarify with the server session: is `playlistId` filled
  when a queue was started from a playlist (`playMedia` with a playlist URI)? If not, the server
  must fill it, or the GUI remembers "I started playlist X on target T" itself (lost on reload /
  when started elsewhere). With shuffle on, `queueIndex` is not the playlist position → then fall
  back to `track.uri` (first match) or show no marking.
- **Start from a track:** no API yet. `playMedia {uri}` always starts at track 1. Options:
  `playMedia` + `playQueueIndex(index)` right after (works today, briefly starts track 1, races
  with MA), or a server extension `playMedia {uri, startIndex}` (MA `play_media` with
  `start_item`). Prefer the server extension; decide in the propose step with the server session.
- **Preview a search track:** `playMedia {uri: trackUri}` replaces the queue with that single
  track, so "nothing after it" comes for free.
- **Song-position slider:** `POST audioTargetSeek {position}` exists, and `KioskAudioBar` already
  has a held seek slider (`createHeldLevels`) to reuse; position from `elapsed` + `elapsedAt`.
- **Open album:** there is no album-tracks endpoint (`audioSearch` returns albums as
  `{name, artist, uri, imageUrl}` only). Needs a server route, e.g. `GET /audio/albums/tracks?uri=`
  → `{items: [Track]}` (MA `music/albums/album_tracks`). Coordinate with the server session.

Server session answers (2026-11-14). All three need a server change, which will be one joint
opsx change with the server once both users agree. Nothing is implemented yet:

- **Marking → `playback.sourceUri` + `playback.shuffle`** (GUI asked for this instead of
  `playlistId`; `playlistId` is hard-coded null today and the GUI may drop it). The server
  remembers the URI of the last `playMedia` per queue and resets it to null on clear, on a
  `playMedia` with another URI, on enqueue, or when the queue is replaced from outside, e.g. the
  MA UI (heuristic via `PlaylistQueues.match`). It may be null after a server restart. GUI rule:
  mark a row when `sourceUri == playlist.uri` and `queueIndex == row`; with `shuffle` on, fall back
  to `track.uri`. If null or unsure, mark nothing.
- **Start from a track → `playMedia {uri, startIndex}`** (0-based). The server reads the playlist
  tracks right before starting and passes the track URI at that position as MA `start_item`.
  An out-of-range index gives 400. **Do not** use the `playMedia` + `playQueueIndex`
  workaround. From reading the MA 2.10.8 code (not tested live yet): without shuffle,
  `start_item` drops the preceding tracks, which would break `queueIndex == row`. So without
  shuffle the server does `clear` → `play_media option=add` → `play_index(startIndex)`, which
  keeps the full playlist and does not briefly start track 1. With shuffle it uses
  `start_item`: MA keeps all tracks, pins the chosen one first and shuffles the rest, so the GUI
  falls back to `track.uri`. The API stays `playMedia {uri, startIndex}`.
- **Open album → `GET /audio/albums/tracks?uri=<albumUri>`** → `{items: [AudioTrackJson]}` (same
  format as playlist tracks), via MA `music/albums/album_tracks`. Unknown URI gives 404, missing
  uri gives 400.
