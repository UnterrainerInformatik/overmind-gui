## Context

See proposal.md (Why). Current state in code:

- `audioService.search(query, types)` sends `q` and `types` to `audioSearch`
  (`GET /audio/search`), drops hits without `uri` and cuts every group with
  `.slice(0, SEARCH_GROUP_LIMIT)` (25).
- The server (`AudioLibrary.search`, java-overmind-server) returns up to `limit` hits per type
  (default 100, max 500, sorted by name) and merges per-word searches for multi-word queries.
  MA's `music/search` has no offset, so the server cannot page today.
- `AudioLibrarySearch.vue` renders `results.tracks`, `.albums`, `.artists` in that order inside
  one scroll container `.audio-search-scroll`. Track rows carry a preview button and, for the
  current track, an `AudioSeekSlider`. The album list of an opened album (`getAlbumTracks`) uses
  the same `results.tracks` rendering.
- Album rows use the album colour, artist rows the filter colour (change
  `kiosk-search-filter-colours`).

## Goals / Non-Goals

**Goals:**
- Every hit the server returns is reachable by scrolling or one tap.
- The tracks stay quick to reach even when a query matches many albums.
- Rendering 500 track rows with sliders/images must not stall a kiosk tablet.

**Non-Goals:**
- No server-side paging and no server change.
- No collapsing of the tracks group, no group headers that toggle.
- No paging of an opened album's tracks beyond what the tracks paging gives for free.

## Decisions

### D1: `limit=500` per request, no client cap

`search` appends `&limit=500` and drops `SEARCH_GROUP_LIMIT` and the three `slice` calls. 500 is
the server's maximum; asking for it means one request per search, and the client owns how much
of the answer is rendered (D2, D3). The `RADIO_STATIONS` cap is unrelated and stays.

Alternative: per-type limits (e.g. 50 albums, 500 tracks) — would need one request per type or
a server change, and an album count above 50 is rare enough that one limit is simpler.

### D2: Albums and artists collapsed to 5 with a "show all N" row

Component state `expanded: { albums: false, artists: false }`. Computed `shownAlbums` /
`shownArtists` return the full list when expanded, else the first `COLLAPSED_COUNT = 5`. When the
group has more than 5 hits, a row `audio-search-show-all` (same 56 px row height as results,
so ≥44 px touch target) follows with text "Alle {count} Alben zeigen" / "Alle {count} Künstler
zeigen" and an `expand_more` icon. The album row wears the album colour, the artist row the filter
colour, as a text/icon colour only (no tint), so it reads as part of its group but not as a hit.
`expanded` is reset wherever `results` is replaced by a new answer (in `load` on success, and
when results are cleared), which covers new query, drill-in, open/leave album and leave artist.

Alternative: collapsible group headers (user chose against it); infinite scroll for all groups
(tracks would sit far below 100+ albums).

### D3: Tracks rendered in pages of 50, next page on scroll

State `trackPages` (number of pages shown, starts at 1); computed `shownTracks =
results.tracks.slice(0, trackPages * TRACK_PAGE)` with `TRACK_PAGE = 50`. A sentinel element
`audio-search-more` sits after the last shown track while `shownTracks.length <
results.tracks.length`. An `IntersectionObserver` with `root` = `.audio-search-scroll` and a
`rootMargin` of about 200 px bottom watches the sentinel and increments `trackPages` when it
intersects. Because the sentinel re-renders after the increment, the observer re-checks; when
the list is still short enough that the sentinel stays visible, the next page follows until it
leaves the view. `trackPages` resets to 1 together with `expanded` (D2).

Fallback: when `window.IntersectionObserver` is missing (old kiosk browser), a passive `scroll`
listener on `.audio-search-scroll` checks `scrollTop + clientHeight >= scrollHeight - 200` and
the check also runs after each render (`$nextTick` in a watcher on `shownTracks.length`).
The observer/listener is set up in `mounted` and torn down in `beforeDestroy`.

Alternative: a "load more" button — the user asked for loading while scrolling. Alternative:
virtual scrolling (vue-virtual-scroller) — rows have variable height (seek line of the current
track) and 500 rows paged by 50 are cheap enough; no new dependency.

### D4: Keys and existing behaviour unchanged

Row keys stay `t-${index}-${uri}` etc.; appending pages keeps indexes stable, so rows are not
re-created. Preview, current-track marking, added marking and the busy dimming work on the shown
rows exactly as before. Only the template order of the three groups changes.

### D5: i18n

New keys under `page.kiosk.audio.editor`: `showAllAlbums` ("Alle {count} Alben zeigen" /
"Show all {count} albums") and `showAllArtists` ("Alle {count} Künstler zeigen" /
"Show all {count} artists").

## Risks / Trade-offs

- [Larger answer, slower search: up to 1500 items instead of ~300] → the server already fetches
  per type; the loading bar stays visible; if it proves slow, server-side paging (draft in
  java-overmind-server) replaces D1 without changing the spec's visible behaviour much.
- [Still capped at 500 per type] → accepted; a query matching more than 500 tracks is better
  narrowed by typing more. Noted in the proposal as the later server option.
- [IntersectionObserver missing on old kiosk browsers] → scroll-listener fallback (D3).
- [Sentinel inside a list whose scroll container changes in the narrow layout] → the root is
  the component's own `.audio-search-scroll`, which exists in both layouts.
