# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.


---

## Hörbücher/Alben aus Ordnern als Playlists, mit gemerkter Position

**Date:** 2026-11-15 · **Where:** Kiosk audio (playlist pages / editor) + server

Wish (user, translated):

- There are albums (e.g. audio books / Hörspiele) that live in **sub-directories** of the music
  library and often have **no playlist**. They should be playable — after consideration **as a
  playlist** (rather than as single titles).
- **Building them:** importing from Music Assistant does not work, there are too many. Idea:
  **pick a folder** → all songs contained in it become one playlist, **sorted alphabetically**
  (by file/path) at import time.
- **Too many playlists:** then the playlist selection needs structure — a **sub-directory /
  folder system** for playlists, or **tabs** on the selection pages. Not decided yet.
- **Resume position per playlist:** each playlist remembers **where playback stopped** (track +
  position). Otherwise a Hörspiel restarts from the beginning every time, or one has to remember
  the spot for 10 books and seek there by hand. **One state per playlist is enough** for all
  rooms/players (like the Toniebox does it now), not one per room.

Open points for the explore/propose step (needs the server session):

- Folder browsing: does the server/MA expose the file-system tree (MA `music/browse` on the
  filesystem provider)? A new route like `GET /audio/browse?path=` would be needed, plus
  "create playlist from folder" (server writes the `.m3u` in MA `/data/playlists`, sorted).
- Recursive (include sub-folders) or only the folder's own files? Name = folder name?
- Grouping: folder tree vs. tabs vs. a simple category/tag per playlist; where it is stored
  (playlist name prefix, server-side metadata).
- Resume: who saves it (server on pause/stop/track change is more robust than the GUI), when it is
  restored (playing the playlist again continues; explicit "von vorne" button), when it resets
  (end of last track). Only for marked "Hörspiel" playlists, or for all?
- Related: `playMedia {uri, startIndex}` + seek from the playlist-track-play change can be reused
  for "continue at track N, position P".

---

## "Zufällig" gehört zum Player, nicht zur Playlist

**Date:** 2026-11-15 · **Where:** Kiosk audio — `AudioPlaylistTracks` (playlist page), `AudioQueueDialog` (queue popup, playlists column), `KioskAudioBar`

Wish (user, translated): The "Zufällig: aus/an" button on the playlist page suggests that shuffle
is a **property of the playlist**. It is actually a **player setting**, so it belongs on the
**player bar** or on the **queue (Warteliste) page**.

Findings (code, 2026-11-15):

- Today the button is neither: it is a **per-device preference** (`utils/audioShuffle.ts`,
  `localStorage` key `kioskAudioShuffle`), shared by the playlist page (`audio-tracks-shuffle`) and
  the queue popup's playlists column (`audio-queue-shuffle`). It only takes effect when a playlist
  is **started** — sent as `shuffle` in `POST audioTargetPlayMedia`, where the server switches
  the target queue's MA shuffle before replacing the queue.
- The real state lives in the player queue: `playback.shuffle` per target is already in the audio
  state, but the button does not show it. So it can say "aus" while the player shuffles (set by
  another device, the MA UI, or an earlier start), and toggling it changes nothing until the next
  playlist start.

Idea:

- One shuffle toggle **per target**, bound to that target's `playback.shuffle` and switching it
  **immediately** on the player (also for the currently playing queue).
- Place it on the player bar (`KioskAudioBar`, next to play/next) and/or in the queue column of
  the queue popup; remove it from the playlist page and the playlists column.
- Playlist starts (`playMedia`) then send no `shuffle` field, so the player's current setting
  applies; drop the device preference `audioShuffle`.

Open points for the propose step (needs the server session):

- Server route to set shuffle without starting media, e.g. `PUT audioTargetShuffle {on}` (MA
  `player_queues/shuffle`). Does toggling reshuffle the running queue in MA, and how does that
  interact with `queueIndex`/marking the playing row (`utils/audioPlaying.ts` falls back to the
  track URI when shuffled)?
- Bar vs. queue popup vs. both — bar space on mobile width.
- Radio: hide/disable the toggle while a radio stream plays?
