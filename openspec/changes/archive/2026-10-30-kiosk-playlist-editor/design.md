## Context

- The audio bar's `AudioQueueDialog.vue` (change `kiosk-audio-bar`) already lists every playlist
  from `GET /audio/playlists` and plays one on tap. `audioService.ts` reads playlists tolerantly
  (`{items}` or a bare array) and keeps `editable`.
- The contract is the server change's `audio-library` spec
  (`java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/audio-library/`,
  after archive `openspec/specs/` there). Its design (D10) adds facts the GUI has to respect:
  - MA has about 1450 playlists on the house install, almost all read-only m3u files.
  - A move or add-with-position is a *tail rewrite* on the server. With the server's ≥ 1.1 s gap
    between writes it takes about 1–2 s.
  - A track already in a playlist cannot be added again: MA skips it silently.
  - Positions are 0-based on the REST contract.
  - Errors: `400` validation, `404` unknown, `409` read-only, `502` MA error (with reason).
- `axiosUtils` errors carry `status` and `serverReason`. The `audioCommand` mixin turns a failure
  into one snackbar.
- `axiosUtils` has `getFromPath`, `postToPath`, `putToPath` and `deleteFromPath`. It has no PATCH,
  and `deleteFromPath` always sends an empty body. The track removal route needs `{positions}`
  as the DELETE body.
- There is no drag-and-drop library in the project. The stack is Vue 2.6 and Vuetify 2.5.

## Goals / Non-Goals

**Goals:**
- One editor component tree that the queue dialog opens; nothing global and no new store module.
- Never show a list the server has not confirmed for longer than one write.

**Non-Goals:**
- Inserting at a position from the search: the GUI always appends and the user then drags.
  Every insert is a tail rewrite on the server, so append-then-move costs the same and keeps
  the UI simple.
- Multi-select remove or move.
- Playlist cover editing, and duplicating playlists.
- Searching playlists or radio from the editor's search.
- Any change to `KioskAudio.vue` or the backend.

## Decisions

### D1 — Component split under `src/components/audio/`

- `AudioPlaylistEditor.vue`: the `v-dialog fullscreen` shell. It owns the view state
  (`list` | `playlist` | `search` on narrow screens), the open playlist, the busy flag and the
  edit runner (D4).
- `AudioPlaylistList.vue`: the filter field, the read-only toggle, the list and the create button.
  It emits `open`.
- `AudioPlaylistTracks.vue`: the header actions (back, rename, delete) and the drag list. It
  emits `remove(index)`, `move(from, to)`, `rename`, `delete` and `back`.
- `AudioLibrarySearch.vue`: the search field, the grouped results and the artist drill-down. It
  takes `existingUris` as a prop and emits `add(uri)`.
- `AudioNamePrompt.vue`: a small dialog for the name, used for create and rename. Delete uses
  a `v-dialog` confirm inside the editor.

The editor sits inside `AudioQueueDialog` with `v-model`. The queue dialog reloads its
playlists when the editor's `value` turns false. Vuetify stacks the full-screen dialog above
the queue dialog, so closing it shows the queue popup again without extra code.

Alternative: one large component. Rejected because of the four independent lists and their
loading and error states; the existing dialogs are already about 250 lines each.

### D2 — Showing ~1450 playlists

The editor loads the full list once on open (the server already pages through MA) and filters
on the client. By default it shows only `editable` playlists. The toggle adds the read-only
ones, sorted into the same name order. Rendering is limited by `v-virtual-scroll` with a fixed
item height of 56 px, so 1450 rows stay cheap on the wall tablet. The filter is a plain
computed (`name.toLowerCase().includes(q)`), with no debounce: it filters at most 1450 strings.

Alternative: server-side filtering. Rejected because the contract has no query parameter for
it, and the list is fetched once anyway.

### D3 — Drag reorder with `vuedraggable@2.24.3`

`vuedraggable` 2.x is the Vue 2 wrapper around SortableJS. SortableJS handles touch, mouse and
auto-scroll near the edges. The options are `handle: '.audio-track-handle'` (so a swipe on a row
scrolls), `delay: 0` on the handle, and `disabled: busy || !editable`. The GUI reads
`oldIndex`/`newIndex` in the `@end` event and emits `move(from, to)` only when they differ.
SortableJS has already moved the row locally, so the dropped order shows while the server
rewrites. The reload after the write (D4) replaces it with the server's order.

`v-virtual-scroll` and draggable do not combine. Track lists are short (tens to a few hundred),
so the track list renders all rows.

Alternatives:
- Hand-rolled pointer events. Rejected: auto-scroll and touch-cancel handling are what
  SortableJS already solves.
- Up/down buttons. Rejected: the planning asked for drag.

### D4 — One edit at a time, then reload

The editor has one `runEdit(call, reload)` method:

1. If `busy`, it returns at once.
2. It sets `busy`, then awaits `call()`.
3. On failure it shows a snackbar. `409` uses `page.kiosk.audio.editor.readOnly` with the
   playlist name, then the list reloads (so `editable` is current) and the editor shows the
   list. `404` uses `page.kiosk.audio.editor.notFound` and also returns to the reloaded list.
   Every other failure uses `editFailed` plus `serverReason`.
4. In both cases it awaits `reload()` (the tracks for a track edit, the playlist list for a
   playlist edit), then clears `busy`.

While `busy`, the track list shows a `v-progress-linear` in the header and greys out its
buttons and handles. The search results are disabled too, because an add is an edit of the
same playlist.

The rename reload also re-reads the playlist list, because the header shows the playlist object
from that list. The create answer is the new `Playlist`; the editor opens it directly and
reloads the list in the background.

Alternative: optimistic updates with rollback. Rejected because the spec wants the server's
answer shown, and MA's silent duplicate skip means the client cannot predict the result.

### D5 — Search

The search queries `GET /audio/search?q=<trimmed>&types=track,album,artist`. It runs after a
400 ms debounce and needs at least 2 characters. A sequence number drops stale answers.

**Guessed answer shape:** the server design says it passes MA's grouping through. The GUI
therefore reads `{tracks: [], albums: [], artists: []}`. As a fallback it also reads
`{track: [], album: [], artist: []}` and lists wrapped as `{items}`. Item fields:
- track: `title` (else `name`), `artist` (else the joined `artists`), `uri` and `imageUrl`
  (the same normalizer as queue tracks)
- album: `name`, `artist`, `uri`, `imageUrl`
- artist: `name`, `uri`, `imageUrl`

Results without a `uri` are dropped. At most 25 per group are shown.

**Albums are added by their URI.** The server spec's add route takes `uris` and MA's
`add_playlist_tracks` expands an album URI into its tracks. This is guessed: the server design
verified adding track URIs only. If the server rejects the URI, the edit fails visibly (D4),
and the fallback is to drop album adding in a follow-up.

Artists are not added. Tapping one runs a `types=track` search for the artist's name and shows
a chip with the name to leave the drill-down.

"Already added" means the result's `uri` is in the open playlist's track URIs. The server
reports provider URIs for playlist tracks, while search may answer library URIs for the same
track. In that case the mark misses, MA skips the add silently, the reload shows no new row,
and the editor shows `page.kiosk.audio.editor.notAdded`. To detect this, `runEdit` compares
the track count before and after an add.

### D6 — Plumbing

`rest.ts` gets these endpoint keys (comment: contract `audio-library`):

```
audioPlaylist:           '/audio/playlists/{playlistId}'
audioPlaylistTracks:     '/audio/playlists/{playlistId}/tracks'
audioPlaylistTracksMove: '/audio/playlists/{playlistId}/tracks/move'
audioSearch:             '/audio/search'
```

`audioPlaylists` already exists. It is reused for `POST`, through `post()`, which posts to the
plain path.

`axiosUtils` changes:
- New `patchToPath(server, endpointPath, params, dataProvider)` next to `putToPath`.
- `deleteFromPath` gains an optional `dataProvider`. `internalDelete` sends its result as
  `data` instead of `{}`. Existing callers are unchanged because the default is `{}`.

`audioService` gains `getPlaylistTracks`, `createPlaylist`, `renamePlaylist`, `deletePlaylist`,
`addPlaylistTracks`, `removePlaylistTracks`, `movePlaylistTrack` and `search`, plus the
`AudioSearchResult` type. Its header comment lists the new routes and the guessed search shape.

### D7 — Layout

The dialog is `fullscreen` at every width. At 960 px and more (`$vuetify.breakpoint.mdAndUp`),
an open editable playlist shows the tracks and the search as two columns, each scrolling on its
own. Below 960 px the track view has an "add tracks" button that switches to the search view,
with a back button. Rows are at least 48 px high; buttons are `v-btn icon` with a 48 px hit
area; the drag handle is a 48 × 48 px area with `drag_indicator`. All strings live under
`page.kiosk.audio.editor.*`.

## Risks / Trade-offs

- [Album URIs may not be accepted by the server or MA] → The failure is visible and isolated.
  Task 5.1 re-checks this against the built server before archive.
- [The search shape is guessed] → Reads are tolerant (D5). Task 5.1 checks against the built
  server.
- [The provider URI differs from the library URI, so "already added" misses] → A "not added"
  message after a no-op add (D5).
- [A 1–2 s lock after each move feels slow when sorting many tracks] → Accepted. This is the
  price of the server's rewrite; the busy bar makes it visible.
- [Adding `vuedraggable` grows the bundle by about 30 KB min] → It is only imported by the
  editor component, which the queue dialog loads lazily with
  `() => import('./AudioPlaylistEditor.vue')`.
- [Text input on the wall tablet relies on the OS on-screen keyboard] → The same as the
  existing kiosk forms (Personen management). Nothing extra is planned.

## Migration Plan

This is frontend only and deploys with the normal GUI pipeline. One new npm dependency. Rollback
is reverting the commit. No stored data.

## Implementation Notes

Checked against the built server (`java-overmind-server` commit `2a0e372e`, `AudioRoutes`,
`AudioLibrary`, `AudioSearchJson`, `AudioMapper`) on 2026-10-30:

- **Search shape matches D5.** The answer is `AudioSearchJson(tracks, albums, artists,
  playlists)`; a type that was not asked for is `null`. Tracks are `AudioTrackJson`, albums and
  artists `AudioMediaItemJson(name, artist, uri, imageUrl)`. The server caps each type at 25.
  The tolerant fallbacks stay, but the primary shape is no longer a guess.
- **Album URIs are still unverified at runtime.** `addTracks` hands `uris` to MA's
  `add_playlist_tracks` unchanged and only rejects blank ones, so an album URI reaches MA. Whether
  MA expands it is still to be seen on the house install.
- **`trackCount` is always `null`.** `AudioMapper.playlist` never fills it. The list therefore
  shows no count, and the "not added" check (D5) compares the length of the reloaded track list,
  not `trackCount`.
- **Playlist ids are strings** (MA's `item_id`). The GUI compares ids as strings throughout.
- **An add the server skipped answers `204`.** Append without a position does no count check on
  the server, so the GUI's own check is the only signal.

Found while building:

- `v-virtual-scroll` is not in the global component list of `plugins/vuetify.ts`; the list
  imports it locally so it stays in the editor's lazy chunk.
- A full-screen `v-dialog` has no overlay, and Vuetify then treats every click outside its
  content as a click outside, including the close button of the snackbar an edit raises. The
  editor is therefore `persistent` (with `no-click-animation`) and closes on its close button or
  on Escape.
- The filter text and the read-only toggle live in the editor, not the list, so they survive
  opening a playlist and going back; they reset when the editor opens.
- The shared `.audio-queue-cover` rule lost to Vuetify's `.v-responsive { flex: 1 0 auto }`, so a
  row with a cover image centred its text. This also affected the queue popup; the rule now pins
  `.audio-queue-cover.v-image` to 40 px.
- The browser harness answered CORS preflights without `PATCH` and could not fail a GET with a
  status; both are fixed there.
