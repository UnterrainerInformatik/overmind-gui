## Why

In the kiosk playlist editor's library search, artists, albums and tracks look the same. But they
do different things: an artist does not add anything, it narrows the search (a filter). An album
adds the whole album or opens it. Users cannot tell this from the list. Giving the filter parts and
the albums their own colours makes the difference visible at a glance.

## What Changes

- The library search gets two colours, both readable in the light and the dark theme:
  - **Filter colour:** the search field (always, also while it is empty or focused), the artist
    rows in the results and the artist chip of an artist drill-in.
  - **Album colour:** the album rows in the results and the album chip of an opened album.
- Tracks keep their neutral look. Existing states (added, busy, current preview) keep working.
- Rows are marked with a coloured bar on the left and a light tint, not a full fill, so covers and
  text stay readable.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-playlist-editor`: the library search marks the filter parts (search field, artists,
  artist chip) and the albums (album rows, album chip) with two distinct colours.

## Impact

- `src/components/audio/AudioLibrarySearch.vue` (template classes, styles).
- No server or API change.
