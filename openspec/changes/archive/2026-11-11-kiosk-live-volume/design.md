## Context

Two places set a volume (see proposal.md - Why):

- `KioskAudioBar.vue`: a vertical `v-slider` in a menu with `@start/@input/@end/@change`.
  `@input` only updates `volumeDrag` for display; `@change` (fired on release) calls
  `audioService.setTargetVolume` / `setRoomVolume` through the `audioCommand` mixin and holds
  the released level (`holdVolume`, `HOLD_MS = 3000`). The hold is cleared by a watcher on
  *any* change of `target.volume`.
- `AudioTargetDialog.vue`: one `v-slider` per room with only `@change`; it holds
  `{level, from}` in `heldVolumes` and drops the hold as soon as the state reports a volume
  different from `from`.

Both hold-release rules assume a single request per gesture. With live sending, the state will
report intermediate levels after release, which would clear the hold too early and make the
slider jump back to an older level.

Vuetify 2 `v-slider` emits `start`, `input` (every move), `end` (pointer up) and `change`
(pointer up, only when the value changed; also on a tap/click without drag).

## Goals / Non-Goals

**Goals:**
- Audible volume change while dragging, on PC, tablet and mobile (touch and mouse).
- Bounded request rate; final level always wins.
- One shared implementation for both sliders.

**Non-Goals:**
- Live seeking on the progress slider.
- Server-side changes or a new streaming/websocket volume API.
- Optimistic changes to the shared audio state store.

## Decisions

### D1: Throttle with "one in flight + trailing latest" in a small helper

A plain helper `createLiveSender(send, intervalMs = 200)` in `src/utils/liveSender.ts` returns
`{ push(level), flush(level): Promise<boolean>, cancel() }`:

- `push(level)` stores `pending = level`; if no request is in flight and ≥ 200 ms passed since
  the last start, it starts `send(pending)` immediately, otherwise it schedules a timer for the
  remaining time. When a request finishes and a `pending` newer than the last sent exists, the
  next one starts (respecting the interval).
- `flush(level)` (on release) sets `pending = level`, waits for the in-flight request, and sends
  `level` unless it equals the last level sent; it resolves with that final call's result so the
  caller can report a failure.
- `cancel()` clears timers (component `beforeDestroy`, target switch).

Why not lodash `throttle`/`debounce`: debounce delays until the finger stops (not live);
throttle does not prevent overlapping requests, and out-of-order completion with MA could leave
an older level applied last. Serialising per slider guarantees the server sees levels in order.

200 ms gives ~5 updates/s - responsive enough to hear, light on the server and MA.

### D2: Intermediate requests are silent; the final one reports errors

Intermediate sends call the service directly and swallow errors. `flush` goes through
`runAudioCommand`, so a failure still shows one snackbar. Showing one message per failed
intermediate request would flood the screen during a single drag.

### D3: Hold until the state reports the released level

Both components switch to the same rule: after release keep `held = level` until the state
reports exactly that level for the target/room, or `HOLD_MS` passes. The bar's
`'target.volume'` watcher only clears when `volume === volumeHeld`; the dialog drops the `from`
field and compares against `level`. The 3 s timeout still covers servers that round or clamp
the level. During the drag the slider shows the finger position regardless of the state, as
today in the bar.

### D4: Wire the events

- Bar: `volumeInput` (while `volumeDragging`) calls `sender.push(value)`; `volumeEnd` and
  `volumeChange` both call a single `finishVolume(value)` that holds and flushes (guarded so a
  release that fires both events flushes once). A tap without drag fires only `change` →
  `flush` sends that one level.
- Dialog: add `@start/@input/@end` per room, keep per-room drag state (`dragging[roomId]`,
  shown level) and one sender per room id, created lazily and cancelled on destroy. The shown
  number uses the drag value while dragging.
- The sender's `send` resolves the target at send time from a closure captured at drag start,
  so switching the bar's target mid-drag cannot send to the new target; a target switch also
  cancels the sender.

## Risks / Trade-offs

- [More requests to the server/MA during a drag] → capped at ~5/s per slider, serialised.
- [Slow server responses make live feedback lag] → only the newest level is queued, so lag never
  accumulates; the final level is still guaranteed.
- [`end` and `change` both fire on release] → a single idempotent `finishVolume` handles both.
- [Main-group volume may rescale member rooms on the server] → unchanged behaviour, just applied
  more often; room sliders in the popup show what the state reports.

## Migration Plan

Pure GUI change; deploy via push to master. Rollback = revert the commit.
