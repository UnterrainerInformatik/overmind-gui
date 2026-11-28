## Context

The audio plan popup (`AudioPlanDialog.vue` + `AudioPlanMap.vue`) has six tools. The Balance
tool (archived change `kiosk-audio-plan-balance-tool`) is the model for this one. `hasBalance`
(`src/utils/audioBalance.ts`) decides the map look. `AudioPlanMap` emits `open-balance(roomId)`.
The dialog keeps `balanceRoomId`, derives `balanceRoom` from the state and hosts
`AudioBalancePanel.vue` absolutely over the stream strip (`.audio-plan-bottom`). The panel closes
on tool change, on popup close and when the room loses its capability.

The server contract is in `java-overmind-server/ai/draft-audio-room-eq-for-frontend.md`
(authoritative: server change `audio-room-eq`):

- `GET /audio/state` → `rooms[].eq` ∈ `bands | crossover | none | unavailable`. A change of it
  arrives as a normal `audio-state`. The EQ values are not in the state.
- `GET /audio/rooms/{roomId}/eq` → `{capability, bands[] | null, crossover, frequencies[] |
  null, speakers[{playerId, name, host, role, leftPreset, rightPreset}]}`. It reads the speakers
  live and takes 1–2 s, up to ~10 s.
- `PUT …/eq`: `{bands: {"<freq>": gain}}` with only the changed bands, or `{crossover: f | null}`.
  It takes ~1.5–3 s.
- `POST …/eq/reset` without a body.
- SSE `audio-eq-changed` `{roomId}`, sent for every `PUT`/reset that changed the desired EQ,
  including this panel's own writes.
- Errors carry `reason`. `axiosUtils` puts it on `err.serverReason` and the status on
  `err.status`.

SSE named events and the `connected` event are used the same way as in `AudioQueueDialog.vue`
(`sse.addEventListener('audio-queue-changed' | 'connected', …)`). Motivation: proposal.md.
Behaviour: `specs/kiosk-audio-plan-popup/spec.md`.

## Goals / Non-Goals

**Goals:**
- Set a room's EQ or crossover from the kiosk, so the ESPHome web UI is no longer needed.

**Non-Goals:**
- EQ for web players or the main group (the routes only know rooms).
- Showing EQ values anywhere else (audio bar, stream cards, audio page).
- Editing the speaker → host mapping (`/audiospeakers`, admin concern).
- Live audible preview while dragging. One write costs seconds, so the panel sends on release.
- Any server change.

## Decisions

### D1: A seventh tool, icon `graphic_eq`, label "EQ"

The EQ tool follows the same rule as Balance: one tool, one meaning for a room tap. `equalizer`
is taken by Volume, so EQ uses `graphic_eq`. The label is "EQ" in de-AT and en-US.

Tool bar width:
- Narrow (xs) today: 6 × 44 + 44 close + 8 padding = 316 px. With seven tools it would be
  360 px, with no room left. The narrow tool buttons drop to `min-width: 40px; padding: 0 6px`,
  which gives 7 × 40 + 44 + 8 = 332 px.
- With labels: the apply step measures the bar at 768 px. If seven labelled tools overflow,
  labels are shown only from `md` up (`narrow` becomes `smAndDown` for the label, the 40 px
  icon width stays xs only). No other layout change.

### D2: One open panel room for both Balance and EQ

Rather than a second `eqRoomId`, the dialog keeps a single `panelRoomId`. The active tool decides
which panel it is (`balance` → `AudioBalancePanel`, `eq` → `AudioEqPanel`). The map gets
`panelRoomId` in place of `balanceRoomId` and emits one `open-panel(roomId)`. The outline logic
uses `panelRoomId` for both tools. The rules stay as they were: clear on tool change, popup close
and another room's tap (it replaces the id). `panelRoom` is null when the room no longer
qualifies for the active tool (`hasBalance` or `hasEq`), and the watcher then clears the id.
Alternative: copy the balance pattern. That means two ids, two watchers, two outline branches
and two events for something that is mutually exclusive by construction.

### D3: `src/utils/audioEq.ts`

- `hasEq(room)`: `room.eq` is `bands`, `crossover` or `unavailable`. This drives the map mark,
  the tap and whether the panel stays open.
- `eqReachable(room)`: `bands` or `crossover`. It picks the normal mark over the
  "unreachable" mark.
- `eqFrequencyLabel(f)`: below 1000 Hz the number as is (`31.5`, `80`). From 1000 Hz `f / 1000`
  with up to two decimals, trailing zeros dropped, plus `k` (`1.25k`, `16k`).
- `eqBandKey(f)`: `String(f)` (`"31.5"`, `"16000"`), the PUT key.

### D4: Map look in the EQ tool

- `bands` / `crossover`: `graphic_eq` mark and fill opacity 0.6.
- `unavailable`: the same mark at reduced opacity, plus the dimmed fill 0.2. Tappable.
- `none`: the `audio-plan-room--no-eq` dimmed look, the same as `--no-balance`. A tap does
  nothing.

The open room is outlined with the existing balance outline colour. The tap stays behind the
map's existing `room.available` / `disabled` gate, as with Balance.

### D5: `AudioEqPanel.vue`: states and layout

The panel has the same shell as `AudioBalancePanel`: head with `graphic_eq` icon, room name,
close button, `@click.stop @pointerdown.stop`. Its body has these states:

- **loading:** `v-progress-circular`. This state is used for the first read, a re-read without
  data yet, and *retry*. A re-read with data already shown keeps the controls and shows a small
  linear progress under the head.
- **error (503 / network):** reason text, *Erneut versuchen* button, no controls.
- **bands:** a horizontally scrollable row of vertical `v-slider`s, one per band. Each has its
  gain above and its frequency label below, and a width of ~40 px, so 15 bands need ~600 px and
  scroll sideways on a phone. The slider height fills the panel. The panel takes a `min-height`
  of 220 px, and where `.audio-plan-bottom` is shorter, the popup body scrolls vertically, as it
  already does on phones.
- **crossover:** a wrapping row of toggle buttons *Flat*, 60 … 150, with the desired one active.
  Below it, a speaker list: name, role ("Satellit" / "Sub"), `leftPreset` / `rightPreset`. A
  speaker is marked when a preset differs from the expected one for the desired value
  (`HF <f>Hz` for a satellite, `LF <f>Hz` for the sub, and for *Flat* whatever the server
  reports as flat, so no mark).
- **footer** (bands and crossover): reset button (*Hauskurve* / *80 Hz*), a detail line
  "Lautsprecher: name (host), …" and a one-line note that the server overwrites changes made in
  the speakers' own web UI.

The reset is a two-step button inside the panel. The first tap turns it into *Wirklich
zurücksetzen?* for 4 s, and a second tap sends. This avoids a nested dialog over the full-screen
popup, which is the same reason the Balance panel is inline.

### D6: Write queue per panel

The panel keeps `pending` (frequency key → gain) and `inFlight` (bool). A slider `change`
(release) sets `pending[key] = gain` and calls `flush()`. `flush()` returns if a write is in
flight or nothing is pending. Otherwise it takes the whole `pending` map as the body, clears it
and sends. When the write ends, whatever the outcome, it calls `flush()` again. The shown gain of
a band is `pending ∪ last sent ∪ server value`, so a slider never jumps back while its value
waits. A crossover choice is a single value: the panel stores it as the pending crossover (latest
wins) through the same `flush`. Reset goes through the queue too: it is sent as its own request
once nothing else is in flight, and clears the pending band changes, because the reset replaces
them.

There is no 300 ms idle send during a drag. Release is reliable on touch and mouse, and one write
costs seconds anyway.

Answers:
- `204`: keep.
- `502`: keep, and show a warning snackbar with the reason (`audioCommand` style, own message
  key).
- `400`: error snackbar with the reason, then re-read.
- `404` / `409`: emit `close`.
- `503`: panel error state with the reason and *retry*.

### D7: Own-echo suppression for `audio-eq-changed`

The server sends the event for this panel's own writes too. The panel ignores an event for its
room while a write is in flight or within 1.5 s after its last write ended. Otherwise it
re-reads. Re-reading is harmless but costs a live speaker read, so the window only saves
needless reads and never affects correctness. A `connected` (reconnect) event re-reads when the
panel is idle. When the room's `eq` in the state switches between `bands`, `crossover` and
`unavailable`, the panel re-reads.

A re-read never overwrites a band that has a pending or in-flight value.

### D8: Service and parsing

- `audioService.normalizeRoom` maps `eq`. One of the four strings is kept, anything else gives
  `'none'`.
- New interfaces `AudioRoomEq`, `AudioEqBand`, `AudioEqSpeaker` (semicolon members).
  `getRoomEq(roomId)` parses tolerantly:
  - `bands`: entries without a numeric `frequency` are dropped. `min`, `max` and `step` fall back
    to −15, 15 and 1, and `gain` falls back to 0.
  - `frequencies`: numbers only.
  - `crossover`: a number or null.
  - `speakers`: entries need a string `playerId`, and `name` falls back to it.
- `setRoomEq(roomId, body)` and `resetRoomEq(roomId)`.
- Routes `audioRoomEq: '/audio/rooms/{roomId}/eq'` and
  `audioRoomEqReset: '/audio/rooms/{roomId}/eq/reset'` in `src/store/rest.ts`.

`axiosUtils` already logs failures. The panel decides what reaches the screen, so error
snackbars come only from the panel, never twice. The apply step checks whether
`getFromPath`/`putToPath` already raise a global snackbar, and the panel adapts if they do.

## Risks / Trade-offs

- [Seven tools crowd the bar] → D1 narrows the xs buttons and, only if measured necessary, hides
  labels below `md`.
- [15 vertical sliders in a short strip on the 1020 × 590 tablet] → the panel's min-height of
  220 px can make the body scroll a little in landscape. That is accepted for the EQ, and the
  apply step checks it at 1020 × 590.
- [A slow live read (up to 10 s) looks hung] → the spinner and a timeout come from axios
  defaults. On a timeout the panel shows the error state with *retry*.
- [Echo window misses a slow own event] → it causes one extra read at worst. Values stay
  correct.
- [Two kiosks edit the same room at once] → the server is last-writer-wins. Each panel re-reads
  on the other's event when idle.

## Migration Plan

Ship with the normal GitHub Actions deploy. The backend is already deployed. An older server
sends no `eq`, and every room then counts as `none`.
