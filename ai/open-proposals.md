# Open proposals

Draft primers waiting to be turned into an OpenSpec change (`/opsx:propose`).

As soon as an item is turned into a change (a directory exists under
`openspec/changes/`), **delete its entry here** — do not tick it off, do not
keep it as a done marker. OpenSpec is the record from that point on; this file
stays short and only ever lists work that is still un-proposed.


---

## Bibliothekssuche: eigene Farben für Künstler und Alben

**Date:** 2026-11-15 · **Where:** Kiosk-Playlist-Editor, `AudioLibrarySearch`

Wish (user, translated): In the list where songs are searched and added to the playlist, albums
and artist selectors should get **distinct colours**. An artist does not add anything, it sets a
**filter** (drill-in: `audio-search-artist-result` → chip `audio-search-artist`, track search for
the artist's name). To make that obvious, the **search field always has the same colour as the
artist selectors** (artist rows and the artist chip) — "filter colour". Albums (rows
`audio-search-album`, chip `audio-search-album-chip`) get a second, different colour. Tracks stay
neutral.

Open points for the propose step:

- Pick the two colours from the Vuetify theme (light and dark), check contrast; maybe a left
  accent bar / tinted background instead of full fill so covers stay readable.
- "Always" = also when no artist filter is active (the field is the filter input), not only
  while drilled in.

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
