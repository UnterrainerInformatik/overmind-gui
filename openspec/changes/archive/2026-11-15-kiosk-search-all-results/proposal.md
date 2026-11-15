## Why

The library search in the playlist editor does not show every matching title: long result
lists stop at around "C". The GUI cuts every group to 25 items and sends no `limit`, and the
results come sorted by name, so the cut lands early in the alphabet. People searching for a
common word cannot reach most of the matches.

## What Changes

- The GUI asks the server for up to 500 hits per type (`limit=500` on `GET /audio/search`) and no
  longer cuts the groups to 25.
- The groups are shown in the order **albums → artists → tracks** (today: tracks → albums →
  artists).
- Albums and artists show their first 5 hits; a "show all N albums" / "show all N artists" row
  below expands the group to every hit.
- Tracks are rendered in pages of 50; the next page is added when the end of the list scrolls
  into view (load more on scroll, client side, from the one answer).
- The artist drill-in (track search for the artist's name) gets the same `limit` and paging.
- The opened album's track list is unchanged (it is not a search).
- No server change: the server already accepts `limit` (default 100, max 500). Real server-side
  paging stays a later option (server draft "Suche: alle Treffer, mit Nachladen").

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-playlist-editor`: requirement "Search the library and add results" changes the group
  order, the number of hits asked for and shown, the collapsed album/artist groups and the
  load-more of tracks.

## Impact

- `src/utils/webservices/audioService.ts`: `search` sends `limit`, `SEARCH_GROUP_LIMIT` goes.
- `src/components/audio/AudioLibrarySearch.vue`: group order, collapsed groups with "show all",
  track paging on scroll.
- `src/locales/de-AT.json`, `src/locales/en-US.json`: texts for "show all".
- Server: none (uses the existing `limit` parameter). One larger answer per search (up to 500
  per type) instead of the server default of 100.
