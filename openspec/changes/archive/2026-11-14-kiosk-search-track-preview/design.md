## Context

- `AudioLibrarySearch.vue` renders results as plain rows; a tap on a track row emits `add`.
  It knows nothing about audio state.
- `AudioPlaylistEditor.vue` already resolves `playTarget`, the device's target with `targetId`
  and `playback`. It holds the shared audio state (`acquire()` from `@/utils/audioState`) while
  it is open, and uses `audioCommand.runAudioCommand` for commands.
- The seek slider lives inline in `KioskAudioBar.vue`: the `now` ticker, the interpolated
  `position`, `shownPosition`, drag state (`seekDragging`/`seekDrag`), the hold after release
  (`seekHeld`, `seekHeldAt`, `HOLD_MS`) and `skip(±10)` on top of it. `createHeldLevels` in
  `@/utils/heldLevels` is the volume equivalent. It is level-keyed and does not interpolate, so
  it does not fit seeking.
- The server has `command` only with `play|pause|next|previous`, so there is no stop command.

## Goals / Non-Goals

**Goals:**
- One seek-slider implementation for the bar and the search.
- Preview with existing API calls only.

**Non-Goals:**
- Play per playlist track, removing the editor's play button, opening albums. These wait for
  the server (`ai/open-proposals.md`).
- Preview for albums or artists.
- Restoring what the room played before the preview.

## Decisions

**D1 - `AudioSeekSlider.vue`, extracted from the bar.** Props: `target` (a resolved target,
or null), `disabled`, `showTime`. It owns the ticker, the interpolation, the drag/hold logic and
sending `audioService.seek` through `runAudioCommand`. It exposes `skip(seconds)`, which the
bar's ±10 buttons call through a ref, and emits `seekable` changes, or the bar keeps its own
`seekable` computed from the same inputs, whichever reads cleaner. The bar's markup and
classes (`kiosk-audio-player-progress`, `-time`, `-slider`) stay the same, so the bar looks and
behaves exactly as before.
*Alternative:* copy the ~60 lines into the search. Rejected because two hold implementations
would drift apart.
*Alternative:* a `createSeekHold` util like `createHeldLevels`. Rejected because the logic is
tied to a slider's events and a ticker, so a component is the more natural unit.

**D2 - Marking keys on `playback.track.uri`.** A row is "current" when
`playTarget.playback.track.uri === result.uri`, whether the target is playing or paused. This
also marks a track that plays from somewhere else, for example a playlist, which is correct:
stop and seek act on what is audible. If the same URI appears twice in the results, both rows
are marked, which is harmless.

**D3 - Button logic.** For the current row: playing → `pause`, paused → `play`. For any other
row: `playMedia {uri}` without `shuffle`. Leaving `shuffle` out leaves the queue's shuffle
setting as it is, which does not matter for a one-track queue. Preview does not depend on
`busy` (which guards playlist edits) and works on rows already in the playlist, which cannot be
added but can be heard. Click handlers use `.stop` so the row's `add` does not fire. The slider
wrapper also stops `click`.

**D4 - Slider placement.** The slider sits as a second line inside the current row, below the
title and artist, at full row width. Only that row grows, so the list stays compact and the
slider stays a usable size on mobile. `showTime` is on except at `xsOnly`, as in the bar.

**D5 - Target passing.** The editor passes `:play-target="playTarget"` to the search. The search
stays dumb about state acquisition. Because the editor already holds the state while open, the
marking updates live via SSE `audio-state`.

## Risks / Trade-offs

- [The preview replaces the room's queue, for example in the middle of a playlist] → Decided by
  the user (play goes to the bar's target and replaces the queue); stated in the proposal.
- [Refactoring the bar could break its seek behaviour] → Same markup and classes. Check in
  Puppeteer that the bar's slider, the ±10 buttons and the hold behave as before.
- [After `playMedia`, the state may briefly still report the old track] → The marking follows
  the state, so the row lights up once MA reports the new track. That is acceptable, and there
  is no optimistic marking.

## Migration Plan

GUI only, no server change. Deploy by push. Roll back by reverting the commit.
