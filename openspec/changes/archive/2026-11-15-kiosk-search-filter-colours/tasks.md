## 1. Styling

- [x] 1.1 Define `--audio-filter-color`/`--audio-album-color` and their tint variables on `.audio-library-search`, with dark-theme overrides
- [x] 1.2 Mark artist rows (filter) and album rows (album) with the left bar and tint; leave track rows unchanged
- [x] 1.3 Colour the artist chip (filter) and the album chip (album)
- [x] 1.4 Colour the search field's border, label and search icon in the filter colour, idle and focused

## 2. Verify

- [x] 2.1 `npm run lint` and `npm run build` pass
- [x] 2.2 Headless Puppeteer against `npm run serve` (writes blocked): search with artist/album/track results, artist drill-in, opened album, focused field — check computed colours in light and dark theme and take screenshots
