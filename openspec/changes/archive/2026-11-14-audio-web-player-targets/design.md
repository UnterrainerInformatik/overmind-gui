## Context

See proposal.md for the motivation. Today:

- `AudioState` is `{mainGroup, rooms}` (`audioService.normalizeState`). Every target is the main
  group or a solo room's player (`room.targetId`).
- `utils/audioTarget.ts` stores `'main'` or `'room:<roomId>'` in `localStorage.kioskAudioTarget`
  and resolves it with `resolveTarget` / `selectedRoomOf`. `AudioTarget.kind` is `'main' | 'room'`.
- `KioskAudioBar` drops a remembered room that fell back (`selectionFellBack` watcher writes
  `'main'`), so a room that happens to be solo days later is not picked again by accident.
- `AudioPlanDialog.streams` builds the stream cards (main + solo rooms); `AudioStreamCard` picks
  its kind icon from `stream.kind === 'main'`. The plan map (`AudioPlanMap`) only gets rooms.
- `AudioQueueDialog`, `AudioSeekSlider`, the bar's commands and the playlist editor's play button
  all act on `target.targetId` and follow the resolved target reactively.

Server facts (from the server session, 2026-11-14, MA 2.10.8): web players are sendspin players
with `device_info.model` in {"Web Player", "Web Browser", "Mobile Application", "PWA"}; the id is
kept in the browser's `localStorage["sendspin_webplayer_id"]` and is stable per browser profile;
closing the tab removes the player from MA (`player_removed`) rather than marking it unavailable;
the name is MA's (e.g. "Web (Firefox on Linux)") and renamable in MA. The agreed state shape is
`AudioState.players[] = {targetId, name, available, playback, volume}`.

## Goals / Non-Goals

**Goals:**
- Web players are targets everywhere the main group and solo rooms already are, with no new
  component or popup.
- A remembered web player survives its own absence (tab closed, page reloaded meanwhile).
- The GUI works unchanged against a server that does not send `players` yet.

**Non-Goals:**
- Grouping web players or showing them on the plan (agreed: solo only, no room).
- Names, colours or settings of our own per web player: the only identity is MA's id, which is too
  unstable (new profile / private window / cleared storage → new id) to hang anything on.
- A "not connected" indicator for a remembered, missing web player (user decision: silent
  fallback).
- Distinguishing browser vs. mobile app in the UI (the agreed state has no model field).

## Decisions

### D1 — `AudioState.players`, read tolerantly, defaulting to `[]`

`normalizeState` adds `players: AudioWebPlayer[]`, where `AudioWebPlayer = {targetId, name,
available, playback, volume}`. A missing or non-array `players` gives `[]`; entries without a
target id are dropped. `targetId` is read like a room's (`targetId`, else `maPlayerId`, else
`playerId`); `name` falls back to the target id; `available` is `!== false`; `playback` and
`volume` reuse `normalizePlayback` / `numberOrNull`. The guessed contract is documented in the
service's header comment, as for the earlier fields.

Alternative: treat a missing `players` as "invalid state" like a missing `rooms`. Rejected: it
would break the GUI against today's server and block deploying the GUI first.

### D2 — Third target kind `player`, stored as `'player:<targetId>'`

`AudioTarget.kind` becomes `'main' | 'room' | 'player'`; for a player `roomId` is `null` and
`color` is `WEB_PLAYER_COLOR`. `readStoredTarget` accepts the `player:` prefix. A new
`selectedPlayerOf(state, selection)` returns the player while it is in the state and available.
`resolveTarget` tries room, then player, then the main group.

The target id (not a room id) is stored because a web player has no other identity; MA keeps
that id stable per browser profile.

### D3 — Fallback without forgetting, for players only

The bar's `selectionFellBack` watcher keeps its behaviour for rooms (the stored choice is
overwritten with `'main'`), but not for players: a `'player:…'` selection is left in
`selection` and in storage while the target resolves to the main group. Because the target is
computed, it switches back on its own when the player reappears. Any explicit selection
(`selectTarget`) replaces it as before.

The queue popup and the seek slider need nothing: they watch `target` / `target.targetId` and
reload for the main group when it changes, which is the "switch" the user asked for. The playlist
editor opened from the bar gets the bar's `target`; standalone it resolves its own with the same
helper.

Alternative: drop the remembered player like a room. Rejected by the user: a browser tab is
closed and reopened routinely, and the user expects the choice to come back.

Trade-off accepted: a remembered player whose browser profile is gone forever stays in storage
until the user picks another target. It costs nothing, since it resolves to the main group.

### D4 — One fixed web player colour and the `devices` icon

`WEB_PLAYER_COLOR = '#455A64'` (blue grey 700), exported next to `MAIN_GROUP_COLOR`. It is a
neutral, dark slate tone, distinct from the indigo main group colour, the saturated hues of
`ROOM_PALETTE` and the light unavailable grey `#9E9E9E`. All web players share it; they are told
apart by name. The kind icon is `devices` (fits browser, phone app and PWA) in the bar's target
selector and in `AudioStreamCard`; `speaker_group` / `speaker` stay for main and room.

Alternatives: a small 3-colour palette per player (the colour would jump between players as ids
come and go, and there is no stable index); grey with an icon (too close to "unavailable").

### D5 — Stream strip order and the plan map

`AudioPlanDialog.streams` appends `state.players.filter(p => p.available && p.targetId)` mapped to
`{key: 'player:<targetId>', kind: 'player', …}` after the solo rooms, in the server's order. The
narrow-card rule (nothing to play → narrow card with hint) applies to players as to solo rooms.
`AudioPlanMap` keeps receiving rooms only, so the plan tools never see web players.

## Risks / Trade-offs

- [Server shape differs from the agreed one] → The read is tolerant (D1) and documented as
  guessed; adapt the one seam in `audioService` once the server change is built.
- [Two players with the same name, e.g. two Linux PCs with Firefox] → They are distinguished
  only by order in the strip; renaming in MA fixes it. Accepted (user decision: MA name only).
- [A tab reconnect within aiosendspin's grace period reuses the id; a later one may not] → Then
  the remembered choice silently stays on the main group; the user picks the player again.
- [The server rejects a player id on `/audio/targets/{id}/…` until its change is built] → Without
  the server change no player is in the state, so the GUI never sends such ids.

## Migration Plan

GUI first or server first both work: without `players` the GUI behaves as today, and an older
GUI ignores the extra field. Rollback is a plain revert; a stored `'player:…'` value is then
rejected by the old `readStoredTarget` and falls back to the main group.
