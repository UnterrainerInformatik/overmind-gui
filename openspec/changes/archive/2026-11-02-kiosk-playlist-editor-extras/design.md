## Context

- Base: the full-screen `AudioPlaylistEditor.vue` with `AudioPlaylistList`, `AudioPlaylistTracks`,
  `AudioLibrarySearch` and `AudioNamePrompt` (change `2026-10-30-kiosk-playlist-editor`). Every
  edit runs through `runEdit` (one at a time, then reload, design D4 there). It is opened only
  from `AudioQueueDialog`, which knows the bar's resolved `target`.
- `AudioPlaylistTracks` uses `vuedraggable@2.24.3` (SortableJS) with `handle`, `animation: 150`
  and Sortable's default auto-scroll (frame-based, fixed sensitivity and speed). Rename and
  delete sit in its header; the narrow "add tracks" button sits below the scrolling list.
- `KioskAudioBar` resolves the device's target from `localStorage['kioskAudioTarget']`
  (`'main'` or `'room:<id>'`) against the shared audio state (`utils/audioState.ts`,
  `acquire()`/`release()`); a room that is grouped or unavailable falls back to the main group.
  The kiosk audio page (`/app/kioskaudio`) has no bar (spec `kiosk-audio-bar`, "Bar on every
  kiosk page except the audio page") and thus no target of its own.
- `SseClient.addEventListener(name, fn)` delivers named events and survives reconnects; the
  `connected` event marks every (re)connect (spec `sse-transport-client`).
- The never-pushed editor in `backup/kiosk-playlist-editor-2026-11-02`
  (`src/views/KioskPlaylists.vue`) has a hand-rolled drag with the auto-scroller this change
  ports (`autoScrollFrame`, edge zone 15 % clamped 48–120 px, `v = vMin + (vMax − vMin) · d²`,
  time-based with a fractional carry).
- The backend (`java-overmind-server`, specs `audio-music-assistant-bridge` and
  `audio-library`) has neither a `shuffle` on `playMedia` nor a playlist-change event today.

## Goals / Non-Goals

**Goals:**
- Port the five features into the existing components without a second data path to Music
  Assistant.
- Keep the GUI working against today's backend: unknown `shuffle` is ignored, missing events
  mean no live update.

**Non-Goals:**
- Implementing the backend side. It is written down below as the contract for a change in
  `java-overmind-server`.
- Optimistic edits beyond what SortableJS already does (the row stays where it was dropped
  until the reload).
- Porting `KioskPlaylists.vue`, `musicAssistant.ts` or the `/app/kioskplaylists` route.

## Decisions

### D1 — Backend contract

Two additions for `java-overmind-server`, to be proposed there:

1. `POST /audio/targets/{targetId}/playMedia` `{uri, shuffle?}`. With `shuffle: true` the server
   sets the target queue's shuffle on before (or while) replacing the queue, with `false` it sets
   it off, without the field it leaves shuffle as it is (radio). MA: `player_queues/shuffle`
   (`queue_id`, `shuffle_enabled`) then `player_queues/play_media` with `option: replace`.
2. SSE event `audio-playlist-changed` `{playlistId}` (the id as in `GET /audio/playlists`) on
   every change to a playlist, whoever made it: tracks added, removed or moved, renamed, created,
   deleted. Source: MA's `media_item_updated` / `media_item_added` / `media_item_deleted` events
   for media type `playlist`, plus the server's own edits. Coalesced per playlist (≈ 500 ms),
   sent to every `/sse/appliances` connection like `audio-state`.

The GUI sends `shuffle` for playlists only; Jackson on the server ignores unknown properties
today, so the field is harmless before the backend change (checked in task 1.3).

*Alternative:* the GUI reorders and sends track URIs itself. Rejected: the queue would no longer
be "the playlist", so the bar's playlist highlight and MA's own shuffle state would be wrong.

### D2 — Shared shuffle choice

`src/utils/audioShuffle.ts`: a `Vue.observable({ on })` read once from
`localStorage['kioskAudioShuffle']` (`'1'`/`'0'`), and `setShuffle(on)` that writes through
in a try/catch. The editor and the queue popup bind to the same object, so flipping one shows in
the other at once. Storage errors leave the in-memory value working (spec "Storage blocked").

### D3 — The device's target outside the bar

The storage read and the resolution (`selection` + state → target or main group) move from
`KioskAudioBar.vue` into `src/utils/audioTarget.ts` (`readStoredTarget`, `writeStoredTarget`,
`resolveTarget(state, selection)`); the bar uses them unchanged in behaviour. The editor gets an
optional `target` prop: `AudioQueueDialog` passes its target (so an in-memory selection with
blocked storage still wins); without the prop the editor calls `acquire()` on open, resolves
`readStoredTarget()` against `audioStore.state`, and `release()`s on close. No target → play
disabled.

*Alternative:* let play from the audio page always use the main group. Rejected: a room playing
on its own would be overruled by the editor on the same tablet.

### D4 — Action bar

A new row in `AudioPlaylistTracks` between header and `.audio-tracks-scroll`: play, shuffle
toggle, then for editable playlists rename, delete and (narrow only) "add tracks". The header
keeps back, name and the read-only chip. Because only `.audio-tracks-scroll` scrolls, the row
stays in place without `position: sticky`. Buttons are 48 px (`audio-editor-icon`); on 390 px the
labels collapse to icons, the shuffle toggle keeps its on/off colour. The bottom
`.audio-tracks-add` block goes away. Play emits `play` to the editor, which runs it through the
`audioCommand` mixin (snackbar on failure), not through `runEdit`, because it does not touch the
playlist and must not block edits.

### D5 — Live updates

The editor registers `audio-playlist-changed` and `connected` on `SseClient` while `value` is
true and removes them when it closes or is destroyed. An event marks `pending.list = true` and,
if it concerns the open playlist (or carries no id), `pending.tracks = true`. `flushPending()`
runs when neither `busy` nor `dragging` is set: list reload (keeping filter and toggle), then
track reload of the open playlist if pending. `runEdit`'s `finally` and the tracks component's
drag `end` call `flushPending()`. Several events in a row collapse into the flags, and a short
trailing debounce (300 ms) merges a burst that arrives while idle. If the reloaded list no longer
contains the open playlist, the editor uses its existing 404 path (snackbar, back to list).

`dragging` is set from vuedraggable's `start` and cleared on `end` (emitted by
`AudioPlaylistTracks`). A reload while dragging is exactly what must not happen: it would replace
`rows` under SortableJS.

*Alternative:* polling every few seconds. Rejected by the user in favour of a server event; it
also costs requests on a 1450-playlist install.

### D6 — Auto-scroll on top of SortableJS

`scroll: false` turns Sortable's own auto-scroll off. Sortable is put in fallback mode
(`forceFallback: true`, `fallbackOnBody: true`, `fallbackTolerance: 3`) so mouse and touch take
the same path and the drag is driven by pointer/mouse/touch move events on `document`, which we
can observe. `src/utils/dragAutoScroll.ts` exports `createAutoScroller(scrollEl)` with
`start()`, `stop()`; while started it tracks the last pointer position from `pointermove`,
`touchmove` and `mousemove` (capture, passive) and runs a `requestAnimationFrame` loop with the
backup's curve: zone = clamp(0.15 · height, 48, 120), depth `d ∈ [0,1]`,
`v = V_MIN + (V_MAX − V_MIN) · d²` px/s, `Δ = v · dt` with `dt` from the rAF timestamp capped
at 0.2 s (guards only against stalls such as a hidden tab), plus a fractional carry so slow
speeds still move on devices that round `scrollTop`. The constants are the backup's, which were
tried on the tablet: V_MIN = 150 px/s, V_MAX = 2500 px/s (300 tracks × 56 px ≈ 16 800 px →
about 7 s at full depth, faster than dragging row by row and still controllable). It stops at once when the pointer leaves the zone, at the list's start or end, and on
`stop()`.

After each frame that scrolled, the scroller dispatches a synthetic move event (`pointermove`
when Sortable uses pointer events, otherwise `mousemove`/`touchmove`) on `document` at the last
coordinates, so Sortable re-evaluates the row under the finger and the drop target follows the
scrolled list. `AudioPlaylistTracks` calls `start()` on draggable `start` and `stop()` on `end`.

*Alternative:* tune Sortable's `scrollSensitivity`/`scrollSpeed`. Rejected: its speed is per
frame (twice as fast on 120 Hz), linear-stepped and keeps scrolling briefly after leaving the
zone, which is what the backup was built to fix.
*Alternative:* replace vuedraggable with the backup's hand-rolled drag. Rejected: the master
design chose SortableJS for touch-cancel handling and it already works there.

### D7 — Entry from the audio page

`KioskAudio.vue` gets a "Playlists" button in `.kiosk-audio-bar` next to the back
`KioskLinkPanel` and mounts `AudioPlaylistEditor` lazily (`() => import(...)`, like
`AudioQueueDialog`) with `v-model`. No `target` prop (D3). The iframe stays mounted, so Music
Assistant keeps its page.

## Risks / Trade-offs

- [Synthetic move events are not something Sortable documents] → Task 4.4 verifies in the
  browser (touch emulation and mouse) that the drop target follows auto-scroll. Fallback: call
  Sortable's internal `_onTouchMove` via the instance from `this.$refs.list._sortable` — uglier,
  same effect.
- [`forceFallback` changes the look of the dragged row (a clone on `body`)] → Styled with
  `fallbackClass`; the ghost keeps `audio-track--ghost`.
- [Our own edit also triggers `audio-playlist-changed`, so a second reload follows each edit]
  → Accepted; it is one cheap GET and shows the same order.
- [Backend not yet there] → Shuffle plays in order and live updates do not happen. Both are
  visible as "not working" rather than broken. D1 is the brief for the backend change; this
  change does not touch `java-overmind-server`.
- [The dev server talks to the live backend, so editing real playlists while testing is a real
  write] → Browser verification runs against mocked `/audio/*` routes and a mocked SSE stream
  (request interception), never against the live server.
- [V_MAX too fast for fine placement] → The quadratic curve keeps the inner half of the zone
  below ~30 % of V_MAX. The constants sit in one place and can be tuned on the tablet.

## Migration Plan

GUI-only deploy via push to master. Rollback is a revert. Order with the backend does not
matter (D1).
