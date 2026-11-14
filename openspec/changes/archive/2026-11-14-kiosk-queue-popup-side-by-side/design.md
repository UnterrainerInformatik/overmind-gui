## Context

`AudioQueueDialog.vue` is a `scrollable` `v-dialog` with `max-width="640"`, fullscreen only at
`xsOnly`. Its `v-card-text` holds the queue rows and, after them, the playlist head (heading and
shuffle toggle), the filter field, the messages and the playlist rows, all in one scrolling area.
The edit-playlists button sits in the card title and stays there. The playlist editor
(`AudioPlaylistEditor.vue`) already switches to two columns at `$vuetify.breakpoint.mdAndUp`
(960 px) with a flex row of `flex: 1 1 0; min-width: 0` columns and a border between them.

## Goals / Non-Goals

**Goals:**
- Two independently scrolling columns at 960 px and more, as in the playlist editor.
- No change to the layout below 960 px.

**Non-Goals:**
- Moving the edit-playlists button out of the title.
- Scrolling the queue to the playing entry on open.
- Any behaviour change of entries, filter, marking or reloads.

## Decisions

### D1 — Same breakpoint as the editor

A computed `wide` returns `$vuetify.breakpoint.mdAndUp`, the same switch as in the editor, so
both popups change layout at the same width. Alternative `smAndUp` (600 px) was rejected: at
600–960 px two columns of about 280 px would cut titles too short.

### D2 — Wrap the two sections, switch by a class

The queue part and the playlist part of `v-card-text` each go into a wrapper `div`
(`audio-queue-column--queue`, `audio-queue-column--playlists`). In the playlist wrapper, the head
and filter go into a fixed part and the messages and rows into a scrolling list part. A class
`audio-queue-body--wide` on `v-card-text` turns it into a flex row with `overflow: hidden`; each
column then gets `flex: 1 1 0; min-width: 0; overflow-y: auto`, and the playlist column becomes a
flex column whose list part takes the remaining height and scrolls. Without the class the wrappers
are plain blocks and the whole `v-card-text` scrolls as today. One template for both widths keeps
the rows in one place; rendering the sections twice was rejected.

### D3 — Dialog width and height

At `wide` the dialog's `max-width` becomes 1100 instead of 640. The height follows the content up
to the limit the scrollable dialog already sets (90 % of the viewport): the `v-card-text` flex row
shrinks to that limit and the columns scroll inside it. A fixed height was rejected because a
short queue and few playlists would leave a large empty popup. A thin border separates the
columns, as in the editor.

## Risks / Trade-offs

- [Vuetify's scrollable dialog sizing may not let the flex row shrink, so the whole card text
  scrolls instead of the columns] → Verify in headless Puppeteer at 1280 px; if needed give the
  wide `v-card-text` an explicit `max-height` (e.g. `calc(90vh - <title height>)`).
- [Column height jumps when the queue or list reloads] → Accepted; the background reload keeps
  the shown content, so jumps only happen when the content really changes.
