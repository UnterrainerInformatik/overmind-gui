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

Final server API (server change `audio-playlist-start-at-track`, proposed 2026-11-14, not built
yet; the server's live MA test is its task 1):

- `playback.sourceUri` + `playback.shuffle`; `playlistId` is removed. `sourceUri` is set to null
  on a new playMedia or clear, on enqueue, when the MA queue no longer matches, and on a restart.
- `playMedia {uri, startIndex?, shuffle?}`: `startIndex` is 0-based and allowed only for
  `library://playlist/<id>`; an invalid value gives 400.
- Album tracks: **`GET /audio/albums/{id}/tracks`** → `{items: [Track]}` (path id, like
  `/audio/artists/{id}/tracks`; unknown id gives 404). Album search hits carry `id`, but the
  GUI's search normalization currently keeps only `{name, artist, uri, imageUrl}`, so it must
  keep `id` too.
- MA leaves out unavailable tracks (`available: false`) when it loads a playlist. From such a
  track on, `queueIndex` no longer equals the row, so fall back to `track.uri` as with shuffle.

---

## Music Assistant Web-Player automatisch als Play-Target (ohne Raum)

**Date:** 2026-11-14 · **Where:** audio state (`audioService.normalizeState`), target selection
(`utils/audioTarget.ts`), plan popup stream strip (`AudioPlanDialog.streams`, `AudioStreamCard`),
audio bar, playlist editor / queue popup play target. Server: `audio-music-assistant-bridge`.

Wish (user, translated): When the user opens the Music Assistant web UI on a computer and its
**web player** appears in MA, Overmind should pick it up **automatically**: not in any room,
just as an extra **play target**. There are **at most 3** of them at a time.

Current state (GUI, checked 2026-11-14):

- `AudioState` is only `{mainGroup, rooms}`. Every target is either the main group or a room's
  player (`room.targetId`), so MA players that no room is configured for are invisible.
- The stored selection is `'main'` or `'room:<roomId>'` (`readStoredTarget` accepts nothing
  else). `resolveTarget` falls back to the main group when the room is gone.
- The plan popup's stream strip (`AudioPlanDialog.streams`) lists the main group and the solo
  rooms as `AudioStreamCard`s. Tapping a card selects the target. The plan map draws rooms only.
- Commands (`command`, `seek`, `setTargetVolume`, `playMedia`, queue) are already addressed by
  `targetId`, so they would work for any MA player id the server accepts.

Rough plan:

- **Server:** add a list of room-less players to the state, e.g. `AudioState.players[] =
  {targetId, name, available, playback, volume}`, filled from MA players that no room
  references, limited to web players (MA provider/type, to be checked by the server
  session) so that no other unassigned hardware shows up. They come and go with the browser tab,
  so the list changes over SSE `audio-state`. The server must also accept these ids on the
  `/audio/targets/{targetId}/...` routes, which may currently be checked against known rooms
  and the group.
- **GUI:**
  - a third target kind `player` with selection `'player:<targetId>'`;
  - extra stream cards in the plan popup strip, after the rooms, with a distinct icon (e.g.
    `computer`/`web`) and a colour of their own (a small separate palette, or grey with an
    icon);
  - not on the plan map, since they have no room;
  - when a selected web player disappears, fall back to the main group as for a vanished room,
    and come back to it when it reappears with the same id;
  - the playlist editor play and queue popup work unchanged through `targetId`.

Server session answers (2026-11-14, MA 2.10.8 code + read-only live MA; one was open at the
time: "Web (Firefox on Linux)"):

- **Identification works:** `provider == "sendspin"` and `device_info.model` ∈ {"Web Player",
  "Web Browser", "Mobile Application", "PWA"}. This is MA's own `is_web_player` heuristic
  (`sendspin/player.py`). Web players also have `private: true` and `expose_to_ha: false`.
  Hardware uses another provider (`universal_player`: Louders, Cast-1), and `type` is "player"
  for all, so it is useless. For browsers only, filter on "Web Player"/"Web Browser"; the MA
  mobile app and PWA would otherwise match too. A sendspin player claimed by a bridge
  (Cast/AirPlay over sendspin) is not a web player.
- **The player id is stable per browser:** the frontend keeps it in
  `localStorage["sendspin_webplayer_id"]`. It survives reloads and browser restarts. A different
  profile, a private window or cleared site data gives a new id. So `'player:<id>'` can be
  remembered, but it may be orphaned.
- **Closing the tab removes the player** in MA (`ClientRemovedEvent` → `players.unregister`,
  event `player_removed`), rather than setting `available=false`. A reconnect within aiosendspin's
  cleanup grace reuses the old player. Closing was not measured live.
- **Name:** browser + OS, e.g. "Web (Firefox on Linux)". Two machines with the same browser and
  OS look the same. They differ only by id (or the not-unique user agent in
  `device_info.software_version`). The player can be renamed in MA.
- **Server routes:** today `AudioService.resolveTarget` allows only the main group and room
  players. Anything else gets `404 "no audio target [...]"`, a grouped room `409`, so the server
  must allow web player ids too.
- **Grouping:** technically possible (in `can_group_with` of the main group's syncgroup), but MA
  marks web players `private` and they vanish with the tab. Agreed: **solo target only**.
- **State:** `AudioState.players[] = {targetId, name, available, playback, volume}` is agreed.
  `available` will hardly ever be false, because a closed tab removes the player. For a
  remembered but missing player, the GUI shows "not connected" itself (or falls back to the
  main group, to decide in the propose step).

Still open (user):

- Browsers only, or also the MA mobile app / PWA?
- Naming: MA's name ("Web (Firefox on Linux)", same for two identical machines) unless renamed
  in MA, or something of our own?
- A remembered web player that is gone: fall back to the main group silently, or show it as
  "not connected" in the bar until it comes back?
