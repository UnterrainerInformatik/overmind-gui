## Context

The audio plan popup (`AudioPlanDialog.vue` + `AudioPlanMap.vue`) has five tools; the Volume
tool drags a room's level and uses `createHeldLevels` (`src/utils/heldLevels.ts`, built on
`liveSender.ts`) for the live-volume rules of `kiosk-audio-bar`. `AudioStreamCard.vue` uses the
same helper for its sliders. The server already sends per room
`speakers: [{playerId, name, available, volume}]` and `balanceSupported` (true exactly for a group
room with at least two speakers) and offers `PUT /audio/rooms/{roomId}/speakers/{playerId}/volume`
`{level}` (`204`; `409` not a group room / speaker unavailable; `404` unknown speaker). Motivation:
proposal.md; behaviour: `specs/kiosk-audio-plan-popup/spec.md`.

## Goals / Non-Goals

**Goals:**
- Change a stereo pair's balance from the kiosk with the same feel as the other volume controls.

**Non-Goals:**
- A single left/right balance knob: MA has no left/right notion and the server models per-speaker
  levels, so one slider per speaker is the honest control and also works for three speakers.
- Showing the balance anywhere else (audio bar, stream cards, audio page).
- Any server change.

## Decisions

### D1: A sixth tool rather than a mode inside the Volume tool

Every room setting in the popup is a tool, and a room tap means one thing per tool. Putting the
balance into the Volume tool would need a second gesture (long press) on the same room, which the
kiosk avoids. Icon: `tune`. Label "Balance" (de-AT and en-US). In the narrow (xs) layout the tools
are icons only already; six icons + close fit in 360 px (6 × 48 + 48 = 336).

### D2: Panel instead of drawing on the map

Speakers have no plan area (the room's areas are its lights), so the sliders cannot live on the
map. `AudioBalancePanel.vue` is a card absolutely positioned over the stream strip (bottom of
the popup body), so the map with the room stays visible and the tool bar stays usable. It lists
the speakers with a horizontal `v-slider` each (name left, number right), styled like the stream
card's volume slider (requirement "Card volume slider stands out from the card"). The panel is a
child of `AudioPlanDialog`; `AudioPlanMap` emits `open-balance(roomId)` on a tap in the Balance
tool. The dialog stores `balanceRoomId` and clears it on tool change, on close, and when the
room in the new state no longer has `balanceSupported`.

### D3: Live levels per speaker with `createHeldLevels`

The panel creates its own `createHeldLevels` with keys `speaker:<roomId>:<playerId>` and the
sender `audioService.setSpeakerVolume(roomId, playerId, level)`; it calls `observe` for every
speaker on each state. Errors go through the existing `audioCommand` mixin (one short message for
the released level only). No new throttling code.

### D3a: Map look in the Balance tool

Rooms with `balanceSupported && speakers.length >= 2` get the `tune` icon (like the pin / bulb
marks of other tools) and their normal fill; all others get the dimmed look already used for
unavailable rooms, but keep their colour. The room whose panel is open is outlined.

### D4: Tolerant parsing

`audioService` maps `speakers` (array of objects with a string `playerId`; entries without one
are dropped; `name` falls back to the id; `volume` via `numberOrNull`) and `balanceSupported`
(`=== true`). Missing fields give `speakers: []`, `balanceSupported: false`.

## Risks / Trade-offs

- [Raising one speaker above the others raises the room volume] → that is the server's model
  (loudest speaker = room volume); the Volume tool then shows the new level. Accepted, it matches
  what the user did.
- [Panel covers the stream strip] → the strip is not needed while balancing; closing the panel
  brings it back.

## Migration Plan

Ship with the normal GitHub Actions deploy; no backend dependency beyond what is deployed.
