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

## Bibliothekssuche: alle Treffer, Alben → Künstler → Titel, mit Nachladen

**Date:** 2026-11-15 · **Where:** Kiosk audio (`AudioLibrarySearch` im Playlist-Editor) + Server

Wish (user, translated): the title search still does not show every title that matches the
query; long lists stop at around "C". Idea: show **albums first, then artists, then titles**,
as a list that **loads more** while scrolling.

Found:

- The GUI cuts every group at **25** (`SEARCH_GROUP_LIMIT` in `audioService.ts`) and sends no
  `limit`. Results come sorted by name, so the cut lands at about "C". This is the main cause.
- The server (`AudioLibrary.search`) returns up to `limit` items per group (default 100, max 500)
  and merges per-word searches for queries with several words. MA's `music/search` has **no
  offset**, so it cannot page.
- Today the GUI shows the groups in the order tracks → albums → artists.

Options for the propose step:

1. **Quick fix, GUI only:** drop the 25 cap and send `limit=500`; show albums → artists → tracks;
   render tracks in pages of e.g. 50 with "load more" / infinite scroll on the client. No server
   work, but still capped at 500 hits per type and one larger request.
2. **Real paging (with the server):** a paged route per type on MA's `…/library_items`
   (`search`, `limit`, `offset`); the GUI loads the next page when the end of the list comes
   into view. Server draft: java-overmind-server `ai/open-proposals.md`, "Suche: alle Treffer,
   mit Nachladen".
- Open: are the albums and artists groups capped too, or only tracks? Does the per-word search
  survive under option 2? Should a group be collapsible when it is long (e.g. 200 albums before
  the first title)?
