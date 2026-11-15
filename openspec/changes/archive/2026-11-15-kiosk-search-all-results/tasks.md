## 1. Service

- [x] 1.1 `audioService.search`: append `&limit=500`, remove `SEARCH_GROUP_LIMIT` and the three `slice` calls, update the method's doc comment (design D1)

## 2. Search component

- [x] 2.1 `AudioLibrarySearch`: reorder the template groups to albums → artists → tracks (design D4)
- [x] 2.2 Add `expanded` state, `shownAlbums` / `shownArtists` (first 5 unless expanded) and the `audio-search-show-all` rows with count, coloured per group (design D2)
- [x] 2.3 Add `trackPages`, `shownTracks` (pages of 50) and the `audio-search-more` sentinel; render tracks from `shownTracks` (design D3)
- [x] 2.4 Watch the sentinel with an `IntersectionObserver` rooted at `.audio-search-scroll`, scroll-listener fallback without it; set up in `mounted`, tear down in `beforeDestroy`; re-check after each added page (design D3)
- [x] 2.5 Reset `expanded` and `trackPages` whenever `results` is replaced or cleared (new answer, drill-in, open/leave album, leave artist)
- [x] 2.6 Update the component doc comment (order, collapsed groups, track paging)

## 3. i18n

- [x] 3.1 Add `showAllAlbums` and `showAllArtists` with `{count}` to `page.kiosk.audio.editor` in de-AT and en-US (design D5)

## 4. Verify

- [x] 4.1 `npm run lint` and `npm run build` pass
- [x] 4.2 Headless Puppeteer against `npm run serve`, writes blocked, `audio/search` mocked with 40 albums, 3 artists, 300 tracks: request carries `limit=500`; order albums → artists → tracks; 5 albums + "Alle 40 Alben zeigen", no show-all row for artists; tapping it shows 40 albums and removes the row
- [x] 4.3 Puppeteer: 50 tracks at first, scrolling to the end adds 50 at a time until all 300 are shown; a new query collapses albums and starts at 50 tracks again; artist drill-in sends `types=track&limit=500` and pages the same way
- [x] 4.4 Puppeteer: preview / add / already-added marking still work on a track from a later page; the show-all row is at least 44 px high
- [x] 4.5 Check at 390, 800 and 1280 px: no horizontal scroll; paging works in the narrow search view and in the side-by-side layout
- [x] 4.6 One real read-only search against the live backend (e.g. a common word) to confirm the server honours `limit=500` and the answer time is acceptable
