## Why

The server now keeps an EQ per audio room and writes it to the Louder speakers: a 15-band EQ, or
for the satellite/sub room a crossover frequency (server change `audio-room-eq`, frontend brief
`java-overmind-server/ai/draft-audio-room-eq-for-frontend.md`, deployed and checked live on
2026-11-28). The kiosk has no control for it. The only way to change it today is the speakers'
own ESPHome web UI, and the server overwrites those changes on the next reconnect. The audio
plan popup is where every other room setting lives, so the EQ belongs there too, built like the
Balance tool.

## What Changes

- A seventh tool **EQ** in the audio plan popup's tool bar, after Balance.
- With it active, rooms whose state reports an EQ (`rooms[].eq` is `bands` or `crossover`) are
  marked. Rooms with `unavailable` are marked as unreachable but can still be tapped. Rooms with
  `none` (or no field, as from an older server) are dimmed and do nothing.
- Tapping an EQ room opens an EQ panel for that room at the bottom of the popup, where the
  Balance panel sits. A group room is one panel.
  - **Bands room:** one vertical slider per band, built from what the server sends (frequency,
    range, step, unit), with *Hauskurve* reset.
  - **Crossover room:** a choice of *Flat* plus the server's frequencies, the speakers with
    their role (satellite / sub) and the preset each one reports now, and a reset to 80 Hz.
  - The panel reads the room's EQ live once when it opens, with a spinner. While it is open,
    it reads again on SSE `audio-eq-changed` for that room (when the change came from
    elsewhere), on an SSE reconnect and after a `400`.
  - Slider writes are sent on release, only for the bands that changed, with at most one
    request in flight per room. Later changes are merged and sent next.
  - Errors: `503` shows the reason with *retry*. `502` keeps the value and shows a warning.
    `400` shows the reason and reads again. `404` / `409` close the panel.
- The GUI reads `rooms[].eq` tolerantly: a missing or unknown value counts as `none`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `kiosk-audio-plan-popup`: the tool bar offers seven tools. "Full-screen popup sized for the
  kiosk tablets" is modified. "One tool is active and decides what a room does" is replaced by
  "The active tool decides what a room does", because its scenario names the old tool count.
  New requirement "EQ tool sets a room's equaliser or crossover".

## Impact

- `src/components/audio/AudioPlanDialog.vue` (tool list, one open panel room for Balance and
  EQ), `AudioPlanMap.vue` (EQ tool look and tap), new `AudioEqPanel.vue`, new
  `src/utils/audioEq.ts` (`hasEq`, frequency label, band key).
- `src/utils/webservices/audioService.ts` (`AudioRoom.eq`, `AudioRoomEq` parsing, `getRoomEq`,
  `setRoomEq`, `resetRoomEq`), `src/store/rest.ts` (routes `audioRoomEq`, `audioRoomEqReset`).
- Locales `de-AT.json` / `en-US.json`.
- Backend: nothing to do. Routes, state field and SSE event are deployed.
