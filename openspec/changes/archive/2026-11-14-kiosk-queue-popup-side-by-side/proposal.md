## Why

The queue and playlist popup of the kiosk audio bar lists the queue's songs first and the
playlists (with shuffle, filter and the edit-playlists button) below them in one scrolling list.
With a long queue, the playlists are far down and have to be scrolled to. On wide screens there
is room for both, as the playlist editor already shows: at 960 px and more it puts the playlist's
tracks and the search side by side.

## What Changes

- At widths of 960 px and more, the popup shows the queue and the playlist section side by side:
  queue on the left, playlists on the right. Each column scrolls on its own. The dialog gets wider
  for this.
- In the playlist column, the head (heading and shuffle toggle) and the filter field stay at the
  top while the playlist list scrolls under them.
- Below 960 px the popup stays as it is now: queue first, playlists below, one scrolling list.
- Nothing else changes: what the entries do, the marking, the filter, the reloads and the
  edit-playlists button all stay the same.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `kiosk-audio-bar`: new requirement for the layout of the queue and playlist popup at wide and
  narrow widths.

## Impact

- `src/components/audio/AudioQueueDialog.vue`: template wrapper for the two sections, dialog
  width by breakpoint, styles for the columns.
- No server, API, store or i18n change.
