## 1. Layout

- [x] 1.1 In `AudioQueueDialog.vue`, add a computed `wide` (`$vuetify.breakpoint.mdAndUp`) and set the dialog's `max-width` to 1100 when `wide`, else 640 (design D1, D3).
- [x] 1.2 Wrap the queue part of `v-card-text` in a queue column and the playlist part in a playlist column; inside the playlist column, split into a fixed part (head and filter) and a list part (messages and rows) (design D2).
- [x] 1.3 Add the `audio-queue-body--wide` class to `v-card-text` when `wide`, with styles: flex row, `overflow: hidden`, columns `flex: 1 1 0; min-width: 0; overflow-y: auto`, playlist column as flex column with a scrolling list part, border between the columns. Without the class the layout stays as before.

## 2. Verify

- [x] 2.1 Run lint and build.
- [x] 2.2 In headless Puppeteer against `npm run serve` (writes blocked), open the popup at 1280 px: queue left, playlists right, each column scrolls on its own, shuffle and filter stay visible while the playlist list scrolls, no horizontal scroll.
- [x] 2.3 Same at 800 px and 390 px: playlists below the queue in one scrolling list, no horizontal scroll.
- [x] 2.4 At 1280 px check that tapping a queue entry, a playlist, the shuffle toggle, the filter and the edit-playlists button still work (writes blocked, check the requests sent).
