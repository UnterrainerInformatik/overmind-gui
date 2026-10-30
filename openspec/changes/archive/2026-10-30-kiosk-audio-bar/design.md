## Context

- Kiosk mode is a Vuex flag (`gui/kioskMode`); `App.vue` hides the app bar and drawer behind it
  and already renders one piece of global kiosk chrome, the settings gear fixed bottom-right
  (`.kiosk-migrations-btn`). The bar is the second piece and belongs in the same place.
- `KioskLinkPanel` is a `KioskPanel` with a 38 px avatar in the `title` slot (`mb-4`) above an
  18 px text line, inside `pa-1` and a 1 px border with `ma-1` around it — about 82 px high. It is
  used on every kiosk page (overview link row, every "Zurück" tile).
- The SSE library (`src/lib/sse-client/sseClient.ts`) only listens to `connected` and
  `transport-update`, opens its `EventSource` only on the first `registerTransport()`, and gates
  reconnect and `reconnectNow()` on `handles.size > 0`. The backend sends `audio-state` to every
  open `/sse/appliances` connection without a registration
  (`java-overmind-server` → `audio-music-assistant-bridge`, spec `audio-music-assistant-bridge`).
- REST goes through `axiosUtils` with endpoint keys in `src/store/rest.ts`. Paths with `{...}`
  placeholders exist for GET/POST/DELETE (`getFromPath`, `postToPath`, `deleteFromPath`), but not
  for PUT; `/audio/rooms/{roomId}/grouped` needs one.
- `axiosUtils` errors only log; user-facing errors are dispatched by the caller to
  `gui/snackbar/snackbarEnqueue`.
- The contract is the specs of the server change, `java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/`
  (after archive: `openspec/specs/` there); they are authoritative. See proposal.md for
  why the bar exists.

## Goals / Non-Goals

**Goals:**
- One shared, reactive audio state on the client that the bar uses now and the map buttons
  (change B) reuse without a second SSE listener or poll loop.
- The bar never blocks or errors loudly while the backend is not deployed yet.

**Non-Goals:**
- Playlist editing, search (change C); map buttons and the "Licht & Sound" tile (change B).
- Any change to `KioskAudio.vue`.
- Seeking or volume while dragging (live scrubbing): commands are sent on release only.
- Showing the bar outside kiosk mode.

## Decisions

### D1 — Shared state module `src/utils/audioState.ts`

A module-level `Vue.observable` holding `{ state: AudioState | null, available: boolean }`, with
`acquire()` / `release()` reference counting. The first `acquire()` registers the `audio-state`
listener on the SSE singleton, loads `GET /audio/state`, and starts a 30 s safety poll; the last
`release()` undoes all three. It also reloads on SSE (re)connect (a `connected` listener through
the same named-event API) and on wake (`visibilitychange` → visible). `available` becomes `true`
on the first valid state and `false` only when a load fails while no state has ever arrived — a
single failed poll after a good state keeps the last state (the SSE stream is the primary source).

Alternative: a Vuex module. Rejected: the store holds GUI preferences and config; this is a live
cache with a lifecycle tied to mounted consumers, closer to the SSE client itself.

A state is accepted only if it has a `mainGroup` object and a `rooms` array; anything else is
ignored. An incoming state replaces the old one wholesale (the event is always the full state).

### D2 — Named-event listeners in the SSE library

`addEventListener(name, handler)` / `removeEventListener(name, handler)` on the core `SseClient`,
stored as `Map<string, Set<handler>>`. `ensureConnection()` attaches one native listener per
registered name to each new `EventSource` (and when a name is added to an open source). The native
listener parses JSON in a try/catch, refreshes `lastActivityTs`, and calls each handler in its own
try/catch. A private `hasConsumers()` (`handles.size > 0 || listeners non-empty`) replaces the
three `handles.size > 0` checks. Registering the first listener calls `ensureConnection()`.

`connected` is allowed as a name too, so `audioState` can reload on reconnect without the library
growing an `onReconnect` hook. The client's own `connected` handling runs first.

Alternative: a separate `EventSource` just for audio. Rejected: doubles connections per kiosk and
the server already multiplexes on one stream.

### D3 — Bar placement and height

`App.vue` renders `<KioskAudioBar>` as a `v-footer` with `app` and `fixed` when
`kioskMode && $route.name !== 'kioskAudio'`. `app` makes Vuetify pad `v-main` by the footer height,
which satisfies "content ends above the bar" without per-page changes. The gear's `bottom` becomes
`calc(var(--kiosk-audio-bar-height) + 8px)` while the bar is shown.

`KioskLinkPanel` moves the icon out of the `title` slot (`renderTitle: false`) into the default
slot as a 24 px avatar inline before the text. The target is half the measured pre-change height:
the implementer measures the tile's `getBoundingClientRect().height` before touching it, records
the number in tasks.md, and sets `--kiosk-audio-bar-height` (on `:root`, in `src/styles`) to half
of it. Estimate: 82 px → 41 px.

### D4 — Component split under `src/components/audio/`

- `KioskAudioBar.vue` — layout, target resolution, controls, position ticker.
- `AudioTargetDialog.vue` — main group + rooms, colours, per-room volume, group toggle.
- `AudioQueueDialog.vue` — queue (with cover thumbnails) + playlist list.
- `AudioRadioDialog.vue` — the 8 station tiles.

Dialogs are `v-dialog`s, `fullscreen` below 600 px (`$vuetify.breakpoint.xsOnly`), each with an
explicit close button in its header. They receive the resolved target from the bar as props and
call `audioService` themselves.

### D5 — Target resolution and persistence

The stored value is `'main'` or `'room:<roomId>'` under the localStorage key `kioskAudioTarget`,
every access in try/catch (same pattern as `floorCalibration.ts`). The room id, not the
`targetId`, is stored because a solo room's MA sync group id is created on demand and may change.
A computed `target` resolves it against the current state: a room counts only while it exists,
`available`, `!grouped` and has a `targetId`; otherwise the main group. When resolution falls back
against a loaded state while the stored value names a room, the stored value is reset to `'main'`,
so a room that goes solo again days later is not silently re-selected. A fallback because the
state is still `null` (not loaded yet) does not reset anything.

Alternative: keep the stored room and re-select it whenever it is solo again. Rejected: the bar
would change target on its own long after the user forgot the choice.

The resolved target exposes `{ kind, targetId, roomId?, name, color, playback, volume }`:
`playback`/`volume` come from `mainGroup` or from the room.

### D6 — Colours

Room colours are taken verbatim from `rooms[].color` (any CSS colour string). The main group uses
a fixed GUI constant, white-ish neutral `#ECEFF1` with a `speaker_group` icon, chosen because room
colours are expected to be saturated; the icon keeps it distinguishable even if a room gets a
similar colour. The selector shows a colour dot plus the name (name hidden below 600 px, dot +
icon only).

### D7 — Position, seek and volume

A 1 s `setInterval` in the bar updates a `now` data field only while the target is `playing`.
`position = clamp(elapsed + (now - elapsedAt) / 1000, 0, duration ?? ∞)` when playing, else
`elapsed`. `elapsedAt` is server epoch ms; kiosk clocks are NTP-synced, so skew is ignored.

The slider binds to `dragValue ?? position`. `@start` sets `dragging`; `@change` sends the seek,
keeps `dragValue` as `heldValue` and clears it when a state with a different `elapsedAt` arrives or
after 3 s. Volume uses the same hold pattern; volume is sent on `@change` only. Bar volume:
`PUT /audio/targets/{targetId}/volume` for the main group, `PUT /audio/rooms/{roomId}/volume` for a
solo room (the server maps it to the room's group). Room sliders in the target popup always use the
rooms route.

±10 s compute from the interpolated position and clamp to `0..duration`.

### D8 — Commands and errors

Every command is a fire-and-forget call; the UI updates from the next `audio-state` event, not
optimistically (except the held slider values). A failed command dispatches one snackbar message
(`page.kiosk.audio.commandFailed`, with `serverReason` appended when present). Background loads in
`audioState` never show a snackbar.

### D9 — `audioService` and endpoints

`src/utils/webservices/audioService.ts`, singleton like the other services. Endpoint keys in
`rest.ts` (comment: contract from `java-overmind-server` change `audio-music-assistant-bridge`):

```
audioState:          '/audio/state'
audioRoomGrouped:    '/audio/rooms/{roomId}/grouped'
audioRoomVolume:     '/audio/rooms/{roomId}/volume'
audioTargetCommand:  '/audio/targets/{targetId}/{command}'   // play|pause|next|previous
audioTargetSeek:     '/audio/targets/{targetId}/seek'
audioTargetVolume:   '/audio/targets/{targetId}/volume'
audioTargetQueue:    '/audio/targets/{targetId}/queue'
audioTargetQueuePlay:'/audio/targets/{targetId}/queue/play'
audioTargetPlayMedia:'/audio/targets/{targetId}/playMedia'
audioRadio:          '/audio/radio'
audioPlaylists:      '/audio/playlists'
```

`axiosUtils` gains `putToPath(server, endpointPath, params, dataProvider)` next to `postToPath`.
List answers are read tolerantly: `{items: [...]}` or a bare array.

`Playlist.uri` is the MA URI to pass to `playMedia` (agreed with the backend on 2026-10-30, now
in its `audio-library` spec). As cheap tolerance the bar falls back to `library://playlist/{id}`
when `uri` is missing. `Station` has `uri` too.

### Contract drift found during apply (2026-10-30, task 6.1)

Re-read against `java-overmind-server/openspec/changes/audio-music-assistant-bridge/specs/`
(still unbuilt and uncommitted there). Everything the bar calls matches those specs - paths,
verbs, bodies, `{items, currentIndex}` for the queue, `Playlist.uri`, `elapsed`/`elapsedAt`,
`/audio/image` URLs - except for three points the GUI now reads tolerantly in `audioService.ts`:

- **No room colour on the server.** The `audio_room` table and `AudioState` room carry no
  `color`. The GUI reads `rooms[].color` when present and otherwise gives each room a fixed
  colour from its own palette, chosen by room id (stable across reloads and devices). The
  server side should add a `color` column and field so the colours become configurable.
- **The room's target id has no field name.** The server spec says a solo room is addressed by
  its MA player id without naming the field. The GUI reads `targetId`, then `maPlayerId`, then
  `playerId`.
- **Enum case and Track/Station fields are not spelled out.** `Playback.state` is lowered
  (`PLAYING` → `playing`); a track is read as `title`/`artist`/`album`/`uri`/`imageUrl`
  (with `name` and an `artists` array as fallbacks), a station as `name`/`uri`/`imageUrl`.

Two implementation details beyond the decisions above: the bar's own CSS classes are
`kiosk-audio-player*` because `KioskAudio.vue` already owns an unscoped `.kiosk-audio-bar`;
and every bottom-anchored fixed element (gear, the five pages' back buttons, the events
timeline) now adds `--kiosk-bottom-inset`, which is the bar height only while the bar is shown
(`src/styles/_kiosk.scss`).

## Risks / Trade-offs

- [41 px is a small touch target for a slider and nine controls] → Buttons use the full bar height
  as hit area; slider thumb enlarged; narrow widths drop ±10 s and previous. Revisit after it is on
  the wall.
- [Halving every link tile changes every kiosk page at once] → It is what was asked; verified with
  a screenshot of the overview and one detail page in the browser suite.
- [Kiosk clock skew makes the interpolated position drift] → Corrected on every state event;
  accepted.
- [`v-footer app` padding interacts with pages that size themselves to `100vh`] → Check the
  pages that fill the viewport (cameras, personen) in the suite; they must use the `v-main`
  height, not `100vh`, or subtract the bar height.
- [Backend not deployed when this ships] → Bar shows "audio unavailable" and stays quiet; the 30 s
  poll picks the backend up when it appears.

## Migration Plan

Pure frontend, deploys with the normal GUI pipeline. Rollback = revert the commit. No data
migration; the localStorage key is new.
